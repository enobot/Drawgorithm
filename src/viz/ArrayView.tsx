import { AnimatePresence, motion, PresenceContext } from 'motion/react';
import type { ReactNode } from 'react';
import type { Heap, HeapSnap, ValueSnap } from '../trace/types';
import { conventionShape, formatSnap, nodeValueLabel, windowOf, type Marker, type ObjectSnap } from './analysis';
import type { ShapeOf } from './bindings';
import { varColor } from './colors';
import { GLIDE, POP, STATE, useGlide, type VisualState } from './theme';
import { NameTag, ValueText } from './Value';

/** Standard cell width; a cell widens past it only for a long value. */
const CELL = 52;
const GAP = 8;
/** Vertical space per marker when several index variables point at the same cell. */
const MARKER_ROW = 24;

type ArraySnap = Extract<HeapSnap, { kind: 'array' }>;

export type ArrayRole = 'array' | 'queue' | 'stack' | 'deque';

interface CellsProps {
  items: ValueSnap[];
  total: number;
  heap: Heap;
  markers: Marker[];
  reads: Set<number>;
  writes: Set<number>;
  role: ArrayRole;
  result?: Set<number>;
  /** Node ids to tint as the current node in a traversal. */
  currentNode?: number | null;
  isString?: boolean;
  /** This step is a comparison: cells it read are "compared" rather than just "read". */
  comparing?: boolean;
  shapeOf?: ShapeOf;
  /** Slot → slot its new value came from this step (see heapMoves); the value glides over from there. */
  moves?: Map<number, number>;
  /** Deques: stable item identities (from the recorded adds and removes) and lookups like nums[dq[k]]. */
  deque?: DequeExtras;
}

export interface DequeExtras {
  /** One identity per item, in order; without them items are keyed by position and value. */
  ids?: string[];
  /** Arrays the items index into (the code reads nums[dq[k]]): the value each item points at. */
  lookups: { name: string; values: (ValueSnap | undefined)[] }[];
  /** Which end this step added to or removed from, so items enter and leave on that side. */
  added: 'front' | 'back' | null;
  removed: 'front' | 'back' | null;
}

function CellValue({ v, heap, isString, shapeOf }: { v: ValueSnap; heap: Heap; isString?: boolean; shapeOf: ShapeOf }) {
  if (isString && v.t === 'string') return <span className="text-teal-100">{v.v === ' ' ? '␣' : v.v}</span>;
  if (v.t === 'ref') {
    const h = heap[v.id];
    const shape = shapeOf(h);
    if (h && shape) {
      return (
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-navy-700 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_rgb(166_181_210/0.5)]">
          {nodeValueLabel(h as ObjectSnap, heap, shape)}
        </span>
      );
    }
  }
  return <ValueText v={v} heap={heap} shapeOf={shapeOf} compact className="text-[16px]" />;
}

function cellState(i: number, p: Pick<CellsProps, 'reads' | 'writes' | 'result' | 'currentNode' | 'comparing'>, v: ValueSnap): VisualState {
  if (p.writes.has(i)) return 'changed';
  if (p.result?.has(i)) return 'result';
  if (p.reads.has(i)) return p.comparing ? 'compare' : 'current';
  if (p.currentNode != null && v.t === 'ref' && v.id === p.currentNode) return 'current';
  return 'idle';
}

const CELL_LABEL: Partial<Record<VisualState, string>> = { changed: 'changed', result: 'answer', compare: 'compared', current: 'read' };

/** Estimated width a value needs in a cell (16px text plus padding); characters and nodes fit the standard cell. */
function valueWidth(v: ValueSnap, heap: Heap, shapeOf: ShapeOf, isString?: boolean): number {
  if (isString || (v.t === 'ref' && shapeOf(heap[v.id]))) return CELL;
  return formatSnap(v, heap, 1).length * 9.5 + 18;
}

