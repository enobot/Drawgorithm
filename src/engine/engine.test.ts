import { describe, expect, it } from 'vitest';
import { problemById, type ProblemDef } from '../problems/catalog';
import { compareRun } from '../problems/compare';
import type { Effect, RunResult, Step } from '../trace/types';
import { liveBuild, runProgram } from './run';

function problem(id: string): ProblemDef {
  const p = problemById(id);
  if (!p) throw new Error(`missing problem ${id}`);
  return p;
}

function runProblem(id: string, inputs?: Record<string, unknown>, code?: string): RunResult {
  const p = problem(id);
  const values = inputs ?? p.cases[0].inputs;
  return runProgram({
    code: code ?? p.starter,
    mode: p.mode,
    entry: p.entry,
    resultKind: p.resultKind,
    inputs: p.params.map((param) => ({ name: param.name, value: values[param.name], kind: param.kind })),
  });
}

function effects(run: RunResult): Effect[] {
  return run.steps.flatMap((s) => s.effects);
}

function explanations(run: RunResult): string[] {
  return run.steps.map((s) => s.explanation);
}

describe('trace generation: Variables & Addition', () => {
  const run = runProblem('variables');

  it('records start, one step per line, and done', () => {
    expect(run.status).toBe('finished');
    expect(run.steps.map((s) => s.kind)).toEqual(['start', 'declare', 'declare', 'declare', 'done']);
    expect(run.steps.slice(1, 4).map((s) => s.loc?.line)).toEqual([1, 2, 3]);
  });

  it('shows the addition with substituted values and both source blocks read', () => {
    const sumStep = run.steps[3];
    const declare = sumStep.effects.find((e) => e.type === 'declare');
    expect(declare).toMatchObject({ name: 'sum', compute: { expression: 'a + b', substituted: '2 + 5', result: '7' } });
    const reads = sumStep.effects.filter((e) => e.type === 'read').map((e) => (e as { name: string }).name);
    expect(reads).toEqual(['a', 'b']);
    expect(sumStep.explanation).toContain('a + b = 2 + 5 = 7');
    expect(sumStep.explanation).toContain('a and b keep their original values (2 and 5)');
  });

  it('keeps a and b unchanged and matches the expected output', () => {
    expect(run.plainGlobals).toEqual({ a: 2, b: 5, sum: 7 });
    expect(compareRun(problem('variables').cases[0].expected, run)?.match).toBe(true);
  });

  it('follows edits to the code instead of a canned animation', () => {
    const edited = runProblem('variables', {}, 'let a = 2;\nlet b = 5;\nlet sum = a * b;\n');
    expect(edited.plainGlobals?.sum).toBe(10);
    expect(edited.steps[3].explanation).toContain('2 * 5 = 10');
    expect(compareRun(problem('variables').cases[0].expected, edited)?.match).toBe(false);
  });

  it('snapshots are independent: earlier steps do not change later', () => {
    const second = run.steps[2];
    expect(second.frames[0].vars.map((v) => v.name)).toEqual(['a', 'b']);
  });
});

describe('Two Sum', () => {
  const p = problem('two-sum');

  it('solves every built-in case', () => {
    for (const c of p.cases) {
      const run = runProblem('two-sum', c.inputs);
      expect(run.status).toBe('finished');
      expect(compareRun(c.expected, run)?.match).toBe(true);
    }
  });

  it('handles duplicates: looks up 3 before storing it, then finds it', () => {
    const run = runProblem('two-sum', { nums: [3, 3], target: 6 });
    expect(run.plainResult).toEqual([0, 1]);
    const mapOps = effects(run).filter((e) => e.type === 'map-lookup' || e.type === 'map-insert');
    expect(mapOps[0]).toMatchObject({ type: 'map-lookup', method: 'has', found: false, key: { t: 'number', v: 3 } });
    expect(mapOps[1]).toMatchObject({ type: 'map-insert', key: { t: 'number', v: 3 }, value: { t: 'number', v: 0 } });
    expect(mapOps[2]).toMatchObject({ type: 'map-lookup', method: 'has', found: true });
    expect(mapOps[3]).toMatchObject({ type: 'map-lookup', method: 'get', found: true, value: { t: 'number', v: 0 } });
    // The second 3 is never stored, so index 0 is not overwritten.
    expect(mapOps.filter((e) => e.type === 'map-insert')).toHaveLength(1);
  });

  it('shows the complement calculation and the current element', () => {
    const run = runProblem('two-sum');
    const step = run.steps.find((s) => s.explanation.startsWith('Create complement'))!;
    expect(step.explanation).toContain('target - nums[i] = 9 - 2 = 7');
    expect(step.effects).toContainEqual(expect.objectContaining({ type: 'index-read', index: 0, value: { t: 'number', v: 2 } }));
  });

  it('does not capitalize a variable name that starts a sentence', () => {
    const run = runProblem('two-sum');
    const ret = run.steps.find((s) => s.kind === 'return')!;
    expect(ret.explanation).toContain('seen.get(2) → 0.');
    expect(ret.explanation).not.toContain('Seen.get');
  });

  it('draws a buggy version faithfully instead of hiding the mistake', () => {
    const buggy = p.starter.replace(
      '    const complement = target - nums[i];',
      '    seen.set(nums[i], i);\n    const complement = target - nums[i];',
    );
    const run = runProblem('two-sum', { nums: [3, 3], target: 6 }, buggy);
    expect(run.plainResult).toEqual([0, 0]);
    const cmp = compareRun({ kind: 'return', value: [0, 1] }, run)!;
    expect(cmp.match).toBe(false);
    expect(cmp.message).toContain('[0, 0]');
  });
});

