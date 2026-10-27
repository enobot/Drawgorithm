import { AnimatePresence, motion } from 'motion/react';
import type { Heap } from '../trace/types';
import { nodeValueLabel, type ObjectSnap, type StructureIssue, type TreeComponent, type TreeDiagram } from './analysis';
import { NameTag } from './Value';
import { useWidth } from './useWidth';

const NODE = 40;
const LEVEL = 78;
const TOP = 34; // room for variable labels above the root

export interface NodeLabel {
  name: string;
  active: boolean;
  frame: string;
}

export interface TreeViewProps {
  diagram: TreeDiagram;
  heap: Heap;
  labels: Map<number, NodeLabel[]>;
  current?: number | null;
  visited?: Set<number>;
  returned?: Map<number, string>;
  queued?: Set<number>;
  written: { objId: number; key: string }[];
  created: Set<number>;
  highlighted?: Set<number>;
  highlightedEdges?: { objId: number; key: string }[];
  selected?: number | null;
  onSelect?: (id: number) => void;
}

interface Placed {
  id: number;
  x: number;
  y: number;
}

function place(comp: TreeComponent, width: number): { nodes: Map<number, Placed>; compact: boolean } {
  const usable = Math.max(width - NODE, NODE);
  const bySlot = new Map(comp.nodes.map((n) => [n.id, { id: n.id, x: NODE / 2 + n.slotX * usable, y: TOP + n.depth * LEVEL }]));
  // Fixed slots keep nodes still while the tree grows; fall back to a compact layout when they get too tight.
  const levels = new Map<number, number[]>();
  for (const n of comp.nodes) levels.set(n.depth, [...(levels.get(n.depth) ?? []), bySlot.get(n.id)!.x]);
  let tight = false;
  for (const xs of levels.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < NODE + 10) tight = true;
  }
  if (!tight) return { nodes: bySlot, compact: false };
  return {
    nodes: new Map(comp.nodes.map((n) => [n.id, { id: n.id, x: NODE / 2 + n.orderX * usable, y: TOP + n.depth * LEVEL }])),
    compact: true,
  };
}

