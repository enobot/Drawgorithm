import { AnimatePresence, motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../trace/types';
import type { ShapeOf } from './bindings';
import { GLIDE, STATE } from './theme';
import { ValueText } from './Value';

const same = (a: ValueSnap, b: ValueSnap) => JSON.stringify(a) === JSON.stringify(b);

interface MapViewProps {
  map: Extract<HeapSnap, { kind: 'map' }>;
  heap: Heap;
  lookups: { key: ValueSnap; found: boolean; method: 'get' | 'has' }[];
  inserts: ValueSnap[];
  columns?: [string, string];
  shapeOf?: ShapeOf;
}

const CARD = 'rounded-3xl bg-navy-850/90 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.2)]';

/** A hash map as key → value pairs. Lookups and insertions light up on the step they happen. */
export function MapView({ map, heap, lookups, inserts, columns = ['key', 'value'], shapeOf }: MapViewProps) {
  const missing = lookups.filter((l) => !l.found && !map.entries.some(([k]) => same(k, l.key)));
  return (
    <div className={`inline-flex min-w-52 flex-col gap-1.5 p-2.5 ${CARD}`}>
      <div className="grid grid-cols-[1fr_1.25rem_1fr] items-center gap-2 px-2 text-[11.5px] font-semibold text-navy-400">
        <span>{columns[0]}</span>
        <span aria-hidden className="text-center">
          →
        </span>
        <span>{columns[1]}</span>
      </div>
      {map.total === 0 && missing.length === 0 && <div className="px-2 py-1.5 text-[12.5px] text-navy-500">empty</div>}
      <AnimatePresence initial={false}>
        {map.entries.map(([k, v]) => {
          const inserted = inserts.some((x) => same(x, k));
          const hit = lookups.some((l) => l.found && same(l.key, k));
          const style = STATE[inserted ? 'changed' : hit ? 'compare' : 'idle'];
          return (
            <motion.div
              key={JSON.stringify(k)}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={GLIDE}
              className={`grid grid-cols-[1fr_1.25rem_1fr] items-center gap-2 rounded-2xl px-3 py-2 text-[15px] font-semibold transition-shadow duration-300 ${style.fill} ${style.ring}`}
            >
              <ValueText v={k} heap={heap} shapeOf={shapeOf} compact />
              <span className="text-center text-navy-500" aria-hidden>
                →
              </span>
              <span className="flex items-center gap-2">
                <ValueText v={v} heap={heap} shapeOf={shapeOf} compact />
                {inserted && <span className={`text-[11px] font-semibold ${STATE.changed.labelColor}`}>stored</span>}
                {hit && !inserted && <span className={`text-[11px] font-semibold ${STATE.compare.labelColor}`}>found</span>}
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
          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] text-navy-300 shadow-[inset_0_0_0_1.5px_rgb(167_139_250/0.45)] [background:repeating-linear-gradient(135deg,transparent_0_6px,rgb(167_139_250/0.08)_6px_8px)]"
        >
          <span className="text-[15px] font-semibold">
            <ValueText v={l.key} heap={heap} compact />
          </span>
          <span>{l.method === 'has' ? 'looked up: not a key' : 'get: not a key, so undefined'}</span>
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
    <div className={`flex min-h-14 flex-wrap items-center gap-2 px-3 py-2.5 ${CARD}`}>
      {set.total === 0 && <span className="px-1 text-[12.5px] text-navy-500">empty</span>}
      <AnimatePresence initial={false}>
        {set.items.map((v) => {
          const added = adds.some((x) => same(x, v));
          const hit = lookups.some((l) => l.found && same(l.value, v));
          const style = STATE[added ? 'new' : hit ? 'compare' : 'idle'];
          return (
            <motion.span
              key={JSON.stringify(v)}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={GLIDE}
              className={`rounded-full px-3 py-1 text-[15px] font-semibold ${style.fill} ${style.ring}`}
              title={added ? 'added' : hit ? 'found' : undefined}
            >
              <ValueText v={v} heap={heap} compact />
            </motion.span>
          );
        })}
      </AnimatePresence>
      {missing.map((l, i) => (
        <span key={i} className="rounded-full px-3 py-1 text-[13px] text-navy-300 shadow-[inset_0_0_0_1.5px_rgb(167_139_250/0.45)]">
          <ValueText v={l.value} heap={heap} compact /> <span className="text-[11px]">not in set</span>
        </span>
      ))}
    </div>
  );
}

interface ObjectViewProps {
  obj: Extract<HeapSnap, { kind: 'object' }>;
  heap: Heap;
  writes: Set<string>;
  shapeOf?: ShapeOf;
}

/** A plain object or class instance as a card of fields; nested objects stay short. */
export function ObjectView({ obj, heap, writes, shapeOf }: ObjectViewProps) {
  return (
    <div className={`inline-flex min-w-44 flex-col gap-1 p-2.5 ${CARD}`}>
      {obj.className && obj.className !== 'Object' && <div className="px-2 text-[11.5px] font-semibold text-navy-400">{obj.className}</div>}
      {obj.entries.length === 0 && <div className="px-2 py-1 text-[12.5px] text-navy-500">no fields</div>}
      {obj.entries.map(([k, v]) => {
        const changed = writes.has(k);
        const style = STATE[changed ? 'changed' : 'idle'];
        return (
          <div
            key={k}
            className={`flex items-center justify-between gap-4 rounded-xl px-3 py-1.5 text-[14px] ${changed ? `${style.fill} ${style.ring}` : ''}`}
          >
            <span className="text-navy-300">{k}</span>
            <span className="flex items-center gap-2 font-semibold">
              <ValueText v={v} heap={heap} shapeOf={shapeOf} compact />
              {changed && <span className={`text-[11px] ${style.labelColor}`}>changed</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