describe('Binary Search', () => {
  const nums = [-1, 0, 3, 5, 9, 12];
  const cases: [string, number[], number, number][] = [
    ['middle', nums, 9, 4],
    ['first element', nums, -1, 0],
    ['last element', nums, 12, 5],
    ['below the range', nums, -5, -1],
    ['above the range', nums, 20, -1],
    ['between two items', nums, 4, -1],
    ['single item found', [5], 5, 0],
    ['single item missing', [5], 7, -1],
    ['empty array', [], 3, -1],
  ];
  for (const [name, arr, target, expected] of cases) {
    it(`returns ${expected} for ${name}`, () => {
      const run = runProblem('binary-search', { nums: arr, target });
      expect(run.status).toBe('finished');
      expect(run.plainResult).toBe(expected);
    });
  }

  it('explains each comparison with the actual values', () => {
    const run = runProblem('binary-search', { nums, target: 9 });
    const checks = run.steps.filter((s) => s.kind === 'condition').map((s) => s.explanation);
    expect(checks[0]).toContain('nums[mid] === target: 3 === 9 → false');
    expect(checks[1]).toContain('nums[mid] < target: 3 < 9 → true');
    const update = run.steps.find((s) => s.explanation.startsWith('left ='))!;
    expect(update.explanation).toContain('left = mid + 1 = 2 + 1 = 3 (it was 0)');
  });

  it('ends the loop with an explanation when the target is missing', () => {
    const run = runProblem('binary-search', { nums, target: 2 });
    const last = run.steps.filter((s) => s.kind === 'loop-check').pop()!;
    expect(last.outcome).toBe(false);
    expect(last.explanation).toMatch(/left <= right: \d+ <= \d+ → false, so the loop ends/);
  });

  it('marks left, right and mid as indexes into nums', () => {
    const run = runProblem('binary-search');
    const names = run.hints.pointers.nums.map((p) => p.name).sort();
    expect(names).toEqual(['left', 'mid', 'right']);
  });
});

