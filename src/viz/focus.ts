// What a step touched, read straight from its recorded effects.
import type { ComputeDetail, Effect, Step, ValueSnap } from '../trace/types';

export interface Focus {
  reads: Set<string>;
  changed: Set<string>;
  declared: Set<string>;
  compute: Map<string, ComputeDetail>;
  cellReads: Map<number, Set<number>>;
  cellWrites: Map<number, Set<number>>;
  charReads: Map<string, Set<number>>;
  mapLookups: Map<number, { key: ValueSnap; found: boolean; method: 'get' | 'has' }[]>;
  mapInserts: Map<number, ValueSnap[]>;
  setLookups: Map<number, { value: ValueSnap; found: boolean }[]>;
  setAdds: Map<number, ValueSnap[]>;
  propWrites: { objId: number; key: string }[];
  propReads: { objId: number; key: string }[];
  created: Set<number>;
  changedObjects: Set<number>;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const list = m.get(k) ?? [];
  list.push(v);
  m.set(k, list);
}

function add<K>(m: Map<K, Set<number>>, k: K, v: number) {
  const s = m.get(k) ?? new Set<number>();
  s.add(v);
  m.set(k, s);
}

export function focusOf(step: Step | null, activeOnly = true): Focus {
  const f: Focus = {
    reads: new Set(),
    changed: new Set(),
    declared: new Set(),
    compute: new Map(),
    cellReads: new Map(),
    cellWrites: new Map(),
    charReads: new Map(),
    mapLookups: new Map(),
    mapInserts: new Map(),
    setLookups: new Map(),
    setAdds: new Map(),
    propWrites: [],
    propReads: [],
    created: new Set(),
    changedObjects: new Set(),
  };
  if (!step) return f;
  const active = step.frames[step.frames.length - 1]?.id;
  for (const e of step.effects as Effect[]) {
    switch (e.type) {
      case 'read':
        if (!activeOnly || e.frameId === active) f.reads.add(e.name);
        break;
      case 'declare':
        f.changed.add(e.name);
        f.declared.add(e.name);
        if (e.compute) f.compute.set(e.name, e.compute);
        break;
      case 'assign':
        f.changed.add(e.name);
        if (e.compute) f.compute.set(e.name, e.compute);
        break;
      case 'index-read':
        add(f.cellReads, e.objId, e.index);
        break;
      case 'index-write':
        add(f.cellWrites, e.objId, e.index);
        f.changedObjects.add(e.objId);
        break;
      case 'char-read':
        add(f.charReads, e.name, e.index);
        break;
      case 'map-lookup':
        push(f.mapLookups, e.objId, { key: e.key, found: e.found, method: e.method });
        break;
      case 'map-insert':
        push(f.mapInserts, e.objId, e.key);
        f.changedObjects.add(e.objId);
        break;
      case 'set-lookup':
        push(f.setLookups, e.objId, { value: e.value, found: e.found });
        break;
      case 'set-add':
        push(f.setAdds, e.objId, e.value);
        f.changedObjects.add(e.objId);
        break;
      case 'prop-write':
        f.propWrites.push({ objId: e.objId, key: e.key });
        f.changedObjects.add(e.objId);
        break;
      case 'prop-read':
        f.propReads.push({ objId: e.objId, key: e.key });
        break;
      case 'create':
        f.created.add(e.objId);
        break;
      case 'array-add':
      case 'array-remove':
      case 'array-change':
      case 'map-delete':
      case 'set-delete':
        f.changedObjects.add(e.objId);
        break;
    }
  }
  return f;
}

export const EMPTY_FOCUS = focusOf(null);
