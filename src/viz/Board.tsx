import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import type { ProblemDef } from '../problems/catalog';
import type { Comparison } from '../problems/compare';
import type { FrameSnap, Heap, HeapSnap, StaticHints, Step, VarSnap } from '../trace/types';
import {
  buildListDiagram,
  buildTreeDiagram,
  formatSnap,
  isListObj,
  isTreeObj,
  markersFor,
  nodeLabels,
  refId,
  variableRefs,
} from './analysis';
import { ArrayView, Cells, type ArrayRole } from './ArrayView';
import type { Focus } from './focus';
import { ListView } from './ListView';
import { MapView, ObjectView, SetView } from './MapView';
import { TreeView } from './TreeView';
import { NameTag, ValueText, VarBlock, type BlockState } from './Value';

export interface BoardContext {
  step: Step;
  hints: StaticHints;
  focus: Focus;
  view?: ProblemDef['view'];
  /** Index cells to ring on the final step (e.g. Two Sum's answer). */
  resultCells?: { arrayName: string; indices: Set<number> };
  current?: number | null;
  visited?: Set<number>;
  returned?: Map<number, string>;
  highlightedIds?: Set<number>;
  highlightedEdges?: { objId: number; key: string }[];
  highlightedVars?: Set<string>;
  selectedNode?: number | null;
  onSelectNode?: (id: number) => void;
  /** Build mode: every node the code created, including detached ones. */
  extraNodeIds?: number[];
}

const isPrimitive = (v: VarSnap, heap: Heap) => v.value.t !== 'ref' || isTreeObj(heap[v.value.id]) || isListObj(heap[v.value.id]);

function roleOf(name: string, hints: StaticHints): ArrayRole {
  if (hints.queues.includes(name)) return 'queue';
  if (hints.stacks.includes(name)) return 'stack';
  return 'array';
}

/** Ids of tree nodes held in queue/stack arrays, to badge them in the tree. */
function queuedNodes(frame: FrameSnap, heap: Heap, hints: StaticHints): Set<number> {
  const out = new Set<number>();
  for (const v of frame.vars) {
    if (!hints.queues.includes(v.name) && !hints.stacks.includes(v.name)) continue;
    const h = v.value.t === 'ref' ? heap[v.value.id] : undefined;
    if (h?.kind === 'array') for (const item of h.items) if (item.t === 'ref' && isTreeObj(heap[item.id])) out.add(item.id);
  }
  return out;
}

function StructureFor({
  name,
  h,
  frame,
  ctx,
  active,
}: {
  name: string;
  h: HeapSnap;
  frame: FrameSnap;
  ctx: BoardContext;
  active: boolean;
}) {
  const { step, hints, focus, view } = ctx;
  const heap = step.heap;
  switch (h.kind) {
    case 'array': {
      const markers = markersFor(frame, name, h.items.length, hints);
      const result = ctx.resultCells?.arrayName === name ? ctx.resultCells.indices : undefined;
      return (
        <ArrayView
          arr={h}
          heap={heap}
          markers={markers}
          reads={active ? (focus.cellReads.get(h.id) ?? new Set()) : new Set()}
          writes={active ? (focus.cellWrites.get(h.id) ?? new Set()) : new Set()}
          role={roleOf(name, hints)}
          result={result}
          currentNode={ctx.current}
          cellReadsFor={active ? focus.cellReads : undefined}
          cellWritesFor={active ? focus.cellWrites : undefined}
        />
      );
    }
    case 'map':
      return (
        <MapView
          map={h}
          heap={heap}
          lookups={active ? (focus.mapLookups.get(h.id) ?? []) : []}
          inserts={active ? (focus.mapInserts.get(h.id) ?? []) : []}
          columns={view?.mapColumns}
        />
      );
    case 'set':
      return (
        <SetView
          set={h}
          heap={heap}
          lookups={active ? (focus.setLookups.get(h.id) ?? []) : []}
          adds={active ? (focus.setAdds.get(h.id) ?? []) : []}
        />
      );
    case 'object':
      return (
        <ObjectView
          obj={h}
          heap={heap}
          writes={new Set(active ? focus.propWrites.filter((w) => w.objId === h.id).map((w) => w.key) : [])}
        />
      );
  }
}

