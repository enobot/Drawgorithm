// The gumdrop rules: which arrays become a row, how tall each body is, its state and where it
// looks; and that its colors stay readable on the dark board (WCAG 1.4.3 text, 1.4.11 shapes).
import { describe, expect, it } from 'vitest';
import type { ValueSnap } from '../../trace/types';
import { GUM, GUM_FILL, GUM_WORD, GUM_WORD_COLOR, MAX_GUMDROPS, SLEEPY_FILL, bodyHeight, gaze, gumState, numbersOf } from './gumdrop';

const num = (v: number): ValueSnap => ({ t: 'number', v });

/** WCAG contrast ratio of two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('numbersOf', () => {
  it('takes a row of finite numbers, negatives and zero included', () => {
    expect(numbersOf([num(2), num(-7), num(0)])).toEqual([2, -7, 0]);
  });

  it('refuses anything that is not a number, and empty or long rows', () => {
    expect(numbersOf([num(1), { t: 'string', v: '2' }])).toBeNull();
    expect(numbersOf([num(1), { t: 'ref', id: 3 }])).toBeNull();
    expect(numbersOf([num(Number.NaN)])).toBeNull();
    expect(numbersOf([num(Infinity)])).toBeNull();
    expect(numbersOf([])).toBeNull();
    expect(numbersOf(Array.from({ length: MAX_GUMDROPS + 1 }, (_, i) => num(i)))).toBeNull();
    expect(numbersOf(Array.from({ length: MAX_GUMDROPS }, (_, i) => num(i)))).toHaveLength(MAX_GUMDROPS);
  });
});

describe('bodyHeight', () => {
  it('draws zero flat and the largest value at full height', () => {
    expect(bodyHeight(0, 15)).toBe(GUM.zeroBody);
    expect(bodyHeight(15, 15)).toBe(GUM.maxBody);
  });

  it('grows with the value and keeps tiny values visible', () => {
    expect(bodyHeight(2, 15)).toBeLessThan(bodyHeight(7, 15));
    expect(bodyHeight(7, 15)).toBeLessThan(bodyHeight(11, 15));
    expect(bodyHeight(1, 1000)).toBeGreaterThanOrEqual(GUM.minBody);
    expect(bodyHeight(1, 1000)).toBeGreaterThan(GUM.zeroBody);
  });

  it('sizes a negative value by its size', () => {
    expect(bodyHeight(-9, 9)).toBe(bodyHeight(9, 9));
  });

  it('copes with a row of zeros', () => {
    expect(bodyHeight(0, 0)).toBe(GUM.zeroBody);
  });
});

describe('gumState', () => {
  const none = new Set<number>();
  it('puts the answer first, then writes, then reads', () => {
    expect(gumState(1, { reads: new Set([1]), writes: new Set([1]), result: new Set([1]), comparing: true })).toBe('done');
    expect(gumState(1, { reads: new Set([1]), writes: new Set([1]), comparing: true })).toBe('changed');
    expect(gumState(1, { reads: new Set([1]), writes: none, comparing: true })).toBe('compare');
    expect(gumState(1, { reads: new Set([1]), writes: none, comparing: false })).toBe('read');
    expect(gumState(0, { reads: new Set([1]), writes: none, comparing: false })).toBe('idle');
  });
});

describe('gaze', () => {
  it('looks at the nearest other slot read in the same step', () => {
    expect(gaze(1, new Set([1, 4]), false)).toEqual({ x: 1, y: 0 });
    expect(gaze(4, new Set([1, 4]), false)).toEqual({ x: -1, y: 0 });
    expect(gaze(3, new Set([0, 3, 4]), false)).toEqual({ x: 1, y: 0 });
  });

  it('looks down at the notebook when the step looked a value up', () => {
    expect(gaze(2, new Set([2]), true)).toEqual({ x: 0, y: 1 });
  });

  it('looks ahead when the step did not read it', () => {
    expect(gaze(0, new Set([2]), true)).toEqual({ x: 0, y: 0 });
    expect(gaze(2, new Set([2]), false)).toEqual({ x: 0, y: 0 });
  });
});

describe('colors on the dark board', () => {
  const BOARD = '#0b1322';
  it('bodies stand out from the board (3:1 for shapes)', () => {
    for (const fill of [...Object.values(GUM_FILL), SLEEPY_FILL]) expect(contrast(fill, BOARD)).toBeGreaterThanOrEqual(3);
  });

  it('state words are readable text (4.5:1) and every non-idle state has one', () => {
    for (const color of Object.values(GUM_WORD_COLOR)) expect(contrast(color, BOARD)).toBeGreaterThanOrEqual(4.5);
    for (const [state, word] of Object.entries(GUM_WORD)) if (state !== 'idle') expect(word).toBeTruthy();
  });
});
