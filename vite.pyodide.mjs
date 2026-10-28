// Pyodide's runtime files (the WebAssembly CPython and its standard library), served by this
// site at /pyodide/<version>/ so Python never loads code from a third party. The dev server
// streams them from node_modules; the build copies them into dist. Plain JavaScript because
// it uses Node's file APIs, which the app's TypeScript setup has no types for.
import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const FILES = {
  'pyodide.asm.mjs': 'text/javascript',
  'pyodide.asm.wasm': 'application/wasm',
  'python_stdlib.zip': 'application/zip',
  'pyodide-lock.json': 'application/json',
};

/** @returns {import('vite').Plugin} */
export function pyodideAssets() {
  const dir = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
  const { version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const prefix = `/pyodide/${version}/`;
  return {
    name: 'drawgorithms-pyodide-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        const file = path.startsWith(prefix) ? path.slice(prefix.length) : '';
        if (!FILES[file]) return next();
        res.setHeader('Content-Type', FILES[file]);
        createReadStream(join(dir, file)).pipe(res);
      });
    },
    generateBundle() {
      for (const file of Object.keys(FILES)) {
        this.emitFile({ type: 'asset', fileName: `pyodide/${version}/${file}`, source: readFileSync(join(dir, file)) });
      }
    },
  };
}
