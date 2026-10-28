import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ObjectSnap, type StructureIssue, type TreeComponent, type TreeDiagram } from './analysis';
import { STATE, useGlide } from './theme';
import { tidyTreeLayout } from './treeLayout';
import { useWidth } from './useWidth';
import { NameTag } from './Value';

const NODE = 46;
const R = NODE / 2;
const LEVEL = 110;
/** Variable labels sit in one of two rows above a node; the second is used only when the first is taken. */
export const TAG_ROW = 24;
/** Space kept between labels on the same level. */
export const TAG_GAP = 8;
/** Room above the root for variable labels. */
const TOP = 40;
/** Room below the deepest level for "returned" badges and null stubs. */
const BOTTOM = 64;
/** Side padding, so glows, labels and badges at the edges are never cut off. */
const PAD_X = 36;
/** Extra side room when a cycle edge bows outward (the bow plus its label). */
const CYCLE_PAD = 190;
/** Fixed slots for small trees: positions don't move while the tree grows (up to depth 3). */
const SLOT_UNIT = 72;
/** Smallest distance between neighbors on one level; closer than this, the compact layout is used. */
const MIN_GAP = 70;
/** Unit of the compact layout: node plus room for a badge between neighbors. */
const TIDY_UNIT = 84;
/** "returned …" badges show at most this many characters; the full value is in the tooltip. */
const BADGE_CHARS = 14;

export interface NodeLabel {
  name: string;
  active: boolean;
  frame: string;
}

export interface TreeViewProps {
  diagram: TreeDiagram;
  heap: Heap;
  labels: Map<number, NodeLabel[]>;
  current?: number | null;
  visited?: Set<number>;
  returned?: Map<number, string>;
  queued?: Set<number>;
  written: { objId: number; key: string }[];
  created: Set<number>;
  highlighted?: Set<number>;
  highlightedEdges?: { objId: number; key: string }[];
  selected?: number | null;
  onSelect?: (id: number) => void;
  /** Show every null child (otherwise only the current node's). */
  details?: boolean;
}

interface Placed {
  id: number;
  x: number;
  y: number;
}

interface TreePlacement {
  nodes: Map<number, Placed>;
  /** Where a null child's stub ends. */
  nullAt: (parent: Placed, side: 'left' | 'right', slotX: number) => { x: number; y: number };
  width: number;
  height: number;
}

/**
 * Pixel positions for one tree, with padding around everything that is drawn.
 * Small trees use fixed slots (stable while they grow); when slots would put neighbors
 * closer than MIN_GAP, a compact tidy layout is used instead, and the drawing grows
 * wider than the board rather than overlapping. `available` is the board's width.
 */
function placeTree(comp: TreeComponent, available: number): TreePlacement {
  const hasCycle = comp.edges.some((e) => e.kind === 'cycle');
  const pad = PAD_X + (hasCycle ? CYCLE_PAD : 0);
  const yOf = (depth: number) => TOP + depth * LEVEL + R;
  const height = TOP + comp.depth * LEVEL + NODE + BOTTOM;

  const slotWidth = Math.min(Math.max(available - 2 * pad - NODE, 0), 2 ** Math.max(comp.depth, 3) * SLOT_UNIT);
  const levels = new Map<number, number[]>();
  for (const n of comp.nodes) levels.set(n.depth, [...(levels.get(n.depth) ?? []), n.slotX * slotWidth]);
  const tight = [...levels.values()].some((xs) => {
    xs.sort((a, b) => a - b);
    return xs.some((x, i) => i > 0 && x - xs[i - 1] < MIN_GAP);
  });

  let rel: Map<number, number>;
  let span: number;
  // Slots only while every child still leans clearly to its side (at least 30px): past depth 3,
  // or on a narrow board, a left child would look like a right one, so the tidy layout is used.
  const slots = !tight && comp.depth <= 3 && slotWidth >= 2 ** (comp.depth + 1) * 30;
  if (slots) {
    rel = new Map(comp.nodes.map((n) => [n.id, n.slotX * slotWidth]));
    span = slotWidth;
  } else {
    const spots = tidyTreeLayout(comp);
    const xs = [...spots.values()].map((s) => s.x);
    const min = Math.min(...xs);
    rel = new Map([...spots].map(([id, s]) => [id, (s.x - min) * TIDY_UNIT]));
    span = (Math.max(...xs) - min) * TIDY_UNIT;
  }
  const contentWidth = span + NODE + 2 * pad;
  const width = Math.max(available, contentWidth);
  const left = (width - contentWidth) / 2 + pad + R;
  const nodes = new Map(comp.nodes.map((n) => [n.id, { id: n.id, x: left + (rel.get(n.id) ?? 0), y: yOf(n.depth) }]));
  // A null child is written where that child would be, one level down, clear of the parent's badge.
  const nullAt = (parent: Placed, side: 'left' | 'right', slotX: number) =>
    slots
      ? { x: left + slotX * slotWidth, y: parent.y + LEVEL - 12 }
      : { x: parent.x + (side === 'left' ? -0.5 : 0.5) * TIDY_UNIT, y: parent.y + LEVEL - 12 };
  return { nodes, nullAt, width, height };
}

