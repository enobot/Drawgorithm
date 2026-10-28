// Pure functions that turn recorded state into drawing models.
// Nothing here guesses values: it only reorganizes what the trace recorded.
import type { FrameSnap, Heap, HeapSnap, StaticHints, Step, ValueSnap } from '../trace/types';
import { LIST_CONVENTION, TREE_CONVENTION, type NodeShape, type ShapeOf } from './bindings';

export type ObjectSnap = Extract<HeapSnap, { kind: 'object' }>;

export function field(h: HeapSnap | undefined, key: string): ValueSnap | undefined {
  if (!h || h.kind !== 'object') return undefined;
  return h.entries.find(([k]) => k === key)?.[1];
}

// Plain booleans rather than type guards: `false` must not rule out other objects.
export function isTreeObj(h: HeapSnap | undefined): boolean {
  return !!h && h.kind === 'object' && !!field(h, 'val') && (!!field(h, 'left') || !!field(h, 'right'));
}

export function isListObj(h: HeapSnap | undefined): boolean {
  return !!h && h.kind === 'object' && !!field(h, 'val') && !!field(h, 'next') && !field(h, 'left');
}

export function refId(v: ValueSnap | undefined): number | null {
  return v && v.t === 'ref' ? v.id : null;
}

export function formatSnap(v: ValueSnap | undefined, heap: Heap, depth = 0): string {
  if (!v) return 'undefined';
  switch (v.t) {
    case 'number':
      return Object.is(v.v, -0) ? '0' : String(v.v);
    case 'string':
      // A long string arrives shortened (see engine/snapshot.ts); say so.
      return v.len ? `${JSON.stringify(v.v)}… (${v.len.toLocaleString('en-US')} characters)` : JSON.stringify(v.v);
    case 'boolean':
      return String(v.v);
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    case 'function':
      return `ƒ ${v.name}`;
  }
  const h = heap[v.id];
  if (!h) return '…';
  if (isTreeObj(h) || isListObj(h)) return `node ${formatSnap(field(h, 'val'), heap, 2)}`;
  if (depth > 1) return h.kind === 'array' ? `[…${h.total}]` : '{…}';
  switch (h.kind) {
    case 'array': {
      const items = h.items.slice(0, 8).map((x) => formatSnap(x, heap, depth + 1));
      if (h.total > 8) items.push(`…+${h.total - 8}`);
      return `[${items.join(', ')}]`;
    }
    case 'map':
      return `Map(${h.total})`;
    case 'set':
      return `Set(${h.total})`;
    case 'object': {
      const items = h.entries.slice(0, 3).map(([k, x]) => `${k}: ${formatSnap(x, heap, depth + 1)}`);
      return `${h.className && h.className !== 'Object' ? h.className + ' ' : ''}{${items.join(', ')}${h.entries.length > 3 ? ', …' : ''}}`;
    }
  }
}

/** The classic reading (val/left/right, val/next), used when no other binding is given. */
export const conventionShape: ShapeOf = (h) => (isTreeObj(h) ? TREE_CONVENTION : isListObj(h) ? LIST_CONVENTION : null);

/** Display label of a tree or list node: its value, e.g. `5`. */
export function nodeValueLabel(h: ObjectSnap, heap: Heap, shape: NodeShape | null = conventionShape(h)): string {
  const v = field(h, shape && shape.kind !== 'object' ? shape.value : 'val');
  if (v?.t === 'string') return v.v;
  return formatSnap(v, heap, 2);
}

/** Ids held inside arrays, maps, sets and plain objects (a node in a queue is not detached). */
function containerRefs(heap: Heap, shapeOf: ShapeOf): Set<number> {
  const out = new Set<number>();
  const add = (v: ValueSnap) => {
    if (v.t === 'ref') out.add(v.id);
  };
  for (const h of Object.values(heap)) {
    if (h.kind === 'array' || h.kind === 'set') h.items.forEach(add);
    else if (h.kind === 'map') h.entries.forEach(([k, v]) => (add(k), add(v)));
    else if (!shapeOf(h)) h.entries.forEach(([, v]) => add(v));
  }
  return out;
}

