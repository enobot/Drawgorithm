import { motion } from 'motion/react';
import type { FrameSnap, Heap } from '../trace/types';
import { formatSnap } from './analysis';
import type { Focus } from './focus';
import { GUM_WORD_COLOR } from './illustrated/gumdrop';
import { POP } from './theme';

/**
 * The few variables a problem names as its key numbers (view.statCards), as big cards above
 * the drawing. Each shows the variable's value at this step, "–" before it exists, and says
 * when the step changed or read it.
 */
export function StatCards({
  names,
  frame,
  heap,
  focus,
  active,
  comparing,
}: {
  names: string[];
  frame: FrameSnap;
  heap: Heap;
  focus: Focus;
  /** This is the frame the step happened in (only it can be changed or read now). */
  active: boolean;
  comparing: boolean;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3">
      {names.map((name) => {
        const v = frame.vars.find((x) => x.name === name);
        const changed = !!v && active && (focus.changed.has(name) || focus.declared.has(name));
        const read = !!v && active && !changed && focus.reads.has(name);
        const text = v ? formatSnap(v.value, heap) : '–';
        const word = changed ? 'changed' : read ? (comparing ? 'compared' : 'read') : null;
        return (
          <div
            key={name}
            role="group"
            aria-label={`${name}: ${v ? text : 'not set yet'}${word ? `, ${word}` : ''}`}
            className={`rounded-2xl bg-navy-850 px-4 py-3 transition-shadow duration-300 ${
              changed
                ? 'shadow-[0_0_0_2px_#f4b6cc,0_0_22px_-6px_rgb(244_182_204/0.7)]'
                : read
                  ? 'shadow-[0_0_0_2px_#c6b5f2]'
                  : 'shadow-[inset_0_0_0_1px_rgb(125_145_181/0.22)]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[13px] font-semibold text-navy-300">{name}</span>
              {word && (
                <span className="text-[11.5px] font-semibold" style={{ color: changed ? '#fbcfe8' : GUM_WORD_COLOR.compare }}>
                  {word}
                </span>
              )}
            </div>
            <motion.div
              key={changed ? text : 'same'}
              initial={changed ? { scale: 1.12 } : false}
              animate={{ scale: 1 }}
              transition={POP}
              className="mt-0.5 origin-left font-mono text-[28px] font-bold leading-tight text-navy-50"
            >
              {text}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
