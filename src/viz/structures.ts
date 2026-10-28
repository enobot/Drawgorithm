// Pure readers for the heap, graph, trie and union-find drawings. Like analysis.ts,
// nothing here guesses values: each function reorganizes recorded heap snapshots and
// step effects. Which variables get these drawings is decided in bindings.ts.
import type { Effect, FrameSnap, Heap, HeapSnap, StaticHints, Step, ValueSnap } from '../trace/types';

export type ArraySnap = Extract<HeapSnap, { kind: 'array' }>;
type ObjSnap = Extract<HeapSnap, { kind: 'object' }>;

const ref = (v: ValueSnap | undefined): number | null => (v && v.t === 'ref' ? v.id : null);
const sameSnap = (a: ValueSnap, b: ValueSnap) => JSON.stringify(a) === JSON.stringify(b);
const isInt = (v: ValueSnap | undefined): v is { t: 'number'; v: number } => !!v && v.t === 'number' && Number.isInteger(v.v);

// ---------------------------------------------------------------- name conventions

export const HEAP_NAME = /heap/i;
export const UNION_FIND_NAMES = ['parent', 'parents', 'par', 'leader', 'leaders', 'uf', 'dsu', 'boss', 'rep', 'reps', 'root', 'roots'];
export const ADJACENCY_NAMES = ['graph', 'adj', 'adjList', 'adjacency', 'adjacencyList', 'neighbors', 'neighbours', 'nbrs', 'g'];
export const EDGE_LIST_NAMES = ['edges', 'edgeList', 'connections', 'roads', 'links', 'pairs', 'flights', 'cables', 'wires'];
export const DEQUE_NAMES = ['dq', 'deque', 'dequeue'];
export const TRIE_NAME = /trie/i;
export const TRIE_ROOT_NAMES = ['root', 'dict', 'dictionary'];

// ---------------------------------------------------------------- shared tree layout

export interface Spot {
  /** Horizontal position in units (one unit between neighboring leaves). */
  x: number;
  depth: number;
}

/**
 * Layout for trees with any number of children: leaves take consecutive units from the
 * left and each parent sits centered over its first and last child. Children are drawn
 * in the order `childrenOf` lists them, so a new child appears to the right of its siblings.
 */
export function naryLayout(
  roots: number[],
  childrenOf: (id: number) => number[],
): { spots: Map<number, Spot>; width: number; depth: number } {
  const spots = new Map<number, Spot>();
  let next = 0;
  let depth = 0;
  const place = (id: number, d: number, path: Set<number>): number => {
    depth = Math.max(depth, d);
    const kids = childrenOf(id).filter((c) => !path.has(c) && !spots.has(c));
    if (!kids.length) {
      spots.set(id, { x: next, depth: d });
      return next++;
    }
    path.add(id);
    const xs = kids.map((c) => place(c, d + 1, path));
    path.delete(id);
    const x = (xs[0] + xs[xs.length - 1]) / 2;
    spots.set(id, { x, depth: d });
    return x;
  };
  for (const r of roots) if (!spots.has(r)) place(r, 0, new Set());
  return { spots, width: Math.max(next, 1), depth };
}

/**
 * Rows for variable labels above nodes (the rule the tree drawing uses): a label sits on
 * its node's `side`; going left to right along each level, a label that would touch the
 * previous one moves up a row instead of overlapping. `width` is the label's estimated width.
 */
export function placeTagRows(
  items: { id: number; x: number; level: number; side: 'left' | 'right' | 'center'; width: number }[],
  gap = 8,
): Map<number, { side: 'left' | 'right' | 'center'; row: 0 | 1 }> {
  const out = new Map<number, { side: 'left' | 'right' | 'center'; row: 0 | 1 }>();
  const levels = new Map<number, typeof items>();
  for (const it of items) levels.set(it.level, [...(levels.get(it.level) ?? []), it]);
  for (const level of levels.values()) {
    level.sort((a, b) => a.x - b.x);
    const rightEdge = [-Infinity, -Infinity];
    for (const it of level) {
      const from = it.side === 'left' ? it.x - 8 - it.width : it.side === 'right' ? it.x + 8 : it.x - it.width / 2;
      const row: 0 | 1 = from >= rightEdge[0] + gap ? 0 : from >= rightEdge[1] + gap ? 1 : rightEdge[0] <= rightEdge[1] ? 0 : 1;
      rightEdge[row] = from + it.width;
      out.set(it.id, { side: it.side, row });
    }
  }
  return out;
}

/** Horizontal extent of a label group placed by placeTagRows, for padding the drawing. */
export function tagExtent(x: number, side: 'left' | 'right' | 'center', width: number): [number, number] {
  return side === 'left' ? [x - 8 - width, x] : side === 'right' ? [x, x + 8 + width] : [x - width / 2, x + width / 2];
}

// ---------------------------------------------------------------- heap (array as a complete binary tree)

export const heapParent = (i: number) => Math.floor((i - 1) / 2);
export const heapDepth = (i: number) => Math.floor(Math.log2(i + 1));

