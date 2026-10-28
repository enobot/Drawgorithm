// Lessons: every demo case runs in the interpreter and returns the stated output, every output
// agrees with an independent computation, every drawing a lesson names is supported, and the
// drawings its "watch" list describes really appear.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../engine/run';
import { problemById } from '../problems/catalog';
import { deepEqual } from '../problems/compare';
import { FOUNDATIONS, LESSONS, SUPPORTED_RENDERERS } from '../practice/foundations';
import { resolveBindings } from '../viz/bindings';
import { readCallTree } from '../viz/structures';
import { LESSON_CONTENT, type Lesson, type LessonCase } from './lessons';
import { lessonProblemId } from './problems';

interface Node {
  v: number;
  l: Node | null;
  r: Node | null;
}

/** Level-order list (null = missing child) to nodes, the way the app reads tree inputs. */
function buildTree(list: (number | null)[]): Node | null {
  if (!list.length || list[0] === null) return null;
  const root: Node = { v: list[0], l: null, r: null };
  const parents = [root];
  let i = 1;
  while (parents.length && i < list.length) {
    const p = parents.shift()!;
    for (const side of ['l', 'r'] as const) {
      if (i < list.length && list[i] !== null) {
        p[side] = { v: list[i] as number, l: null, r: null };
        parents.push(p[side]!);
      }
      i++;
    }
  }
  return root;
}

