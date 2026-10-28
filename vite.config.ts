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
  },
});
