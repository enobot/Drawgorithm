// Readers behind the heap, deque, union-find, graph and trie drawings: which variables get
// them, and what they read from real traces of the engine.
import { describe, expect, it } from 'vitest';
import { liveBuild, runProgram } from '../engine/run';
import { AUTHORED } from '../practice/exercises';
import type { RunResult, Step } from '../trace/types';
import { buildTraversalIndex } from './analysis';
import { bitWidth } from './BitsView';
import { NO_OVERRIDES, resolveBindings, type BindingOverrides } from './bindings';
import {
  buildForest,
  circleLayout,
  graphActivity,
  graphOverlay,
  heapMoves,
  isAncestor,
  naryLayout,
  overlayChanges,
  readGraph,
  readCallTree,
  readTrie,
  trieActivity,
  trieTags,
} from './structures';

function runEntry(code: string, entry: string, inputs: Record<string, unknown>): RunResult {
  return runProgram({
    code,
    mode: 'function',
    entry,
    inputs: Object.entries(inputs).map(([name, value]) => ({ name, value, kind: 'auto' })),
  });
}

const reference = (id: string) => AUTHORED[id].content.solution.code;

function bindingsAt(run: RunResult, step: Step, overrides: BindingOverrides = NO_OVERRIDES) {
  return resolveBindings(step.heap, step.frames, run.hints, overrides);
}

/** The id the variable `name` refers to in the innermost call that has it. */
function idOf(step: Step, name: string): number {
  const v = [...step.frames]
    .reverse()
    .flatMap((f) => f.vars)
    .find((x) => x.name === name);
  if (!v || v.value.t !== 'ref') throw new Error(`${name} is not a reference here`);
  return v.value.id;
}

const last = (run: RunResult) => run.steps[run.steps.length - 1];

function live(code: string) {
  const r = liveBuild(code);
  if (!r.step) throw new Error(`no drawing: ${r.error?.message ?? r.pending?.message}`);
  return { step: r.step, b: resolveBindings(r.step.heap, r.step.frames, r.hints) };
}

describe('static hints for the new drawings', () => {
  it('finds arrays used at both ends and arrays whose items index another array', () => {
    const run = runEntry(reference('f75-25'), 'windowPeaks', { readings: [4, 2, 12], k: 2 });
    expect(run.hints.deques).toEqual(['dq']);
    expect(run.hints.indexInto).toEqual({ dq: ['readings'] });
    // A plain BFS queue is still a queue, not a deque.
    const bfs = runEntry(reference('f75-46'), 'canReach', { n: 2, roads: [[0, 1]], start: 0, goal: 1 });
    expect(bfs.hints.queues).toContain('queue');
    expect(bfs.hints.deques).toEqual([]);
  });
});

