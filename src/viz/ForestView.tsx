// A union-find parent array drawn as a forest: slot i hangs under slot parent[i], and a
// slot that is its own parent is a root. Writes to the array re-point an arrow; the
// caption says whether a root joined another group or a slot got a shortcut up its chain.
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import type { Effect, Heap, ValueSnap } from '../trace/types';
import type { Marker } from './analysis';
import { Cells } from './ArrayView';
import { buildForest, isAncestor, placeTagRows, tagExtent, type ArraySnap } from './structures';
import { STATE, useGlide, type VisualState } from './theme';
import { TagGroup, tagsWidth } from './TreeView';
import { ValueText } from './Value';

const NODE = 42;
const R = NODE / 2;
const LEVEL = 100;
const UNIT = 60;
const TOP = 58;
/** Room under the bottom row for an "in a loop" label. */
const BOTTOM = 40;
/** One line of the labels above a root ("root", then "size 2", "rank 1"). */
const NOTE_LINE = 13;
const PAD_X = 28;

export interface ForestViewProps {
  arr: ArraySnap;
  heap: Heap;
  markers: Marker[];
  reads: Set<number>;
  writes: Set<number>;
  comparing: boolean;
  /** This step's effects (for the writes' before and after values). */
  effects: Effect[];
  /** Same-length arrays such as rank or size, shown next to each root. */
  annotations: { name: string; values: ValueSnap[] }[];
}

