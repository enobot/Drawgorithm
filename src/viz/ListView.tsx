import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo } from 'react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ListDiagram, type ObjectSnap } from './analysis';
import { listSlots, type ListSlot } from './listLayout';
import { STATE, useGlide } from './theme';
import { IssueList, type NodeLabel } from './TreeView';
import { NameTag } from './Value';

const NODE_H = 48;
/** The node's `next` compartment, where its arrow starts (or "null" is written). */
const PTR_W = 34;
const VALUE_MIN_W = 42;
/** Horizontal room between columns for the arrow. */
const LINK_GAP = 52;
/** Room above a node for its variable labels. */
const TAG_ROOM = 34;
/** Room below a node for arrows that loop back or skip ahead. */
const ARC_ROOM = 44;
const ROW_H = TAG_ROOM + NODE_H + ARC_ROOM;
/** Padding around the drawing, so glows and labels at the edges are never cut off. */
const PAD = 20;

interface ListViewProps {
  diagram: ListDiagram;
  heap: Heap;
  labels: Map<number, NodeLabel[]>;
  current?: number | null;
  written: { objId: number; key: string }[];
  created: Set<number>;
  highlighted?: Set<number>;
  selected?: number | null;
  onSelect?: (id: number) => void;
  /**
   * Where each node sits. Run passes places kept for the whole run, so nodes stay put
   * while arrows change; without it the chains of this state are laid out in order.
   */
  slots?: Map<number, ListSlot>;
}

interface Box {
  x: number;
  y: number;
  w: number;
}

/** Width of the value compartment for a label (about 9px per character at 16px bold). */
const valueWidth = (label: string) => Math.max(VALUE_MIN_W, 18 + label.length * 9);

/**
 * The arrow from a node's `next` compartment to its target. Every arrow has the same
 * shape of path (one cubic curve), so re-pointing animates smoothly from old to new.
 */
function linkPath(from: Box, to: Box): string {
  const sx = from.x + from.w - PTR_W / 2;
  const sy = from.y + NODE_H / 2;
  const sameRow = from.y === to.y;
  if (sameRow && to.x > from.x && to.x - (from.x + from.w) <= LINK_GAP + 1) {
    // The next box to the right: a short, nearly straight arrow.
    const ex = to.x - 3;
    return `M ${sx} ${sy} C ${sx + 24} ${sy} ${ex - 24} ${sy} ${ex} ${sy}`;
  }
  if (sameRow) {
    // Backward, onto itself, or skipping ahead: dip under the row and come up into the target.
    const ex = to.x + Math.min(to.w / 2, 24);
    const ey = to.y + NODE_H + 2;
    const dip = Math.min(ARC_ROOM - 8, 18 + Math.abs(ex - sx) * 0.08);
    return `M ${sx} ${sy} C ${sx} ${sy + NODE_H / 2 + dip} ${ex} ${ey + dip} ${ex} ${ey}`;
  }
  // Another row: an S-curve into the target's left side.
  const ex = to.x - 3;
  const ey = to.y + NODE_H / 2;
  const reach = Math.max(48, Math.abs(ex - sx) * 0.35);
  return `M ${sx} ${sy} C ${sx + reach} ${sy} ${ex - reach} ${ey} ${ex} ${ey}`;
}

