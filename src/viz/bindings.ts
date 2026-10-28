// Visual bindings: explicit, inspectable rules that connect recorded objects and
// variables to visual roles. Renderers read trace state through these bindings,
// never the source code. Conventions are applied only when they are unambiguous;
// otherwise the user is asked, and the user's choices always win.
import type { FrameSnap, Heap, HeapSnap, StaticHints } from '../trace/types';
import {
  ADJACENCY_NAMES,
  DEQUE_NAMES,
  EDGE_LIST_NAMES,
  HEAP_NAME,
  TRIE_NAME,
  TRIE_ROOT_NAMES,
  UNION_FIND_NAMES,
  isParentArray,
  readGraph,
  readTrie,
  trieRootOf,
} from './structures';

export type NodeShape =
  { kind: 'tree'; value: string; left: string; right: string } | { kind: 'list'; value: string; next: string } | { kind: 'object' };

export type ShapeOf = (h: HeapSnap | undefined) => NodeShape | null;

export type ArrayRole = 'cells' | 'stack' | 'queue' | 'deque' | 'heap' | 'union-find' | 'graph' | 'edge-list';

/** How a Map or plain object can be drawn besides its fields. */
export type ObjectRole = 'graph' | 'trie' | 'plain';

/** Drawings beyond cells and fields; heap, union-find, graph and trie are drawn once, above the calls. */
export type SpecialRole = 'heap' | 'deque' | 'union-find' | 'graph' | 'edge-list' | 'trie';

