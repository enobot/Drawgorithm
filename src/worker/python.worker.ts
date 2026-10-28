// Runs Python off the UI thread with Pyodide (CPython compiled to WebAssembly). The runtime
// loads once per worker and stays loaded between runs; tracer.py records the trace. Its files
// are served by this site (see vite.pyodide.mjs), never by a third party.
import { loadPyodide, version, type PyodideAPI } from 'pyodide';
import { installTracer, livePython, runPython } from '../engine/python/runPython';
import type { EngineRequest, EngineResponse } from './protocol';

let runtime: Promise<PyodideAPI> | null = null;

/**
 * Pyodide only logs a warning when its WebAssembly can't be fetched or compiled, and then never
 * finishes loading. These checks find both causes first, so the page can say what is wrong.
 */
async function checkCanLoad(indexURL: string): Promise<void> {
  try {
    // The smallest valid module: compiling it fails only if the page's security policy forbids WebAssembly.
    new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
  } catch {
    throw new Error("This page's security policy blocks WebAssembly, which Python needs (script-src must allow 'wasm-unsafe-eval').");
  }
  for (const file of ['pyodide.asm.wasm', 'python_stdlib.zip']) {
    let ok = false;
    let status: string;
    try {
      const res = await fetch(indexURL + file, { method: 'HEAD' });
      ok = res.ok;
      status = `HTTP ${res.status}`;
    } catch (e) {
      status = e instanceof Error ? e.message : String(e);
    }
    if (!ok) throw new Error(`Python's runtime (${file}) could not be downloaded: ${status}. Check the connection and press Run again.`);
  }
}

function load(): Promise<PyodideAPI> {
  const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/${version}/`, self.location.href).href;
  runtime ??= checkCanLoad(indexURL)
    .then(() => loadPyodide({ indexURL }))
    .then((py) => {
      installTracer(py);
      return py;
    });
  return runtime;
}

// Requests are handled one at a time, in order: a run is synchronous inside Pyodide anyway.
let queue: Promise<void> = Promise.resolve();

self.addEventListener('message', (event: MessageEvent<EngineRequest>) => {
  const req = event.data;
  queue = queue.then(async () => {
    let res: EngineResponse;
    try {
      let py: PyodideAPI;
      try {
        py = await load();
      } catch (e) {
        // A failed load is not kept, so the next request tries again.
        runtime = null;
        throw e;
      }
      if (req.type === 'load') res = { id: req.id, type: 'loaded' };
      else if (req.type === 'run') res = { id: req.id, type: 'run', result: runPython(py, req.request) };
      else res = { id: req.id, type: 'live', result: livePython(py, req.code) };
    } catch (e) {
      res = { id: req.id, type: 'crash', message: e instanceof Error ? e.message : String(e) };
    }
    try {
      self.postMessage(res);
    } catch (e) {
      self.postMessage({
        id: req.id,
        type: 'crash',
        message: `The result could not be sent to the page: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  });
});
