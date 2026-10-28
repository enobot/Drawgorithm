// The small standard library user code can reach. Everything here is written
// against interpreter values; nothing exposes the real global object.
import type * as ES from 'estree';
import type { Effect, ValueSnap } from '../trace/types';
import { inspect, toStr } from './describe';
import { sameValueZero, toNumber, toPrimitive, truthy } from './ops';
import { ClassValue, Closure, NativeFn, ObjRecord, objectKeys, type HeapValue, type Value } from './values';

export const MAX_ARRAY_LENGTH = 100_000;
/** Longest string a program may build, so one runaway string can't exhaust the worker's memory. */
export const MAX_STRING_LENGTH = 1_000_000;

/** Stops the run with a clear message when a string would be longer than MAX_STRING_LENGTH. */
export function checkStringLength(host: Pick<Host, 'fail'>, length: number, node: ES.Node): void {
  if (length > MAX_STRING_LENGTH) {
    host.fail(
      'limit',
      'RangeError',
      `Strings are limited to ${MAX_STRING_LENGTH.toLocaleString('en-US')} characters in Drawgorithms.`,
      node,
    );
  }
}

export interface Host {
  /** Calls a callback (e.g. the function passed to map or sort). */
  call(fn: Value, thisArg: Value, args: Value[], node: ES.Node): Value;
  fail(kind: 'runtime' | 'unsupported' | 'limit', name: string, message: string, node: ES.Node): never;
  effect(e: Effect, refs?: HeapValue[]): void;
  snap(v: Value): ValueSnap;
  idOf(obj: object): number;
  log(text: string, level: 'log' | 'error', node: ES.Node): void;
  /** Registers a TreeNode/ListNode so Live Build can show it even when detached. */
  registerNode(obj: ObjRecord): void;
  tick(node: ES.Node): void;
}

function native(name: string, fn: (args: Value[], node: ES.Node, thisArg: Value) => Value): NativeFn {
  return new NativeFn(name, (thisArg, args, node) => fn(args, node, thisArg));
}

function isFn(v: Value): boolean {
  return v instanceof Closure || v instanceof NativeFn;
}

function requireFn(host: Host, v: Value, what: string, node: ES.Node): void {
  if (!isFn(v)) host.fail('runtime', 'TypeError', `${toStr(v)} is not a function (${what} needs a callback)`, node);
}

function relIndex(v: Value, len: number, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Math.trunc(toNumber(v)) || 0;
  return n < 0 ? Math.max(len + n, 0) : Math.min(n, len);
}

function checkLength(host: Host, len: number, node: ES.Node): void {
  if (len > MAX_ARRAY_LENGTH) {
    host.fail('limit', 'RangeError', `Arrays are limited to ${MAX_ARRAY_LENGTH.toLocaleString('en-US')} items in Drawgorithms.`, node);
  }
}

/** Values of something for-of, spread or Array.from can walk over. */
export function iterate(host: Host, v: Value, node: ES.Node): Value[] {
  if (Array.isArray(v)) return v.slice();
  if (typeof v === 'string') return [...v];
  if (v instanceof Map) return [...v].map(([k, x]) => [k, x]);
  if (v instanceof Set) return [...v];
  return host.fail('runtime', 'TypeError', `${v === null ? 'null' : typeof v === 'object' ? 'object' : toStr(v)} is not iterable`, node);
}

/** Real JavaScript method names, to tell "not supported yet" apart from "doesn't exist". */
export function isKnownNativeMethod(obj: Value, key: string): boolean {
  if (Array.isArray(obj)) return key in Array.prototype;
  if (typeof obj === 'string') return key in String.prototype;
  if (obj instanceof Map) return key in Map.prototype;
  if (obj instanceof Set) return key in Set.prototype;
  if (typeof obj === 'number') return key in Number.prototype;
  return false;
}

