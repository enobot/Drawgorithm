import type { LiveResult } from '../trace/types';

export interface LiveState {
  /** Latest Live Build result for the current code. */
  result: LiveResult | null;
  /** The code `result` was built from. */
  code: string | null;
  /** Last result that produced a drawing; shown as the previous valid state while code is invalid. */
  lastDrawn: LiveResult | null;
}

export function mergeLive(prev: LiveState, result: LiveResult, code: string): LiveState {
  return { result, code, lastDrawn: result.step ? result : prev.lastDrawn };
}

/** Code that parses and uses only supported syntax can be run; anything else keeps the previous drawing. */
export function canAutoRun(live: LiveState, code: string): boolean {
  const r = live.result;
  if (!r || live.code !== code) return false;
  return r.status !== 'pending' && r.error?.kind !== 'unsupported';
}
