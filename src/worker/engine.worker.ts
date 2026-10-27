// Runs the interpreter off the UI thread. User code is interpreted, never
// evaluated, so it cannot reach this worker's globals (fetch, storage, ...).
import { liveBuild, runProgram } from '../engine/run';
import type { EngineRequest, EngineResponse } from './protocol';

self.addEventListener('message', (event: MessageEvent<EngineRequest>) => {
  const req = event.data;
  let res: EngineResponse;
  try {
    if (req.type === 'run') res = { id: req.id, type: 'run', result: runProgram(req.request) };
    else res = { id: req.id, type: 'live', result: liveBuild(req.code) };
  } catch (e) {
    res = { id: req.id, type: 'crash', message: e instanceof Error ? e.message : String(e) };
  }
  self.postMessage(res);
});