/**
 * Position of slot i in a complete binary tree, as a fraction of the width: the children
 * of i (2i+1 and 2i+2) sit under it, half as far apart each level down.
 */
export function heapX(i: number): number {
  const d = heapDepth(i);
  const k = i - (2 ** d - 1);
  return (k + 0.5) / 2 ** d;
}

export const heapLevels = (n: number) => (n <= 0 ? 0 : heapDepth(n - 1) + 1);

/**
 * Where values written to the array in this step came from, read from the step's
 * effects in order: a write of v to slot i moved v from slot j when this step read v
 * from j (and from no other slot), or when it popped v off the end. Ambiguous or
 * unexplained writes are not reported as moves; they are drawn as plain changes.
 */
export function heapMoves(effects: Effect[], arrId: number, length: number): Map<number, number> {
  const moves = new Map<number, number>();
  const reads = new Map<number, ValueSnap>();
  let popped: { value: ValueSnap; from: number } | null = null;
  const adds = effects.filter((e) => e.type === 'array-add' && e.objId === arrId).length;
  const removes = effects.filter((e) => e.type === 'array-remove' && e.objId === arrId && e.end === 'back').length;
  for (const e of effects) {
    if (!('objId' in e) || e.objId !== arrId) continue;
    if (e.type === 'index-read') reads.set(e.index, e.value);
    // One pop and no push in the step: the popped item sat at the slot just past the end.
    if (e.type === 'array-remove' && e.end === 'back' && removes === 1 && adds === 0) popped = { value: e.value, from: length };
    if (e.type === 'index-write') {
      const from = [...reads].filter(([j, v]) => j !== e.index && sameSnap(v, e.after)).map(([j]) => j);
      if (popped && sameSnap(popped.value, e.after) && popped.from !== e.index) from.push(popped.from);
      if (from.length === 1) moves.set(e.index, from[0]);
    }
  }
  return moves;
}

// ---------------------------------------------------------------- union-find

export function isParentArray(arr: ArraySnap): boolean {
  const n = arr.items.length;
  return n > 0 && arr.total === n && arr.items.every((v) => isInt(v) && v.v >= 0 && v.v < n);
}

export interface Forest {
  /** Root of each tree, smallest index first. */
  roots: number[];
  children: Map<number, number[]>;
  /** Slots whose parent chain never reaches a root (the array has a loop). */
  looped: number[];
  spots: Map<number, Spot>;
  width: number;
  depth: number;
}

/** The forest a parent array describes: parent[i] === i marks a root, otherwise i hangs under parent[i]. */
export function buildForest(parent: number[]): Forest {
  const n = parent.length;
  const children = new Map<number, number[]>();
  const roots: number[] = [];
  for (let i = 0; i < n; i++) {
    if (parent[i] === i) roots.push(i);
    else children.set(parent[i], [...(children.get(parent[i]) ?? []), i]);
  }
  const reaches = new Map<number, boolean>();
  const reachesRoot = (i: number): boolean => {
    const path: number[] = [];
    let cur = i;
    const seen = new Set<number>();
    while (!reaches.has(cur) && parent[cur] !== cur && !seen.has(cur)) {
      seen.add(cur);
      path.push(cur);
      cur = parent[cur];
    }
    const ok = reaches.get(cur) ?? parent[cur] === cur;
    for (const p of path) reaches.set(p, ok);
    reaches.set(cur, ok);
    return ok;
  };
  const looped = Array.from({ length: n }, (_, i) => i).filter((i) => !reachesRoot(i));
  // A loop has no top; it is laid out starting from its smallest slot, after the real trees.
  const loopStarts: number[] = [];
  const claimed = new Set<number>();
  for (const i of looped) {
    if (claimed.has(i)) continue;
    let cur = i;
    const cycle: number[] = [];
    while (!cycle.includes(cur)) {
      cycle.push(cur);
      cur = parent[cur];
    }
    const start = Math.min(...cycle.slice(cycle.indexOf(cur)));
    if (!loopStarts.includes(start)) loopStarts.push(start);
    for (const c of cycle) claimed.add(c);
  }
  const kids = (id: number) => (children.get(id) ?? []).filter((c) => c !== id);
  const { spots, width, depth } = naryLayout([...roots, ...loopStarts, ...looped], kids);
  return { roots, children, looped, spots, width, depth };
}

/** True if `a` is on the chain from `b` up to its root (b itself included). */
export function isAncestor(parent: number[], a: number, b: number): boolean {
  let cur = b;
  for (let k = 0; k <= parent.length; k++) {
    if (cur === a) return true;
    if (parent[cur] === cur || parent[cur] === undefined) return false;
    cur = parent[cur];
  }
  return false;
}

// ---------------------------------------------------------------- graphs

export type GraphForm = 'adjacency' | 'matrix' | 'map' | 'object' | 'edge-list';

export interface GraphNode {
  key: string;
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** False when every u→v also has v→u (drawn as one line), or for edge lists, which carry no direction. */
  directed: boolean;
  weight?: string;
  /** How many times the edge is listed (parallel entries are drawn once). */
  count: number;
}