// ---------------------------------------------------------------- trees

export interface TreeNodeLayout {
  id: number;
  depth: number;
  /** Path from the root: '' for the root, 'L', 'LR', ... */
  path: string;
  /** Horizontal position in [0, 1] using fixed slots: children never move existing nodes. */
  slotX: number;
  /** Compact in-order position in [0, 1], used when slots get too narrow. */
  orderX: number;
}

export interface TreeEdge {
  from: number;
  to: number;
  side: 'left' | 'right';
  kind: 'child' | 'cycle' | 'shared';
}

export interface NullChild {
  parent: number;
  side: 'left' | 'right';
  depth: number;
  slotX: number;
}

export interface TreeComponent {
  rootId: number;
  nodes: TreeNodeLayout[];
  edges: TreeEdge[];
  nulls: NullChild[];
  depth: number;
}

export interface StructureIssue {
  kind: 'cycle' | 'shared' | 'detached';
  ids: number[];
  text: string;
}

export interface TreeDiagram {
  components: TreeComponent[];
  issues: StructureIssue[];
  /** Node id → the value shown in the node, read through the binding. */
  labels: Record<number, string>;
}

type TreeShape = Extract<NodeShape, { kind: 'tree' }>;
type ListShape = Extract<NodeShape, { kind: 'list' }>;

/**
 * Lays out every tree node in the heap. `rootOrder` lists node ids in the order
 * variables refer to them, so the tree a variable names comes first.
 * `referenced` holds ids some variable points at (used to spot detached nodes).
 * `shapeOf` says which objects are tree nodes and which fields hold the value and children.
 */
