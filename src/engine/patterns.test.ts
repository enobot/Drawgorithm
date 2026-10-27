// Representative LeetCode-style patterns, run through the real interpreter.
// These check execution accuracy and the facts the generic renderers rely on.
// They do not mean every problem in a family is supported (see docs/COVERAGE.md).
import { describe, expect, it } from 'vitest';
import type { InputSpec, RunResult } from '../trace/types';
import { buildListDiagram, buildTreeDiagram, variableRefs } from '../viz/analysis';
import { readWriteText } from '../viz/Board';
import { focusOf } from '../viz/focus';
import { runProgram } from './run';

function call(code: string, entry: string, inputs: Record<string, unknown>, kinds: Record<string, InputSpec['kind']> = {}): RunResult {
  return runProgram({
    code,
    mode: 'function',
    entry,
    inputs: Object.entries(inputs).map(([name, value]) => ({ name, value, kind: kinds[name] ?? 'auto' })),
  });
}

function finished(run: RunResult): RunResult {
  if (run.status !== 'finished') throw new Error(`run failed: ${run.error?.name}: ${run.error?.message} (line ${run.error?.loc?.line})`);
  return run;
}

describe('stacks', () => {
  const validParentheses = `function isValid(s) {
  const pairs = new Map([[')', '('], [']', '['], ['}', '{']]);
  const stack = [];
  for (const ch of s) {
    if (pairs.has(ch)) {
      if (stack.pop() !== pairs.get(ch)) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}`;

  it('Valid Parentheses: matches brackets with a stack', () => {
    for (const [s, expected] of [
      ['()[]{}', true],
      ['(]', false],
      ['([)]', false],
      ['{[]}', true],
      ['(', false],
      ['', true],
    ] as const) {
      expect(finished(call(validParentheses, 'isValid', { s })).plainResult).toBe(expected);
    }
    const run = call(validParentheses, 'isValid', { s: '{[]}' });
    expect(run.hints.stacks).toContain('stack');
  });

  const asteroids = `function asteroidCollision(asteroids) {
  const stack = [];
  for (const a of asteroids) {
    let alive = true;
    while (alive && a < 0 && stack.length > 0 && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -a) {
        stack.pop();
      } else if (top === -a) {
        stack.pop();
        alive = false;
      } else {
        alive = false;
      }
    }
    if (alive) stack.push(a);
  }
  return stack;
}`;

  it('Asteroid Collision: survivors stack, including equal sizes and no collisions', () => {
    const cases: [number[], number[]][] = [
      [
        [5, 10, -5],
        [5, 10],
      ],
      [[8, -8], []],
      [[10, 2, -5], [10]],
      [
        [-2, -1, 1, 2],
        [-2, -1, 1, 2],
      ],
    ];
    for (const [input, expected] of cases)
      expect(finished(call(asteroids, 'asteroidCollision', { asteroids: input })).plainResult).toEqual(expected);
    const run = call(asteroids, 'asteroidCollision', { asteroids: [5, 10, -5] });
    expect(run.steps.some((s) => s.explanation.includes('Remove -5') || s.explanation.includes('top < -a'))).toBe(true);
  });
});

describe('sliding window and two pointers', () => {
  const longest = `function lengthOfLongestSubstring(s) {
  const seen = new Set();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    while (seen.has(s[right])) {
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`;

  it('Longest substring without repeating characters', () => {
    for (const [s, expected] of [
      ['abcabcbb', 3],
      ['bbbbb', 1],
      ['pwwkew', 3],
      ['', 0],
    ] as const) {
      expect(finished(call(longest, 'lengthOfLongestSubstring', { s })).plainResult).toBe(expected);
    }
    const run = call(longest, 'lengthOfLongestSubstring', { s: 'abca' });
    expect(run.hints.indexed).toContain('s');
    expect(run.hints.pointers.s.map((p) => p.name).sort()).toEqual(['left', 'right']);
  });
});

