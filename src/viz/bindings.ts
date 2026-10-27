// Visual bindings: explicit, inspectable rules that connect recorded objects and
// variables to visual roles. Renderers read trace state through these bindings,
// never the source code. Conventions are applied only when they are unambiguous;
// otherwise the user is asked, and the user's choices always win.
import type { FrameSnap, Heap, HeapSnap, StaticHints } from '../trace/types';

export type NodeShape =
  { kind: 'tree'; value: string; left: string; right: string } | { kind: 'list'; value: string; next: string } | { kind: 'object' };

export type ShapeOf = (h: HeapSnap | undefined) => NodeShape | null;

export type ArrayRole = 'cells' | 'stack' | 'queue';

/** What the user chose; stored per problem. */
export interface BindingOverrides {
  /** Class name ("(object)" for plain objects) → how to read its instances. */
  shapes: Record<string, NodeShape>;
  /** Variable name → how to draw the array it holds. */
  arrays: Record<string, { role?: ArrayRole; pointers?: string[] }>;
}

export const NO_OVERRIDES: BindingOverrides = { shapes: {}, arrays: {} };

export type BindingSource = 'convention' | 'code' | 'user';

export interface ShapeBinding {
  className: string;
  shape: NodeShape;
  source: BindingSource;
  reason: string;
  /** Every field seen on this class, offered as choices. */
  fields: string[];
}

export interface AmbiguousShape {
  className: string;
  fields: string[];
  reason: string;
}

export interface ArrayBinding {
  name: string;
  role: ArrayRole;
  roleSource: BindingSource;
  roleReason: string;
  pointers: string[];
  pointerSource: BindingSource;
  /** Integer variables in the same call that could be chosen as pointers. */
  candidates: string[];
}

export interface ResolvedBindings {
  shapes: ShapeBinding[];
  ambiguous: AmbiguousShape[];
  arrays: ArrayBinding[];
  shapeOf: ShapeOf;
  /** The static hints with the user's array choices applied, for the renderers. */
  hints: StaticHints;
}

export const PLAIN = '(object)';

const VALUE_NAMES = ['val', 'value', 'data', 'key', 'v', 'item'];
const NEXT_NAMES = ['next', 'nxt', 'link'];
const TREE_SIDES: [string, string][] = [
  ['left', 'right'],
  ['l', 'r'],
  ['lchild', 'rchild'],
  ['leftChild', 'rightChild'],
];

/** The classic LeetCode reading: val/left/right trees and val/next lists. */
export const TREE_CONVENTION: NodeShape = { kind: 'tree', value: 'val', left: 'left', right: 'right' };
export const LIST_CONVENTION: NodeShape = { kind: 'list', value: 'val', next: 'next' };

const classOf = (h: HeapSnap) => (h.kind === 'object' ? (h.className ?? PLAIN) : null);

function detectShape(
  className: string,
  objs: Extract<HeapSnap, { kind: 'object' }>[],
  heap: Heap,
): Omit<ShapeBinding, 'fields'> | { ambiguous: string } {
  const fields = [...new Set(objs.flatMap((o) => o.entries.map(([k]) => k)))];
  const has = (f: string) => fields.includes(f);
  const valueField = VALUE_NAMES.find(has) ?? null;
  // Fields that point at another object of the same class.
  const selfRefs = fields.filter((f) =>
    objs.some((o) => {
      const v = o.entries.find(([k]) => k === f)?.[1];
      return v?.t === 'ref' && heap[v.id] && classOf(heap[v.id]) === className;
    }),
  );
  const sides = TREE_SIDES.find(([a, b]) => has(a) && has(b));
  const next = NEXT_NAMES.find(has);
  if (valueField && sides) {
    return {
      className,
      shape: { kind: 'tree', value: valueField, left: sides[0], right: sides[1] },
      source: 'convention',
      reason: `has ${valueField}, ${sides[0]} and ${sides[1]}`,
    };
  }
  if (valueField && next && !has('prev')) {
    return { className, shape: { kind: 'list', value: valueField, next }, source: 'convention', reason: `has ${valueField} and ${next}` };
  }
  if (valueField && next && has('prev')) {
    return {
      className,
      shape: { kind: 'list', value: valueField, next },
      source: 'convention',
      reason: `has ${valueField}, ${next} and prev; drawn along ${next} (prev links are listed as fields)`,
    };
  }
  if (selfRefs.length === 1 && valueField) {
    return {
      className,
      shape: { kind: 'list', value: valueField, next: selfRefs[0] },
      source: 'code',
      reason: `its only link to another ${className} is ${selfRefs[0]}`,
    };
  }
  if (selfRefs.length >= 2) {
    return {
      ambiguous: `${className} links to other ${className} objects through ${selfRefs.join(' and ')}; that could be a tree or a doubly linked list.`,
    };
  }
  return { className, shape: { kind: 'object' }, source: 'convention', reason: 'no node-like fields' };
}

