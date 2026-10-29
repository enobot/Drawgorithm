import { AnimatePresence, motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import type { ProblemDef } from '../problems/catalog';
import type { Comparison } from '../problems/compare';
import type { FrameSnap, Heap, HeapSnap, StaticHints, Step, VarSnap } from '../trace/types';
import {
  buildListDiagram,
  buildTreeDiagram,
  conventionShape,
  formatSnap,
  markersFor,
  nodeLabels,
  refId,
  variableRefs,
  windowOf,
} from './analysis';
import { ArrayView, Cells, isGrid, type ArrayRole, type DequeExtras } from './ArrayView';
import { BitRows } from './BitsView';
import { numbersOf } from './illustrated/gumdrop';
import { GumdropScene } from './illustrated/GumdropScene';
import { lastRead, trackArrayItems } from './illustrated/identity';
import { ListScene } from './illustrated/ListScene';
import { NotebookScene } from './illustrated/NotebookScene';
import { QueueScene } from './illustrated/QueueScene';
import { ShelfScene } from './illustrated/ShelfScene';
import type { ShapeOf, StructureBinding } from './bindings';
import type { Focus } from './focus';
import { DRAWN_ABOVE, SpecialStructures } from './Special';
import { StatCards } from './StatCards';
import { trieRootOf } from './structures';
import type { ListSlot } from './listLayout';
import { ListView } from './ListView';
import { MapView, ObjectView, SetView } from './MapView';
import { GLIDE, STATE } from './theme';
import { TreeView } from './TreeView';
import { NameTag, ValueText, VarBlock, type BlockState } from './Value';

export interface BoardContext {
  step: Step;
  /** Static hints with the user's array bindings applied. */
  hints: StaticHints;
  /** Which objects are tree or list nodes, and which fields to read (from the bindings). */
  shapeOf?: ShapeOf;
  /** Heap id → heap, deque, union-find, graph or trie drawing (from the bindings). */
  roles?: Map<number, StructureBinding>;
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
  /** Places for linked-list nodes kept for the whole run (see listLayout.ts). */
  listSlots?: Map<number, ListSlot>;
  /** Draw queues, linked lists and index-searched arrays as illustrated scenes (same trace, different picture). */
  illustrated?: boolean;
  /**
   * Also draw the technical picture of structures that have a scene (the "Both" view).
   * Defaults to the opposite of `illustrated`. Structures without a scene are always drawn technically.
   */
  technical?: boolean;
  /** Every step of the run, for scenes that need history (who joined a line when, the last slot read). */
  steps?: Step[];
  /** Scroll the editor to a line (e.g. where the selected person joined the line). */
  onRevealLine?: (line: number) => void;
}

/** On a check (if, loop condition) the values the step read are being compared. */
const isComparison = (step: Step) => step.kind === 'condition' || step.kind === 'loop-check';

/** Node references are shown as pointer blocks; their structure is drawn once, above the frames. */
const isPrimitive = (v: VarSnap, heap: Heap, shapeOf: ShapeOf) => v.value.t !== 'ref' || !!shapeOf(heap[v.value.id]);

function roleOf(name: string, hints: StaticHints): ArrayRole {
  if (hints.deques?.includes(name)) return 'deque';
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

/**
 * A structure that has an illustrated scene: the scene alone, or, in the "Both" view, the
 * scene above its technical drawing of the same step.
 */
function withScene(ctx: BoardContext, scene: ReactNode, drawing: ReactNode): ReactNode {
  if (!(ctx.technical ?? !ctx.illustrated)) return scene;
  return (
    <div className="flex flex-col gap-3">
      {scene}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-navy-400">Technical view</span>
        {drawing}
      </div>
    </div>
  );
}

function StructureFor({
  names,
  h,
  frame,
  ctx,
  active,
}: {
  /** Every variable in this frame that refers to the structure; the first names it. */
  names: string[];
  h: HeapSnap;
  frame: FrameSnap;
  ctx: BoardContext;
  active: boolean;
}) {
  const { step, hints, focus, view } = ctx;
  const heap = step.heap;
  const name = names[0];
  switch (h.kind) {
    case 'array': {
      const markers = markersFor(frame, name, h.items.length, hints);
      const result = ctx.resultCells?.arrayName === name ? ctx.resultCells.indices : undefined;
      const special = ctx.roles?.get(h.id)?.role;
      const role = special === 'deque' ? 'deque' : roleOf(name, hints);
      const reads = active ? (focus.cellReads.get(h.id) ?? new Set<number>()) : new Set<number>();
      const writes = active ? (focus.cellWrites.get(h.id) ?? new Set<number>()) : new Set<number>();
      if (role === 'deque') {
        return (
          <Cells
            items={h.items}
            total={h.total}
            heap={heap}
            markers={[]}
            reads={reads}
            writes={writes}
            role="deque"
            result={result}
            comparing={active && isComparison(step)}
            shapeOf={ctx.shapeOf}
            deque={dequeExtras(h, names, step, ctx)}
          />
        );
      }
      const drawing = (
        <ArrayView
          arr={h}
          heap={heap}
          markers={markers}
          reads={reads}
          writes={writes}
          role={role}
          result={result}
          currentNode={ctx.current}
          cellReadsFor={active ? focus.cellReads : undefined}
          cellWritesFor={active ? focus.cellWrites : undefined}
          comparing={active && isComparison(step)}
          shapeOf={ctx.shapeOf}
        />
      );
      // Illustrated scenes, where a real-life picture fits the operation. Everything else stays technical.
      // Problems that opt in to the gumdrop cast draw a fully recorded row of numbers as gumdrops.
      const values =
        ctx.illustrated && view?.scene === 'gumdrops' && role === 'array' && h.total === h.items.length && !isGrid(h, heap)
          ? numbersOf(h.items)
          : null;
      if (values) {
        return withScene(
          ctx,
          <GumdropScene
            values={values}
            name={name}
            markers={markers}
            reads={reads}
            writes={writes}
            result={result}
            comparing={active && isComparison(step)}
            lookingDown={active && [...focus.mapLookups.values()].some((l) => l.length > 0)}
          />,
          drawing,
        );
      }
      if (ctx.illustrated && role === 'queue') {
        return withScene(
          ctx,
          <QueueScene
            arr={h}
            heap={heap}
            names={names}
            track={ctx.steps ? (trackArrayItems(ctx.steps, h.id)[step.index] ?? null) : null}
            steps={ctx.steps}
            effects={active ? step.effects : []}
            reads={reads}
            writes={writes}
            overlay={!!ctx.details}
            shapeOf={ctx.shapeOf ?? conventionShape}
            onSelectNode={ctx.onSelectNode}
            onRevealLine={ctx.onRevealLine}
          />,
          drawing,
        );
      }
      if (ctx.illustrated && role === 'array' && markers.some((m) => m.axis === 0) && !isGrid(h, heap)) {
        const compare = active && isComparison(step) ? [...step.effects].reverse().find((e) => e.type === 'compare') : undefined;
        const seen = ctx.steps
          ? lastRead(ctx.steps, h.id, step.index)
          : reads.size
            ? { step: step.index, index: Math.max(...reads) }
            : null;
        return withScene(
          ctx,
          <ShelfScene
            arr={h}
            heap={heap}
            name={name}
            markers={markers.filter((m) => m.axis === 0)}
            window={windowOf(markers)}
            reads={reads}
            writes={writes}
            result={result}
            comparing={active && isComparison(step)}
            compare={compare?.type === 'compare' ? { text: compare.text, result: compare.result } : null}
            lastRead={seen ? { index: seen.index, now: active && seen.step === step.index } : null}
            overlay={!!ctx.details}
            shapeOf={ctx.shapeOf ?? conventionShape}
          />,
          drawing,
        );
      }
      return drawing;
    }
    case 'map': {
      const lookups = active ? (focus.mapLookups.get(h.id) ?? []) : [];
      const inserts = active ? (focus.mapInserts.get(h.id) ?? []) : [];
      const drawing = <MapView map={h} heap={heap} lookups={lookups} inserts={inserts} columns={view?.mapColumns} shapeOf={ctx.shapeOf} />;
      if (ctx.illustrated && view?.scene === 'gumdrops') {
        return withScene(
          ctx,
          <NotebookScene
            map={h}
            heap={heap}
            name={name}
            lookups={lookups}
            inserts={inserts}
            columns={view?.mapColumns}
            shapeOf={ctx.shapeOf}
          />,
          drawing,
        );
      }
      return drawing;
    }
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

/**
 * What a deque drawing needs beyond its items: identities from the recorded adds and
 * removes, the values its items point at when the code reads nums[dq[k]], and which ends
 * this step used.
 */
function dequeExtras(h: Extract<HeapSnap, { kind: 'array' }>, names: string[], step: Step, ctx: BoardContext): DequeExtras {
  const track = ctx.steps ? trackArrayItems(ctx.steps, h.id)[step.index] : null;
  const lookups: DequeExtras['lookups'] = [];
  for (const target of [...new Set(names.flatMap((n) => ctx.hints.indexInto?.[n] ?? []))]) {
    // The array the items index into, from the innermost call that has it.
    const v = [...step.frames]
      .reverse()
      .flatMap((f) => f.vars)
      .find((x) => x.name === target);
    const t = v ? step.heap[refId(v.value) ?? -1] : undefined;
    if (t?.kind !== 'array') continue;
    lookups.push({
      name: target,
      values: h.items.map((x) =>
        x.t === 'number' && Number.isInteger(x.v) && x.v >= 0 && x.v < t.items.length ? t.items[x.v] : undefined,
      ),
    });
  }
  const own = step.effects.filter((e) => 'objId' in e && e.objId === h.id);
  const added = own.find((e) => e.type === 'array-add');
  const removed = own.find((e) => e.type === 'array-remove');
  return {
    ids: track?.ids.length === h.items.length ? track.ids : undefined,
    lookups,
    added: added?.type === 'array-add' ? added.end : null,
    removed: removed?.type === 'array-remove' ? removed.end : null,
  };
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
  // Heaps, graphs, tries and forests are drawn once above the calls; here they get a short note.
  const above: { name: string; role: string }[] = [];
  for (const v of frame.vars) {
    if (isPrimitive(v, heap, shapeOf)) continue;
    const id = refId(v.value)!;
    const h = heap[id];
    if (!h) continue;
    const special = ctx.roles?.get(id);
    if (special && DRAWN_ABOVE.includes(special.role)) {
      above.push({
        name: v.name,
        role: special.role === 'edge-list' ? 'graph' : special.role === 'union-find' ? 'union-find forest' : special.role,
      });
      continue;
    }
    // A Trie object (this, or a variable holding one) stands for the trie drawn from its root field.
    const root = h.kind === 'object' ? trieRootOf(h, heap) : id;
    if (root !== id && ctx.roles?.get(root)?.role === 'trie') {
      above.push({ name: v.name, role: 'trie' });
      continue;
    }
    const existing = structures.find((s) => s.h.id === id);
    if (existing) existing.names.push(v.name);
    else structures.push({ names: [v.name], h });
  }
  const anyCompute = active && [...focus.compute.keys()].some((n) => focus.declared.has(n));
  const comparing = active && isComparison(step);
  // A problem's key variables as big stat cards in the Illustrated style (in place of their small
  // blocks there; the "Both" view keeps the blocks too).
  const statNames = ctx.illustrated ? (ctx.view?.statCards ?? []) : [];
  const showStats = statNames.some((n) => frame.vars.some((v) => v.name === n));
  const shownBlocks = showStats && !ctx.technical ? blocks.filter((v) => !statNames.includes(v.name)) : blocks;

  if (!frame.vars.length) {
    return <p className="text-[13px] text-navy-400">No variables yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {showStats && <StatCards names={statNames} frame={frame} heap={heap} focus={focus} active={active} comparing={comparing} />}
      {shownBlocks.length > 0 && (
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <AnimatePresence initial={false}>
            {shownBlocks.map((v) => {
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
      {(hints.usage?.bits.length ?? 0) > 0 && (
        <BitRows frame={frame} step={step} steps={ctx.steps} names={hints.usage!.bits} active={active} />
      )}
      {above.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {above.map((a) => (
            <span key={a.name} className="flex items-center gap-1.5 text-[12px] text-navy-400">
              <NameTag name={a.name} />
              {a.role}, drawn above
            </span>
          ))}
        </div>
      )}
      {strings.map((v) => {
        const s = v.value.t === 'string' ? v.value.v : '';
        return (
          <div key={v.name} className="flex flex-col gap-2">
            <NameTag name={v.name} className="self-start" />
            {/* No scroll box of its own: a long string widens the card and the board scrolls, so nothing is clipped. */}
            <div className="pt-2">
              <Cells
                items={[...s].map((ch) => ({ t: 'string' as const, v: ch }))}
                total={(v.value.t === 'string' && v.value.len) || s.length}
                heap={heap}
                markers={markersFor(frame, v.name, (v.value.t === 'string' && v.value.len) || s.length, hints)}
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
        // Glides when something above it grows or shrinks, instead of jumping.
        <motion.div key={h.id} layout="position" transition={GLIDE} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {names.map((n) => (
              <NameTag key={n} name={n} />
            ))}
            {names.length > 1 && <span className="text-[11px] text-navy-400">same {h.kind === 'array' ? 'array' : 'object'}</span>}
            {active && ctx.focus.changedObjects.has(h.id) && <span className="text-[11px] font-semibold text-amber-300">changed</span>}
          </div>
          <div className={h.kind === 'array' ? 'pt-2' : ''}>
            <StructureFor names={names} h={h} frame={frame} ctx={ctx} active={active} />
          </div>
          {active && h.kind === 'array' && <ReadWriteCaption name={names[0]} h={h} focus={ctx.focus} heap={heap} />}
        </motion.div>
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

/** Says which structures have illustrated scenes, so the technical ones aren't a surprise. */
export function IllustratedNote() {
  return (
    <p className="max-w-2xl text-[12.5px] text-navy-400">
      Illustrated so far: queues (a line at a counter), linked lists (people holding ropes) and arrays read through index variables
      (numbered shelves). In Two Sum, numbers are gumdrops and the map is a notebook; more problems will follow. Trees, maps, sets, stacks,
      grids, heaps, deques, graphs, tries and union-find forests are otherwise still drawn the technical way.
    </p>
  );
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
  const specials = ctx.roles?.size ? (
    <SpecialStructures ctx={{ step, hints: ctx.hints, focus, roles: ctx.roles, steps: ctx.steps }} />
  ) : null;
  if (!tree.components.length && !list.chains.length) return specials;
  return (
    <>
      {specials}
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
        {list.chains.length > 0 &&
          (() => {
            const drawing = (
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
                slots={ctx.listSlots}
              />
            );
            if (!ctx.illustrated) return drawing;
            return withScene(
              ctx,
              <ListScene
                diagram={list}
                heap={step.heap}
                labels={labels}
                current={ctx.current}
                written={focus.propWrites}
                created={focus.created}
                highlighted={ctx.highlightedIds}
                selected={ctx.selectedNode}
                onSelect={ctx.onSelectNode}
                slots={ctx.listSlots}
                overlay={!!ctx.details}
              />,
              drawing,
            );
          })()}
      </section>
    </>
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
    <section aria-label="Call stack" className="relative flex flex-col gap-2">
      {showStack && (
        <h3 className="section-title">
          Call stack: {calls} active {calls === 1 ? 'call' : 'calls'}
        </h3>
      )}
      {/* popLayout: a finished call leaves the flow at once and fades where it was, so cards never stack on top of each other. */}
      <AnimatePresence initial={false} mode="popLayout">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={GLIDE}
              // The open card grows with wide content (a long array) instead of clipping it; the board scrolls.
              className={
                isActive
                  ? `w-fit min-w-full rounded-3xl bg-navy-900/90 p-4 sm:p-5 ${showStack ? 'shadow-[0_0_0_1.5px_rgb(94_234_212/0.5),0_10px_30px_-18px_rgb(45_212_191/0.6)]' : 'shadow-[inset_0_0_0_1px_rgb(125_145_181/0.18)]'}`
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
                  <span
                    title={`returns ${formatSnap(f.returning, step.heap)}`}
                    className="max-w-[min(100%,22rem)] truncate rounded-full bg-violet-400/15 px-2.5 py-0.5 text-[12px] font-semibold text-violet-100 shadow-[inset_0_0_0_1px_rgb(196_181_253/0.55)]"
                  >
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
        <p className="text-[15px] font-bold text-navy-50">
          {comparison ? (comparison.match ? 'Correct' : 'Not the expected output') : 'Finished'}
        </p>
        <p className="mt-0.5 text-[14px] leading-snug text-navy-100">{step.explanation}</p>
        {comparison && <p className="mt-1 text-[13px] text-navy-300">{comparison.message}</p>}
      </div>
    </div>
  );
}
