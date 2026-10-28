// Runs a language adapter off the UI thread. JavaScript code is interpreted, never
// evaluated, so it cannot reach this worker's globals (fetch, storage, ...).
import { ADAPTERS } from '../engine/adapter';
import type { EngineRequest, EngineResponse } from './protocol';

self.addEventListener('message', (event: MessageEvent<EngineRequest>) => {
  const req = event.data;
  let res: EngineResponse;
  try {
    const adapter = ADAPTERS[req.language];
    if (!adapter) throw new Error(`No adapter for ${req.language}.`);
    if (req.type === 'run') res = { id: req.id, type: 'run', result: adapter.run(req.request) };
    else res = { id: req.id, type: 'live', result: adapter.live(req.code) };
  } catch (e) {
    res = { id: req.id, type: 'crash', message: e instanceof Error ? e.message : String(e) };
  }
  try {
    self.postMessage(res);
  } catch (e) {
    // A result the page can't receive (a bug in the trace) fails the same way every time; report
    // it as an engine failure, which is never retried, rather than let it look like the worker died.
    self.postMessage({
      id: req.id,
      type: 'crash',
      message: `The result could not be sent to the page: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
});