describe('which variables get which drawing', () => {
  it('draws an array named heap as a heap, even though the code pops it like a stack', () => {
    const run = runEntry(reference('f75-41'), 'priorityDesk', {
      ops: [
        ['add', 3],
        ['add', 1],
      ],
    });
    const step = last(run);
    const b = bindingsAt(run, step);
    expect(run.hints.stacks).toContain('heap');
    expect(b.roles.get(idOf(step, 'heap'))).toMatchObject({ role: 'heap', source: 'convention', names: ['heap'] });
    expect(b.arrays.find((a) => a.name === 'heap')?.role).toBe('heap');
  });

  it('lets the user draw any array as a heap, and back', () => {
    const { step, b } = live('const pq = [1, 4, 2];\npq.pop();\n');
    expect(b.roles.size).toBe(0);
    const chosen = resolveBindings(step.heap, step.frames, b.hints, { shapes: {}, arrays: { pq: { role: 'heap' } } });
    expect(chosen.roles.get(idOf(step, 'pq'))).toMatchObject({ role: 'heap', source: 'user' });
  });

  it('draws a deque from the code that uses both ends', () => {
    const run = runEntry(reference('f75-25'), 'windowPeaks', { readings: [4, 2, 12], k: 2 });
    const step = run.steps.find((s) => s.frames.some((f) => f.vars.some((v) => v.name === 'dq')))!;
    expect(bindingsAt(run, step).roles.get(idOf(step, 'dq'))).toMatchObject({ role: 'deque', source: 'code' });
  });

  it('draws a parent array as union-find only while every item is a slot of it', () => {
    expect(live('const parent = [0, 0, 1, 3];\n').b.roles.size).toBe(1);
    expect([...live('const parent = [0, 0, 1, 3];\n').b.roles.values()][0].role).toBe('union-find');
    // A BFS predecessor array with -1 for "none" is not a forest.
    expect(live('const parent = [-1, 0, 0];\n').b.roles.size).toBe(0);
    expect(live('const parent = [0, 7];\n').b.roles.size).toBe(0);
  });

  it('reads graph-named adjacency lists and edge-list-named pairs, with the vertex count next to them', () => {
    const { step, b } = live('const n = 4;\nconst roads = [[0, 1], [2, 1]];\nconst graph = [[1], [0, 2], [1], []];\n');
    expect(b.roles.get(idOf(step, 'graph'))?.role).toBe('graph');
    expect(b.roles.get(idOf(step, 'roads'))).toMatchObject({ role: 'edge-list', vertexCount: 4 });
    // An array of arrays with another name stays a table.
    expect(live('const grid = [[1], [0]];\n').b.roles.size).toBe(0);
  });

  it('draws a trie once, from its root, however many variables point inside it', () => {
    const run = runEntry(reference('f75-66'), 'runDictionary', { ops: [['add', 'ab']] });
    const step = run.steps.find((s) =>
      s.frames.at(-1)!.vars.some((v) => v.name === 'node' && v.value.t === 'ref' && v.value.id !== idOf(s, 'root')),
    )!;
    const b = bindingsAt(run, step);
    const tries = [...b.roles.entries()].filter(([, r]) => r.role === 'trie');
    expect(tries).toHaveLength(1);
    expect(tries[0][0]).toBe(idOf(step, 'root'));
  });

  it('does not ask how to draw plain objects that are the nodes of a drawn trie', () => {
    const run = runEntry(reference('f75-66'), 'runDictionary', {
      ops: [
        ['add', 'car'],
        ['add', 'cat'],
      ],
    });
    const b = bindingsAt(run, last(run));
    expect([...b.roles.values()].map((r) => r.role)).toEqual(['trie']);
    expect(b.ambiguous).toEqual([]);
    // Other plain objects that link to each other in two ways are still asked about.
    const { b: other } = live('const a = { x: null, y: null };\nconst c = { x: a, y: a };\n');
    expect(other.ambiguous.map((x) => x.className)).toEqual(['(object)']);
  });

  it('draws a Trie class through its root field', () => {
    const code = [
      'class TrieNode { constructor() { this.children = new Map(); this.isEnd = false; } }',
      'class Trie { constructor() { this.root = new TrieNode(); }',
      '  insert(w) { let node = this.root; for (const ch of w) { if (!node.children.has(ch)) node.children.set(ch, new TrieNode()); node = node.children.get(ch); } node.isEnd = true; } }',
      'const t = new Trie();',
      't.insert("hi");',
      't.insert("he");',
    ].join('\n');
    // Live Build waits for Run before calling methods, so this is a script run.
    const run = runProgram({ code, mode: 'script', inputs: [] });
    const step = last(run);
    const b = bindingsAt(run, step);
    const [[rootId, role]] = [...b.roles.entries()];
    expect(role).toMatchObject({ role: 'trie', names: ['t'] });
    const model = readTrie(rootId, step.heap)!;
    expect(model.words).toEqual(['hi', 'he']);
  });

  it('offers a graph drawing for a Map of neighbor lists under another name, without choosing it', () => {
    const { b } = live('const links = new Map([["a", ["b"]], ["b", ["a"]]]);\n');
    expect(b.objects).toEqual([expect.objectContaining({ name: 'links', role: 'plain', fits: ['graph'] })]);
    expect(b.roles.size).toBe(0);
  });
});