/** Softly rounded tiles with subtle index labels, gliding pointer markers and an optional left..right window. */
export function Cells(props: CellsProps) {
  const { items, total, heap, markers, role, isString, shapeOf = conventionShape } = props;
  const glide = useGlide();
  if (role === 'deque') return <DequeView {...props} />;
  if (role === 'stack' && markers.length === 0) return <StackView {...props} />;
  if (role === 'queue' && markers.length === 0) return <QueueView {...props} />;
  const lead = markers.some((m) => m.index === -1) ? 1 : 0;
  const tail = markers.some((m) => m.index === items.length) ? 1 : 0;
  const win = windowOf(markers);
  const inWindow = (i: number) => !win || (i >= win.from && i <= win.to);
  const slots = lead + items.length + tail + (total > items.length ? 1 : 0);
  // Cells widen to fit their longest value, so a big number is never cut short or spills into a neighbor.
  const cell = Math.max(CELL, ...items.map((v) => valueWidth(v, heap, shapeOf, isString)));
  const step = cell + GAP;
  const width = Math.max(slots, 1) * step;
  // Each marker label gets the first row where it clears the label to its left, so long
  // names (smallest, current) show in full instead of being cut to the cell's width.
  const markerRow = new Map<string, number>();
  const rowRight: number[] = [];
  for (const m of [...markers].sort((a, b) => a.index - b.index)) {
    const half = (16 + m.name.length * 7) / 2;
    const center = (lead + m.index) * step + cell / 2;
    let row = 0;
    while ((rowRight[row] ?? -Infinity) > center - half - 4) row++;
    rowRight[row] = center + half;
    markerRow.set(m.name, row);
  }
  const markerRows = rowRight.length;
  const labelRow = items.some((v, i) => CELL_LABEL[cellState(i, props, v)]) ? 16 : 0;

  return (
    <div className="relative" style={{ width, paddingBottom: markerRows ? markerRows * MARKER_ROW + 16 + labelRow : 0 }}>
      {win && win.from <= win.to && (
        <motion.div
          aria-hidden
          className="absolute top-[-6px] h-[64px] rounded-[20px] bg-teal-400/8 shadow-[inset_0_0_0_1.5px_rgb(94_234_212/0.35)]"
          animate={{
            left: (lead + Math.max(win.from, 0)) * step - 4,
            width: (Math.min(win.to, items.length - 1) - Math.max(win.from, 0) + 1) * step,
          }}
          transition={glide}
        />
      )}
      <div className="relative flex" style={{ gap: GAP }}>
        {lead === 1 && <GhostCell label="-1" width={cell} />}
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => {
            const state = cellState(i, props, v);
            const style = STATE[state];
            const dim = win && !inWindow(i);
            const key = role === 'array' || v.t !== 'ref' ? `i${i}` : `r${v.id}-${i}`;
            const label = CELL_LABEL[state];
            const from = props.moves?.get(i);
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                // Cells outside the window fade, but their values stay readable (4.5:1, WCAG 1.4.3).
                animate={{ opacity: dim ? 0.6 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                transition={GLIDE}
                className="flex flex-col items-center"
                style={{ width: cell }}
                title={`${isString ? 'character' : 'item'} [${i}]${label ? `, ${label}` : ''}${dim ? ', outside the window' : ''}`}
              >
                <motion.div
                  key={state === 'changed' ? `w${JSON.stringify(v)}` : 'cell'}
                  initial={state === 'changed' && from === undefined ? { scale: 1.16 } : false}
                  animate={{ scale: 1 }}
                  transition={POP}
                  className={`flex h-[52px] items-center justify-center rounded-2xl font-semibold transition-shadow duration-300 ${style.fill} ${style.ring} ${
                    state === 'result' ? 'dg-success' : ''
                  }`}
                  style={{ width: cell }}
                >
                  {from !== undefined ? (
                    // The value written here was read from slot `from` in this step: it slides over from there.
                    <SlideIn dx={(from - i) * step}>
                      <CellValue v={v} heap={heap} isString={isString} shapeOf={shapeOf} />
                    </SlideIn>
                  ) : (
                    <CellValue v={v} heap={heap} isString={isString} shapeOf={shapeOf} />
                  )}
                </motion.div>
                <span className={`mt-1 text-[11.5px] tabular-nums ${state === 'idle' ? 'text-navy-400' : 'font-semibold text-navy-200'}`}>
                  {i}
                </span>
                {label && <span className={`text-[10.5px] font-semibold leading-3 ${style.labelColor}`}>{label}</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {tail === 1 && <GhostCell label={String(items.length)} width={cell} />}
        {total > items.length && (
          <div className="flex size-[52px] items-center justify-center text-[12px] text-navy-400">+{total - items.length} more</div>
        )}
      </div>
      {markers.map((m) => {
        const row = markerRow.get(m.name) ?? 0;
        const offset = row === 0 ? 0 : 10 + row * MARKER_ROW;
        // The first label at a cell hangs from it on a stem, however far down its row is.
        const first = markers.find((x) => x.index === m.index) === m;
        return (
          <motion.div
            key={m.name}
            className="absolute flex flex-col items-center"
            style={{ top: CELL + 22 + labelRow + (first ? 0 : offset), width: cell }}
            initial={false}
            animate={{ left: (lead + m.index) * step }}
            transition={glide}
          >
            {first && (
              <span aria-hidden className="mb-0.5 w-0.5 rounded-full" style={{ height: 10 + offset, background: varColor(m.name).hex }} />
            )}
            <NameTag name={m.name} className="whitespace-nowrap" />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Slides its content in from (dx, dy) to where it is drawn. It sits outside any presence
 * context on purpose: inside an item that was there when an AnimatePresence with
 * initial={false} first rendered, motion skips the entrance of everything mounted later.
 */
export function SlideIn({ dx, dy = 0, children }: { dx: number; dy?: number; children: ReactNode }) {
  const glide = useGlide();
  return (
    <PresenceContext.Provider value={null}>
      <motion.span initial={{ x: dx, y: dy }} animate={{ x: 0, y: 0 }} transition={glide} className="inline-flex">
        {children}
      </motion.span>
    </PresenceContext.Provider>
  );
}

/** A stack drawn upright: new items settle on top, popped items lift off. */
function StackView({ items, heap, reads, writes, result, currentNode, comparing, shapeOf = conventionShape }: CellsProps) {
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className="ml-1 rounded-full bg-navy-800 px-2 text-[11px] font-semibold text-navy-300">top</span>
      <div className="flex min-h-[60px] min-w-[120px] flex-col-reverse gap-1.5 rounded-b-3xl rounded-t-lg px-2 pb-2 pt-1 shadow-[inset_0_-2px_0_0_rgb(125_145_181/0.35),inset_2px_0_0_0_rgb(125_145_181/0.2),inset_-2px_0_0_0_rgb(125_145_181/0.2)]">
        <AnimatePresence initial={false}>
          {items.map((v, i) => {
            const state = cellState(i, { reads, writes, result, currentNode, comparing }, v);
            const style = STATE[state];
            return (
              <motion.div
                key={`${i}:${JSON.stringify(v)}`}
                layout
                initial={{ opacity: 0, y: -28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -28, transition: { duration: 0.2 } }}
                transition={GLIDE}
                className={`flex h-11 min-w-[104px] items-center justify-between gap-3 rounded-xl px-3 ${style.fill} ${style.ring}`}
              >
                <CellValue v={v} heap={heap} shapeOf={shapeOf} />
                <span className="text-[11px] tabular-nums text-navy-400">{i}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && <span className="px-2 py-2 text-[12px] text-navy-400">empty</span>}
      </div>
    </div>
  );
}

/** A queue as an open lane: items join at the back (right) and leave from the front (left). */
function QueueView({ items, heap, reads, writes, result, currentNode, comparing, shapeOf = conventionShape }: CellsProps) {
  return (
    <div
      className="inline-flex min-h-[60px] min-w-24 items-center gap-2 rounded-2xl px-2.5 py-1.5 shadow-[inset_0_1.5px_0_0_rgb(125_145_181/0.28),inset_0_-1.5px_0_0_rgb(125_145_181/0.28)]"
      title="Queue: items join at the back (right) and leave from the front (left)"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((v, i) => {
          const state = cellState(i, { reads, writes, result, currentNode, comparing }, v);
          const style = STATE[state];
          const end = items.length === 1 ? 'front · back' : i === 0 ? 'front' : i === items.length - 1 ? 'back' : null;
          return (
            <motion.div
              key={v.t === 'ref' ? `r${v.id}` : `${i}:${JSON.stringify(v)}`}
              layout="position"
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -36, transition: { duration: 0.2 } }}
              transition={GLIDE}
              className="flex flex-col items-center gap-0.5"
            >
              <div className={`flex h-11 min-w-11 items-center justify-center rounded-2xl px-2 ${style.fill} ${style.ring}`}>
                <CellValue v={v} heap={heap} shapeOf={shapeOf} />
              </div>
              <span className="h-3.5 whitespace-nowrap text-[10.5px] font-semibold leading-3.5 text-navy-400">{end}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {items.length === 0 && <span className="px-1 text-[12px] text-navy-400">empty</span>}
    </div>
  );
}

/** Which way the looked-up values run from the front, when they keep one order (a monotonic deque). */
function trend(values: (ValueSnap | undefined)[]): string | null {
  const nums = values.map((v) => (v?.t === 'number' ? v.v : null));
  if (nums.length < 2 || nums.some((n) => n === null)) return null;
  const steps = nums.slice(1).map((n, k) => n! - nums[k]!);
  if (steps.every((d) => d < 0)) return 'decreasing';
  if (steps.every((d) => d <= 0)) return 'never increasing';
  if (steps.every((d) => d > 0)) return 'increasing';
  if (steps.every((d) => d >= 0)) return 'never decreasing';
  return null;
}

/**
 * A deque as an open lane used at both ends: front on the left, back on the right, every
 * item with its index. Items join and leave on the end the recorded operation used. When
 * the code reads nums[dq[k]], each item also shows the value it points at.
 */
function DequeView({ items, heap, reads, writes, result, currentNode, comparing, shapeOf = conventionShape, deque }: CellsProps) {
  const glide = useGlide();
  const extras = deque ?? { lookups: [], added: null, removed: null };
  const exitX = extras.removed === 'front' ? -40 : 40;
  return (
    <div className="inline-flex flex-col gap-1.5">
      <div
        className="inline-flex min-h-[60px] min-w-32 items-start gap-2 rounded-2xl px-2.5 pb-1.5 pt-2 shadow-[inset_0_1.5px_0_0_rgb(125_145_181/0.28),inset_0_-1.5px_0_0_rgb(125_145_181/0.28)]"
        title="Deque: items can join or leave at the front (left) and at the back (right)"
      >
        <span className="mt-3 shrink-0 text-[10.5px] font-semibold text-navy-400">front</span>
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => {
            const state = cellState(i, { reads, writes, result, currentNode, comparing }, v);
            const style = STATE[state];
            const key = extras.ids?.[i] ?? `${i}:${JSON.stringify(v)}`;
            return (
              <motion.div
                key={key}
                layout="position"
                initial={{ opacity: 0, x: extras.added === 'front' ? -36 : 36 }}
                animate={{ opacity: 1, x: 0 }}
                // Leaves on the end the code removed from (shift: front, pop: back).
                exit={{ opacity: 0, x: exitX, transition: { duration: 0.2 } }}
                transition={glide}
                className="flex min-w-[52px] flex-col items-center gap-0.5"
                title={`item [${i}]${i === 0 ? ', front' : ''}${i === items.length - 1 ? ', back' : ''}`}
              >
                <div
                  className={`flex h-11 min-w-11 items-center justify-center rounded-2xl px-2 font-semibold ${style.fill} ${style.ring}`}
                >
                  <CellValue v={v} heap={heap} shapeOf={shapeOf} />
                </div>
                <span className="text-[11px] tabular-nums text-navy-400">{i}</span>
                {extras.lookups.map((l) =>
                  l.values[i] !== undefined ? (
                    <span key={l.name} className="flex flex-col items-center whitespace-nowrap text-[11px] leading-tight text-navy-400">
                      <span>
                        {l.name}[<ValueText v={v} heap={heap} compact />]
                      </span>
                      <ValueText v={l.values[i]} heap={heap} compact className="text-[13px] font-semibold" />
                    </span>
                  ) : null,
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && <span className="mt-2.5 px-1 text-[12px] text-navy-400">empty</span>}
        <span className="mt-3 shrink-0 text-[10.5px] font-semibold text-navy-400">back</span>
      </div>
      {extras.lookups.map((l) => {
        const t = trend(l.values);
        return t ? (
          <p key={l.name} className="text-[12px] text-navy-300">
            {l.name} values from front to back: <span className="font-semibold text-navy-100">{t}</span>
          </p>
        ) : null;
      })}
    </div>
  );
}

function GhostCell({ label, width }: { label: string; width: number }) {
  return (
    <div className="flex flex-col items-center" style={{ width }} title={`index ${label} is outside the array`}>
      <div className="flex size-[52px] items-center justify-center rounded-2xl text-[10.5px] text-navy-400 shadow-[inset_0_0_0_1.5px_rgb(63_91_138/0.8)] [background:repeating-linear-gradient(135deg,transparent_0_6px,rgb(63_91_138/0.18)_6px_8px)]">
        outside
      </div>
      <span className="mt-1 text-[11.5px] tabular-nums text-navy-400">{label}</span>
    </div>
  );
}

interface ArrayViewProps {
  arr: ArraySnap;
  heap: Heap;
  markers: Marker[];
  reads: Set<number>;
  writes: Set<number>;
  role: ArrayRole;
  result?: Set<number>;
  currentNode?: number | null;
  cellReadsFor?: Map<number, Set<number>>;
  cellWritesFor?: Map<number, Set<number>>;
  comparing?: boolean;
  shapeOf?: ShapeOf;
}

/** Arrays of flat arrays (DP tables, grids), drawn as a table. */
export function isGrid(arr: ArraySnap, heap: Heap): boolean {
  return (
    arr.items.length > 0 &&
    arr.items.every((v) => v.t === 'ref' && heap[v.id]?.kind === 'array' && (heap[v.id] as ArraySnap).items.every((x) => x.t !== 'ref'))
  );
}

export function ArrayView(props: ArrayViewProps) {
  const { arr, heap } = props;
  if (arr.total === 0 && props.role === 'array') {
    return (
      <div className="inline-flex h-12 items-center rounded-2xl px-4 text-[12.5px] text-navy-400 shadow-[inset_0_0_0_1.5px_rgb(63_91_138/0.7)]">
        empty
      </div>
    );
  }
  if (isGrid(arr, heap)) return <GridView {...props} />;
  return (
    <Cells
      items={arr.items}
      total={arr.total}
      heap={heap}
      markers={props.markers.filter((m) => m.axis === 0)}
      reads={props.reads}
      writes={props.writes}
      role={props.role}
      result={props.result}
      currentNode={props.currentNode}
      comparing={props.comparing}
      shapeOf={props.shapeOf}
    />
  );
}

/** Arrays of arrays (DP tables, grids): clean cells that light up as they are read and written. */
function GridView({ arr, heap, markers, cellReadsFor, cellWritesFor, comparing }: ArrayViewProps) {
  const rows = arr.items.map((v) => (v.t === 'ref' ? (heap[v.id] as ArraySnap) : null));
  const cols = Math.max(...rows.map((r) => r?.items.length ?? 0));
  const rowMarkers = markers.filter((m) => m.axis === 0);
  const colMarkers = markers.filter((m) => m.axis === 1);
  return (
    <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `auto repeat(${cols}, 2.75rem)` }}>
      <span />
      {Array.from({ length: cols }, (_, c) => (
        <span key={c} className="flex flex-col items-center gap-0.5 text-[11.5px] tabular-nums text-navy-400">
          {colMarkers
            .filter((m) => m.index === c)
            .map((m) => (
              <NameTag key={m.name} name={m.name} />
            ))}
          {c}
        </span>
      ))}
      {rows.map((row, r) => (
        <div key={r} className="contents">
          <span className="flex items-center justify-end gap-1 pr-1.5 text-[11.5px] tabular-nums text-navy-400">
            {rowMarkers
              .filter((m) => m.index === r)
              .map((m) => (
                <NameTag key={m.name} name={m.name} />
              ))}
            {r}
          </span>
          {Array.from({ length: cols }, (_, c) => {
            const v = row?.items[c];
            // Shorter rows (e.g. tree levels) end where their data ends: no empty boxes after them.
            if (!row || c >= row.items.length) return <span key={c} aria-hidden />;
            const read = row ? cellReadsFor?.get(row.id)?.has(c) : false;
            const write = row ? cellWritesFor?.get(row.id)?.has(c) : false;
            const state: VisualState = write ? 'changed' : read ? (comparing ? 'compare' : 'current') : 'idle';
            const style = STATE[state];
            return (
              <motion.div
                key={`${c}-${write ? JSON.stringify(v) : ''}`}
                initial={write ? { scale: 1.15 } : false}
                animate={{ scale: 1 }}
                transition={POP}
                className={`flex h-11 items-center justify-center rounded-xl text-[14px] font-semibold transition-shadow duration-300 ${style.fill} ${style.ring}`}
                title={`[${r}][${c}]${state !== 'idle' ? `, ${STATE[state].label}` : ''}`}
              >
                {v ? <ValueText v={v} heap={heap} compact /> : null}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
