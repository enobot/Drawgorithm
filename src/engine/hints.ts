// Static facts read from the source (not from running it). They only decide
// how values are drawn, e.g. which numbers are indexes into which array.
import type * as ES from 'estree';
import type { FunctionInfo, StaticHints, UsageHints } from '../trace/types';

type AnyNode = ES.Node;

function children(node: AnyNode): AnyNode[] {
  const out: AnyNode[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const c of child) if (c && typeof c === 'object' && 'type' in c) out.push(c as AnyNode);
    } else if (child && typeof child === 'object' && 'type' in child) {
      out.push(child as AnyNode);
    }
  }
  return out;
}

function walk(node: AnyNode, fn: (n: AnyNode) => void): void {
  fn(node);
  for (const c of children(node)) walk(c, fn);
}

/** Base identifier of `a`, `a[i]`, `a[i][j]`, plus how many computed index levels sit below. */
function baseOf(node: ES.Expression | ES.Super): { name: string; depth: number } | null {
  let depth = 0;
  let cur: ES.Node = node;
  while (cur.type === 'MemberExpression' && cur.computed) {
    depth++;
    cur = cur.object;
  }
  return cur.type === 'Identifier' ? { name: cur.name, depth } : null;
}

/** Identifiers used as plain values inside an index expression, e.g. `i` and `j` in `nums[i + j]`. */
function bareIdentifiers(node: AnyNode, out: Set<string>): void {
  if (node.type === 'Identifier') {
    out.add(node.name);
    return;
  }
  if (node.type === 'MemberExpression') {
    // `nums.length` or `arr[k]` inside an index is a value read, not index arithmetic.
    return;
  }
  for (const c of children(node)) bareIdentifiers(c, out);
}

const INDEX_MATH_CALLS = new Set(['floor', 'ceil', 'trunc', 'round']);

/** True if the expression is plain index arithmetic: identifiers, numbers, + - * / % >> and Math.floor(...). */
function isIndexArithmetic(node: AnyNode): boolean {
  switch (node.type) {
    case 'Identifier':
      return true;
    case 'Literal':
      return typeof node.value === 'number';
    case 'BinaryExpression':
      return (
        ['+', '-', '*', '/', '%', '>>', '>>>', '<<'].includes(node.operator) &&
        isIndexArithmetic(node.left) &&
        isIndexArithmetic(node.right)
      );
    case 'UnaryExpression':
      return node.operator === '-' && isIndexArithmetic(node.argument);
    case 'CallExpression':
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'Math' &&
        node.callee.property.type === 'Identifier' &&
        INDEX_MATH_CALLS.has(node.callee.property.name) &&
        node.arguments.every((a) => a.type !== 'SpreadElement' && isIndexArithmetic(a))
      );
    default:
      return false;
  }
}

const CHAR_METHODS = new Set(['charAt', 'charCodeAt', 'at', 'codePointAt']);

