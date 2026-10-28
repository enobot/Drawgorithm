// Shared pieces for the illustrated scenes: a sketchbook page, stick figures, value
// cards, variable flags, ropes and thought bubbles. Scenes are drawn from the same
// execution trace as the technical view; these pieces only change how it looks.
import { motion } from 'motion/react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { varColor } from '../colors';
import { useGlide } from '../theme';

export const INK = '#27304a';
export const PAPER = '#eee9de';
export const CARD = '#fbf8f1';
export const HAND = 'var(--font-hand)';

/** One small palette, shared with the technical view's states (darker, to read on paper). */
export const TONE = {
  idle: INK,
  current: '#0c8577',
  changed: '#b86e0c',
  compare: '#5a49c2',
  problem: '#c23a61',
  answer: '#1f8a4c',
  muted: '#a29b8b',
} as const;
export type Tone = keyof typeof TONE;

/** A variable's color, darkened enough to read on paper. */
export const inkOf = (name: string) => `color-mix(in oklab, ${varColor(name).hex} 58%, #1b2033)`;

/** Width of hand-lettered text (about 8.4px per character at 17px). */
export const handWidth = (text: string, size = 17) => text.length * size * 0.5;

/** A sketchbook page: sized to the scene (never clipped), with a short note on how to read it. */
export function Paper({
  width,
  height,
  label,
  note,
  overlay,
  children,
}: {
  width: number;
  height: number;
  label: string;
  /** How the picture maps to the code, including where the analogy is simplified. */
  note: ReactNode;
  /** Technical overlay: the collection state in code terms. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="sketch-paper w-fit min-w-full rounded-[22px] px-3 pb-3 pt-2 text-[#3b4259]">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label} className="overflow-visible">
        {children}
      </svg>
      {overlay && <div className="mt-1 font-mono text-[12.5px] text-[#39405a]">{overlay}</div>}
      <figcaption className="mt-1 max-w-[42rem] text-[15px] leading-snug" style={{ fontFamily: HAND }}>
        {note}
      </figcaption>
    </figure>
  );
}

/** A slightly wobbly line, as if drawn by hand (applied to shapes, never to text). */
export function SketchFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
      <feDisplacementMap in="SourceGraphic" scale="1.4" />
    </filter>
  );
}

/** A unique id for SVG defs (filters, markers) inside one scene. */
export const useSvgId = () => useId().replace(/:/g, '');

export type Pose = 'stand' | 'hold' | 'reach' | 'raise' | 'wave';

const ARMS: Record<Pose, [number, number, number, number]> = {
  // [left hand x, y, right hand x, y], from the shoulders at (0, -44). For `hold`, the card draws the arms.
  stand: [-9, -27, 9, -27],
  hold: [0, -44, 0, -44],
  reach: [-9, -27, 20, -40],
  raise: [-9, -27, 12, -64],
  wave: [-12, -34, 14, -60],
};

/**
 * A stick figure standing with its feet at (0, 0). Legs swing only while it walks.
 * `tone` tints the head and the ground glow; the card it holds is passed as children.
 */
export function StickFigure({
  pose = 'stand',
  tone = 'idle',
  walking = false,
  facing = 1,
  filter,
  children,
}: {
  pose?: Pose;
  tone?: Tone;
  walking?: boolean;
  facing?: 1 | -1;
  filter?: string;
  children?: ReactNode;
}) {
  const [lx, ly, rx, ry] = ARMS[pose];
  const color = tone === 'idle' ? INK : TONE[tone];
  const stroke = { stroke: tone === 'muted' ? TONE.muted : INK, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <g className={walking ? 'dg-walk' : undefined}>
      {tone !== 'idle' && tone !== 'muted' && <ellipse cx={0} cy={2} rx={26} ry={6} fill={color} opacity={0.22} />}
      <g transform={facing === -1 ? 'scale(-1 1)' : undefined} filter={filter ? `url(#${filter})` : undefined}>
        <circle
          cx={0}
          cy={-58}
          r={9}
          {...stroke}
          fill={tone === 'idle' || tone === 'muted' ? CARD : color}
          fillOpacity={tone === 'idle' || tone === 'muted' ? 1 : 0.3}
        />
        <circle cx={3} cy={-59} r={1.2} fill={INK} />
        <circle cx={7} cy={-59} r={1.2} fill={INK} />
        <line x1={0} y1={-49} x2={0} y2={-24} {...stroke} />
        <line x1={0} y1={-44} x2={lx} y2={ly} {...stroke} />
        <line x1={0} y1={-44} x2={rx} y2={ry} {...stroke} />
        <g transform="translate(0 -24)">
          <line
            className="dg-leg-a"
            x1={0}
            y1={0}
            x2={-9}
            y2={24}
            {...stroke}
            style={{ transformBox: 'fill-box', transformOrigin: '100% 0%' }}
          />
          <line
            className="dg-leg-b"
            x1={0}
            y1={0}
            x2={9}
            y2={24}
            {...stroke}
            style={{ transformBox: 'fill-box', transformOrigin: '0% 0%' }}
          />
        </g>
      </g>
      {children}
    </g>
  );
}

/**
 * A value written on a card in front of a figure (centered at (0, cy)). `held` draws the
 * figure's arms reaching from the shoulders to the card's sides, with a hand on each edge.
 */
