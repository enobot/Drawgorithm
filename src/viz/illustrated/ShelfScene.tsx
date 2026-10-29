import { motion } from 'motion/react';
import type { Heap, HeapSnap, ValueSnap } from '../../trace/types';
import { formatSnap, nodeValueLabel, type Marker, type ObjectSnap } from '../analysis';
import type { ShapeOf } from '../bindings';
import { useGlide } from '../theme';
import {
  CARD,
  Flags,
  INK,
  Label,
  MUTED_TEXT,
  Paper,
  SketchFilter,
  StickFigure,
  ThoughtBubble,
  TONE,
  handWidth,
  useSvgId,
  type Tone,
} from './kit';

type ArraySnap = Extract<HeapSnap, { kind: 'array' }>;

const SLOT = 68;
const LEFT = 40;
/** Top of the shelf plank; boxes stand on it. */
const PLANK = 124;
const FLOOR = 206;

interface ShelfSceneProps {
  arr: ArraySnap;
  heap: Heap;
  name: string;
  markers: Marker[];
  window: { from: number; to: number; names: [string, string] } | null;
  reads: Set<number>;
  writes: Set<number>;
  result?: Set<number>;
  /** This step is a check (if / loop condition). */
  comparing: boolean;
  /** The comparison the code made in this step, as recorded ("9 < 12"), and its outcome. */
  compare: { text: string; result: boolean } | null;
  /** The slot the code read most recently (at or before this step), and whether that read is this step. */
  lastRead: { index: number; now: boolean } | null;
  overlay: boolean;
  shapeOf: ShapeOf;
}

function itemText(v: ValueSnap, heap: Heap, shapeOf: ShapeOf): string {
  if (v.t === 'ref') {
    const h = heap[v.id];
    const shape = shapeOf(h);
    if (h && shape) return `node ${nodeValueLabel(h as ObjectSnap, heap, shape)}`;
  }
  return formatSnap(v, heap, 1);
}

/**
 * An array searched by index as a row of numbered shelf slots. A shopper stands at the
 * slot the code last read, slots the code has ruled out (outside its left..right window)
 * are taped off, and a thought bubble shows the comparison the code actually made.
 */
