import { motion } from 'motion/react';
import type { Marker } from '../analysis';
import { useGlide } from '../theme';
import { GUM, GUM_FILL, GUM_WORD, GUM_WORD_COLOR, SLEEPY_FILL, bodyHeight, gaze, gumState, type GumState } from './gumdrop';

const PAD_X = 14;
/** Room above a body for its value. */
const LABEL = 24;
/** Room above the tallest gumdrop's value for the answer's sparkles: they sit up to 49 above its top and rise 22 more. */
const SPARKLES = 40;
const TAG_H = 20;
/** Pupils, mouths and tag text: the dark ink on pastel bodies. */
const INK = '#2a2033';
const LEAF = '#97c459';
const CHEEK = '#ed93b1';
const TAG_FILL = '#f4b6cc';
const LINE = '#2d4670';

interface GumdropSceneProps {
  /** The array's numbers (numbersOf), already checked by the caller. */
  values: number[];
  name: string;
  /** Index variables pointing into this array. */
  markers: Marker[];
  reads: Set<number>;
  writes: Set<number>;
  /** The answer's cells, on the final step. */
  result?: Set<number>;
  /** This step is a check (if / loop condition). */
  comparing: boolean;
  /** This step looked a value up in a map (the one being read looks down at the notebook). */
  lookingDown: boolean;
}

/** Minus sign for display ("−7" reads better than "-7"). */
const shown = (v: number) => String(v).replace('-', '−');

/** A body with a rounded end: upward from the line for zero and positive values, downward for negative ones. */
function bodyPath(cx: number, line: number, h: number, down: boolean): string {
  const w = GUM.width;
  const x0 = cx - w / 2;
  const r = Math.min(w / 2, h);
  // Same commands in both directions, so a value changing sign morphs instead of jumping.
  return down
    ? `M ${x0 + w} ${line} L ${x0 + w} ${line + h - r} A ${w / 2} ${r} 0 0 1 ${x0} ${line + h - r} L ${x0} ${line} Z`
    : `M ${x0} ${line} L ${x0} ${line - h + r} A ${w / 2} ${r} 0 0 1 ${x0 + w} ${line - h + r} L ${x0 + w} ${line} Z`;
}

