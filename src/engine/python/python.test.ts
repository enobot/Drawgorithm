// The Python adapter on real CPython (Pyodide, loaded from node_modules): runs, errors and
// limits come back in the shared trace format, and the board's drawing rules read them.
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import type { InputSpec, RunResult } from '../../trace/types';
import { resolveBindings } from '../../viz/bindings';
import { readCallTree } from '../../viz/structures';
import { installTracer, livePython, runPython } from './runPython';

let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide();
  installTracer(py);
}, 120_000);

const auto = (inputs: Record<string, unknown>): InputSpec[] =>
  Object.entries(inputs).map(([name, value]) => ({ name, value, kind: 'auto' }));
const run = (code: string, entry: string, inputs: InputSpec[], resultKind?: 'list' | 'tree'): RunResult =>
  runPython(py, { code, mode: 'function', entry, inputs, resultKind });
const roles = (r: RunResult) =>
  new Set(r.steps.flatMap((s) => [...resolveBindings(s.heap, s.frames, r.hints).roles.values()].map((b) => b.role)));

describe('Python runs', () => {
  const twoSum = [
    'def twoSum(nums, target):',
    '    seen = {}',
    '    for i, x in enumerate(nums):',
    '        need = target - x',
    '        if need in seen:',
    '            return [seen[need], i]',
    '        seen[x] = i',
    '    return []',
    '',
  ].join('\n');

  it('records one step per line with the call, its variables and what changed', () => {
    const r = run(twoSum, 'twoSum', auto({ nums: [2, 7, 11, 15], target: 9 }));
    expect(r.status, r.error?.message).toBe('finished');
    expect(r.plainResult).toEqual([0, 1]);
    expect(r.entry).toBe('twoSum');
    const kinds = r.steps.map((s) => s.kind);
    expect(kinds[0]).toBe('start');
    expect(kinds).toContain('enter');
    expect(kinds.at(-1)).toBe('done');
    const enter = r.steps.find((s) => s.kind === 'enter')!;
    expect(enter.frames.at(-1)!.label).toBe('twoSum([2, 7, 11, 15], 9)');
    expect(enter.frames.at(-1)!.vars.map((v) => [v.name, v.declKind])).toEqual([
      ['nums', 'param'],
      ['target', 'param'],
    ]);
    const insert = r.steps.find((s) => s.effects.some((e) => e.type === 'map-insert'))!;
    expect(insert.loc?.line).toBe(7);
    expect(insert.explanation).toBe('Line 7: seen[2] = 0.');
    // Steps line up with the source, and every reference points into that step's snapshot.
    for (const s of r.steps)
      for (const f of s.frames)
        for (const v of f.vars) if (v.value.t === 'ref') expect(s.heap[v.value.id], `step ${s.index} ${v.name}`).toBeDefined();
  });

  it('reads the same trees, lists and cycles as JavaScript, and draws recursion as a call tree', () => {
    const height = 'def height(root):\n    if root is None:\n        return 0\n    return 1 + max(height(root.left), height(root.right))\n';
    const r = run(height, 'height', [{ name: 'root', value: [5, 3, 8, null, 4], kind: 'tree' }]);
    expect(r.plainResult).toBe(3);
    const tree = readCallTree(r.steps);
    expect(tree.branching).toBe(true);
    expect(tree.nodes.get(tree.roots[0])!.args).toBe('node 5');
    const loop =
      'def hasCycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:\n            return True\n    return False\n';
    const cyc = (pos: number) =>
      run(loop, 'hasCycle', [
        { name: 'head', value: [3, 2, 0, -4], kind: 'list' },
        { name: 'pos', value: pos, kind: 'pos' },
      ]).plainResult;
    expect(cyc(1)).toBe(true);
    expect(cyc(-1)).toBe(false);
    const rev =
      'def rev(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n';
    expect(run(rev, 'rev', [{ name: 'head', value: [1, 2, 3], kind: 'list' }], 'list').plainResult).toEqual([3, 2, 1]);
    expect(run(rev, 'rev', [{ name: 'head', value: [], kind: 'list' }], 'list').plainResult).toEqual([]);
  });

  it('accepts LeetCode habits: class Solution and snake_case names', () => {
    const cls = 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n';
    expect(run(cls, 'twoSum', auto({ nums: [1, 2], target: 3 })).plainResult).toEqual([0, 1]);
    expect(run('def two_sum(nums, target):\n    return [1, 0]\n', 'twoSum', auto({ nums: [1, 2], target: 3 })).plainResult).toEqual([1, 0]);
  });

  it('captures print output with the step it belongs to', () => {
    const r = run('def f(n):\n    for i in range(n):\n        print("i is", i)\n    return n\n', 'f', auto({ n: 2 }));
    expect(r.output.map((o) => o.text)).toEqual(['i is 0', 'i is 1']);
    expect(r.output[1].step).toBeGreaterThan(r.output[0].step);
  });

  it('carries infinity and NaN through JSON', () => {
    expect(run('def f():\n    return [float("inf"), -float("inf")]\n', 'f', []).plainResult).toEqual([Infinity, -Infinity]);
  });
});

