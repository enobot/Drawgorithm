import { describe, expect, it } from 'vitest';
import { liveBuild } from '../engine/run';
import { missingInputs } from './inputs';

const hintsFor = (code: string) => liveBuild(code).hints;

describe('asking for missing inputs', () => {
  it('lists parameters the inputs do not cover', () => {
    const hints = hintsFor('function maxSum(nums, k) { return 0; }');
    expect(missingInputs({ mode: 'function' }, ['nums'], hints)).toEqual({ fn: 'maxSum', names: ['k'] });
  });

  it('offers every parameter when a pasted problem had no examples', () => {
    const hints = hintsFor('function solve(grid, start) { return 0; }');
    expect(missingInputs({ mode: 'function' }, [], hints).names).toEqual(['grid', 'start']);
  });

  it('matches by position when the names differ, like Run does', () => {
    const hints = hintsFor('function twoSum(arr, t) { return []; }');
    expect(missingInputs({ mode: 'function', entry: 'twoSum' }, ['nums', 'target'], hints).names).toEqual([]);
    expect(missingInputs({ mode: 'function', entry: 'twoSum' }, ['nums'], hints).names).toEqual(['t']);
  });

  it('ignores rest parameters and scripts', () => {
    expect(missingInputs({ mode: 'function' }, ['a'], hintsFor('function f(a, ...rest) {}')).names).toEqual([]);
    expect(missingInputs({ mode: 'script' }, [], hintsFor('function f(a) {}')).names).toEqual([]);
  });
});