export function resolveBindings(
  heap: Heap,
  frames: FrameSnap[],
  hints: StaticHints,
  overrides: BindingOverrides = NO_OVERRIDES,
): ResolvedBindings {
  const groups = new Map<string, Extract<HeapSnap, { kind: 'object' }>[]>();
  for (const h of Object.values(heap)) {
    if (h.kind !== 'object') continue;
    const c = classOf(h)!;
    groups.set(c, [...(groups.get(c) ?? []), h]);
  }
  const shapes: ShapeBinding[] = [];
  const ambiguous: AmbiguousShape[] = [];
  const byClass = new Map<string, NodeShape>();
  for (const [className, objs] of groups) {
    const fields = [...new Set(objs.flatMap((o) => o.entries.map(([k]) => k)))];
    const user = overrides.shapes[className];
    if (user) {
      shapes.push({ className, shape: user, source: 'user', reason: 'you chose this', fields });
      byClass.set(className, user);
      continue;
    }
    const d = detectShape(className, objs, heap);
    if ('ambiguous' in d) {
      ambiguous.push({ className, fields, reason: d.ambiguous });
      continue;
    }
    shapes.push({ ...d, fields });
    byClass.set(className, d.shape);
  }
  const shapeOf: ShapeOf = (h) => {
    if (!h || h.kind !== 'object') return null;
    const s = byClass.get(classOf(h)!);
    if (!s || s.kind === 'object') return null;
    // A node must actually carry the bound fields.
    const has = (f: string) => h.entries.some(([k]) => k === f);
    if (s.kind === 'tree' && (!has(s.value) || !(has(s.left) || has(s.right)))) return null;
    if (s.kind === 'list' && (!has(s.value) || !has(s.next))) return null;
    return s;
  };

  // Arrays: role and index pointers per variable name, active call first.
  const arrays: ArrayBinding[] = [];
  const seen = new Set<string>();
  for (const f of [...frames].reverse()) {
    for (const v of f.vars) {
      if (seen.has(v.name) || v.value.t !== 'ref' || heap[v.value.id]?.kind !== 'array') continue;
      seen.add(v.name);
      const o = overrides.arrays[v.name] ?? {};
      const detectedRole: ArrayRole = hints.queues.includes(v.name) ? 'queue' : hints.stacks.includes(v.name) ? 'stack' : 'cells';
      const role = o.role ?? detectedRole;
      const detectedPointers = (hints.pointers[v.name] ?? []).map((p) => p.name);
      const candidates = f.vars
        .filter((x) => x.value.t === 'number' && Number.isInteger(x.value.v) && x.name !== v.name)
        .map((x) => x.name);
      arrays.push({
        name: v.name,
        role,
        roleSource: o.role ? 'user' : detectedRole === 'cells' ? 'convention' : 'code',
        roleReason: o.role
          ? 'you chose this'
          : detectedRole === 'queue'
            ? `the code calls ${v.name}.shift()`
            : detectedRole === 'stack'
              ? `the code calls ${v.name}.pop()`
              : 'plain array',
        pointers: o.pointers ?? detectedPointers,
        pointerSource: o.pointers ? 'user' : 'code',
        candidates: [...new Set([...candidates, ...detectedPointers])],
      });
    }
  }

  const effective: StaticHints = {
    ...hints,
    pointers: { ...hints.pointers },
    queues: hints.queues.filter((n) => !overrides.arrays[n]?.role),
    stacks: hints.stacks.filter((n) => !overrides.arrays[n]?.role),
  };
  for (const [name, o] of Object.entries(overrides.arrays)) {
    if (o.role === 'queue') effective.queues.push(name);
    if (o.role === 'stack') effective.stacks.push(name);
    if (o.pointers) {
      const axes = new Map((hints.pointers[name] ?? []).map((p) => [p.name, p.axis]));
      effective.pointers[name] = o.pointers.map((n) => ({ name: n, axis: axes.get(n) ?? 0 }));
    }
  }
  return { shapes, ambiguous, arrays, shapeOf, hints: effective };
}