describe('drawings follow what the code does, whatever the names', () => {
  it('draws an array as a heap from its slot arithmetic', () => {
    const code = [
      'function f() {',
      '  const pq = [];',
      '  const add = (x) => {',
      '    pq.push(x);',
      '    let i = pq.length - 1;',
      '    while (i > 0) {',
      '      const up = (i - 1) >> 1;',
      '      if (pq[up] <= pq[i]) break;',
      '      [pq[up], pq[i]] = [pq[i], pq[up]];',
      '      i = up;',
      '    }',
      '  };',
      '  add(5); add(3); add(8);',
      '  return pq;',
      '}',
    ].join('\n');
    const run = runEntry(code, 'f', {});
    expect(run.hints.usage?.heaps).toEqual(['pq']);
    const step = last(run);
    expect(bindingsAt(run, step).roles.get(idOf(step, 'pq'))).toMatchObject({ role: 'heap', source: 'code' });
    // A plain array pushed and popped is still a stack.
    expect(live('const pq = [1, 4, 2];\npq.pop();\n').b.roles.size).toBe(0);
  });

  it('draws an array as union-find when the code climbs it to a root', () => {
    const run = runEntry('function f() { const up = [0, 0, 1, 3]; let x = 2; while (up[x] !== x) x = up[x]; return x; }', 'f', {});
    expect(run.hints.usage?.parents).toEqual(['up']);
    const step = last(run);
    expect(bindingsAt(run, step).roles.get(idOf(step, 'up'))).toMatchObject({ role: 'union-find', source: 'code' });
    // Recursion up the links: find(p[x]) inside find(x).
    const rec = runEntry(
      'function find(x) { return boss2[x] === x ? x : find(boss2[x]); }\nconst boss2 = [0, 0, 1];\nfunction f() { return find(2); }',
      'f',
      {},
    );
    expect(rec.hints.usage?.parents).toEqual(['boss2']);
  });

  it('reads a graph, its visited marks, distances and predecessors from a breadth-first search', () => {
    const code = [
      'function f() {',
      '  const nb = [[1, 2], [0, 3], [0], [1]];',
      '  const mark = [true, false, false, false];',
      '  const far = [0, Infinity, Infinity, Infinity];',
      '  const back = [-1, -1, -1, -1];',
      '  const line = [0];',
      '  while (line.length) {',
      '    const at = line.shift();',
      '    for (const x of nb[at]) {',
      '      if (mark[x]) continue;',
      '      mark[x] = true;',
      '      far[x] = far[at] + 1;',
      '      back[x] = at;',
      '      line.push(x);',
      '    }',
      '  }',
      '  return far;',
      '}',
    ].join('\n');
    const run = runEntry(code, 'f', {});
    expect(run.hints.usage).toMatchObject({ adjacency: ['nb'], visited: ['mark'], distances: ['far'], predecessors: ['back'] });
    const step = last(run);
    const b = bindingsAt(run, step);
    expect(b.roles.get(idOf(step, 'nb'))).toMatchObject({ role: 'graph', source: 'code' });
    const model = readGraph(step.heap[idOf(step, 'nb')], step.heap, 'adjacency')!;
    const o = graphOverlay(model, step.frames, step.heap, run.hints, new Set(b.roles.keys()));
    expect([...o.visited.keys()].sort()).toEqual(['0', '1', '2', '3']);
    expect(o.values.map((v) => v.name)).toEqual(['far']);
    expect(o.values[0].byNode.get('3')).toEqual({ t: 'number', v: 2 });
    expect([...o.prev[0].links].sort()).toEqual([
      ['1', '0'],
      ['2', '0'],
      ['3', '1'],
    ]);
    // The loop variables hold vertices, whatever they are called.
    const mid = run.steps.find((s) => s.frames.at(-1)!.vars.some((v) => v.name === 'x' && v.value.t === 'number'))!;
    const mo = graphOverlay(model, mid.frames, mid.heap, run.hints, new Set(b.roles.keys()));
    expect([...mo.tags.values()].flat().map((t) => t.name)).toEqual(expect.arrayContaining(['x', 'at']));
  });

  it('reads pairs taken apart into two vertices as an edge list, but not intervals', () => {
    const edges = runEntry(
      'function f(E) { const out = [[], [], []]; for (const [a, b] of E) { out[a].push(b); out[b].push(a); } return out; }',
      'f',
      {
        E: [
          [0, 1],
          [1, 2],
        ],
      },
    );
    expect(edges.hints.usage?.edgeLists).toEqual(['E']);
    const step = last(edges);
    expect(bindingsAt(edges, step).roles.get(idOf(step, 'E'))).toMatchObject({ role: 'edge-list', source: 'code' });
    const merge = runEntry(
      'function f(spans) { const out = []; for (const [s, e] of spans) { if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); } return out; }',
      'f',
      {
        spans: [
          [1, 3],
          [2, 4],
        ],
      },
    );
    expect(merge.hints.usage?.edgeLists).toEqual([]);
    expect(bindingsAt(merge, last(merge)).roles.size).toBe(0);
  });

  it('draws nested objects as a trie when the code walks down them by letter', () => {
    const code =
      'function f(words) { const top = {}; for (const w of words) { let at = top; for (const ch of w) { if (!at[ch]) at[ch] = {}; at = at[ch]; } at.end = true; } return 0; }';
    const run = runEntry(code, 'f', { words: ['to', 'tea'] });
    expect(run.hints.usage?.trieWalk).toBe(true);
    const step = last(run);
    const tries = [...bindingsAt(run, step).roles.entries()].filter(([, r]) => r.role === 'trie');
    expect(tries).toEqual([[idOf(step, 'top'), expect.objectContaining({ source: 'code', names: ['top'] })]]);
    expect(readTrie(idOf(step, 'top'), step.heap)?.words.sort()).toEqual(['tea', 'to']);
  });

  it('reads a node class whose value field has its own name', () => {
    const { b } = live(
      'class Link { constructor(num) { this.num = num; this.after = null; } }\nconst a = new Link(1);\nconst c = new Link(2);\na.after = c;\n',
    );
    expect(b.shapes.find((s) => s.className === 'Link')?.shape).toEqual({ kind: 'list', value: 'num', next: 'after' });
  });

  it('marks numbers combined bit by bit, not numbers that are only halved or truncated', () => {
    const run = runEntry(
      'function f(ids, n) { let acc = 0; for (const id of ids) acc ^= id; let m = n & 1; const mid = (0 + n) >> 1; const t = n / 3 | 0; return acc + m + mid + t + ~m; }',
      'f',
      { ids: [3, 5, 3], n: 9 },
    );
    expect(run.status).toBe('finished');
    expect([...run.hints.usage!.bits].sort()).toEqual(['acc', 'id', 'm', 'n']);
    // One width for the whole run: a multiple of 4 that fits every value, 32 once a value is negative.
    expect(bitWidth(run.steps, ['acc', 'id'])).toBe(4);
    const neg = runEntry('function f() { let x = 5; x ^= -1; return x; }', 'f', {});
    expect(bitWidth(neg.steps, ['x'])).toBe(32);
  });

  it('follows a variable that steps along its own field as the current node', () => {
    const code = 'function f(head) { let w = head; while (w.next) w = w.next; return w.val; }';
    const run = runProgram({ code, mode: 'function', entry: 'f', inputs: [{ name: 'head', value: [1, 2, 3], kind: 'list' }] });
    expect(run.hints.usage?.walkers).toEqual(['w']);
    const index = buildTraversalIndex(run.steps, undefined, run.hints.usage?.walkers);
    const k = run.steps.findIndex((s) => {
      const vars = s.frames.at(-1)!.vars;
      const w = vars.find((v) => v.name === 'w');
      const head = vars.find((v) => v.name === 'head');
      return w && head && JSON.stringify(w.value) !== JSON.stringify(head.value);
    });
    expect(k).toBeGreaterThan(0);
    expect(index.current[k]).toBe(idOf(run.steps[k], 'w'));
  });
});

