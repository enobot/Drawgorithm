// Tidy layout for binary trees: subtrees are packed as close as their outlines allow,
// a parent sits centered over its two children, and a single child leans to its own
// side (left or right stays visible). Positions are in units: one unit is the
// smallest distance between neighboring nodes on the same level. The layout depends
// only on the tree's shape, so it never changes while the shape stays the same.
import type { TreeComponent } from './analysis';

export interface TreeSpot {
  /** Horizontal position in units; the root is at 0. */
  x: number;
  depth: number;
}

interface Subtree {
  xs: Map<number, number>;
  /** Leftmost and rightmost x on each level below (and including) the subtree's root. */
  left: number[];
  right: number[];
}

export function tidyTreeLayout(comp: TreeComponent): Map<number, TreeSpot> {
  const kids = new Map<number, { left?: number; right?: number }>();
  for (const e of comp.edges) {
    if (e.kind !== 'child') continue;
    kids.set(e.from, { ...kids.get(e.from), [e.side]: e.to });
  }

  const build = (id: number): Subtree => {
    const k = kids.get(id) ?? {};
    const l = k.left !== undefined ? build(k.left) : null;
    const r = k.right !== undefined ? build(k.right) : null;
    const sub: Subtree = { xs: new Map([[id, 0]]), left: [0], right: [0] };
    const attach = (s: Subtree, dx: number) => {
      for (const [n, x] of s.xs) sub.xs.set(n, x + dx);
      s.left.forEach((v, i) => (sub.left[i + 1] = Math.min(sub.left[i + 1] ?? Infinity, v + dx)));
      s.right.forEach((v, i) => (sub.right[i + 1] = Math.max(sub.right[i + 1] ?? -Infinity, v + dx)));
    };
    if (l && r) {
      // Push the subtrees apart until, on every shared level, at least one unit separates them.
      let gap = 1;
      for (let i = 0; i < Math.min(l.right.length, r.left.length); i++) gap = Math.max(gap, l.right[i] - r.left[i] + 1);
      attach(l, -gap / 2);
      attach(r, gap / 2);
    } else if (l) attach(l, -0.5);
    else if (r) attach(r, 0.5);
    return sub;
  };

  const depth = new Map(comp.nodes.map((n) => [n.id, n.depth]));
  const spots = new Map<number, TreeSpot>();
  for (const [id, x] of build(comp.rootId).xs) spots.set(id, { x, depth: depth.get(id) ?? 0 });
  return spots;
}
