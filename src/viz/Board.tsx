import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import type { ProblemDef } from '../problems/catalog';
import type { Comparison } from '../problems/compare';
import type { FrameSnap, Heap, HeapSnap, StaticHints, Step, VarSnap } from '../trace/types';
import { buildListDiagram, buildTreeDiagram, conventionShape, formatSnap, markersFor, nodeLabels, refId, variableRefs } from './analysis';
import { ArrayView, Cells, type ArrayRole } from './ArrayView';
import type { ShapeOf } from './bindings';
import type { Focus } from './focus';
import { ListView } from './ListView';
import { MapView, ObjectView, SetView } from './MapView';
import { STATE } from './theme';
import { TreeView } from './TreeView';
import { NameTag, ValueText, VarBlock, type BlockState } from './Value';

export interface BoardContext {
  step: Step;
  /** Static hints with the user's array bindings applied. */
  hints: StaticHints;
  /** Which objects are tree or list nodes, and which fields to read (from the bindings). */
  shapeOf?: ShapeOf;
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
  /** Show indices, declarations, null children and other secondary detail. */
  details?: boolean;
}

/** On a check (if, loop condition) the values the step read are being compared. */
const isComparison = (step: Step) => step.kind === 'condition' || step.kind === 'loop-check';

/** Node references are shown as pointer blocks; their structure is drawn once, above the frames. */
const isPrimitive = (v: VarSnap, heap: Heap, shapeOf: ShapeOf) => v.value.t !== 'ref' || !!shapeOf(heap[v.value.id]);

function roleOf(name: string, hints: StaticHints): ArrayRole {
  if (hints.queues.includes(name)) return 'queue';
  if (hints.stacks.includes(name)) return 'stack';
  return 'array';
}

/** Ids of tree nodes held in queue/stack arrays, to badge them in the tree. */
function queuedNodes(frame: FrameSnap, heap: Heap, hints: StaticHints, shapeOf: ShapeOf): Set<number> {
  const out = new Set<number>();
  for (const v of frame.vars) {
    if (!hints.queues.includes(v.name) && !hints.stacks.includes(v.name)) continue;
    const h = v.value.t === 'ref' ? heap[v.value.id] : undefined;
    if (h?.kind === 'array') for (const item of h.items) if (item.t === 'ref' && shapeOf(heap[item.id])?.kind === 'tree') out.add(item.id);
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
          comparing={active && isComparison(step)}
          shapeOf={ctx.shapeOf}
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
          shapeOf={ctx.shapeOf}
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
          shapeOf={ctx.shapeOf}
        />
      );
  }
}

const joinAnd = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * Cells read and written in this step, as text. This is what was observed; whether the
 * reads are the written value's "subproblems" is the algorithm's meaning, which is not claimed.
 */
export function readWriteText(name: string, h: Extract<HeapSnap, { kind: 'array' }>, focus: Focus, heap: Heap): string | null {
  const reads: string[] = [];
  const writes: string[] = [];
  const isGrid = h.items.length > 0 && h.items.every((v) => v.t === 'ref' && heap[v.id]?.kind === 'array');
  if (isGrid) {
    h.items.forEach((v, r) => {
      if (v.t !== 'ref') return;
      for (const c of focus.cellReads.get(v.id) ?? []) reads.push(`${name}[${r}][${c}]`);
      for (const c of focus.cellWrites.get(v.id) ?? []) writes.push(`${name}[${r}][${c}]`);
    });
  } else {
    for (const i of focus.cellReads.get(h.id) ?? []) reads.push(`${name}[${i}]`);
    for (const i of focus.cellWrites.get(h.id) ?? []) writes.push(`${name}[${i}]`);
  }
  const readOnly = reads.filter((x) => !writes.includes(x));
  if (!writes.length || !readOnly.length) return null;
  return `This step read ${joinAnd(readOnly)} and wrote ${joinAnd(writes)}.`;
}

function ReadWriteCaption({ name, h, focus, heap }: { name: string; h: Extract<HeapSnap, { kind: 'array' }>; focus: Focus; heap: Heap }) {
  const text = readWriteText(name, h, focus, heap);
  if (!text) return null;
  return (
    <p className="text-[12.5px] text-navy-200">
      <span className="mr-1.5 rounded bg-teal-400/15 px-1 text-teal-200">read</span>
      <span className="mr-1.5 rounded bg-amber-300/15 px-1 text-amber-200">wrote</span>
      {text}
    </p>
  );
}