describe('heap moves', () => {
  it('reports a destructuring swap as two moves, read from the step’s reads and writes', () => {
    const run = runEntry(reference('f75-41'), 'priorityDesk', {
      ops: [
        ['add', 5],
        ['add', 2],
      ],
    });
    const step = run.steps.find((s) => s.effects.filter((e) => e.type === 'index-write').length === 2)!;
    const id = idOf(step, 'heap');
    expect([...heapMoves(step.effects, id, 2)].sort()).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('reports the last item moving to the top when it is popped and written in one step', () => {
    const run = runEntry('function f() { const heap = [1, 5, 3, 9]; heap[0] = heap.pop(); return heap; }', 'f', {});
    const step = run.steps.find((s) => s.effects.some((e) => e.type === 'index-write'))!;
    expect([...heapMoves(step.effects, idOf(step, 'heap'), 3)]).toEqual([[0, 3]]);
  });

  it('does not invent a move when the written value was not read from another slot', () => {
    const run = runEntry('function f() { const heap = [4, 5]; heap[1] = 4; return heap; }', 'f', {});
    const step = run.steps.find((s) => s.effects.some((e) => e.type === 'index-write'))!;
    expect(heapMoves(step.effects, idOf(step, 'heap'), 2).size).toBe(0);
  });
});

describe('union-find forest', () => {
  it('finds roots, children and slots caught in a loop', () => {
    const f = buildForest([0, 0, 1, 3, 3, 6, 5]);
    expect(f.roots).toEqual([0, 3]);
    expect(f.children.get(0)).toEqual([1]);
    expect(f.children.get(3)).toEqual([4]);
    expect(f.looped).toEqual([5, 6]);
    expect(f.spots.size).toBe(7);
  });

  it('lays out every slot without two on one level closer than a unit', () => {
    const f = buildForest([0, 0, 0, 1, 1, 2, 6, 6, 8]);
    const byDepth = new Map<number, number[]>();
    for (const s of f.spots.values()) byDepth.set(s.depth, [...(byDepth.get(s.depth) ?? []), s.x]);
    for (const xs of byDepth.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(1);
    }
  });

  it('tells a shortcut up the same chain from an unrelated re-pointing', () => {
    const parent = [0, 0, 1, 2];
    expect(isAncestor(parent, 0, 2)).toBe(true);
    expect(isAncestor(parent, 3, 1)).toBe(false);
  });

  it('records path compression as writes the forest drawing can explain', () => {
    const run = runEntry(reference('f75-51'), 'communities', {
      n: 4,
      events: [
        ['link', 1, 0],
        ['link', 2, 3],
        ['link', 3, 0],
        ['ask', 2, 1],
      ],
    });
    const writes = run.steps.flatMap((s) => s.effects).filter((e) => e.type === 'index-write');
    expect(writes.length).toBeGreaterThan(0);
    // The final parent array is a valid forest with one root.
    const step = last(run);
    const parent = step.heap[idOf(step, 'parent')];
    expect(parent.kind === 'array' && buildForest(parent.items.map((v) => (v.t === 'number' ? v.v : -1))).roots).toHaveLength(1);
  });
});

describe('graph reading', () => {
  it('reads an adjacency list with both directions as undirected edges', () => {
    const { step } = live('const graph = [[1, 2], [0], [0]];\n');
    const m = readGraph(step.heap[idOf(step, 'graph')], step.heap, 'adjacency')!;
    expect(m.nodes.map((n) => n.key)).toEqual(['0', '1', '2']);
    expect(m.edges).toEqual([
      { from: '0', to: '1', directed: false, weight: undefined, count: 1 },
      { from: '0', to: '2', directed: false, weight: undefined, count: 1 },
    ]);
  });

  it('draws one-way entries as directed edges, and weights from [vertex, weight] pairs', () => {
    const { step } = live('const graph = [[[1, 7]], [[2, 3]], []];\n');
    const m = readGraph(step.heap[idOf(step, 'graph')], step.heap, 'adjacency')!;
    expect(m.edges.map((e) => [e.from, e.to, e.directed, e.weight])).toEqual([
      ['0', '1', true, '7'],
      ['1', '2', true, '3'],
    ]);
  });

  it('reads a square 0/1 table as an adjacency matrix', () => {
    const { step } = live('const graph = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];\n');
    const m = readGraph(step.heap[idOf(step, 'graph')], step.heap, 'adjacency')!;
    expect(m.form).toBe('matrix');
    expect(m.edges.map((e) => `${e.from}-${e.to}`)).toEqual(['0-1', '1-2']);
  });

  it('reads Maps and objects of neighbor lists, adding vertices that are only listed as neighbors', () => {
    const map = live('const adj = new Map([["a", ["b", "c"]], ["b", ["a"]]]);\n');
    const m = readGraph(map.step.heap[idOf(map.step, 'adj')], map.step.heap, 'adjacency')!;
    expect(m.nodes.map((n) => n.key)).toEqual(['a', 'b', 'c']);
    expect(m.edges.map((e) => [e.from, e.to, e.directed])).toEqual([
      ['a', 'b', false],
      ['a', 'c', true],
    ]);
    const obj = live('const graph = { x: ["y"], y: [] };\n');
    expect(readGraph(obj.step.heap[idOf(obj.step, 'graph')], obj.step.heap, 'adjacency')!.form).toBe('object');
  });

  it('reads an edge list without directions, with vertices 0..n-1 from n', () => {
    const { step } = live('const roads = [[0, 1], [1, 0], [3, 1, 4]];\n');
    const m = readGraph(step.heap[idOf(step, 'roads')], step.heap, 'edge-list', 5)!;
    expect(m.nodes.map((n) => n.key)).toEqual(['0', '1', '2', '3', '4']);
    expect(m.edges.map((e) => [e.from, e.to, e.directed, e.count, e.weight])).toEqual([
      ['0', '1', false, 2, undefined],
      ['3', '1', false, 1, '4'],
    ]);
  });

  it('refuses data that is not a graph', () => {
    const { step } = live('const graph = [[1], [5]];\nconst roads = [[0, 1, 2, 3]];\nconst g = [1, 2];\n');
    expect(readGraph(step.heap[idOf(step, 'graph')], step.heap, 'adjacency')).toBeNull();
    expect(readGraph(step.heap[idOf(step, 'roads')], step.heap, 'edge-list')).toBeNull();
    expect(readGraph(step.heap[idOf(step, 'g')], step.heap, 'adjacency')).toBeNull();
  });

  it('places vertices on a circle no closer than the gap', () => {
    for (const count of [2, 3, 7, 20]) {
      const { points } = circleLayout(count, 96);
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(96 - 1e-6);
        }
      }
    }
  });
});

