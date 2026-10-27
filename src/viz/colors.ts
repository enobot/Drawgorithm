// Each variable name keeps the same color everywhere (board, inspector, markers).
// Color is never the only cue: every colored mark also shows the name.
const PALETTE = [
  { text: 'text-violet-300', bg: 'bg-violet-400', soft: 'bg-violet-400/15', border: 'border-violet-400/70', hex: '#a78bfa' },
  { text: 'text-sky-300', bg: 'bg-sky-400', soft: 'bg-sky-400/15', border: 'border-sky-400/70', hex: '#38bdf8' },
  { text: 'text-pink-300', bg: 'bg-pink-400', soft: 'bg-pink-400/15', border: 'border-pink-400/70', hex: '#f472b6' },
  { text: 'text-lime-300', bg: 'bg-lime-400', soft: 'bg-lime-400/15', border: 'border-lime-400/70', hex: '#a3e635' },
  { text: 'text-orange-300', bg: 'bg-orange-400', soft: 'bg-orange-400/15', border: 'border-orange-400/70', hex: '#fb923c' },
  { text: 'text-cyan-300', bg: 'bg-cyan-400', soft: 'bg-cyan-400/15', border: 'border-cyan-400/70', hex: '#22d3ee' },
] as const;

export type VarColor = (typeof PALETTE)[number];

const FIXED: Record<string, number> = {
  left: 0,
  right: 1,
  mid: 2,
  i: 0,
  j: 1,
  k: 2,
  lo: 0,
  hi: 1,
  low: 0,
  high: 1,
  prev: 0,
  curr: 1,
  next: 2,
  slow: 0,
  fast: 1,
};

export function varColor(name: string): VarColor {
  if (name in FIXED) return PALETTE[FIXED[name]];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
