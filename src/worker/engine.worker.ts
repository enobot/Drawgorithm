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
  self.postMessage(res);
});
