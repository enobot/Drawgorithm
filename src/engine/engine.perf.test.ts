// Engine performance benchmark. Opt-in so it never slows or flakes the normal suite:
//   PERF=1 npx vitest run src/engine/engine.perf.test.ts
// Measures, at the app's default limits, how long a run takes and how big the result is
// (structuredClone stands in for the copy postMessage makes from the worker to the page).
import { describe, it } from 'vitest';
import type { RunRequest } from '../trace/types';
import { liveBuild, runProgram } from './run';

const ITERATIONS = 40;
const WARMUP = 5;
// The project is typed for the browser; Node's process is reached without adding Node types.
const node = (globalThis as { process?: { env: Record<string, string | undefined>; version: string } }).process;

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

function measure(fn: () => unknown) {
  for (let i = 0; i < WARMUP; i++) fn();
  const times: number[] = [];
  let last: unknown;
  for (let i = 0; i < ITERATIONS; i++) {
    const t = performance.now();
    last = fn();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return { last, p50: pct(times, 50), p95: pct(times, 95), p99: pct(times, 99) };
}

const fn = (code: string, entry: string, inputs: RunRequest['inputs']): RunRequest => ({ code, mode: 'function', entry, inputs });
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const WORKLOADS: [string, RunRequest][] = [
  [
    'two sum, 100 numbers',
    fn(
      'function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { const need = target - nums[i]; if (seen.has(need)) return [seen.get(need), i]; seen.set(nums[i], i); } return []; }',
      'twoSum',
      [
        { name: 'nums', value: range(100), kind: 'auto' },
        { name: 'target', value: 197, kind: 'auto' },
      ],
    ),
  ],
  [
    'reverse a 200-node list',
    fn(
      'function reverse(head) { let prev = null, curr = head; while (curr !== null) { const next = curr.next; curr.next = prev; prev = curr; curr = next; } return prev; }',
      'reverse',
      [{ name: 'head', value: range(200), kind: 'list' }],
    ),
  ],
  [
    'level order of a 63-node tree',
    fn(
      'function levels(root) { const out = []; if (!root) return out; const q = [root]; while (q.length) { const size = q.length, level = []; for (let i = 0; i < size; i++) { const n = q.shift(); level.push(n.val); if (n.left) q.push(n.left); if (n.right) q.push(n.right); } out.push(level); } return out; }',
      'levels',
      [{ name: 'root', value: range(63), kind: 'tree' }],
    ),
  ],
  [
    'LCS of two 12-letter strings',
    fn(
      'function lcs(a, b) { const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); return dp[a.length][b.length]; }',
      'lcs',
      [
        { name: 'a', value: 'abcdefghijkl', kind: 'auto' },
        { name: 'b', value: 'acegikmoqsuw', kind: 'auto' },
      ],
    ),
  ],
  [
    'subsets of 4 (backtracking)',
    fn(
      'function subsets(nums) { const out = [], pick = []; const go = (i) => { if (i === nums.length) { out.push([...pick]); return; } pick.push(nums[i]); go(i + 1); pick.pop(); go(i + 1); }; go(0); return out; }',
      'subsets',
      [{ name: 'nums', value: [1, 2, 3, 4], kind: 'auto' }],
    ),
  ],
  ['infinite loop (stopped at 2,000 steps)', { code: 'let i = 0; while (true) { i++; }', mode: 'script', inputs: [] }],
  ['runaway recursion (stopped at 200 calls)', { code: 'function f(n) { return f(n + 1); } f(0);', mode: 'script', inputs: [] }],
  [
    '20,000-item array, 2,000 steps (heaviest trace)',
    {
      code: 'const a = []; for (let i = 0; i < 20000; i++) a.push(i); let k = 0; for (let i = 0; i < 1500; i++) k++;',
      mode: 'script',
      inputs: [],
    },
  ],
];

describe.skipIf(!node?.env.PERF)('engine performance', () => {
  it('runs and result sizes at the default limits', () => {
    const rows: string[] = [];
    for (const [name, req] of WORKLOADS) {
      const run = measure(() => runProgram(req));
      const result = run.last as ReturnType<typeof runProgram>;
      const clone = measure(() => structuredClone(result));
      const mb = JSON.stringify(result).length / 1e6;
      rows.push(
        `${name.padEnd(48)} run p50 ${run.p50.toFixed(1)} p95 ${run.p95.toFixed(1)} p99 ${run.p99.toFixed(1)} ms | ${String(result.steps.length).padStart(4)} steps ${mb.toFixed(2)} MB | copy p50 ${clone.p50.toFixed(1)} p95 ${clone.p95.toFixed(1)} ms`,
      );
    }
    const live = measure(() =>
      liveBuild(
        'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.right = new TreeNode(8);\nroot.left.right = new TreeNode(4);\nfunction height(n) { return n ? 1 + Math.max(height(n.left), height(n.right)) : 0; }\nconst h = height(root);\n',
      ),
    );
    rows.push(
      `${'Live Build of the tree example'.padEnd(48)} p50 ${live.p50.toFixed(1)} p95 ${live.p95.toFixed(1)} p99 ${live.p99.toFixed(1)} ms`,
    );
    console.log(`\nNode ${node?.version}, ${ITERATIONS} runs each after ${WARMUP} warm-up runs\n${rows.join('\n')}`);
    // A full benchmark takes about half a minute, far past the default 5-second test timeout.
  }, 180_000);
});
