// "Explain my code": the explanation a learner gets must match what their code actually did.
// Each sample below is a solution a learner could write. It runs through the same analysis the
// app uses (every example and test, then three larger inputs) in the interpreter, and must get
// the explanation for its own approach: never the lookup-table wording for nested loops, never
// an explanation for failing code, and never a claim the runs don't show.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../engine/run';
import { FOUNDATIONS } from '../practice/foundations';
import type { RunRequest } from '../trace/types';
import { GUIDES } from './guides';
import { growthOf, observeCode, verdict, type Observation } from './observe';

const run = (req: RunRequest) => Promise.resolve(runProgram(req));

async function explain(id: string, code: string): Promise<{ o: Observation; v: ReturnType<typeof verdict> }> {
  const e = FOUNDATIONS.find((x) => x.id === id)!;
  const o = (await observeCode(e, GUIDES[id], code, run))!;
  return { o, v: verdict(GUIDES[id], o) };
}

const variantOf = (v: ReturnType<typeof verdict>) => (v.kind === 'matched' ? v.variant.id : v.kind);

describe('growth from three sizes', () => {
  it('classifies constant, logarithmic, linear and quadratic growth, and refuses anything in between', () => {
    expect(growthOf([2, 2, 2], 2)).toBe('constant');
    expect(growthOf([30, 40, 50], 4)).toBe('log');
    expect(growthOf([10, 20, 40], 2)).toBe('linear');
    expect(growthOf([60, 210, 810], 2)).toBe('quadratic');
    expect(growthOf([10, 25, 70], 2)).toBeNull();
    expect(growthOf([10, 5, 40], 2)).toBeNull();
  });
});

describe('Balanced Shipment (pair sum)', () => {
  const id = 'f75-04';
  const e = FOUNDATIONS.find((x) => x.id === id)!;

  it('the reference answer gets the example approach', async () => {
    const { o, v } = await explain(id, e.content!.solution.code);
    expect(variantOf(v)).toBe('one-pass-table');
    expect(o).toMatchObject({ time: 'linear', space: 'linear', lookupTable: true, onePass: true });
  });

  it('a one-pass lookup in a plain object gets the same explanation', async () => {
    const { v } = await explain(
      id,
      `function balancedPair(weights, target) {
  const seen = {};
  for (let j = 0; j < weights.length; j++) {
    const need = target - weights[j];
    if (seen[need] !== undefined) return [seen[need], j];
    if (seen[weights[j]] === undefined) seen[weights[j]] = j;
  }
  return [];
}
`,
    );
    expect(variantOf(v)).toBe('one-pass-table');
  });

  it('nested loops get the nested-loop explanation, never the lookup-table one', async () => {
    const { o, v } = await explain(
      id,
      `function balancedPair(weights, target) {
  for (let j = 1; j < weights.length; j++) {
    for (let i = 0; i < j; i++) {
      if (weights[i] + weights[j] === target) return [i, j];
    }
  }
  return [];
}
`,
    );
    expect(variantOf(v)).toBe('nested-loops');
    expect(o).toMatchObject({ time: 'quadratic', space: 'constant', lookupTable: false });
  });

  it('a lookup table filled before the scan passes, but matches no authored wording: only observations', async () => {
    const { o, v } = await explain(
      id,
      `function balancedPair(weights, target) {
  const first = new Map();
  for (let i = 0; i < weights.length; i++) if (!first.has(weights[i])) first.set(weights[i], i);
  for (let j = 0; j < weights.length; j++) {
    const i = first.get(target - weights[j]);
    if (i !== undefined && i < j) return [i, j];
  }
  return [];
}
`,
    );
    expect(o.failures).toEqual([]);
    expect(o.onePass).toBe(false);
    expect(variantOf(v)).toBe('unmatched');
  });

  it('unfinished code is reported by what it returned, with no explanation', async () => {
    const { o, v } = await explain(id, e.content!.starter.javascript);
    expect(variantOf(v)).toBe('failing');
    const first = o.failures[0];
    expect(first.result.label).toBe('Example 1');
    expect(first.case.inputs).toEqual({ weights: [4, 9, 2, 7], target: 11 });
    expect(first.result.message).toMatch(/\[1, 2\]/);
  });

  it('code that pairs a package with itself is reported on the case that shows it', async () => {
    const { o, v } = await explain(
      id,
      `function balancedPair(weights, target) {
  const firstIndex = new Map();
  for (let j = 0; j < weights.length; j++) {
    if (!firstIndex.has(weights[j])) firstIndex.set(weights[j], j);
    const partner = target - weights[j];
    if (firstIndex.has(partner)) return [firstIndex.get(partner), j];
  }
  return [];
}
`,
    );
    expect(variantOf(v)).toBe('failing');
    expect(o.failures.map((f) => f.result.note)).toContain('One package cannot pair with itself');
  });

  it('right answers from code that changes weights break a stated rule', async () => {
    const { v } = await explain(
      id,
      `function balancedPair(weights, target) {
  let found = [];
  for (let j = 1; j < weights.length && found.length === 0; j++) {
    for (let i = 0; i < j; i++) {
      if (weights[i] + weights[j] === target) { found = [i, j]; break; }
    }
  }
  weights.reverse();
  return found;
}
`,
    );
    expect(v).toMatchObject({ kind: 'unmet', requirements: [{ check: 'input-unchanged' }] });
  });
});

