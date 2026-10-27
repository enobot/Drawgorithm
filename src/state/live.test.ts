import { describe, expect, it } from 'vitest';
import { liveBuild } from '../engine/run';
import { canAutoRun, mergeLive, type LiveState } from './live';

describe('previous valid state while typing', () => {
  const valid = 'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\n';
  let state: LiveState = { result: null, code: null, lastDrawn: null };

  it('keeps the last valid drawing through unfinished, unsupported and failing code', () => {
    state = mergeLive(state, liveBuild(valid), valid);
    const drawn = state.lastDrawn;
    expect(drawn?.step).not.toBeNull();

    for (const bad of [valid + 'root.right = new TreeNode(', valid + 'const re = /x/;', valid + 'root.right.left = new TreeNode(1);']) {
      state = mergeLive(state, liveBuild(bad), bad);
      expect(state.result?.step).toBeNull();
      expect(state.lastDrawn).toBe(drawn);
    }
  });

  it('replaces the drawing once the code is valid again', () => {
    const code = valid + 'root.right = new TreeNode(8);\n';
    state = mergeLive(state, liveBuild(code), code);
    expect(state.lastDrawn).toBe(state.result);
    const nodes = Object.values(state.lastDrawn!.step!.heap).filter((h) => h.kind === 'object');
    expect(nodes).toHaveLength(3);
  });
});

describe('when code is run automatically after a typing pause', () => {
  const fresh: LiveState = { result: null, code: null, lastDrawn: null };
  const at = (code: string) => mergeLive(fresh, liveBuild(code), code);

  it('runs valid code, including code whose top level throws (the run reports the error)', () => {
    expect(canAutoRun(at('function f(n) { return n; }'), 'function f(n) { return n; }')).toBe(true);
    const throwing = 'const root = new TreeNode(1);\nroot.left.val = 2;\n';
    expect(canAutoRun(at(throwing), throwing)).toBe(true);
  });

  it('never runs unfinished or unsupported code', () => {
    expect(canAutoRun(at('function f(n) { return n'), 'function f(n) { return n')).toBe(false);
    expect(canAutoRun(at('const r = /a/;'), 'const r = /a/;')).toBe(false);
  });

  it('never runs against a validation result for different code', () => {
    expect(canAutoRun(at('let a = 1;'), 'let a = 2;')).toBe(false);
  });
});
