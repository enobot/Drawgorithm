// Layouts behind the tree and linked-list drawings: no overlaps, padding-free unit
// positions, and list nodes that keep their places while arrows change.
import { describe, expect, it } from 'vitest';
import { liveBuild, runProgram } from '../engine/run';
import { buildListDiagram, buildTreeDiagram, conventionShape, nodeValueLabel, variableRefs, type ObjectSnap } from './analysis';
import { listSlots, listSlotsForSteps } from './listLayout';
import { tidyTreeLayout } from './treeLayout';

function treeOf(code: string) {
  const step = liveBuild(code).step!;
  const { order, referenced } = variableRefs(step.frames);
  return buildTreeDiagram(step.heap, order, referenced).components[0];
}

/** Layout positions keyed by the value shown in each node. */
function spotsByValue(code: string) {
  const step = liveBuild(code).step!;
  const { order, referenced } = variableRefs(step.frames);
  const diagram = buildTreeDiagram(step.heap, order, referenced);
  return new Map([...tidyTreeLayout(diagram.components[0])].map(([id, s]) => [diagram.labels[id], s]));
}

/** A complete tree of the given depth, built as top-level code. */
function completeTree(depth: number): string {
  const lines = ['const n1 = new TreeNode(1);'];
  for (let i = 2; i < 2 ** (depth + 1); i++) {
    lines.push(`const n${i} = new TreeNode(${i});`, `n${Math.floor(i / 2)}.${i % 2 ? 'right' : 'left'} = n${i};`);
  }
  return lines.join('\n');
}

describe('tidy tree layout', () => {
  it('never puts two nodes on one level closer than one unit', () => {
    const comp = treeOf(completeTree(4));
    const spots = tidyTreeLayout(comp);
    expect(spots.size).toBe(31);
    const byDepth = new Map<number, number[]>();
    for (const s of spots.values()) byDepth.set(s.depth, [...(byDepth.get(s.depth) ?? []), s.x]);
    for (const xs of byDepth.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it('centers a parent over two children and leans a single child to its own side', () => {
    const spots = spotsByValue(
      'const root = new TreeNode(5);\nroot.left = new TreeNode(3);\nroot.right = new TreeNode(8);\nroot.left.right = new TreeNode(4);\n',
    );
    const [root, three, eight, four] = ['5', '3', '8', '4'].map((v) => spots.get(v)!);
    expect(root.x).toBeCloseTo((three.x + eight.x) / 2);
    expect(three.x).toBeLessThan(root.x);
    expect(four.x).toBeGreaterThan(three.x);
  });

  it('keeps a deep one-sided chain readable instead of piling nodes up', () => {
    const code = ['const root = new TreeNode(0);', 'let cur = root;'];
    for (let i = 1; i <= 12; i++) code.push(`cur.left = new TreeNode(${i});`, 'cur = cur.left;');
    const comp = treeOf(code.join('\n'));
    const spots = [...tidyTreeLayout(comp).values()].sort((a, b) => a.depth - b.depth);
    expect(spots).toHaveLength(13);
    for (let i = 1; i < spots.length; i++) expect(spots[i].x).toBeCloseTo(spots[i - 1].x - 0.5);
  });
});

describe('linked list places', () => {
  it('lays out one state in chain order', () => {
    const step = liveBuild('const a = new ListNode(1);\na.next = new ListNode(2);\na.next.next = new ListNode(3);\n').step!;
    const { order, referenced } = variableRefs(step.frames);
    const d = buildListDiagram(step.heap, order, referenced);
    const slots = listSlots([d]);
    expect(d.chains[0].ids.map((id) => slots.get(id))).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('keeps every node in place while a list is reversed', () => {
    const code = [
      'const head = new ListNode(1, new ListNode(2, new ListNode(3, new ListNode(4))));',
      'let prev = null;',
      'let curr = head;',
      'while (curr !== null) {',
      '  const next = curr.next;',
      '  curr.next = prev;',
      '  prev = curr;',
      '  curr = next;',
      '}',
    ].join('\n');
    const result = runProgram({ code, mode: 'script', inputs: [] });
    expect(result.status).toBe('finished');
    const slots = listSlotsForSteps(result.steps, conventionShape)!;
    const last = result.steps[result.steps.length - 1];
    const { order, referenced } = variableRefs(last.frames);
    const reversed = buildListDiagram(last.heap, order, referenced).chains[0].ids;
    // The final chain runs 4 → 3 → 2 → 1, drawn right to left in the columns the nodes started in.
    expect(reversed.map((id) => slots.get(id))).toEqual([
      { row: 0, col: 3 },
      { row: 0, col: 2 },
      { row: 0, col: 1 },
      { row: 0, col: 0 },
    ]);
  });

  it('puts a node created later next to the node that links to it', () => {
    const code = ['const a = new ListNode(1);', 'const b = new ListNode(9);', 'a.next = new ListNode(2);'].join('\n');
    const result = runProgram({ code, mode: 'script', inputs: [] });
    const slots = listSlotsForSteps(result.steps, conventionShape)!;
    const heap = result.steps[result.steps.length - 1].heap;
    const values = new Map([...slots].map(([id, s]) => [nodeValueLabel(heap[id] as ObjectSnap, heap), s]));
    expect(values.get('1')).toEqual({ row: 0, col: 0 });
    expect(values.get('9')).toEqual({ row: 1, col: 0 });
    expect(values.get('2')).toEqual({ row: 0, col: 1 });
  });
});