export function collectHints(program: ES.Program): StaticHints {
  const pointers = new Map<string, Map<string, number>>();
  const indexed = new Set<string>();
  const shifts = new Set<string>();
  const pops = new Set<string>();
  const indexInto = new Map<string, Set<string>>();
  const assignments: { target: string; ids: Set<string> }[] = [];

  const addPointer = (arr: string, name: string, axis: number) => {
    if (name === arr) return;
    let m = pointers.get(arr);
    if (!m) pointers.set(arr, (m = new Map()));
    if (!m.has(name)) m.set(name, axis);
  };

  walk(program, (node) => {
    if (node.type === 'MemberExpression' && node.computed) {
      const base = baseOf(node.object);
      if (base) {
        indexed.add(base.name);
        const ids = new Set<string>();
        bareIdentifiers(node.property, ids);
        for (const id of ids) addPointer(base.name, id, base.depth);
        // `nums[dq[k]]`: the items of dq are indexes into nums.
        const inner = node.property.type === 'MemberExpression' && node.property.computed ? baseOf(node.property.object) : null;
        if (inner && inner.depth === 0 && inner.name !== base.name) {
          const targets = indexInto.get(inner.name) ?? new Set<string>();
          targets.add(base.name);
          indexInto.set(inner.name, targets);
        }
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed) {
      const obj = node.callee.object;
      const prop = node.callee.property;
      if (obj.type === 'Identifier' && prop.type === 'Identifier') {
        if (CHAR_METHODS.has(prop.name)) {
          indexed.add(obj.name);
          const first = node.arguments[0];
          if (first && first.type !== 'SpreadElement') {
            const ids = new Set<string>();
            bareIdentifiers(first, ids);
            for (const id of ids) addPointer(obj.name, id, 0);
          }
        }
        if (prop.name === 'shift' || prop.name === 'unshift') shifts.add(obj.name);
        if (prop.name === 'pop') pops.add(obj.name);
      }
    }
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && isIndexArithmetic(node.init)) {
      const ids = new Set<string>();
      bareIdentifiers(node.init, ids);
      assignments.push({ target: node.id.name, ids });
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && isIndexArithmetic(node.right)) {
      const ids = new Set<string>();
      bareIdentifiers(node.right, ids);
      if (node.operator !== '=') ids.add(node.left.name);
      assignments.push({ target: node.left.name, ids });
    }
  });

  // Index arithmetic links variables: `mid = Math.floor((left + right) / 2)` makes
  // left and right indexes of every array mid indexes, and `left = mid + 1` does the reverse.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [arr, m] of pointers) {
      for (const { target, ids } of assignments) {
        const related = [target, ...ids];
        const axis = related.map((n) => m.get(n)).find((a) => a !== undefined);
        if (axis === undefined) continue;
        for (const n of related) {
          if (!m.has(n) && n !== arr && n !== 'Math') {
            m.set(n, axis);
            changed = true;
          }
        }
      }
    }
  }

  const functions: FunctionInfo[] = [];
  for (const stmt of program.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      functions.push({ name: stmt.id.name, params: stmt.params.map(paramName), line: stmt.loc!.start.line });
    } else if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id.type === 'Identifier' && d.init && (d.init.type === 'FunctionExpression' || d.init.type === 'ArrowFunctionExpression')) {
          functions.push({ name: d.id.name, params: d.init.params.map(paramName), line: d.loc!.start.line });
        }
      }
    }
  }

  const pointerRecord: StaticHints['pointers'] = {};
  for (const [arr, m] of pointers) {
    pointerRecord[arr] = [...m].map(([name, axis]) => ({ name, axis }));
  }
  return {
    pointers: pointerRecord,
    indexed: [...indexed],
    queues: [...shifts],
    stacks: [...pops].filter((n) => !shifts.has(n)),
    deques: [...pops].filter((n) => shifts.has(n)),
    indexInto: Object.fromEntries([...indexInto].map(([k, v]) => [k, [...v]])),
    usage: collectUsage(program),
    functions,
  };
}

// ---------------------------------------------------------------- structures by usage

const idName = (n: AnyNode | null | undefined): string | null => (n && n.type === 'Identifier' ? n.name : null);
const isNumber = (n: AnyNode, v: number) => n.type === 'Literal' && n.value === v;
/** `a[k]` with a plain variable `a`: returns a. */
const indexedBase = (n: AnyNode): string | null => (n.type === 'MemberExpression' && n.computed ? idName(n.object) : null);
const isMethodCall = (n: AnyNode, names: string[]): n is ES.CallExpression =>
  n.type === 'CallExpression' &&
  n.callee.type === 'MemberExpression' &&
  !n.callee.computed &&
  n.callee.property.type === 'Identifier' &&
  names.includes(n.callee.property.name);

/** `i - 1` for any variable i. */
const minusOne = (n: AnyNode) => n.type === 'BinaryExpression' && n.operator === '-' && idName(n.left) !== null && isNumber(n.right, 1);