export function arrayMethod(host: Host, arr: Value[], key: string): NativeFn | undefined {
  const id = () => host.idOf(arr);
  const callback = (fn: Value, what: string, node: ES.Node) => {
    requireFn(host, fn, what, node);
    return (x: Value, i: number) => host.call(fn, undefined, [x, i, arr], node);
  };
  switch (key) {
    case 'push':
      return native('push', (args, node) => {
        checkLength(host, arr.length + args.length, node);
        arr.push(...args);
        host.effect({ type: 'array-add', objId: id(), end: 'back', values: args.map((a) => host.snap(a)) }, [arr]);
        return arr.length;
      });
    case 'pop':
      return native('pop', () => {
        if (!arr.length) return undefined;
        const v = arr.pop();
        host.effect({ type: 'array-remove', objId: id(), end: 'back', value: host.snap(v) }, [arr]);
        return v;
      });
    case 'shift':
      return native('shift', () => {
        if (!arr.length) return undefined;
        const v = arr.shift();
        host.effect({ type: 'array-remove', objId: id(), end: 'front', value: host.snap(v) }, [arr]);
        return v;
      });
    case 'unshift':
      return native('unshift', (args, node) => {
        checkLength(host, arr.length + args.length, node);
        arr.unshift(...args);
        host.effect({ type: 'array-add', objId: id(), end: 'front', values: args.map((a) => host.snap(a)) }, [arr]);
        return arr.length;
      });
    case 'slice':
      return native('slice', (args) => arr.slice(relIndex(args[0], arr.length, 0), relIndex(args[1], arr.length, arr.length)));
    case 'splice':
      return native('splice', (args, node) => {
        const start = relIndex(args[0], arr.length, 0);
        const count = args.length < 2 ? arr.length - start : Math.max(0, Math.trunc(toNumber(args[1])) || 0);
        checkLength(host, arr.length + Math.max(0, args.length - 2), node);
        const removed = arr.splice(start, count, ...args.slice(2));
        host.effect({ type: 'array-change', objId: id(), method: 'splice' }, [arr]);
        return removed;
      });
    case 'concat':
      return native('concat', (args, node) => {
        const out = arr.slice();
        for (const a of args) {
          if (Array.isArray(a)) out.push(...a);
          else out.push(a);
        }
        checkLength(host, out.length, node);
        return out;
      });
    case 'indexOf':
      return native('indexOf', (args) => {
        for (let i = relIndex(args[1], arr.length, 0); i < arr.length; i++) if (arr[i] === args[0]) return i;
        return -1;
      });
    case 'lastIndexOf':
      return native('lastIndexOf', (args) => {
        for (let i = arr.length - 1; i >= 0; i--) if (arr[i] === args[0]) return i;
        return -1;
      });
    case 'includes':
      return native('includes', (args) => arr.some((x) => sameValueZero(x, args[0])));
    case 'join':
      return native('join', (args, node) => {
        const sep = args[0] === undefined ? ',' : toStr(args[0]);
        const parts = arr.map((x) => (x === null || x === undefined ? '' : toStr(x)));
        // Measure before joining: the joined string is never built if it would be too long.
        checkStringLength(host, parts.reduce((n, p) => n + p.length, 0) + sep.length * Math.max(parts.length - 1, 0), node);
        return parts.join(sep);
      });
    case 'reverse':
      return native('reverse', () => {
        arr.reverse();
        host.effect({ type: 'array-change', objId: id(), method: 'reverse' }, [arr]);
        return arr;
      });
    case 'sort':
      return native('sort', (args, node) => {
        const cmp = args[0];
        if (cmp !== undefined) requireFn(host, cmp, 'sort', node);
        const sorted = arr.slice();
        if (cmp === undefined) {
          // Default sort compares as strings: [10, 9, 1].sort() gives [1, 10, 9], like real JavaScript.
          sorted.sort((a, b) => {
            if (a === undefined) return b === undefined ? 0 : 1;
            if (b === undefined) return -1;
            const sa = toStr(a);
            const sb = toStr(b);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
          });
        } else {
          sorted.sort((a, b) => toNumber(host.call(cmp, undefined, [a, b], node)) || 0);
        }
        for (let i = 0; i < sorted.length; i++) arr[i] = sorted[i];
        host.effect({ type: 'array-change', objId: id(), method: 'sort' }, [arr]);
        return arr;
      });
    case 'fill':
      return native('fill', (args) => {
        const start = relIndex(args[1], arr.length, 0);
        const end = relIndex(args[2], arr.length, arr.length);
        for (let i = start; i < end; i++) arr[i] = args[0];
        host.effect({ type: 'array-change', objId: id(), method: 'fill' }, [arr]);
        return arr;
      });
    case 'at':
      return native('at', (args) => {
        const n = Math.trunc(toNumber(args[0])) || 0;
        return arr[n < 0 ? arr.length + n : n];
      });
    case 'map':
      return native('map', (args, node) => {
        const f = callback(args[0], 'map', node);
        const len = arr.length;
        const out: Value[] = [];
        for (let i = 0; i < len; i++) out.push(f(arr[i], i));
        return out;
      });
    case 'filter':
      return native('filter', (args, node) => {
        const f = callback(args[0], 'filter', node);
        const len = arr.length;
        const out: Value[] = [];
        for (let i = 0; i < len; i++) if (truthy(f(arr[i], i))) out.push(arr[i]);
        return out;
      });
    case 'forEach':
      return native('forEach', (args, node) => {
        const f = callback(args[0], 'forEach', node);
        const len = arr.length;
        for (let i = 0; i < len && i < arr.length; i++) f(arr[i], i);
        return undefined;
      });
    case 'some':
      return native('some', (args, node) => {
        const f = callback(args[0], 'some', node);
        for (let i = 0; i < arr.length; i++) if (truthy(f(arr[i], i))) return true;
        return false;
      });
    case 'every':
      return native('every', (args, node) => {
        const f = callback(args[0], 'every', node);
        for (let i = 0; i < arr.length; i++) if (!truthy(f(arr[i], i))) return false;
        return true;
      });
    case 'find':
    case 'findIndex':
    case 'findLast':
    case 'findLastIndex':
      return native(key, (args, node) => {
        const f = callback(args[0], key, node);
        const backwards = key.startsWith('findLast');
        for (let k = 0; k < arr.length; k++) {
          const i = backwards ? arr.length - 1 - k : k;
          if (truthy(f(arr[i], i))) return key.endsWith('Index') ? i : arr[i];
        }
        return key.endsWith('Index') ? -1 : undefined;
      });
    case 'reduce':
    case 'reduceRight':
      return native(key, (args, node) => {
        requireFn(host, args[0], key, node);
        const order = arr.map((_, i) => i);
        if (key === 'reduceRight') order.reverse();
        let k = 0;
        let acc: Value;
        if (args.length >= 2) acc = args[1];
        else {
          if (!order.length) host.fail('runtime', 'TypeError', 'Reduce of empty array with no initial value', node);
          acc = arr[order[k++]];
        }
        for (; k < order.length; k++) acc = host.call(args[0], undefined, [acc, arr[order[k]], order[k], arr], node);
        return acc;
      });
    case 'keys':
      return native('keys', () => arr.map((_, i) => i));
    case 'values':
      return native('values', () => arr.slice());
    case 'entries':
      return native('entries', () => arr.map((x, i) => [i, x]));
    case 'flat':
      return native('flat', (args) => {
        const depth = args[0] === undefined ? 1 : toNumber(args[0]);
        const flatten = (a: Value[], d: number): Value[] => a.flatMap((x) => (Array.isArray(x) && d > 0 ? flatten(x, d - 1) : [x]));
        return flatten(arr, depth);
      });
    case 'toString':
      return native('toString', () => toStr(arr));
  }
  return undefined;
}

