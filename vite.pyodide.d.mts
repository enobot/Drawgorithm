import type { Plugin } from 'vite';

/** Serves and copies Pyodide's runtime files at /pyodide/<version>/ (see vite.pyodide.mjs). */
export function pyodideAssets(): Plugin;