describe('execution limits and errors', () => {
  it('stops an infinite loop with a limit error and keeps the partial trace', () => {
    const run = runProgram({ code: 'let i = 0;\nwhile (i < 10) {\n}\n', mode: 'script', inputs: [], limits: { maxSteps: 100 } });
    expect(run.status).toBe('error');
    expect(run.error?.kind).toBe('limit');
    expect(run.error?.message).toContain('Stopped after 100 steps');
    expect(run.steps.length).toBe(101);
    expect(run.steps[run.steps.length - 1].kind).toBe('error');
  });

  it('stops runaway recursion with a clear message', () => {
    const run = runProgram({
      code: 'function f(n) {\n  return f(n + 1);\n}\nf(0);\n',
      mode: 'script',
      inputs: [],
      limits: { maxDepth: 30 },
    });
    expect(run.error).toMatchObject({ kind: 'limit', name: 'RangeError' });
    expect(run.error?.message).toContain('base case');
  });

  it('limits work done inside built-ins such as map', () => {
    const run = runProgram({
      code: 'const a = new Array(5000).fill(1).map(x => x * 2);\n',
      mode: 'script',
      inputs: [],
      limits: { maxOps: 1000 },
    });
    expect(run.error?.kind).toBe('limit');
    expect(run.error?.message).toContain('operations');
  });

  it('caps the total size of the trace so big inputs cannot exhaust memory', () => {
    const code = 'const g = [];\nfor (let r = 0; r < 100; r++) g.push(new Array(100).fill(0));\nlet n = 0;\nwhile (n < 500) n++;\n';
    const run = runProgram({ code, mode: 'script', inputs: [], limits: { maxTraceValues: 200_000 } });
    expect(run.error?.kind).toBe('limit');
    expect(run.error?.message).toContain('recorded drawing got too large');
    // It stops while the grid is still being built, long before the 2,000-step limit.
    expect(run.steps.length).toBeLessThan(500);
    expect(run.steps[run.steps.length - 2].loc?.line).toBe(2);
  });

  it('caps console output', () => {
    const run = runProgram({
      code: 'for (let i = 0; i < 2000; i++) console.log(i);\n',
      mode: 'script',
      inputs: [],
      limits: { maxSteps: 100_000 },
    });
    expect(run.error).toMatchObject({ kind: 'limit', loc: expect.objectContaining({ line: 1 }) });
    expect(run.error?.message).toContain('1,000 lines of console output');
    expect(run.output).toHaveLength(1000);
  });

  it('reports unsupported syntax with the feature and line', () => {
    const run = runProgram({ code: 'let x = 1;\nasync function f() {}\n', mode: 'script', inputs: [] });
    expect(run.error).toMatchObject({ kind: 'unsupported' });
    expect(run.error?.message).toContain('Line 2: async functions are not supported');
    expect(runProgram({ code: 'const r = /a+/;', mode: 'script', inputs: [] }).error?.message).toContain('regular expressions');
  });

  it('blocks the network, storage and page globals', () => {
    for (const name of ['fetch', 'localStorage', 'document', 'globalThis']) {
      const run = runProgram({ code: `${name};`, mode: 'script', inputs: [] });
      expect(run.error?.kind).toBe('unsupported');
      expect(run.error?.message).toContain('not available');
    }
  });

  it('reports syntax errors with a location', () => {
    const run = runProgram({ code: 'let a = 1;\nlet b = ;\n', mode: 'script', inputs: [] });
    expect(run.error).toMatchObject({ kind: 'syntax' });
    expect(run.error?.loc?.line).toBe(2);
  });

  it('reports reading a child of null like JavaScript, with the state at that moment', () => {
    const run = runProgram({ code: 'const root = new TreeNode(1);\nroot.left.val = 3;\n', mode: 'script', inputs: [] });
    expect(run.error).toMatchObject({ kind: 'runtime', name: 'TypeError' });
    expect(run.error?.message).toContain("Cannot set properties of null (setting 'val') (root.left is null)");
    expect(run.error?.loc?.line).toBe(2);
    const last = run.steps[run.steps.length - 1];
    expect(last.frames[0].vars.map((v) => v.name)).toEqual(['root']);
  });

  it('lets user code catch ordinary errors', () => {
    const run = runProgram({ code: 'let msg = "";\ntry {\n  null.x;\n} catch (e) {\n  msg = e.message;\n}\n', mode: 'script', inputs: [] });
    expect(run.status).toBe('finished');
    expect(String(run.plainGlobals?.msg)).toContain('Cannot read properties of null');
  });

  it('asks for the function Run needs when it is missing', () => {
    const run = runProblem('two-sum', undefined, 'function add(a, b) { return a + b; }\n'.replace('add', 'notTwoSum'));
    expect(run.error).toMatchObject({ kind: 'setup' });
    expect(run.error?.message).toContain('twoSum(nums, target)');
  });
});