export function buildTreeDiagram(
  heap: Heap,
  rootOrder: number[],
  referenced: Set<number>,
  shapeOf: ShapeOf = conventionShape,
): TreeDiagram {
  const isTree = (h: HeapSnap | undefined) => shapeOf(h)?.kind === 'tree';
  const treeIds = Object.values(heap)
    .filter(isTree)
    .map((h) => h.id);
  const labels: Record<number, string> = {};
  for (const id of treeIds) labels[id] = nodeValueLabel(heap[id] as ObjectSnap, heap, shapeOf(heap[id]));
  if (!treeIds.length) return { components: [], issues: [], labels };
  const label = (id: number) => `node ${labels[id]}`;
  const sideField = (id: number, side: 'left' | 'right') => (shapeOf(heap[id]) as TreeShape)[side];
  const childOf = (id: number, side: 'left' | 'right') => {
    const c = refId(field(heap[id], sideField(id, side)));
    return c !== null && isTree(heap[c]) ? c : null;
  };
  const parents = new Map<number, { id: number; side: 'left' | 'right' }[]>();
  for (const id of treeIds) {
    for (const side of ['left', 'right'] as const) {
      const c = childOf(id, side);
      if (c !== null) {
        const list = parents.get(c) ?? [];
        list.push({ id, side });
        parents.set(c, list);
      }
    }
  }
  const order = [...rootOrder.filter((id) => treeIds.includes(id)), ...treeIds.sort((a, b) => a - b)];
  const seenOrder = [...new Set(order)];
  const roots = seenOrder.filter((id) => !parents.has(id));
  const visited = new Set<number>();
  const components: TreeComponent[] = [];
  const issues: StructureIssue[] = [];

  const layoutFrom = (rootId: number) => {
    const comp: TreeComponent = { rootId, nodes: [], edges: [], nulls: [], depth: 0 };
    const stack = new Set<number>();
    const walk = (id: number, depth: number, path: string) => {
      visited.add(id);
      stack.add(id);
      const index = path ? parseInt(path.replace(/L/g, '0').replace(/R/g, '1'), 2) : 0;
      comp.nodes.push({ id, depth, path, slotX: (index + 0.5) / 2 ** depth, orderX: 0 });
      comp.depth = Math.max(comp.depth, depth);
      for (const side of ['left', 'right'] as const) {
        const raw = field(heap[id], sideField(id, side));
        const c = childOf(id, side);
        if (c === null) {
          if (raw && raw.t === 'null') {
            const childPath = path + (side === 'left' ? 'L' : 'R');
            const ci = parseInt(childPath.replace(/L/g, '0').replace(/R/g, '1'), 2);
            comp.nulls.push({ parent: id, side, depth: depth + 1, slotX: (ci + 0.5) / 2 ** (depth + 1) });
          }
          continue;
        }
        if (stack.has(c)) {
          comp.edges.push({ from: id, to: c, side, kind: 'cycle' });
          issues.push({
            kind: 'cycle',
            ids: [id, c],
            text: `Cycle: the ${side} child of ${label(id)} points back to ${c === id ? 'itself' : label(c)}, which is above it. Code that walks this tree would never reach the bottom.`,
          });
        } else if (visited.has(c)) {
          comp.edges.push({ from: id, to: c, side, kind: 'shared' });
        } else {
          comp.edges.push({ from: id, to: c, side, kind: 'child' });
          walk(c, depth + 1, path + (side === 'left' ? 'L' : 'R'));
        }
      }
      stack.delete(id);
    };
    walk(rootId, 0, '');
    // In-order positions for the compact layout.
    const inorder: number[] = [];
    const tree = new Map(comp.edges.filter((e) => e.kind === 'child').map((e) => [`${e.from}:${e.side}`, e.to]));
    const visit = (id: number) => {
      const l = tree.get(`${id}:left`);
      if (l !== undefined) visit(l);
      inorder.push(id);
      const r = tree.get(`${id}:right`);
      if (r !== undefined) visit(r);
    };
    visit(rootId);
    for (const n of comp.nodes) n.orderX = (inorder.indexOf(n.id) + 0.5) / inorder.length;
    components.push(comp);
  };

  for (const r of roots) if (!visited.has(r)) layoutFrom(r);
  // Nodes caught in a loop with no top: start from the first one a variable names.
  for (const id of seenOrder) if (!visited.has(id)) layoutFrom(id);

  for (const [child, ps] of parents) {
    if (ps.length > 1 && !issues.some((i) => i.kind === 'cycle' && i.ids[1] === child)) {
      issues.push({
        kind: 'shared',
        ids: [child, ...ps.map((p) => p.id)],
        text: `${label(child)} has ${ps.length} parents (${ps.map((p) => `${p.side} of ${label(p.id)}`).join(', ')}). In a tree every node has exactly one parent.`,
      });
    }
  }
  const held = containerRefs(heap, shapeOf);
  for (const comp of components) {
    if (!parents.has(comp.rootId) && !referenced.has(comp.rootId) && !held.has(comp.rootId) && rootOrder.length > 0) {
      issues.push({
        kind: 'detached',
        ids: [comp.rootId],
        text: `${label(comp.rootId)} is detached: no variable or node points to it any more.`,
      });
    }
  }
  return { components, issues, labels };
}

// ---------------------------------------------------------------- linked lists

export interface ListChain {
  ids: number[];
  /** How the chain ends: at null, by looping back into itself, or by joining another chain. */
  end: { kind: 'null' } | { kind: 'cycle'; to: number } | { kind: 'join'; to: number };
}

export interface ListDiagram {
  chains: ListChain[];
  issues: StructureIssue[];
  /** Node id → the value shown in the node, read through the binding. */
  labels: Record<number, string>;
  /** Node id → the field that links to the next node (e.g. next, nxt). */
  nextField: Record<number, string>;
}

