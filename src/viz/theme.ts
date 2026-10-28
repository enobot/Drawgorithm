// The shared visual language for every renderer: one set of states, each with a
// color AND a text label, so meaning never depends on color alone.
// Rings are soft glows (box-shadow), not hard borders.
import { useReducedMotion } from 'motion/react';

export type VisualState = 'idle' | 'current' | 'compare' | 'visited' | 'changed' | 'new' | 'result' | 'error';

interface StateStyle {
  /** Glow around the shape. */
  ring: string;
  /** Fill of the shape. */
  fill: string;
  /** Default short label shown with the element. */
  label: string | null;
  /** Color of that label. */
  labelColor: string;
}

const CHANGED: StateStyle = {
  ring: 'shadow-[0_0_0_2px_#fcd34d,0_0_20px_-4px_rgb(251_191_36/0.6)]',
  fill: 'bg-amber-300/12',
  label: 'changed',
  labelColor: 'text-amber-200',
};

export const STATE: Record<VisualState, StateStyle> = {
  idle: { ring: 'shadow-[inset_0_0_0_1px_rgb(125_145_181/0.22)]', fill: 'bg-navy-800', label: null, labelColor: 'text-navy-400' },
  current: {
    ring: 'shadow-[0_0_0_2px_#5eead4,0_0_20px_-4px_rgb(45_212_191/0.65)]',
    fill: 'bg-teal-400/14',
    label: 'now',
    labelColor: 'text-teal-200',
  },
  compare: {
    ring: 'shadow-[0_0_0_2px_#c4b5fd,0_0_18px_-4px_rgb(167_139_250/0.6)]',
    fill: 'bg-violet-400/14',
    label: 'compared',
    labelColor: 'text-violet-200',
  },
  visited: {
    ring: 'shadow-[inset_0_0_0_1.5px_rgb(94_234_212/0.45)]',
    fill: 'bg-teal-400/8',
    label: 'visited',
    labelColor: 'text-teal-300',
  },
  changed: CHANGED,
  new: { ...CHANGED, label: 'new' },
  result: {
    ring: 'shadow-[0_0_0_2px_#6ee7b7,0_0_22px_-4px_rgb(52_211_153/0.65)]',
    fill: 'bg-emerald-400/16',
    label: 'answer',
    labelColor: 'text-emerald-200',
  },
  error: {
    ring: 'shadow-[0_0_0_2px_#fb7185,0_0_18px_-4px_rgb(251_113_133/0.6)]',
    fill: 'bg-rose-400/12',
    label: 'problem',
    labelColor: 'text-rose-200',
  },
};

/** Gentle spring used for movement that explains an action (gliding pointers, settling items). */
export const GLIDE = { type: 'spring', stiffness: 260, damping: 30 } as const;
const INSTANT = { duration: 0 } as const;

/**
 * GLIDE, or an instant change when the system asks for reduced motion. MotionConfig already
 * stops transform animations; this also covers arrows (path shapes) and pointer positions.
 */
export function useGlide(): typeof GLIDE | typeof INSTANT {
  return useReducedMotion() ? INSTANT : GLIDE;
}
/** Quick pop for a value that just changed. */
export const POP = { type: 'spring', stiffness: 520, damping: 24 } as const;

/** Tiny caption under an element naming its state (the non-color cue). */
export function stateLabel(state: VisualState, override?: string | null): string | null {
  return override === undefined ? STATE[state].label : override;
}
