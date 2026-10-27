import { AnimatePresence, motion } from 'motion/react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ObjectSnap, type StructureIssue, type TreeComponent, type TreeDiagram } from './analysis';
import { GLIDE, STATE } from './theme';
import { useWidth } from './useWidth';
import { NameTag } from './Value';

const NODE = 46;
const LEVEL = 86;
const TOP = 38; // room for variable labels above the root

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

function place(comp: TreeComponent, width: number): { nodes: Map<number, Placed>; compact: boolean } {
  const usable = Math.max(width - NODE, NODE);
  const bySlot = new Map(comp.nodes.map((n) => [n.id, { id: n.id, x: NODE / 2 + n.slotX * usable, y: TOP + n.depth * LEVEL }]));
  // Fixed slots keep nodes still while the tree grows; fall back to a compact layout when they get too tight.
  const levels = new Map<number, number[]>();
  for (const n of comp.nodes) levels.set(n.depth, [...(levels.get(n.depth) ?? []), bySlot.get(n.id)!.x]);
  let tight = false;
  for (const xs of levels.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < NODE + 12) tight = true;
  }
  if (!tight) return { nodes: bySlot, compact: false };
  return {
    nodes: new Map(comp.nodes.map((n) => [n.id, { id: n.id, x: NODE / 2 + n.orderX * usable, y: TOP + n.depth * LEVEL }])),
    compact: true,
  };
}

/** Whether a "returned …" badge fits to the right of a node centered at x (about 7px per 12px bold character). */
function badgeFits(x: number, ret: string, width: number): boolean {
  return x + NODE / 2 + 8 + 16 + `returned ${ret}`.length * 7 <= width;
}

/** A flowing branch from the bottom of the parent to the top of the child. */
function branch(x1: number, y1: number, x2: number, y2: number): string {
  const dy = y2 - y1;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.55} ${x2} ${y2 - dy * 0.55} ${x2} ${y2}`;
}

function edgePath(a: Placed, b: Placed, kind: string): string {
  if (kind === 'cycle') {
    // Curve outward so a back edge never hides behind the tree's branches.
    const dx = b.x - a.x;
    const side = dx <= 0 ? -1 : 1;
    const cx = Math.min(a.x, b.x) + dx / 2 + side * 80 + (dx === 0 ? -60 : 0);
    const cy = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y + NODE / 2} Q ${cx} ${cy} ${b.x + side * (NODE / 2)} ${b.y}`;
  }
  return branch(a.x, a.y + NODE / 2, b.x, b.y - NODE / 2);
}

function TreeComponentView({ comp, width, props }: { comp: TreeComponent; width: number; props: TreeViewProps }) {
  const { heap, labels, current, visited, returned, queued, written, created, highlighted, highlightedEdges, selected, onSelect, details } =
    props;
  const { nodes, compact } = place(comp, width);
  const height = TOP + comp.depth * LEVEL + NODE + 40;
  const isWritten = (from: number, side: string) => written.some((w) => w.objId === from && w.key === side);
  const isHighlightedEdge = (from: number, side: string) => !!highlightedEdges?.some((w) => w.objId === from && w.key === side);
  const nulls = compact ? [] : comp.nulls.filter((n) => details || n.parent === current);

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        <defs>
          <marker id="dg-arrow-cycle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#fb7185" />
          </marker>
          <marker id="dg-arrow-shared" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#fbbf24" />
          </marker>
        </defs>
        {nulls.map((n) => {
          const parent = nodes.get(n.parent);
          if (!parent) return null;
          const x = NODE / 2 + n.slotX * Math.max(width - NODE, NODE);
          const y = TOP + n.depth * LEVEL;
          return (
            <g key={`null-${n.parent}-${n.side}`} opacity={0.6}>
              <path
                d={branch(parent.x, parent.y + NODE / 2, x, y - 14)}
                fill="none"
                stroke="#3f5b8a"
                strokeDasharray="2 5"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text x={x} y={y} textAnchor="middle" className="fill-navy-400" fontSize={12}>
                null
              </text>
            </g>
          );
        })}
        <AnimatePresence initial={false}>
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
              <motion.path
                key={`${e.from}-${e.side}-${e.to}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ d: edgePath(a, b, e.kind), pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0, pathLength: 0, transition: { duration: 0.25 } }}
                transition={GLIDE}
                fill="none"
                stroke={stroke}
                strokeWidth={hot || linked ? 3.5 : 2.5}
                strokeLinecap="round"
                strokeDasharray={e.kind === 'child' ? undefined : '7 6'}
                markerEnd={e.kind === 'cycle' ? 'url(#dg-arrow-cycle)' : e.kind === 'shared' ? 'url(#dg-arrow-shared)' : undefined}
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
            return (
              <text
                key={`t-${e.from}-${e.side}`}
                x={(a.x + b.x) / 2 + (e.kind === 'cycle' ? (b.x <= a.x ? -50 : 50) : 8)}
                y={(a.y + b.y) / 2 + 4}
                className={e.kind === 'cycle' ? 'fill-rose-300' : 'fill-amber-300'}
                fontSize={12}
                fontWeight={700}
                textAnchor="middle"
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
              initial={{ x: p.x - NODE / 2, y: p.y - NODE / 2, opacity: 0, scale: 0.4 }}
              animate={{ x: p.x - NODE / 2, y: p.y - NODE / 2, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={GLIDE}
            >
              <div className="absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 gap-1 whitespace-nowrap">
                {tags.map((t) => (
                  <NameTag key={`${t.frame}-${t.name}`} name={t.name} faint={!t.active} />
                ))}
              </div>
              <button
                type="button"
                // A node that just became current lights up once (the key restarts the animation).
                key={isCurrent ? 'current' : 'rest'}
                onClick={() => onSelect?.(n.id)}
                aria-label={describe}
                aria-pressed={isSelected}
                title={describe}
                className={`relative flex items-center justify-center rounded-full text-[16px] font-bold transition-[background-color,box-shadow] duration-300 ${
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
                <motion.span
                  initial={{ opacity: 0, x: badgeFits(p.x, ret, width) ? -6 : 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={GLIDE}
                  // Beside the node, on the left when the right side would run past the drawing's edge.
                  className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-violet-400/20 px-2 text-[12px] font-bold text-violet-100 shadow-[inset_0_0_0_1px_rgb(167_139_250/0.6)] ${
                    badgeFits(p.x, ret, width) ? 'left-full ml-2' : 'right-full mr-2'
                  }`}
                >
                  returned {ret}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
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
    <ul className="mt-3 flex flex-col gap-2">
      {issues.map((i, k) => (
        <li key={k} className={`rounded-xl bg-navy-850 px-3.5 py-2 text-[13.5px] leading-snug ${style[i.kind]}`}>
          <span className="font-bold">{title[i.kind]}: </span>
          {i.text.replace(/^Cycle: /, '')}
        </li>
      ))}
    </ul>
  );
}

export function TreeView(props: TreeViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [main, ...rest] = props.diagram.components;
  return (
    <div ref={ref} className="w-full">
      {width > 0 && main && <TreeComponentView comp={main} width={width} props={props} />}
      {width > 0 && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4">
          {rest.map((c) => (
            <TreeComponentView key={c.rootId} comp={c} width={Math.min(width, Math.max(130, 2 ** c.depth * (NODE + 18)))} props={props} />
          ))}
        </div>
      )}
      <IssueList issues={props.diagram.issues} />
    </div>
  );
}
