// Foundations 75: an exercise may be "available" only when its content is complete,
// its reference solution passes every example and test in the interpreter, every
// expected output agrees with an independent computation, its starter code runs,
// and every drawing it needs is supported. Planned exercises carry only a brief.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../engine/run';
import { deepEqual } from '../problems/compare';
import { problemById } from '../problems/catalog';
import { EngineStopped } from '../worker/client';
import { checkExercise } from './check';
import { FOUNDATIONS, LESSONS, SUPPORTED_RENDERERS } from './foundations';
import type { Exercise, ExerciseCase } from './schema';

/** Heap id of a reference value (-1 for anything else). */
const refOf = (v: { t: string; id?: number }) => (v.t === 'ref' ? v.id! : -1);

/* Independent answers, computed differently from each reference solution. */

interface TreeNode {
  v: number;
  l: TreeNode | null;
  r: TreeNode | null;
}

/** Level-order list (null = missing child) to nodes, the way the app reads tree inputs. */
function buildTree(list: (number | null)[]): TreeNode | null {
  if (!list.length || list[0] === null) return null;
  const root: TreeNode = { v: list[0], l: null, r: null };
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

// Each check receives that exercise's JSON inputs, whose shapes differ per exercise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INDEPENDENT: Record<string, (x: Record<string, any>) => unknown> = {
  'f75-01': ({ shelf, wanted }) => shelf.indexOf(wanted),
  'f75-02': ({ log }) => new Set(log).size !== log.length,
  'f75-03': ({ codes }) => {
    const out: [string, number][] = [];
    for (const c of codes) {
      const pair = out.find((p) => p[0] === c);
      if (pair) pair[1]++;
      else out.push([c, 1]);
    }
    return out;
  },
  'f75-04': ({ weights, target }) => {
    for (let j = 0; j < weights.length; j++) for (let i = 0; i < j; i++) if (weights[i] + weights[j] === target) return [i, j];
    return [];
  },
  'f75-06': ({ message }) => {
    const s = message.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    return s === [...s].reverse().join('');
  },
  'f75-17': ({ head }) => [...head].reverse(),
  'f75-21': ({ text }) => {
    let s = text;
    let before;
    do {
      before = s;
      s = s.replace('()', '').replace('[]', '').replace('{}', '');
    } while (s !== before);
    return s === '';
  },
  // Every stretch rescanned from scratch.
  'f75-25': ({ readings, k }) =>
    readings.slice(0, readings.length - k + 1).map((_: number, i: number) => Math.max(...readings.slice(i, i + k))),
  'f75-26': ({ readings, target }) => readings.indexOf(target),
  // An unsorted list of waiting tickets; "next" removes one copy of the minimum.
  'f75-41': ({ ops }) => {
    const desk: number[] = [];
    const out: (number | null)[] = [];
    for (const op of ops) {
      if (op[0] === 'add') desk.push(op[1]);
      else if (!desk.length) out.push(null);
      else out.push(desk.splice(desk.indexOf(Math.min(...desk)), 1)[0]);
    }
    return out;
  },
  // Grow the set of reachable towns until no road adds one.
  'f75-46': ({ roads, start, goal }) => {
    const reached = new Set([start]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [a, b] of roads) {
        if (reached.has(a) !== reached.has(b)) {
          reached.add(a);
          reached.add(b);
          grew = true;
        }
      }
    }
    return reached.has(goal);
  },
  // Bellman-Ford style relaxation over the links, n rounds.
  'f75-48': ({ n, links, start, goal }) => {
    const d = Array.from({ length: n }, (_, i) => (i === start ? 0 : Infinity));
    for (let round = 0; round < n; round++) {
      for (const [a, b] of links) {
        d[b] = Math.min(d[b], d[a] + 1);
        d[a] = Math.min(d[a], d[b] + 1);
      }
    }
    return d[goal] === Infinity ? -1 : d[goal];
  },
  // For each ask, search the links made so far.
  'f75-51': ({ events }) => {
    const links: [number, number][] = [];
    const out: boolean[] = [];
    for (const [kind, a, b] of events) {
      if (kind === 'link') {
        links.push([a, b]);
        continue;
      }
      const seen = new Set([a]);
      const todo = [a];
      while (todo.length) {
        const x = todo.pop()!;
        for (const [p, q] of links) {
          for (const [from, to] of [
            [p, q],
            [q, p],
          ]) {
            if (from === x && !seen.has(to)) {
              seen.add(to);
              todo.push(to);
            }
          }
        }
      }
      out.push(seen.has(b));
    }
    return out;
  },
  // A plain list of words, checked with string methods.
  'f75-66': ({ ops }) => {
    const words: string[] = [];
    return ops.map(([kind, text]: [string, string]) => {
      if (kind === 'add') {
        words.push(text);
        return null;
      }
      return kind === 'has' ? words.includes(text) : words.some((w) => w.startsWith(text));
    });
  },
  'f75-34': ({ root }) => {
    const out: number[][] = [];
    const walk = (n: TreeNode | null, depth: number) => {
      if (!n) return;
      (out[depth] ??= []).push(n.v);
      walk(n.l, depth + 1);
      walk(n.r, depth + 1);
    };
    walk(buildTree(root), 0);
    return out;
  },
  'f75-36': ({ n }) => {
    let [a, b] = [1, 1];
    for (let k = 2; k <= n; k++) [a, b] = [b, a + b];
    return b;
  },
};

