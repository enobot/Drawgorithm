// The Python answers on real CPython (Pyodide, loaded from node_modules): every answer, in
// every collection, passes every example and test of its exercise, draws what the exercise
// needs, and keeps the rules the outputs alone cannot show, as the JavaScript references do
// (foundations.test.ts, interview.test.ts).
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { installTracer, runPython } from '../engine/python/runPython';
import { deepEqual } from '../problems/compare';
import type { RunResult } from '../trace/types';
import { resolveBindings } from '../viz/bindings';
import { readCallTree } from '../viz/structures';
import { checkExercise } from './check';
import { ALL_EXERCISES, findExercise } from './collections';
import { answerIn, PYTHON_ANSWERS, PYTHON_EXPLANATIONS } from './python';
import type { Exercise, ExerciseCase } from './schema';

let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide();
  installTracer(py);
}, 120_000);

const available = ALL_EXERCISES.filter((e) => e.status === 'available');
const exercise = (id: string) => findExercise(id)!;

function runCase(e: Exercise, c: ExerciseCase, maxSteps?: number): RunResult {
  const content = e.content!;
  return runPython(py, {
    code: PYTHON_ANSWERS[e.id],
    mode: 'function',
    entry: content.entry,
    inputs: content.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: content.resultKind,
    limits: maxSteps ? { maxSteps } : undefined,
  });
}

/** Steps that ran the first source line containing `text`. */
function stepsAt(e: Exercise, run: RunResult, text: string): number {
  const line = PYTHON_ANSWERS[e.id].split('\n').findIndex((l) => l.includes(text)) + 1;
  expect(line, `"${text}" in ${e.id}.py`).toBeGreaterThan(0);
  return run.steps.filter((s) => s.loc?.line === line && s.kind !== 'enter').length;
}

describe('Python answers', () => {
  it('has a Python answer for every available exercise, and none for anything else', () => {
    expect(Object.keys(PYTHON_ANSWERS).sort()).toEqual(available.map((e) => e.id).sort());
  });

  it('rewords only explanations that exist, keeping their length', () => {
    for (const [id, text] of Object.entries(PYTHON_EXPLANATIONS)) {
      const e = exercise(id);
      expect(e?.content, id).toBeTruthy();
      expect(text.length, id).toBe(e.content!.solution.explanation.length);
    }
  });

  it('opens the Python answer for Python and the JavaScript one otherwise', () => {
    const e = exercise('f75-01');
    expect(answerIn(e, 'python')).toMatchObject({ code: PYTHON_ANSWERS['f75-01'], language: 'python' });
    expect(answerIn(e, 'javascript')).toMatchObject({ code: e.content!.solution.code, language: 'javascript' });
  });

  it('passes "Check all tests" in the Python engine', async () => {
    const e = exercise('f75-04');
    const run = (req: Parameters<typeof runPython>[1]) => Promise.resolve(runPython(py, req));
    const results = (await checkExercise(e, PYTHON_ANSWERS[e.id], run))!;
    expect(results.map((r) => r.status)).toEqual(results.map(() => 'passed'));
  });
});

describe.each(available.map((e) => [e.id, e] as const))('%s in Python', (_id, e) => {
  const content = e.content!;
  const cases = [...content.examples, ...content.tests];

  it('passes every example and test', () => {
    for (const c of cases) {
      const run = runCase(e, c);
      expect(run.status, `${c.note}: ${run.error?.message ?? ''}`).toBe('finished');
      expect(deepEqual(run.plainResult, c.output), `${c.note}: got ${JSON.stringify(run.plainResult)}`).toBe(true);
    }
  });

  it('draws what the exercise needs', () => {
    const run = runCase(e, content.examples[0]);
    const r = content.visualization.renderers;
    if (r.includes('call-tree')) expect(readCallTree(run.steps).branching).toBe(true);
    if (r.includes('bits')) expect(run.hints.usage?.bits.length).toBeGreaterThan(0);
    const roles = new Set(run.steps.flatMap((s) => [...resolveBindings(s.heap, s.frames, run.hints).roles.values()].map((b) => b.role)));
    if (r.includes('heap-tree')) expect(roles.has('heap')).toBe(true);
    // An edge list is drawn as a graph too ("graph from an edge list").
    if (r.includes('graph')) expect(roles.has('graph') || roles.has('edge-list')).toBe(true);
    if (r.includes('union-find')) expect(roles.has('union-find')).toBe(true);
    if (r.includes('trie')) expect(roles.has('trie')).toBe(true);
    if (r.includes('deque')) expect(run.hints.deques?.length).toBeGreaterThan(0);
  });
});

