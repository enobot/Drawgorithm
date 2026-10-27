import { AnimatePresence, motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../trace/types';
import { isListObj, isTreeObj, nodeValueLabel, windowOf, type Marker, type ObjectSnap } from './analysis';
import { varColor } from './colors';
import { NameTag, ValueText } from './Value';

const CELL = 48;
const GAP = 6;
const STEP = CELL + GAP;
/** Vertical space per marker when several index variables point at the same cell. */
const MARKER_ROW = 22;

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
}

function CellValue({ v, heap, isString }: { v: ValueSnap; heap: Heap; isString?: boolean }) {
  if (isString && v.t === 'string') return <span className="text-teal-200">{v.v === ' ' ? '␣' : v.v}</span>;
  if (v.t === 'ref') {
    const h = heap[v.id];
    if (h && (isTreeObj(h) || isListObj(h))) {
      return (
        <span className="inline-flex items-center justify-center size-8 rounded-full border border-navy-400 bg-navy-800 text-[13px]">
          {nodeValueLabel(h as ObjectSnap, heap)}
        </span>
      );
    }
  }
  return <ValueText v={v} heap={heap} className="text-[15px]" />;
}

/** Indexed cells with index labels, pointer markers and an optional left..right window. */
export function Cells({ items, total, heap, markers, reads, writes, role, result, currentNode, isString }: CellsProps) {
  const lead = markers.some((m) => m.index === -1) ? 1 : 0;
  const tail = markers.some((m) => m.index === items.length) ? 1 : 0;
  const win = windowOf(markers);
  const inWindow = (i: number) => !win || (i >= win.from && i <= win.to);
  const slots = lead + items.length + tail + (total > items.length ? 1 : 0);
  const width = Math.max(slots, 1) * STEP;
  const byIndex = new Map<number, Marker[]>();
  for (const m of markers) byIndex.set(m.index, [...(byIndex.get(m.index) ?? []), m]);
  const markerRows = Math.max(0, ...[...byIndex.values()].map((l) => l.length));

  return (
    <div className="relative" style={{ width, paddingBottom: markerRows ? markerRows * MARKER_ROW + 18 : 0 }}>
      {win && win.from <= win.to && (
        <motion.div
          aria-hidden
          className="absolute top-[-4px] h-[56px] rounded-xl bg-teal-400/10 border border-teal-400/40"
          animate={{
            left: (lead + Math.max(win.from, 0)) * STEP - 3,
            width: (Math.min(win.to, items.length - 1) - Math.max(win.from, 0) + 1) * STEP,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        />
      )}
      <div className="relative flex" style={{ gap: GAP }}>
        {lead === 1 && <GhostCell label="-1" />}
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => {
            const isRead = reads.has(i);
            const isWrite = writes.has(i);
            const isResult = result?.has(i);
            const dim = win && !inWindow(i);
            const isCurrentNode = currentNode != null && v.t === 'ref' && v.id === currentNode;
            const key = role === 'array' || v.t !== 'ref' ? `i${i}` : `r${v.id}-${i}`;
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: dim ? 0.32 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="flex flex-col items-center"
                style={{ width: CELL }}
              >
                <motion.div
                  key={isWrite ? `w${JSON.stringify(v)}` : 'cell'}
                  initial={isWrite ? { scale: 1.15 } : false}
                  animate={{ scale: 1 }}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-mono bg-navy-850 ${
                    isWrite
                      ? 'border-amber-300 shadow-[0_0_0_3px_rgb(251_191_36/0.22)]'
                      : isRead || isCurrentNode
                        ? 'border-teal-300 shadow-[0_0_0_3px_rgb(45_212_191/0.25)]'
                        : isResult
                          ? 'border-violet-300 shadow-[0_0_0_3px_rgb(167_139_250/0.3)]'
                          : 'border-navy-600'
                  }`}
                >
                  <CellValue v={v} heap={heap} isString={isString} />
                </motion.div>
                <span
                  className={`mt-1 font-mono text-[11px] ${isResult ? 'text-violet-200 font-semibold' : isRead || isWrite ? 'text-navy-200' : 'text-navy-400'}`}
                >
                  [{i}]
                </span>
                {isResult && <span className="text-[10.5px] font-semibold text-violet-300">answer</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {tail === 1 && <GhostCell label={String(items.length)} />}
        {total > items.length && (
          <div className="w-12 h-12 flex items-center justify-center text-[11px] text-navy-400">+{total - items.length}</div>
        )}
      </div>
      {[...byIndex.entries()].flatMap(([index, list]) =>
        list.map((m, row) => (
          <motion.div
            key={m.name}
            className="absolute flex flex-col items-center"
            style={{ top: CELL + 20 + (row === 0 ? 0 : 9 + row * MARKER_ROW), width: CELL }}
            initial={false}
            animate={{ left: (lead + index) * STEP }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {row === 0 && (
              <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden className="mb-0.5">
                <path d="M5 0 10 7H0z" fill={varColor(m.name).hex} />
              </svg>
            )}
            <NameTag name={m.name} className="max-w-[52px] truncate whitespace-nowrap" />
          </motion.div>
        )),
      )}
      {role !== 'array' && items.length > 0 && (
        <div
          className="absolute -top-5 left-0 right-0 flex justify-between text-[11px] text-navy-400 pointer-events-none"
          style={{ width: (lead + items.length) * STEP }}
        >
          <span style={{ marginLeft: lead * STEP }}>{role === 'queue' ? 'front' : 'bottom'}</span>
          <span>{role === 'queue' ? 'back' : 'top'}</span>
        </div>
      )}
    </div>
  );
}

function GhostCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center" style={{ width: CELL }}>
      <div className="w-12 h-12 rounded-lg border-2 border-dashed border-navy-600 flex items-center justify-center text-[10px] text-navy-500">
        outside
      </div>
      <span className="mt-1 font-mono text-[11px] text-navy-500">[{label}]</span>
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
}

function isGrid(arr: ArraySnap, heap: Heap): boolean {
  return (
    arr.items.length > 0 &&
    arr.items.every((v) => v.t === 'ref' && heap[v.id]?.kind === 'array' && (heap[v.id] as ArraySnap).items.every((x) => x.t !== 'ref'))
  );
}

export function ArrayView(props: ArrayViewProps) {
  const { arr, heap } = props;
  if (arr.total === 0) {
    return (
      <div className="h-12 px-3 inline-flex items-center rounded-lg border-2 border-dashed border-navy-600 text-[12px] text-navy-400">
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
    />
  );
}

/** Arrays of arrays (DP tables, grids): rows with row and column indexes. */
function GridView({ arr, heap, markers, cellReadsFor, cellWritesFor }: ArrayViewProps) {
  const rows = arr.items.map((v) => (v.t === 'ref' ? (heap[v.id] as ArraySnap) : null));
  const cols = Math.max(...rows.map((r) => r?.items.length ?? 0));
  const rowMarkers = markers.filter((m) => m.axis === 0);
  const colMarkers = markers.filter((m) => m.axis === 1);
  return (
    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${cols}, 2.75rem)` }}>
      <span />
      {Array.from({ length: cols }, (_, c) => (
        <span key={c} className="text-center font-mono text-[11px] text-navy-400">
          {c}
          {colMarkers
            .filter((m) => m.index === c)
            .map((m) => (
              <NameTag key={m.name} name={m.name} className="ml-1" />
            ))}
        </span>
      ))}
      {rows.map((row, r) => (
        <div key={r} className="contents">
          <span className="pr-2 font-mono text-[11px] text-navy-400 self-center text-right">
            {rowMarkers
              .filter((m) => m.index === r)
              .map((m) => (
                <NameTag key={m.name} name={m.name} className="mr-1" />
              ))}
            {r}
          </span>
          {Array.from({ length: cols }, (_, c) => {
            const v = row?.items[c];
            const read = row ? cellReadsFor?.get(row.id)?.has(c) : false;
            const write = row ? cellWritesFor?.get(row.id)?.has(c) : false;
            return (
              <motion.div
                key={`${c}-${write ? JSON.stringify(v) : ''}`}
                initial={write ? { scale: 1.15 } : false}
                animate={{ scale: 1 }}
                className={`h-11 rounded-md border-2 flex items-center justify-center font-mono text-[13px] bg-navy-850 ${
                  write ? 'border-amber-300' : read ? 'border-teal-300' : 'border-navy-700'
                }`}
              >
                {v ? <ValueText v={v} heap={heap} /> : null}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