/** Child and parent slots of a binary heap: 2 * i + 1, i * 2 + 2, (i - 1) >> 1, Math.floor((i - 1) / 2), (i - 1) / 2 | 0. */
function isHeapArithmetic(n: AnyNode): boolean {
  if (n.type === 'BinaryExpression') {
    if (n.operator === '+' && (isNumber(n.right, 1) || isNumber(n.right, 2))) {
      const l = n.left;
      return (
        l.type === 'BinaryExpression' &&
        l.operator === '*' &&
        ((isNumber(l.left, 2) && idName(l.right) !== null) || (idName(l.left) !== null && isNumber(l.right, 2)))
      );
    }
    if ((n.operator === '>>' || n.operator === '>>>') && isNumber(n.right, 1)) return minusOne(n.left);
    if (n.operator === '|' && isNumber(n.right, 0)) {
      return n.left.type === 'BinaryExpression' && n.left.operator === '/' && isNumber(n.left.right, 2) && minusOne(n.left.left);
    }
    return false;
  }
  if (n.type !== 'CallExpression') return false;
  const c = n.callee;
  const arg = n.arguments[0];
  return (
    c.type === 'MemberExpression' &&
    idName(c.object) === 'Math' &&
    !c.computed &&
    idName(c.property) === 'floor' &&
    !!arg &&
    arg.type === 'BinaryExpression' &&
    arg.operator === '/' &&
    isNumber(arg.right, 2) &&
    minusOne(arg.left)
  );
}

/**
 * True if `name` is used as a key in `body`: an index (`a[name]`), the argument of a Map or Set
 * method or of a function call (`seen.has(name)`, `dfs(name)`). Storing it (`out.push(name)`)
 * counts only when `stores` is set. Math and console calls never count.
 */
function usedAsKey(body: AnyNode, name: string, stores: boolean): boolean {
  let found = false;
  walk(body, (n) => {
    if (found) return;
    if (n.type === 'MemberExpression' && n.computed && idName(n.property) === name) found = true;
    else if (n.type === 'CallExpression' && n.arguments.some((a) => idName(a) === name)) {
      const c = n.callee;
      const owner = c.type === 'MemberExpression' ? idName(c.object) : null;
      if (owner === 'Math' || owner === 'console') return;
      if (!stores && isMethodCall(n, ['push', 'unshift'])) return;
      found = true;
    }
  });
  return found;
}

/** The variable a loop or callback binds: `v`, or the first name of `[v, weight]`. */
function boundName(p: AnyNode | undefined): string | null {
  if (!p) return null;
  if (p.type === 'VariableDeclaration') return boundName(p.declarations[0]?.id);
  if (p.type === 'ArrayPattern') return idName(p.elements[0]);
  return idName(p);
}

/** All names an array pattern binds: `[a, b, w]` → a, b, w. */
function patternNames(p: AnyNode | undefined): string[] {
  if (!p) return [];
  if (p.type === 'VariableDeclaration') return patternNames(p.declarations[0]?.id);
  if (p.type !== 'ArrayPattern') return [];
  return p.elements.map((e) => idName(e)).filter((x): x is string => x !== null);
}

/** `adj[u]`, `adj.get(u)`, `adj.get(u) ?? []`: the structure whose entry is read, and the key expression. */
function entryOf(n: AnyNode): { base: string; key: AnyNode } | null {
  if (n.type === 'LogicalExpression') return entryOf(n.left);
  if (n.type === 'MemberExpression' && n.computed) {
    const base = idName(n.object);
    return base ? { base, key: n.property } : null;
  }
  if (isMethodCall(n, ['get']) && n.callee.type === 'MemberExpression') {
    const base = idName(n.callee.object);
    const key = n.arguments[0];
    return base && key && key.type !== 'SpreadElement' ? { base, key } : null;
  }
  return null;
}