export function ValueCard({
  text,
  tone = 'idle',
  cy = -32,
  small = false,
  held = true,
}: {
  text: string;
  tone?: Tone;
  cy?: number;
  small?: boolean;
  held?: boolean;
}) {
  const size = small ? 14 : 18;
  const w = Math.max(30, handWidth(text, size) + 16);
  const h = small ? 20 : 26;
  const arm = { stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <g>
      <rect
        x={-w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={7}
        fill={CARD}
        stroke={tone === 'idle' ? INK : TONE[tone]}
        strokeWidth={tone === 'idle' ? 1.8 : 2.8}
      />
      <text x={0} y={cy + size * 0.36} textAnchor="middle" fontSize={size} fontFamily={HAND} fill={INK}>
        {text}
      </text>
      {held && (
        <>
          <path d={`M 0 -44 Q ${-w / 2 - 6} -42 ${-w / 2} ${cy}`} {...arm} />
          <path d={`M 0 -44 Q ${w / 2 + 6} -42 ${w / 2} ${cy}`} {...arm} />
          <circle cx={-w / 2} cy={cy} r={2.6} fill={CARD} stroke={INK} strokeWidth={1.6} />
          <circle cx={w / 2} cy={cy} r={2.6} fill={CARD} stroke={INK} strokeWidth={1.6} />
        </>
      )}
    </g>
  );
}

/** A small hand-lettered label. */
export function Label({
  x,
  y,
  text,
  color = INK,
  size = 15,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontFamily={HAND}
      fill={color}
      stroke={PAPER}
      strokeWidth={4}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

/** Variable names as little flags pointing down at (x, y). Several names share one stand. */
export function Flags({ x, y, names, faint = [] }: { x: number; y: number; names: string[]; faint?: string[] }) {
  if (!names.length) return null;
  const widths = names.map((n) => handWidth(n, 15) + 14);
  const total = widths.reduce((a, b) => a + b, 0) + (names.length - 1) * 4;
  // Left edge of each flag: the names sit side by side, centered over (x, y).
  const lefts = widths.map((_, i) => x - total / 2 + widths.slice(0, i).reduce((a, b) => a + b + 4, 0));
  return (
    <g>
      <line x1={x} y1={y - 8} x2={x} y2={y} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <path
        d={`M ${x - 4} ${y - 4} L ${x} ${y + 1} L ${x + 4} ${y - 4}`}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {names.map((n, i) => {
        const w = widths[i];
        const left = lefts[i];
        const dim = faint.includes(n);
        return (
          <g key={n}>
            <rect x={left} y={y - 30} width={w} height={21} rx={10} fill={dim ? '#d9d3c5' : inkOf(n)} />
            <text x={left + w / 2} y={y - 14.5} textAnchor="middle" fontSize={15} fontFamily={HAND} fill={dim ? '#6d6758' : '#fbf8f1'}>
              {n}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A thought bubble above a figure's head; the text is what the code actually compared. */
export function ThoughtBubble({ x, y, text, tone = 'compare' }: { x: number; y: number; text: string; tone?: Tone }) {
  const w = handWidth(text, 16) + 22;
  return (
    <g>
      <circle cx={x + 4} cy={y + 18} r={3} fill={CARD} stroke={TONE[tone]} strokeWidth={1.5} />
      <circle cx={x + 10} cy={y + 9} r={4.5} fill={CARD} stroke={TONE[tone]} strokeWidth={1.5} />
      <rect x={x + 6} y={y - 26} width={w} height={28} rx={14} fill={CARD} stroke={TONE[tone]} strokeWidth={2} />
      <text x={x + 6 + w / 2} y={y - 6.5} textAnchor="middle" fontSize={16} fontFamily={HAND} fill={INK}>
        {text}
      </text>
    </g>
  );
}

/** An arrowhead for ropes and arrows (orient follows the path's end). */
export function ArrowHead({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 12 12"
      refX="9"
      refY="6"
      markerWidth="11"
      markerHeight="11"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M 2 2 L 10 6 L 2 10" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </marker>
  );
}

/**
 * Something on the page that moves between steps. It glides to its new place
 * (instantly with reduced motion) and reports whether it is moving, so a figure can walk.
 */
export function Mover({
  x,
  y,
  enterFrom,
  exitTo,
  children,
}: {
  x: number;
  y: number;
  /** Offset it walks in from when it first appears. */
  enterFrom?: { dx: number; dy?: number };
  /** Offset it walks off to when it leaves. */
  exitTo?: { dx: number; dy?: number };
  children: (walking: boolean) => ReactNode;
}) {
  const glide = useGlide();
  const [walking, setWalking] = useState(false);
  return (
    <motion.g
      initial={enterFrom ? { x: x + enterFrom.dx, y: y + (enterFrom.dy ?? 0), opacity: 0 } : { x, y, opacity: 0 }}
      animate={{ x, y, opacity: 1 }}
      exit={exitTo ? { x: x + exitTo.dx, y: y + (exitTo.dy ?? 0), opacity: 0, transition: { duration: 0.55 } } : { opacity: 0 }}
      transition={glide}
      onAnimationStart={() => setWalking(true)}
      onAnimationComplete={() => setWalking(false)}
    >
      {children(walking)}
    </motion.g>
  );
}

/** Keyboard and pointer activation for something drawn in SVG. */
export function pressable(onPress?: () => void) {
  if (!onPress) return {};
  return {
    role: 'button',
    tabIndex: 0,
    style: { cursor: 'pointer' },
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress();
      }
    },
  };
}
