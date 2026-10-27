import { describe, expect, it } from 'vitest';
import { liveBuild, runProgram } from '../engine/run';
import { problemById } from '../problems/catalog';
import type { LiveResult } from '../trace/types';
import {
  buildListDiagram,
  buildTraversalIndex,
  buildTreeDiagram,
  field,
  markersFor,
  nodeLabels,
  nodeValueLabel,
  traversalAt,
  variableRefs,
  windowOf,
  type ObjectSnap,
} from './analysis';

function treeOf(live: LiveResult) {
  const step = live.step!;
  const { order, referenced } = variableRefs(step.frames);
  return { diagram: buildTreeDiagram(step.heap, order, referenced), heap: step.heap };
}

function valueAt(heap: LiveResult['step'] extends infer S ? (S extends { heap: infer H } ? H : never) : never, id: number) {
  return nodeValueLabel(heap[id] as ObjectSnap, heap);
}

describe('tree diagram', () => {
  it('places children below and to each side of their parent', () => {
    const { diagram, heap } = treeOf(liveBuild(problemById('tree-build')!.starter));
    expect(diagram.components).toHaveLength(1);
    const pos = Object.fromEntries(diagram.components[0].nodes.map((n) => [valueAt(heap, n.id), n]));
    expect(pos['5']).toMatchObject({ depth: 0, slotX: 0.5 });
    expect(pos['3']).toMatchObject({ depth: 1, slotX: 0.25, path: 'L' });
    expect(pos['8']).toMatchObject({ depth: 1, slotX: 0.75, path: 'R' });
    expect(pos['4']).toMatchObject({ depth: 2, slotX: 0.375, path: 'LR' });
    expect(diagram.issues).toEqual([]);
  });

  it('keeps existing node positions when a node is added', () => {
    const base = 'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\n';
    const before = treeOf(liveBuild(base));
    const after = treeOf(liveBuild(base + 'root.right = new TreeNode(8);\nroot.left.left = new TreeNode(1);\n'));
    const slots = (t: ReturnType<typeof treeOf>) =>
      Object.fromEntries(t.diagram.components[0].nodes.map((n) => [valueAt(t.heap, n.id), [n.depth, n.slotX]]));
    const a = slots(before);
    const b = slots(after);
    expect(b['5']).toEqual(a['5']);
    expect(b['3']).toEqual(a['3']);
  });

  it('records null children so they can be drawn', () => {
    const { diagram } = treeOf(liveBuild('const root = new TreeNode(5);\nroot.left = new TreeNode(3);\n'));
    const sides = diagram.components[0].nulls.map((n) => n.side).sort();
    expect(sides).toEqual(['left', 'right', 'right']);
  });

  it('marks a cycle edge and explains it', () => {
    const { diagram } = treeOf(liveBuild('const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.left.right = root;\n'));
    const cycle = diagram.components[0].edges.find((e) => e.kind === 'cycle');
    expect(cycle).toMatchObject({ side: 'right' });
    expect(diagram.issues.find((i) => i.kind === 'cycle')?.text).toContain('the right child of node 3 points back to node 5');
  });

  it('marks a self-loop as a cycle', () => {
    const { diagram } = treeOf(liveBuild('const root = new TreeNode(5);\nroot.left = root;\n'));
    expect(diagram.issues[0].text).toContain('points back to itself');
  });

  it('marks a node with two parents as shared', () => {
    const { diagram } = treeOf(
      liveBuild('const root = new TreeNode(5);\nconst kid = new TreeNode(7);\nroot.left = kid;\nroot.right = kid;\n'),
    );
    expect(diagram.components[0].edges.filter((e) => e.kind === 'shared')).toHaveLength(1);
    expect(diagram.issues.find((i) => i.kind === 'shared')?.text).toContain('node 7 has 2 parents');
  });

  it('shows a replaced child as detached instead of hiding it', () => {
    const { diagram } = treeOf(liveBuild('const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.left = new TreeNode(9);\n'));
    expect(diagram.components).toHaveLength(2);
    expect(diagram.issues.find((i) => i.kind === 'detached')?.text).toContain('node 3 is detached');
  });

  it('does not call a node detached when an array holds it', () => {
    const { diagram } = treeOf(liveBuild('const queue = [new TreeNode(1)];\n'));
    expect(diagram.issues).toEqual([]);
  });
});