/* Independent answers, computed differently from each demo. */
// Each check receives that lesson's JSON inputs, whose shapes differ per lesson.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INDEPENDENT: Record<string, (x: Record<string, any>) => unknown> = {
  'arrays-basics': ({ nums }) => nums.indexOf(Math.max(...nums)),
  'loops-and-indexes': ({ readings }) => readings.filter((v: number, i: number) => i > 0 && v > readings[i - 1]).length,
  // A regular expression for runs of one character.
  'strings-and-chars': ({ text }) => (text.match(/(.)\1*/g) ?? []).map((run: string) => run[0] + run.length).join(''),
  // The first item whose value appeared earlier.
  'hash-sets': ({ items }) => items.find((x: unknown, i: number) => items.indexOf(x) < i) ?? null,
  // Final counts; among the most common, the word whose last needed occurrence comes first.
  'hash-maps': ({ words }) => {
    const total = (w: string) => words.filter((x: string) => x === w).length;
    const top = Math.max(...words.map(total));
    const reachedAt = (w: string) => {
      let seen = 0;
      return words.findIndex((x: string) => x === w && ++seen === top);
    };
    return [...new Set<string>(words)].filter((w) => total(w) === top).sort((a, b) => reachedAt(a) - reachedAt(b))[0];
  },
  matrices: ({ grid }) => grid[0].map((_: number, c: number) => grid.reduce((s: number, row: number[]) => s + row[c], 0)),
  'linked-list-basics': ({ head }) => [head.length, head.reduce((s: number, v: number) => s + v, 0)],
  stacks: ({ sentence }) => sentence.split(' ').reverse().join(' '),
  // A job with p pages finishes in round p; within a round, jobs go in line order.
  queues: ({ pages }) => pages.map((_: number, i: number) => i).sort((a: number, b: number) => pages[a] - pages[b] || a - b),
  'recursion-basics': ({ n }) => [...String(n)].reduce((s, d) => s + Number(d), 0),
  sorting: ({ nums }) => [...nums].sort((a: number, b: number) => a - b),
  bits: ({ n }) => n.toString(2),
  // Every pair, smallest first index first.
  'two-pointers': ({ sorted, target }) => {
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) if (sorted[i] + sorted[j] === target) return [i, j];
    return [];
  },
  // Every stretch.
  'sliding-window': ({ costs, budget }) => {
    let best = 0;
    for (let i = 0; i < costs.length; i++) {
      let sum = 0;
      for (let j = i; j < costs.length; j++) {
        sum += costs[j];
        if (sum <= budget) best = Math.max(best, j - i + 1);
      }
    }
    return best;
  },
  'prefix-sums': ({ nums, queries }) =>
    queries.map(([from, to]: number[]) => nums.slice(from, to + 1).reduce((s: number, v: number) => s + v, 0)),
  'binary-search-idea': ({ sorted, target }) => {
    const i = sorted.findIndex((v: number) => v >= target);
    return i === -1 ? sorted.length : i;
  },
  'fast-slow-pointers': ({ head, pos }) => head.length > 0 && pos >= 0,
  // Leaves counted with an explicit stack.
  'trees-basics': ({ node }) => {
    const stack = [buildTree(node)];
    let leaves = 0;
    while (stack.length) {
      const n = stack.pop();
      if (!n) continue;
      if (!n.l && !n.r) leaves++;
      stack.push(n.l, n.r);
    }
    return leaves;
  },
  // The input is a search tree, so its in-order values are its values sorted.
  'tree-traversal-dfs': ({ root }) => root.filter((v: number | null) => v !== null).sort((a: number, b: number) => a - b),
  // Depth first, right child first: the first node met at each depth is the one seen from the right.
  'tree-traversal-bfs': ({ root }) => {
    const out: number[] = [];
    const walk = (n: Node | null, depth: number) => {
      if (!n) return;
      if (out.length === depth) out.push(n.v);
      walk(n.r, depth + 1);
      walk(n.l, depth + 1);
    };
    walk(buildTree(root), 0);
    return out;
  },
  heaps: ({ nums, k }) => [...nums].sort((a: number, b: number) => a - b).slice(0, k),
  'monotonic-stack': ({ values }) => values.map((v: number, i: number) => values.slice(i + 1).find((w: number) => w > v) ?? -1),
  // Division instead of repeated subtraction.
  greedy: ({ amount, coins }) => {
    const out: number[] = [];
    let rest = amount;
    for (const c of coins) {
      const times = Math.floor(rest / c);
      for (let t = 0; t < times; t++) out.push(c);
      rest -= times * c;
    }
    return out;
  },
  // Merge any two overlapping spans until none overlap, then sort.
  intervals: ({ spans }) => {
    const list: number[][] = spans.map((s: number[]) => [...s]);
    for (let merged = true; merged;) {
      merged = false;
      for (let a = 0; a < list.length && !merged; a++)
        for (let b = a + 1; b < list.length && !merged; b++)
          if (list[a][0] <= list[b][1] && list[b][0] <= list[a][1]) {
            list[a] = [Math.min(list[a][0], list[b][0]), Math.max(list[a][1], list[b][1])];
            list.splice(b, 1);
            merged = true;
          }
    }
    return list.sort((x, y) => x[0] - y[0]);
  },
  // Grow the reached set over the edges until nothing changes.
  'graphs-basics': ({ links, start }) => {
    const reached = new Set([start]);
    for (let changed = true; changed;) {
      changed = false;
      for (const [a, b] of links)
        for (const [x, y] of [
          [a, b],
          [b, a],
        ])
          if (reached.has(x) && !reached.has(y)) {
            reached.add(y);
            changed = true;
          }
    }
    return reached.size;
  },
  // Repeatedly take the smallest vertex whose rules are all met.
  'topological-sort': ({ n, before }) => {
    const order: number[] = [];
    const placed = new Set<number>();
    while (order.length < n) {
      const v = [...Array(n).keys()].find((x) => !placed.has(x) && before.every(([a, b]: number[]) => b !== x || placed.has(a)));
      if (v === undefined) return [];
      placed.add(v);
      order.push(v);
    }
    return order;
  },
  // Bellman-Ford: relax every road n - 1 times.
  'shortest-paths': ({ n, roads, from }) => {
    const dist = Array.from({ length: n }, (_, v) => (v === from ? 0 : Infinity));
    for (let k = 0; k < n - 1; k++)
      for (const [a, b, w] of roads) {
        dist[b] = Math.min(dist[b], dist[a] + w);
        dist[a] = Math.min(dist[a], dist[b] + w);
      }
    return dist.map((d) => (d === Infinity ? -1 : d));
  },
  // Connected components by depth-first search.
  'union-find': ({ n, pairs }) => {
    const seen = new Set<number>();
    let groups = 0;
    for (let s = 0; s < n; s++) {
      if (seen.has(s)) continue;
      groups++;
      const stack = [s];
      while (stack.length) {
        const v = stack.pop()!;
        if (seen.has(v)) continue;
        seen.add(v);
        for (const [a, b] of pairs) {
          if (a === v) stack.push(b);
          if (b === v) stack.push(a);
        }
      }
    }
    return groups;
  },
  tries: ({ words, prefixes }) => prefixes.map((p: string) => words.filter((w: string) => w.startsWith(p)).length),
  // Every subset by bitmask, in dictionary order of the positions taken (the search's order).
  backtracking: ({ nums, target }) => {
    const picks: number[][] = [];
    for (let mask = 1; mask < 1 << nums.length; mask++) {
      const idx = nums.map((_: number, i: number) => i).filter((i: number) => mask & (1 << i));
      if (idx.reduce((s: number, i: number) => s + nums[i], 0) === target) picks.push(idx);
    }
    picks.sort((a, b) => {
      for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k];
      return a.length - b.length;
    });
    return picks.map((idx) => idx.map((i) => nums[i]));
  },
  // Bottom up: each strip length from the two before it.
  memoization: ({ n }) => {
    let [a, b] = [1, 1];
    for (let k = 2; k <= n; k++) [a, b] = [b, a + b];
    return b;
  },
  // Recursion over how many of each coin, without a table.
  'dp-basics': ({ amount, coins }) => {
    const count = (i: number, rest: number): number => {
      if (rest === 0) return 1;
      if (i === coins.length) return 0;
      let total = 0;
      for (let used = 0; used * coins[i] <= rest; used++) total += count(i + 1, rest - used * coins[i]);
      return total;
    };
    return count(0, amount);
  },
  // Walk every right/down path.
  'dp-2d': ({ grid }) => {
    const rows = grid.length;
    const cols = grid[0].length;
    const walk = (r: number, c: number): number => {
      if (r >= rows || c >= cols || grid[r][c] === 1) return 0;
      if (r === rows - 1 && c === cols - 1) return 1;
      return walk(r + 1, c) + walk(r, c + 1);
    };
    return walk(0, 0);
  },
  'divide-and-conquer': ({ nums }) => [...nums].sort((a: number, b: number) => a - b),
};

