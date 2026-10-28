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
  'f75-26': ({ readings, target }) => readings.indexOf(target),
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

  it('reports every case as passed for the reference solution', async () => {
    const results = await checkExercise(e, e.content!.solution.code, run);
    expect(results).toHaveLength(e.content!.examples.length + e.content!.tests.length);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('reports wrong answers as failed, with expected and actual', async () => {
    const results = await checkExercise(e, e.content!.starter.javascript, run);
    const failed = results.find((r) => r.status === 'failed')!;
    expect(failed.message).toContain('Expected');
  });

  it('retries once when the engine worker itself crashes', async () => {
    let crashes = 1;
    const flaky = (req: Parameters<typeof runProgram>[0]) => {
      if (crashes-- > 0) return Promise.reject(new EngineStopped('crashed', 'worker died'));
      return Promise.resolve(runProgram(req));
    };
    const results = await checkExercise(e, e.content!.solution.code, flaky);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('reports an engine that keeps crashing as an error that is not the learner’s fault', async () => {
    const broken = () => Promise.reject(new EngineStopped('crashed', 'worker died'));
    const results = await checkExercise(e, e.content!.solution.code, broken);
    expect(results.every((r) => r.status === 'error' && r.message.includes('not in your code'))).toBe(true);
  });

  it('reports a crash as an error, not a failure', async () => {
    const results = await checkExercise(e, 'function findFirst(shelf, wanted) { return shelf.nope.length; }', run);
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
});
