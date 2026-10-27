// Stale-result handling: an older run must never overwrite a newer drawing.
// The worker is replaced by a controllable fake; everything else is the real store.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runProgram } from '../engine/run';
import type { RunRequest, RunResult } from '../trace/types';

type Pending = { request: RunRequest; resolve: (r: RunResult) => void; reject: (e: Error) => void };
const pending: Pending[] = [];

vi.mock('../worker/client', () => {
  class EngineStopped extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  }
  return {
    EngineStopped,
    runInWorker: (request: RunRequest) => new Promise<RunResult>((resolve, reject) => pending.push({ request, resolve, reject })),
    stopRun: vi.fn(),
    cancelObsoleteRun: vi.fn(() => {
      // Like the real client: terminating the worker rejects the in-flight request.
      const p = pending.find((x) => !('settled' in x));
      if (p) {
        Object.assign(p, { settled: true });
        p.reject(new EngineStopped('superseded', 'cancelled'));
      }
    }),
  };
});

const { useStore } = await import('./store');
const client = await import('../worker/client');

const finish = (p: Pending) => {
  Object.assign(p, { settled: true });
  p.resolve(runProgram(p.request));
};

beforeEach(() => {
  pending.length = 0;
  useStore.getState().selectProblem('variables');
});

describe('stale-result cancellation', () => {
  it('ignores an older run that finishes after a newer one', async () => {
    const s = useStore.getState();
    s.setCode('let sum = 1;');
    const first = s.startRun({ auto: true });
    useStore.setState((st) => ({ work: { ...st.work, variables: { ...st.work.variables, code: 'let sum = 7;' } } }));
    const second = useStore.getState().startRun({ auto: true });
    expect(pending).toHaveLength(2);
    finish(pending[1]);
    await second;
    finish(pending[0]);
    await first;
    const run = useStore.getState().run;
    expect(run.codeAtRun).toBe('let sum = 7;');
    expect(run.result?.plainGlobals).toEqual({ sum: 7 });
  });

  it('cancels the in-flight run when the code is edited, and keeps the previous drawing', async () => {
    const s = useStore.getState();
    s.setCode('let sum = 2;');
    const firstRun = s.startRun();
    finish(pending[0]);
    await firstRun;
    expect(useStore.getState().run.lastGood?.codeAtRun).toBe('let sum = 2;');

    const obsolete = useStore.getState().startRun({ auto: true });
    useStore.getState().setCode('let sum = 3;');
    expect(client.cancelObsoleteRun).toHaveBeenCalled();
    await obsolete;
    const run = useStore.getState().run;
    expect(run.status).toBe('done');
    // The old trace stays paired with the code that produced it.
    expect(run.codeAtRun).toBe('let sum = 2;');
    expect(run.message).toBeNull();
  });

  it('a failed run does not replace the last successful one', async () => {
    const s = useStore.getState();
    s.setCode('let sum = 5;');
    const ok = s.startRun();
    finish(pending[0]);
    await ok;
    useStore.getState().setCode('let sum = null.x;');
    const bad = useStore.getState().startRun();
    finish(pending[1]);
    await bad;
    const run = useStore.getState().run;
    expect(run.result?.status).toBe('error');
    expect(run.lastGood?.codeAtRun).toBe('let sum = 5;');
  });
});

describe('board zoom', () => {
  it('stays within its limits, whatever the input', () => {
    const s = useStore.getState();
    s.setBoardZoom(10);
    expect(useStore.getState().boardZoom).toBe(2.5);
    s.setBoardZoom(0.01);
    expect(useStore.getState().boardZoom).toBe(0.4);
    s.setBoardZoom(Number.NaN);
    expect(useStore.getState().boardZoom).toBe(1);
  });
});
