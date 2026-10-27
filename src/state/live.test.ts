import { describe, expect, it } from 'vitest';
import { liveBuild } from '../engine/run';
import { mergeLive, type LiveState } from './live';

describe('previous valid state while typing', () => {
  const valid = 'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\n';
  let state: LiveState = { result: null, lastDrawn: null };

  it('keeps the last valid drawing through unfinished, unsupported and failing code', () => {
    state = mergeLive(state, liveBuild(valid));
    const drawn = state.lastDrawn;
    expect(drawn?.step).not.toBeNull();

    for (const bad of [valid + 'root.right = new TreeNode(', valid + 'const re = /x/;', valid + 'root.right.left = new TreeNode(1);']) {
      state = mergeLive(state, liveBuild(bad));
      expect(state.result?.step).toBeNull();
      expect(state.lastDrawn).toBe(drawn);
    }
  });

  it('replaces the drawing once the code is valid again', () => {
    state = mergeLive(state, liveBuild(valid + 'root.right = new TreeNode(8);\n'));
    expect(state.lastDrawn).toBe(state.result);
    const nodes = Object.values(state.lastDrawn!.step!.heap).filter((h) => h.kind === 'object');
    expect(nodes).toHaveLength(3);
  });
});
