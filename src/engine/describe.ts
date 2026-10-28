// Turning runtime values into text: for explanations, console.log and JS string conversion.
import { ClassValue, Closure, NativeFn, ObjRecord, isListNode, isTreeNode, objectKeys, type Value } from './values';

export interface NodeNamer {
  /** "node 5", or "node 5 (#12)" when several nodes share the value 5. */
  nodeLabel(obj: ObjRecord): string;
}

const MAX_ITEMS = 8;

/** Short, readable description used in step explanations. */
export function fmt(v: Value, namer: NodeNamer, depth = 0): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') {
    const s = v.length > 40 ? v.slice(0, 37) + '…' : v;
    return JSON.stringify(s);
  }
  if (typeof v === 'number') return Object.is(v, -0) ? '0' : String(v);
  if (typeof v === 'boolean') return String(v);
  if (v instanceof Closure || v instanceof NativeFn) return `function ${v.name || '(anonymous)'}`;
  if (v instanceof ClassValue) return `class ${v.name}`;
  if (isTreeNode(v) || isListNode(v)) return namer.nodeLabel(v as ObjRecord);
  if (depth > 1) {
    if (Array.isArray(v)) return `[…${v.length}]`;
    return '{…}';
  }
  if (Array.isArray(v)) {
    const items = v.slice(0, MAX_ITEMS).map((x) => fmt(x, namer, depth + 1));
    if (v.length > MAX_ITEMS) items.push(`…${v.length - MAX_ITEMS} more`);
    return `[${items.join(', ')}]`;
  }
  if (v instanceof Map) {
    const items = [...v].slice(0, 5).map(([k, x]) => `${fmt(k, namer, depth + 1)} → ${fmt(x, namer, depth + 1)}`);
    if (v.size > 5) items.push(`…${v.size - 5} more`);
    return `Map {${items.join(', ')}}`;
  }
  if (v instanceof Set) {
    const items = [...v].slice(0, 6).map((x) => fmt(x, namer, depth + 1));
    if (v.size > 6) items.push(`…${v.size - 6} more`);
    return `Set {${items.join(', ')}}`;
  }
  if (v instanceof ObjRecord) {
    const items = objectKeys(v)
      .slice(0, 4)
      .map((k) => `${k}: ${fmt(v.props.get(k), namer, depth + 1)}`);
    if (v.props.size > 4) items.push('…');
    const prefix = v.className && v.className !== 'Object' ? `${v.className} ` : '';
    return `${prefix}{${items.join(', ')}}`;
  }
  return String(v);
}

/** JavaScript's String(value) for interpreter values. */
export function toStr(v: Value, seen = new Set<unknown>()): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (seen.has(v)) return '';
    seen.add(v);
    const s = v.map((x) => (x === null || x === undefined ? '' : toStr(x, seen))).join(',');
    seen.delete(v);
    return s;
  }
  if (v instanceof Map) return '[object Map]';
  if (v instanceof Set) return '[object Set]';
  if (v instanceof ObjRecord) return '[object Object]';
  if (v instanceof Closure) return `function ${v.name}() { … }`;
  if (v instanceof NativeFn) return `function ${v.name}() { [native code] }`;
  if (v instanceof ClassValue) return `class ${v.name} { … }`;
  return String(v);
}

/** console.log formatting, close to what Node and browsers print. */
export function inspect(v: Value, depth = 0, seen = new Set<unknown>()): string {
  if (typeof v === 'string') return depth === 0 ? v : `'${v}'`;
  if (v === undefined || v === null || typeof v === 'number' || typeof v === 'boolean') {
    return Object.is(v, -0) ? '-0' : String(v);
  }
  if (v instanceof Closure || v instanceof NativeFn) return `[Function: ${v.name || '(anonymous)'}]`;
  if (v instanceof ClassValue) return `[class ${v.name}]`;
  if (seen.has(v)) return '[Circular]';
  if (depth > 2) {
    if (Array.isArray(v)) return '[Array]';
    if (v instanceof ObjRecord) return `[${v.className ?? 'Object'}]`;
    return '[Object]';
  }
  seen.add(v);
  let out: string;
  if (Array.isArray(v)) {
    const items = v.slice(0, 50).map((x) => inspect(x, depth + 1, seen));
    if (v.length > 50) items.push(`... ${v.length - 50} more items`);
    out = items.length ? `[ ${items.join(', ')} ]` : '[]';
  } else if (v instanceof Map) {
    const items = [...v].map(([k, x]) => `${inspect(k, depth + 1, seen)} => ${inspect(x, depth + 1, seen)}`);
    out = `Map(${v.size}) ${items.length ? `{ ${items.join(', ')} }` : '{}'}`;
  } else if (v instanceof Set) {
    const items = [...v].map((x) => inspect(x, depth + 1, seen));
    out = `Set(${v.size}) ${items.length ? `{ ${items.join(', ')} }` : '{}'}`;
  } else {
    const items = objectKeys(v).map((k) => `${k}: ${inspect(v.props.get(k), depth + 1, seen)}`);
    const prefix = v.className && v.className !== 'Object' ? `${v.className} ` : '';
    out = `${prefix}${items.length ? `{ ${items.join(', ')} }` : '{}'}`;
  }
  seen.delete(v);
  return out;
}