export interface GraphModel {
  form: GraphForm;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Neighbor-list array id → the node it belongs to (to light up the edge being read). */
  rowOf: Map<number, string>;
  /** Neighbor entries that are [vertex, weight] pairs: pair id → its row. */
  pairOf: Map<number, number>;
  /** Plain-words description of how the graph was read. */
  note: string;
}

/** A vertex name: numbers and strings name the same vertex when they print the same (object keys are strings). */
export function nodeKey(v: ValueSnap | undefined): string | null {
  if (!v) return null;
  if (v.t === 'number') return Number.isFinite(v.v) ? String(v.v) : null;
  if (v.t === 'string') return v.v;
  return null;
}

const weightText = (v: ValueSnap | undefined) => (v && v.t === 'number' ? String(v.v) : undefined);

/** A neighbor entry: a vertex, or a [vertex, weight] pair. */
function neighborOf(v: ValueSnap, heap: Heap): { key: string; weight?: string; pair?: number } | null {
  const k = nodeKey(v);
  if (k !== null) return { key: k };
  const id = ref(v);
  const h = id !== null ? heap[id] : undefined;
  if (h?.kind === 'array' && h.items.length === 2 && nodeKey(h.items[0]) !== null && h.items[1].t === 'number') {
    return { key: nodeKey(h.items[0])!, weight: weightText(h.items[1]), pair: id! };
  }
  return null;
}

function finish(form: GraphForm, nodeKeys: string[], directedEdges: { from: string; to: string; weight?: string }[], note: string) {
  const nodes = nodeKeys.map((key) => ({ key, label: key }));
  const byPair = new Map<string, { from: string; to: string; weight?: string; count: number }>();
  for (const e of directedEdges) {
    const k = `${e.from}\u0000${e.to}`;
    const cur = byPair.get(k);
    if (cur) cur.count++;
    else byPair.set(k, { ...e, count: 1 });
  }
  const list = [...byPair.values()];
  const undirected = form === 'edge-list' || list.every((e) => e.from === e.to || byPair.has(`${e.to}\u0000${e.from}`));
  const edges: GraphEdge[] = [];
  const done = new Set<string>();
  for (const e of list) {
    const back = `${e.to}\u0000${e.from}`;
    if (undirected || byPair.has(back)) {
      const k = [e.from, e.to].sort().join('\u0000');
      if (done.has(k)) continue;
      done.add(k);
      // Both directions listed: one line; an edge list's pairs are lines too.
      const other = byPair.get(back);
      const merged = form === 'edge-list' && other && other !== e ? e.count + other.count : e.count;
      edges.push({ from: e.from, to: e.to, directed: false, weight: e.weight, count: merged });
    } else {
      edges.push({ from: e.from, to: e.to, directed: true, weight: e.weight, count: e.count });
    }
  }
  return { form, nodes, edges, note };
}

/**
 * Reads a graph from an adjacency structure or an edge list. `as` says which reading the
 * binding chose; `vertexCount` (a variable such as n) adds vertices no edge mentions.
 * Returns null when the data does not have that shape.
 */