describe('Turn the Chain (linked-list reversal)', () => {
  const id = 'f75-17';
  const e = FOUNDATIONS.find((x) => x.id === id)!;

  it('the reference answer gets the example approach', async () => {
    const { o, v } = await explain(id, e.content!.solution.code);
    expect(variantOf(v)).toBe('three-references');
    expect(o).toMatchObject({ time: 'linear', space: 'constant', depth: 1, createdNodes: 0, nodeArray: false });
  });

  it('recursion that turns links on the way back gets that explanation', async () => {
    const { o, v } = await explain(
      id,
      `function reverseChain(head) {
  if (head === null || head.next === null) return head;
  const rest = reverseChain(head.next);
  head.next.next = head;
  head.next = null;
  return rest;
}
`,
    );
    expect(o.turns).toBe('back');
    expect(variantOf(v)).toBe('recursive-on-the-way-back');
  });

  it('recursion that turns links on the way down gets that explanation', async () => {
    const { o, v } = await explain(
      id,
      `function reverseChain(head) {
  function go(curr, prev) {
    if (curr === null) return prev;
    const rest = curr.next;
    curr.next = prev;
    return go(rest, curr);
  }
  return go(head, null);
}
`,
    );
    expect(o.turns).toBe('down');
    expect(variantOf(v)).toBe('recursive-on-the-way-down');
  });

  it('collecting the nodes and relinking them gets that explanation', async () => {
    const { o, v } = await explain(
      id,
      `function reverseChain(head) {
  const nodes = [];
  for (let node = head; node !== null; node = node.next) nodes.push(node);
  for (let i = nodes.length - 1; i > 0; i--) nodes[i].next = nodes[i - 1];
  if (nodes.length > 0) nodes[0].next = null;
  return nodes.length > 0 ? nodes[nodes.length - 1] : null;
}
`,
    );
    expect(o).toMatchObject({ nodeArray: true, space: 'linear' });
    expect(variantOf(v)).toBe('collect-and-relink');
  });

  it('building new nodes returns the right values but breaks the rule to reuse them', async () => {
    const { o, v } = await explain(
      id,
      `function reverseChain(head) {
  let out = null;
  for (let node = head; node !== null; node = node.next) out = new ListNode(node.val, out);
  return out;
}
`,
    );
    expect(o.failures).toEqual([]);
    expect(o.createdNodes).toBeGreaterThan(0);
    expect(v).toMatchObject({ kind: 'unmet', requirements: [{ check: 'reuse-nodes' }] });
  });

  it('the unfinished starter is reported by what it returned', async () => {
    const { o, v } = await explain(id, e.content!.starter.javascript);
    expect(variantOf(v)).toBe('failing');
    expect(o.failures[0].result.message).toMatch(/\[4, 1, 7\]/);
  });
});

describe('Find the Reading (binary search)', () => {
  const id = 'f75-26';
  const e = FOUNDATIONS.find((x) => x.id === id)!;

  it('the reference answer gets the example approach', async () => {
    const { o, v } = await explain(id, e.content!.solution.code);
    expect(variantOf(v)).toBe('loop-window');
    expect(o).toMatchObject({ time: 'log', space: 'constant', depth: 1 });
  });

  it('a recursive binary search gets the recursive explanation', async () => {
    const { o, v } = await explain(
      id,
      `function findReading(readings, target) {
  function look(low, high) {
    if (low > high) return -1;
    const mid = Math.floor((low + high) / 2);
    if (readings[mid] === target) return mid;
    return readings[mid] < target ? look(mid + 1, high) : look(low, mid - 1);
  }
  return look(0, readings.length - 1);
}
`,
    );
    expect(o).toMatchObject({ time: 'log', space: 'log' });
    expect(variantOf(v)).toBe('recursive-range');
  });

  it('a scan passes every test but breaks the O(log n) requirement, and is told so', async () => {
    const { o, v } = await explain(
      id,
      `function findReading(readings, target) {
  for (let i = 0; i < readings.length; i++) if (readings[i] === target) return i;
  return -1;
}
`,
    );
    expect(o.failures).toEqual([]);
    expect(o.time).toBe('linear');
    expect(v).toMatchObject({ kind: 'unmet', requirements: [{ check: 'logarithmic-time' }] });
  });

  it('a search with a boundary bug is reported on the cases it gets wrong', async () => {
    const { o, v } = await explain(id, e.content!.solution.code.replace('while (low <= high)', 'while (low < high)'));
    expect(variantOf(v)).toBe('failing');
    expect(o.failures.map((f) => f.result.note)).toContain('One reading, found');
  });

  it('the line run most often is reported, so the learner can find it', async () => {
    const { o } = await explain(id, e.content!.solution.code);
    expect(o.hottest).toMatchObject({ n: 256 });
    expect(o.hottest!.hits).toBeGreaterThan(0);
  });
});

describe('an analysis that is interrupted reports nothing', () => {
  it('returns null once aborted', async () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-26')!;
    const controller = new AbortController();
    const slow = (req: RunRequest) => {
      controller.abort();
      return Promise.resolve(runProgram(req));
    };
    expect(await observeCode(e, GUIDES['f75-26'], e.content!.solution.code, slow, controller.signal)).toBeNull();
  });
});