export function stringMethod(host: Host, s: string, key: string): NativeFn | undefined {
  const str = (v: Value) => (v === undefined ? 'undefined' : toStr(v));
  const onlyStrings = (v: Value, what: string, node: ES.Node) => {
    if (typeof v !== 'string') host.fail('unsupported', 'Unsupported', `${what} with a non-string pattern is not supported yet.`, node);
  };
  switch (key) {
    case 'charAt':
      return native('charAt', (a) => s.charAt(toNumber(a[0] ?? 0)));
    case 'charCodeAt':
      return native('charCodeAt', (a) => s.charCodeAt(toNumber(a[0] ?? 0)));
    case 'codePointAt':
      return native('codePointAt', (a) => s.codePointAt(toNumber(a[0] ?? 0)));
    case 'at':
      return native('at', (a) => s.at(toNumber(a[0] ?? 0)));
    case 'indexOf':
      return native('indexOf', (a) => s.indexOf(str(a[0]), a[1] === undefined ? undefined : toNumber(a[1])));
    case 'lastIndexOf':
      return native('lastIndexOf', (a) => s.lastIndexOf(str(a[0])));
    case 'includes':
      return native('includes', (a) => s.includes(str(a[0])));
    case 'startsWith':
      return native('startsWith', (a) => s.startsWith(str(a[0])));
    case 'endsWith':
      return native('endsWith', (a) => s.endsWith(str(a[0])));
    case 'slice':
      return native('slice', (a) =>
        s.slice(a[0] === undefined ? undefined : toNumber(a[0]), a[1] === undefined ? undefined : toNumber(a[1])),
      );
    case 'substring':
      return native('substring', (a) => s.substring(toNumber(a[0] ?? 0), a[1] === undefined ? undefined : toNumber(a[1])));
    case 'split':
      return native('split', (a, node) => {
        if (a[0] === undefined) return [s];
        onlyStrings(a[0], 'split()', node);
        return s.split(a[0] as string, a[1] === undefined ? undefined : toNumber(a[1]));
      });
    case 'toLowerCase':
      return native('toLowerCase', () => s.toLowerCase());
    case 'toUpperCase':
      return native('toUpperCase', () => s.toUpperCase());
    case 'trim':
      return native('trim', () => s.trim());
    case 'trimStart':
      return native('trimStart', () => s.trimStart());
    case 'trimEnd':
      return native('trimEnd', () => s.trimEnd());
    case 'padStart':
      return native('padStart', (a, node) => {
        checkStringLength(host, toNumber(a[0]), node);
        return s.padStart(toNumber(a[0]), a[1] === undefined ? ' ' : str(a[1]));
      });
    case 'padEnd':
      return native('padEnd', (a, node) => {
        checkStringLength(host, toNumber(a[0]), node);
        return s.padEnd(toNumber(a[0]), a[1] === undefined ? ' ' : str(a[1]));
      });
    case 'repeat':
      return native('repeat', (a, node) => {
        const n = toNumber(a[0]);
        if (s.length * n > MAX_STRING_LENGTH) host.fail('limit', 'RangeError', 'That string would be too long for Drawgorithms.', node);
        return s.repeat(n);
      });
    case 'concat':
      return native('concat', (a, node) => {
        const parts = a.map(str);
        checkStringLength(
          host,
          parts.reduce((n, p) => n + p.length, s.length),
          node,
        );
        return s + parts.join('');
      });
    case 'replace':
    case 'replaceAll':
      return native(key, (a, node) => {
        onlyStrings(a[0], `${key}()`, node);
        const pattern = a[0] as string;
        const rep = a[1];
        const replacer = (match: string) => (isFn(rep) ? toStr(host.call(rep, undefined, [match], node)) : str(rep));
        const out = key === 'replace' ? s.replace(pattern, replacer) : s.replaceAll(pattern, replacer);
        checkStringLength(host, out.length, node);
        return out;
      });
    case 'localeCompare':
      return native('localeCompare', (a) => s.localeCompare(str(a[0])));
    case 'toString':
    case 'valueOf':
      return native(key, () => s);
  }
  return undefined;
}

