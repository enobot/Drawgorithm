// Static facts read from the source (not from running it). They only decide
// how values are drawn, e.g. which numbers are indexes into which array.
import type * as ES from 'estree';
import type { FunctionInfo, StaticHints } from '../trace/types';

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
    functions,
  };
}

function paramName(p: ES.Pattern): string {
  if (p.type === 'Identifier') return p.name;
  if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') return p.left.name;
  if (p.type === 'RestElement' && p.argument.type === 'Identifier') return '...' + p.argument.name;
  return '…';
}
