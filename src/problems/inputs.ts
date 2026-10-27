import type { StaticHints } from '../trace/types';
import type { ProblemDef } from './catalog';

/** Parameters of the function Run will call that have no matching input. */
export function missingInputs(
  p: Pick<ProblemDef, 'entry' | 'mode'>,
  inputNames: string[],
  hints: StaticHints | undefined,
): { fn: string; names: string[] } {
  const fns = hints?.functions ?? [];
  const fn = (p.entry ? fns.find((f) => f.name === p.entry) : fns[0]) ?? null;
  if (!fn || p.mode !== 'function') return { fn: '', names: [] };
  const params = fn.params.filter((n) => !n.startsWith('...') && n !== '…');
  // Run matches inputs by name when every input name is a parameter, otherwise by position.
  const byName = inputNames.length > 0 && inputNames.every((n) => params.includes(n));
  const names = byName || inputNames.length === 0 ? params.filter((n) => !inputNames.includes(n)) : params.slice(inputNames.length);
  return { fn: fn.name, names };
}
