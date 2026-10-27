import { motion } from 'motion/react';
import type { ComputeDetail, DeclKind, Heap, ValueSnap } from '../trace/types';
import { formatSnap, isListObj, isTreeObj, nodeValueLabel, type ObjectSnap } from './analysis';
import { varColor } from './colors';

/** A primitive (or a short reference) colored by type. */
export function ValueText({ v, heap, className = '' }: { v: ValueSnap | undefined; heap: Heap; className?: string }) {
  if (!v) return <span className={`text-navy-400 italic ${className}`}>undefined</span>;
  switch (v.t) {
    case 'number':
      return <span className={`text-navy-100 ${className}`}>{formatSnap(v, heap)}</span>;
    case 'string':
      return <span className={`text-teal-200 ${className}`}>{JSON.stringify(v.v)}</span>;
    case 'boolean':
      return <span className={`text-violet-300 ${className}`}>{String(v.v)}</span>;
    case 'null':
    case 'undefined':
      return <span className={`text-navy-400 italic ${className}`}>{v.t}</span>;
    case 'function':
      return <span className={`text-navy-300 ${className}`}>ƒ {v.name}</span>;
    case 'ref': {
      const h = heap[v.id];
      if (h && (isTreeObj(h) || isListObj(h))) {
        return <span className={`text-navy-100 ${className}`}>→ node {nodeValueLabel(h as ObjectSnap, heap)}</span>;
      }
      return <span className={`text-navy-200 ${className}`}>{formatSnap(v, heap)}</span>;
    }
  }
}

export type BlockState = 'idle' | 'read' | 'changed' | 'new';

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
}

/** A labeled box holding one value: the core "variable as a block" picture. */
export function VarBlock({ name, value, heap, state, declKind, compute, delay = 0, onClick }: VarBlockProps) {
  const color = varColor(name);
  const ring =
    state === 'read'
      ? 'border-teal-300 shadow-[0_0_0_3px_rgb(45_212_191/0.25)]'
      : state === 'changed' || state === 'new'
        ? 'border-amber-300 shadow-[0_0_0_3px_rgb(251_191_36/0.22)]'
        : 'border-navy-600';
  const isNodeRef = value.t === 'ref' && (isTreeObj(heap[value.id]) || isListObj(heap[value.id]));
  return (
    <motion.div
      layout="position"
      initial={state === 'new' ? { opacity: 0, scale: 0.6, y: 6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, delay: state === 'new' ? delay : 0 }}
      className="flex flex-col items-start gap-1"
    >
      <div className="flex items-baseline gap-1.5 px-0.5">
        <span className={`font-mono text-[13px] font-semibold ${color.text}`}>{name}</span>
        {DECL_LABEL[declKind] && <span className="text-[11px] text-navy-400">{DECL_LABEL[declKind]}</span>}
      </div>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        key={state === 'changed' ? JSON.stringify(value) : 'stable'}
        initial={state === 'changed' ? { scale: 1.12 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className={`min-w-14 h-14 px-3 rounded-xl border-2 bg-navy-850 flex items-center justify-center font-mono text-lg font-medium disabled:cursor-default ${ring} ${isNodeRef ? 'text-[15px]' : ''}`}
        aria-label={`${name} = ${formatSnap(value, heap)}`}
      >
        <ValueText v={value} heap={heap} />
      </motion.button>
      {state === 'read' && <span className="text-[11px] font-medium text-teal-300 px-0.5">read</span>}
      {compute && (state === 'new' || state === 'changed') && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.max(0, delay - 0.15) }}
          className="rounded-md bg-navy-800 border border-navy-600 px-2 py-1 font-mono text-[12px] text-navy-200"
        >
          <span className="text-navy-400">{compute.expression}</span>
          {compute.substituted !== compute.expression && (
            <>
              <span className="text-navy-500"> → </span>
              <span className="text-teal-200">{compute.substituted}</span>
            </>
          )}
          <span className="text-navy-500"> = </span>
          <span className="text-amber-200 font-semibold">{compute.result}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/** A small name tag used on markers and node labels; always shows the name, not just color. */
export function NameTag({ name, faint = false, className = '' }: { name: string; faint?: boolean; className?: string }) {
  const color = varColor(name);
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-px font-mono text-[11px] font-semibold leading-4 border ${
        faint ? 'border-navy-600 text-navy-400 bg-navy-900' : `${color.border} ${color.text} ${color.soft}`
      } ${className}`}
    >
      {name}
    </span>
  );
}