/** A loop over `iterable`'s items, as for...of or forEach: the item pattern and the body. */
function itemLoops(program: ES.Program): { iterable: AnyNode; item: AnyNode | undefined; body: AnyNode }[] {
  const out: { iterable: AnyNode; item: AnyNode | undefined; body: AnyNode }[] = [];
  walk(program, (n) => {
    if (n.type === 'ForOfStatement') out.push({ iterable: n.right, item: n.left, body: n.body });
    if (isMethodCall(n, ['forEach']) && n.callee.type === 'MemberExpression') {
      const fn = n.arguments[0];
      if (fn && (fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression')) {
        out.push({ iterable: n.callee.object, item: fn.params[0], body: fn.body });
      }
    }
  });
  return out;
}

/**
 * Reads which variables hold heaps, union-find parents, graphs and tries from what the code
 * does with them, so a drawing follows the code whatever the names are. Every result is still
 * checked against the recorded data before it is drawn (see bindings.ts).
 */
export function collectUsage(program: ES.Program): UsageHints {
  const heapSlots = new Set<string>();
  const heapIndexed: { base: string; index: AnyNode }[] = [];
  const parents = new Set<string>();
  const walkers = new Set<string>();
  const bits = new Set<string>();
  let trieWalk = false;

  walk(program, (n) => {
    // a & b, a | b, a ^ b, ~a, a ^= b: numbers worked on bit by bit (x | 0 only drops a fraction).
    if (n.type === 'BinaryExpression' && ['&', '|', '^'].includes(n.operator) && !(n.operator === '|' && isNumber(n.right, 0))) {
      for (const side of [n.left, n.right]) if (idName(side)) bits.add(idName(side)!);
    }
    if (n.type === 'UnaryExpression' && n.operator === '~' && idName(n.argument)) bits.add(idName(n.argument)!);
    if (n.type === 'AssignmentExpression' && ['&=', '|=', '^='].includes(n.operator)) {
      for (const side of [n.left, n.right]) if (idName(side)) bits.add(idName(side)!);
    }
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && isHeapArithmetic(n.init)) heapSlots.add(n.id.name);
    if (n.type === 'MemberExpression' && n.computed) {
      const base = idName(n.object);
      if (base) heapIndexed.push({ base, index: n.property });
    }
    // while (p[x] !== x): climb until a slot is its own parent.
    if (n.type === 'WhileStatement' && n.test.type === 'BinaryExpression' && ['!==', '!=', '===', '=='].includes(n.test.operator)) {
      const { left, right } = n.test;
      for (const [a, b] of [
        [left, right],
        [right, left],
      ] as const) {
        const base = indexedBase(a);
        if (base && a.type === 'MemberExpression' && idName(a.property) !== null && idName(a.property) === idName(b)) parents.add(base);
      }
    }
    if (n.type !== 'AssignmentExpression' || n.operator !== '=') return;
    const target = idName(n.left);
    const r = n.right;
    if (target && isHeapArithmetic(r)) heapSlots.add(target);
    // x = p[x]: step to the parent.
    if (target && r.type === 'MemberExpression' && r.computed && idName(r.property) === target && idName(r.object) !== target) {
      parents.add(idName(r.object)!);
    }
    // p[x] = p[p[x]]: path halving.
    const lb = indexedBase(n.left);
    if (lb && r.type === 'MemberExpression' && r.computed && idName(r.object) === lb && indexedBase(r.property) === lb) parents.add(lb);
    // cur = cur.next: a variable stepping along one of its own fields.
    if (target && r.type === 'MemberExpression' && !r.computed && idName(r.object) === target) walkers.add(target);
    // node = node[ch], node = node.children[ch], node = node.children.get(ch): walking down by key.
    if (target) {
      const down = r.type === 'MemberExpression' && r.computed && !(r.property.type === 'Literal' && typeof r.property.value === 'number');
      const got = isMethodCall(r, ['get']) && r.callee.type === 'MemberExpression';
      const from = down ? r.object : got ? (r.callee as ES.MemberExpression).object : null;
      const owner = from && from.type === 'MemberExpression' && !from.computed ? from.object : from;
      if (owner && idName(owner) === target) trieWalk = true;
    }
  });
  // a[2 * i + 1], or a[left] where left was computed that way.
  const heapArrays = new Set<string>();
  for (const { base, index } of heapIndexed) if (isHeapArithmetic(index) || heapSlots.has(idName(index) ?? '')) heapArrays.add(base);

  // find(p[x]) inside function find(x): recursion up the parent links.
  walk(program, (n) => {
    let name: string | null = null;
    let fn: ES.Function | null = null;
    if (n.type === 'FunctionDeclaration' && n.id) [name, fn] = [n.id.name, n];
    if (
      n.type === 'VariableDeclarator' &&
      n.id.type === 'Identifier' &&
      n.init &&
      (n.init.type === 'FunctionExpression' || n.init.type === 'ArrowFunctionExpression')
    )
      [name, fn] = [n.id.name, n.init];
    if (n.type === 'MethodDefinition' && n.key.type === 'Identifier') [name, fn] = [n.key.name, n.value];
    if (!name || !fn) return;
    const params = new Set(fn.params.map((p) => idName(p)).filter((x): x is string => x !== null));
    walk(fn.body, (c) => {
      if (c.type !== 'CallExpression') return;
      const callee = c.callee.type === 'MemberExpression' && !c.callee.computed ? c.callee.property : c.callee;
      if (idName(callee) !== name) return;
      for (const a of c.arguments) {
        const base = indexedBase(a);
        if (base && a.type === 'MemberExpression' && params.has(idName(a.property) ?? '')) parents.add(base);
      }
    });
  });

  // Graphs: neighbor lists walked with each neighbor used as a key, and pairs split into two keys.
  const adjacency = new Set<string>();
  const edgeLists = new Set<string>();
  const vertexVars = new Set<string>();
  for (const loop of itemLoops(program)) {
    const entry = entryOf(loop.iterable);
    const item = boundName(loop.item);
    if (entry && item && usedAsKey(loop.body, item, false)) {
      adjacency.add(entry.base);
      vertexVars.add(item);
      const key = idName(entry.key);
      if (key) vertexVars.add(key);
    }
    const pair = patternNames(loop.item);
    const list = idName(loop.iterable);
    if (list && pair.length >= 2 && usedAsKey(loop.body, pair[0], true) && usedAsKey(loop.body, pair[1], true)) {
      edgeLists.add(list);
      vertexVars.add(pair[0]).add(pair[1]);
    }
  }

  // Per-vertex state, by what the code writes for a vertex: true or add() is "visited",
  // arithmetic on the same structure is a distance, another vertex is a predecessor.
  const visited = new Set<string>();
  const distances = new Set<string>();
  const predecessors = new Set<string>();
  const graphLike = new Set([...adjacency, ...edgeLists, ...parents]);
  const readsItself = (value: AnyNode, base: string) => {
    let found = false;
    walk(value, (x) => {
      if (indexedBase(x) === base || (isMethodCall(x, ['get']) && x.callee.type === 'MemberExpression' && idName(x.callee.object) === base))
        found = true;
    });
    return found;
  };
  const classify = (base: string, value: AnyNode) => {
    if (graphLike.has(base)) return;
    if (value.type === 'Literal' && (value.value === true || value.value === 1)) visited.add(base);
    else if (idName(value) !== null && vertexVars.has(idName(value)!)) predecessors.add(base);
    else if (value.type === 'BinaryExpression' && readsItself(value, base)) distances.add(base);
  };
  if (vertexVars.size) {
    walk(program, (n) => {
      if (n.type === 'AssignmentExpression' && n.operator === '=' && n.left.type === 'MemberExpression' && n.left.computed) {
        const base = idName(n.left.object);
        if (base && vertexVars.has(idName(n.left.property) ?? '')) classify(base, n.right);
      }
      if (isMethodCall(n, ['add', 'set']) && n.callee.type === 'MemberExpression') {
        const base = idName(n.callee.object);
        const [k, v] = n.arguments;
        if (!base || !k || !vertexVars.has(idName(k) ?? '') || graphLike.has(base)) return;
        if (!v) visited.add(base);
        else if (v.type !== 'SpreadElement') classify(base, v);
      }
    });
  }

  return {
    heaps: [...heapArrays],
    parents: [...parents],
    adjacency: [...adjacency],
    edgeLists: [...edgeLists],
    trieWalk,
    walkers: [...walkers],
    bits: [...bits],
    vertices: [...vertexVars],
    visited: [...visited],
    distances: [...distances],
    predecessors: [...predecessors],
  };
}

function paramName(p: ES.Pattern): string {
  if (p.type === 'Identifier') return p.name;
  if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') return p.left.name;
  if (p.type === 'RestElement' && p.argument.type === 'Identifier') return '...' + p.argument.name;
  return '…';
}
