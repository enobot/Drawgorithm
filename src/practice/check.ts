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

/** Thrown when the worker died twice on one case; the remaining cases are not run. */
class WorkerKeepsDying extends Error {}

/**
 * Runs one case. Only a worker that died (an error event, e.g. a module reload or the
 * browser running out of memory) is retried, once, on a fresh worker. A failure the engine
 * reported is deterministic and is never retried. So a case runs at most twice.
 */
async function runCase(run: (req: RunRequest) => Promise<RunResult>, request: RunRequest): Promise<RunResult> {
  try {
    return await run(request);
  } catch (err) {
    if (!(err instanceof EngineStopped) || err.reason !== 'crashed' || !err.workerDied) throw err;
    try {
      return await run(request);
    } catch (again) {
      if (again instanceof EngineStopped && again.reason === 'crashed' && again.workerDied) {
        throw new WorkerKeepsDying(
          `The engine worker stopped twice while running this test (${again.message}). This can be a bug in Drawgorithms or the browser running out of memory. Check again, and report it if it keeps happening.`,
          { cause: again },
        );
      }
      throw again;
    }
  }
}

/** Plain words for a failure that is not a wrong answer. */
function errorMessage(err: unknown): string {
  if (err instanceof EngineStopped && err.reason === 'crashed') {
    return `The engine failed while running this test: ${err.message}. This is most likely a bug in Drawgorithms that this code triggers; it was not retried, because the same code and input fail the same way.`;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Checks `code` against every case, one at a time. Each case gets exactly one result. When
 * `signal` aborts (the learner left, or started a new check), the check stops and returns
 * null: a superseded check never reports anything.
 */
export async function checkExercise(
  e: Exercise,
  code: string,
  run: (req: RunRequest) => Promise<RunResult>,
  signal?: AbortSignal,
): Promise<CaseResult[] | null> {
  const c = e.content;
  if (!c) return [];
  const cases = [
    ...c.examples.map((x, i) => ({ ...x, label: `Example ${i + 1}` })),
    ...c.tests.map((x, i) => ({ ...x, label: `Test ${i + 1}` })),
  ];
  const results: CaseResult[] = [];
  let stopReason: string | null = null;
  for (const x of cases) {
    if (signal?.aborted) return null;
    if (stopReason) {
      results.push({ label: x.label, note: x.note, status: 'error', message: stopReason });
      continue;
    }
    const request: RunRequest = {
      code,
      mode: 'function',
      entry: c.entry,
      inputs: c.params.map((p) => ({ name: p.name, value: x.inputs[p.name], kind: p.kind })),
      resultKind: c.resultKind,
    };
    try {
      const result = await runCase(run, request);
      if (signal?.aborted) return null;
      if (result.status !== 'finished') {
        results.push({ label: x.label, note: x.note, status: 'error', message: result.error?.message ?? 'The run did not finish.' });
        continue;
      }
      const cmp = compareRun({ kind: 'return', value: x.output }, result);
      results.push({ label: x.label, note: x.note, status: cmp?.match ? 'passed' : 'failed', message: cmp?.message ?? '' });
    } catch (err) {
      if (signal?.aborted || (err instanceof EngineStopped && err.reason === 'superseded')) return null;
      results.push({ label: x.label, note: x.note, status: 'error', message: errorMessage(err) });
      if (err instanceof WorkerKeepsDying) stopReason = 'Not run: the engine worker stopped twice on an earlier test.';
    }
  }
  return results;
}
