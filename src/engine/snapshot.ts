// Freezes the interpreter's live state into plain data for one step.
import type { FrameSnap, Heap, HeapSnap, ValueSnap, VarSnap } from '../trace/types';
import {
  ClassValue,
  Closure,
  NativeFn,
  ObjRecord,
  isHeapValue,
  objectKeys,
  type Frame,
  type HeapValue,
  type Scope,
  type Value,
} from './values';

const MAX_ITEMS = 200;
const MAX_OBJECTS = 600;
/** Characters of a string kept in each step, like the first MAX_ITEMS items of an array. */
export const MAX_SNAP_CHARS = 200;

/**
 * A string as stored in a step. Steps are copied from the engine to the page, so a long
 * string repeated in every step would multiply the trace's size; answers are checked
 * against the real values, never against these copies.
 */
export function snapString(s: string): ValueSnap {
  return s.length > MAX_SNAP_CHARS ? { t: 'string', v: s.slice(0, MAX_SNAP_CHARS), len: s.length } : { t: 'string', v: s };
}

const sameValue = (a: ValueSnap, b: ValueSnap): boolean => {
  if (a.t !== b.t) return false;
  switch (a.t) {
    case 'ref':
      return a.id === (b as typeof a).id;
    case 'function':
      return a.name === (b as typeof a).name;
    case 'null':
    case 'undefined':
      return true;
    case 'string':
      return a.v === (b as typeof a).v && a.len === (b as typeof a).len;
    default:
      return Object.is(a.v, (b as typeof a).v);
  }
};

const sameValues = (a: ValueSnap[], b: ValueSnap[]) => a.length === b.length && a.every((x, i) => sameValue(x, b[i]));

/** Whether two snapshots of the same object have exactly the same contents. */
function sameSnap(a: HeapSnap, b: HeapSnap): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'array':
    case 'set': {
      const o = b as typeof a;
      return a.total === o.total && sameValues(a.items, o.items);
    }
    case 'map': {
      const o = b as typeof a;
      return (
        a.total === o.total &&
        a.entries.length === o.entries.length &&
        a.entries.every(([k, v], i) => sameValue(k, o.entries[i][0]) && sameValue(v, o.entries[i][1]))
      );
    }
    case 'object': {
      const o = b as typeof a;
      return (
        a.className === o.className &&
        a.entries.length === o.entries.length &&
        a.entries.every(([k, v], i) => k === o.entries[i][0] && sameValue(v, o.entries[i][1]))
      );
    }
  }
}

/**
 * Last snapshot of each object, kept for one run. A step reuses the previous snapshot object
 * when the contents are unchanged, so the trace shares it instead of repeating it: the copy
 * from the worker to the page then stores it once (structured cloning keeps shared objects
 * shared). Equality is checked on contents, so a change is never missed.
 */
export interface SnapCache {
  heap: Map<number, HeapSnap>;
  frames: Map<number, FrameSnap>;
}
export const newSnapCache = (): SnapCache => ({ heap: new Map(), frames: new Map() });

const sameLoc = (a: FrameSnap['loc'], b: FrameSnap['loc']) =>
  a === b || (!!a && !!b && a.start === b.start && a.end === b.end && a.line === b.line && a.column === b.column);

/** Whether a frame looks exactly as it did (same place, same variables and values). */
function sameFrame(a: FrameSnap, b: FrameSnap): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.label === b.label &&
    sameLoc(a.loc, b.loc) &&
    a.vars.length === b.vars.length &&
    a.vars.every((v, i) => v.name === b.vars[i].name && v.declKind === b.vars[i].declKind && sameValue(v.value, b.vars[i].value))
  );
}

export class Encoder {
  heap: Heap = {};
  /** Number of values encoded, used to cap the total size of a trace. */
  count = 0;
  private queue: HeapValue[] = [];
  private queued = new Set<number>();
  private idOf: (obj: object) => number;
  private cache: Map<number, HeapSnap> | null;

  constructor(idOf: (obj: object) => number, cache: Map<number, HeapSnap> | null = null) {
    this.idOf = idOf;
    this.cache = cache;
  }

