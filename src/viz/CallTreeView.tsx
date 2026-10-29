// Recursion drawn as a tree of calls: each box is one call with the arguments it got, under
// the call that made it. The tree grows as the run makes calls; the running call is lit, the
// calls waiting on it are ringed, and a finished call shows what it returned. Read from the
// recorded frames (readCallTree), so it is the learner's own search, dead ends included.
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import type { Heap, Step } from '../trace/types';
import { formatSnap } from './analysis';
import { useDialect } from './dialectContext';
import { naryLayout, readCallTree, type CallNode, type CallTree } from './structures';
import { STATE, useGlide, type VisualState } from './theme';

const BOX_H = 30;
const LEVEL = 76;
/** Smallest space between neighboring boxes. */
const GAP = 14;
const TOP = 6;
const PAD_X = 10;
/** Width of one 12px monospace character. */
const CHAR = 7.3;
/** Characters shown in a box; the whole call is in its tooltip. */
const MAX_TEXT = 22;
/** Room under the bottom row for the returned values. */
const RETURN_ROOM = 20;
/** Larger trees are not drawn as a picture; the call stack still shows the running calls. */
export const MAX_CALLS = 160;

const shorten = (text: string, max: number) => (text.length <= max ? text : text.slice(0, max - 1) + '…');
const boxWidth = (text: string) => Math.max(36, Math.ceil(text.length * CHAR) + 20);

export interface CallTreeViewProps {
  tree: CallTree;
  step: Step;
  heap: Heap;
}

export function CallTreeView({ tree, step, heap }: CallTreeViewProps) {
  const glide = useGlide();
  const dialect = useDialect();
  const visible = [...tree.nodes.values()].filter((n) => n.start <= step.index);
  const shown = new Set(visible.map((n) => n.id));
  const single = tree.recursive.length === 1;
  const textOf = (n: CallNode) => shorten(single && n.args ? n.args : n.label, MAX_TEXT);
  const returnOf = (n: CallNode) =>
    n.returnedAt !== null && n.returnedAt <= step.index && n.returned && n.returned.t !== 'undefined'
      ? shorten(formatSnap(n.returned, heap, 0, dialect), 16)
      : null;

  const onStack = new Set(step.frames.map((f) => f.id).filter((id) => shown.has(id)));
  const active = [...step.frames].reverse().find((f) => shown.has(f.id))?.id ?? null;
  const roots = tree.roots.filter((r) => shown.has(r));
  const layout = naryLayout(roots, (id) => tree.nodes.get(id)!.children.filter((c) => shown.has(c)));
  const widest = Math.max(...visible.map((n) => Math.max(boxWidth(textOf(n)), (returnOf(n)?.length ?? 0) * 6.6 + 18)), 36);
  const unit = widest + GAP;
  const xOf = (id: number) => PAD_X + widest / 2 + layout.spots.get(id)!.x * unit;
  const yOf = (id: number) => TOP + layout.spots.get(id)!.depth * LEVEL;
  const width = PAD_X * 2 + widest + (layout.width - 1) * unit;
  const height = TOP + layout.depth * LEVEL + BOX_H + RETURN_ROOM;

  const state = (n: CallNode): VisualState => {
    if (n.returnedAt === step.index) return 'result';
    if (n.id === active) return 'current';
    if (onStack.has(n.id)) return 'visited';
    return 'idle';
  };
  const describe = (n: CallNode) =>
    [
      n.label,
      n.id === active ? 'running now' : onStack.has(n.id) ? 'waiting for the calls below it' : n.end < step.index ? 'finished' : '',
      returnOf(n) !== null ? `returned ${formatSnap(n.returned!, heap, 0, dialect)}` : '',
      n.repeatOf !== null ? 'the same call was made before' : '',
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <div className="relative" style={{ width, height }} role="group" aria-label={`Call tree with ${visible.length} calls`}>
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        <AnimatePresence initial={false}>
          {visible.map((n) => {
            if (n.parent === null || !shown.has(n.parent)) return null;
            const x1 = xOf(n.parent);
            const y1 = yOf(n.parent) + BOX_H;
            const x2 = xOf(n.id);
            const y2 = yOf(n.id);
            const bend = (y2 - y1) * 0.5;
            const live = onStack.has(n.id);
            return (
              <motion.path
                key={`${n.parent}-${n.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  d: `M ${x1} ${y1} C ${x1} ${y1 + bend} ${x2} ${y2 - bend} ${x2} ${y2}`,
                  pathLength: 1,
                  opacity: 1,
                  stroke: live ? '#2dd4bf' : '#5f7398',
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={glide}
                fill="none"
                strokeWidth={live ? 3 : 2}
                strokeLinecap="round"
              />
            );
          })}
        </AnimatePresence>
      </svg>
      <AnimatePresence initial={false}>
        {visible.map((n) => {
          const text = textOf(n);
          const w = boxWidth(text);
          const s = state(n);
          const style = STATE[s];
          const ret = returnOf(n);
          const done = s === 'idle' && n.end < step.index;
          return (
            <motion.div
              key={n.id}
              className="absolute"
              style={{ left: 0, top: 0, width: w, height: BOX_H }}
              initial={{ opacity: 0, scale: 0.6, x: xOf(n.id) - w / 2, y: yOf(n.id) }}
              animate={{ opacity: 1, scale: 1, x: xOf(n.id) - w / 2, y: yOf(n.id) }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={glide}
            >
              <div
                title={describe(n)}
                role="img"
                aria-label={describe(n)}
                className={`flex size-full items-center justify-center whitespace-nowrap rounded-lg px-2 font-mono text-[12px] font-semibold transition-shadow duration-300 ${style.fill} ${style.ring} ${
                  done ? 'text-navy-300' : 'text-navy-100'
                } ${n.repeatOf !== null ? 'outline-dashed outline-2 outline-offset-2 outline-amber-300/70' : ''}`}
              >
                {text}
              </div>
              {ret !== null && (
                // Opaque, so the call lines behind it don't lower the text's contrast.
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2a2752] px-1.5 font-mono text-[10.5px] font-bold leading-4 text-violet-100">
                  → {ret}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * The call tree section of the board: shown when the run's recursion branches (a call makes
 * two or more recursive calls), from the first recursive call on.
 */
export function CallTreeSection({ steps, step }: { steps: Step[] | undefined; step: Step }) {
  const tree = useMemo(() => (steps ? readCallTree(steps) : null), [steps]);
  if (!tree || !tree.branching) return null;
  const visible = [...tree.nodes.values()].filter((n) => n.start <= step.index);
  if (!visible.length) return null;
  const names = tree.recursive.join(' and ');
  const repeats = visible.some((n) => n.repeatOf !== null);
  return (
    <section aria-label="Call tree" className="flex flex-col gap-2">
      <h3 className="section-title">
        Call tree: {visible.length} {visible.length === 1 ? 'call' : 'calls'} of {names} so far
      </h3>
      {visible.length > MAX_CALLS ? (
        <p className="max-w-xl text-[12.5px] text-navy-300">
          Too many calls to draw as a readable tree here (more than {MAX_CALLS}). The call stack below shows the calls running now.
        </p>
      ) : (
        <>
          <CallTreeView tree={tree} step={step} heap={step.heap} />
          <p className="max-w-xl text-[12.5px] text-navy-300">
            Each box is one call with the arguments it got, under the call that made it. Lit: running now. Ringed: waiting for the calls
            below it. “→” is what a finished call returned.{repeats ? ' A dashed box repeats an earlier call with the same arguments.' : ''}
          </p>
        </>
      )}
    </section>
  );
}
