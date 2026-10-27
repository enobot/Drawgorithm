import type { LiveResult } from '../trace/types';

export interface LiveState {
  /** Latest Live Build result for the current code. */
  result: LiveResult | null;
  /** Last result that produced a drawing; shown as the previous valid state while code is invalid. */
  lastDrawn: LiveResult | null;
}

export function mergeLive(prev: LiveState, result: LiveResult): LiveState {
  return { result, lastDrawn: result.step ? result : prev.lastDrawn };
}