/** Variables of one frame: value blocks first, then arrays, maps and objects. */
export function FrameContent({ frame, ctx, active }: { frame: FrameSnap; ctx: BoardContext; active: boolean }) {
  const { step, hints, focus } = ctx;
  const heap = step.heap;
  const shapeOf = ctx.shapeOf ?? conventionShape;
  const blocks = frame.vars.filter((v) => isPrimitive(v, heap, shapeOf) && !(v.value.t === 'string' && hints.indexed.includes(v.name)));
  const strings = frame.vars.filter((v) => v.value.t === 'string' && hints.indexed.includes(v.name));
  const structures: { names: string[]; h: HeapSnap }[] = [];
  for (const v of frame.vars) {
    if (isPrimitive(v, heap, shapeOf)) continue;
    const id = refId(v.value)!;
    const h = heap[id];
    if (!h) continue;
    const existing = structures.find((s) => s.h.id === id);
    if (existing) existing.names.push(v.name);
    else structures.push({ names: [v.name], h });
  }
  const anyCompute = active && [...focus.compute.keys()].some((n) => focus.declared.has(n));
  const comparing = active && isComparison(step);

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
                else if (focus.reads.has(v.name)) state = comparing ? 'compare' : 'read';
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
                  shapeOf={shapeOf}
                  details={ctx.details}
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
          {active && h.kind === 'array' && <ReadWriteCaption name={names[0]} h={h} focus={ctx.focus} heap={heap} />}
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
  const shapeOf = ctx.shapeOf ?? conventionShape;
  const tree = useMemo(() => buildTreeDiagram(step.heap, order, referenced, shapeOf), [step, order, referenced, shapeOf]);
  const list = useMemo(() => buildListDiagram(step.heap, order, referenced, shapeOf), [step, order, referenced, shapeOf]);
  const labels = useMemo(() => nodeLabels(step.frames, step.heap, shapeOf), [step, shapeOf]);
  const activeFrame = step.frames[step.frames.length - 1];
  const queued = activeFrame ? queuedNodes(activeFrame, step.heap, ctx.hints, shapeOf) : new Set<number>();
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
          details={ctx.details}
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
              className={
                isActive
                  ? `rounded-3xl bg-navy-900/90 p-4 sm:p-5 ${showStack ? 'shadow-[0_0_0_1.5px_rgb(94_234_212/0.5),0_10px_30px_-18px_rgb(45_212_191/0.6)]' : 'shadow-[inset_0_0_0_1px_rgb(125_145_181/0.18)]'}`
                  : 'rounded-2xl bg-navy-900/55 px-3.5 py-2 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.16)]'
              }
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {showStack && (
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${isActive ? 'bg-teal-300 shadow-[0_0_8px_rgb(94_234_212/0.8)]' : 'bg-navy-500'}`}
                  />
                )}
                <span className={`font-mono text-[13px] font-semibold ${isActive ? 'text-teal-100' : 'text-navy-300'}`}>{f.label}</span>
                {!isActive && f.loc && <span className="text-[12px] text-navy-400">waiting at line {f.loc.line}</span>}
                {isActive && showStack && !f.finished && <span className="text-[12px] text-teal-300">running now</span>}
                {isActive && f.finished && <span className="text-[12px] text-navy-300">finished</span>}
                {f.returning && (
                  <span className="rounded-full bg-violet-400/15 px-2.5 py-0.5 text-[12px] font-semibold text-violet-100 shadow-[inset_0_0_0_1px_rgb(196_181_253/0.55)]">
                    returns <ValueText v={f.returning} heap={step.heap} />
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
  const tone = comparison ? (comparison.match ? STATE.result : STATE.error) : STATE.idle;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-3xl px-4 py-3.5 ${tone.fill} ${tone.ring}`}>
      {comparison && (
        <span
          aria-hidden
          // Keyed so the check pops once each time a run lands on the right answer.
          key={comparison.match ? 'match' : 'miss'}
          className={`grid size-8 shrink-0 place-items-center rounded-full text-[16px] font-bold ${
            comparison.match ? 'dg-success bg-emerald-300 text-navy-950' : 'bg-rose-400/25 text-rose-100'
          }`}
        >
          {comparison.match ? '✓' : '✗'}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[15px] font-bold text-navy-50">
            {comparison ? (comparison.match ? 'Correct' : 'Not the expected output') : 'Finished'}
          </span>
          {step.result && (
            <span className="text-[14px] text-navy-200">
              Returned <ValueText v={step.result} heap={step.heap} />
            </span>
          )}
        </div>
        {comparison && <p className="mt-1 text-[13px] text-navy-200">{comparison.message}</p>}
      </div>
    </div>
  );
}
