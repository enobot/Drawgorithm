// The worker's message handler: every request gets exactly one response the page can receive.
// The adapter is replaced so a result can be made that can't be copied to the page.
import { describe, expect, it, vi } from 'vitest';
import type { EngineRequest, EngineResponse } from './protocol';

const adapter = vi.hoisted(() => ({ result: {} as unknown }));
vi.mock('../engine/adapter', () => ({
  ADAPTERS: { javascript: { run: () => adapter.result, live: () => adapter.result } },
}));

async function loadWorker() {
  let handler: ((e: MessageEvent<EngineRequest>) => void) | undefined;
  const posted: EngineResponse[] = [];
  vi.stubGlobal('self', {
    addEventListener: (_type: string, fn: typeof handler) => (handler = fn),
    // Like a real worker, the message is structured-cloned, which throws for a function.
    postMessage: (m: EngineResponse) => posted.push(structuredClone(m)),
  });
  vi.resetModules();
  await import('./engine.worker');
  const run = (id: number) =>
    handler!({
      data: { id, language: 'javascript', type: 'run', request: { code: '', mode: 'script', inputs: [] } },
    } as unknown as MessageEvent<EngineRequest>);
  return { run, posted };
}

describe('engine worker', () => {
  it('sends a finished result back with the request id', async () => {
    adapter.result = { status: 'finished', steps: [] };
    const { run, posted } = await loadWorker();
    run(7);
    expect(posted).toEqual([{ id: 7, type: 'run', result: { status: 'finished', steps: [] } }]);
  });

  it('reports a result that cannot be sent as an engine failure instead of an uncaught error', async () => {
    // A bug that left a function in the trace fails the same way every time. As an engine
    // failure it is reported and never retried; as an uncaught error it would look like the
    // worker died, which Check all tests retries.
    adapter.result = { status: 'finished', steps: [], oops: () => 1 };
    const { run, posted } = await loadWorker();
    expect(() => run(8)).not.toThrow();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ id: 8, type: 'crash' });
    expect((posted[0] as { message: string }).message).toMatch(/could not be sent/);
  });
});