/** A branch that leaves the parent's circle toward the child and arrives at the child's top. */
function branch(a: Placed, b: Placed): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const sx = a.x + (dx / len) * R;
  const sy = a.y + (dy / len) * R;
  const ey = b.y - R;
  const bend = (ey - sy) * 0.5;
  return `M ${sx} ${sy} C ${sx} ${sy + bend} ${b.x} ${ey - bend} ${b.x} ${ey}`;
}

/** How far a back edge bows out past the nodes it joins. */
const CYCLE_BOW = 90;

/**
 * A back edge (cycle) bows out to the side of its target, clear of the tree's branches, and
 * stops just outside the target's circle so the whole arrowhead shows, pointing at its center.
 */
function cycleGeometry(a: Placed, b: Placed) {
  const side = b.x - a.x < 0 || b.x === a.x ? -1 : 1;
  const ox = side < 0 ? Math.min(a.x, b.x) - CYCLE_BOW : Math.max(a.x, b.x) + CYCLE_BOW;
  const c1 = { x: ox, y: a.y };
  const c2 = { x: ox, y: b.y };
  const toward = (p: Placed, c: { x: number; y: number }, r: number) => {
    const len = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    return { x: p.x + ((c.x - p.x) / len) * r, y: p.y + ((c.y - p.y) / len) * r };
  };
  const s = toward(a, c1, R);
  const e = toward(b, c2, R + 7);
  // The curve's outermost point, where its label goes (outside the curve, never on it).
  const mid = { x: 0.125 * s.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * e.x, y: 0.125 * s.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * e.y };
  return { d: `M ${s.x} ${s.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${e.x} ${e.y}`, side, mid };
}

function edgePath(a: Placed, b: Placed, kind: string): string {
  return kind === 'cycle' ? cycleGeometry(a, b).d : branch(a, b);
}

export interface TagSpot {
  side: 'left' | 'right' | 'center';
  /** 0: just above the node; 1: one row higher, with a stem down to the node. */
  row: 0 | 1;
}

/** Estimated width of a node's labels (11.5px bold names in pills, 4px apart). */
export const tagsWidth = (tags: { name: string }[]) => tags.reduce((w, t) => w + 16 + t.name.length * 7, 0) + (tags.length - 1) * 4;

/**
 * Where each node's variable labels go. A label sits on the side away from the branch that
 * arrives from the parent (the root's is centered); going left to right along each level,
 * a label that would touch the previous one moves up a row instead of overlapping.
 */
function placeTags(comp: TreeComponent, nodes: Map<number, Placed>, labels: Map<number, NodeLabel[]>): Map<number, TagSpot> {
  const sideOf = new Map(comp.edges.filter((e) => e.kind === 'child').map((e) => [e.to, e.side]));
  const spots = new Map<number, TagSpot>();
  const byDepth = new Map<number, Placed[]>();
  for (const n of comp.nodes) {
    if (!(labels.get(n.id) ?? []).length) continue;
    byDepth.set(n.depth, [...(byDepth.get(n.depth) ?? []), nodes.get(n.id)!]);
  }
  for (const level of byDepth.values()) {
    level.sort((a, b) => a.x - b.x);
    const rightEdge = [-Infinity, -Infinity];
    for (const p of level) {
      const w = tagsWidth(labels.get(p.id)!);
      const side = sideOf.get(p.id) ?? 'center';
      const from = side === 'left' ? p.x - 8 - w : side === 'right' ? p.x + 8 : p.x - w / 2;
      const row: 0 | 1 = from >= rightEdge[0] + TAG_GAP ? 0 : from >= rightEdge[1] + TAG_GAP ? 1 : rightEdge[0] <= rightEdge[1] ? 0 : 1;
      rightEdge[row] = from + w;
      spots.set(p.id, { side, row });
    }
  }
  return spots;
}

function short(text: string): string {
  return text.length > BADGE_CHARS ? `${text.slice(0, BADGE_CHARS - 1)}…` : text;
}