export function buildListDiagram(
  heap: Heap,
  rootOrder: number[],
  referenced: Set<number>,
  shapeOf: ShapeOf = conventionShape,
): ListDiagram {
  const isList = (h: HeapSnap | undefined) => shapeOf(h)?.kind === 'list';
  const listIds = Object.values(heap)
    .filter(isList)
    .map((h) => h.id);
  const labels: Record<number, string> = {};
  const nextField: Record<number, string> = {};
  for (const id of listIds) {
    labels[id] = nodeValueLabel(heap[id] as ObjectSnap, heap, shapeOf(heap[id]));
    nextField[id] = (shapeOf(heap[id]) as ListShape).next;
  }
  if (!listIds.length) return { chains: [], issues: [], labels, nextField };
  const next = (id: number) => {
    const n = refId(field(heap[id], nextField[id]));
    return n !== null && isList(heap[n]) ? n : null;
  };
  const indeg = new Map<number, number>();
  for (const id of listIds) {
    const n = next(id);
    if (n !== null) indeg.set(n, (indeg.get(n) ?? 0) + 1);
  }
  const order = [...new Set([...rootOrder.filter((id) => listIds.includes(id)), ...listIds.sort((a, b) => a - b)])];
  const heads = order.filter((id) => !indeg.has(id));
  const visited = new Set<number>();
  const chains: ListChain[] = [];
  const issues: StructureIssue[] = [];
  const label = (id: number) => `node ${labels[id]}`;

  const follow = (start: number) => {
    const ids: number[] = [];
    let cur: number | null = start;
    let end: ListChain['end'] = { kind: 'null' };
    while (cur !== null) {
      if (ids.includes(cur)) {
        end = { kind: 'cycle', to: cur };
        issues.push({
          kind: 'cycle',
          ids: [ids[ids.length - 1], cur],
          text: `Cycle: ${label(ids[ids.length - 1])}'s ${nextField[ids[ids.length - 1]]} points back to ${label(cur)}. Walking this list would never reach null.`,
        });
        break;
      }
      if (visited.has(cur)) {
        end = { kind: 'join', to: cur };
        break;
      }
      ids.push(cur);
      visited.add(cur);
      cur = next(cur);
    }
    chains.push({ ids, end });
  };
  for (const h of heads) if (!visited.has(h)) follow(h);
  for (const id of order) if (!visited.has(id)) follow(id);
  const held = containerRefs(heap, shapeOf);
  for (const c of chains) {
    const head = c.ids[0];
    if (head !== undefined && !indeg.has(head) && !referenced.has(head) && !held.has(head) && rootOrder.length > 0) {
      issues.push({ kind: 'detached', ids: [head], text: `${label(head)} is detached: nothing points to it any more.` });
    }
  }
  return { chains, issues, labels, nextField };
}

// ---------------------------------------------------------------- variables → structures

/**
 * Ids of objects that variables point at, outermost frame first, in declaration order.
 * Outermost first means `root` in the Program anchors the drawing, not a deep recursive call's `node`.
 */
export function variableRefs(frames: FrameSnap[]): { order: number[]; referenced: Set<number> } {
  const order: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    for (const v of frames[i].vars) {
      const id = refId(v.value);
      if (id !== null && !order.includes(id)) order.push(id);
    }
  }
  return { order, referenced: new Set(order) };
}

/**
 * Variable labels pointing at each node: active frame strongly, callers faintly.
 * A name shows once per node even when many recursive calls use it.
 */
export function nodeLabels(
  frames: FrameSnap[],
  heap: Heap,
  shapeOf: ShapeOf = conventionShape,
): Map<number, { name: string; active: boolean; frame: string }[]> {
  const out = new Map<number, { name: string; active: boolean; frame: string }[]>();
  frames.forEach((f, i) => {
    const active = i === frames.length - 1;
    for (const v of f.vars) {
      const id = refId(v.value);
      if (id === null || !shapeOf(heap[id])) continue;
      const list = out.get(id) ?? [];
      const same = list.find((l) => l.name === v.name);
      if (same) {
        if (active) Object.assign(same, { active: true, frame: f.label });
      } else {
        list.push({ name: v.name, active, frame: f.label });
      }
      out.set(id, list);
    }
  });
  return out;
}

// ---------------------------------------------------------------- traversal (Run)

