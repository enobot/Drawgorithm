// Heaps, graphs, tries and union-find forests: drawn once for the whole call stack (like
// trees), because the helper that works on them (siftUp, find, dfs) often reaches them
// through a closure and has no variable of its own for them.
import { motion } from 'motion/react';
import type { FrameSnap, HeapSnap, StaticHints, Step, ValueSnap } from '../trace/types';
import { markersFor, refId, type Marker } from './analysis';
import type { SpecialRole, StructureBinding } from './bindings';
import type { Focus } from './focus';
import { ForestView } from './ForestView';
import { GraphView } from './GraphView';
import { HeapView } from './HeapView';
import {
  graphActivity,
  graphNodeOrder,
  graphOverlay,
  heapMoves,
  isParentArray,
  overlayChanges,
  readGraph,
  readTrie,
  trieActivity,
  trieRootOf,
  trieTags,
  type ArraySnap,
} from './structures';
import { GLIDE } from './theme';
import { TrieView } from './TrieView';
import { NameTag } from './Value';

/** Roles drawn above the calls; a frame shows a short "drawn above" note in their place. */
export const DRAWN_ABOVE: SpecialRole[] = ['heap', 'union-find', 'graph', 'edge-list', 'trie'];

const KIND: Record<SpecialRole, string> = {
  heap: 'heap: tree and cells',
  'union-find': 'union-find forest',
  graph: 'graph',
  'edge-list': 'graph from an edge list',
  trie: 'trie',
  deque: 'deque',
};

/** Same-length arrays drawn next to union-find roots. */
const ROOT_NOTES = ['rank', 'ranks', 'size', 'sizes', 'sz', 'height', 'heights'];

export interface SpecialContext {
  step: Step;
  hints: StaticHints;
  focus: Focus;
  roles: Map<number, StructureBinding>;
  steps?: Step[];
}

/** Index variables of the active call that point into an array known by any of `names`. */
function activeMarkers(frames: FrameSnap[], names: string[], length: number, hints: StaticHints): Marker[] {
  const frame = frames[frames.length - 1];
  if (!frame) return [];
  const out: Marker[] = [];
  for (const n of names) for (const m of markersFor(frame, n, length, hints)) if (!out.some((o) => o.name === m.name)) out.push(m);
  return out;
}

/** Arrays in any call with one of `names` and the same length as the forest. */
function rootNotes(frames: FrameSnap[], step: Step, length: number): { name: string; values: ValueSnap[] }[] {
  const out: { name: string; values: ValueSnap[] }[] = [];
  for (const f of frames) {
    for (const v of f.vars) {
      const id = refId(v.value);
      const h = id !== null ? step.heap[id] : undefined;
      if (ROOT_NOTES.includes(v.name) && h?.kind === 'array' && h.items.length === length && !out.some((o) => o.name === v.name)) {
        out.push({ name: v.name, values: h.items });
      }
    }
  }
  return out;
}

function Unreadable({ text }: { text: string }) {
  return <p className="max-w-xl rounded-xl bg-navy-850 px-3.5 py-2 text-[13px] text-navy-200 shadow-[inset_3px_0_0_0_#7d91b5]">{text}</p>;
}

