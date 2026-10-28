import { motion } from 'motion/react';
import type { ComputeDetail, DeclKind, Heap, ValueSnap } from '../trace/types';
import { conventionShape, formatSnap, nodeValueLabel, type ObjectSnap } from './analysis';
import type { ShapeOf } from './bindings';
import { varColor } from './colors';
import { POP, STATE, type VisualState } from './theme';

/**
 * A value, colored by type. Node references read as "→ node 5" through the bindings.
 * `compact` keeps nested objects short (`Cell {…}`) instead of dumping their fields.
 */
export function ValueText({
  v,
  heap,
  className = '',
  shapeOf = conventionShape,
  compact = false,
}: {
  v: ValueSnap | undefined;
  heap: Heap;
  className?: string;
  shapeOf?: ShapeOf;
  compact?: boolean;
}) {
  if (!v) return <span className={`text-navy-400 italic ${className}`}>undefined</span>;
  switch (v.t) {
    case 'number':
      return <span className={`text-navy-100 tabular-nums ${className}`}>{formatSnap(v, heap)}</span>;
    case 'string':
      return (
        <span
          className={`text-teal-200 ${className}`}
          title={v.len ? `${v.len.toLocaleString('en-US')} characters; the first ${v.v.length} are shown` : undefined}
        >
          “{v.v}
          {v.len ? '…' : ''}”
        </span>
      );
    case 'boolean':
      return <span className={`text-violet-200 ${className}`}>{String(v.v)}</span>;
    case 'null':
    case 'undefined':
      return <span className={`text-navy-400 italic ${className}`}>{v.t}</span>;
    case 'function':
      return <span className={`text-navy-300 ${className}`}>ƒ {v.name}</span>;
    case 'ref': {
      const h = heap[v.id];
      const shape = shapeOf(h);
      if (h && shape) {
        return <span className={`text-navy-100 ${className}`}>→ node {nodeValueLabel(h as ObjectSnap, heap, shape)}</span>;
      }
      if (compact && h?.kind === 'object')
        return (
          <span className={`text-navy-300 ${className}`}>
            {h.className ?? 'object'} {'{…}'}
          </span>
        );
      return <span className={`text-navy-200 ${className}`}>{formatSnap(v, heap, compact ? 1 : 0)}</span>;
    }
  }
}

export type BlockState = 'idle' | 'read' | 'compare' | 'changed' | 'new';

const BLOCK_STATE: Record<BlockState, { visual: VisualState; label: string | null }> = {
  idle: { visual: 'idle', label: null },
  read: { visual: 'current', label: 'read' },
  compare: { visual: 'compare', label: 'compared' },
  changed: { visual: 'changed', label: 'changed' },
  new: { visual: 'new', label: 'new' },
};

const DECL_LABEL: Partial<Record<DeclKind, string>> = { const: 'const', let: 'let', var: 'var', param: 'input' };

interface VarBlockProps {
  name: string;
  value: ValueSnap;
  heap: Heap;
  state: BlockState;
  declKind: DeclKind;
  compute?: ComputeDetail;
  /** Seconds to wait before a new block appears (lets source blocks light up first). */
  delay?: number;
  onClick?: () => void;
  shapeOf?: ShapeOf;
  /** Show the declaration kind (let/const/input). */
  details?: boolean;
}

/** A labeled tile holding one value: the core "variable as a block" picture. */
export function VarBlock({
  name,
  value,
  heap,
  state,
  declKind,
  compute,
  delay = 0,
  onClick,
  shapeOf = conventionShape,
  details = false,
}: VarBlockProps) {
  const color = varColor(name);
  const s = BLOCK_STATE[state];
  const style = STATE[s.visual];
  const isNodeRef = value.t === 'ref' && !!shapeOf(heap[value.id]);
  return (
    <motion.div
      layout="position"
      initial={state === 'new' ? { opacity: 0, scale: 0.6, y: 8 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...POP, delay: state === 'new' ? delay : 0 }}
      className="flex flex-col items-start gap-1.5"
    >
      <div className="flex items-center gap-1.5 px-0.5">
        <span aria-hidden className={`size-2 rounded-full ${color.bg}`} />
        <span className={`text-[14px] font-bold ${color.text}`}>{name}</span>
        {details && DECL_LABEL[declKind] && <span className="text-[11px] text-navy-400">{DECL_LABEL[declKind]}</span>}
      </div>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        key={state === 'changed' ? JSON.stringify(value) : 'stable'}
        initial={state === 'changed' ? { scale: 1.14 } : false}
        animate={{ scale: 1 }}
        transition={POP}
        // Values are soft tiles; references to drawn nodes are lighter pills (the node itself is in the drawing).
        className={`flex items-center justify-center transition-shadow disabled:cursor-default ${style.fill} ${style.ring} ${
          isNodeRef ? 'h-10 rounded-full px-3.5 text-[14px] font-semibold' : 'h-12 min-w-12 rounded-2xl px-3.5 text-[18px] font-bold'
        }`}
        aria-label={`${name} = ${formatSnap(value, heap)}${s.label ? `, ${s.label}` : ''}`}
      >
        <ValueText v={value} heap={heap} shapeOf={shapeOf} compact />
      </motion.button>
      {s.label && <span className={`px-0.5 text-[11.5px] font-semibold ${style.labelColor}`}>{s.label}</span>}
      {compute && (state === 'new' || state === 'changed') && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.max(0, delay - 0.15) }}
          className="rounded-xl bg-navy-800/90 px-2.5 py-1.5 font-mono text-[12.5px] text-navy-200 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.2)]"
        >
          <span className="text-navy-400">{compute.expression}</span>
          {compute.substituted !== compute.expression && (
            <>
              <span className="text-navy-500"> → </span>
              <span className="text-violet-200">{compute.substituted}</span>
            </>
          )}
          <span className="text-navy-500"> = </span>
          <span className="font-semibold text-amber-200">{compute.result}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * A small name pill used on pointers and node labels; always shows the name, not just color.
 * `solid` backs the tint with the board color, so a line passing behind never shows through the text.
 */
export function NameTag({
  name,
  faint = false,
  solid = false,
  className = '',
}: {
  name: string;
  faint?: boolean;
  solid?: boolean;
  className?: string;
}) {
  const color = varColor(name);
  const tag = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-px text-[11.5px] font-bold leading-[18px] ${
        faint ? 'bg-navy-800 text-navy-400' : `${color.soft} ${color.text} shadow-[inset_0_0_0_1px_currentColor]`
      } ${solid ? '' : className}`}
    >
      {name}
    </span>
  );
  return solid ? <span className={`inline-flex rounded-full bg-navy-950 ${className}`}>{tag}</span> : tag;
}