const available = FOUNDATIONS.filter((e) => e.status === 'available');

function runCase(e: Exercise, code: string, c: ExerciseCase) {
  const content = e.content!;
  return runProgram({
    code,
    mode: 'function',
    entry: content.entry,
    inputs: content.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: content.resultKind,
  });
}

describe('Foundations 75 catalog', () => {
  it('has 75 exercises numbered 1 to 75 with unique ids', () => {
    expect(FOUNDATIONS.map((e) => e.number)).toEqual(Array.from({ length: 75 }, (_, i) => i + 1));
    expect(new Set(FOUNDATIONS.map((e) => e.id)).size).toBe(75);
  });

  it('marks an exercise available exactly when its content exists', () => {
    for (const e of FOUNDATIONS) expect(!!e.content, e.id).toBe(e.status === 'available');
    expect(available.length).toBeGreaterThan(0);
  });

  it('gives every available exercise complete content', () => {
    for (const e of available) {
      const c = e.content!;
      expect(c.statement.length, e.id).toBeGreaterThan(0);
      expect(c.inputFormat && c.outputFormat, e.id).toBeTruthy();
      expect(c.constraints.length, e.id).toBeGreaterThan(0);
      expect(c.rules.length, e.id).toBeGreaterThan(0);
      expect(c.examples.length, e.id).toBeGreaterThanOrEqual(2);
      expect(c.tests.length, e.id).toBeGreaterThanOrEqual(4);
      expect(c.hints.length, e.id).toBeGreaterThanOrEqual(2);
      expect(c.solution.explanation.length && c.solution.code && c.solution.complexity.assumptions, e.id).toBeTruthy();
      expect(c.visualization.spec, e.id).toBeTruthy();
      expect(c.params.map((p) => p.name).sort(), e.id).toEqual(Object.keys(c.examples[0].inputs).sort());
    }
  });

  it('only marks exercises available when the board supports every drawing they need', () => {
    for (const e of available) {
      for (const r of e.content!.visualization.renderers) expect(SUPPORTED_RENDERERS, `${e.id} needs ${r}`).toContain(r);
    }
  });

  it('points only at real lessons and exercises', () => {
    const ids = new Set(FOUNDATIONS.map((e) => e.id));
    for (const e of FOUNDATIONS) {
      for (const l of e.prerequisites) expect(LESSONS[l], `${e.id} → lesson ${l}`).toBeTruthy();
      for (const r of e.related) expect(ids.has(r), `${e.id} → ${r}`).toBe(true);
    }
  });

  it('has an independent check for every available exercise', () => {
    for (const e of available) expect(INDEPENDENT[e.id], e.id).toBeTypeOf('function');
  });

  it('opens available exercises as problems with only the visible examples', () => {
    for (const e of available) {
      const p = problemById(e.id)!;
      expect(p.starter).toBe(e.content!.starter.javascript);
      expect(p.cases).toHaveLength(e.content!.examples.length);
    }
    expect(problemById(FOUNDATIONS.find((e) => e.status === 'planned')!.id)).toBeUndefined();
  });
});

