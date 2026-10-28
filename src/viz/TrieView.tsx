// A trie drawn as a tree of letters: each branch is one character, and a node where a
// word ends is marked "end". Read from nested objects or Maps (see readTrie); the
// branches the step looked up or created light up, from the recorded reads and writes.
import { AnimatePresence, motion } from 'motion/react';
import type { Heap } from '../trace/types';
import { formatSnap } from './analysis';
import { placeTagRows, tagExtent, type NodeTag, type TrieActivity, type TrieModel } from './structures';
import { STATE, useGlide, type VisualState } from './theme';
import { TagGroup, tagsWidth } from './TreeView';

const NODE = 40;
const R = NODE / 2;
const LEVEL = 92;
const UNIT = 56;
const TOP = 58;
/** Room under the bottom row for the "end" marks. */
const BOTTOM = 22;
const PAD_X = 28;

export interface TrieViewProps {
  model: TrieModel;
  heap: Heap;
  tags: Map<number, NodeTag[]>;
  activity: TrieActivity;
  /** Objects created in this step. */
  created: Set<number>;
}

export function TrieView({ model, heap, tags, activity, created }: TrieViewProps) {
  const glide = useGlide();
  const { nodes, spots } = model;
  const rawX = (id: number) => spots.get(id)!.x * UNIT;
  const yOf = (id: number) => TOP + spots.get(id)!.depth * LEVEL + R;
  const sideOf = (id: number): 'left' | 'right' | 'center' => {
    const p = nodes.get(id)!.parent;
    if (p === null) return 'center';
    const d = rawX(id) - rawX(p);
    return d < 0 ? 'left' : d > 0 ? 'right' : 'center';
  };
  const tagSpots = placeTagRows(
    [...tags].map(([id, t]) => ({ id, x: rawX(id), level: spots.get(id)!.depth, side: sideOf(id), width: tagsWidth(t) })),
  );
  let minX = -R;
  let maxX = (model.width - 1) * UNIT + R;
  for (const [id, t] of tags) {
    const [a, b] = tagExtent(rawX(id), sideOf(id), tagsWidth(t));
    minX = Math.min(minX, a);
    maxX = Math.max(maxX, b);
  }
  const shift = PAD_X - minX;
  const xOf = (id: number) => rawX(id) + shift;
  const width = maxX - minX + 2 * PAD_X;
  const height = TOP + model.depth * LEVEL + NODE + BOTTOM;

  // The branch from the root down to each node the active call points at.
  const onPath = new Set<number>();
  for (const [id, t] of tags) {
    if (!t.some((x) => x.active)) continue;
    for (let cur: number | null = id; cur !== null; cur = nodes.get(cur)!.parent) onPath.add(cur);
  }
  const spell = (id: number): string => {
    const n = nodes.get(id)!;
    return n.parent === null ? '' : spell(n.parent) + n.char;
  };
  const state = (id: number): VisualState => {
    if (activity.marked.has(id)) return 'changed';
    if (created.has(id)) return 'new';
    if (activity.followed.has(id)) return 'current';
    if (tags.get(id)?.some((t) => t.active)) return 'current';
    return 'idle';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative" style={{ width, height }} aria-label={`Trie with ${nodes.size} nodes and ${model.words.length} words`}>
        <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <AnimatePresence initial={false}>
            {[...nodes.values()].map((n) => {
              if (n.parent === null) return null;
              const fresh = created.has(n.id);
              const followed = activity.followed.has(n.id);
              const path = onPath.has(n.id);
              const stroke = fresh ? '#fcd34d' : followed ? '#5eead4' : path ? '#2dd4bf' : '#5f7398';
              const x1 = xOf(n.parent);
              const y1 = yOf(n.parent) + R;
              const x2 = xOf(n.id);
              const y2 = yOf(n.id) - R;
              const bend = (y2 - y1) * 0.5;
              return (
                <motion.path
                  key={`${n.parent}-${n.id}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ d: `M ${x1} ${y1} C ${x1} ${y1 + bend} ${x2} ${y2 - bend} ${x2} ${y2}`, pathLength: 1, opacity: 1, stroke }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={glide}
                  fill="none"
                  strokeWidth={fresh || followed ? 3.5 : path ? 3 : 2.25}
                  strokeLinecap="round"
                />
              );
            })}
          </AnimatePresence>
        </svg>
        <AnimatePresence initial={false}>
          {[...nodes.values()].map((n) => {
            const s = state(n.id);
            const style = STATE[s];
            const t = tags.get(n.id) ?? [];
            const isRoot = n.parent === null;
            const word = spell(n.id);
            const describe = [
              isRoot ? 'root of the trie' : `node for "${word}"`,
              n.terminal ? `a word ends here (${n.terminalField})` : '',
              ...n.extras.map((x) => `${x.key} ${formatSnap(x.value, heap)}`),
              t.length ? `held by ${t.map((x) => x.name).join(', ')}` : '',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <motion.div
                key={n.id}
                className="absolute"
                style={{ left: 0, top: 0, width: NODE, height: NODE }}
                initial={{ opacity: 0, scale: 0.4, x: xOf(n.id) - R, y: yOf(n.id) - R }}
                animate={{ opacity: 1, scale: 1, x: xOf(n.id) - R, y: yOf(n.id) - R }}
                exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
                transition={glide}
              >
                {t.length > 0 && <TagGroup tags={t} spot={tagSpots.get(n.id) ?? { side: 'center', row: 0 }} />}
                <div
                  title={describe}
                  aria-label={describe}
                  className={`relative flex size-full items-center justify-center rounded-full font-bold text-navy-100 transition-shadow duration-300 ${style.fill} ${style.ring} ${
                    n.terminal ? 'outline-2 outline-offset-2 outline-emerald-300/80' : ''
                  }`}
                >
                  {isRoot ? (
                    <span className="text-[11px] font-semibold text-navy-300">root</span>
                  ) : (
                    <span className="text-[16px]">{n.char}</span>
                  )}
                  {n.extras.length > 0 && (
                    <span className="absolute -right-2.5 -top-2 rounded-full bg-navy-700 px-1 text-[9.5px] font-bold leading-4 text-navy-100 shadow-[inset_0_0_0_1px_rgb(166_181_210/0.5)]">
                      {formatSnap(n.extras[0].value, heap, 2)}
                    </span>
                  )}
                </div>
                {n.terminal && (
                  <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400/15 px-1.5 text-[10px] font-bold leading-4 text-emerald-200">
                    end
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex max-w-xl flex-col gap-1 text-[12.5px] text-navy-300">
        <p>
          Each branch is one letter; a ringed node marked “end” finishes a word.{' '}
          {model.words.length ? (
            <>
              Words stored:{' '}
              <span className="font-semibold text-navy-100">{model.words.map((w) => (w === '' ? '(empty word)' : w)).join(', ')}</span>.
            </>
          ) : (
            'No word ends anywhere yet.'
          )}
        </p>
        {activity.missing.map((m, k) => (
          <p key={k} className="text-violet-200">
            Looked for “{m.char}” under {nodes.get(m.parent)!.parent === null ? 'the root' : `“${spell(m.parent)}”`}: no such branch.
          </p>
        ))}
        {[...activity.marked].map((id) => (
          <p key={id} className="text-amber-100">
            This step wrote the word-end mark ({nodes.get(id)!.terminalField}) on “{spell(id)}”.
          </p>
        ))}
        {[...nodes.values()].some((n) => n.extras.length) && (
          <p>
            Small numbers on a node: {[...new Set([...nodes.values()].flatMap((n) => n.extras.map((x) => x.key)))].join(', ')}, as stored on
            it.
          </p>
        )}
      </div>
    </div>
  );
}