function edgePath(a: Placed, b: Placed, kind: string): string {
  if (kind === 'cycle') {
    // Curve outward so a back edge never hides behind the tree edges.
    const dx = b.x - a.x;
    const side = dx <= 0 ? -1 : 1;
    const cx = Math.min(a.x, b.x) + dx / 2 + side * 70 + (dx === 0 ? -50 : 0);
    const cy = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y + NODE / 2} Q ${cx} ${cy} ${b.x + side * (NODE / 2)} ${b.y}`;
  }
  return `M ${a.x} ${a.y + NODE / 2} L ${b.x} ${b.y - NODE / 2}`;
}

function TreeComponentView({ comp, width, props }: { comp: TreeComponent; width: number; props: TreeViewProps }) {
  const { heap, labels, current, visited, returned, queued, written, created, highlighted, highlightedEdges, selected, onSelect } = props;
  const { nodes, compact } = place(comp, width);
  const height = TOP + comp.depth * LEVEL + NODE + 34;
  const isWritten = (from: number, side: string) => written.some((w) => w.objId === from && w.key === side);
  const isHighlightedEdge = (from: number, side: string) => !!highlightedEdges?.some((w) => w.objId === from && w.key === side);

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        <defs>
          <marker id="dg-arrow-cycle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#fb7185" />
          </marker>
          <marker id="dg-arrow-shared" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#fbbf24" />
          </marker>
        </defs>
        {!compact &&
          comp.nulls.map((n) => {
            const parent = nodes.get(n.parent);
            if (!parent) return null;
            const x = NODE / 2 + n.slotX * Math.max(width - NODE, NODE);
            const y = TOP + n.depth * LEVEL;
            return (
              <g key={`null-${n.parent}-${n.side}`} opacity={0.55}>
                <line x1={parent.x} y1={parent.y + NODE / 2} x2={x} y2={y - 12} stroke="#3f5b8a" strokeDasharray="3 4" strokeWidth={1.5} />
                <text x={x} y={y} textAnchor="middle" className="fill-navy-400 font-mono" fontSize={11}>
                  null
                </text>
              </g>
            );
          })}
        {comp.edges.map((e) => {
          const a = nodes.get(e.from);
          const b = nodes.get(e.to);
          if (!a || !b) return null;
          const hot = isWritten(e.from, e.side);
          const linked = isHighlightedEdge(e.from, e.side);
          const stroke =
            e.kind === 'cycle' ? '#fb7185' : e.kind === 'shared' ? '#fbbf24' : hot ? '#fbbf24' : linked ? '#a78bfa' : '#7d91b5';
          return (
            <motion.path
              key={`${e.from}-${e.side}`}
              initial={hot ? { pathLength: 0 } : false}
              animate={{ d: edgePath(a, b, e.kind), pathLength: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
              fill="none"
              stroke={stroke}
              strokeWidth={hot || linked ? 3 : 2}
              strokeDasharray={e.kind === 'child' ? undefined : '6 5'}
              markerEnd={e.kind === 'cycle' ? 'url(#dg-arrow-cycle)' : e.kind === 'shared' ? 'url(#dg-arrow-shared)' : undefined}
            />
          );
        })}
        {comp.edges
          .filter((e) => e.kind !== 'child')
          .map((e) => {
            const a = nodes.get(e.from);
            const b = nodes.get(e.to);
            if (!a || !b) return null;
            return (
              <text
                key={`t-${e.from}-${e.side}`}
                x={(a.x + b.x) / 2 + (e.kind === 'cycle' ? (b.x <= a.x ? -44 : 44) : 8)}
                y={(a.y + b.y) / 2 + 4}
                className={e.kind === 'cycle' ? 'fill-rose-300' : 'fill-amber-300'}
                fontSize={11}
                fontWeight={600}
              >
                {e.kind === 'cycle' ? `${e.side}: cycle` : `${e.side}: 2nd parent`}
              </text>
            );
          })}
      </svg>
      <AnimatePresence initial={false}>
        {comp.nodes.map((n) => {
          const p = nodes.get(n.id)!;
          const h = heap[n.id] as ObjectSnap;
          const isCurrent = current === n.id;
          const isVisited = visited?.has(n.id);
          const ret = returned?.get(n.id);
          const isNew = created.has(n.id);
          const isHot = highlighted?.has(n.id);
          const isSelected = selected === n.id;
          const tags = labels.get(n.id) ?? [];
          const value = nodeValueLabel(h, heap);
          const describe = [
            `node ${value}`,
            tags.length ? `referenced by ${tags.map((t) => t.name).join(', ')}` : '',
            isCurrent ? 'current node' : isVisited ? 'visited' : '',
            ret !== undefined ? `returned ${ret}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <motion.div
              key={n.id}
              className="absolute"
              style={{ left: 0, top: 0 }}
              initial={{ x: p.x - NODE / 2, y: p.y - NODE / 2, opacity: 0, scale: 0.4 }}
              animate={{ x: p.x - NODE / 2, y: p.y - NODE / 2, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex gap-1 whitespace-nowrap">
                {tags.map((t) => (
                  <NameTag key={`${t.frame}-${t.name}`} name={t.name} faint={!t.active} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSelect?.(n.id)}
                aria-label={describe}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center rounded-full border-2 font-mono text-[15px] font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-teal-400 border-teal-200 text-navy-950'
                    : isVisited
                      ? 'bg-teal-400/12 border-teal-400/70 text-navy-100'
                      : 'bg-navy-850 border-navy-400 text-navy-100 hover:border-navy-200'
                } ${isNew ? 'shadow-[0_0_0_4px_rgb(251_191_36/0.35)]' : ''} ${isHot ? 'shadow-[0_0_0_4px_rgb(167_139_250/0.45)]' : ''} ${
                  isSelected ? 'outline-2 outline-offset-2 outline-white' : ''
                }`}
                style={{ width: NODE, height: NODE }}
              >
                {value}
                {queued?.has(n.id) && (
                  <span
                    className="absolute -top-1 -right-1 rounded-full bg-amber-300 px-1 text-[9px] font-sans font-bold text-navy-950"
                    title="in the queue"
                  >
                    Q
                  </span>
                )}
              </button>
              {ret !== undefined && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-violet-400/20 border border-violet-400/60 px-1.5 text-[11px] font-mono font-semibold text-violet-200"
                >
                  ↩ {ret}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function IssueList({ issues }: { issues: StructureIssue[] }) {
  if (!issues.length) return null;
  const style: Record<StructureIssue['kind'], string> = {
    cycle: 'border-rose-400/60 text-rose-200',
    shared: 'border-amber-400/60 text-amber-100',
    detached: 'border-navy-500 text-navy-200',
  };
  const title: Record<StructureIssue['kind'], string> = { cycle: 'Cycle', shared: 'Shared node', detached: 'Detached' };
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {issues.map((i, k) => (
        <li key={k} className={`rounded-lg border bg-navy-900/80 px-3 py-1.5 text-[13px] leading-snug ${style[i.kind]}`}>
          <span className="font-semibold">{title[i.kind]}: </span>
          {i.text.replace(/^Cycle: /, '')}
        </li>
      ))}
    </ul>
  );
}

export function TreeView(props: TreeViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [main, ...rest] = props.diagram.components;
  return (
    <div ref={ref} className="w-full">
      {width > 0 && main && <TreeComponentView comp={main} width={width} props={props} />}
      {width > 0 && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4">
          {rest.map((c) => (
            <TreeComponentView key={c.rootId} comp={c} width={Math.min(width, Math.max(120, 2 ** c.depth * (NODE + 16)))} props={props} />
          ))}
        </div>
      )}
      <IssueList issues={props.diagram.issues} />
    </div>
  );
}
