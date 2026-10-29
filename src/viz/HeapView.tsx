// A heap array drawn twice, in sync: as the complete binary tree it stands for (the
// children of slot i are slots 2i+1 and 2i+2) and as its cells. Values the step moved
// (read from one slot, written to another, as in a swap) glide between slots in both.
import { AnimatePresence, motion } from 'motion/react';
import type { Heap, ValueSnap } from '../trace/types';
import type { Marker } from './analysis';
import { Cells, SlideIn } from './ArrayView';
import type { ShapeOf } from './bindings';
import { formatSnap } from './analysis';
import type { Dialect } from './dialect';
import { useDialect } from './dialectContext';
import { heapDepth, heapLevels, heapParent, heapX, placeTagRows, tagExtent, type ArraySnap } from './structures';
import { STATE, useGlide, type VisualState } from './theme';
import { TagGroup, tagsWidth } from './TreeView';
import { ValueText } from './Value';

const NODE = 48;
const R = NODE / 2;
/** Vertical distance between levels: room for two rows of labels above a node. */
const LEVEL = 104;
/** Horizontal distance between neighbors on the bottom level. */
const UNIT = 64;
/** Room above the root for its labels. */
const TOP = 58;
const BOTTOM = 18;
const PAD_X = 28;

export interface HeapViewProps {
  arr: ArraySnap;
  heap: Heap;
  /** Index variables pointing into the array (i, parent, child, ...). */
  markers: Marker[];
  reads: Set<number>;
  writes: Set<number>;
  comparing: boolean;
  /** Slot → slot its value came from in this step. */
  moves: Map<number, number>;
  shapeOf?: ShapeOf;
}

function slotState(i: number, p: HeapViewProps): VisualState {
  if (p.writes.has(i)) return 'changed';
  if (p.reads.has(i)) return p.comparing ? 'compare' : 'current';
  return 'idle';
}

const STATE_WORD: Partial<Record<VisualState, string>> = { changed: 'changed', compare: 'compared', current: 'read' };

/** Estimated width of a value in a node (15px bold) plus its padding. */
const labelWidth = (text: string) => text.length * 9 + 16;

/** "moved 3 from slot 4 to slot 1 and 9 from slot 1 to slot 4": what the step's writes did, in order of the slots written. */
function movesText(p: HeapViewProps, dialect: Dialect): string | null {
  if (!p.moves.size) return null;
  const parts = [...p.moves].map(([to, from]) => `${formatSnap(p.arr.items[to], p.heap, 0, dialect)} from slot ${from} to slot ${to}`);
  const swapped = p.moves.size === 2 && [...p.moves].every(([to, from]) => p.moves.get(from) === to);
  return swapped
    ? `This step swapped slots ${[...p.moves.keys()].join(' and ')}: ${parts.join(', ')}.`
    : `This step moved ${parts.join(', and ')}.`;
}