describe('Python answers keep the rules the outputs alone cannot show', () => {
  it('Turn the Chain: reuses the existing nodes', () => {
    const e = exercise('f75-17');
    const created = runCase(e, e.content!.examples[0])
      .steps.flatMap((s) => s.effects)
      .filter((x) => x.type === 'create');
    expect(created).toEqual([]);
  });

  it('Pick a Subset: makes the whole take/leave decision tree', () => {
    const e = exercise('f75-37');
    const tree = readCallTree(runCase(e, e.content!.examples[0]).steps);
    expect(tree.nodes.size).toBe(15);
    for (const n of tree.nodes.values()) expect([0, 2]).toContain(n.children.length);
  });

  it('Arrange the Tokens: makes one call per partial arrangement', () => {
    const e = exercise('f75-38');
    const tree = readCallTree(runCase(e, e.content!.examples[0]).steps);
    expect(tree.nodes.size).toBe(16);
    expect([...tree.nodes.values()].filter((n) => !n.children.length)).toHaveLength(6);
  });

  it('Nonattacking Towers: never calls for a threatened or cracked placement', () => {
    const e = exercise('f75-40');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const tree = readCallTree(runCase(e, x).steps);
      const cracked = new Set((x.inputs.blocked as number[][]).map(([r, c]) => `${r},${c}`));
      for (const n of tree.nodes.values()) {
        const cols = JSON.parse(n.args) as number[];
        cols.forEach((c, r) => {
          expect(cracked.has(`${r},${c}`)).toBe(false);
          cols.forEach((d, q) => q !== r && expect(c !== d && Math.abs(c - d) !== Math.abs(r - q)).toBe(true));
        });
      }
    }
  });

  it('Bit Counter: takes one round per raised alarm', () => {
    const e = exercise('f75-71');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const rounds = runCase(e, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'assign' && f.name === 'rest').length;
      expect(rounds, x.note).toBe(x.output);
    }
  });

  it('Lone Identifier: keeps no set, dict or list of its own', () => {
    const e = exercise('f75-72');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const ids = new Set(
        runCase(e, x)
          .steps.flatMap((s) => Object.values(s.heap))
          .map((h) => h.id),
      );
      expect(ids.size, x.note).toBe(1);
    }
  });

  it('Looping Conveyor: changes no next field and keeps no visited collection', () => {
    const e = exercise('f75-19');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, x);
      expect(run.steps.flatMap((s) => s.effects).filter((f) => f.type === 'prop-write')).toEqual([]);
      const others = run.steps.flatMap((s) => Object.values(s.heap)).filter((h) => h.kind !== 'object' || h.className !== 'ListNode');
      expect(others).toEqual([]);
    }
  });

  // Python steps record lines, not reads, so these count loop passes instead of slots read.
  it('Find the Reading: makes O(log n) passes', () => {
    const e = exercise('f75-26');
    const readings = Array.from({ length: 64 }, (_, i) => i * 3);
    const run = runCase(e, { inputs: { readings, target: -1 }, output: -1, note: 'missing' });
    expect(run.plainResult).toBe(-1);
    // 64 slots need at most 7 halvings.
    expect(stepsAt(e, run, 'mid = ')).toBeLessThanOrEqual(7);
  });

  it('Priority Desk: does O(log n) work per operation', () => {
    const e = exercise('f75-41');
    // n tickets, each more urgent than all before it (every add rises to the top), then n removals.
    for (const n of [15, 31]) {
      const ops = [...Array.from({ length: n }, (_, i) => ['add', 1000 - i]), ...Array.from({ length: n }, () => ['next'])];
      const run = runCase(e, { inputs: { ops }, output: null, note: 'growing' }, 50_000);
      expect(run.status, run.error?.message).toBe('finished');
      expect(run.plainResult).toEqual(Array.from({ length: n }, (_, i) => 1000 - n + 1 + i));
      // One pass per level: rising swaps up one path, sinking walks down one (plus the pass that stops).
      const passes = stepsAt(e, run, 'parent = (i - 1) // 2') + stepsAt(e, run, 'left = 2 * i + 1');
      expect(passes / ops.length, `n = ${n}`).toBeLessThanOrEqual(Math.log2(n) + 1);
    }
  }, 30_000);

  it('Window Peak Tracker: does O(n) work, not O(n·k)', () => {
    const e = exercise('f75-25');
    const readings = Array.from({ length: 60 }, (_, i) => (i * 37) % 23);
    const run = runCase(e, { inputs: { readings, k: 20 }, output: null, note: 'long' }, 20_000);
    expect(run.status, run.error?.message).toBe('finished');
    // Each index is popped at most once, and each reading ends one check: at most 2n checks.
    // Rescanning every stretch would take (n - k + 1) · k = 820.
    expect(stepsAt(e, run, 'while ')).toBeLessThanOrEqual(2 * readings.length);
  });

  it('Majority Vote: keeps no set, dict or list of its own', () => {
    const e = exercise('i100-004');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const ids = new Set(
        runCase(e, x)
          .steps.flatMap((s) => Object.values(s.heap))
          .map((h) => h.id),
      );
      expect(ids.size, x.note).toBe(1);
    }
  });

  it('Unbroken Badge Run: counts each run only from its start', () => {
    const e = exercise('i100-008');
    const badges = Array.from({ length: 60 }, (_, i) => (i * 7) % 61);
    const run = runCase(e, { inputs: { badges }, output: null, note: 'long' }, 20_000);
    expect(run.status, run.error?.message).toBe('finished');
    expect(stepsAt(e, run, 'length += 1')).toBeLessThanOrEqual(badges.length);
  });

  it('Undoable Minimum: does the same work per operation however tall the pile', () => {
    const e = exercise('i100-019');
    const stepsPerOp = (n: number) => {
      const ops = [...Array.from({ length: n }, (_, i) => ['push', 100 - i]), ...Array.from({ length: n }, () => ['min'])];
      const run = runCase(e, { inputs: { ops }, output: null, note: 'tall pile' }, 20_000);
      expect(run.status, run.error?.message).toBe('finished');
      return run.steps.length / ops.length;
    };
    expect(stepsPerOp(40) / stepsPerOp(10)).toBeLessThan(1.15);
  });

  it('Chain Gap Removal and Fold the Chain: reuse the nodes (only a placeholder is created)', () => {
    for (const [id, allowed] of [
      ['i100-028', 1],
      ['i100-029', 0],
    ] as const) {
      const e = exercise(id);
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const created = runCase(e, x)
          .steps.flatMap((s) => s.effects)
          .filter((f) => f.type === 'create' && f.className === 'ListNode');
        expect(created.length, `${id} ${x.note}`).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it('Shadow Copy: the copy is made of new cards', () => {
    const e = exercise('i100-030');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, x);
      const cards = Object.values(run.steps[run.steps.length - 1].heap).filter((h) => h.kind === 'object' && h.className === 'Card');
      expect(cards.length, x.note).toBe(2 * (x.inputs.entries as unknown[]).length);
    }
  });

  it('Repeated Ticket: keeps nothing of its own and never writes to tickets', () => {
    const e = exercise('i100-032');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, x);
      expect(new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id)).size, x.note).toBe(1);
      expect(
        run.steps.flatMap((s) => s.effects).filter((f) => f.type === 'index-write'),
        x.note,
      ).toEqual([]);
    }
  });

  it('Flip in Groups and Mirror the Tree: create no nodes (Flip only its placeholder)', () => {
    for (const [id, cls, allowed] of [
      ['i100-033', 'ListNode', 1],
      ['i100-034', 'TreeNode', 0],
    ] as const) {
      const e = exercise(id);
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const created = runCase(e, x)
          .steps.flatMap((s) => s.effects)
          .filter((f) => f.type === 'create' && f.className === cls);
        expect(created.length, `${id} ${x.note}`).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it('Tree to Text and Back: the rebuilt tree is made of new nodes, one per node', () => {
    const e = exercise('i100-047');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const created = runCase(e, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'create' && f.className === 'TreeNode');
      expect(created.length, x.note).toBe((x.inputs.root as unknown[]).filter((v) => v !== null).length);
    }
  });

  it('Fast Power: makes O(log n) calls', () => {
    const e = exercise('i100-053');
    const run = runCase(e, { inputs: { x: 1, n: 1000 }, output: 1, note: 'large power' });
    expect(run.status, run.error?.message).toBe('finished');
    expect(run.steps.filter((s) => s.kind === 'enter').length).toBeLessThanOrEqual(Math.ceil(Math.log2(1000)) + 2);
  });

  it('Map Copy: the copy is made of new towns', () => {
    const e = exercise('i100-060');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, x);
      const towns = Object.values(run.steps[run.steps.length - 1].heap).filter((h) => h.kind === 'object' && h.className === 'Vertex');
      expect(towns.length, x.note).toBe(2 * (x.inputs.graph as unknown[]).length);
    }
  });

  it('Steepest Climb: solves each cell once (at most five calls per cell)', () => {
    const e = exercise('i100-079');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, x);
      const calls = run.steps.filter((s) => s.kind === 'enter' && s.frames[s.frames.length - 1].name === 'longest').length;
      expect(calls, x.note).toBeLessThanOrEqual(5 * (x.inputs.grid as number[][]).flat().length);
    }
  });

  it('Missing Badge and Happy Digits: keep no set, dict or list of their own', () => {
    for (const [id, inputObjects] of [
      ['i100-095', 1],
      ['i100-096', 0],
    ] as const) {
      const e = exercise(id);
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const run = runCase(e, x);
        expect(new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id)).size, `${id} ${x.note}`).toBe(inputObjects);
      }
    }
  });

  it('Zero Spread: creates no list (it marks the grid itself)', () => {
    const e = exercise('i100-099');
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const created = runCase(e, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'create');
      expect(created, x.note).toEqual([]);
    }
  });
});