export function readGraph(h: HeapSnap, heap: Heap, as: 'adjacency' | 'edge-list', vertexCount?: number): GraphModel | null {
  const rowOf = new Map<number, string>();
  const pairOf = new Map<number, number>();
  const edges: { from: string; to: string; weight?: string }[] = [];
  const keys: string[] = [];
  const addKey = (k: string) => {
    if (!keys.includes(k)) keys.push(k);
  };
  const readRow = (from: string, rowRef: ValueSnap): boolean => {
    const rid = ref(rowRef);
    const row = rid !== null ? heap[rid] : undefined;
    if (!row || row.kind !== 'array') return false;
    rowOf.set(row.id, from);
    for (const item of row.items) {
      const nb = neighborOf(item, heap);
      if (!nb) return false;
      if (nb.pair !== undefined) pairOf.set(nb.pair, row.id);
      edges.push({ from, to: nb.key, weight: nb.weight });
    }
    return true;
  };

  if (as === 'edge-list') {
    if (h.kind !== 'array' || h.total !== h.items.length) return null;
    for (const item of h.items) {
      const id = ref(item);
      const pair = id !== null ? heap[id] : undefined;
      if (!pair || pair.kind !== 'array' || (pair.items.length !== 2 && pair.items.length !== 3)) return null;
      const [a, b, w] = pair.items.map((v) => v);
      const ka = nodeKey(a);
      const kb = nodeKey(b);
      if (ka === null || kb === null || (w && w.t !== 'number')) return null;
      rowOf.set(pair.id, ka);
      edges.push({ from: ka, to: kb, weight: weightText(w) });
    }
    const numeric = edges.every((e) => /^-?\d+$/.test(e.from) && /^-?\d+$/.test(e.to));
    const ends = [...new Set(edges.flatMap((e) => [e.from, e.to]))];
    const fromCount =
      numeric &&
      vertexCount !== undefined &&
      Number.isInteger(vertexCount) &&
      vertexCount >= 0 &&
      vertexCount <= 200 &&
      ends.every((k) => +k >= 0 && +k < vertexCount);
    if (!edges.length && !fromCount) return null;
    if (fromCount) for (let i = 0; i < vertexCount!; i++) addKey(String(i));
    for (const k of numeric ? ends.sort((a, b) => +a - +b) : ends) addKey(k);
    const model = finish(
      'edge-list',
      keys,
      edges,
      `Edge list: each pair is a line between two vertices (an edge list does not say which way an edge goes)${fromCount ? `; vertices 0 to ${vertexCount! - 1} come from n` : ''}.`,
    );
    return { ...model, rowOf, pairOf };
  }

  if (h.kind === 'array') {
    if (h.total !== h.items.length || !h.items.length) return null;
    const rows = h.items.map((v) => (ref(v) !== null ? heap[ref(v)!] : undefined));
    if (!rows.every((r) => r?.kind === 'array')) return null;
    const n = rows.length;
    const square = (rows as ArraySnap[]).every(
      (r) => r.items.length === n && r.items.every((x) => (x.t === 'number' && (x.v === 0 || x.v === 1)) || x.t === 'boolean'),
    );
    if (square && n >= 2) {
      for (let i = 0; i < n; i++) addKey(String(i));
      (rows as ArraySnap[]).forEach((r, i) => {
        rowOf.set(r.id, String(i));
        r.items.forEach((x, j) => {
          if ((x.t === 'number' && x.v === 1) || (x.t === 'boolean' && x.v)) edges.push({ from: String(i), to: String(j) });
        });
      });
      return {
        ...finish('matrix', keys, edges, 'Adjacency matrix: a 1 (or true) in row u, column v is an edge from u to v.'),
        rowOf,
        pairOf,
      };
    }
    for (let i = 0; i < n; i++) addKey(String(i));
    for (let i = 0; i < n; i++) if (!readRow(String(i), h.items[i])) return null;
    if (!edges.every((e) => /^\d+$/.test(e.to) && +e.to < n)) return null;
    return {
      ...finish('adjacency', keys, edges, `Adjacency list: row u lists the neighbors of vertex u (vertices 0 to ${n - 1}).`),
      rowOf,
      pairOf,
    };
  }

  if (h.kind === 'map' || (h.kind === 'object' && (h.className === null || h.className === 'Object'))) {
    const entries: [ValueSnap, ValueSnap][] = h.kind === 'map' ? h.entries : h.entries.map(([k, v]) => [{ t: 'string', v: k }, v]);
    if (h.kind === 'map' && h.total !== h.entries.length) return null;
    if (!entries.length) return null;
    for (const [k] of entries) {
      const key = nodeKey(k);
      if (key === null) return null;
      addKey(key);
    }
    for (const [k, row] of entries) if (!readRow(nodeKey(k)!, row)) return null;
    for (const e of edges) addKey(e.to);
    const what = h.kind === 'map' ? 'Map' : 'object';
    return {
      ...finish(h.kind === 'map' ? 'map' : 'object', keys, edges, `Adjacency ${what}: each key lists the neighbors of that vertex.`),
      rowOf,
      pairOf,
    };
  }
  return null;
}

/** Positions on a circle (in px from the center), first vertex at the top, going clockwise. */
export function circleLayout(count: number, minGap: number): { points: { x: number; y: number }[]; radius: number } {
  if (count <= 1) return { points: count ? [{ x: 0, y: 0 }] : [], radius: 0 };
  // The chord between neighbors is 2r·sin(π/count); keep it at least minGap.
  const radius = Math.max(minGap / (2 * Math.sin(Math.PI / count)), count === 2 ? minGap / 2 : 70);
  const points = Array.from({ length: count }, (_, k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / count;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  });
  return { points, radius };
}

export const VISITED_NAMES = ['visited', 'seen', 'vis', 'visit', 'explored', 'done', 'used', 'marked', 'discovered'];
export const DIST_NAMES = ['dist', 'distance', 'distances', 'dis', 'level', 'levels', 'depth', 'depths', 'hops'];
export const PREV_NAMES = ['prev', 'previous', 'pred', 'preds', 'predecessor', 'from', 'cameFrom', 'came', 'parent', 'parents'];
const FRONTIER_NAMES = ['queue', 'q', 'frontier', 'stack', 'st', 'todo', 'toVisit', 'open'];
const NODE_VARS = [
  'u',
  'v',
  'w',
  'node',
  'cur',
  'curr',
  'current',
  'vertex',
  'next',
  'nei',
  'nb',
  'nbr',
  'neighbor',
  'neighbour',
  'start',
  'end',
  'src',
  'dst',
  'source',
  'target',
  'goal',
  'from',
  'to',
  's',
  't',
  'a',
  'b',
];

export interface NodeTag {
  name: string;
  active: boolean;
}