/** Variables of one frame: value blocks first, then arrays, maps and objects. */
export function FrameContent({ frame, ctx, active }: { frame: FrameSnap; ctx: BoardContext; active: boolean }) {
  const { step, hints, focus } = ctx;
  const heap = step.heap;
  const blocks = frame.vars.filter((v) => isPrimitive(v, heap) && !(v.value.t === 'string' && hints.indexed.includes(v.name)));
  const strings = frame.vars.filter((v) => v.value.t === 'string' && hints.indexed.includes(v.name));
  const structures: { names: string[]; h: HeapSnap }[] = [];
  for (const v of frame.vars) {
    if (isPrimitive(v, heap)) continue;
    const id = refId(v.value)!;
    const h = heap[id];
    if (!h) continue;
    const existing = structures.find((s) => s.h.id === id);
    if (existing) existing.names.push(v.name);
    else structures.push({ names: [v.name], h });
  }
  const anyCompute = active && [...focus.compute.keys()].some((n) => focus.declared.has(n));

  if (!frame.vars.length) {
    return <p className="text-[13px] text-navy-400">No variables yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.length > 0 && (
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <AnimatePresence initial={false}>
            {blocks.map((v) => {
              let state: BlockState = 'idle';
              if (active) {
                if (focus.declared.has(v.name)) state = 'new';
                else if (focus.changed.has(v.name)) state = 'changed';
                else if (focus.reads.has(v.name)) state = 'read';
              }
              if (ctx.highlightedVars?.has(v.name)) state = state === 'idle' ? 'read' : state;
              const id = refId(v.value);
              return (
                <VarBlock
                  key={v.name}
                  name={v.name}
                  value={v.value}
                  heap={heap}
                  state={state}
                  declKind={v.declKind}
                  compute={active ? focus.compute.get(v.name) : undefined}
                  delay={anyCompute && state === 'new' ? 0.35 : 0}
                  onClick={id !== null && ctx.onSelectNode ? () => ctx.onSelectNode!(id) : undefined}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {strings.map((v) => {
        const s = v.value.t === 'string' ? v.value.v : '';
        return (
          <div key={v.name} className="flex flex-col gap-2">
            <NameTag name={v.name} className="self-start" />
            <div className="overflow-x-auto pb-1">
              <Cells
                items={[...s].map((ch) => ({ t: 'string' as const, v: ch }))}
                total={s.length}
                heap={heap}
                markers={markersFor(frame, v.name, s.length, hints)}
                reads={active ? (focus.charReads.get(v.name) ?? new Set()) : new Set()}
                writes={new Set()}
                role="array"
                isString
              />
            </div>
          </div>
        );
      })}
      {structures.map(({ names, h }) => (
        <div key={h.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {names.map((n) => (
              <NameTag key={n} name={n} />
            ))}
            {names.length > 1 && <span className="text-[11px] text-navy-400">same {h.kind === 'array' ? 'array' : 'object'}</span>}
            {active && ctx.focus.changedObjects.has(h.id) && <span className="text-[11px] font-semibold text-amber-300">changed</span>}
          </div>
          <div className={`overflow-x-auto ${h.kind === 'array' ? 'pt-5 pb-1' : ''}`}>
            <StructureFor name={names[0]} h={h} frame={frame} ctx={ctx} active={active} />
          </div>
        </div>
      ))}
    </div>
  );
}

function frameSummary(frame: FrameSnap, heap: Heap): string {
  return frame.vars
    .slice(0, 5)
    .map((v) => `${v.name} = ${formatSnap(v.value, heap)}`)
    .join(', ');
}

/** Trees and linked lists, drawn once for the whole call stack. */
export function Structures({ ctx }: { ctx: BoardContext }) {
  const { step, focus } = ctx;
  const { order, referenced } = useMemo(() => variableRefs(step.frames), [step]);
  const tree = useMemo(() => buildTreeDiagram(step.heap, order, referenced), [step, order, referenced]);
  const list = useMemo(() => buildListDiagram(step.heap, order, referenced), [step, order, referenced]);
  const labels = useMemo(() => nodeLabels(step.frames, step.heap), [step]);
  const activeFrame = step.frames[step.frames.length - 1];
  const queued = activeFrame ? queuedNodes(activeFrame, step.heap, ctx.hints) : new Set<number>();
  if (!tree.components.length && !list.chains.length) return null;
  return (
    <section aria-label="Trees and linked lists" className="flex flex-col gap-4">
      {tree.components.length > 0 && (
        <TreeView
          diagram={tree}
          heap={step.heap}
          labels={labels}
          current={ctx.current}
          visited={ctx.visited}
          returned={ctx.returned}
          queued={queued}
          written={focus.propWrites}
          created={focus.created}
          highlighted={ctx.highlightedIds}
          highlightedEdges={ctx.highlightedEdges}
          selected={ctx.selectedNode}
          onSelect={ctx.onSelectNode}
        />
      )}
      {list.chains.length > 0 && (
        <ListView
          diagram={list}
          heap={step.heap}
          labels={labels}
          current={ctx.current}
          written={focus.propWrites}
          created={focus.created}
          highlighted={ctx.highlightedIds}
          selected={ctx.selectedNode}
          onSelect={ctx.onSelectNode}
        />
      )}
    </section>
  );
}

const STACK_HEAD = 2;
const STACK_TAIL = 4;

/** The call stack: the active call is open, the calls waiting on it are summarized. */
export function CallStack({ ctx }: { ctx: BoardContext }) {
  const { step } = ctx;
  const all = step.frames.filter((f, i) => !(i === 0 && f.vars.length === 0 && step.frames.length > 1));
  const active = step.frames[step.frames.length - 1];
  const showStack = step.frames.length > 1;
  // Deep recursion: keep the outermost and innermost calls, and count the ones in between.
  const hidden = all.length > STACK_HEAD + STACK_TAIL + 1 ? all.length - STACK_HEAD - STACK_TAIL : 0;
  const frames = hidden ? [...all.slice(0, STACK_HEAD), ...all.slice(-STACK_TAIL)] : all;
  const calls = step.frames.length - 1;
  return (
    <section aria-label="Call stack" className="flex flex-col gap-2">
      {showStack && (
        <h3 className="section-title">
          Call stack: {calls} active {calls === 1 ? 'call' : 'calls'}
        </h3>
      )}
      <AnimatePresence initial={false}>
        {frames.flatMap((f, i) => {
          const isActive = f.id === active.id;
          const gap =
            hidden && i === STACK_HEAD ? (
              <p key="hidden-calls" className="px-3 text-[12px] text-navy-400">
                … {hidden} more waiting {hidden === 1 ? 'call' : 'calls'} …
              </p>
            ) : null;
          return [
            gap,
            <motion.div
              key={f.id}
              layout="position"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className={`rounded-xl border ${isActive ? 'border-teal-400/60 bg-navy-900/90 p-4' : 'border-navy-700 bg-navy-900/60 px-3 py-2'}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`font-mono text-[13px] font-semibold ${isActive ? 'text-teal-200' : 'text-navy-300'}`}>{f.label}</span>
                {!isActive && f.loc && <span className="text-[12px] text-navy-400">waiting at line {f.loc.line}</span>}
                {isActive && f.finished && <span className="text-[12px] text-navy-300">finished</span>}
                {f.returning && (
                  <span className="rounded-md border border-violet-400/60 bg-violet-400/15 px-2 py-0.5 text-[12px] font-semibold text-violet-200">
                    returns <ValueText v={f.returning} heap={step.heap} className="font-mono" />
                  </span>
                )}
              </div>
              {isActive ? (
                <div className="mt-3">
                  <FrameContent frame={f} ctx={ctx} active />
                </div>
              ) : (
                f.vars.length > 0 && <p className="mt-0.5 truncate font-mono text-[12px] text-navy-400">{frameSummary(f, step.heap)}</p>
              )}
            </motion.div>,
          ];
        })}
      </AnimatePresence>
    </section>
  );
}

export function ResultBanner({ step, comparison }: { step: Step; comparison: Comparison | null }) {
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 ${
        comparison
          ? comparison.match
            ? 'border-teal-400/60 bg-teal-400/10'
            : 'border-rose-400/60 bg-rose-400/10'
          : 'border-navy-600 bg-navy-850'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15px] font-semibold text-navy-100">
          {comparison ? (comparison.match ? '✓ Correct' : '✗ Not the expected output') : 'Finished'}
        </span>
        {step.result && (
          <span className="text-[14px] text-navy-200">
            Returned <ValueText v={step.result} heap={step.heap} className="font-mono" />
          </span>
        )}
      </div>
      {comparison && <p className="mt-1 text-[13px] text-navy-200">{comparison.message}</p>}
    </div>
  );
}