export function numberMethod(n: number, key: string): NativeFn | undefined {
  switch (key) {
    case 'toFixed':
      return native('toFixed', (a) => n.toFixed(a[0] === undefined ? 0 : toNumber(a[0])));
    case 'toString':
      return native('toString', (a) => n.toString(a[0] === undefined ? 10 : toNumber(a[0])));
  }
  return undefined;
}

export function mapMethod(host: Host, map: Map<Value, Value>, key: string): NativeFn | undefined {
  const id = () => host.idOf(map);
  // Native Map lookups already use SameValueZero, like JavaScript.
  const find = (k: Value): Value | typeof NOT_FOUND => (map.has(k) ? map.get(k) : NOT_FOUND);
  switch (key) {
    case 'get':
      return native('get', (a) => {
        const v = find(a[0]);
        const found = v !== NOT_FOUND;
        host.effect(
          { type: 'map-lookup', objId: id(), key: host.snap(a[0]), found, value: found ? host.snap(v as Value) : undefined, method: 'get' },
          [map],
        );
        return found ? (v as Value) : undefined;
      });
    case 'has':
      return native('has', (a) => {
        const v = find(a[0]);
        const found = v !== NOT_FOUND;
        host.effect(
          { type: 'map-lookup', objId: id(), key: host.snap(a[0]), found, value: found ? host.snap(v as Value) : undefined, method: 'has' },
          [map],
        );
        return found;
      });
    case 'set':
      return native('set', (a, node) => {
        const before = find(a[0]);
        if (before === NOT_FOUND) checkLength(host, map.size + 1, node);
        map.set(a[0], a[1]);
        host.effect(
          {
            type: 'map-insert',
            objId: id(),
            key: host.snap(a[0]),
            value: host.snap(a[1]),
            before: before === NOT_FOUND ? undefined : host.snap(before as Value),
          },
          [map],
        );
        return map;
      });
    case 'delete':
      return native('delete', (a) => {
        const existed = map.delete(a[0]);
        host.effect({ type: 'map-delete', objId: id(), key: host.snap(a[0]), existed }, [map]);
        return existed;
      });
    case 'clear':
      return native('clear', () => {
        map.clear();
        host.effect({ type: 'array-change', objId: id(), method: 'clear' }, [map]);
        return undefined;
      });
    case 'keys':
      return native('keys', () => [...map.keys()]);
    case 'values':
      return native('values', () => [...map.values()]);
    case 'entries':
      return native('entries', () => [...map].map(([k, v]) => [k, v]));
    case 'forEach':
      return native('forEach', (a, node) => {
        requireFn(host, a[0], 'forEach', node);
        for (const [k, v] of [...map]) host.call(a[0], undefined, [v, k, map], node);
        return undefined;
      });
  }
  return undefined;
}

