// The guides in Python, on real CPython (Pyodide, loaded from node_modules): every moment is
// found, in order, in the Python answer's run, and Python solutions a learner could write get
// the explanation for their own approach, exactly as the JavaScript ones do (observe.test.ts).
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { installTracer, runPython } from '../engine/python/runPython';
import { FOUNDATIONS } from '../practice/foundations';
import { PYTHON_ANSWERS } from '../practice/python';
import type { RunRequest } from '../trace/types';
import { GUIDES } from './guides';
import { findMoments, lineOf } from './moments';
import { observeCode, verdict } from './observe';

let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide();
  installTracer(py);
}, 120_000);

const run = (req: RunRequest) => Promise.resolve(runPython(py, req));

async function explain(id: string, code: string) {
  const e = FOUNDATIONS.find((x) => x.id === id)!;
  const o = (await observeCode(e, GUIDES[id], code, run))!;
  const v = verdict(GUIDES[id], o);
  return { o, v, id: v.kind === 'matched' ? v.variant.id : v.kind };
}

describe.each(Object.values(GUIDES).map((g) => [g.exerciseId, g] as const))('%s guide in Python', (id, g) => {
  const e = FOUNDATIONS.find((x) => x.id === id)!;
  const code = PYTHON_ANSWERS[id];

  it('finds every moment, in order, in the Python answer’s run', async () => {
    const c = e.content!;
    const x = c.examples[g.example.case.index];
    const r = await run({
      code,
      mode: 'function',
      entry: c.entry,
      inputs: c.params.map((p) => ({ name: p.name, value: x.inputs[p.name], kind: p.kind })),
      resultKind: c.resultKind,
    });
    expect(r.status, r.error?.message).toBe('finished');
    const at = findMoments(r.steps, code, 'python', g.example.moments);
    expect(
      at.every((i) => i !== null),
      JSON.stringify(at),
    ).toBe(true);
    for (let i = 1; i < at.length; i++) expect(at[i]!).toBeGreaterThan(at[i - 1]!);
  });

  it('links the example approach to lines the Python answer really has', () => {
    for (const p of Object.values(g.variants.find((v) => v.reference)!.sections)) {
      for (const l of p.code ?? []) expect(lineOf(code, l.python), l.python).toBeGreaterThan(0);
    }
  });

  it('the Python answer gets the example approach', async () => {
    expect((await explain(id, code)).id).toBe(g.variants.find((v) => v.reference)!.id);
  });
});

describe('Python solutions get the explanation for their own approach', () => {
  it('pair sum: nested loops, and an unfinished stub', async () => {
    const nested = await explain(
      'f75-04',
      `def balancedPair(weights, target):
    for j in range(1, len(weights)):
        for i in range(j):
            if weights[i] + weights[j] == target:
                return [i, j]
    return []
`,
    );
    expect(nested.id).toBe('nested-loops');
    expect(nested.o).toMatchObject({ time: 'quadratic', space: 'constant', lookupTable: false });
    const stub = await explain('f75-04', 'def balancedPair(weights, target):\n    return []\n');
    expect(stub.id).toBe('failing');
    expect(stub.o.failures[0].result.message).toMatch(/\[1, 2\]/);
  });

  it('reversal: recursion on the way back, and new nodes breaking the rule', async () => {
    const back = await explain(
      'f75-17',
      `def reverseChain(head):
    if head is None or head.next is None:
        return head
    rest = reverseChain(head.next)
    head.next.next = head
    head.next = None
    return rest
`,
    );
    expect(back.o.turns).toBe('back');
    expect(back.id).toBe('recursive-on-the-way-back');
    const copy = await explain(
      'f75-17',
      `def reverseChain(head):
    out = None
    node = head
    while node is not None:
        out = ListNode(node.val, out)
        node = node.next
    return out
`,
    );
    expect(copy.o.failures).toEqual([]);
    expect(copy.v).toMatchObject({ kind: 'unmet', requirements: [{ check: 'reuse-nodes' }] });
  });

  it('binary search: recursion, and a scan breaking the O(log n) requirement', async () => {
    const recursive = await explain(
      'f75-26',
      `def findReading(readings, target):
    def look(low, high):
        if low > high:
            return -1
        mid = (low + high) // 2
        if readings[mid] == target:
            return mid
        if readings[mid] < target:
            return look(mid + 1, high)
        return look(low, mid - 1)
    return look(0, len(readings) - 1)
`,
    );
    expect(recursive.o).toMatchObject({ time: 'log', space: 'log' });
    expect(recursive.id).toBe('recursive-range');
    const scan = await explain(
      'f75-26',
      `def findReading(readings, target):
    for i in range(len(readings)):
        if readings[i] == target:
            return i
    return -1
`,
    );
    expect(scan.o.time).toBe('linear');
    expect(scan.v).toMatchObject({ kind: 'unmet', requirements: [{ check: 'logarithmic-time' }] });
  });
});