export interface GraphOverlay {
  /** Vertex → the visited structure that holds it. */
  visited: Map<string, string>;
  /** Vertex → its places in frontier arrays (queue, stack). */
  frontier: Map<string, { name: string; pos: number }[]>;
  /** Per-vertex values from distance-like arrays or maps (dist, level, ...). */
  values: { name: string; byNode: Map<string, ValueSnap> }[];
  /** Predecessor links (prev[v] = u), drawn from v to u. */
  prev: { name: string; links: Map<string, string> }[];
  /** Variables holding a vertex, active call strongly. */
  tags: Map<string, NodeTag[]>;
  /** Heap id of each structure read above → what it is, to explain this step's changes to it. */
  sources: Map<number, { kind: 'visited' | 'value' | 'prev' | 'frontier'; name: string }>;
}

type Var = { name: string; value: ValueSnap; active: boolean };

function allVars(frames: FrameSnap[]): Var[] {
  // Outermost first; the active call's variables come last so they win.
  return frames.flatMap((f, i) => f.vars.map((v) => ({ name: v.name, value: v.value, active: i === frames.length - 1 })));
}

/** Values of an array (by index), a Map or a plain object (by key), keyed by vertex. */
function perVertex(h: HeapSnap | undefined, keys: Set<string>): Map<string, ValueSnap> | null {
  if (!h) return null;
  let entries: [string | null, ValueSnap][];
  if (h.kind === 'array') entries = h.items.map((v, i) => [String(i), v]);
  else if (h.kind === 'map') entries = h.entries.map(([k, v]) => [nodeKey(k), v]);
  else if (h.kind === 'object' && (h.className === null || h.className === 'Object')) entries = h.entries;
  else return null;
  const out = new Map<string, ValueSnap>();
  for (const [k, v] of entries) if (k !== null && keys.has(k)) out.set(k, v);
  return out;
}

const truthy = (v: ValueSnap) =>
  v.t === 'boolean' ? v.v : v.t === 'number' ? v.v !== 0 && !Number.isNaN(v.v) : v.t === 'string' ? v.v !== '' : v.t === 'ref';

/**
 * Traversal state around a graph, read from variables by their usual names (visited, dist,
 * prev, queue, ...) and the static hints (arrays the code uses as queues or stacks).
 * `skip` holds ids that are drawn as something else (the graph itself, union-find arrays).
 */
export function graphOverlay(model: GraphModel, frames: FrameSnap[], heap: Heap, hints: StaticHints, skip: Set<number>): GraphOverlay {
  const keys = new Set(model.nodes.map((n) => n.key));
  const vars = allVars(frames);
  const overlay: GraphOverlay = { visited: new Map(), frontier: new Map(), values: [], prev: [], tags: new Map(), sources: new Map() };
  const frontierNames = new Set([...hints.queues, ...hints.stacks, ...(hints.deques ?? []), ...FRONTIER_NAMES]);
  const seenIds = new Set<number>();
  for (const v of vars) {
    const id = ref(v.value);
    if (id === null || skip.has(id) || model.rowOf.has(id)) continue;
    const h = heap[id];
    if (!h) continue;
    // One structure under several names (or in several calls) is read once, by its first name.
    if (seenIds.has(id)) continue;
    if (VISITED_NAMES.includes(v.name)) {
      seenIds.add(id);
      overlay.sources.set(id, { kind: 'visited', name: v.name });
      if (h.kind === 'set') {
        for (const x of h.items) {
          const k = nodeKey(x);
          if (k !== null && keys.has(k)) overlay.visited.set(k, v.name);
        }
      } else for (const [k, x] of perVertex(h, keys) ?? []) if (truthy(x)) overlay.visited.set(k, v.name);
    } else if (DIST_NAMES.includes(v.name)) {
      const byNode = perVertex(h, keys);
      if (byNode) {
        seenIds.add(id);
        overlay.sources.set(id, { kind: 'value', name: v.name });
        overlay.values.push({ name: v.name, byNode });
      }
    } else if (PREV_NAMES.includes(v.name)) {
      const byNode = perVertex(h, keys);
      if (byNode) {
        seenIds.add(id);
        overlay.sources.set(id, { kind: 'prev', name: v.name });
        const links = new Map<string, string>();
        for (const [k, x] of byNode) {
          const p = nodeKey(x);
          if (p !== null && keys.has(p) && p !== k) links.set(k, p);
        }
        overlay.prev.push({ name: v.name, links });
      }
    } else if (frontierNames.has(v.name) && h.kind === 'array' && h.items.every((x) => nodeKey(x) !== null && keys.has(nodeKey(x)!))) {
      seenIds.add(id);
      overlay.sources.set(id, { kind: 'frontier', name: v.name });
      h.items.forEach((x, pos) => {
        const k = nodeKey(x)!;
        overlay.frontier.set(k, [...(overlay.frontier.get(k) ?? []), { name: v.name, pos }]);
      });
    }
  }
  // Variables holding a vertex: usual vertex names, plus anything the code uses to index the graph or its state arrays.
  const indexers = new Set<string>(NODE_VARS);
  for (const n of [...ADJACENCY_NAMES, ...VISITED_NAMES, ...DIST_NAMES, ...PREV_NAMES])
    for (const p of hints.pointers[n] ?? []) indexers.add(p.name);
  for (const v of vars) {
    if (!indexers.has(v.name) || (v.value.t !== 'number' && v.value.t !== 'string')) continue;
    const k = nodeKey(v.value);
    if (k === null || !keys.has(k)) continue;
    const list = overlay.tags.get(k) ?? [];
    const same = list.find((t) => t.name === v.name);
    if (same) same.active ||= v.active;
    else list.push({ name: v.name, active: v.active });
    overlay.tags.set(k, list);
  }
  // A name in a waiting call that the active call also uses is shown once, for the active call.
  for (const [k, list] of overlay.tags) {
    for (const t of list)
      if (!t.active && [...overlay.tags.values()].some((l) => l.some((o) => o.name === t.name && o.active)))
        list.splice(list.indexOf(t), 1);
    if (!list.length) overlay.tags.delete(k);
  }
  return overlay;
}

