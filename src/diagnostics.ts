// Timing marks for the edit → drawing pipeline. They appear in the browser's Performance
// panel as "drawgorithms:…" measures. Nothing is sent anywhere, and nothing about the
// code or the person is recorded: only durations, and a status word.

/** Provisional budgets (see docs/DEPLOYMENT.md); a slower event is noted in the console while developing. */
const BUDGET_MS: Record<string, number> = {
  'edit-to-live': 600,
  'edit-to-run': 2000,
};

export function markSince(name: keyof typeof BUDGET_MS | string, start: number, status?: string): void {
  const end = performance.now();
  try {
    performance.measure(`drawgorithms:${name}`, { start, end, detail: status ? { status } : undefined });
  } catch {
    // performance.measure with options is missing in very old browsers; timing is optional.
  }
  const budget = BUDGET_MS[name];
  if (import.meta.env.DEV && budget !== undefined && end - start > budget) {
    console.debug(`[drawgorithms] ${name} took ${Math.round(end - start)} ms (budget ${budget} ms)${status ? `, ${status}` : ''}`);
  }
}
