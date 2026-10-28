// Differential tests: the same learner programs run in Drawgorithms' interpreter and in
// real JavaScript (Node), and the answers must match. Expected values come from the real
// engine, not from hand-written guesses. Programs that need more than the app's default
// step limit are checked with raised limits for correctness, and listed separately, since
// in the app they stop early by design.
import { describe, expect, it } from 'vitest';
import type { InputSpec } from '../trace/types';
import { runProgram } from './run';

class ListNode {
  constructor(
    public val: unknown = 0,
    public next: ListNode | null = null,
  ) {}
}
class TreeNode {
  constructor(
    public val: unknown = 0,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

const list = (items: unknown[]) => items.reduceRight<ListNode | null>((next, v) => new ListNode(v, next), null);
function tree(items: unknown[]): TreeNode | null {
  if (!items.length || items[0] === null) return null;
  const root = new TreeNode(items[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < items.length) {
    const parent = queue.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (i >= items.length) break;
      const v = items[i++];
      if (v !== null && v !== undefined) {
        parent[side] = new TreeNode(v);
        queue.push(parent[side]!);
      }
    }
  }
  return root;
}

/** The engine's answer format, rebuilt independently: lists and trees as arrays, Map as entries, Set as values. */
function plain(v: unknown, seen = new Set<unknown>()): unknown {
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (v instanceof ListNode) {
    const out: unknown[] = [];
    const visited = new Set<ListNode>();
    for (let cur: ListNode | null = v; cur; cur = cur.next) {
      if (visited.has(cur)) {
        out.push('[cycle]');
        break;
      }
      visited.add(cur);
      out.push(plain(cur.val));
    }
    return out;
  }
  if (v instanceof TreeNode) {
    const out: unknown[] = [];
    const queue: (TreeNode | null)[] = [v];
    while (queue.length) {
      const n = queue.shift()!;
      if (n) {
        out.push(plain(n.val));
        queue.push(n.left, n.right);
      } else out.push(null);
    }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }
  if (seen.has(v)) return '[cycle]';
  seen.add(v);
  let out: unknown;
  if (Array.isArray(v)) out = v.map((x) => plain(x, seen));
  else if (v instanceof Map) out = [...v].map(([k, x]) => [plain(k, seen), plain(x, seen)]);
  else if (v instanceof Set) out = [...v].map((x) => plain(x, seen));
  else out = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x, seen)]));
  seen.delete(v);
  return out;
}

type Kind = 'auto' | 'list' | 'tree';
interface Case {
  name: string;
  code: string;
  entry: string;
  params: { name: string; kind?: Kind }[];
  inputs: unknown[][];
}

function native(c: Case, args: unknown[]): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    const fn = new Function('ListNode', 'TreeNode', `${c.code}\nreturn ${c.entry};`)(ListNode, TreeNode) as (...a: unknown[]) => unknown;
    const built = args.map((a, i) => {
      const kind = c.params[i].kind ?? 'auto';
      const copy = structuredClone(a);
      return kind === 'list' ? list(copy as unknown[]) : kind === 'tree' ? tree(copy as unknown[]) : copy;
    });
    return { ok: true, value: plain(fn(...built)) };
  } catch (e) {
    return { ok: false, error: (e as Error).name };
  }
}

function engine(c: Case, args: unknown[], raised: boolean) {
  const inputs: InputSpec[] = args.map((a, i) => ({ name: c.params[i].name, value: structuredClone(a), kind: c.params[i].kind ?? 'auto' }));
  return runProgram({
    code: c.code,
    mode: 'function',
    entry: c.entry,
    inputs,
    limits: raised ? { maxSteps: 1_000_000, maxOps: 50_000_000, maxTraceValues: 100_000_000 } : undefined,
  });
}