export function HeapView(props: HeapViewProps) {
  const { arr, heap, markers, moves } = props;
  const glide = useGlide();
  const dialect = useDialect();
  const n = arr.items.length;
  const levels = heapLevels(n);
  // Nodes widen into pills for long values (never cut short), and the levels spread out to match.
  const nodeW = Math.max(NODE, ...arr.items.map((v) => labelWidth(formatSnap(v, heap, 0, dialect))));
  const half = nodeW / 2;
  const span = Math.max(2 ** Math.max(levels - 1, 0), 1) * Math.max(UNIT, nodeW + 16);
  const rawX = (i: number) => heapX(i) * span;
  const yOf = (i: number) => TOP + heapDepth(i) * LEVEL + R;

  // Labels for index variables pointing at a slot, on the side away from the branch from the parent.
  const tagsAt = new Map<number, { name: string; active: boolean }[]>();
  for (const m of markers)
    if (m.index >= 0 && m.index < n) tagsAt.set(m.index, [...(tagsAt.get(m.index) ?? []), { name: m.name, active: true }]);
  const sideOf = (i: number): 'left' | 'right' | 'center' => (i === 0 ? 'center' : i % 2 === 1 ? 'left' : 'right');
  const spots = placeTagRows(
    [...tagsAt].map(([i, tags]) => ({ id: i, x: rawX(i), level: heapDepth(i), side: sideOf(i), width: tagsWidth(tags) })),
  );
  // The drawing is as wide as its nodes and labels, plus padding, so nothing at the edges is cut off.
  let minX = -half;
  let maxX = span + half;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, rawX(i) - half);
    maxX = Math.max(maxX, rawX(i) + half);
  }
  for (const [i, tags] of tagsAt) {
    const [a, b] = tagExtent(rawX(i), sideOf(i), tagsWidth(tags));
    minX = Math.min(minX, a);
    maxX = Math.max(maxX, b);
  }
  const shift = PAD_X - minX;
  const xOf = (i: number) => rawX(i) + shift;
  const width = maxX - minX + 2 * PAD_X;
  const height = n ? TOP + (levels - 1) * LEVEL + NODE + BOTTOM : 0;
  const caption = movesText(props, dialect);

  return (
    <div className="flex flex-col gap-3">
      {n === 0 ? (
        <div className="inline-flex h-12 items-center self-start rounded-2xl px-4 text-[12.5px] text-navy-400 shadow-[inset_0_0_0_1.5px_rgb(63_91_138/0.7)]">
          empty heap
        </div>
      ) : (
        <div
          className="relative"
          style={{ width, height }}
          aria-label={`Heap with ${n} ${n === 1 ? 'slot' : 'slots'}, drawn as a binary tree`}
        >
          <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
            {arr.items.map((_, i) => {
              if (i === 0) return null;
              const p = heapParent(i);
              const moved = moves.get(i) === p || moves.get(p) === i;
              const compared = props.reads.has(i) && props.reads.has(p) && props.comparing;
              const stroke = moved ? '#fcd34d' : compared ? '#c4b5fd' : '#5f7398';
              return (
                <motion.line
                  key={i}
                  x1={xOf(p)}
                  y1={yOf(p) + R}
                  x2={xOf(i)}
                  y2={yOf(i) - R}
                  initial={false}
                  animate={{ stroke }}
                  transition={glide}
                  strokeWidth={moved || compared ? 3.5 : 2.5}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <AnimatePresence initial={false}>
            {arr.items.map((v, i) => {
              const state = slotState(i, props);
              const style = STATE[state];
              const from = moves.get(i);
              const tags = tagsAt.get(i) ?? [];
              const word = STATE_WORD[state];
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: xOf(i) - half, top: yOf(i) - R, width: nodeW, height: NODE }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
                  transition={glide}
                >
                  {tags.length > 0 && <TagGroup tags={tags} spot={spots.get(i) ?? { side: 'center', row: 0 }} />}
                  <div
                    title={`slot ${i}: ${formatSnap(v, heap, 0, dialect)}${word ? `, ${word}` : ''}${i > 0 ? `; parent is slot ${heapParent(i)}` : '; top of the heap'}`}
                    className={`flex size-full flex-col items-center justify-center rounded-full leading-none transition-shadow duration-300 ${style.fill} ${style.ring}`}
                  >
                    <HeapValue
                      v={v}
                      heap={heap}
                      from={from}
                      dx={from !== undefined ? xOf(from) - xOf(i) : 0}
                      dy={from !== undefined ? yOf(from) - yOf(i) : 0}
                    />
                    <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-navy-400">[{i}]</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <div className="pt-2">
        <Cells
          items={arr.items}
          total={arr.total}
          heap={heap}
          markers={markers.filter((m) => m.axis === 0)}
          reads={props.reads}
          writes={props.writes}
          role="array"
          comparing={props.comparing}
          shapeOf={props.shapeOf}
          moves={moves}
        />
      </div>
      <p className="max-w-xl text-[12.5px] text-navy-300">
        {caption ?? 'The tree and the cells are the same array: the children of slot i are slots 2i+1 and 2i+2.'}
        {arr.total > n ? ` Only the first ${n} of ${arr.total} slots were recorded.` : ''}
      </p>
    </div>
  );
}

/** The value in a tree node; a value the step moved here glides in from its old node. */
function HeapValue({ v, heap, from, dx, dy }: { v: ValueSnap; heap: Heap; from: number | undefined; dx: number; dy: number }) {
  const text = <ValueText v={v} heap={heap} compact className="whitespace-nowrap text-[15px] font-bold" />;
  if (from === undefined) return text;
  return (
    <SlideIn key={`from-${from}-${JSON.stringify(v)}`} dx={dx} dy={dy}>
      {text}
    </SlideIn>
  );
}