function TreeComponentView({ comp, available, props }: { comp: TreeComponent; available: number; props: TreeViewProps }) {
  const { heap, labels, current, visited, returned, queued, written, created, highlighted, highlightedEdges, selected, onSelect, details } =
    props;
  const markerId = useId().replace(/:/g, '');
  const glide = useGlide();
  const { nodes, nullAt, width, height: treeHeight } = placeTree(comp, available);
  const isWritten = (from: number, side: string) => written.some((w) => w.objId === from && w.key === side);
  const isHighlightedEdge = (from: number, side: string) => !!highlightedEdges?.some((w) => w.objId === from && w.key === side);
  const nulls = comp.nulls.filter((n) => details || n.parent === current);
  // A "null" under a node on the deepest level sits below the tree's usual bottom: make room for it.
  const height = Math.max(
    treeHeight,
    ...nulls.map((n) => {
      const parent = nodes.get(n.parent);
      return parent ? nullAt(parent, n.side, n.slotX).y + 12 : 0;
    }),
  );
  const tagSpots = placeTags(comp, nodes, labels);

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        <defs>
          <marker
            id={`${markerId}-cycle`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" fill="#fb7185" />
          </marker>
          <marker
            id={`${markerId}-shared`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" fill="#fbbf24" />
          </marker>
        </defs>
        <AnimatePresence initial={false}>
          {nulls.map((n) => {
            const parent = nodes.get(n.parent);
            if (!parent) return null;
            const end = nullAt(parent, n.side, n.slotX);
            return (
              <motion.g
                key={`null-${n.parent}-${n.side}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <path
                  d={branch(parent, { id: -1, x: end.x, y: end.y - 14 + R })}
                  fill="none"
                  stroke="#3f5b8a"
                  strokeDasharray="2 5"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <text x={end.x} y={end.y + 4} textAnchor="middle" className="fill-navy-400" fontSize={12}>
                  null
                </text>
              </motion.g>
            );
          })}
          {comp.edges.map((e) => {
            const a = nodes.get(e.from);
            const b = nodes.get(e.to);
            if (!a || !b) return null;
            const hot = isWritten(e.from, e.side);
            const linked = isHighlightedEdge(e.from, e.side);
            const stroke =
              e.kind === 'cycle' ? '#fb7185' : e.kind === 'shared' ? '#fbbf24' : hot ? '#fcd34d' : linked ? '#c4b5fd' : '#5f7398';
            return (
              // Keyed by both ends: a re-pointed child fades its old branch out and draws the new one in.
              // Dashed cycle and second-parent edges fade in: drawing them in would replace their dash pattern.
              <motion.path
                key={`${e.from}-${e.side}-${e.to}`}
                initial={e.kind === 'child' ? { pathLength: 0, opacity: 0 } : { opacity: 0 }}
                animate={{ d: edgePath(a, b, e.kind), ...(e.kind === 'child' ? { pathLength: 1 } : {}), opacity: 1, stroke }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={glide}
                fill="none"
                strokeWidth={hot || linked ? 3.5 : 2.5}
                strokeLinecap="round"
                strokeDasharray={e.kind === 'child' ? undefined : '7 6'}
                markerEnd={e.kind === 'cycle' ? `url(#${markerId}-cycle)` : e.kind === 'shared' ? `url(#${markerId}-shared)` : undefined}
              />
            );
          })}
        </AnimatePresence>
        {comp.edges
          .filter((e) => e.kind !== 'child')
          .map((e) => {
            const a = nodes.get(e.from);
            const b = nodes.get(e.to);
            if (!a || !b) return null;
            const cycle = e.kind === 'cycle' ? cycleGeometry(a, b) : null;
            return (
              // Outside the curve, on a halo of board color, so no line runs through the words.
              <text
                key={`t-${e.from}-${e.side}`}
                x={cycle ? cycle.mid.x + cycle.side * 10 : (a.x + b.x) / 2 + 8}
                y={cycle ? cycle.mid.y + 4 : (a.y + b.y) / 2 + 4}
                className={e.kind === 'cycle' ? 'fill-rose-300' : 'fill-amber-300'}
                fontSize={12}
                fontWeight={700}
                textAnchor={cycle ? (cycle.side < 0 ? 'end' : 'start') : 'start'}
                stroke="#0b1322"
                strokeWidth={5}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {e.kind === 'cycle' ? `${e.side} → cycle` : `${e.side}: 2nd parent`}
              </text>
            );
          })}
      </svg>
      <AnimatePresence initial={false}>
        {comp.nodes.map((n) => {
          const p = nodes.get(n.id)!;
          const h = heap[n.id] as ObjectSnap;
          const isCurrent = current === n.id;
          const isVisited = !!visited?.has(n.id) && !isCurrent;
          const ret = returned?.get(n.id);
          const isNew = created.has(n.id);
          const isHot = highlighted?.has(n.id);
          const isSelected = selected === n.id;
          const tags = labels.get(n.id) ?? [];
          const value = props.diagram.labels[n.id] ?? nodeValueLabel(h, heap);
          const state = isCurrent ? 'current' : isNew ? 'new' : isVisited ? 'visited' : 'idle';
          const style = STATE[state];
          const describe = [
            `node ${value}`,
            tags.length ? `referenced by ${tags.map((t) => t.name).join(', ')}` : '',
            isCurrent ? 'current node' : isVisited ? 'visited' : isNew ? 'just created' : '',
            ret !== undefined ? `returned ${ret}` : '',
            queued?.has(n.id) ? 'in the queue' : '',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <motion.div
              key={n.id}
              className="absolute"
              style={{ left: 0, top: 0 }}
              initial={{ x: p.x - R, y: p.y - R, opacity: 0, scale: 0.4 }}
              animate={{ x: p.x - R, y: p.y - R, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
              transition={glide}
            >
              {/* Labels sit on the side away from the branch arriving from the parent (see placeTags), so no line crosses them. */}
              {tags.length > 0 && <TagGroup tags={tags} spot={tagSpots.get(n.id) ?? { side: 'center', row: 0 }} />}
              <button
                type="button"
                // A node that just became current lights up once (the key restarts the animation).
                key={isCurrent ? 'current' : 'rest'}
                onClick={() => onSelect?.(n.id)}
                aria-label={describe}
                aria-pressed={isSelected}
                title={describe}
                className={`relative flex items-center justify-center rounded-full text-[16px] font-bold transition-[background-color,box-shadow,color] duration-300 ${
                  isCurrent ? 'dg-light bg-teal-300 text-navy-950' : `${style.fill} text-navy-100`
                } ${isCurrent ? '' : isHot ? STATE.compare.ring : style.ring} ${
                  isSelected ? 'outline-2 outline-offset-4 outline-white' : ''
                } hover:brightness-125`}
                style={{ width: NODE, height: NODE }}
              >
                {value}
                {isVisited && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-teal-400 text-[10px] text-navy-950"
                  >
                    ✓
                  </span>
                )}
                {queued?.has(n.id) && (
                  <span
                    aria-hidden
                    className="absolute -right-2 -top-1.5 rounded-full bg-amber-300 px-1.5 text-[9.5px] font-bold text-navy-950"
                  >
                    queue
                  </span>
                )}
              </button>
              {ret !== undefined && (
                // Under the node, where it can't run into a neighbor on the same level.
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={glide}
                  title={`returned ${ret}`}
                  className="absolute left-1/2 top-full mt-2.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2a2752] px-2 py-px text-[11.5px] font-bold text-violet-100 shadow-[inset_0_0_0_1px_rgb(167_139_250/0.6)]"
                >
                  returned {short(ret)}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** A node's variable labels; a label moved up a row keeps a short stem down to its node. */
export function TagGroup({ tags, spot }: { tags: { name: string; active: boolean; frame?: string }[]; spot: TagSpot }) {
  const lift = spot.row * TAG_ROW;
  const align =
    spot.side === 'left'
      ? 'right-1/2 mr-2 items-end'
      : spot.side === 'right'
        ? 'left-1/2 ml-2 items-start'
        : 'left-1/2 -translate-x-1/2 items-center';
  return (
    <div className={`absolute bottom-full flex flex-col ${align}`} style={{ marginBottom: 6 }}>
      <div className="flex gap-1 whitespace-nowrap">
        {tags.map((t) => (
          <NameTag key={`${t.frame ?? ''}-${t.name}`} name={t.name} faint={!t.active} solid />
        ))}
      </div>
      {lift > 0 && <span aria-hidden className="mx-2 w-0.5 rounded-full bg-navy-400/70" style={{ height: lift }} />}
    </div>
  );
}

export function IssueList({ issues }: { issues: StructureIssue[] }) {
  if (!issues.length) return null;
  const style: Record<StructureIssue['kind'], string> = {
    cycle: 'shadow-[inset_3px_0_0_0_#fb7185] text-rose-100',
    shared: 'shadow-[inset_3px_0_0_0_#fbbf24] text-amber-50',
    detached: 'shadow-[inset_3px_0_0_0_#7d91b5] text-navy-200',
  };
  const title: Record<StructureIssue['kind'], string> = { cycle: 'Cycle', shared: 'Shared node', detached: 'Detached' };
  return (
    <ul className="mt-3 flex max-w-2xl flex-col gap-2">
      {issues.map((i, k) => (
        <li key={k} className={`rounded-xl bg-navy-850 px-3.5 py-2 text-[13.5px] leading-snug ${style[i.kind]}`}>
          <span className="font-bold">{title[i.kind]}: </span>
          {i.text.replace(/^Cycle: /, '')}
        </li>
      ))}
    </ul>
  );
}

/** Every tree in the heap, the one the code is working on first. Wide trees grow past the board and scroll. */
export function TreeView(props: TreeViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <div className="flex flex-col gap-2">
          {props.diagram.components.map((c) => (
            <TreeComponentView key={c.rootId} comp={c} available={width} props={props} />
          ))}
        </div>
      )}
      <IssueList issues={props.diagram.issues} />
    </div>
  );
}
