import { AnimatePresence, motion } from 'motion/react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ListDiagram, type ObjectSnap } from './analysis';
import { GLIDE, STATE } from './theme';
import { IssueList, type NodeLabel } from './TreeView';
import { NameTag } from './Value';

interface ListViewProps {
  diagram: ListDiagram;
  heap: Heap;
  labels: Map<number, NodeLabel[]>;
  current?: number | null;
  written: { objId: number; key: string }[];
  created: Set<number>;
  highlighted?: Set<number>;
  selected?: number | null;
  onSelect?: (id: number) => void;
}

/** A smooth arrow for one `next` link. Keyed by both ends, so re-pointing fades the old link out and draws the new one. */
function Link({ hot }: { hot: boolean }) {
  return (
    <motion.svg
      width="46"
      height="22"
      viewBox="0 0 46 22"
      aria-hidden
      initial={{ opacity: 0, scaleX: 0.3 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.3, transition: { duration: 0.2 } }}
      transition={GLIDE}
      style={{ originX: 0 }}
      className="mx-1 shrink-0"
    >
      <motion.path
        d="M3 11 C 15 4, 27 4, 38 11"
        fill="none"
        stroke={hot ? '#fcd34d' : '#7d91b5'}
        strokeWidth={hot ? 3 : 2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35 }}
      />
      <path d="M35 6.5 43 11.5 35 16z" fill={hot ? '#fcd34d' : '#7d91b5'} />
    </motion.svg>
  );
}

/** Linked lists as chains of rounded nodes; each chain ends at null, loops back, or joins another chain. */
export function ListView({ diagram, heap, labels, current, written, created, highlighted, selected, onSelect }: ListViewProps) {
  const label = (id: number) => diagram.labels[id] ?? nodeValueLabel(heap[id] as ObjectSnap, heap);
  const nextOf = (id: number) => diagram.nextField[id] ?? 'next';
  return (
    <div className="flex flex-col gap-4">
      {diagram.chains.map((chain) => (
        // One chain stays on one line (scrolling sideways), so a wrap never looks like a second list.
        <div key={chain.ids[0]} className="flex items-end overflow-x-auto pb-2 pt-8">
          <AnimatePresence initial={false}>
            {chain.ids.flatMap((id, i) => {
              const tags = labels.get(id) ?? [];
              const rewired = written.some((w) => w.objId === id && w.key === nextOf(id));
              const isCurrent = current === id;
              const state = isCurrent ? 'current' : created.has(id) ? 'new' : 'idle';
              const style = STATE[state];
              const nextId = chain.ids[i + 1];
              const node = (
                // `layout` (not a shared layoutId): the same heap ids are drawn in more than one place at
                // once (input preview and run), and a shared id would hide all but one copy.
                <motion.div key={`n${id}`} layout="position" transition={GLIDE} className="relative shrink-0">
                  <div className="absolute bottom-full left-1/2 mb-1.5 flex -translate-x-1/2 flex-col items-center">
                    <div className="flex gap-1 whitespace-nowrap">
                      {tags.map((t) => (
                        <NameTag key={`${t.frame}-${t.name}`} name={t.name} faint={!t.active} />
                      ))}
                    </div>
                    {tags.length > 0 && <span aria-hidden className="mt-0.5 h-2 w-0.5 rounded-full bg-navy-400" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect?.(id)}
                    aria-label={`node ${label(id)}${tags.length ? `, referenced by ${tags.map((t) => t.name).join(', ')}` : ''}${isCurrent ? ', current' : ''}`}
                    title={`node ${label(id)}`}
                    className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3.5 text-[16px] font-bold transition-shadow duration-300 hover:brightness-125 ${
                      isCurrent ? 'dg-light' : ''
                    } ${style.fill} ${highlighted?.has(id) && !isCurrent ? STATE.compare.ring : style.ring} ${
                      selected === id ? 'outline-2 outline-offset-4 outline-white' : ''
                    }`}
                  >
                    {label(id)}
                  </button>
                  {rewired && (
                    <span
                      className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold ${STATE.changed.labelColor}`}
                    >
                      {nextOf(id)} changed
                    </span>
                  )}
                </motion.div>
              );
              return [node, <Link key={`l${id}->${nextId ?? chain.end.kind}`} hot={rewired} />];
            })}
          </AnimatePresence>
          {chain.end.kind === 'null' && (
            <span className="flex h-12 shrink-0 items-center rounded-full px-2.5 text-[13px] text-navy-400">null</span>
          )}
          {chain.end.kind === 'cycle' && (
            <span
              className={`flex h-12 shrink-0 items-center rounded-2xl px-3 text-[12.5px] font-semibold text-rose-100 ${STATE.error.ring}`}
            >
              ↺ back to node {label(chain.end.to)} (cycle)
            </span>
          )}
          {chain.end.kind === 'join' && (
            <span
              className={`flex h-12 shrink-0 items-center rounded-2xl px-3 text-[12.5px] font-semibold text-amber-100 ${STATE.changed.ring}`}
            >
              joins node {label(chain.end.to)}
            </span>
          )}
        </div>
      ))}
      <IssueList issues={diagram.issues} />
    </div>
  );
}
