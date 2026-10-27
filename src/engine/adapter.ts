// The boundary every language adapter implements. An adapter validates code for
// Live Build and runs it, producing the shared trace format in trace/types.ts.
// Only JavaScript is implemented; see docs/COVERAGE.md before adding another.
import type { LanguageId } from '../languages';
import type { LiveResult, RunRequest, RunResult } from '../trace/types';
import { liveBuild, runProgram } from './run';

export interface LanguageAdapter {
  id: LanguageId;
  /** Structural preview of top-level code; never runs function bodies. */
  live(code: string): LiveResult;
  /** Full run with step tracing, within the adapter's limits. */
  run(request: RunRequest): RunResult;
}

export const ADAPTERS: Partial<Record<LanguageId, LanguageAdapter>> = {
  javascript: { id: 'javascript', live: liveBuild, run: runProgram },
};