const CURRENT_NAMES = ['node', 'curr', 'current', 'cur', 'n', 'temp', 'p'];

/**
 * The node the active frame is working on, if any: a usual name (node, cur, ...), then a
 * variable the code steps along its own fields (`walkers`: p = p.next), then a parameter.
 */
export function currentNode(step: Step, shapeOf: ShapeOf = conventionShape, walkers: string[] = []): number | null {
  const frame = step.frames[step.frames.length - 1];
  if (!frame) return null;
  const isNode = (v: ValueSnap) => {
    const id = refId(v);
    return id !== null && shapeOf(step.heap[id]) ? id : null;
  };
  for (const name of [...CURRENT_NAMES, ...walkers]) {
    const v = frame.vars.find((x) => x.name === name);
    if (v) {
      const id = isNode(v.value);
      if (id !== null) return id;
    }
  }
  for (const v of frame.vars) {
    if (v.declKind !== 'param') continue;
    const id = isNode(v.value);
    if (id !== null) return id;
  }
  return null;
}

export interface TraversalIndex {
  current: (number | null)[];
  /** node id → index of the first step where it was current */
  firstVisit: Map<number, number>;
  /** returns recorded at frame exits: step index, node, formatted value */
  returns: { step: number; node: number; value: string }[];
}

export function buildTraversalIndex(steps: Step[], shapeOf: ShapeOf = conventionShape, walkers: string[] = []): TraversalIndex {
  const current: (number | null)[] = [];
  const firstVisit = new Map<number, number>();
  const returns: TraversalIndex['returns'] = [];
  steps.forEach((s, i) => {
    const c = s.kind === 'done' ? null : currentNode(s, shapeOf, walkers);
    current.push(c);
    if (c !== null && !firstVisit.has(c)) firstVisit.set(c, i);
    if (s.kind === 'return') {
      const frame = s.frames[s.frames.length - 1];
      const param = frame?.vars.find((v) => v.declKind === 'param');
      const id = param ? refId(param.value) : null;
      if (id !== null && shapeOf(s.heap[id])?.kind === 'tree' && frame.returning) {
        returns.push({ step: i, node: id, value: formatSnap(frame.returning, s.heap) });
      }
    }
  });
  return { current, firstVisit, returns };
}

export function traversalAt(index: TraversalIndex, k: number) {
  const visited = new Set<number>();
  for (const [id, at] of index.firstVisit) if (at <= k) visited.add(id);
  const returned = new Map<number, string>();
  for (const r of index.returns) if (r.step <= k) returned.set(r.node, r.value);
  return { current: index.current[k] ?? null, visited, returned };
}

// ---------------------------------------------------------------- arrays

export interface Marker {
  name: string;
  index: number;
  axis: number;
}

/** Index variables (from the static hints) that currently point into an array named `arrayName`. */
export function markersFor(frame: FrameSnap, arrayName: string, length: number, hints: StaticHints): Marker[] {
  const hinted = hints.pointers[arrayName] ?? [];
  const out: Marker[] = [];
  for (const { name, axis } of hinted) {
    const v = frame.vars.find((x) => x.name === name);
    if (!v || v.value.t !== 'number') continue;
    const n = v.value.v;
    if (!Number.isInteger(n) || n < -1 || n > length) continue;
    out.push({ name, index: n, axis });
  }
  return out;
}

const PAIRS: [string, string][] = [
  ['left', 'right'],
  ['lo', 'hi'],
  ['low', 'high'],
  ['l', 'r'],
  ['start', 'end'],
];

/** The [from, to] window between a left/right style pair of markers, if the code uses one. */
export function windowOf(markers: Marker[]): { from: number; to: number; names: [string, string] } | null {
  for (const [a, b] of PAIRS) {
    const ma = markers.find((m) => m.name === a);
    const mb = markers.find((m) => m.name === b);
    if (ma && mb) return { from: ma.index, to: mb.index, names: [a, b] };
  }
  return null;
}