describe('graph traversal state from a real BFS', () => {
  const run = runEntry(reference('f75-46'), 'canReach', {
    n: 4,
    roads: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    start: 0,
    goal: 3,
  });
  // The step that reads town 1's neighbor list while exploring it.
  const k = run.steps.findIndex(
    (s) => s.kind === 'loop-next' && s.frames.at(-1)!.vars.some((v) => v.name === 'town' && v.value.t === 'number' && v.value.v === 1),
  );
  const step = run.steps[k];
  const b = bindingsAt(run, step);
  const gid = idOf(step, 'graph');
  const model = readGraph(step.heap[gid], step.heap, 'adjacency')!;
  const overlay = graphOverlay(model, step.frames, step.heap, run.hints, new Set(b.roles.keys()));

  it('shows visited vertices, the queue and the variables holding vertices', () => {
    expect(k).toBeGreaterThan(0);
    expect([...overlay.visited.keys()].sort()).toEqual(['0', '1']);
    expect(overlay.tags.get('1')?.map((t) => t.name)).toContain('town');
    expect(overlay.tags.get('0')?.map((t) => t.name)).toContain('start');
  });

  it('lights the edge whose neighbor entry the loop read', () => {
    const act = graphActivity(model, step.heap[gid], step, step.heap);
    expect(act.checked).toEqual([{ from: '1', to: '0' }]);
  });

  it('says what a step did to the traversal state', () => {
    const add = run.steps.find((s, i) => i > k && s.effects.some((e) => e.type === 'set-add'))!;
    const o = graphOverlay(model, add.frames, add.heap, run.hints, new Set(b.roles.keys()));
    expect(overlayChanges(o, add.effects).get('2')).toEqual(['added to visited']);
    const push = run.steps.find((s, i) => i > k && s.effects.some((e) => e.type === 'array-add' && e.objId === idOf(s, 'queue')))!;
    const o2 = graphOverlay(model, push.frames, push.heap, run.hints, new Set(b.roles.keys()));
    expect(overlayChanges(o2, push.effects).get('2')).toEqual(['joined queue']);
    expect(o2.frontier.get('2')).toEqual([{ name: 'queue', pos: 0 }]);
  });

  it('reads distances and predecessor links by their names', () => {
    const code = 'function f() { const graph = [[1], [0, 2], [1]]; const dist = [0, 1, -1]; const prev = [-1, 0, -1]; return 0; }';
    const r = runEntry(code, 'f', {});
    const s = r.steps.find((x) => x.frames.at(-1)!.vars.some((v) => v.name === 'prev'))!;
    const m = readGraph(s.heap[idOf(s, 'graph')], s.heap, 'adjacency')!;
    const o = graphOverlay(m, s.frames, s.heap, r.hints, new Set([idOf(s, 'graph')]));
    expect(o.values[0].name).toBe('dist');
    expect(o.values[0].byNode.get('1')).toEqual({ t: 'number', v: 1 });
    expect([...o.prev[0].links]).toEqual([['1', '0']]);
  });
});