/**
 * What this step did to the traversal state, per vertex, in words: "visited set",
 * "joined queue", "dist = 2". Read from the step's effects on the structures in `overlay`.
 */
export function overlayChanges(overlay: GraphOverlay, effects: Effect[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const note = (k: string | null, text: string) => {
    if (k === null) return;
    const list = out.get(k) ?? [];
    if (!list.includes(text)) list.push(text);
    out.set(k, list);
  };
  const show = (v: ValueSnap) =>
    v.t === 'number' ? (Number.isFinite(v.v) ? String(v.v) : v.v > 0 ? '∞' : '-∞') : v.t === 'string' ? v.v : v.t;
  for (const e of effects) {
    if (!('objId' in e)) continue;
    const src = overlay.sources.get(e.objId);
    if (!src) continue;
    switch (e.type) {
      case 'index-write':
        note(String(e.index), src.kind === 'visited' ? `${src.name} set` : `${src.name} = ${show(e.after)}`);
        break;
      case 'prop-write':
        note(e.key, src.kind === 'visited' ? `${src.name} set` : `${src.name} = ${show(e.after)}`);
        break;
      case 'map-insert':
        note(nodeKey(e.key), src.kind === 'visited' ? `${src.name} set` : `${src.name} = ${show(e.value)}`);
        break;
      case 'set-add':
        note(nodeKey(e.value), e.existed ? `already in ${src.name}` : `added to ${src.name}`);
        break;
      case 'set-lookup':
        note(nodeKey(e.value), e.found ? `in ${src.name}` : `not in ${src.name}`);
        break;
      case 'map-lookup':
        note(nodeKey(e.key), e.found ? `${src.name} checked` : `not in ${src.name}`);
        break;
      case 'index-read':
        if (src.kind === 'visited') note(String(e.index), `${src.name} checked`);
        break;
      case 'array-add':
        if (src.kind === 'frontier') for (const v of e.values) note(nodeKey(v), `joined ${src.name}`);
        break;
      case 'array-remove':
        if (src.kind === 'frontier') note(nodeKey(e.value), `left ${src.name}`);
        break;
    }
  }
  return out;
}

export interface GraphActivity {
  /** Edges whose entry the step read (from → to), e.g. while looping over a neighbor list. */
  checked: { from: string; to: string }[];
  /** Edges this step added to a neighbor list. */
  added: { from: string; to: string }[];
  /** Vertices whose neighbor list this step looked up. */
  opened: Set<string>;
}

/** What the step did to the graph itself, from its recorded reads and adds. */
export function graphActivity(model: GraphModel, h: HeapSnap, step: Step, heap: Heap): GraphActivity {
  const act: GraphActivity = { checked: [], added: [], opened: new Set() };
  for (const e of step.effects) {
    if (!('objId' in e)) continue;
    if (e.objId === h.id) {
      if (e.type === 'index-read' && model.form !== 'edge-list') act.opened.add(String(e.index));
      if (e.type === 'map-lookup' && e.found && nodeKey(e.key) !== null) act.opened.add(nodeKey(e.key)!);
      if (e.type === 'prop-read' && h.kind === 'object') act.opened.add(e.key);
      continue;
    }
    const from = model.rowOf.get(e.objId);
    if (from !== undefined && model.form === 'edge-list') {
      // Reading a pair of an edge list looks at that edge.
      if (e.type === 'index-read') {
        const pair = heap[e.objId];
        const to = pair?.kind === 'array' ? nodeKey(pair.items[1]) : null;
        if (to !== null && !act.checked.some((c) => c.from === from && c.to === to)) act.checked.push({ from, to });
      }
      continue;
    }
    if (from !== undefined) {
      if (e.type === 'index-read') {
        if (model.form === 'matrix') {
          if (truthy(e.value)) act.checked.push({ from, to: String(e.index) });
        } else {
          const nb = neighborOf(e.value, heap);
          if (nb) act.checked.push({ from, to: nb.key });
        }
      }
      if (e.type === 'array-add')
        for (const v of e.values) {
          const nb = neighborOf(v, heap);
          if (nb) act.added.push({ from, to: nb.key });
        }
      continue;
    }
    // [vertex, weight] pairs inside a row.
    const row = model.pairOf.get(e.objId);
    if (row !== undefined && e.type === 'index-read' && e.index === 0) {
      const to = nodeKey(e.value);
      if (to !== null) act.checked.push({ from: model.rowOf.get(row)!, to });
    }
  }
  return act;
}

// ---------------------------------------------------------------- tries

const CHILD_CONTAINERS = ['children', 'child', 'kids', 'next', 'links', 'map', 'edges', 'c'];
const TERMINAL_FIELDS = [
  'end',
  'isEnd',
  'isWord',
  'word',
  'terminal',
  'isTerminal',
  'isEndOfWord',
  'endOfWord',
  'eow',
  'leaf',
  'done',
  'complete',
  'final',
  '$',
  '*',
  '#',
  '_end',
];
/** Counters a trie node may carry; shown next to the node. */
const COUNT_FIELDS = ['count', 'cnt', 'prefixCount', 'prefix', 'pass', 'freq', 'size', 'words', 'endCount'];

export interface TrieNodeInfo {
  /** Heap id of the object or Map that is this node. */
  id: number;
  /** Letter on the branch into this node ('' for the root). */
  char: string;
  parent: number | null;
  depth: number;
  terminal: boolean;
  /** Field that marks the end of a word, as written in the code. */
  terminalField: string | null;
  /** Counters and stored words on this node (e.g. count 2). */
  extras: { key: string; value: ValueSnap }[];
  /** Object holding the children: the node itself, or its children/next field. */
  containerId: number;
  children: number[];
}

export interface TrieModel {
  rootId: number;
  nodes: Map<number, TrieNodeInfo>;
  /** Words spelled from the root to every node marked as a word end, in drawing order. */
  words: string[];
  spots: Map<number, Spot>;
  width: number;
  depth: number;
}

function entriesOf(h: HeapSnap): [string, ValueSnap][] | null {
  if (h.kind === 'object') return h.entries;
  if (h.kind === 'map') return h.entries.every(([k]) => k.t === 'string') ? h.entries.map(([k, v]) => [(k as { v: string }).v, v]) : null;
  return null;
}

const isNodeRef = (v: ValueSnap, heap: Heap) => ref(v) !== null && (heap[ref(v)!]?.kind === 'object' || heap[ref(v)!]?.kind === 'map');

/**
 * The node's children: its own single-letter keys, or every entry of a children/next object
 * or Map. `own` is what is left on the node (word-end flags, counters), checked by readTrie.
 * Returns null when a children object holds something other than letter → node entries.
 */
function childEntries(h: HeapSnap, heap: Heap): { container: HeapSnap; kids: [string, number][]; own: [string, ValueSnap][] } | null {
  const fields = entriesOf(h);
  if (!fields) return null;
  const containerField = fields.find(([k, v]) => CHILD_CONTAINERS.includes(k) && isNodeRef(v, heap));
  if (containerField) {
    const container = heap[ref(containerField[1])!];
    const items = entriesOf(container);
    if (!items || !items.every(([k, v]) => [...k].length === 1 && isNodeRef(v, heap))) return null;
    return { container, kids: items.map(([k, v]) => [k, ref(v)!]), own: fields.filter(([k]) => k !== containerField[0]) };
  }
  const isKid = ([k, v]: [string, ValueSnap]) => [...k].length === 1 && isNodeRef(v, heap);
  return { container: h, kids: fields.filter(isKid).map(([k, v]) => [k, ref(v)!]), own: fields.filter((e) => !isKid(e)) };
}

/**
 * Reads the trie under `rootId`. A node is an object or Map whose children are single-letter
 * keys (on the node itself or in a children/next field); a word ends where a flag such as
 * end/isEnd/isWord is true. Returns null if some node has fields a trie node would not have.
 */
export function readTrie(rootId: number, heap: Heap): TrieModel | null {
  const nodes = new Map<number, TrieNodeInfo>();
  const order: number[] = [];
  const visit = (id: number, char: string, parent: number | null, depth: number): boolean => {
    if (nodes.has(id)) return true;
    const h = heap[id];
    if (!h) return false;
    const ce = childEntries(h, heap);
    if (!ce) return false;
    let terminal = false;
    let terminalField: string | null = null;
    const extras: TrieNodeInfo['extras'] = [];
    for (const [k, v] of ce.own) {
      if (TERMINAL_FIELDS.includes(k)) {
        if (v.t === 'boolean' || v.t === 'null' || v.t === 'undefined' || v.t === 'number') {
          terminalField = k;
          if (truthy(v)) terminal = true;
          continue;
        }
        if (v.t === 'string') {
          // A stored word marks the end too (`node.word = "cat"`); an empty string does not.
          terminalField = k;
          if (v.v !== '') terminal = true;
          extras.push({ key: k, value: v });
          continue;
        }
      }
      if (COUNT_FIELDS.includes(k) && (v.t === 'number' || v.t === 'string')) {
        extras.push({ key: k, value: v });
        continue;
      }
      // A field a trie node would not carry: this is not a trie.
      return false;
    }
    const info: TrieNodeInfo = {
      id,
      char,
      parent,
      depth,
      terminal,
      terminalField,
      extras,
      containerId: ce.container.id,
      children: ce.kids.map(([, c]) => c),
    };
    nodes.set(id, info);
    order.push(id);
    for (const [k, c] of ce.kids) if (!visit(c, k, id, depth + 1)) return false;
    return true;
  };
  if (!visit(rootId, '', null, 0)) return null;
  const { spots, width, depth } = naryLayout([rootId], (id) => nodes.get(id)?.children ?? []);
  const spell = (id: number): string => {
    const n = nodes.get(id)!;
    return n.parent === null ? '' : spell(n.parent) + n.char;
  };
  const words = [...nodes.values()]
    .filter((n) => n.terminal)
    .sort((a, b) => spots.get(a.id)!.x - spots.get(b.id)!.x || a.depth - b.depth)
    .map((n) => spell(n.id));
  return { rootId, nodes, words, spots, width, depth };
}

export interface TrieActivity {
  /** Branches this step followed or created: child id. */
  followed: Set<number>;
  /** Letters this step looked for and did not find, under a node. */
  missing: { parent: number; char: string }[];
  /** Nodes whose word-end flag this step wrote. */
  marked: Set<number>;
}

/** What the step did inside the trie, from its recorded property reads, lookups and writes. */
export function trieActivity(model: TrieModel, effects: Effect[]): TrieActivity {
  const byContainer = new Map([...model.nodes.values()].map((n) => [n.containerId, n]));
  const act: TrieActivity = { followed: new Set(), missing: [], marked: new Set() };
  for (const e of effects) {
    if (!('objId' in e)) continue;
    const node = byContainer.get(e.objId);
    if (node) {
      const key =
        e.type === 'prop-read' || e.type === 'prop-write'
          ? e.key
          : e.type === 'map-lookup' || e.type === 'map-insert'
            ? nodeKey(e.key)
            : null;
      if (key !== null && [...key].length === 1) {
        const child = node.children.find((c) => model.nodes.get(c)!.char === key);
        if (child !== undefined) act.followed.add(child);
        else if ((e.type === 'prop-read' && e.value.t === 'undefined') || (e.type === 'map-lookup' && !e.found))
          act.missing.push({ parent: node.id, char: key });
      }
    }
    const own = model.nodes.get(e.objId);
    if (own && (e.type === 'prop-write' || e.type === 'map-insert')) {
      const key = e.type === 'prop-write' ? e.key : nodeKey(e.key);
      if (key !== null && key === own.terminalField) act.marked.add(own.id);
    }
  }
  return act;
}

/** Trie node that variables point at, active call strongly; keyed by node id. */
export function trieTags(model: TrieModel, frames: FrameSnap[]): Map<number, NodeTag[]> {
  const out = new Map<number, NodeTag[]>();
  for (const v of allVars(frames)) {
    const id = ref(v.value);
    if (id === null || !model.nodes.has(id) || v.name === 'this') continue;
    const list = out.get(id) ?? [];
    const same = list.find((t) => t.name === v.name);
    if (same) same.active ||= v.active;
    else list.push({ name: v.name, active: v.active });
    out.set(id, list);
  }
  return out;
}

/** The root a trie candidate stands for: a Trie object's root field, or the object itself. */
export function trieRootOf(h: HeapSnap, heap: Heap): number {
  if (h.kind === 'object') {
    const r = (h as ObjSnap).entries.find(([k]) => k === 'root')?.[1];
    const id = ref(r);
    if (id !== null && (heap[id]?.kind === 'object' || heap[id]?.kind === 'map')) return id;
  }
  return h.id;
}

const orderCache = new WeakMap<Step[], Map<string, string[]>>();

/**
 * Every vertex the graph has at any step of the run, in the order they first appear, so
 * each vertex keeps one place on the circle for the whole run (vertices added later get
 * places that were kept free for them).
 */
export function graphNodeOrder(steps: Step[], objId: number, as: 'adjacency' | 'edge-list', vertexCount?: number): string[] {
  let byObj = orderCache.get(steps);
  if (!byObj) orderCache.set(steps, (byObj = new Map()));
  const key = `${objId}:${as}:${vertexCount ?? ''}`;
  const known = byObj.get(key);
  if (known) return known;
  const order: string[] = [];
  for (const s of steps) {
    const h = s.heap[objId];
    if (!h) continue;
    const m = readGraph(h, s.heap, as, vertexCount);
    if (m) for (const n of m.nodes) if (!order.includes(n.key)) order.push(n.key);
  }
  byObj.set(key, order);
  return order;
}