function SpecialBody({ id, b, ctx }: { id: number; b: StructureBinding; ctx: SpecialContext }) {
  const { step, hints, focus, roles } = ctx;
  const h = step.heap[id];
  if (!h) return null;
  const reads = focus.cellReads.get(id) ?? new Set<number>();
  const writes = focus.cellWrites.get(id) ?? new Set<number>();
  const comparing = step.kind === 'condition' || step.kind === 'loop-check';
  const name = b.names[0];
  switch (b.role) {
    case 'heap': {
      if (h.kind !== 'array') return <Unreadable text={`${name} is not an array, so it can't be drawn as a heap.`} />;
      return (
        <HeapView
          arr={h}
          heap={step.heap}
          markers={activeMarkers(step.frames, b.names, h.items.length, hints)}
          reads={reads}
          writes={writes}
          comparing={comparing}
          moves={heapMoves(step.effects, id, h.items.length)}
        />
      );
    }
    case 'union-find': {
      if (h.kind !== 'array' || !isParentArray(h)) {
        return (
          <Unreadable
            text={`${name} can't be drawn as a forest right now: every item must be a slot number of the same array (0 to ${h.kind === 'array' ? h.total - 1 : 'n - 1'}), with a root being its own parent.`}
          />
        );
      }
      return (
        <ForestView
          arr={h as ArraySnap}
          heap={step.heap}
          markers={activeMarkers(step.frames, b.names, h.items.length, hints)}
          reads={reads}
          writes={writes}
          comparing={comparing}
          effects={step.effects}
          annotations={rootNotes(step.frames, step, h.items.length)}
        />
      );
    }
    case 'graph':
    case 'edge-list': {
      const as = b.role === 'edge-list' ? 'edge-list' : 'adjacency';
      const model = readGraph(h, step.heap, as, b.vertexCount);
      if (!model) {
        return (
          <Unreadable
            text={
              as === 'edge-list'
                ? `${name} can't be read as an edge list: every item must be a pair [u, v] (or [u, v, weight]) of vertex numbers or names.`
                : `${name} can't be read as a graph: it must list neighbors per vertex (an array of arrays of vertex numbers, or a Map or object of arrays).`
            }
          />
        );
      }
      const skip = new Set([...roles.keys()]);
      const overlay = graphOverlay(model, step.frames, step.heap, hints, skip);
      return (
        <GraphView
          model={model}
          overlay={overlay}
          activity={graphActivity(model, h, step, step.heap)}
          changes={overlayChanges(overlay, step.effects)}
          order={ctx.steps ? graphNodeOrder(ctx.steps, id, as, b.vertexCount) : undefined}
        />
      );
    }
    case 'trie': {
      const model = readTrie(b.trieRoot ?? id, step.heap);
      if (!model)
        return (
          <Unreadable
            text={`${name} can't be read as a trie: some node has fields other than single-letter children, a word-end flag and counters.`}
          />
        );
      return (
        <TrieView
          model={model}
          heap={step.heap}
          tags={trieTags(model, step.frames)}
          activity={trieActivity(model, step.effects)}
          created={focus.created}
        />
      );
    }
    case 'deque':
      return null;
  }
}

/** The heaps, graphs, tries and forests in this step, outermost variable first. */
export function SpecialStructures({ ctx }: { ctx: SpecialContext }) {
  const { roles, step } = ctx;
  const order: number[] = [];
  for (const f of step.frames) {
    for (const v of f.vars) {
      const raw = refId(v.value);
      if (raw === null || !step.heap[raw]) continue;
      // A Trie object stands for the trie under its root field.
      const id = roles.has(raw) ? raw : trieRootOf(step.heap[raw], step.heap);
      if (roles.has(id) && !order.includes(id)) order.push(id);
    }
  }
  for (const id of roles.keys()) if (!order.includes(id)) order.push(id);
  // An edge list gives way to an adjacency structure of the same run: the traversal reads that one.
  const hasAdjacency = order.some((id) => roles.get(id)!.role === 'graph');
  const shown = order.filter((id) => {
    const b = roles.get(id)!;
    if (!DRAWN_ABOVE.includes(b.role)) return false;
    return !(b.role === 'edge-list' && hasAdjacency && b.source !== 'user');
  });
  if (!shown.length) return null;
  return (
    <section aria-label="Heaps, graphs, tries and union-find" className="flex flex-col gap-6">
      {shown.map((id) => {
        const b = roles.get(id)!;
        const h: HeapSnap | undefined = step.heap[id];
        return (
          <motion.div key={id} layout="position" transition={GLIDE} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {b.names.map((n) => (
                <NameTag key={n} name={n} />
              ))}
              <span className="text-[11.5px] text-navy-400">{KIND[b.role]}</span>
              {ctx.focus.changedObjects.has(id) && <span className="text-[11px] font-semibold text-amber-300">changed</span>}
            </div>
            {h && <SpecialBody id={id} b={b} ctx={ctx} />}
          </motion.div>
        );
      })}
    </section>
  );
}
