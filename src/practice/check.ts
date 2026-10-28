// "Check all tests": runs the learner's code on every example and additional test,
// one at a time, and reports each result as it really came out.
import { compareRun } from '../problems/compare';
import type { RunRequest, RunResult } from '../trace/types';
import type { Exercise } from './schema';

export interface CaseResult {
  /** "Example 1" or "Test 3". */
  label: string;
  note: string;
  status: 'passed' | 'failed' | 'error';
  /** What happened, in plain words (expected vs. actual, or the error). */
  message: string;
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
      const result = await run(request);
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