const NOT_FOUND = Symbol('not found');

export function setMethod(host: Host, set: Set<Value>, key: string): NativeFn | undefined {
  const id = () => host.idOf(set);
  switch (key) {
    case 'add':
      return native('add', (a, node) => {
        const existed = set.has(a[0]);
        if (!existed) checkLength(host, set.size + 1, node);
        set.add(a[0]);
        host.effect({ type: 'set-add', objId: id(), value: host.snap(a[0]), existed }, [set]);
        return set;
      });
    case 'has':
      return native('has', (a) => {
        const found = set.has(a[0]);
        host.effect({ type: 'set-lookup', objId: id(), value: host.snap(a[0]), found }, [set]);
        return found;
      });
    case 'delete':
      return native('delete', (a) => {
        const existed = set.delete(a[0]);
        host.effect({ type: 'set-delete', objId: id(), value: host.snap(a[0]), existed }, [set]);
        return existed;
      });
    case 'clear':
      return native('clear', () => {
        set.clear();
        host.effect({ type: 'array-change', objId: id(), method: 'clear' }, [set]);
        return undefined;
      });
    case 'values':
    case 'keys':
      return native(key, () => [...set]);
    case 'entries':
      return native('entries', () => [...set].map((v) => [v, v]));
    case 'forEach':
      return native('forEach', (a, node) => {
        requireFn(host, a[0], 'forEach', node);
        for (const v of [...set]) host.call(a[0], undefined, [v, v, set], node);
        return undefined;
      });
  }
  return undefined;
}

function namespace(name: string, members: Record<string, Value>): ObjRecord {
  const obj = new ObjRecord(name, null, true);
  for (const [k, v] of Object.entries(members)) obj.props.set(k, v);
  return obj;
}

function mathFn(name: string, f: (...n: number[]) => number): NativeFn {
  return native(name, (args) => f(...args.map(toNumber)));
}

/** Converts parsed JSON into interpreter values. */
export function fromJSON(v: unknown): Value {
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(fromJSON);
  if (typeof v === 'object') {
    const obj = new ObjRecord(null);
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) obj.props.set(k, fromJSON(x));
    return obj;
  }
  return undefined;
}

/** Converts interpreter values to JSON-friendly data. Trees become LeetCode-style level-order arrays. */
export function toPlain(v: Value, seen = new Set<unknown>()): unknown {
  if (v instanceof Closure || v instanceof NativeFn || v instanceof ClassValue) return `[function ${v.name}]`;
  if (v === undefined || v === null || typeof v !== 'object') return v;
  if (seen.has(v)) return '[cycle]';
  if (v instanceof ObjRecord && v.className === 'TreeNode') return treeToArray(v);
  if (v instanceof ObjRecord && v.className === 'ListNode') return listToArray(v);
  seen.add(v);
  let out: unknown;
  if (Array.isArray(v)) out = v.map((x) => toPlain(x, seen));
  else if (v instanceof Map) out = [...v].map(([k, x]) => [toPlain(k, seen), toPlain(x, seen)]);
  else if (v instanceof Set) out = [...v].map((x) => toPlain(x, seen));
  else {
    const o: Record<string, unknown> = {};
    for (const [k, x] of v.props) o[k] = toPlain(x, seen);
    out = o;
  }
  seen.delete(v);
  return out;
}

