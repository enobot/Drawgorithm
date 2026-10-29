// Finds the steps of a recorded run that a guide's moments describe, so "Show on the board"
// can jump to the step where the reference answer really did what the guide says.
import type { LanguageId } from '../languages';
import type { Heap, Step, ValueSnap } from '../trace/types';
import { codeIn, type Moment, type MomentValue } from './schema';

/** 1-based number of the first line of `code` containing `fragment`, or 0 when no line does. */
export function lineOf(code: string, fragment: string): number {
  return code.split('\n').findIndex((l) => l.includes(fragment)) + 1;
}

function valueMatches(v: ValueSnap | undefined, want: MomentValue, heap: Heap): boolean {
  if (!v) return false;
  if (want === null) return v.t === 'null';
  if (typeof want !== 'object') return v.t === typeof want && 'v' in v && v.v === want;
  if (v.t !== 'ref') return false;
  const h = heap[v.id];
  if (Array.isArray(want)) {
    return (
      h?.kind === 'array' &&
      h.total === want.length &&
      h.items.length === want.length &&
      h.items.every((x, i) => valueMatches(x, want[i], heap))
    );
  }
  if (h?.kind !== 'object') return false;
  return valueMatches(h.entries.find(([k]) => k === 'val')?.[1], want.node, heap);
}

function stepMatches(s: Step, line: number, m: Moment): boolean {
  if (s.kind === 'enter' || s.loc?.line !== line) return false;
  const frame = s.frames[s.frames.length - 1];
  if (!frame) return false;
  return Object.entries(m.vars).every(([name, want]) => valueMatches(frame.vars.find((v) => v.name === name)?.value, want, s.heap));
}

/**
 * The step index of each moment, searched in order (each after the previous one's step).
 * Once a moment isn't found, it and every later one are null: their place in the run is unknown.
 */
export function findMoments(steps: Step[], code: string, language: LanguageId, moments: Moment[]): (number | null)[] {
  const out: (number | null)[] = [];
  let from = 0;
  for (const m of moments) {
    const line = lineOf(code, codeIn(m.line, language));
    const at = line ? steps.findIndex((s, i) => i >= from && stepMatches(s, line, m)) : -1;
    if (at < 0) break;
    out.push(at);
    from = at + 1;
  }
  while (out.length < moments.length) out.push(null);
  return out;
}