  value(v: Value): ValueSnap {
    this.count++;
    if (v === undefined) return { t: 'undefined' };
    if (v === null) return { t: 'null' };
    if (typeof v === 'number') return { t: 'number', v };
    if (typeof v === 'string') {
      // A long string weighs more against the trace budget than a number does.
      this.count += Math.floor(Math.min(v.length, MAX_SNAP_CHARS) / 50);
      return snapString(v);
    }
    if (typeof v === 'boolean') return { t: 'boolean', v };
    if (v instanceof Closure || v instanceof NativeFn || v instanceof ClassValue) return { t: 'function', name: v.name };
    const id = this.idOf(v);
    if (!this.queued.has(id)) {
      this.queued.add(id);
      this.queue.push(v);
    }
    return { t: 'ref', id };
  }

  /** Encodes every object reachable from the values seen so far. */
  drain(): Heap {
    let count = 0;
    while (this.queue.length && count < MAX_OBJECTS) {
      const obj = this.queue.shift()!;
      count++;
      const id = this.idOf(obj);
      const snap = this.encodeObject(obj, id);
      const before = this.cache?.get(id);
      const kept = before && sameSnap(before, snap) ? before : snap;
      this.cache?.set(id, kept);
      this.heap[id] = kept;
    }
    return this.heap;
  }

  private encodeObject(obj: HeapValue, id: number): HeapSnap {
    if (Array.isArray(obj)) {
      const items: ValueSnap[] = [];
      for (let i = 0; i < Math.min(obj.length, MAX_ITEMS); i++) items.push(this.value(obj[i]));
      return { kind: 'array', id, items, total: obj.length };
    }
    if (obj instanceof Map) {
      const entries: [ValueSnap, ValueSnap][] = [];
      for (const [k, v] of obj) {
        if (entries.length >= MAX_ITEMS) break;
        entries.push([this.value(k), this.value(v)]);
      }
      return { kind: 'map', id, entries, total: obj.size };
    }
    if (obj instanceof Set) {
      const items: ValueSnap[] = [];
      for (const v of obj) {
        if (items.length >= MAX_ITEMS) break;
        items.push(this.value(v));
      }
      return { kind: 'set', id, items, total: obj.size };
    }
    const entries: [string, ValueSnap][] = [];
    if (!obj.builtin) for (const k of objectKeys(obj)) entries.push([k, this.value(obj.props.get(k))]);
    return { kind: 'object', id, className: obj.className, entries };
  }
}

/** Variables visible in a frame right now, outermost scope first. Functions and classes are left out. */
function frameVars(frame: Frame, stopAt: Scope, enc: Encoder): VarSnap[] {
  const scopes: Scope[] = [];
  for (let s: Scope | null = frame.scope; s; s = s.parent) {
    scopes.push(s);
    if (s === stopAt) break;
  }
  const seen = new Set<string>();
  const perScope: VarSnap[][] = [];
  for (const scope of scopes) {
    const list: VarSnap[] = [];
    for (const [name, b] of scope.vars) {
      if (seen.has(name)) continue;
      seen.add(name);
      if (!b.initialized || b.kind === 'builtin') continue;
      if (b.value instanceof Closure || b.value instanceof NativeFn || b.value instanceof ClassValue) continue;
      list.push({ name, value: enc.value(b.value), declKind: b.kind });
    }
    perScope.push(list);
  }
  const vars = perScope.reverse().flat();
  if (frame.thisValue instanceof ObjRecord && !frame.thisValue.builtin) {
    vars.unshift({ name: 'this', value: enc.value(frame.thisValue), declKind: 'this' });
  }
  return vars;
}

export function captureFrames(
  frames: Frame[],
  globalScope: Scope,
  idOf: (obj: object) => number,
  extra: Value[] = [],
  cache: SnapCache | null = null,
): { frames: FrameSnap[]; heap: Heap; size: number } {
  const enc = new Encoder(idOf, cache?.heap ?? null);
  const out: FrameSnap[] = frames.map((f, i) => {
    const snap: FrameSnap = {
      id: f.id,
      name: f.name,
      label: f.label,
      loc: f.loc,
      vars: frameVars(f, i === 0 ? globalScope : f.fnScope, enc),
    };
    // Shared like heap objects (see SnapCache). Never mutate a frame from here: copy it first.
    const before = cache?.frames.get(f.id);
    const kept = before && sameFrame(before, snap) ? before : snap;
    cache?.frames.set(f.id, kept);
    return kept;
  });
  for (const v of extra) if (isHeapValue(v)) enc.value(v);
  const heap = enc.drain();
  return { frames: out, heap, size: enc.count };
}