describe('trie reading', () => {
  it('reads nested objects with children and end flags, and the words they spell', () => {
    const run = runEntry(reference('f75-66'), 'runDictionary', {
      ops: [
        ['add', 'car'],
        ['add', 'cat'],
        ['add', 'do'],
      ],
    });
    const step = last(run);
    const model = readTrie(idOf(step, 'root'), step.heap)!;
    expect(model.nodes.size).toBe(7);
    expect(model.words).toEqual(['car', 'cat', 'do']);
    const leaves = [...model.nodes.values()].filter((n) => !n.children.length);
    expect(leaves.every((n) => n.terminal && n.terminalField === 'end')).toBe(true);
  });

  it('reports a branch the code looked for and did not find', () => {
    const run = runEntry(reference('f75-66'), 'runDictionary', {
      ops: [
        ['add', 'ab'],
        ['starts', 'az'],
      ],
    });
    const hits = run.steps
      .filter((s) => s.frames.at(-1)!.vars.some((v) => v.name === 'root'))
      .map((s) => {
        const model = readTrie(idOf(s, 'root'), s.heap);
        return model ? trieActivity(model, s.effects).missing : [];
      })
      .flat();
    // Adding "ab" first looks for a and b (missing, then created); the query then misses z.
    expect(hits.map((h) => h.char)).toEqual(['a', 'b', 'z']);
  });

  it('tags the node a variable points at', () => {
    const run = runEntry(reference('f75-66'), 'runDictionary', { ops: [['add', 'ab']] });
    const step = run.steps.find(
      (s) => s.kind === 'loop-next' && s.frames.at(-1)!.vars.some((v) => v.name === 'ch' && v.value.t === 'string' && v.value.v === 'b'),
    )!;
    const model = readTrie(idOf(step, 'root'), step.heap)!;
    const tagged = [...trieTags(model, step.frames)].find(([, t]) => t.some((x) => x.name === 'node'))!;
    expect(model.nodes.get(tagged[0])!.char).toBe('a');
  });

  it('refuses objects with fields a trie node would not have', () => {
    const { step } = live('const root = { children: { a: { children: {}, end: true } }, owner: "me" };\nconst dict = { a: 1, b: 2 };\n');
    expect(readTrie(idOf(step, 'root'), step.heap)).toBeNull();
    expect(readTrie(idOf(step, 'dict'), step.heap)).toBeNull();
  });
});

