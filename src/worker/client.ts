// Owns the engine workers. Run and Live Build use separate workers so typing
// never waits for a long run. A stuck worker is terminated and replaced.
// Python has one worker of its own (PythonEngine): its runtime is too big to load twice.
import type { LanguageId } from '../languages';
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

export async function runInWorker(request: RunRequest, language: LanguageId = 'javascript'): Promise<RunResult> {
  if (language === 'python')
    return runResult(await python.request('run', (id) => ({ id, language, type: 'run', request }), RUN_TIME_LIMIT_MS, timeLimitMessage));
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
export async function checkInWorker(request: RunRequest, language: LanguageId = 'javascript'): Promise<RunResult> {
  if (language === 'python')
    return runResult(await python.request('check', (id) => ({ id, language, type: 'run', request }), RUN_TIME_LIMIT_MS, timeLimitMessage));
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
  python.cancel('check', 'This check was cancelled.');
}

export function stopRun(): void {
  if (runSlot.busy) runSlot.abort(new EngineStopped('stopped', 'You stopped the run.'));
  python.stop('run');
}

/** Cancels a run that no longer matches the code (the user edited again). */
export function cancelObsoleteRun(): void {
  if (runSlot.busy) runSlot.abort(new EngineStopped('superseded', 'The code changed, so this run was cancelled.'));
  python.cancel('run', 'The code changed, so this run was cancelled.');
}

export async function liveInWorker(code: string, language: LanguageId = 'javascript'): Promise<LiveResult> {
  if (language === 'python') {
    const res = await python.request(
      'live',
      (id) => ({ id, language, type: 'live', code }),
      LIVE_TIME_LIMIT_MS,
      'The Python syntax check took too long.',
    );
    if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
    if (res.type !== 'live') throw new EngineStopped('crashed', 'Unexpected engine response.');
    return res.result;
  }
  const res = await liveSlot.send(
    (id) => ({ id, language: 'javascript', type: 'live', code }),
    LIVE_TIME_LIMIT_MS,
    'Live Build took too long.',
  );
  if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
  if (res.type !== 'live') throw new EngineStopped('crashed', 'Unexpected engine response.');
  return res.result;
}

const timeLimitMessage = `Stopped after ${RUN_TIME_LIMIT_MS / 1000} seconds without finishing.`;

function runResult(res: EngineResponse): RunResult {
  if (res.type === 'crash') throw new EngineStopped('crashed', res.message);
  if (res.type !== 'run') throw new EngineStopped('crashed', 'Unexpected engine response.');
  return res.result;
}

/** Loading Python (about 10 MB the first time) gets its own, longer limit; run limits start after it. */
const PYTHON_LOAD_LIMIT_MS = 120_000;

type PythonChannel = 'run' | 'live' | 'check';

/**
 * The Python worker. Run, Live Build and checks share it, because the runtime is too big to
 * load once per purpose. A newer request on a channel makes the older one obsolete without
 * terminating the worker (the old answer is dropped), so the runtime stays loaded; Stop and
 * time limits terminate it, the only way to interrupt running Python.
 */
class PythonEngine {
  private worker: Worker | null = null;
  private loaded: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { channel: PythonChannel | 'load'; resolve: (r: EngineResponse) => void; reject: (e: Error) => void; timer: number }
  >();
  state: 'idle' | 'loading' | 'ready' = 'idle';

  private ensure(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
      this.worker.addEventListener('message', (e: MessageEvent<EngineResponse>) => {
        const p = this.pending.get(e.data.id);
        // Nobody waits for an answer that was made obsolete.
        if (!p) return;
        window.clearTimeout(p.timer);
        this.pending.delete(e.data.id);
        p.resolve(e.data);
      });
      this.worker.addEventListener('error', (e) => {
        this.terminate(new EngineStopped('crashed', `The Python worker crashed: ${e.message || 'unknown error'}`, true));
      });
    }
    return this.worker;
  }

  private send(channel: PythonChannel | 'load', make: (id: number) => EngineRequest, timeoutMs: number, timeoutMessage: string) {
    if (channel !== 'load') this.cancel(channel, 'Replaced by a newer request.');
    const worker = this.ensure();
    const id = this.nextId++;
    return new Promise<EngineResponse>((resolve, reject) => {
      const timer = window.setTimeout(() => this.terminate(new EngineStopped('timeout', timeoutMessage)), timeoutMs);
      this.pending.set(id, { channel, resolve, reject, timer });
      worker.postMessage(make(id));
    });
  }

  private load(): Promise<void> {
    if (!this.loaded) {
      this.state = 'loading';
      const loading = this.send(
        'load',
        (id) => ({ id, language: 'python', type: 'load' }),
        PYTHON_LOAD_LIMIT_MS,
        'Python took more than two minutes to load. Check the connection and try again.',
      ).then((res) => {
        if (res.type !== 'loaded') {
          throw new EngineStopped(
            'crashed',
            res.type === 'crash' ? `Python could not load: ${res.message}` : 'Unexpected engine response.',
          );
        }
        this.state = 'ready';
      });
      this.loaded = loading;
      loading.catch(() => {
        if (this.loaded === loading) {
          this.loaded = null;
          this.state = 'idle';
        }
      });
    }
    return this.loaded;
  }

  async request(channel: PythonChannel, make: (id: number) => EngineRequest, timeoutMs: number, timeoutMessage: string) {
    await this.load();
    return this.send(channel, make, timeoutMs, timeoutMessage);
  }

  /** Drops the unfinished request on `channel`; the worker keeps running (and keeps Python loaded). */
  cancel(channel: PythonChannel, message: string): void {
    for (const [id, p] of this.pending) {
      if (p.channel !== channel) continue;
      window.clearTimeout(p.timer);
      this.pending.delete(id);
      p.reject(new EngineStopped('superseded', message));
    }
  }

  stop(channel: PythonChannel): void {
    if ([...this.pending.values()].some((p) => p.channel === channel)) this.terminate(new EngineStopped('stopped', 'You stopped the run.'));
  }

  private terminate(err: EngineStopped): void {
    const waiting = [...this.pending.values()];
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    this.loaded = null;
    this.state = 'idle';
    for (const p of waiting) {
      window.clearTimeout(p.timer);
      p.reject(err);
    }
  }
}

const python = new PythonEngine();

/** Whether Python is loaded, loading (the first run downloads it), or not started. */
export function pythonRuntimeState(): PythonEngine['state'] {
  return python.state;
}