function runCase(l: Lesson, c: LessonCase) {
  return runProgram({
    code: l.demo.code,
    mode: 'function',
    entry: l.demo.entry,
    inputs: l.demo.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: l.demo.resultKind,
  });
}

const exerciseIds = new Set(FOUNDATIONS.filter((e) => e.status === 'available').map((e) => e.id));

describe('lesson catalog', () => {
  it('has one lesson for every lesson name, and no lesson without a name', () => {
    expect(LESSON_CONTENT.map((l) => l.id).sort()).toEqual(Object.keys(LESSONS).sort());
  });

  it('gives every lesson complete content and real practice links', () => {
    for (const l of LESSON_CONTENT) {
      expect(l.idea.length, l.id).toBeGreaterThan(0);
      expect(l.demoExplanation, l.id).toBeTruthy();
      expect(l.watch.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.usedFor.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.tryThis.length, l.id).toBeGreaterThan(0);
      expect(l.demo.cases.length, l.id).toBeGreaterThanOrEqual(2);
      for (const c of l.demo.cases) expect(Object.keys(c.inputs).sort(), l.id).toEqual(l.demo.params.map((p) => p.name).sort());
      expect(l.practice.length, l.id).toBeGreaterThan(0);
      for (const id of l.practice) expect(exerciseIds.has(id), `${l.id} → ${id}`).toBe(true);
    }
  });

  it('only names drawings the board supports', () => {
    for (const l of LESSON_CONTENT) for (const r of l.demo.renderers) expect(SUPPORTED_RENDERERS, `${l.id} needs ${r}`).toContain(r);
  });

  it('has an independent check for every lesson', () => {
    expect(Object.keys(INDEPENDENT).sort()).toEqual(LESSON_CONTENT.map((l) => l.id).sort());
  });

  it('opens every lesson as a problem with its demo as the starter code', () => {
    for (const l of LESSON_CONTENT) {
      const p = problemById(lessonProblemId(l.id))!;
      expect(p.starter, l.id).toBe(l.demo.code);
      expect(p.cases, l.id).toHaveLength(l.demo.cases.length);
    }
  });
});

describe.each(LESSON_CONTENT.map((l) => [l.id, l] as const))('lesson %s', (_id, l) => {
  it('outputs agree with an independent computation', () => {
    for (const c of l.demo.cases) expect(deepEqual(INDEPENDENT[l.id](c.inputs), c.output), `${c.label}`).toBe(true);
  });

  it('the demo returns the stated output on every case, well inside the run limits', () => {
    for (const c of l.demo.cases) {
      const run = runCase(l, c);
      expect(run.status, `${c.label}: ${run.error?.message}`).toBe('finished');
      expect(deepEqual(run.plainResult, c.output), `${c.label}: got ${JSON.stringify(run.plainResult)}`).toBe(true);
      // Room under the 2,000-step limit for the learner's own edits.
      expect(run.steps.length, c.label).toBeLessThan(1500);
    }
  });

  it('draws what the lesson says to watch', () => {
    const run = runCase(l, l.demo.cases[0]);
    const r = l.demo.renderers;
    if (r.includes('call-tree')) expect(readCallTree(run.steps).branching).toBe(true);
    if (r.includes('bits')) expect(run.hints.usage?.bits.length).toBeGreaterThan(0);
    const roles = new Set(run.steps.flatMap((s) => [...resolveBindings(s.heap, s.frames, run.hints).roles.values()].map((b) => b.role)));
    if (r.includes('heap-tree')) expect(roles.has('heap')).toBe(true);
    if (r.includes('graph')) expect(roles.has('graph')).toBe(true);
    if (r.includes('union-find')) expect(roles.has('union-find')).toBe(true);
    if (r.includes('trie')) expect(roles.has('trie')).toBe(true);
  });
});
