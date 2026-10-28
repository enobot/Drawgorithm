// Owns the engine workers. Run and Live Build use separate workers so typing
// never waits for a long run. A stuck worker is terminated and replaced.
import type { LiveResult, RunRequest, RunResult } from '../trace/types';
import type { EngineRequest, EngineResponse } from './protocol';

export const RUN_TIME_LIMIT_MS = 6000;
const LIVE_TIME_LIMIT_MS = 1500;

export class EngineStopped extends Error {
  /** superseded: a newer request (or an edit) made this one obsolete. */
  reason: 'stopped' | 'timeout' | 'crashed' | 'superseded';
  /**
   * For 'crashed': true when the worker itself died (an error event), false when the engine
   * threw while running the code and reported it. A reported failure is deterministic: the
   * same code and input fail the same way, so it is never worth retrying.
   */
  workerDied: boolean;
  constructor(reason: EngineStopped['reason'], message: string, workerDied = false) {
    super(message);
    this.reason = reason;
    this.workerDied = workerDied;
  }
}

class WorkerSlot {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending: { id: number; resolve: (r: EngineResponse) => void; reject: (e: Error) => void; timer: number } | null = null;

  private ensure(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
      this.worker.addEventListener('message', (e: MessageEvent<EngineResponse>) => {
        const p = this.pending;
        if (!p || p.id !== e.data.id) return;
        window.clearTimeout(p.timer);
        this.pending = null;
        p.resolve(e.data);
      });
      this.worker.addEventListener('error', (e) => {
        this.abort(new EngineStopped('crashed', `The engine worker crashed: ${e.message || 'unknown error'}`, true));
      });
    }
    return this.worker;
  }

  send(make: (id: number) => EngineRequest, timeoutMs: number, timeoutMessage: string): Promise<EngineResponse> {
    // A new request replaces any unfinished one.
    if (this.pending) this.abort(new EngineStopped('superseded', 'Replaced by a newer request.'));
    const worker = this.ensure();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => this.abort(new EngineStopped('timeout', timeoutMessage)), timeoutMs);
      this.pending = { id, resolve, reject, timer };
      worker.postMessage(make(id));
    });
  }

  get busy(): boolean {
    return this.pending !== null;
  }

  abort(err: EngineStopped): void {
    const p = this.pending;
    this.pending = null;
    if (p) window.clearTimeout(p.timer);
    // The worker may be stuck inside a long computation; terminating is the only way to stop it.
    this.worker?.terminate();
    this.worker = null;
    p?.reject(err);
  }
}

const runSlot = new WorkerSlot();
const liveSlot = new WorkerSlot();
/** Practice "Check all tests" runs here, so checking never cancels the run being watched. */
const checkSlot = new WorkerSlot();

export async function runInWorker(request: RunRequest): Promise<RunResult> {
  const res = await runSlot.send(
    (id) => ({ id, language: 'javascript', type: 'run', request }),
    RUN_TIME_LIMIT_MS,
    `Stopped after ${RUN_TIME_LIMIT_MS / 1000} seconds without finishing.`,
  );
  if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
  if (res.type !== 'run') throw new EngineStopped('crashed', 'Unexpected engine response.');
  return res.result;
}

/** Runs code for a test check, with the same isolation and limits as a normal run. */
export async function checkInWorker(request: RunRequest): Promise<RunResult> {
  const res = await checkSlot.send(
    (id) => ({ id, language: 'javascript', type: 'run', request }),
    RUN_TIME_LIMIT_MS,
    `Stopped after ${RUN_TIME_LIMIT_MS / 1000} seconds without finishing.`,
  );
  if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
  if (res.type !== 'run') throw new EngineStopped('crashed', 'Unexpected engine response.');
  return res.result;
}

/** Abandons an unfinished test check (the learner left the exercise or started a new check). */
export function cancelCheck(): void {
  if (checkSlot.busy) checkSlot.abort(new EngineStopped('superseded', 'This check was cancelled.'));
}

export function stopRun(): void {
  if (runSlot.busy) runSlot.abort(new EngineStopped('stopped', 'You stopped the run.'));
}

/** Cancels a run that no longer matches the code (the user edited again). */
export function cancelObsoleteRun(): void {
  if (runSlot.busy) runSlot.abort(new EngineStopped('superseded', 'The code changed, so this run was cancelled.'));
}

export async function liveInWorker(code: string): Promise<LiveResult> {
  const res = await liveSlot.send(
    (id) => ({ id, language: 'javascript', type: 'live', code }),
    LIVE_TIME_LIMIT_MS,
    'Live Build took too long.',
  );
  if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
  if (res.type !== 'live') throw new EngineStopped('crashed', 'Unexpected engine response.');
  return res.result;
}
