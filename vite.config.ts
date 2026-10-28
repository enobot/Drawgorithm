import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pyodideAssets } from './vite.pyodide.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), pyodideAssets()],
  worker: { format: 'es' },
  // Pyodide loads its own files at run time; Vite must not pre-bundle it.
  optimizeDeps: { exclude: ['pyodide'] },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The module cache keys a file by its own source, so an import.meta.glob (the Python answers
    // and demos) would keep the file list of an earlier run (vitest.dev/config/fsmodulecache warns
    // about this for anything that reads a folder). Without it a full run is under 1 s slower.
    fsModuleCache: false,
  },
});