export function ForestView(props: ForestViewProps) {
  const { arr, heap, markers, reads, writes, comparing, effects, annotations } = props;
  const glide = useGlide();
  const markerId = useId().replace(/:/g, '');
  const parent = arr.items.map((v) => (v.t === 'number' ? v.v : -1));
  const n = parent.length;
  const forest = buildForest(parent);
  const rawX = (i: number) => forest.spots.get(i)!.x * UNIT;
  // A root's labels sit above it, where no arrow arrives; its variable labels go above those.
  const noteHeight = (1 + annotations.length) * NOTE_LINE + 6;
  const top = TOP + noteHeight;
  const yOf = (i: number) => top + forest.spots.get(i)!.depth * LEVEL + R;
  const roots = new Set(forest.roots);

  const tagsAt = new Map<number, { name: string; active: boolean }[]>();
  for (const m of markers)
    if (m.axis === 0 && m.index >= 0 && m.index < n) tagsAt.set(m.index, [...(tagsAt.get(m.index) ?? []), { name: m.name, active: true }]);
  const sideOf = (i: number): 'left' | 'right' | 'center' => {
    if (roots.has(i) || parent[i] < 0) return 'center';
    const d = rawX(i) - rawX(parent[i]);
    return d < 0 ? 'left' : d > 0 ? 'right' : 'center';
  };
  const spots = placeTagRows(
    [...tagsAt].map(([i, tags]) => ({ id: i, x: rawX(i), level: forest.spots.get(i)!.depth, side: sideOf(i), width: tagsWidth(tags) })),
  );
  let minX = -R - 20;
  let maxX = (forest.width - 1) * UNIT + R + 20;
  for (const [i, tags] of tagsAt) {
    const [a, b] = tagExtent(rawX(i), sideOf(i), tagsWidth(tags));
    minX = Math.min(minX, a);
    maxX = Math.max(maxX, b);
  }
  const shift = PAD_X - minX;
  const xOf = (i: number) => rawX(i) + shift;
  const width = maxX - minX + 2 * PAD_X;
  const height = top + forest.depth * LEVEL + NODE + BOTTOM;

  const writeNotes = effects
    .filter((e): e is Extract<Effect, { type: 'index-write' }> => e.type === 'index-write' && e.objId === arr.id)
    .map((e) => {
      const before = e.before.t === 'number' ? e.before.v : null;
      const after = e.after.t === 'number' ? e.after.v : null;
      if (before === null || after === null) return `parent[${e.index}] was set.`;
      if (before === after) return `parent[${e.index}] was set to ${after} again (no change).`;
      if (before === e.index)
        return `parent[${e.index}]: ${before} → ${after}. Slot ${e.index} was a root; its group now hangs under ${after}.`;
      if (after === e.index) return `parent[${e.index}]: ${before} → ${after}. Slot ${e.index} is now a root.`;
      if (isAncestor(parent, after, before))
        return `parent[${e.index}]: ${before} → ${after}. A shortcut: ${after} is further up the same chain.`;
      return `parent[${e.index}]: ${before} → ${after}.`;
    });
  const nodeState = (i: number): VisualState => (writes.has(i) ? 'changed' : reads.has(i) ? (comparing ? 'compare' : 'current') : 'idle');

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative"
        style={{ width, height }}
        aria-label={`Union-find forest: ${forest.roots.length} ${forest.roots.length === 1 ? 'group' : 'groups'}`}
      >
        <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <defs>
            {['idle', 'hot', 'read'].map((k) => (
              <marker
                key={k}
                id={`${markerId}-${k}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10z" fill={k === 'hot' ? '#fcd34d' : k === 'read' ? '#c4b5fd' : '#7d91b5'} />
              </marker>
            ))}
          </defs>
          <AnimatePresence initial={false}>
            {parent.map((p, i) => {
              if (p === i || p < 0 || p >= n) return null;
              const hot = writes.has(i);
              const read = reads.has(i);
              const [x1, y1, x2, y2] = arrow(xOf(i), yOf(i), xOf(p), yOf(p));
              return (
                // Keyed by both ends: re-pointing parent[i] fades the old arrow and draws the new one.
                <motion.path
                  key={`${i}-${p}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ d: `M ${x1} ${y1} L ${x2} ${y2}`, pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={glide}
                  fill="none"
                  stroke={hot ? '#fcd34d' : read ? '#c4b5fd' : '#7d91b5'}
                  strokeWidth={hot || read ? 3 : 2}
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId}-${hot ? 'hot' : read ? 'read' : 'idle'})`}
                />
              );
            })}
          </AnimatePresence>
        </svg>
        {parent.map((p, i) => {
          const state = nodeState(i);
          const style = STATE[state];
          const tags = tagsAt.get(i) ?? [];
          const isRoot = roots.has(i);
          const notes = isRoot ? annotations.filter((a) => a.values[i] !== undefined) : [];
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: 0, top: 0, width: NODE, height: NODE }}
              initial={false}
              animate={{ x: xOf(i) - R, y: yOf(i) - R }}
              transition={glide}
            >
              {tags.length > 0 && (
                <div className="absolute inset-0" style={isRoot ? { transform: `translateY(${-noteHeight}px)` } : undefined}>
                  <TagGroup tags={tags} spot={spots.get(i) ?? { side: 'center', row: 0 }} />
                </div>
              )}
              {isRoot && (
                <div
                  className="absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-[10.5px] font-semibold"
                  style={{ lineHeight: `${NOTE_LINE}px` }}
                >
                  <span className="text-navy-300">root</span>
                  {notes.map((a) => (
                    <span key={a.name} className="text-navy-400">
                      {a.name} <ValueText v={a.values[i]} heap={heap} compact />
                    </span>
                  ))}
                </div>
              )}
              <div
                title={`slot ${i}: parent[${i}] = ${p}${isRoot ? ' (a root: its own parent)' : ''}`}
                className={`flex size-full items-center justify-center rounded-full text-[15px] font-bold text-navy-100 transition-shadow duration-300 ${style.fill} ${style.ring} ${
                  isRoot ? 'outline-2 outline-offset-2 outline-dashed outline-navy-400/70' : ''
                }`}
              >
                {i}
              </div>
              {forest.looped.includes(i) && (
                <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold text-rose-300">
                  in a loop
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="pt-2">
        <Cells
          items={arr.items}
          total={arr.total}
          heap={heap}
          markers={markers.filter((m) => m.axis === 0)}
          reads={reads}
          writes={writes}
          role="array"
          comparing={comparing}
        />
      </div>
      <div className="flex max-w-xl flex-col gap-1 text-[12.5px] text-navy-300">
        <p>
          {forest.roots.length} {forest.roots.length === 1 ? 'group' : 'groups'}
          {forest.roots.length > 0 && forest.roots.length <= 12 ? ` (roots ${forest.roots.join(', ')})` : ''}. Each arrow goes from a slot
          to its parent; a root is its own parent.
        </p>
        {writeNotes.map((t, k) => (
          <p key={k} className="text-amber-100">
            {t}
          </p>
        ))}
        {forest.looped.length > 0 && (
          <p className="text-rose-200">
            Slots {forest.looped.join(', ')} never reach a root: following parent from them goes around in a loop.
          </p>
        )}
      </div>
    </div>
  );
}

/** A straight arrow from the child's circle to the parent's, stopping at both outlines. */
function arrow(x1: number, y1: number, x2: number, y2: number): [number, number, number, number] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return [x1 + (dx / len) * R, y1 + (dy / len) * R, x2 - (dx / len) * (R + 4), y2 - (dy / len) * (R + 4)];
}