describe('linked list diagram', () => {
  it('follows next pointers and reports cycles', () => {
    const live = liveBuild('const a = new ListNode(1);\na.next = new ListNode(2);\na.next.next = a;\n');
    const { order, referenced } = variableRefs(live.step!.frames);
    const d = buildListDiagram(live.step!.heap, order, referenced);
    expect(d.chains).toHaveLength(1);
    expect(d.chains[0].ids).toHaveLength(2);
    expect(d.chains[0].end.kind).toBe('cycle');
    expect(d.issues[0].text).toContain("node 2's next points back to node 1");
  });

  it('splits a list being reversed into two chains', () => {
    const p = problemById('reverse-list')!;
    const run = runProgram({
      code: p.starter,
      mode: 'function',
      entry: p.entry,
      inputs: [{ name: 'head', value: [1, 2, 3], kind: 'list' }],
    });
    // Find the step right after node 1 was pointed at null.
    const step = run.steps.find((s) => s.explanation.includes("Point node 1's next to null"))!;
    const { order, referenced } = variableRefs(step.frames);
    const d = buildListDiagram(step.heap, order, referenced);
    const heads = d.chains.map((c) => c.ids.map((id) => nodeValueLabel(step.heap[id] as ObjectSnap, step.heap)).join('→'));
    expect(heads.sort()).toEqual(['1', '2→3']);
  });
});

describe('deep recursion on a cyclic tree', () => {
  const code = problemById('tree-build')!.starter.replace(
    'root.left.right = new TreeNode(4);',
    'root.left.right = new TreeNode(4);\nroot.left.right.left = root;',
  );
  const run = runProgram({ code, mode: 'script', inputs: [], limits: { maxDepth: 40 } });
  const last = run.steps[run.steps.length - 1];

  it('stops with a recursion limit error', () => {
    expect(run.error?.kind).toBe('limit');
  });

  it('anchors the drawing at the Program variable root, not the deepest call', () => {
    const { order, referenced } = variableRefs(last.frames);
    const diagram = buildTreeDiagram(last.heap, order, referenced);
    const rootVar = last.frames[0].vars.find((v) => v.name === 'root')!;
    expect(rootVar.value).toEqual({ t: 'ref', id: diagram.components[0].rootId });
  });

  it('shows each variable name once per node, however many calls share it', () => {
    const labels = nodeLabels(last.frames, last.heap);
    for (const list of labels.values()) {
      const names = list.map((l) => l.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('recursion traversal', () => {
  it('tracks the current node, visited nodes and returned heights', () => {
    const run = runProgram({ code: problemById('tree-build')!.starter, mode: 'script', inputs: [] });
    const index = buildTraversalIndex(run.steps);
    const last = run.steps.length - 2; // step before done
    const state = traversalAt(index, last);
    expect(state.visited.size).toBe(4);
    const byValue = Object.fromEntries(
      [...state.returned].map(([id, v]) => [nodeValueLabel(run.steps[last].heap[id] as ObjectSnap, run.steps[last].heap), v]),
    );
    expect(byValue).toEqual({ '4': '1', '3': '2', '8': '1', '5': '3' });
    // Before any call, nothing is visited.
    expect(traversalAt(index, 0).visited.size).toBe(0);
  });
});

describe('array markers', () => {
  it('finds left, right and mid and the search window', () => {
    const p = problemById('binary-search')!;
    const run = runProgram({
      code: p.starter,
      mode: 'function',
      entry: p.entry,
      inputs: [
        { name: 'nums', value: [-1, 0, 3, 5, 9, 12], kind: 'auto' },
        { name: 'target', value: 9, kind: 'auto' },
      ],
    });
    const step = run.steps.find((s) => s.explanation.startsWith('left = mid + 1'))!;
    const frame = step.frames[step.frames.length - 1];
    const markers = markersFor(frame, 'nums', 6, run.hints);
    expect(Object.fromEntries(markers.map((m) => [m.name, m.index]))).toEqual({ left: 3, right: 5, mid: 2 });
    expect(windowOf(markers)).toEqual({ from: 3, to: 5, names: ['left', 'right'] });
    expect(field(step.heap[1], 'missing')).toBeUndefined();
  });
});
