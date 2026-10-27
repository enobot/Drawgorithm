import { AnimatePresence, motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../trace/types';
import { ValueText } from './Value';

const same = (a: ValueSnap, b: ValueSnap) => JSON.stringify(a) === JSON.stringify(b);

interface MapViewProps {
  map: Extract<HeapSnap, { kind: 'map' }>;
  heap: Heap;
  lookups: { key: ValueSnap; found: boolean; method: 'get' | 'has' }[];
  inserts: ValueSnap[];
  columns?: [string, string];
}

/** A hash map as a two-column table. Lookups and insertions are highlighted on the step they happen. */
export function MapView({ map, heap, lookups, inserts, columns = ['key', 'value'] }: MapViewProps) {
  const missing = lookups.filter((l) => !l.found && !map.entries.some(([k]) => same(k, l.key)));
  return (
    <div className="inline-flex flex-col min-w-48 rounded-xl border border-navy-600 bg-navy-850/80 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 border-b border-navy-700 text-[11px] font-semibold text-navy-400">
        <span>{columns[0]}</span>
        <span aria-hidden>→</span>
        <span>{columns[1]}</span>
      </div>
      {map.total === 0 && missing.length === 0 && <div className="px-3 py-2 text-[12px] text-navy-400">empty</div>}
      <AnimatePresence initial={false}>
        {map.entries.map(([k, v]) => {
          const inserted = inserts.some((x) => same(x, k));
          const hit = lookups.some((l) => l.found && same(l.key, k));
          return (
            <motion.div
              key={JSON.stringify(k)}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 font-mono text-[14px] border-l-[3px] ${
                inserted ? 'border-amber-300 bg-amber-300/10' : hit ? 'border-teal-300 bg-teal-300/10' : 'border-transparent'
              }`}
            >
              <ValueText v={k} heap={heap} />
              <span className="text-navy-500" aria-hidden>
                →
              </span>
              <span className="flex items-center gap-2">
                <ValueText v={v} heap={heap} />
                {inserted && <span className="font-sans text-[11px] font-semibold text-amber-300">stored</span>}
                {hit && !inserted && <span className="font-sans text-[11px] font-semibold text-teal-300">found</span>}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {missing.map((l, i) => (
        <motion.div
          key={`miss-${i}-${JSON.stringify(l.key)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-3 py-1.5 border-t border-dashed border-navy-600 text-[12px] text-navy-300"
        >
          <span className="rounded border border-dashed border-navy-400 px-1.5 font-mono text-[13px]">
            <ValueText v={l.key} heap={heap} />
          </span>
          <span>{l.method === 'has' ? 'looked up: not a key' : 'get: not a key, returns undefined'}</span>
        </motion.div>
      ))}
    </div>
  );
}

interface SetViewProps {
  set: Extract<HeapSnap, { kind: 'set' }>;
  heap: Heap;
  lookups: { value: ValueSnap; found: boolean }[];
  adds: ValueSnap[];
}

export function SetView({ set, heap, lookups, adds }: SetViewProps) {
  const missing = lookups.filter((l) => !l.found);
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-navy-600 bg-navy-850/80 px-2.5 py-2 min-h-12">
      {set.total === 0 && <span className="text-[12px] text-navy-400 px-1">empty</span>}
      <AnimatePresence initial={false}>
        {set.items.map((v) => {
          const added = adds.some((x) => same(x, v));
          const hit = lookups.some((l) => l.found && same(l.value, v));
          return (
            <motion.span
              key={JSON.stringify(v)}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className={`rounded-md border-2 px-2 py-0.5 font-mono text-[14px] bg-navy-900 ${
                added ? 'border-amber-300' : hit ? 'border-teal-300' : 'border-navy-600'
              }`}
            >
              <ValueText v={v} heap={heap} />
            </motion.span>
          );
        })}
      </AnimatePresence>
      {missing.map((l, i) => (
        <span key={i} className="rounded-md border border-dashed border-navy-400 px-2 py-0.5 font-mono text-[13px] text-navy-300">
          <ValueText v={l.value} heap={heap} /> <span className="font-sans text-[11px]">not in set</span>
        </span>
      ))}
    </div>
  );
}

interface ObjectViewProps {
  obj: Extract<HeapSnap, { kind: 'object' }>;
  heap: Heap;
  writes: Set<string>;
}

export function ObjectView({ obj, heap, writes }: ObjectViewProps) {
  return (
    <div className="inline-flex flex-col rounded-xl border border-navy-600 bg-navy-850/80 overflow-hidden min-w-40">
      {obj.className && obj.className !== 'Object' && (
        <div className="px-3 py-1 border-b border-navy-700 text-[11px] font-semibold text-navy-400">{obj.className}</div>
      )}
      {obj.entries.length === 0 && <div className="px-3 py-2 text-[12px] text-navy-400">{'{ }'}</div>}
      {obj.entries.map(([k, v]) => (
        <div
          key={k}
          className={`flex items-center gap-3 px-3 py-1 font-mono text-[13px] border-l-[3px] ${writes.has(k) ? 'border-amber-300 bg-amber-300/10' : 'border-transparent'}`}
        >
          <span className="text-navy-300">{k}</span>
          <ValueText v={v} heap={heap} />
        </div>
      ))}
    </div>
  );
}
