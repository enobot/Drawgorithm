import { describe, expect, it } from 'vitest';
import { liveBuild, runProgram } from '../engine/run';
import type { Effect } from '../trace/types';
import { buildListDiagram, buildTreeDiagram, variableRefs } from './analysis';
import { NO_OVERRIDES, resolveBindings, type BindingOverrides } from './bindings';

function live(code: string, overrides: BindingOverrides = NO_OVERRIDES) {
  const r = liveBuild(code);
  if (!r.step) throw new Error(`no drawing: ${r.error?.message ?? r.pending?.message}`);
  const b = resolveBindings(r.step.heap, r.step.frames, r.hints, overrides);
  const { order, referenced } = variableRefs(r.step.frames);
  return {
    b,
    tree: buildTreeDiagram(r.step.heap, order, referenced, b.shapeOf),
    list: buildListDiagram(r.step.heap, order, referenced, b.shapeOf),
  };
}

describe('trace events for building a tree', () => {
  it('records create, assign and field-change events with object identities', () => {
    const run = runProgram({ code: 'let root = new TreeNode(5);\nroot.left = new TreeNode(3);\n', mode: 'script', inputs: [] });
    const events = run.steps
      .flatMap((s) => s.effects)
      .filter((e) => e.type === 'create' || e.type === 'declare' || e.type === 'prop-write');
    const [createA, assignRoot, createB, assignLeft] = events as Effect[];
    expect(createA).toMatchObject({ type: 'create', className: 'TreeNode' });
    const a = (createA as Extract<Effect, { type: 'create' }>).objId;
    expect(assignRoot).toEqual({ type: 'declare', name: 'root', frameId: 0, value: { t: 'ref', id: a } });
    expect(createB).toMatchObject({ type: 'create', className: 'TreeNode' });
    const b = (createB as Extract<Effect, { type: 'create' }>).objId;
    expect(b).not.toBe(a);
    expect(assignLeft).toEqual({ type: 'prop-write', objId: a, key: 'left', before: { t: 'null' }, after: { t: 'ref', id: b } });
  });

  it('keeps aliases as the same object: two variables, one node', () => {
    const run = runProgram({ code: 'const a = new ListNode(1);\nconst b = a;\nb.val = 7;\n', mode: 'script', inputs: [] });
    const last = run.steps[run.steps.length - 1];
    const [va, vb] = last.frames[0].vars;
    expect(va.value).toEqual(vb.value);
    const id = (va.value as { id: number }).id;
    expect(last.heap[id]).toMatchObject({
      kind: 'object',
      entries: [
        ['val', { t: 'number', v: 7 }],
        ['next', { t: 'null' }],
      ],
    });
  });
});

describe('visual bindings', () => {
  it('uses the LeetCode conventions for TreeNode and ListNode', () => {
    const { b } = live('const root = new TreeNode(1);\nconst head = new ListNode(2);\n');
    expect(b.shapes.map((s) => [s.className, s.shape.kind, s.source])).toEqual([
      ['TreeNode', 'tree', 'convention'],
      ['ListNode', 'list', 'convention'],
    ]);
  });

  it('draws a custom node class with its own field names', () => {
    const code = `class Node {
  constructor(data) { this.data = data; this.nxt = null; }
}
const head = new Node(1);
head.nxt = new Node(2);
head.nxt.nxt = new Node(3);
`;
    const { b, list } = live(code);
    expect(b.shapes[0]).toMatchObject({ className: 'Node', shape: { kind: 'list', value: 'data', next: 'nxt' } });
    expect(list.chains).toHaveLength(1);
    expect(list.chains[0].ids.map((id) => list.labels[id])).toEqual(['1', '2', '3']);
  });

  it('explains custom node classes in node terms, not object dumps', () => {
    const code =
      'class Node {\n  constructor(data) { this.data = data; this.nxt = null; }\n}\nconst head = new Node(1);\nhead.nxt = new Node(2);\n';
    const run = runProgram({ code, mode: 'script', inputs: [] });
    const text = run.steps.map((s) => s.explanation);
    expect(text).toContain('Create node 1 and store it in head.');
    expect(text).toContain("Point node 1's nxt to node 2.");
  });

  it('draws a custom tree class with lowercase l/r children', () => {
    const code = 'function N(v) { this.value = v; this.l = null; this.r = null; }\nconst t = new N(5);\nt.l = new N(3);\nt.r = new N(8);\n';
    const { tree } = live(code);
    expect(tree.components[0].nodes.map((n) => tree.labels[n.id])).toEqual(['5', '3', '8']);
  });

  it('does not guess when two self-links could be a tree or a doubly linked list', () => {
    const code =
      'class Cell { constructor(v) { this.v = v; this.a = null; this.b = null; } }\nconst x = new Cell(1);\nx.a = new Cell(2);\nx.b = new Cell(3);\n';
    const { b, tree, list } = live(code);
    expect(b.ambiguous).toHaveLength(1);
    expect(b.ambiguous[0].reason).toContain('a and b');
    expect(tree.components).toHaveLength(0);
    expect(list.chains).toHaveLength(0);
  });

  it('lets the user resolve the ambiguity, and the drawing follows the choice', () => {
    const code =
      'class Cell { constructor(v) { this.v = v; this.a = null; this.b = null; } }\nconst x = new Cell(1);\nx.a = new Cell(2);\nx.b = new Cell(3);\n';
    const asTree = live(code, { shapes: { Cell: { kind: 'tree', value: 'v', left: 'a', right: 'b' } }, arrays: {} });
    expect(asTree.b.shapes[0].source).toBe('user');
    expect(asTree.tree.components[0].nodes.map((n) => asTree.tree.labels[n.id])).toEqual(['1', '2', '3']);
    const asList = live(code, { shapes: { Cell: { kind: 'list', value: 'v', next: 'a' } }, arrays: {} });
    expect(asList.list.chains.map((c) => c.ids.map((id) => asList.list.labels[id]))).toContainEqual(['1', '2']);
  });

  it('shows cycles through a custom next field', () => {
    const code =
      'class Node { constructor(d) { this.data = d; this.next = null; } }\nconst a = new Node(1);\na.next = new Node(2);\na.next.next = a;\n';
    const { list } = live(code);
    expect(list.chains[0].end.kind).toBe('cycle');
  });

  it('applies user array roles and pointer choices to what the renderers read', () => {
    const code = 'function f(nums) { let lo = 0; let hi = nums.length - 1; let k = 1; return nums[lo] + nums[hi]; }';
    const run = runProgram({ code, mode: 'function', inputs: [{ name: 'nums', value: [1, 2, 3], kind: 'auto' }] });
    const step = run.steps.find((s) => s.kind === 'return')!;
    const auto = resolveBindings(step.heap, step.frames, run.hints);
    const nums = auto.arrays.find((a) => a.name === 'nums')!;
    expect(nums.pointers.sort()).toEqual(['hi', 'lo']);
    expect(nums.candidates).toContain('k');
    const chosen = resolveBindings(step.heap, step.frames, run.hints, { shapes: {}, arrays: { nums: { role: 'stack', pointers: ['k'] } } });
    expect(chosen.hints.stacks).toContain('nums');
    expect(chosen.hints.pointers.nums).toEqual([{ name: 'k', axis: 0 }]);
    expect(chosen.arrays[0]).toMatchObject({ role: 'stack', roleSource: 'user', pointerSource: 'user' });
  });
});
