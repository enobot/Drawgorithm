import type { LanguageId } from '../languages';
import type { LiveResult, RunRequest, RunResult } from '../trace/types';

export type EngineRequest =
  | { id: number; language: LanguageId; type: 'run'; request: RunRequest }
  | { id: number; language: LanguageId; type: 'live'; code: string }
  /** Python only: load the runtime before the first run, so loading isn't counted as run time. */
  | { id: number; language: LanguageId; type: 'load' };

export type EngineResponse =
  | { id: number; type: 'run'; result: RunResult }
  | { id: number; type: 'live'; result: LiveResult }
  | { id: number; type: 'loaded' }
  | { id: number; type: 'crash'; message: string };