/** What the user chose; stored per problem. */
export interface BindingOverrides {
  /** Class name ("(object)" for plain objects) → how to read its instances. */
  shapes: Record<string, NodeShape>;
  /** Variable name → how to draw the array it holds. */
  arrays: Record<string, { role?: ArrayRole; pointers?: string[] }>;
  /** Variable name → how to draw the Map or object it holds. Missing in choices saved before graphs and tries. */
  objects?: Record<string, ObjectRole>;
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

export interface ObjectBinding {
  name: string;
  role: ObjectRole;
  source: BindingSource;
  reason: string;
  /** Drawings this Map or object's data fits. */
  fits: ObjectRole[];
}

export interface StructureBinding {
  role: SpecialRole;
  /** Variables holding it, outermost call first. */
  names: string[];
  source: BindingSource;
  reason: string;
  /** For tries: the node drawn at the top (a Trie object's root field, or the object itself). */
  trieRoot?: number;
  /** For edge lists: the vertex count variable (n) found next to it. */
  vertexCount?: number;
}

export interface ResolvedBindings {
  shapes: ShapeBinding[];
  ambiguous: AmbiguousShape[];
  arrays: ArrayBinding[];
  /** Maps and plain objects that can be drawn as a graph or trie. */
  objects: ObjectBinding[];
  /** Heap id → its special drawing. Objects not listed are drawn as cells, fields or nodes. */
  roles: Map<number, StructureBinding>;
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
  // Fields that point at another object of the same class.
  const selfRefs = fields.filter((f) =>
    objs.some((o) => {
      const v = o.entries.find(([k]) => k === f)?.[1];
      return v?.t === 'ref' && heap[v.id] && classOf(heap[v.id]) === className;
    }),
  );
  // A usual value name, or else the one field that only ever holds plain values (num, amount, ...),
  // when the class also links to itself.
  const plainFields = fields.filter((f) =>
    objs.every((o) => {
      const v = o.entries.find(([k]) => k === f)?.[1];
      return !v || (v.t !== 'ref' && v.t !== 'function');
    }),
  );
  const valueField =
    VALUE_NAMES.find(has) ??
    (selfRefs.length > 0 && plainFields.filter((f) => !selfRefs.includes(f)).length === 1
      ? plainFields.find((f) => !selfRefs.includes(f))!
      : null);
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

/** Variables that give the vertex count next to an edge list. */
const VERTEX_COUNT_NAMES = ['n', 'N', 'V', 'numVertices', 'vertexCount', 'numNodes'];

const SOURCE_RANK: Record<BindingSource, number> = { user: 2, code: 1, convention: 0 };

/**
 * How an array is drawn unless the user chooses: what the code does with it first, then what it
 * is named. A usual name (heap, parent, graph, edges) is read the same way as before; any other
 * name gets the same drawing when the code uses the array that way (UsageHints).
 */
function detectArrayRole(
  name: string,
  arr: Extract<HeapSnap, { kind: 'array' }>,
  heap: Heap,
  hints: StaticHints,
): { role: ArrayRole; source: BindingSource; reason: string } {
  const usage = hints.usage;
  // A heap is pushed and popped like a stack; its name or its slot arithmetic says it is a heap.
  if (HEAP_NAME.test(name)) {
    return {
      role: 'heap',
      source: 'convention',
      reason: `named ${name}; drawn as a complete binary tree where the children of slot i are slots 2i+1 and 2i+2`,
    };
  }
  if (usage?.heaps.includes(name)) {
    return {
      role: 'heap',
      source: 'code',
      reason: `the code reaches its slots with 2·i+1, 2·i+2 or (i−1)/2; drawn as a complete binary tree where the children of slot i are slots 2i+1 and 2i+2`,
    };
  }
  if (hints.deques?.includes(name)) {
    return { role: 'deque', source: 'code', reason: `the code takes items off both ends (${name}.pop() and ${name}.shift() or unshift())` };
  }
  if (hints.queues.includes(name)) return { role: 'queue', source: 'code', reason: `the code calls ${name}.shift()` };
  if (hints.stacks.includes(name)) return { role: 'stack', source: 'code', reason: `the code calls ${name}.pop()` };
  if (UNION_FIND_NAMES.includes(name) && isParentArray(arr)) {
    return {
      role: 'union-find',
      source: 'convention',
      reason: `named ${name}, and every item is a slot of the same array: drawn as parent links`,
    };
  }
  if (usage?.parents.includes(name) && isParentArray(arr)) {
    return {
      role: 'union-find',
      source: 'code',
      reason: `the code follows ${name}[x] up to a slot that is its own parent, and every item is a slot of the same array: drawn as parent links`,
    };
  }
  if (ADJACENCY_NAMES.includes(name) && readGraph(arr, heap, 'adjacency')) {
    return { role: 'graph', source: 'convention', reason: `named ${name}, and every item is a list of vertex numbers` };
  }
  if (usage?.adjacency.includes(name) && readGraph(arr, heap, 'adjacency')) {
    return {
      role: 'graph',
      source: 'code',
      reason: `the code walks ${name}[u] as the neighbors of u, and every item is a list of vertex numbers`,
    };
  }
  if (EDGE_LIST_NAMES.includes(name) && arr.items.length > 0 && readGraph(arr, heap, 'edge-list')) {
    return { role: 'edge-list', source: 'convention', reason: `named ${name}, and every item is a pair of vertices` };
  }
  if (usage?.edgeLists.includes(name) && arr.items.length > 0 && readGraph(arr, heap, 'edge-list')) {
    return {
      role: 'edge-list',
      source: 'code',
      reason: `the code takes each item apart into two vertices, and every item is a pair of vertices`,
    };
  }
  if (DEQUE_NAMES.includes(name)) return { role: 'deque', source: 'convention', reason: `named ${name}` };
  return { role: 'cells', source: 'convention', reason: 'plain array' };
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
  const roles = new Map<number, StructureBinding>();
  const claim = (id: number, name: string, b: Omit<StructureBinding, 'names'>) => {
    const cur = roles.get(id);
    if (!cur) roles.set(id, { ...b, names: [name] });
    else {
      if (!cur.names.includes(name)) cur.names.push(name);
      // The user's choice wins over one read from the code, which wins over a naming convention.
      if (SOURCE_RANK[b.source] > SOURCE_RANK[cur.source]) roles.set(id, { ...b, names: cur.names });
    }
  };
  const seen = new Set<string>();
  for (const f of [...frames].reverse()) {
    for (const v of f.vars) {
      if (seen.has(v.name) || v.value.t !== 'ref' || heap[v.value.id]?.kind !== 'array') continue;
      seen.add(v.name);
      const arr = heap[v.value.id] as Extract<HeapSnap, { kind: 'array' }>;
      const o = overrides.arrays[v.name] ?? {};
      const detected = detectArrayRole(v.name, arr, heap, hints);
      const role = o.role ?? detected.role;
      const detectedPointers = (hints.pointers[v.name] ?? []).map((p) => p.name);
      const candidates = f.vars
        .filter((x) => x.value.t === 'number' && Number.isInteger(x.value.v) && x.name !== v.name)
        .map((x) => x.name);
      const roleSource: BindingSource = o.role ? 'user' : detected.source;
      const roleReason = o.role ? 'you chose this' : detected.reason;
      arrays.push({
        name: v.name,
        role,
        roleSource,
        roleReason,
        pointers: o.pointers ?? detectedPointers,
        pointerSource: o.pointers ? 'user' : 'code',
        candidates: [...new Set([...candidates, ...detectedPointers])],
      });
      if (role === 'cells' || role === 'stack' || role === 'queue') continue;
      const count = f.vars.find((x) => VERTEX_COUNT_NAMES.includes(x.name) && x.value.t === 'number');
      claim(arr.id, v.name, {
        role,
        source: roleSource,
        reason: roleReason,
        vertexCount: role === 'edge-list' && count?.value.t === 'number' ? count.value.v : undefined,
      });
    }
  }

  // Maps and plain objects that read as a graph or a trie.
  const objects: ObjectBinding[] = [];
  const trieCandidates: { id: number; name: string; source: BindingSource; reason: string }[] = [];
  const seenObj = new Set<string>();
  for (const f of [...frames].reverse()) {
    for (const v of f.vars) {
      const h = v.value.t === 'ref' ? heap[v.value.id] : undefined;
      if (seenObj.has(v.name) || !h || (h.kind !== 'map' && h.kind !== 'object') || shapeOf(h)) continue;
      seenObj.add(v.name);
      const plainish = h.kind === 'map' || h.className === null || h.className === 'Object';
      const fits: ObjectRole[] = [];
      if (plainish && readGraph(h, heap, 'adjacency')) fits.push('graph');
      if (readTrie(trieRootOf(h, heap), heap)) fits.push('trie');
      const user = overrides.objects?.[v.name];
      const trieClass = h.kind === 'object' && TRIE_NAME.test(h.className ?? '');
      const trieNamed = TRIE_NAME.test(v.name) || TRIE_ROOT_NAMES.includes(v.name) || trieClass;
      let role: ObjectRole = 'plain';
      let source: BindingSource = 'convention';
      let reason = fits.length ? `its data also fits a ${fits.join(' or a ')} drawing` : 'plain fields';
      if (user) {
        role = user;
        source = 'user';
        reason = 'you chose this';
      } else if (fits.includes('graph') && ADJACENCY_NAMES.includes(v.name)) {
        role = 'graph';
        reason = `named ${v.name}, and every key lists neighbors`;
      } else if (fits.includes('graph') && hints.usage?.adjacency.includes(v.name)) {
        role = 'graph';
        source = 'code';
        reason = `the code walks the list under each key as its neighbors`;
      } else if (fits.includes('trie') && trieNamed) {
        role = 'trie';
        reason = trieClass
          ? `a ${h.className} whose nodes branch on single letters`
          : `named ${v.name}, and its nodes branch on single letters`;
      } else if (fits.includes('trie') && hints.usage?.trieWalk) {
        role = 'trie';
        source = 'code';
        reason = 'the code walks down it one key at a time, and its nodes branch on single letters';
      }
      if (!fits.length && !user) continue;
      if (v.name !== 'this') objects.push({ name: v.name, role, source, reason, fits });
      if (role === 'graph') claim(h.id, v.name, { role, source, reason });
      if (role === 'trie') trieCandidates.push({ id: h.id, name: v.name, source, reason });
    }
  }
  // A trie is drawn once, from its top: a variable pointing inside another trie (node, cur) doesn't start a second drawing.
  const tries = trieCandidates.map((c) => {
    const root = trieRootOf(heap[c.id], heap);
    return { ...c, root, model: readTrie(root, heap) };
  });
  for (const c of tries) {
    if (!c.model && c.source !== 'user') continue;
    const inside = tries.some((o) => o.model && o.root !== c.root && o.model.nodes.has(c.root));
    if (!inside) claim(c.root, c.name, { role: 'trie', source: c.source, reason: c.reason, trieRoot: c.root });
  }
  // Objects drawn as a trie (its nodes and their children objects) link to each other on purpose:
  // they don't make their class ambiguous. The class is judged again without them.
  const trieParts = new Set<number>();
  for (const c of tries) {
    if (!c.model || roles.get(c.root)?.role !== 'trie') continue;
    for (const n of c.model.nodes.values()) trieParts.add(n.id).add(n.containerId);
  }
  for (let k = ambiguous.length - 1; k >= 0 && trieParts.size; k--) {
    const all = groups.get(ambiguous[k].className) ?? [];
    const rest = all.filter((o) => !trieParts.has(o.id));
    if (rest.length === all.length) continue;
    const d = rest.length ? detectShape(ambiguous[k].className, rest, heap) : null;
    if (d && 'ambiguous' in d) continue;
    if (d) {
      shapes.push({ ...d, fields: ambiguous[k].fields });
      byClass.set(ambiguous[k].className, d.shape);
    }
    ambiguous.splice(k, 1);
  }

  const effective: StaticHints = {
    ...hints,
    pointers: { ...hints.pointers },
    queues: hints.queues.filter((n) => !overrides.arrays[n]?.role),
    stacks: hints.stacks.filter((n) => !overrides.arrays[n]?.role),
    deques: (hints.deques ?? []).filter((n) => !overrides.arrays[n]?.role),
  };
  for (const [name, o] of Object.entries(overrides.arrays)) {
    if (o.role === 'queue') effective.queues.push(name);
    if (o.role === 'stack') effective.stacks.push(name);
    if (o.role === 'deque') effective.deques!.push(name);
    if (o.pointers) {
      const axes = new Map((hints.pointers[name] ?? []).map((p) => [p.name, p.axis]));
      effective.pointers[name] = o.pointers.map((n) => ({ name: n, axis: axes.get(n) ?? 0 }));
    }
  }
  return { shapes, ambiguous, arrays, objects, roles, shapeOf, hints: effective };
}