describe('trees: recursion and traversal', () => {
  it('runs the tree example and reports height 3', () => {
    const run = runProblem('tree-build');
    expect(run.status).toBe('finished');
    expect(run.plainGlobals?.h).toBe(3);
  });

  it('explains visiting children, null children and returned subtree heights', () => {
    const text = explanations(runProblem('tree-build'));
    expect(text).toContain('Call height(node 5) and visit node 5.');
    expect(text).toContain('Explore the left child of node 5 (node 3): call height(node 3).');
    expect(text).toContain('Node 3 has no left child: call height(null).');
    expect(text.some((t) => t.includes('The left subtree of node 5 returned 2.'))).toBe(true);
    expect(text.some((t) => t.startsWith('height(node 4) returns 1 + Math.max(left, right) = 1 + Math.max(0, 0) = 1'))).toBe(true);
  });

  it('keeps the recursive call stack in each step', () => {
    const run = runProblem('tree-build');
    const deepest = Math.max(...run.steps.map((s) => s.frames.length));
    expect(deepest).toBe(5); // Program + height(5) + height(3) + height(4) + height(null)
  });

  it('runs breadth-first search with a queue', () => {
    const run = runProblem('level-order');
    expect(run.plainResult).toEqual([[5], [3, 8], [4]]);
    const shifts = effects(run).filter((e) => e.type === 'array-remove' && e.end === 'front');
    expect(shifts).toHaveLength(4);
    expect(run.hints.queues).toContain('queue');
    expect(runProblem('level-order', { root: [] }).plainResult).toEqual([]);
  });

  it('reverses a linked list and describes rewiring', () => {
    const run = runProblem('reverse-list');
    expect(run.plainResult).toEqual([4, 3, 2, 1]);
    expect(explanations(run).some((t) => t.includes("Point node 1's next to null"))).toBe(true);
    expect(runProblem('reverse-list', { head: [] }).plainResult).toEqual([]);
  });

  it('builds a cycle from a pos input and does not pass pos to the function', () => {
    // Walks at most 10 nodes and reports the values and how many parameters it got.
    const code =
      'function walk(...args) {\n  const seen = [];\n  for (let cur = args[0], k = 0; cur && k < 10; cur = cur.next, k++) seen.push(cur.val);\n  return [args.length, seen];\n}\n';
    const inputs = (pos: number) => [
      { name: 'head', value: [3, 2, 0, -4], kind: 'list' as const },
      { name: 'pos', value: pos, kind: 'pos' as const },
    ];
    const cyclic = runProgram({ code, mode: 'function', entry: 'walk', inputs: inputs(1) });
    expect(cyclic.status, cyclic.error?.message).toBe('finished');
    expect(cyclic.plainResult).toEqual([1, [3, 2, 0, -4, 2, 0, -4, 2, 0, -4]]);
    expect(cyclic.notes).toEqual([]);
    const selfLoop = runProgram({ code, mode: 'function', entry: 'walk', inputs: inputs(3) });
    expect(selfLoop.plainResult).toEqual([1, [3, 2, 0, -4, -4, -4, -4, -4, -4, -4]]);
    const none = runProgram({ code, mode: 'function', entry: 'walk', inputs: inputs(-1) });
    expect(none.plainResult).toEqual([1, [3, 2, 0, -4]]);
  });

  it('reports a pos input that cannot link the list instead of guessing', () => {
    const code = 'function walk(head) { return head; }';
    const outside = runProgram({
      code,
      mode: 'function',
      entry: 'walk',
      inputs: [
        { name: 'head', value: [1, 2], kind: 'list' },
        { name: 'pos', value: 2, kind: 'pos' },
      ],
    });
    expect(outside.status).toBe('error');
    expect(outside.error?.message).toContain('must be -1 (no cycle) or a node position from 0 to 1');
    const noList = runProgram({
      code,
      mode: 'function',
      entry: 'walk',
      inputs: [
        { name: 'head', value: [1, 2], kind: 'auto' },
        { name: 'pos', value: 0, kind: 'pos' },
      ],
    });
    expect(noList.status).toBe('error');
    expect(noList.error?.message).toContain('no input is drawn as a linked list');
  });

  it('labels duplicate node values so they can be told apart', () => {
    const run = runProgram({ code: 'const a = new TreeNode(3);\nconst b = new TreeNode(3);\na.left = b;\n', mode: 'script', inputs: [] });
    const connect = run.steps.find((s) => s.loc?.line === 3)!;
    expect(connect.explanation).toMatch(/Connect node 3 \(#\d+\) as the left child of node 3 \(#\d+\)/);
  });
});

describe('Live Build', () => {
  const starter = problem('tree-build').starter;

  it('draws top-level tree construction and stops before calling a function', () => {
    const live = liveBuild(starter);
    expect(live.status).toBe('needs-run');
    expect(live.stoppedAt?.line).toBe(15);
    const nodes = Object.values(live.step!.heap).filter((h) => h.kind === 'object' && h.className === 'TreeNode');
    expect(nodes).toHaveLength(4);
    const line3 = live.lines.find((l) => l.line === 3)!;
    expect(line3.edges).toEqual([{ objId: expect.any(Number), key: 'left' }]);
    expect(line3.explanation).toBe('Connect node 3 as the left child of node 5.');
  });

  // Invalid code never produces a new drawing; the UI keeps the previous valid state (see state/live.test.ts).
  it('reports an unfinished statement and draws nothing new', () => {
    const code = 'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.right = new TreeNode(\n';
    const live = liveBuild(code);
    expect(live.status).toBe('pending');
    expect(live.pending).toMatchObject({ line: 3, text: 'root.right = new TreeNode(' });
    expect(live.step).toBeNull();
  });

  it('points at the line where an unclosed block starts', () => {
    const code = 'const root = new TreeNode(5);\nfunction f(node) {\n  if (node) {\n';
    const live = liveBuild(code);
    expect(live.pending?.line).toBe(2);
    expect(live.step).toBeNull();
  });

  it('draws nothing new for unsupported syntax, and names it', () => {
    const live = liveBuild('const root = new TreeNode(5);\nconst re = /a+/;\n');
    expect(live.status).toBe('error');
    expect(live.error).toMatchObject({ kind: 'unsupported', loc: expect.objectContaining({ line: 2 }) });
    expect(live.error?.message).toContain('Regular expressions');
    expect(live.step).toBeNull();
  });

  it('records where each node was created and attached', () => {
    const live = liveBuild(starter);
    const ids = live.lines.find((l) => l.line === 3)!.objIds;
    const created = ids.map((id) => live.objects[id]).find((o) => o?.createdLine === 3);
    expect(created?.createdSource).toBe('root.left = new TreeNode(3);');
    expect(created?.attached.some((a) => a.line === 3)).toBe(true);
  });

  it('draws cycles instead of assuming a tree', () => {
    const live = liveBuild('const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.left.right = root;\n');
    expect(live.status).toBe('ok');
    const heap = live.step!.heap;
    const rootVar = live.step!.frames[0].vars.find((v) => v.name === 'root')!;
    const rootId = rootVar.value.t === 'ref' ? rootVar.value.id : -1;
    const child = Object.values(heap).find(
      (h) => h.kind === 'object' && h.entries.some(([k, v]) => k === 'val' && v.t === 'number' && v.v === 3),
    );
    expect(child && child.kind === 'object' && child.entries.find(([k]) => k === 'right')?.[1]).toEqual({ t: 'ref', id: rootId });
  });

  it('shows shared references and replaced (detached) children', () => {
    const live = liveBuild(
      'const root = new TreeNode(5);\nconst shared = new TreeNode(7);\nroot.left = shared;\nroot.right = shared;\nroot.left = new TreeNode(9);\n',
    );
    const replaced = live.lines.find((l) => l.line === 5)!.replaced;
    expect(replaced?.key).toBe('left');
    expect(live.lines.find((l) => l.line === 5)!.explanation).toContain('Node 7 is no longer connected to node 5');
    expect(live.allNodeIds).toHaveLength(3);
  });

  it('reports a null-child mistake on its line and draws nothing new', () => {
    const live = liveBuild('const root = new TreeNode(5);\nroot.left.left = new TreeNode(1);\n');
    expect(live.status).toBe('error');
    expect(live.error?.loc?.line).toBe(2);
    expect(live.error?.message).toContain('root.left is null');
    expect(live.step).toBeNull();
  });

  it('never runs function bodies, because their values depend on inputs', () => {
    const live = liveBuild(problem('two-sum').starter);
    expect(live.status).toBe('ok');
    expect(live.hints.functions).toEqual([{ name: 'twoSum', params: ['nums', 'target'], line: 1 }]);
    expect(live.step!.frames[0].vars).toEqual([]);
  });
});

function stepAt(run: RunResult, line: number): Step | undefined {
  return run.steps.find((s) => s.loc?.line === line);
}

describe('trace snapshots', () => {
  it('records heap state per step so stepping backward shows older values', () => {
    const run = runProgram({ code: 'const arr = [1, 2];\narr.push(3);\narr[0] = 9;\n', mode: 'script', inputs: [] });
    const lens = run.steps.map((s) => {
      const v = s.frames[0].vars.find((x) => x.name === 'arr');
      if (!v || v.value.t !== 'ref') return null;
      const h = s.heap[v.value.id];
      return h.kind === 'array' ? h.items.map((i) => (i.t === 'number' ? i.v : null)) : null;
    });
    expect(lens).toEqual([null, [1, 2], [1, 2, 3], [9, 2, 3], [9, 2, 3]]);
    expect(stepAt(run, 3)?.explanation).toBe('Set arr[0] = 9 (it was 1).');
  });
});
