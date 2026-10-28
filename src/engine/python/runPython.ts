// The Python adapter, page side: hands a run request to the tracer (tracer.py) inside a
// loaded Pyodide and turns its JSON back into the shared trace (trace/types.ts), so the
// board draws Python runs with the same renderers as JavaScript ones.
import type { PyodideAPI } from 'pyodide';
import type { LiveResult, RunRequest, RunResult } from '../../trace/types';
import { DEFAULT_LIMITS } from '../run';
import tracerSource from './tracer.py?raw';

/** Numbers JSON can't carry arrive as markers (SPECIAL and NAN in tracer.py). */
const NUMBERS: Record<string, number> = { '\u0000Infinity': Infinity, '\u0000-Infinity': -Infinity, '\u0000NaN': NaN };

/** Defines the tracer in this Pyodide; call once after loading it. */
export function installTracer(py: PyodideAPI): void {
  py.runPython(tracerSource);
}

/** Runs Python code under the tracer, with the same limits as a JavaScript run. */
export function runPython(py: PyodideAPI, request: RunRequest): RunResult {
  const limits = { ...DEFAULT_LIMITS, ...request.limits };
  const runJson = py.globals.get('run_json') as ((text: string) => string) & { destroy?: () => void };
  try {
    const text = runJson(JSON.stringify({ ...request, limits }));
    return JSON.parse(text, (_key, v: unknown) => (typeof v === 'string' && v in NUMBERS ? NUMBERS[v] : v)) as RunResult;
  } finally {
    runJson.destroy?.();
  }
}

/** Live Build for Python: checks the syntax (nothing runs); an unfinished line comes back as pending. */
export function livePython(py: PyodideAPI, code: string): LiveResult {
  const liveJson = py.globals.get('live_json') as ((text: string) => string) & { destroy?: () => void };
  try {
    return JSON.parse(liveJson(code)) as LiveResult;
  } finally {
    liveJson.destroy?.();
  }
}