/** Linked lists as rounded two-part nodes (value | next) joined by arrows. */
export function ListView({ diagram, heap, labels, current, written, created, highlighted, selected, onSelect, slots }: ListViewProps) {
  const markerId = useId().replace(/:/g, '');
  const glide = useGlide();
  const ids = diagram.chains.flatMap((c) => c.ids);
  // Places kept for the run when they cover this state; otherwise this state's own chain layout.
  const places = useMemo(
    () => (slots && diagram.chains.every((c) => c.ids.every((id) => slots.has(id))) ? slots : listSlots([diagram])),
    [slots, diagram],
  );
  const label = (id: number) => diagram.labels[id] ?? nodeValueLabel(heap[id] as ObjectSnap, heap);
  const nextOf = (id: number) => diagram.nextField[id] ?? 'next';

  const present = new Set(ids);
  // Columns are as wide as their widest node; rows and columns reserved for nodes that
  // appear later keep their room, so the drawing doesn't jump when they arrive.
  const colW = new Map<number, number>();
  let rows = 0;
  let cols = 0;
  for (const [id, s] of places) {
    rows = Math.max(rows, s.row + 1);
    cols = Math.max(cols, s.col + 1);
    const w = (present.has(id) ? valueWidth(label(id)) : VALUE_MIN_W) + PTR_W;
    colW.set(s.col, Math.max(colW.get(s.col) ?? 0, w));
  }
  const colX: number[] = [];
  let x = PAD;
  for (let c = 0; c < cols; c++) {
    colX[c] = x;
    x += (colW.get(c) ?? VALUE_MIN_W + PTR_W) + LINK_GAP;
  }
  const width = x - LINK_GAP + PAD + 40; // room for a trailing "null" or arrow tip
  const height = rows * ROW_H + PAD;
  const box = (id: number): Box | null => {
    const s = places.get(id);
    if (!s) return null;
    return { x: colX[s.col], y: PAD / 2 + s.row * ROW_H + TAG_ROOM, w: valueWidth(label(id)) + PTR_W };
  };
  const closesCycle = new Set(diagram.chains.filter((c) => c.end.kind === 'cycle').map((c) => c.ids[c.ids.length - 1]));
  const nextIds = new Map<number, number | null>();
  for (const chain of diagram.chains) {
    chain.ids.forEach((id, i) => {
      const after = chain.ids[i + 1];
      nextIds.set(id, after ?? (chain.end.kind === 'null' ? null : chain.end.to));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" style={{ width, height }}>
        <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <defs>
            <marker
              id={`${markerId}-a`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10z" fill="#8094b8" />
            </marker>
            <marker
              id={`${markerId}-hot`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10z" fill="#fcd34d" />
            </marker>
            <marker
              id={`${markerId}-cycle`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10z" fill="#fb7185" />
            </marker>
          </defs>
          <AnimatePresence initial={false}>
            {ids.map((id) => {
              const to = nextIds.get(id);
              const a = box(id);
              const b = to != null ? box(to) : null;
              if (!a || !b) return null;
              const hot = written.some((w) => w.objId === id && w.key === nextOf(id));
              const kind = closesCycle.has(id) ? 'cycle' : hot ? 'hot' : 'a';
              return (
                // One arrow per node, keyed by the node: when `next` changes, the arrow swings to the new target.
                // (A dashed cycle arrow fades in: drawing it in would replace its dash pattern.)
                <motion.path
                  key={`link-${id}`}
                  initial={kind === 'cycle' ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                  animate={{
                    d: linkPath(a, b),
                    ...(kind === 'cycle' ? {} : { pathLength: 1 }),
                    opacity: 1,
                    stroke: kind === 'cycle' ? '#fb7185' : hot ? '#fcd34d' : '#8094b8',
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={glide}
                  fill="none"
                  strokeWidth={hot ? 3 : 2.25}
                  strokeLinecap="round"
                  strokeDasharray={kind === 'cycle' ? '7 6' : undefined}
                  markerEnd={`url(#${markerId}-${kind})`}
                />
              );
            })}
          </AnimatePresence>
        </svg>
        <AnimatePresence initial={false}>
          {ids.map((id) => {
            const b = box(id)!;
            const tags = labels.get(id) ?? [];
            const rewired = written.some((w) => w.objId === id && w.key === nextOf(id));
            const isCurrent = current === id;
            const state = isCurrent ? 'current' : created.has(id) ? 'new' : 'idle';
            const style = STATE[state];
            const isNull = nextIds.get(id) === null;
            const describe = [
              `node ${label(id)}`,
              tags.length ? `referenced by ${tags.map((t) => t.name).join(', ')}` : '',
              isNull ? `${nextOf(id)} is null` : '',
              rewired ? `${nextOf(id)} just changed` : '',
              isCurrent ? 'current' : '',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <motion.div
                key={id}
                className="absolute left-0 top-0"
                initial={{ x: b.x, y: b.y, opacity: 0, scale: 0.6 }}
                animate={{ x: b.x, y: b.y, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
                transition={glide}
                style={{ width: b.w }}
              >
                {tags.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 flex flex-col items-center" style={{ width: b.w - PTR_W }}>
                    <div className="flex gap-1 whitespace-nowrap">
                      {tags.map((t) => (
                        <NameTag key={`${t.frame}-${t.name}`} name={t.name} faint={!t.active} solid />
                      ))}
                    </div>
                    <span aria-hidden className="mt-0.5 h-2 w-0.5 rounded-full bg-navy-400" />
                  </div>
                )}
                <button
                  type="button"
                  // Lights up once when it becomes the current node (the key restarts the animation).
                  key={isCurrent ? 'current' : 'rest'}
                  onClick={() => onSelect?.(id)}
                  aria-label={describe}
                  aria-pressed={selected === id}
                  title={describe}
                  className={`flex w-full items-stretch overflow-hidden rounded-2xl text-[16px] font-bold transition-shadow duration-300 hover:brightness-125 ${
                    isCurrent ? 'dg-light' : ''
                  } ${style.fill} ${highlighted?.has(id) && !isCurrent ? STATE.compare.ring : style.ring} ${
                    selected === id ? 'outline-2 outline-offset-4 outline-white' : ''
                  }`}
                  style={{ height: NODE_H }}
                >
                  <span className="flex flex-1 items-center justify-center">{label(id)}</span>
                  <span
                    className={`flex items-center justify-center border-l text-[10px] font-semibold transition-colors duration-300 ${
                      rewired ? 'border-amber-300/50 bg-amber-300/15 text-amber-200' : 'border-navy-500/40 text-navy-400'
                    }`}
                    style={{ width: PTR_W }}
                  >
                    {isNull ? 'null' : <span aria-hidden className={`size-1.5 rounded-full ${rewired ? 'bg-amber-300' : 'bg-navy-300'}`} />}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <IssueList issues={diagram.issues} />
    </div>
  );
}
