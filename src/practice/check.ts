// "Check all tests": runs the learner's code on every example and additional test,
// one at a time, and reports each result as it really came out.
import { compareRun } from '../problems/compare';
import type { RunRequest, RunResult } from '../trace/types';
import { EngineStopped } from '../worker/client';
import type { Exercise } from './schema';

export interface CaseResult {
  /** "Example 1" or "Test 3". */
  label: string;
  note: string;
  status: 'passed' | 'failed' | 'error';
  /** What happened, in plain words (expected vs. actual, or the error). */
  message: string;
}

/**
 * The engine worker can die for reasons unrelated to the learner's code (for example while
 * the dev server reloads modules). Errors in their code come back as a finished result, never
 * as a crash, so a crash is retried once on a fresh worker before it is reported.
 */
async function runRetryingCrash(run: (req: RunRequest) => Promise<RunResult>, request: RunRequest): Promise<RunResult> {
  try {
    return await run(request);
  } catch (err) {
    if (!(err instanceof EngineStopped) || err.reason !== 'crashed') throw err;
    try {
      return await run(request);
    } catch (again) {
      if (again instanceof EngineStopped && again.reason === 'crashed') {
        throw new Error(
          `The engine stopped unexpectedly twice (${again.message}). That is a problem in Drawgorithms, not in your code. Try again.`,
          { cause: again },
        );
      }
      throw again;
    }
  }
}

export async function checkExercise(e: Exercise, code: string, run: (req: RunRequest) => Promise<RunResult>): Promise<CaseResult[]> {
  const c = e.content;
  if (!c) return [];
  const cases = [
    ...c.examples.map((x, i) => ({ ...x, label: `Example ${i + 1}` })),
    ...c.tests.map((x, i) => ({ ...x, label: `Test ${i + 1}` })),
  ];
  const results: CaseResult[] = [];
  for (const x of cases) {
    const request: RunRequest = {
      code,
      mode: 'function',
      entry: c.entry,
      inputs: c.params.map((p) => ({ name: p.name, value: x.inputs[p.name], kind: p.kind })),
      resultKind: c.resultKind,
    };
    try {
      const result = await runRetryingCrash(run, request);
      if (result.status !== 'finished') {
        results.push({ label: x.label, note: x.note, status: 'error', message: result.error?.message ?? 'The run did not finish.' });
        continue;
      }
      const cmp = compareRun({ kind: 'return', value: x.output }, result);
      results.push({ label: x.label, note: x.note, status: cmp?.match ? 'passed' : 'failed', message: cmp?.message ?? '' });
    } catch (err) {
      results.push({ label: x.label, note: x.note, status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
