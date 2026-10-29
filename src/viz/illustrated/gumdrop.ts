// The gumdrop cast (docs/DESIGN_SYSTEM.md): pastel characters whose height is the number they
// hold. These are the sizing, state and gaze rules, kept apart from the drawing so they can be
// tested. Everything comes from the trace: which slots the step read or wrote, the answer cells.
import type { ValueSnap } from '../../trace/types';

/** Longer arrays keep the shelf or cell drawing (a row of characters would get too thin). */
export const MAX_GUMDROPS = 16;

/** Sizes in SVG units. */
export const GUM = {
  /** Width of one slot in the row. */
  slot: 64,
  /** Width of a body. */
  width: 46,
  /** The smallest non-zero body, so 1 next to 1,000 is still a character. */
  minBody: 28,
  /** The largest |value| in the row gets this height. */
  maxBody: 104,
  /** Zero: a flat, sleepy gumdrop. */
  zeroBody: 15,
} as const;

/** A gumdrop's state. Each one also has a word, so color is never the only cue. */
export type GumState = 'idle' | 'read' | 'compare' | 'changed' | 'done';

/** Body colors (pastel fills on the dark board; never used for text). */
export const GUM_FILL: Record<GumState, string> = {
  idle: '#F4B6CC', // pink
  read: '#C6B5F2', // lavender: the one being looked at
  compare: '#C6B5F2', // lavender: being compared
  changed: '#F5D98C', // butter: just written
  done: '#9EE3C8', // mint: part of the answer
};
/** A sleeping zero, when nothing else is happening to it. */
export const SLEEPY_FILL = '#DCD0E6';

/** The word under a gumdrop for its state (the same words the technical drawing uses). */
export const GUM_WORD: Record<GumState, string | null> = {
  idle: null,
  read: 'now',
  compare: 'compared',
  changed: 'changed',
  done: 'answer',
};

/** Light text colors for those words on the dark board (each at least 4.5:1). */
export const GUM_WORD_COLOR: Record<GumState, string> = {
  idle: '#a6b5d2',
  read: '#ddd6fe',
  compare: '#ddd6fe',
  changed: '#fde68a',
  done: '#a7f3d0',
};

/** The row's numbers, or null when the array holds anything else or is too long for a row. */
export function numbersOf(items: ValueSnap[]): number[] | null {
  if (!items.length || items.length > MAX_GUMDROPS) return null;
  const out: number[] = [];
  for (const v of items) {
    if (v.t !== 'number' || !Number.isFinite(v.v)) return null;
    out.push(v.v);
  }
  return out;
}

/**
 * Body height for a value: zero is flat; any other value scales with its size against the
 * largest size in the row, never below `minBody`. Negative values use their size and hang
 * below the line (the scene draws them downward).
 */
export function bodyHeight(value: number, maxAbs: number): number {
  if (value === 0) return GUM.zeroBody;
  const share = maxAbs > 0 ? Math.min(1, Math.abs(value) / maxAbs) : 1;
  return Math.round(GUM.minBody + share * (GUM.maxBody - GUM.minBody));
}

/** Answer cells first, then a write, then a read (a read on a check is a comparison). */
export function gumState(
  i: number,
  { reads, writes, result, comparing }: { reads: Set<number>; writes: Set<number>; result?: Set<number>; comparing: boolean },
): GumState {
  if (result?.has(i)) return 'done';
  if (writes.has(i)) return 'changed';
  if (reads.has(i)) return comparing ? 'compare' : 'read';
  return 'idle';
}

/**
 * Where a gumdrop's pupils look, each axis −1..1: toward the nearest other slot read in the
 * same step (the one it is compared with), or down at the notebook when this step looked a
 * value up. Gumdrops the step didn't read look straight ahead.
 */
export function gaze(i: number, reads: Set<number>, lookingDown: boolean): { x: number; y: number } {
  if (!reads.has(i)) return { x: 0, y: 0 };
  const others = [...reads].filter((j) => j !== i);
  if (others.length) {
    const nearest = others.reduce((a, b) => (Math.abs(b - i) < Math.abs(a - i) ? b : a));
    return { x: Math.sign(nearest - i), y: 0 };
  }
  return { x: 0, y: lookingDown ? 1 : 0 };
}