describe.each(available.map((e) => [e.id, e] as const))('%s', (_id, e) => {
  const content = e.content!;
  const cases = [...content.examples, ...content.tests];

  it('expected outputs agree with an independent computation', () => {
    for (const c of cases) expect(INDEPENDENT[e.id](c.inputs), c.note).toEqual(c.output);
  });

  it('reference solution passes every example and test in the interpreter', () => {
    for (const c of cases) {
      const run = runCase(e, content.solution.code, c);
      expect(run.status, `${c.note}: ${run.error?.message ?? ''}`).toBe('finished');
      expect(deepEqual(run.plainResult, c.output), `${c.note}: got ${JSON.stringify(run.plainResult)}`).toBe(true);
    }
  });

  it('starter code runs without errors', () => {
    const run = runCase(e, content.starter.javascript, content.examples[0]);
    expect(run.status, run.error?.message).toBe('finished');
  });

  it('the checker can tell: the unfinished starter fails at least one case', () => {
    const failing = cases.filter((c) => !deepEqual(runCase(e, content.starter.javascript, c).plainResult, c.output));
    expect(failing.length).toBeGreaterThan(0);
  });
});

describe('Check all tests', () => {
  const e = FOUNDATIONS.find((x) => x.id === 'f75-01')!;
  const run = (req: Parameters<typeof runProgram>[0]) => Promise.resolve(runProgram(req));

  const cases = e.content!.examples.length + e.content!.tests.length;
  /** A runner that counts calls and fails the first `fail` of them with the given error. */
  const failingFirst = (fail: number, error: () => Error) => {
    const calls = { n: 0 };
    const runner = (req: Parameters<typeof runProgram>[0]) => {
      calls.n++;
      return calls.n <= fail ? Promise.reject(error()) : Promise.resolve(runProgram(req));
    };
    return { calls, runner };
  };

  it('reports every case as passed for the reference solution', async () => {
    const results = (await checkExercise(e, e.content!.solution.code, run))!;
    expect(results).toHaveLength(cases);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('reports wrong answers as failed, with expected and actual', async () => {
    const results = (await checkExercise(e, e.content!.starter.javascript, run))!;
    const failed = results.find((r) => r.status === 'failed')!;
    expect(failed.message).toContain('Expected');
  });

  it('retries a case once when the worker itself died, with one result per case', async () => {
    const { calls, runner } = failingFirst(1, () => new EngineStopped('crashed', 'worker died', true));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(results).toHaveLength(cases);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
    expect(calls.n).toBe(cases + 1);
  });

  it('never retries a failure the engine reported: the same code and input fail the same way', async () => {
    const { calls, runner } = failingFirst(Infinity, () => new EngineStopped('crashed', 'engine threw'));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(calls.n).toBe(cases);
    expect(results.every((r) => r.status === 'error' && r.message.includes('not retried'))).toBe(true);
  });

  it('stops after a worker dies twice on one case and marks the rest as not run', async () => {
    const { calls, runner } = failingFirst(Infinity, () => new EngineStopped('crashed', 'worker died', true));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(calls.n).toBe(2);
    expect(results).toHaveLength(cases);
    expect(results[0].message).toContain('stopped twice');
    expect(results.slice(1).every((r) => r.status === 'error' && r.message.startsWith('Not run'))).toBe(true);
    expect(results.some((r) => r.message.includes('not in your code'))).toBe(false);
  });

  it('reports nothing once the check is cancelled, and runs no more cases', async () => {
    const controller = new AbortController();
    let calls = 0;
    const runner = (req: Parameters<typeof runProgram>[0]) => {
      calls++;
      if (calls === 2) controller.abort();
      return Promise.resolve(runProgram(req));
    };
    expect(await checkExercise(e, e.content!.solution.code, runner, controller.signal)).toBeNull();
    expect(calls).toBe(2);
  });

  it('reports nothing when a newer check supersedes it', async () => {
    const { runner } = failingFirst(1, () => new EngineStopped('superseded', 'replaced'));
    expect(await checkExercise(e, e.content!.solution.code, runner)).toBeNull();
  });

  it('reports an error in the learner’s code as an error, not a failure', async () => {
    const results = (await checkExercise(e, 'function findFirst(shelf, wanted) { return shelf.nope.length; }', run))!;
    expect(results.every((r) => r.status === 'error')).toBe(true);
  });
});

describe('exercise rules the outputs alone cannot show', () => {
  it('Turn the Chain: the reference reuses the existing nodes', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-17')!;
    const run = runCase(e, e.content!.solution.code, e.content!.examples[0]);
    const created = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'create');
    expect(created).toEqual([]);
  });

  it('Find the Reading: the reference reads O(log n) slots', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-26')!;
    const readings = Array.from({ length: 64 }, (_, i) => i * 3);
    const run = runCase(e, e.content!.solution.code, { inputs: { readings, target: -1 }, output: -1, note: 'missing' });
    const reads = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'index-read').length;
    // Each loop pass reads readings[mid] at most twice; 64 slots need at most 7 passes.
    expect(reads).toBeLessThanOrEqual(14);
  });

  it('Priority Desk: the reference does O(log n) work per operation', () => {
    const c = FOUNDATIONS.find((x) => x.id === 'f75-41')!.content!;
    // n tickets, each more urgent than all before it (every add rises to the top), then n removals.
    const slotsTouched = (n: number) => {
      const ops = [...Array.from({ length: n }, (_, i) => ['add', 1000 - i]), ...Array.from({ length: n }, () => ['next'])];
      const run = runProgram({
        code: c.solution.code,
        mode: 'function',
        entry: c.entry,
        inputs: [{ name: 'ops', value: ops, kind: 'auto' }],
        limits: { maxSteps: 50000 },
      });
      expect(run.status, run.error?.message).toBe('finished');
      expect(run.plainResult).toEqual(Array.from({ length: n }, (_, i) => 1000 - n + 1 + i));
      const heapIds = new Set(
        run.steps.flatMap((s) => s.frames.flatMap((f) => f.vars.filter((v) => v.name === 'heap').map((v) => refOf(v.value)))),
      );
      const touched = run.steps
        .flatMap((s) => s.effects)
        .filter((x) => (x.type === 'index-read' || x.type === 'index-write') && heapIds.has(x.objId)).length;
      return touched / ops.length;
    };
    // From 15 to 63 tickets the heap grows from 4 to 6 levels: measured, the reference's work per operation
    // grows 1.93×, while scanning the whole desk on every removal grows it 3.49×.
    expect(slotsTouched(63) / slotsTouched(15)).toBeLessThan(2.7);
  });

  it('Window Peak Tracker: the reference reads O(n) readings, not O(n·k)', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-25')!;
    const readings = Array.from({ length: 60 }, (_, i) => (i * 37) % 23);
    const k = 20;
    const c = e.content!;
    const run = runProgram({
      code: c.solution.code,
      mode: 'function',
      entry: c.entry,
      inputs: [
        { name: 'readings', value: readings, kind: 'auto' },
        { name: 'k', value: k, kind: 'auto' },
      ],
      limits: { maxSteps: 20000 },
    });
    expect(run.status, run.error?.message).toBe('finished');
    // The first step is before the call, so look for the step where readings is bound.
    const readingsId = run.steps.flatMap((s) => s.frames.flatMap((f) => f.vars)).find((v) => v.name === 'readings')!.value as {
      id: number;
    };
    const reads = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'index-read' && x.objId === readingsId.id).length;
    // Each index is pushed and popped at most once, and each pop or stop costs two reads: about 5n in all.
    // Rescanning every stretch would read (n - k + 1) · k = 820 readings.
    expect(reads).toBeLessThanOrEqual(5 * readings.length);
  });
});