describe('dynamic programming', () => {
  it('House Robber (1D table)', () => {
    const code = `function rob(nums) {
  const dp = new Array(nums.length + 1).fill(0);
  dp[1] = nums[0];
  for (let i = 2; i <= nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);
  }
  return dp[nums.length];
}`;
    expect(finished(call(code, 'rob', { nums: [1, 2, 3, 1] })).plainResult).toBe(4);
    expect(finished(call(code, 'rob', { nums: [2, 7, 9, 3, 1] })).plainResult).toBe(12);
    const run = call(code, 'rob', { nums: [2, 7, 9, 3, 1] });
    const writes = run.steps.flatMap((s) => s.effects).filter((e) => e.type === 'index-write');
    expect(writes.length).toBe(5);
  });

  it('House Robber: each table write is captioned with the cells that step read', () => {
    const code = `function rob(nums) {
  const dp = new Array(nums.length + 1).fill(0);
  dp[1] = nums[0];
  for (let i = 2; i <= nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);
  }
  return dp[nums.length];
}`;
    const run = finished(call(code, 'rob', { nums: [2, 7, 9] }));
    const step = run.steps.find((s) => s.effects.some((e) => e.type === 'index-write' && e.index === 3))!;
    const frame = step.frames[step.frames.length - 1];
    const dpRef = frame.vars.find((v) => v.name === 'dp')!.value as { id: number };
    const dp = step.heap[dpRef.id] as Extract<(typeof step.heap)[number], { kind: 'array' }>;
    expect(readWriteText('dp', dp, focusOf(step), step.heap)).toBe('This step read dp[2] and dp[1] and wrote dp[3].');
  });

  it('LCS: table captions name 2D cells, not the row lookups', () => {
    const code = `function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}`;
    const run = finished(call(code, 'lcs', { a: 'ab', b: 'ab' }));
    const step = run.steps.find((s) => s.loc?.line === 5 && s.effects.some((e) => e.type === 'index-write'))!;
    const frame = step.frames[step.frames.length - 1];
    const dpRef = frame.vars.find((v) => v.name === 'dp')!.value as { id: number };
    const dp = step.heap[dpRef.id] as Extract<(typeof step.heap)[number], { kind: 'array' }>;
    expect(readWriteText('dp', dp, focusOf(step), step.heap)).toBe('This step read dp[0][0] and wrote dp[1][1].');
  });

  it('Coin Change (unreachable amounts stay Infinity, answer -1)', () => {
    const code = `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`;
    expect(finished(call(code, 'coinChange', { coins: [1, 2, 5], amount: 11 })).plainResult).toBe(3);
    expect(finished(call(code, 'coinChange', { coins: [2], amount: 3 })).plainResult).toBe(-1);
    expect(finished(call(code, 'coinChange', { coins: [1], amount: 0 })).plainResult).toBe(0);
  });

  it('Longest Common Subsequence (2D table, row and column indexes)', () => {
    const code = `function longestCommonSubsequence(text1, text2) {
  const dp = Array.from({ length: text1.length + 1 }, () => new Array(text2.length + 1).fill(0));
  for (let i = 1; i <= text1.length; i++) {
    for (let j = 1; j <= text2.length; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[text1.length][text2.length];
}`;
    expect(finished(call(code, 'longestCommonSubsequence', { text1: 'abcde', text2: 'ace' })).plainResult).toBe(3);
    expect(finished(call(code, 'longestCommonSubsequence', { text1: 'abc', text2: 'def' })).plainResult).toBe(0);
    const run = call(code, 'longestCommonSubsequence', { text1: 'abc', text2: 'abc' });
    const axes = Object.fromEntries(run.hints.pointers.dp.map((p) => [p.name, p.axis]));
    expect(axes).toMatchObject({ i: 0, j: 1 });
  });

  it('top-down memoization records cache hits as map lookups', () => {
    const code = `function climbStairs(n, memo = new Map()) {
  if (n <= 2) return n;
  if (memo.has(n)) return memo.get(n);
  const ways = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
  memo.set(n, ways);
  return ways;
}`;
    const run = finished(call(code, 'climbStairs', { n: 6 }));
    expect(run.plainResult).toBe(13);
    const hits = run.steps.flatMap((s) => s.effects).filter((e) => e.type === 'map-lookup' && e.method === 'has' && e.found);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('grids and graphs', () => {
  it('Number of Islands (grid DFS mutating the input in place)', () => {
    const code = `function numIslands(grid) {
  let count = 0;
  function sink(r, c) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  }
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        count++;
        sink(r, c);
      }
    }
  }
  return count;
}`;
    const grid = [
      ['1', '1', '0', '0'],
      ['1', '0', '0', '1'],
      ['0', '0', '1', '1'],
    ];
    const run = finished(call(code, 'numIslands', { grid }));
    expect(run.plainResult).toBe(2);
    expect(run.hints.pointers.grid.map((p) => `${p.name}:${p.axis}`).sort()).toEqual(['c:1', 'r:0']);
  });

  it('Course Schedule (Kahn topological sort with an adjacency list and a queue)', () => {
    const code = `function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);
  let taken = 0;
  while (queue.length > 0) {
    const cur = queue.shift();
    taken++;
    for (const next of graph[cur]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return taken === numCourses;
}`;
    expect(finished(call(code, 'canFinish', { numCourses: 2, prerequisites: [[1, 0]] })).plainResult).toBe(true);
    expect(
      finished(
        call(code, 'canFinish', {
          numCourses: 2,
          prerequisites: [
            [1, 0],
            [0, 1],
          ],
        }),
      ).plainResult,
    ).toBe(false);
    expect(call(code, 'canFinish', { numCourses: 2, prerequisites: [[1, 0]] }).hints.queues).toContain('queue');
  });
});

describe('backtracking', () => {
  it('Subsets: choose, recurse, undo', () => {
    const code = `function subsets(nums) {
  const result = [];
  const path = [];
  function backtrack(start) {
    result.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  }
  backtrack(0);
  return result;
}`;
    const run = finished(call(code, 'subsets', { nums: [1, 2, 3] }));
    expect(run.plainResult).toEqual([[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]);
    const pops = run.steps.flatMap((s) => s.effects).filter((e) => e.type === 'array-remove' && e.end === 'back');
    expect(pops).toHaveLength(7);
  });
});

describe('linked lists', () => {
  it('Linked List Cycle (Floyd): detects the cycle and the diagram shows it', () => {
    const code = `function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
const head = new ListNode(3, new ListNode(2, new ListNode(0, new ListNode(-4))));
head.next.next.next.next = head.next;
const answer = hasCycle(head);
const straight = hasCycle(new ListNode(1, new ListNode(2)));
`;
    const run = finished(runProgram({ code, mode: 'script', inputs: [] }));
    expect(run.plainGlobals).toMatchObject({ answer: true, straight: false });
    const step = run.steps.find((s) => s.frames.length > 1 && s.frames[1].vars.some((v) => v.name === 'fast'))!;
    const { order, referenced } = variableRefs(step.frames);
    const d = buildListDiagram(step.heap, order, referenced);
    expect(d.chains[0].end.kind).toBe('cycle');
  });
});

describe('heaps and union-find written by the user', () => {
  it('a min-heap class (Kth largest element)', () => {
    const code = `class MinHeap {
  constructor() { this.items = []; }
  size() { return this.items.length; }
  peek() { return this.items[0]; }
  push(x) {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
function findKthLargest(nums, k) {
  const heap = new MinHeap();
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop();
  }
  return heap.peek();
}`;
    expect(finished(call(code, 'findKthLargest', { nums: [3, 2, 1, 5, 6, 4], k: 2 })).plainResult).toBe(5);
    expect(finished(call(code, 'findKthLargest', { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 })).plainResult).toBe(4);
  });

  it('union-find with path compression (number of connected components)', () => {
    const code = `function countComponents(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  let components = n;
  for (const [a, b] of edges) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) {
      parent[ra] = rb;
      components--;
    }
  }
  return components;
}`;
    expect(
      finished(
        call(code, 'countComponents', {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [3, 4],
          ],
        }),
      ).plainResult,
    ).toBe(2);
    expect(
      finished(
        call(code, 'countComponents', {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
          ],
        }),
      ).plainResult,
    ).toBe(1);
  });
});

describe('trees: BST insertion builds a tree the diagram can lay out', () => {
  it('inserts into a BST and keeps left < node < right', () => {
    const code = `function insert(root, val) {
  if (root === null) return new TreeNode(val);
  if (val < root.val) root.left = insert(root.left, val);
  else root.right = insert(root.right, val);
  return root;
}`;
    const run = finished(call(code, 'insert', { root: [4, 2, 7, 1, 3], val: 5 }, { root: 'tree' }));
    expect(run.plainResult).toEqual([4, 2, 7, 1, 3, 5]);
    const done = run.steps[run.steps.length - 1];
    const { order, referenced } = variableRefs(done.frames);
    expect(buildTreeDiagram(done.heap, order, referenced).issues).toEqual([]);
  });
});