function listToArray(head: ObjRecord): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<ObjRecord>();
  let cur: Value = head;
  while (cur instanceof ObjRecord) {
    if (seen.has(cur)) {
      out.push('[cycle]');
      break;
    }
    seen.add(cur);
    out.push(toPlain(cur.props.get('val')));
    cur = cur.props.get('next');
  }
  return out;
}

function treeToArray(root: ObjRecord): unknown[] {
  const out: unknown[] = [];
  const queue: Value[] = [root];
  const seen = new Set<ObjRecord>();
  while (queue.length) {
    const n = queue.shift();
    if (n instanceof ObjRecord) {
      if (seen.has(n)) {
        out.push('[cycle]');
        continue;
      }
      seen.add(n);
      out.push(toPlain(n.props.get('val')));
      queue.push(n.props.get('left') ?? null, n.props.get('right') ?? null);
    } else {
      out.push(null);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

export function makeTreeNode(host: Host, val: Value, left: Value, right: Value): ObjRecord {
  const node = new ObjRecord('TreeNode');
  node.props.set('val', val);
  node.props.set('left', left);
  node.props.set('right', right);
  host.registerNode(node);
  return node;
}

export function makeListNode(host: Host, val: Value, next: Value): ObjRecord {
  const node = new ObjRecord('ListNode');
  node.props.set('val', val);
  node.props.set('next', next);
  host.registerNode(node);
  return node;
}

/** Builds a tree from LeetCode's level-order array format, e.g. [5,3,8,null,4]. */
export function buildTree(host: Host, items: unknown[]): Value {
  if (!items.length || items[0] === null) return null;
  const root = makeTreeNode(host, fromJSON(items[0]), null, null);
  const queue = [root];
  let i = 1;
  while (queue.length && i < items.length) {
    const parent = queue.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (i >= items.length) break;
      const item = items[i++];
      if (item !== null && item !== undefined) {
        const child = makeTreeNode(host, fromJSON(item), null, null);
        parent.props.set(side, child);
        queue.push(child);
      }
    }
  }
  return root;
}

/** `pos` (0 to length - 1) links the last node back to the node at that index; -1 means no cycle. */
export function buildList(host: Host, items: unknown[], pos = -1): Value {
  const nodes: ObjRecord[] = [];
  for (let i = items.length - 1; i >= 0; i--) nodes.unshift(makeListNode(host, fromJSON(items[i]), nodes[0] ?? null));
  if (pos >= 0 && pos < nodes.length) nodes[nodes.length - 1].props.set('next', nodes[pos]);
  return nodes[0] ?? null;
}

export function makeGlobals(host: Host): Map<string, Value> {
  const g = new Map<string, Value>();

  g.set('undefined', undefined);
  g.set('NaN', NaN);
  g.set('Infinity', Infinity);

  g.set(
    'Math',
    namespace('Math', {
      PI: Math.PI,
      E: Math.E,
      abs: mathFn('abs', Math.abs),
      max: mathFn('max', Math.max),
      min: mathFn('min', Math.min),
      floor: mathFn('floor', Math.floor),
      ceil: mathFn('ceil', Math.ceil),
      round: mathFn('round', Math.round),
      trunc: mathFn('trunc', Math.trunc),
      sign: mathFn('sign', Math.sign),
      sqrt: mathFn('sqrt', Math.sqrt),
      cbrt: mathFn('cbrt', Math.cbrt),
      pow: mathFn('pow', Math.pow),
      log: mathFn('log', Math.log),
      log2: mathFn('log2', Math.log2),
      log10: mathFn('log10', Math.log10),
      exp: mathFn('exp', Math.exp),
      hypot: mathFn('hypot', Math.hypot),
      random: native('random', () => Math.random()),
    }),
  );

  const consoleFn = (level: 'log' | 'error') =>
    native(level, (args, node) => {
      const text = args.map((a) => inspect(a)).join(' ');
      host.log(text, level, node);
      host.effect({ type: 'log', text });
      return undefined;
    });
  g.set(
    'console',
    namespace('console', {
      log: consoleFn('log'),
      info: consoleFn('log'),
      debug: consoleFn('log'),
      warn: consoleFn('error'),
      error: consoleFn('error'),
    }),
  );

  const numberFn = new NativeFn('Number', (_t, args) => (args.length ? toNumber(args[0]) : 0));
  for (const [k, v] of Object.entries({
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    MAX_VALUE: Number.MAX_VALUE,
    MIN_VALUE: Number.MIN_VALUE,
    EPSILON: Number.EPSILON,
    POSITIVE_INFINITY: Infinity,
    NEGATIVE_INFINITY: -Infinity,
    NaN: NaN,
  }))
    numberFn.statics.set(k, v);
  numberFn.statics.set(
    'isInteger',
    native('isInteger', (a) => Number.isInteger(a[0])),
  );
  numberFn.statics.set(
    'isNaN',
    native('isNaN', (a) => Number.isNaN(a[0])),
  );
  numberFn.statics.set(
    'isFinite',
    native('isFinite', (a) => Number.isFinite(a[0])),
  );
  numberFn.statics.set(
    'parseInt',
    native('parseInt', (a) => parseInt(toStr(a[0]), a[1] === undefined ? undefined : toNumber(a[1]))),
  );
  numberFn.statics.set(
    'parseFloat',
    native('parseFloat', (a) => parseFloat(toStr(a[0]))),
  );
  g.set('Number', numberFn);
  g.set('parseInt', numberFn.statics.get('parseInt'));
  g.set('parseFloat', numberFn.statics.get('parseFloat'));
  g.set(
    'isNaN',
    native('isNaN', (a) => Number.isNaN(toNumber(a[0]))),
  );
  g.set(
    'isFinite',
    native('isFinite', (a) => Number.isFinite(toNumber(a[0]))),
  );

  const stringFn = new NativeFn('String', (_t, args) => (args.length ? toStr(args[0]) : ''));
  stringFn.statics.set(
    'fromCharCode',
    native('fromCharCode', (a) => String.fromCharCode(...a.map(toNumber))),
  );
  g.set('String', stringFn);
  g.set('Boolean', new NativeFn('Boolean', (_t, args) => truthy(args[0])));

  const makeArray = (args: Value[], node: ES.Node): Value[] => {
    if (args.length === 1 && typeof args[0] === 'number') {
      const n = args[0];
      if (!Number.isInteger(n) || n < 0) host.fail('runtime', 'RangeError', 'Invalid array length', node);
      checkLength(host, n, node);
      return new Array<Value>(n).fill(undefined);
    }
    return args.slice();
  };
  const arrayFn = new NativeFn(
    'Array',
    (_t, args, node) => makeArray(args, node),
    (args, node) => makeArray(args, node),
  );
  arrayFn.statics.set(
    'isArray',
    native('isArray', (a) => Array.isArray(a[0])),
  );
  arrayFn.statics.set(
    'of',
    native('of', (a) => a.slice()),
  );
  arrayFn.statics.set(
    'from',
    native('from', (a, node) => {
      const src = a[0];
      let items: Value[];
      if (src instanceof ObjRecord && src.props.has('length')) {
        const n = toNumber(src.props.get('length'));
        checkLength(host, n, node);
        items = new Array<Value>(n).fill(undefined);
      } else {
        items = iterate(host, src, node);
      }
      if (a[1] !== undefined) {
        requireFn(host, a[1], 'Array.from', node);
        return items.map((x, i) => host.call(a[1], undefined, [x, i], node));
      }
      return items;
    }),
  );
  g.set('Array', arrayFn);

  const objectFn = new NativeFn('Object', null);
  const ownKeys = (v: Value): string[] => {
    if (v instanceof ObjRecord) return objectKeys(v);
    if (Array.isArray(v)) return v.map((_, i) => String(i));
    if (typeof v === 'string') return [...v].map((_, i) => String(i));
    return [];
  };
  const getOwn = (v: Value, k: string): Value => {
    if (v instanceof ObjRecord) return v.props.get(k);
    if (Array.isArray(v) || typeof v === 'string') return v[Number(k)];
    return undefined;
  };
  objectFn.statics.set(
    'keys',
    native('keys', (a) => ownKeys(a[0])),
  );
  objectFn.statics.set(
    'values',
    native('values', (a) => ownKeys(a[0]).map((k) => getOwn(a[0], k))),
  );
  objectFn.statics.set(
    'entries',
    native('entries', (a) => ownKeys(a[0]).map((k) => [k, getOwn(a[0], k)])),
  );
  objectFn.statics.set(
    'fromEntries',
    native('fromEntries', (a, node) => {
      const obj = new ObjRecord(null);
      for (const pair of iterate(host, a[0], node)) {
        if (Array.isArray(pair)) obj.props.set(toStr(toPrimitive(pair[0])), pair[1]);
      }
      return obj;
    }),
  );
  g.set('Object', objectFn);

  g.set(
    'JSON',
    namespace('JSON', {
      stringify: native('stringify', (a, node) => {
        const plain = toPlain(a[0]);
        const text = plain === undefined ? undefined : JSON.stringify(plain);
        if (text !== undefined) checkStringLength(host, text.length, node);
        return text;
      }),
      parse: native('parse', (a, node) => {
        try {
          return fromJSON(JSON.parse(toStr(a[0])));
        } catch (e) {
          return host.fail('runtime', 'SyntaxError', (e as Error).message, node);
        }
      }),
    }),
  );

  const needsNew =
    (name: string) =>
    (_t: Value, _a: Value[], node: ES.Node): Value =>
      host.fail('runtime', 'TypeError', `Constructor ${name} requires 'new'`, node);

  g.set(
    'Map',
    new NativeFn('Map', needsNew('Map'), (args, node) => {
      const m = new Map<Value, Value>();
      if (args[0] !== undefined && args[0] !== null) {
        for (const pair of iterate(host, args[0], node)) {
          if (!Array.isArray(pair)) host.fail('runtime', 'TypeError', `Iterator value ${toStr(pair)} is not an entry object`, node);
          m.set(pair[0], pair[1]);
        }
      }
      return m;
    }),
  );
  g.set(
    'Set',
    new NativeFn('Set', needsNew('Set'), (args, node) => {
      const s = new Set<Value>();
      if (args[0] !== undefined && args[0] !== null) for (const v of iterate(host, args[0], node)) s.add(v);
      return s;
    }),
  );

  // Errors for `throw new Error("...")`. Callable with or without new, as in JavaScript. The
  // name and message are ordinary fields here (in JavaScript they don't show up in Object.keys).
  for (const name of ERROR_CLASSES) {
    const make = (args: Value[]) => {
      const e = new ObjRecord(name);
      e.props.set('name', name);
      e.props.set('message', args[0] === undefined ? '' : toStr(args[0]));
      return e;
    };
    g.set(
      name,
      new NativeFn(
        name,
        (_t, args) => make(args),
        (args) => make(args),
      ),
    );
  }

  g.set(
    'TreeNode',
    new NativeFn('TreeNode', needsNew('TreeNode'), (args) =>
      makeTreeNode(
        host,
        args[0] === undefined ? 0 : args[0],
        args[1] === undefined ? null : args[1],
        args[2] === undefined ? null : args[2],
      ),
    ),
  );
  g.set(
    'ListNode',
    new NativeFn('ListNode', needsNew('ListNode'), (args) =>
      makeListNode(host, args[0] === undefined ? 0 : args[0], args[1] === undefined ? null : args[1]),
    ),
  );

  return g;
}

/** Globals that exist in browsers but are deliberately unavailable to user code. */
export const BLOCKED_GLOBALS = new Set([
  'window',
  'document',
  'globalThis',
  'self',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'location',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'Promise',
  'eval',
  'Function',
  'importScripts',
  'postMessage',
  'alert',
  'prompt',
  'confirm',
  'process',
  'require',
  'Worker',
  'crypto',
  'Reflect',
  'Proxy',
  'Symbol',
  'WeakMap',
  'WeakSet',
  'Date',
  'RegExp',
  'BigInt',
  'Intl',
  'structuredClone',
  'queueMicrotask',
]);

const ERROR_CLASSES = ['Error', 'TypeError', 'RangeError'];

/** Classes that support `instanceof`. */
export function instanceOf(v: Value, ctor: Value): boolean {
  if (ctor instanceof NativeFn) {
    switch (ctor.name) {
      case 'Error':
        return v instanceof ObjRecord && ERROR_CLASSES.includes(v.className ?? '');
      case 'TypeError':
      case 'RangeError':
        return v instanceof ObjRecord && v.className === ctor.name;
      case 'Array':
        return Array.isArray(v);
      case 'Map':
        return v instanceof Map;
      case 'Set':
        return v instanceof Set;
      case 'Object':
        return v !== null && typeof v === 'object';
      case 'TreeNode':
      case 'ListNode':
        return v instanceof ObjRecord && v.className === ctor.name;
    }
    return false;
  }
  if (ctor instanceof ClassValue) return v instanceof ObjRecord && v.proto === ctor;
  if (ctor instanceof Closure) return v instanceof ObjRecord && v.className === ctor.name && v.proto === null;
  return false;
}
