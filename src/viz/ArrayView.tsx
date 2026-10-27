import { AnimatePresence, motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../trace/types';
import { conventionShape, nodeValueLabel, windowOf, type Marker, type ObjectSnap } from './analysis';
import type { ShapeOf } from './bindings';
import { varColor } from './colors';
import { GLIDE, POP, STATE, type VisualState } from './theme';
import { NameTag, ValueText } from './Value';

const CELL = 52;
const GAP = 8;
const STEP = CELL + GAP;
/** Vertical space per marker when several index variables point at the same cell. */
const MARKER_ROW = 24;

type ArraySnap = Extract<HeapSnap, { kind: 'array' }>;

export type ArrayRole = 'array' | 'queue' | 'stack';

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

/** Softly rounded tiles with subtle index labels, gliding pointer markers and an optional left..right window. */
export function Cells(props: CellsProps) {
  const { items, total, heap, markers, role, isString, shapeOf = conventionShape } = props;
  if (role === 'stack' && markers.length === 0) return <StackView {...props} />;
  if (role === 'queue' && markers.length === 0) return <QueueView {...props} />;
  const lead = markers.some((m) => m.index === -1) ? 1 : 0;
  const tail = markers.some((m) => m.index === items.length) ? 1 : 0;
  const win = windowOf(markers);
  const inWindow = (i: number) => !win || (i >= win.from && i <= win.to);
  const slots = lead + items.length + tail + (total > items.length ? 1 : 0);
  const width = Math.max(slots, 1) * STEP;
  const byIndex = new Map<number, Marker[]>();
  for (const m of markers) byIndex.set(m.index, [...(byIndex.get(m.index) ?? []), m]);
  const markerRows = Math.max(0, ...[...byIndex.values()].map((l) => l.length));
  const labelRow = items.some((v, i) => CELL_LABEL[cellState(i, props, v)]) ? 16 : 0;

  return (
    <div className="relative" style={{ width, paddingBottom: markerRows ? markerRows * MARKER_ROW + 16 + labelRow : 0 }}>
      {win && win.from <= win.to && (
        <motion.div
          aria-hidden
          className="absolute top-[-6px] h-[64px] rounded-[20px] bg-teal-400/8 shadow-[inset_0_0_0_1.5px_rgb(94_234_212/0.35)]"
          animate={{
            left: (lead + Math.max(win.from, 0)) * STEP - 4,
            width: (Math.min(win.to, items.length - 1) - Math.max(win.from, 0) + 1) * STEP,
          }}
          transition={GLIDE}
        />
      )}
      <div className="relative flex" style={{ gap: GAP }}>
        {lead === 1 && <GhostCell label="-1" />}
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => {
            const state = cellState(i, props, v);
            const style = STATE[state];
            const dim = win && !inWindow(i);
            const key = role === 'array' || v.t !== 'ref' ? `i${i}` : `r${v.id}-${i}`;
            const label = CELL_LABEL[state];
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: dim ? 0.3 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                transition={GLIDE}
                className="flex flex-col items-center"
                style={{ width: CELL }}
                title={`${isString ? 'character' : 'item'} [${i}]${label ? `, ${label}` : ''}${dim ? ', outside the window' : ''}`}
              >
                <motion.div
                  key={state === 'changed' ? `w${JSON.stringify(v)}` : 'cell'}
                  initial={state === 'changed' ? { scale: 1.16 } : false}
                  animate={{ scale: 1 }}
                  transition={POP}
                  className={`flex size-[52px] items-center justify-center rounded-2xl font-semibold transition-shadow duration-300 ${style.fill} ${style.ring} ${
                    state === 'result' ? 'dg-success' : ''
                  }`}
                >
                  <CellValue v={v} heap={heap} isString={isString} shapeOf={shapeOf} />
                </motion.div>
                <span className={`mt-1 text-[11.5px] tabular-nums ${state === 'idle' ? 'text-navy-500' : 'font-semibold text-navy-200'}`}>
                  {i}
                </span>
                {label && <span className={`text-[10.5px] font-semibold leading-3 ${style.labelColor}`}>{label}</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {tail === 1 && <GhostCell label={String(items.length)} />}
        {total > items.length && (
          <div className="flex size-[52px] items-center justify-center text-[12px] text-navy-400">+{total - items.length} more</div>
        )}
      </div>
      {[...byIndex.entries()].flatMap(([index, list]) =>
        list.map((m, row) => (
          <motion.div
            key={m.name}
            className="absolute flex flex-col items-center"
            style={{ top: CELL + 22 + labelRow + (row === 0 ? 0 : 10 + row * MARKER_ROW), width: CELL }}
            initial={false}
            animate={{ left: (lead + index) * STEP }}
            transition={GLIDE}
          >
            {row === 0 && <span aria-hidden className="mb-0.5 h-2.5 w-0.5 rounded-full" style={{ background: varColor(m.name).hex }} />}
            <NameTag name={m.name} className="max-w-[60px] truncate whitespace-nowrap" />
          </motion.div>
        )),
      )}
    </div>
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
                <span className="text-[11px] tabular-nums text-navy-500">{i}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && <span className="px-2 py-2 text-[12px] text-navy-500">empty</span>}
      </div>
    </div>
  );
}

/** A queue as a lane: items join at the back (right) and leave from the front (left). */
function QueueView({ items, heap, reads, writes, result, currentNode, comparing, shapeOf = conventionShape }: CellsProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="flex flex-col items-center text-[11px] font-semibold text-navy-300">
        <span aria-hidden>←</span>front
      </span>
      <div className="flex min-h-[64px] min-w-[120px] items-center gap-2 rounded-full bg-navy-850 px-3 py-2 shadow-[inset_0_0_0_1.5px_rgb(125_145_181/0.25)]">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => {
            const state = cellState(i, { reads, writes, result, currentNode, comparing }, v);
            const style = STATE[state];
            return (
              <motion.div
                key={v.t === 'ref' ? `r${v.id}` : `${i}:${JSON.stringify(v)}`}
                layout
                initial={{ opacity: 0, x: 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -36, transition: { duration: 0.2 } }}
                transition={GLIDE}
                className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-2 ${style.fill} ${style.ring}`}
              >
                <CellValue v={v} heap={heap} shapeOf={shapeOf} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && <span className="px-1 text-[12px] text-navy-500">empty</span>}
      </div>
      <span className="flex flex-col items-center text-[11px] font-semibold text-navy-300">
        <span aria-hidden>←</span>back
      </span>
    </div>
  );
}

function GhostCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ width: CELL }} title={`index ${label} is outside the array`}>
      <div className="flex size-[52px] items-center justify-center rounded-2xl text-[10.5px] text-navy-500 shadow-[inset_0_0_0_1.5px_rgb(63_91_138/0.8)] [background:repeating-linear-gradient(135deg,transparent_0_6px,rgb(63_91_138/0.18)_6px_8px)]">
        outside
      </div>
      <span className="mt-1 text-[11.5px] tabular-nums text-navy-500">{label}</span>
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

function isGrid(arr: ArraySnap, heap: Heap): boolean {
  return (
    arr.items.length > 0 &&
    arr.items.every((v) => v.t === 'ref' && heap[v.id]?.kind === 'array' && (heap[v.id] as ArraySnap).items.every((x) => x.t !== 'ref'))
  );
}

export function ArrayView(props: ArrayViewProps) {
  const { arr, heap } = props;
  if (arr.total === 0 && props.role === 'array') {
    return (
      <div className="inline-flex h-12 items-center rounded-2xl px-4 text-[12.5px] text-navy-500 shadow-[inset_0_0_0_1.5px_rgb(63_91_138/0.7)]">
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
        <span key={c} className="flex flex-col items-center gap-0.5 text-[11.5px] tabular-nums text-navy-500">
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
          <span className="flex items-center justify-end gap-1 pr-1.5 text-[11.5px] tabular-nums text-navy-500">
            {rowMarkers
              .filter((m) => m.index === r)
              .map((m) => (
                <NameTag key={m.name} name={m.name} />
              ))}
            {r}
          </span>
          {Array.from({ length: cols }, (_, c) => {
            const v = row?.items[c];
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