export function ShelfScene({
  arr,
  heap,
  name,
  markers,
  window: win,
  reads,
  writes,
  result,
  comparing,
  compare,
  lastRead,
  overlay,
  shapeOf,
}: ShelfSceneProps) {
  const sketch = useSvgId();
  const glide = useGlide();
  const n = arr.items.length;
  // Room for a marker that points one past either end (e.g. right = -1 after the search ends).
  const lead = markers.some((m) => m.index === -1) ? 1 : 0;
  const tail = markers.some((m) => m.index === n) ? 1 : 0;
  const xOf = (i: number) => LEFT + (i + lead) * SLOT + SLOT / 2;
  const width = LEFT + (n + lead + tail) * SLOT + (arr.total > n ? 70 : 20) + 150;
  const height = FLOOR + (overlay ? 52 : 34);
  const outside = (i: number) => !!win && (i < win.from || i > win.to);
  const byIndex = new Map<number, string[]>();
  for (const m of markers) byIndex.set(m.index, [...(byIndex.get(m.index) ?? []), m.name]);
  const ruledOut: [number, number][] = [];
  if (win) {
    if (win.from > 0) ruledOut.push([0, Math.min(win.from, n) - 1]);
    if (win.to < n - 1) ruledOut.push([Math.max(win.to, -1) + 1, n - 1]);
  }
  const shopperX = lastRead ? xOf(lastRead.index) : LEFT + 10;

  return (
    <Paper
      width={width}
      height={height}
      label={`${name}: ${n} shelf slots`}
      note={
        <>
          Each slot on the shelf is one item of <b>{name}</b>, and the number on the plank is its index. The shopper stands at the slot the
          code read most recently; the bubble shows the comparison the code just made.
          {win ? ` Taped-off slots are outside ${win.names[0]}..${win.names[1]}: the code no longer considers them.` : ''} Simplified:
          reading {name}[i] is instant; the shopper walks only to show which slot was read.
        </>
      }
      overlay={
        overlay
          ? `${name} = [${arr.items.map((v) => itemText(v, heap, shapeOf)).join(', ')}${arr.total > n ? ', …' : ''}]   ${markers.map((m) => `${m.name} = ${m.index}`).join('   ')}`
          : undefined
      }
    >
      <defs>
        <SketchFilter id={sketch} />
        <pattern id={`${sketch}-tape`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <rect width="10" height="10" fill="#ead9cf" />
          <line x1="0" y1="0" x2="0" y2="10" stroke={TONE.problem} strokeWidth="3" opacity="0.35" />
        </pattern>
      </defs>
      {/* The shelf unit and the floor. */}
      <g filter={`url(#${sketch})`}>
        <rect x={LEFT - 8} y={PLANK} width={(n + lead + tail) * SLOT + 16} height={14} rx={4} fill="#c9a77a" stroke={INK} strokeWidth={2} />
        <line x1={LEFT - 4} y1={PLANK + 14} x2={LEFT - 4} y2={FLOOR} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <line
          x1={LEFT + (n + lead + tail) * SLOT + 4}
          y1={PLANK + 14}
          x2={LEFT + (n + lead + tail) * SLOT + 4}
          y2={FLOOR}
          stroke={INK}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line x1={8} y1={FLOOR} x2={width - 8} y2={FLOOR} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.45} />
      </g>
      {/* Tape on the slots the code has ruled out. It lies under the boxes (whose fill lets it show
          through), so it never covers their values: tape drawn over the text left it at 2.5:1. */}
      {ruledOut.map(([a, b]) =>
        b >= a ? (
          <rect
            key={`${a}-${b}`}
            x={xOf(a) - SLOT / 2 + 3}
            y={PLANK - 46}
            width={(b - a + 1) * SLOT - 6}
            height={48}
            rx={8}
            fill={`url(#${sketch}-tape)`}
            opacity={0.85 * 0.55}
          />
        ) : null,
      )}
      {arr.items.map((v, i) => {
        const x = xOf(i);
        const text = itemText(v, heap, shapeOf);
        const tone: Tone = writes.has(i)
          ? 'changed'
          : result?.has(i)
            ? 'answer'
            : reads.has(i)
              ? comparing
                ? 'compare'
                : 'current'
              : outside(i)
                ? 'muted'
                : 'idle';
        const w = Math.max(46, handWidth(text, 18) + 16);
        return (
          // A labelled picture, not a button: pressing a shelf box does nothing.
          <g key={i} role="img" aria-label={`${name}[${i}] = ${text}${outside(i) ? ', ruled out' : ''}`}>
            <title>{`${name}[${i}] = ${text}`}</title>
            <rect
              x={x - w / 2}
              y={PLANK - 42}
              width={w}
              height={40}
              rx={9}
              fill={CARD}
              fillOpacity={tone === 'muted' ? 0.5 : 1}
              stroke={tone === 'idle' ? INK : TONE[tone]}
              strokeWidth={tone === 'idle' || tone === 'muted' ? 2 : 3.2}
              filter={`url(#${sketch})`}
            />
            <text
              x={x}
              y={PLANK - 15}
              textAnchor="middle"
              fontSize={18}
              fontFamily="var(--font-hand)"
              fill={tone === 'muted' ? MUTED_TEXT : INK}
            >
              {text}
            </text>
            {/* Ink on the wooden plank: light text there was too faint to read (2.1:1). */}
            <text x={x} y={PLANK + 11} textAnchor="middle" fontSize={13} fontFamily="var(--font-hand)" fill={INK}>
              {i}
            </text>
          </g>
        );
      })}
      {arr.total > n && <Label x={xOf(n) + 10} y={PLANK - 16} text={`+${arr.total - n} more`} anchor="start" size={15} color="#5b6178" />}
      {ruledOut.map(([a, b]) =>
        b >= a ? (
          <Label key={`${a}-${b}`} x={(xOf(a) + xOf(b)) / 2} y={PLANK - 50} text="ruled out" size={15} color={TONE.problem} />
        ) : null,
      )}
      {/* Index variables as flags over the slot they hold. */}
      {[...byIndex.entries()].map(([index, names]) => (
        <motion.g key={names.join('+')} initial={false} animate={{ x: xOf(index) }} transition={glide}>
          <Flags x={0} y={PLANK - 50 - (ruledOut.some(([a, b]) => index >= a && index <= b) ? 18 : 0)} names={names} />
        </motion.g>
      ))}
      {/* The shopper: at the slot read most recently, reaching up when that read is this step. */}
      <motion.g initial={false} animate={{ x: shopperX }} transition={glide}>
        <g transform={`translate(0 ${FLOOR})`}>
          <StickFigure
            pose={lastRead?.now ? 'raise' : 'stand'}
            tone={lastRead?.now ? (comparing ? 'compare' : 'current') : 'idle'}
            filter={sketch}
          />
          {lastRead && (
            <Label
              x={0}
              y={22}
              text={`${lastRead.now ? 'reads' : 'last read'} ${name}[${lastRead.index}]`}
              size={15}
              color={lastRead.now ? TONE.current : '#5b6178'}
            />
          )}
          {!lastRead && <Label x={0} y={22} text="hasn't read a slot yet" size={15} color="#5b6178" anchor="start" />}
          {compare && <ThoughtBubble x={12} y={-44} text={`${compare.text}?  ${compare.result ? 'yes' : 'no'}`} />}
        </g>
      </motion.g>
    </Paper>
  );
}
