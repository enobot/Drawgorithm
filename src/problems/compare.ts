// Compares what the code produced with what the problem expects.
import type { ExpectSpec, RunResult } from '../trace/types';

export function deepEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return a === b || Math.abs(a - b) < 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

function sortedCopy(v: unknown[]): string[] {
  return v.map((x) => JSON.stringify(x)).sort();
}

export function formatPlain(v: unknown): string {
  if (v === undefined) return 'undefined';
  try {
    return JSON.stringify(v, (_k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : x)).replace(/,(?=[^\s])/g, ', ');
  } catch {
    return String(v);
  }
}

export interface Comparison {
  match: boolean;
  /** Plain-English summary, e.g. "Expected [0, 1], got [1, 0]." */
  message: string;
  actual: string;
  expected: string;
}

export function compareRun(expect: ExpectSpec, run: RunResult): Comparison | null {
  if (run.status !== 'finished' || expect.kind === 'none') return null;
  if (expect.kind === 'return') {
    const actual = run.plainResult;
    const ok = deepEqual(actual, expect.value);
    let message = ok
      ? 'Matches the expected output.'
      : `Expected ${formatPlain(expect.value)}, but the code returned ${formatPlain(actual)}.`;
    if (!ok && Array.isArray(actual) && Array.isArray(expect.value) && actual.length === expect.value.length) {
      const a = sortedCopy(actual);
      const b = sortedCopy(expect.value);
      if (a.every((x, i) => x === b[i])) message += ' Same items in a different order; check whether this problem accepts any order.';
    }
    return { match: ok, message, actual: formatPlain(actual), expected: formatPlain(expect.value) };
  }
  const globals = run.plainGlobals ?? {};
  const names = Object.keys(expect.values);
  const wrong = names.filter((n) => !deepEqual(globals[n], expect.values[n]));
  const actual = names.map((n) => `${n} = ${n in globals ? formatPlain(globals[n]) : 'not defined'}`).join(', ');
  const expected = names.map((n) => `${n} = ${formatPlain(expect.values[n])}`).join(', ');
  return {
    match: wrong.length === 0,
    message: wrong.length === 0 ? 'Matches the expected output.' : `Expected ${expected}, but got ${actual}.`,
    actual,
    expected,
  };
}