function Gumdrop({
  name,
  index,
  value,
  cx,
  line,
  h,
  state,
  look,
  celebrate,
}: {
  name: string;
  index: number;
  value: number;
  cx: number;
  line: number;
  h: number;
  state: GumState;
  look: { x: number; y: number };
  celebrate: boolean;
}) {
  const glide = useGlide();
  const down = value < 0;
  const sleepy = value === 0;
  const top = down ? line : line - h;
  const bottom = down ? line + h : line;
  // The face sits near the line for hanging (negative) gumdrops, near the top otherwise.
  const eyeY = sleepy ? line - h / 2 : down ? line + Math.min(16, Math.max(9, h * 0.3)) : top + Math.min(18, Math.max(10, h * 0.36));
  const fill = sleepy && state === 'idle' ? SLEEPY_FILL : GUM_FILL[state];
  const word = GUM_WORD[state];
  return (
    <g className="dg-gum" role="img" aria-label={`${name}[${index}] = ${value}${word ? `, ${word}` : ''}`}>
      <title>{`${name}[${index}] = ${value}`}</title>
      <motion.path initial={false} animate={{ d: bodyPath(cx, line, h, down), fill }} transition={glide} />
      {!down && !sleepy && (
        <motion.g initial={false} animate={{ x: cx + 3, y: top - 4 }} transition={glide}>
          <ellipse rx={4.5} ry={7.5} fill={LEAF} transform="rotate(28)" />
        </motion.g>
      )}
      {sleepy ? (
        // Closed eyes: a napping zero.
        <g stroke={INK} strokeWidth={1.8} strokeLinecap="round">
          <line x1={cx - 12} x2={cx - 6} y1={eyeY} y2={eyeY} />
          <line x1={cx + 6} x2={cx + 12} y1={eyeY} y2={eyeY} />
        </g>
      ) : (
        <motion.g initial={false} animate={{ y: eyeY }} transition={glide}>
          {[-9, 9].map((dx) => (
            <g key={dx}>
              <circle cx={cx + dx} cy={0} r={5.2} fill="#ffffff" />
              <motion.circle
                initial={false}
                animate={{ cx: cx + dx + look.x * 2.1, cy: look.y * 2.1 }}
                transition={glide}
                r={2.4}
                fill={INK}
              />
            </g>
          ))}
          {h >= 30 && (
            <>
              <ellipse cx={cx - 15} cy={7.5} rx={3.6} ry={2.1} fill={CHEEK} />
              <ellipse cx={cx + 15} cy={7.5} rx={3.6} ry={2.1} fill={CHEEK} />
            </>
          )}
          <path d={`M ${cx - 3.5} 6.5 Q ${cx} 10 ${cx + 3.5} 6.5`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </motion.g>
      )}
      <motion.text
        initial={false}
        animate={{ y: down ? bottom + 18 : top - (sleepy ? 8 : 15) }}
        transition={glide}
        x={cx}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill="#e6ecf7"
      >
        {shown(value)}
      </motion.text>
      {celebrate &&
        [-1, 0, 1].map((k) => (
          <text
            key={k}
            aria-hidden
            className="dg-sparkle"
            style={{ animationDelay: `${(k + 1) * 110}ms` }}
            // An arc above the value (above the line for a hanging gumdrop), clear of every label, rising into empty space.
            x={cx + k * 15}
            y={(down ? line - 10 : top - 33) - (k === 0 ? 6 : 0)}
            textAnchor="middle"
            fontSize={13}
            fill={TAG_FILL}
          >
            ✦
          </text>
        ))}
    </g>
  );
}

/**
 * An array of numbers as a row of gumdrops: each body's height is its value (negatives hang
 * below the line, zeros nap), the slots the step read or wrote change color and say so, the
 * one being read looks at what it is compared with, and the code's index variables are pink
 * tags that slide underneath. The answer's gumdrops turn mint, with a few sparkles.
 */
export function GumdropScene({ values, name, markers, reads, writes, result, comparing, lookingDown }: GumdropSceneProps) {
  const glide = useGlide();
  const n = values.length;
  const maxAbs = Math.max(0, ...values.map(Math.abs));
  const heights = values.map((v) => bodyHeight(v, maxAbs));
  const up = Math.max(0, ...heights.filter((_, i) => values[i] >= 0));
  const down = Math.max(0, ...heights.filter((_, i) => values[i] < 0));
  const line = SPARKLES + LABEL + 14 + up;
  const indexY = line + (down ? down + LABEL : 0) + 18;
  const wordY = indexY + 16;
  const cxOf = (i: number) => PAD_X + GUM.slot * (i + 0.5);

  // Tags under the row, stacked when several index variables share a slot. One past either end is still drawn.
  const tags = markers.filter((m) => m.axis === 0 && m.index >= -1 && m.index <= n);
  const level = new Map<string, number>();
  const used = new Map<number, number>();
  for (const m of tags) {
    const k = used.get(m.index) ?? 0;
    level.set(m.name, k);
    used.set(m.index, k + 1);
  }
  const levels = Math.max(0, ...used.values());
  const tagTop = wordY + 12;
  const width = PAD_X * 2 + GUM.slot * (n + (tags.some((m) => m.index === n) ? 1 : 0));
  const left = tags.some((m) => m.index === -1) ? GUM.slot : 0;
  const height = tagTop + levels * (TAG_H + 5) + 4;
  const celebrate = !!result && result.size > 0;

  return (
    <figure className="w-fit min-w-full rounded-[22px] bg-navy-900 px-3 pb-3 pt-3 shadow-[inset_0_0_0_1px_rgb(244_182_204/0.2)]">
      <svg
        width={width + left}
        height={height}
        viewBox={`${-left} 0 ${width + left} ${height}`}
        role="group"
        aria-label={`${name}: ${n} numbers drawn as gumdrops`}
        className="overflow-visible"
      >
        <line x1={PAD_X - 6} x2={PAD_X + GUM.slot * n + 6} y1={line} y2={line} stroke={LINE} strokeWidth={2} strokeLinecap="round" />
        {values.map((v, i) => {
          const state = gumState(i, { reads, writes, result, comparing });
          const word = GUM_WORD[state];
          return (
            <g key={i}>
              <Gumdrop
                name={name}
                index={i}
                value={v}
                cx={cxOf(i)}
                line={line}
                h={heights[i]}
                state={state}
                look={gaze(i, reads, lookingDown)}
                celebrate={celebrate && state === 'done'}
              />
              <text x={cxOf(i)} y={indexY} textAnchor="middle" fontSize={12} fill="#7d91b5">
                {i}
              </text>
              {word && (
                <text x={cxOf(i)} y={wordY} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={GUM_WORD_COLOR[state]}>
                  {word}
                </text>
              )}
            </g>
          );
        })}
        {tags.map((m) => {
          const w = Math.max(30, m.name.length * 7.4 + 16);
          return (
            <motion.g
              key={m.name}
              initial={false}
              animate={{ x: cxOf(m.index), y: tagTop + (level.get(m.name) ?? 0) * (TAG_H + 5) }}
              transition={glide}
              role="img"
              aria-label={`${m.name} = ${m.index}`}
            >
              <path d="M -5 0 L 0 -6 L 5 0 Z" fill={TAG_FILL} />
              <rect x={-w / 2} y={0} width={w} height={TAG_H} rx={10} fill={TAG_FILL} />
              <text x={0} y={14} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK}>
                {m.name}
              </text>
            </motion.g>
          );
        })}
      </svg>
      <figcaption className="mt-2 max-w-[min(42rem,calc(100cqw_-_4.5rem))] text-[13px] leading-snug text-navy-300">
        Each gumdrop is one number in <span className="font-mono text-navy-100">{name}</span>: the taller it is, the bigger the number
        {values.some((v) => v < 0) ? ' (negative numbers hang below the line)' : ''}
        {values.includes(0) ? '; zeros are asleep' : ''}. The pink tags are the code’s index variables.
      </figcaption>
    </figure>
  );
}
