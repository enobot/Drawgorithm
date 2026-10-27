import { motion } from 'motion/react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ListDiagram, type ObjectSnap } from './analysis';
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

/** Linked lists as chains of boxes; each chain ends at null, loops back, or joins another chain. */
export function ListView({ diagram, heap, labels, current, written, created, highlighted, selected, onSelect }: ListViewProps) {
  const label = (id: number) => nodeValueLabel(heap[id] as ObjectSnap, heap);
  return (
    <div className="flex flex-col gap-5">
      {diagram.chains.map((chain) => (
        // One chain stays on one line (scrolling sideways), so a wrap never looks like a second list.
        <div key={chain.ids[0]} className="flex items-end overflow-x-auto pb-1 pt-6 [&>*]:shrink-0">
          {chain.ids.map((id) => {
            const tags = labels.get(id) ?? [];
            const rewired = written.some((w) => w.objId === id && w.key === 'next');
            return (
              <motion.div key={id} layout className="flex items-center">
                <div className="relative">
                  <div className="absolute bottom-full left-0 mb-1 flex gap-1 whitespace-nowrap">
                    {tags.map((t) => (
                      <NameTag key={`${t.frame}-${t.name}`} name={t.name} faint={!t.active} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect?.(id)}
                    aria-label={`node ${label(id)}${tags.length ? `, referenced by ${tags.map((t) => t.name).join(', ')}` : ''}`}
                    className={`flex h-11 items-stretch overflow-hidden rounded-lg border-2 font-mono text-[15px] ${
                      current === id ? 'border-teal-300 bg-teal-400/15' : 'border-navy-400 bg-navy-850'
                    } ${created.has(id) ? 'shadow-[0_0_0_4px_rgb(251_191_36/0.35)]' : ''} ${
                      highlighted?.has(id) ? 'shadow-[0_0_0_4px_rgb(167_139_250/0.45)]' : ''
                    } ${selected === id ? 'outline-2 outline-offset-2 outline-white' : ''}`}
                  >
                    <span className="flex items-center px-3 font-semibold">{label(id)}</span>
                    <span
                      className={`flex items-center border-l px-1.5 text-[10px] font-sans ${rewired ? 'border-amber-300 text-amber-300' : 'border-navy-600 text-navy-400'}`}
                    >
                      next
                    </span>
                  </button>
                </div>
                <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden className="mx-0.5">
                  <path d="M2 7 H28" stroke={rewired ? '#fbbf24' : '#7d91b5'} strokeWidth="2" />
                  <path d="M26 2 33 7 26 12z" fill={rewired ? '#fbbf24' : '#7d91b5'} />
                </svg>
              </motion.div>
            );
          })}
          {chain.end.kind === 'null' && <span className="h-11 flex items-center font-mono text-[13px] text-navy-400">null</span>}
          {chain.end.kind === 'cycle' && (
            <span className="h-11 flex items-center rounded-md border border-dashed border-rose-400/70 px-2 text-[12px] text-rose-200">
              back to node {label(chain.end.to)} (cycle)
            </span>
          )}
          {chain.end.kind === 'join' && (
            <span className="h-11 flex items-center rounded-md border border-dashed border-amber-400/70 px-2 text-[12px] text-amber-100">
              joins node {label(chain.end.to)}
            </span>
          )}
        </div>
      ))}
      <IssueList issues={diagram.issues} />
    </div>
  );
}