describe('call tree', () => {
  const subsets = [
    'function subsets(nums) {',
    '  const out = [];',
    '  const build = (i, picked) => {',
    '    if (i === nums.length) { out.push([...picked]); return; }',
    '    picked.push(nums[i]);',
    '    build(i + 1, picked);',
    '    picked.pop();',
    '    build(i + 1, picked);',
    '  };',
    '  build(0, []);',
    '  return out;',
    '}',
  ].join('\n');

  it('reads an include/exclude search as a tree of calls with the arguments each got', () => {
    const run = runEntry(subsets, 'subsets', { nums: [1, 2, 3] });
    expect(run.status).toBe('finished');
    const tree = readCallTree(run.steps);
    expect(tree.recursive).toEqual(['build']);
    expect(tree.branching).toBe(true);
    // The entry function is not recursive: the tree starts at the first build call.
    expect(tree.roots).toHaveLength(1);
    const root = tree.nodes.get(tree.roots[0])!;
    expect(root.args).toBe('0, []');
    expect(root.children.map((c) => tree.nodes.get(c)!.args)).toEqual(['1, [1]', '1, []']);
    expect(tree.nodes.size).toBe(15);
    const leaves = [...tree.nodes.values()].filter((n) => !n.children.length).map((n) => n.args);
    expect(leaves).toEqual(['3, [1, 2, 3]', '3, [1, 2]', '3, [1, 3]', '3, [1]', '3, [2, 3]', '3, [2]', '3, [3]', '3, []']);
    // Every call ends before its parent does, and starts after it.
    for (const n of tree.nodes.values()) {
      const p = n.parent === null ? null : tree.nodes.get(n.parent)!;
      if (p) expect(p.start < n.start && n.end <= p.end).toBe(true);
    }
  });

  it('marks repeated subproblems and keeps what each call returned', () => {
    const run = runEntry('function ways(n) { if (n <= 1) return 1; return ways(n - 1) + ways(n - 2); }', 'ways', { n: 4 });
    const tree = readCallTree(run.steps);
    const byArgs = (a: string) => [...tree.nodes.values()].filter((n) => n.args === a);
    expect(tree.nodes.size).toBe(9);
    expect(byArgs('2')).toHaveLength(2);
    expect(byArgs('2')[0].repeatOf).toBeNull();
    expect(byArgs('2')[1].repeatOf).toBe(byArgs('2')[0].id);
    expect(byArgs('4')[0].returned).toEqual({ t: 'number', v: 5 });
    expect(byArgs('3')[0].returned).toEqual({ t: 'number', v: 3 });
  });

  it('does not branch for a single chain of calls', () => {
    const run = runEntry('function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }', 'fact', { n: 4 });
    const tree = readCallTree(run.steps);
    expect(tree.nodes.size).toBe(4);
    expect(tree.branching).toBe(false);
  });

  it('hangs calls made through a callback from the call that made them', () => {
    const run = runEntry('function walk(d) { if (d === 2) return 0; [0, 1].forEach(() => walk(d + 1)); return 0; }', 'walk', { d: 0 });
    expect(run.status).toBe('finished');
    const tree = readCallTree(run.steps);
    expect(tree.recursive).toEqual(['walk']);
    expect(tree.nodes.size).toBe(7);
    const root = tree.nodes.get(tree.roots[0])!;
    expect(root.children.map((c) => tree.nodes.get(c)!.args)).toEqual(['1', '1']);
  });
});

describe('layout for trees with many children', () => {
  it('centers parents over their children and keeps leaves a unit apart', () => {
    const kids: Record<number, number[]> = { 1: [2, 3, 4], 2: [5], 4: [6, 7] };
    const { spots, width } = naryLayout([1], (id) => kids[id] ?? []);
    // Leaves: 5 (under 2), 3, 6 and 7.
    expect(width).toBe(4);
    expect(spots.get(1)!.x).toBe((spots.get(2)!.x + spots.get(4)!.x) / 2);
    expect(spots.get(4)!.x).toBe((spots.get(6)!.x + spots.get(7)!.x) / 2);
  });
});
