// Freezes the interpreter's live state into plain data for one step.
import type { FrameSnap, Heap, HeapSnap, ValueSnap, VarSnap } from '../trace/types';
import { ClassValue, Closure, NativeFn, ObjRecord, isHeapValue, type Frame, type HeapValue, type Scope, type Value } from './values';

const MAX_ITEMS = 200;
const MAX_OBJECTS = 600;

export class Encoder {
  heap: Heap = {};
  /** Number of values encoded, used to cap the total size of a trace. */
  count = 0;
  private queue: HeapValue[] = [];
  private queued = new Set<number>();
  private idOf: (obj: object) => number;

  constructor(idOf: (obj: object) => number) {
    this.idOf = idOf;
  }

  value(v: Value): ValueSnap {
    this.count++;
    if (v === undefined) return { t: 'undefined' };
    if (v === null) return { t: 'null' };
    if (typeof v === 'number') return { t: 'number', v };
    if (typeof v === 'string') return { t: 'string', v };
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
      this.heap[id] = this.encodeObject(obj, id);
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
    if (!obj.builtin) for (const [k, v] of obj.props) entries.push([k, this.value(v)]);
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
): { frames: FrameSnap[]; heap: Heap; size: number } {
  const enc = new Encoder(idOf);
  const out: FrameSnap[] = frames.map((f, i) => ({
    id: f.id,
    name: f.name,
    label: f.label,
    loc: f.loc,
    vars: frameVars(f, i === 0 ? globalScope : f.fnScope, enc),
  }));
  for (const v of extra) if (isHeapValue(v)) enc.value(v);
  const heap = enc.drain();
  return { frames: out, heap, size: enc.count };
}