describe('Python errors and limits', () => {
  it('reports a runtime error with its line and the state where it was raised', () => {
    const r = run('def f(x):\n    y = 10\n    return y // x\n', 'f', auto({ x: 0 }));
    expect(r.status).toBe('error');
    expect(r.error).toMatchObject({ kind: 'runtime', name: 'ZeroDivisionError', loc: { line: 3 } });
    const last = r.steps.at(-1)!;
    expect(last.kind).toBe('error');
    expect(last.frames.at(-1)!.vars.find((v) => v.name === 'y')?.value).toEqual({ t: 'number', v: 10 });
  });

  it('reports syntax errors before running anything', () => {
    const r = run('def f(n)\n    return n\n', 'f', []);
    expect(r.error).toMatchObject({ kind: 'syntax', loc: { line: 1 } });
    expect(r.steps).toEqual([]);
  });

  it('stops endless loops and runaway recursion with the same limits as JavaScript', () => {
    const loop = run('def f(n):\n    while True:\n        n += 1\n', 'f', auto({ n: 0 }));
    expect(loop.error).toMatchObject({ kind: 'limit' });
    expect(loop.error!.message).toMatch(/^Stopped after 2,000 steps/);
    const deep = run('def f(n):\n    return f(n + 1)\n', 'f', auto({ n: 0 }));
    expect(deep.error!.message).toMatch(/^More than 200 nested calls/);
  });

  it('asks for the function Run needs when it is missing', () => {
    expect(run('def g(a):\n    return a\n', 'solve', auto({ a: 1 })).error).toMatchObject({
      kind: 'setup',
      message: 'Define a function named solve(a). Run calls it with the inputs.',
    });
  });

  it('checks syntax for Run as I type without running anything', () => {
    expect(livePython(py, 'def f(n):\n    return n\n')).toMatchObject({ status: 'ok', pending: null });
    expect(livePython(py, 'def f(n):\n    return n +\n')).toMatchObject({
      status: 'pending',
      pending: { line: 2, text: '    return n +' },
    });
    // Nothing runs during the check: print would add output, an infinite loop would hang.
    expect(livePython(py, 'while True:\n    print("never")\n')).toMatchObject({ status: 'ok' });
  });

  it('refuses imports that reach the page', () => {
    const r = run('import js\ndef f():\n    return 1\n', 'f', []);
    expect(r.error).toMatchObject({ kind: 'runtime', name: 'ImportError' });
  });
});

describe('Python code gets the same drawings', () => {
  it('reads queues, heaps, graphs and union-find from what the code does', () => {
    const bfs = [
      'from collections import deque',
      'def reach(graph, start):',
      '    seen = {start}',
      '    q = deque([start])',
      '    while q:',
      '        u = q.popleft()',
      '        for v in graph[u]:',
      '            if v not in seen:',
      '                seen.add(v)',
      '                q.append(v)',
      '    return len(seen)',
      '',
    ].join('\n');
    const r = run(bfs, 'reach', auto({ graph: [[1], [0, 2], [1]], start: 0 }));
    expect(r.plainResult).toBe(3);
    expect(r.hints.queues).toContain('q');
    expect(r.hints.usage).toMatchObject({ adjacency: ['graph'], visited: ['seen'] });
    expect(roles(r).has('graph')).toBe(true);

    const pq =
      'import heapq\ndef smallest(nums, k):\n    pq = []\n    for x in nums:\n        heapq.heappush(pq, x)\n    return [heapq.heappop(pq) for _ in range(k)]\n';
    const h = run(pq, 'smallest', auto({ nums: [5, 1, 4], k: 2 }));
    expect(h.plainResult).toEqual([1, 4]);
    expect(h.hints.usage?.heaps).toEqual(['pq']);
    expect(roles(h).has('heap')).toBe(true);

    const uf =
      'def groups(n, pairs):\n    up = list(range(n))\n    def find(x):\n        while up[x] != x:\n            x = up[x]\n        return x\n    for a, b in pairs:\n        up[find(a)] = find(b)\n    return len({find(i) for i in range(n)})\n';
    const u = run(uf, 'groups', auto({ n: 4, pairs: [[0, 1]] }));
    expect(u.plainResult).toBe(3);
    expect(u.hints.usage?.parents).toContain('up');
    expect(roles(u).has('union-find')).toBe(true);
  });

  it('marks index variables and numbers combined bit by bit', () => {
    const bs =
      'def find(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n';
    const r = run(bs, 'find', auto({ nums: [1, 3, 5, 7], target: 7 }));
    expect(r.plainResult).toBe(3);
    expect(r.hints.pointers.nums.map((p) => p.name).sort()).toEqual(['hi', 'lo', 'mid']);
    const x = run('def lone(ids):\n    acc = 0\n    for i in ids:\n        acc ^= i\n    return acc\n', 'lone', auto({ ids: [4, 1, 4] }));
    expect(x.plainResult).toBe(1);
    expect([...x.hints.usage!.bits].sort()).toEqual(['acc', 'i']);
  });
});
