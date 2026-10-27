import type { LanguageId } from '../languages';
import type { LiveResult, RunRequest, RunResult } from '../trace/types';

export type EngineRequest =
  { id: number; language: LanguageId; type: 'run'; request: RunRequest } | { id: number; language: LanguageId; type: 'live'; code: string };

export type EngineResponse =
  | { id: number; type: 'run'; result: RunResult }
  | { id: number; type: 'live'; result: LiveResult }
  | { id: number; type: 'crash'; message: string };