const CASES: Case[] = [
  // ---- arrays and hash maps
  {
    name: 'two sum with a map',
    entry: 'twoSum',
    params: [{ name: 'nums' }, { name: 'target' }],
    code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    inputs: [
      [[2, 7, 11, 15], 9],
      [[3, 3], 6],
      [[-1, -2, -3, -4, -5], -8],
      [[0, 4, 3, 0], 0],
      [[1], 2],
      [[], 0],
    ],
  },
  {
    name: 'contains duplicate with a set',
    entry: 'containsDuplicate',
    params: [{ name: 'nums' }],
    code: `function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) { if (seen.has(n)) return true; seen.add(n); }
  return false;
}`,
    inputs: [[[]], [[1]], [[1, 2, 3, 1]], [[-1, -1]], [[0, -0]]],
  },
  {
    name: 'group anagrams',
    entry: 'groupAnagrams',
    params: [{ name: 'words' }],
    code: `function groupAnagrams(words) {
  const groups = new Map();
  for (const w of words) {
    const key = w.split('').sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}`,
    inputs: [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['']], [['a']], [[]]],
  },
  {
    name: 'counting with a plain object',
    entry: 'count',
    params: [{ name: 'items' }],
    code: `function count(items) {
  const c = {};
  for (const x of items) c[x] = (c[x] || 0) + 1;
  return c;
}`,
    inputs: [[['a', 'b', 'a']], [[3, 1, 3, 2]], [[]]],
  },
  {
    name: 'object key order (integer keys first)',
    entry: 'keys',
    params: [{ name: 'unused' }],
    code: `function keys(unused) {
  const o = {};
  o.b = 1; o[2] = 1; o.a = 1; o[1] = 1; o['10'] = 1;
  const order = [];
  for (const k in o) order.push(k);
  return [Object.keys(o), order, Object.entries(o).map((e) => e[0]), JSON.stringify(o)];
}`,
    inputs: [[0]],
  },
  {
    name: 'product of array except self',
    entry: 'productExceptSelf',
    params: [{ name: 'nums' }],
    code: `function productExceptSelf(nums) {
  const out = new Array(nums.length).fill(1);
  let left = 1;
  for (let i = 0; i < nums.length; i++) { out[i] = left; left *= nums[i]; }
  let right = 1;
  for (let i = nums.length - 1; i >= 0; i--) { out[i] *= right; right *= nums[i]; }
  return out;
}`,
    inputs: [[[1, 2, 3, 4]], [[-1, 1, 0, -3, 3]], [[5]], [[0, 0]]],
  },
  {
    name: 'default sort is by text; numeric sort needs a comparator',
    entry: 'sorts',
    params: [{ name: 'nums' }],
    code: `function sorts(nums) {
  return [[...nums].sort(), [...nums].sort((a, b) => a - b), [...nums].sort((a, b) => b - a)];
}`,
    inputs: [[[10, 9, 1, -3, 100, 2]], [[]], [[5]]],
  },
  // ---- two pointers and sliding windows
  {
    name: 'palindrome with letter and digit rules',
    entry: 'isPalindrome',
    params: [{ name: 's' }],
    code: `function isPalindrome(s) {
  const ok = (c) => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');
  const t = s.toLowerCase();
  let i = 0, j = t.length - 1;
  while (i < j) {
    if (!ok(t[i])) { i++; continue; }
    if (!ok(t[j])) { j--; continue; }
    if (t[i] !== t[j]) return false;
    i++; j--;
  }
  return true;
}`,
    inputs: [['A man, a plan, a canal: Panama'], ['race a car'], [''], [' '], ['0P']],
  },
  {
    name: 'best fixed-size window sum',
    entry: 'maxWindow',
    params: [{ name: 'nums' }, { name: 'k' }],
    code: `function maxWindow(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let i = k; i < nums.length; i++) { sum += nums[i] - nums[i - k]; best = Math.max(best, sum); }
  return best;
}`,
    inputs: [
      [[1, 4, 2, 10, 23, 3, 1, 0, 20], 4],
      [[-1, -2], 1],
      [[5], 1],
    ],
  },
  {
    name: 'longest substring without repeats',
    entry: 'longest',
    params: [{ name: 's' }],
    code: `function longest(s) {
  const last = new Map();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
    inputs: [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], ['dvdf']],
  },
  {
    name: 'remove duplicates in place',
    entry: 'compact',
    params: [{ name: 'nums' }],
    code: `function compact(nums) {
  if (nums.length === 0) return [0, nums];
  let w = 1;
  for (let r = 1; r < nums.length; r++) if (nums[r] !== nums[w - 1]) nums[w++] = nums[r];
  return [w, nums.slice(0, w)];
}`,
    inputs: [[[1, 1, 2]], [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], [[]], [[-2, -2, -1]]],
  },
  {
    name: 'binary search',
    entry: 'search',
    params: [{ name: 'nums' }, { name: 'target' }],
    code: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}`,
    inputs: [
      [[-1, 0, 3, 5, 9, 12], 9],
      [[-1, 0, 3, 5, 9, 12], 2],
      [[], 1],
      [[5], 5],
      [[-5, -3], -5],
    ],
  },
  // ---- linked lists
  {
    name: 'reverse a list',
    entry: 'reverse',
    params: [{ name: 'head', kind: 'list' }],
    code: `function reverse(head) {
  let prev = null, curr = head;
  while (curr !== null) { const next = curr.next; curr.next = prev; prev = curr; curr = next; }
  return prev;
}`,
    inputs: [[[1, 2, 3, 4]], [[1]], [[]], [[2, 2, -1]]],
  },
  {
    name: 'middle node (second middle when even)',
    entry: 'middle',
    params: [{ name: 'head', kind: 'list' }],
    code: `function middle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  return slow;
}`,
    inputs: [[[1, 2, 3, 4, 5]], [[1, 2, 3, 4, 5, 6]], [[1]], [[]]],
  },
  {
    name: 'merge two sorted lists',
    entry: 'merge',
    params: [
      { name: 'a', kind: 'list' },
      { name: 'b', kind: 'list' },
    ],
    code: `function merge(a, b) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; } else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a || b;
  return dummy.next;
}`,
    inputs: [
      [
        [1, 2, 4],
        [1, 3, 4],
      ],
      [[], []],
      [[], [0]],
      [[-3, 5], [-4]],
    ],
  },
  {
    name: 'cycle detection and entry',
    entry: 'cycleAt',
    params: [{ name: 'values' }, { name: 'pos' }],
    code: `function cycleAt(values, pos) {
  let head = null, tail = null, nodes = [];
  for (const v of values) { const n = new ListNode(v); nodes.push(n); if (tail) tail.next = n; else head = n; tail = n; }
  if (pos >= 0 && tail) tail.next = nodes[pos];
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) {
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p.val;
    }
  }
  return null;
}`,
    inputs: [
      [[3, 2, 0, -4], 1],
      [[1, 2], 0],
      [[1], -1],
      [[], -1],
    ],
  },
  {
    name: 'aliases share one node',
    entry: 'alias',
    params: [{ name: 'head', kind: 'list' }],
    code: `function alias(head) {
  const a = head;
  a.val = 99;
  const b = head.next;
  b.next = head;
  return [head.val, a === head, b.next.val];
}`,
    inputs: [[[1, 2, 3]]],
  },
  {
    name: 'reading through null fails the same way',
    entry: 'second',
    params: [{ name: 'head', kind: 'list' }],
    code: `function second(head) { return head.next.val; }`,
    inputs: [[[1, 2]], [[1]], [[]]],
  },
  // ---- stacks, queues, Asteroid Collision
  {
    name: 'valid brackets',
    entry: 'valid',
    params: [{ name: 's' }],
    code: `function valid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0;
}`,
    inputs: [['()[]{}'], ['(]'], ['([)]'], [''], ['((('], [')']],
  },
  {
    name: 'asteroid collision',
    entry: 'asteroids',
    params: [{ name: 'a' }],
    code: `function asteroids(a) {
  const stack = [];
  for (const x of a) {
    let alive = true;
    while (alive && x < 0 && stack.length && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -x) { stack.pop(); continue; }
      if (top === -x) stack.pop();
      alive = false;
    }
    if (alive) stack.push(x);
  }
  return stack;
}`,
    inputs: [[[5, 10, -5]], [[8, -8]], [[10, 2, -5]], [[-2, -1, 1, 2]], [[]], [[1, -2, -2, -2]]],
  },
  {
    name: 'warmer day ahead (monotonic stack)',
    entry: 'warmer',
    params: [{ name: 't' }],
    code: `function warmer(t) {
  const out = new Array(t.length).fill(0), stack = [];
  for (let i = 0; i < t.length; i++) {
    while (stack.length && t[stack[stack.length - 1]] < t[i]) { const j = stack.pop(); out[j] = i - j; }
    stack.push(i);
  }
  return out;
}`,
    inputs: [[[73, 74, 75, 71, 69, 72, 76, 73]], [[30, 40, 50, 60]], [[90]], [[]]],
  },
  // ---- trees, BST, BFS, DFS
  {
    name: 'max depth (recursive DFS)',
    entry: 'depth',
    params: [{ name: 'root', kind: 'tree' }],
    code: `function depth(root) { return root === null ? 0 : 1 + Math.max(depth(root.left), depth(root.right)); }`,
    inputs: [[[3, 9, 20, null, null, 15, 7]], [[]], [[1, null, 2]]],
  },
  {
    name: 'level order (BFS with a queue)',
    entry: 'levels',
    params: [{ name: 'root', kind: 'tree' }],
    code: `function levels(root) {
  const out = [];
  if (!root) return out;
  const q = [root];
  while (q.length) {
    const size = q.length, level = [];
    for (let i = 0; i < size; i++) { const n = q.shift(); level.push(n.val); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    out.push(level);
  }
  return out;
}`,
    inputs: [[[3, 9, 20, null, null, 15, 7]], [[]], [[1]], [[1, 2, null, 3, null, 4]]],
  },
  {
    name: 'search a BST',
    entry: 'find',
    params: [{ name: 'root', kind: 'tree' }, { name: 'key' }],
    code: `function find(root, key) {
  let n = root;
  while (n && n.val !== key) n = key < n.val ? n.left : n.right;
  return n;
}`,
    inputs: [
      [[4, 2, 7, 1, 3], 2],
      [[4, 2, 7, 1, 3], 5],
      [[], 1],
    ],
  },
  {
    name: 'validate a BST with bounds',
    entry: 'isBST',
    params: [{ name: 'root', kind: 'tree' }],
    code: `function isBST(root) {
  const ok = (n, lo, hi) => !n || (n.val > lo && n.val < hi && ok(n.left, lo, n.val) && ok(n.right, n.val, hi));
  return ok(root, -Infinity, Infinity);
}`,
    inputs: [[[2, 1, 3]], [[5, 1, 4, null, null, 3, 6]], [[1, 1]], [[]]],
  },
  {
    name: 'inorder with an explicit stack',
    entry: 'inorder',
    params: [{ name: 'root', kind: 'tree' }],
    code: `function inorder(root) {
  const out = [], stack = [];
  let n = root;
  while (n || stack.length) {
    while (n) { stack.push(n); n = n.left; }
    n = stack.pop(); out.push(n.val); n = n.right;
  }
  return out;
}`,
    inputs: [[[1, null, 2, 3]], [[]], [[2, 1, 3]]],
  },
  // ---- graphs
  {
    name: 'fewest hops (BFS on an adjacency list)',
    entry: 'hops',
    params: [{ name: 'n' }, { name: 'edges' }, { name: 'src' }, { name: 'dst' }],
    code: `function hops(n, edges, src, dst) {
  const adj = new Map();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const [a, b] of edges) { adj.get(a).push(b); adj.get(b).push(a); }
  const dist = new Map([[src, 0]]), q = [src];
  while (q.length) {
    const v = q.shift();
    if (v === dst) return dist.get(v);
    for (const w of adj.get(v)) if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); q.push(w); }
  }
  return -1;
}`,
    inputs: [
      [
        5,
        [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
        ],
        0,
        4,
      ],
      [
        4,
        [
          [0, 1],
          [2, 3],
        ],
        0,
        3,
      ],
      [3, [], 1, 1],
      [
        5,
        [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4],
        ],
        0,
        4,
      ],
    ],
  },
  {
    name: 'connected components (recursive DFS)',
    entry: 'components',
    params: [{ name: 'n' }, { name: 'edges' }],
    code: `function components(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const seen = new Set();
  const visit = (v) => { seen.add(v); for (const w of adj[v]) if (!seen.has(w)) visit(w); };
  let count = 0;
  for (let v = 0; v < n; v++) if (!seen.has(v)) { count++; visit(v); }
  return count;
}`,
    inputs: [
      [
        5,
        [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
      ],
      [3, []],
      [1, []],
    ],
  },
  {
    name: 'count islands in a grid',
    entry: 'islands',
    params: [{ name: 'grid' }],
    code: `function islands(grid) {
  let count = 0;
  const sink = (r, c) => {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  };
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) if (grid[r][c] === '1') { count++; sink(r, c); }
  return count;
}`,
    inputs: [
      [
        [
          ['1', '1', '0'],
          ['0', '1', '0'],
          ['1', '0', '1'],
        ],
      ],
      [[]],
      [[['0']]],
    ],
  },
  {
    name: 'task order (Kahn topological sort)',
    entry: 'order',
    params: [{ name: 'n' }, { name: 'deps' }],
    code: `function order(n, deps) {
  const indeg = new Array(n).fill(0), out = Array.from({ length: n }, () => []);
  for (const [task, need] of deps) { out[need].push(task); indeg[task]++; }
  const q = [], result = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  while (q.length) { const v = q.shift(); result.push(v); for (const w of out[v]) if (--indeg[w] === 0) q.push(w); }
  return result.length === n ? result : [];
}`,
    inputs: [
      [
        4,
        [
          [1, 0],
          [2, 1],
          [3, 2],
        ],
      ],
      [
        2,
        [
          [0, 1],
          [1, 0],
        ],
      ],
      [3, []],
    ],
  },
  // ---- recursion and backtracking
  {
    name: 'all subsets',
    entry: 'subsets',
    params: [{ name: 'nums' }],
    code: `function subsets(nums) {
  const out = [], pick = [];
  const go = (i) => {
    if (i === nums.length) { out.push([...pick]); return; }
    pick.push(nums[i]); go(i + 1); pick.pop(); go(i + 1);
  };
  go(0);
  return out;
}`,
    inputs: [[[1, 2, 3]], [[]], [[0]]],
  },
  {
    name: 'all permutations',
    entry: 'perms',
    params: [{ name: 'nums' }],
    code: `function perms(nums) {
  const out = [], cur = [], used = new Array(nums.length).fill(false);
  const go = () => {
    if (cur.length === nums.length) { out.push(cur.slice()); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(nums[i]); go(); cur.pop(); used[i] = false;
    }
  };
  go();
  return out;
}`,
    inputs: [[[1, 2, 3]], [[1]], [[1, 2, 3, 4]]],
  },
  {
    name: 'staircase routes with a memo',
    entry: 'climb',
    params: [{ name: 'n' }],
    code: `function climb(n, memo = new Map()) {
  if (n <= 2) return n;
  if (memo.has(n)) return memo.get(n);
  const r = climb(n - 1, memo) + climb(n - 2, memo);
  memo.set(n, r);
  return r;
}`,
    inputs: [[1], [2], [10], [45]],
  },
  {
    name: 'n-queens count',
    entry: 'queens',
    params: [{ name: 'n' }],
    code: `function queens(n) {
  const cols = new Set(), d1 = new Set(), d2 = new Set();
  const place = (r) => {
    if (r === n) return 1;
    let total = 0;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
      cols.add(c); d1.add(r - c); d2.add(r + c);
      total += place(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c);
    }
    return total;
  };
  return place(0);
}`,
    inputs: [[1], [4], [6]],
  },
  // ---- dynamic programming
  {
    name: 'fewest coins',
    entry: 'coins',
    params: [{ name: 'coins' }, { name: 'amount' }],
    code: `function coins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    inputs: [
      [[1, 2, 5], 11],
      [[2], 3],
      [[1], 0],
    ],
  },
  {
    name: 'longest common subsequence (grid)',
    entry: 'lcs',
    params: [{ name: 'a' }, { name: 'b' }],
    code: `function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}`,
    inputs: [
      ['abcde', 'ace'],
      ['abc', 'def'],
      ['', 'a'],
    ],
  },
  {
    name: 'edit distance',
    entry: 'edit',
    params: [{ name: 'a' }, { name: 'b' }],
    code: `function edit(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}`,
    inputs: [
      ['horse', 'ros'],
      ['', ''],
      ['intention', 'execution'],
    ],
  },
  {
    name: 'house robber',
    entry: 'rob',
    params: [{ name: 'nums' }],
    code: `function rob(nums) {
  let take = 0, skip = 0;
  for (const n of nums) { const t = skip + n; skip = Math.max(skip, take); take = t; }
  return Math.max(take, skip);
}`,
    inputs: [[[2, 7, 9, 3, 1]], [[]], [[5]], [[2, 1, 1, 2]]],
  },
  // ---- errors a program catches itself
  {
    name: 'catching errors',
    entry: 'caught',
    params: [{ name: 'which' }],
    code: `function caught(which) {
  try {
    if (which === 'null') { const o = null; return o.x; }
    if (which === 'range') throw new RangeError('too far');
    if (which === 'plain') throw Error('plain');
    return 'none';
  } catch (e) {
    return [e.name, e.message === undefined ? 'no message' : typeof e.message, e instanceof Error, e instanceof TypeError, e instanceof RangeError];
  }
}`,
    inputs: [['null'], ['range'], ['plain'], ['ok']],
  },
  // ---- bits and numbers
  {
    name: 'lone number with XOR',
    entry: 'single',
    params: [{ name: 'nums' }],
    code: `function single(nums) { return nums.reduce((a, b) => a ^ b, 0); }`,
    inputs: [[[4, 1, 2, 1, 2]], [[-7]], [[0, 5, 0]]],
  },
  {
    name: 'count set bits',
    entry: 'bits',
    params: [{ name: 'n' }],
    code: `function bits(n) { let c = 0; while (n !== 0) { n &= n - 1; c++; } return [c, (11 >>> 0).toString(2), 7 >> 1, -8 >> 1, 5 | 2]; }`,
    inputs: [[11], [0], [2147483647]],
  },
  {
    name: 'number formatting and rounding',
    entry: 'nums',
    params: [{ name: 'x' }],
    code: `function nums(x) { return [0.1 + 0.2, Math.floor(-3 / 2), Math.round(-2.5), (x / 3).toFixed(2), Number('12px'), parseInt('12px'), 2 ** 53 + 1, -0 === 0, String(-0)]; }`,
    inputs: [[10]],
  },
  {
    name: 'strings',
    entry: 'strs',
    params: [{ name: 's' }],
    code: `function strs(s) { return [s.split(''), s.toUpperCase(), s.charCodeAt(0), String.fromCharCode(65), s.indexOf('l'), s.slice(-2), s.split('l'), 'b'.localeCompare('a')]; }`,
    inputs: [['hello'], ['a']],
  },
];

const results: { name: string; input: string; steps: number; status: string }[] = [];

describe('Drawgorithms matches real JavaScript', () => {
  for (const c of CASES) {
    it(c.name, () => {
      for (const args of c.inputs) {
        const want = native(c, args);
        const got = engine(c, args, true);
        const label = `${c.name} ${JSON.stringify(args)}`;
        if (want.ok) {
          expect(got.error, label).toBeNull();
          expect(got.plainResult, label).toEqual(want.value);
        } else {
          // The same kind of failure (e.g. TypeError reading through null).
          expect(got.status, label).toBe('error');
          expect(got.error?.name, label).toBe(want.error);
        }
        const normal = engine(c, args, false);
        results.push({
          name: c.name,
          input: JSON.stringify(args).slice(0, 60),
          steps: normal.steps.length,
          status: normal.error?.kind ?? 'ok',
        });
      }
    });
  }

  it('reports which inputs stop at the default limits in the app', () => {
    const stopped = results.filter((r) => r.status === 'limit');
    console.log(`${results.length} runs; ${stopped.length} stop early at the default limits:`);
    for (const r of stopped) console.log(`  ${r.name} ${r.input} (${r.steps} steps)`);
    expect(results.length).toBeGreaterThan(100);
  });
});

describe('failures a learner will hit', () => {
  const run = (code: string) => runProgram({ code, mode: 'script', inputs: [] });

  it('unfinished code is a syntax error with a line', () => {
    const r = run('function f(a) {\n  return a +\n');
    expect(r.error).toMatchObject({ kind: 'syntax', loc: expect.objectContaining({ line: expect.any(Number) }) });
  });

  it('a misspelled name is a ReferenceError, like JavaScript', () => {
    expect(run('const x = 1; const y = z + 1;').error).toMatchObject({ kind: 'runtime', name: 'ReferenceError' });
  });

  it('throw new Error reports the message', () => {
    expect(run('throw new Error("boom");').error?.message).toMatch(/boom/);
  });

  it('features the interpreter lacks say so instead of failing silently', () => {
    for (const code of ['const ok = /a+/.test("aa");', 'async function f() {}', 'function* g() {}']) {
      expect(run(code).error, code).toMatchObject({ kind: 'unsupported' });
    }
  });
});
