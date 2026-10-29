import { AnimatePresence, motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../../trace/types';
import type { ShapeOf } from '../bindings';
import { useGlide } from '../theme';
import { ValueText } from '../Value';
import { GUM_WORD_COLOR } from './gumdrop';

const same = (a: ValueSnap, b: ValueSnap) => JSON.stringify(a) === JSON.stringify(b);

interface NotebookSceneProps {
  map: Extract<HeapSnap, { kind: 'map' }>;
  heap: Heap;
  name: string;
  /** Lookups and insertions this step made in the map (from the trace). */
  lookups: { key: ValueSnap; found: boolean; method: 'get' | 'has' }[];
  inserts: ValueSnap[];
  columns?: [string, string];
  shapeOf?: ShapeOf;
}

/**
 * A map as a notebook the code fills in: each line is one entry, in the order it was written.
 * A line the step just wrote is marked "written"; a lookup that finds its key lights that line
 * mint ("found it"), and a lookup that misses says so under the lines.
 */
export function NotebookScene({ map, heap, name, lookups, inserts, columns = ['key', 'value'], shapeOf }: NotebookSceneProps) {
  const glide = useGlide();
  const missing = lookups.filter((l) => !l.found && !map.entries.some(([k]) => same(k, l.key)));
  return (
    <figure className="w-fit min-w-[17rem] max-w-full rounded-[22px] bg-navy-900 py-3 pl-6 pr-4 shadow-[inset_0_0_0_1px_rgb(244_182_204/0.2)] [background-image:linear-gradient(90deg,transparent_0.9rem,rgb(244_182_204/0.35)_0.9rem,rgb(244_182_204/0.35)_calc(0.9rem+1.5px),transparent_calc(0.9rem+1.5px))]">
      <div className="flex items-baseline justify-between gap-4 pb-1.5">
        <span className="text-[14px] font-semibold text-navy-100">
          <span className="font-mono">{name}</span> notebook
        </span>
        <span className="text-[12px] text-navy-400">
          {columns[0]} → {columns[1]}
        </span>
      </div>
      {map.total === 0 && missing.length === 0 && (
        <p className="border-t border-navy-700 py-2 text-[13px] text-navy-300">Nothing written down yet.</p>
      )}
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {map.entries.map(([k, v]) => {
            const written = inserts.some((x) => same(x, k));
            const found = !written && lookups.some((l) => l.found && same(l.key, k));
            return (
              <motion.li
                key={JSON.stringify(k)}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={glide}
                className={`relative grid grid-cols-[minmax(2rem,auto)_1.25rem_minmax(2rem,auto)_1fr] items-center gap-2 border-t border-navy-700 px-2 py-1.5 text-[16px] font-semibold text-navy-50 transition-shadow duration-300 ${
                  written
                    ? 'rounded-xl shadow-[0_0_0_2px_#f5d98c] bg-amber-300/10'
                    : found
                      ? 'rounded-xl shadow-[0_0_0_2px_#9ee3c8,0_0_20px_-4px_rgb(158_227_200/0.6)] bg-emerald-300/10'
                      : ''
                }`}
              >
                <ValueText v={k} heap={heap} shapeOf={shapeOf} compact />
                <span aria-hidden className="text-center text-navy-400">
                  →
                </span>
                <ValueText v={v} heap={heap} shapeOf={shapeOf} compact />
                <span
                  className="justify-self-end text-[11.5px] font-semibold"
                  style={{ color: written ? GUM_WORD_COLOR.changed : GUM_WORD_COLOR.done }}
                >
                  {written ? 'written' : found ? 'found it' : ''}
                  {found && (
                    <span aria-hidden className="dg-sparkle ml-1 inline-block text-[#f4b6cc]">
                      ✦
                    </span>
                  )}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {missing.map((l, i) => (
        <p
          key={`miss-${i}-${JSON.stringify(l.key)}`}
          className="mt-1.5 flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] shadow-[inset_0_0_0_1.5px_rgb(198_181_242/0.5)]"
          style={{ color: GUM_WORD_COLOR.compare }}
        >
          <span className="text-[15px] font-semibold text-navy-50">
            <ValueText v={l.key} heap={heap} compact />
          </span>
          {l.method === 'has' ? 'looked for: not written down yet' : 'looked up with get: not written down, so undefined'}
        </p>
      ))}
      <figcaption className="mt-2 max-w-[min(30rem,calc(100cqw_-_4.5rem))] text-[13px] leading-snug text-navy-300">
        <span className="font-mono text-navy-100">{name}</span> is a notebook: each line is one entry the code wrote, oldest first.
      </figcaption>
    </figure>
  );
}
