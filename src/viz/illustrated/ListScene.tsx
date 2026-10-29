import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import type { Heap } from '../../trace/types';
import { nodeValueLabel, type ListDiagram, type ObjectSnap } from '../analysis';
import { listSlots, type ListSlot } from '../listLayout';
import { useGlide } from '../theme';
import type { NodeLabel } from '../TreeView';
import {
  ArrowHead,
  Flags,
  INK,
  Label,
  Mover,
  Paper,
  SketchFilter,
  StickFigure,
  TONE,
  ValueCard,
  pressable,
  textTone,
  useSvgId,
  type Tone,
} from './kit';

const COL = 140;
const ROW = 214;
const LEFT = 64;
/** Feet of the first row; the room above is for variable flags. */
const GROUND = 156;

interface ListSceneProps {
  diagram: ListDiagram;
  heap: Heap;
  labels: Map<number, NodeLabel[]>;
  current?: number | null;
  written: { objId: number; key: string }[];
  created: Set<number>;
  highlighted?: Set<number>;
  selected?: number | null;
  onSelect?: (id: number) => void;
  /** Places kept for the whole run (see listLayout.ts); otherwise this state's chains in order. */
  slots?: Map<number, ListSlot>;
  overlay: boolean;
}

interface Spot {
  x: number;
  y: number;
}

/**
 * Which way a person faces: toward the person their `next` points at (right when it is
 * null, themselves, or straight above or below). They hold the rope in the hand on that side.
 */
const facingOf = (from: Spot, to: Spot | null): 1 | -1 => (to && to.x < from.x ? -1 : 1);

/**
 * The rope from the hand a person faces with to the side of the person their `next` points
 * at that faces back, or hanging loose with a "null" tag. A rope to the left is the mirror
 * image of one to the right, so ropes never loop around anyone's body. Every rope is one
 * cubic curve, so a re-tied rope swings smoothly to its new target.
 */
function ropePath(from: Spot, to: Spot | null): string {
  const dir = facingOf(from, to);
  const s = { x: from.x + 20 * dir, y: from.y - 40 };
  if (!to) return `M ${s.x} ${s.y} C ${s.x + 6 * dir} ${s.y + 14} ${s.x + 10 * dir} ${s.y + 22} ${s.x + 8 * dir} ${s.y + 32}`;
  const e = { x: to.x - 16 * dir, y: to.y - 38 };
  if (from.y === to.y && Math.abs(to.x - from.x) === COL) {
    // The next person along: a short rope sagging between neighbors.
    return `M ${s.x} ${s.y} C ${s.x + 30 * dir} ${s.y + 24} ${e.x - 30 * dir} ${e.y + 24} ${e.x} ${e.y}`;
  }
  if (from.y === to.y) {
    // Skipping people (or onto itself): under the feet of everyone in between, up to the target.
    const dip = from.y + 34 + Math.min(26, Math.abs(e.x - s.x) * 0.05);
    return `M ${s.x} ${s.y} C ${s.x + 34 * dir} ${dip} ${e.x - 34 * dir} ${dip} ${e.x} ${e.y}`;
  }
  const reach = Math.max(70, Math.abs(e.x - s.x) * 0.4);
  return `M ${s.x} ${s.y} C ${s.x + reach * dir} ${s.y} ${e.x - reach * dir} ${e.y} ${e.x} ${e.y}`;
}

/** A singly linked list as people holding one-way ropes: each rope is that node's `next`. */
export function ListScene({
  diagram,
  heap,
  labels,
  current,
  written,
  created,
  highlighted,
  selected,
  onSelect,
  slots,
  overlay,
}: ListSceneProps) {
  const sketch = useSvgId();
  const glide = useGlide();
  const places = useMemo(
    () => (slots && diagram.chains.every((c) => c.ids.every((id) => slots.has(id))) ? slots : listSlots([diagram])),
    [slots, diagram],
  );
  const label = (id: number) => diagram.labels[id] ?? nodeValueLabel(heap[id] as ObjectSnap, heap);
  const nextOf = (id: number) => diagram.nextField[id] ?? 'next';
  const ids = diagram.chains.flatMap((c) => c.ids);
  let rows = 0;
  let cols = 0;
  for (const s of places.values()) {
    rows = Math.max(rows, s.row + 1);
    cols = Math.max(cols, s.col + 1);
  }
  const spot = (id: number): Spot | null => {
    const s = places.get(id);
    return s ? { x: LEFT + s.col * COL, y: GROUND + s.row * ROW } : null;
  };
  const nextIds = new Map<number, number | null>();
  for (const chain of diagram.chains) {
    chain.ids.forEach((id, i) => nextIds.set(id, chain.ids[i + 1] ?? (chain.end.kind === 'null' ? null : chain.end.to)));
  }
  const closesCycle = new Set(diagram.chains.filter((c) => c.end.kind === 'cycle').map((c) => c.ids[c.ids.length - 1]));
  const width = LEFT + Math.max(cols - 1, 0) * COL + 110;
  const height = GROUND + (rows - 1) * ROW + (overlay ? 70 : 56);
  const chainText = diagram.chains
    .map((c) =>
      [
        ...c.ids.map(label),
        c.end.kind === 'null' ? 'null' : c.end.kind === 'cycle' ? `(back to ${label(c.end.to)})` : `(joins ${label(c.end.to)})`,
      ].join(' → '),
    )
    .join('   ·   ');

  return (
    <Paper
      width={width}
      height={height}
      label={`Linked list: ${chainText}`}
      note={
        <>
          Each person is a node holding its value; the rope in their hand is their <b>{nextOf(ids[0] ?? -1)}</b>, pointing at exactly one
          person, or hanging loose for null. Simplified: a node doesn't know who points at it, and real nodes have no place in a row. They
          stay put here so you can watch the ropes change.
        </>
      }
      overlay={overlay ? chainText : undefined}
    >
      <defs>
        <SketchFilter id={sketch} />
        <ArrowHead id={`${sketch}-a`} color={INK} />
        <ArrowHead id={`${sketch}-hot`} color={TONE.changed} />
        <ArrowHead id={`${sketch}-cycle`} color={TONE.problem} />
      </defs>
      {[...Array(rows)].map((_, r) => (
        <line
          key={r}
          x1={10}
          y1={GROUND + r * ROW}
          x2={width - 10}
          y2={GROUND + r * ROW}
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.35}
        />
      ))}
      {/* Ropes first, so people stand in front of them. One rope per person, keyed by that person. */}
      <AnimatePresence initial={false}>
        {ids.map((id) => {
          const from = spot(id);
          if (!from) return null;
          const toId = nextIds.get(id) ?? null;
          const to = toId !== null ? spot(toId) : null;
          const hot = written.some((w) => w.objId === id && w.key === nextOf(id));
          const cycle = closesCycle.has(id);
          const color = cycle ? TONE.problem : hot ? TONE.changed : INK;
          return (
            <motion.path
              key={`rope-${id}`}
              initial={{ opacity: 0 }}
              animate={{ d: ropePath(from, to), opacity: 0.9 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={glide}
              fill="none"
              stroke={color}
              strokeWidth={hot ? 3.2 : 2.4}
              strokeLinecap="round"
              strokeDasharray={cycle ? '8 6' : undefined}
              markerEnd={to ? `url(#${sketch}-${cycle ? 'cycle' : hot ? 'hot' : 'a'})` : undefined}
            />
          );
        })}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {ids.map((id) => {
          const p = spot(id);
          if (!p) return null;
          const hot = written.some((w) => w.objId === id && w.key === nextOf(id));
          const toId = nextIds.get(id) ?? null;
          const isNull = toId === null;
          const facing = facingOf(p, toId !== null ? spot(toId) : null);
          const tags = labels.get(id) ?? [];
          const tone: Tone =
            current === id ? 'current' : hot ? 'changed' : created.has(id) ? 'changed' : highlighted?.has(id) ? 'compare' : 'idle';
          const note = hot ? `${nextOf(id)} changed` : created.has(id) ? 'new' : current === id ? 'current' : null;
          const names = [...new Set(tags.map((t) => t.name))];
          const faint = names.filter((n) => !tags.some((t) => t.name === n && t.active));
          return (
            <Mover key={id} x={p.x} y={p.y} enterFrom={{ dx: 0, dy: 16 }}>
              {(walking) => (
                <>
                  <g
                    {...pressable(onSelect ? () => onSelect(id) : undefined)}
                    aria-label={`node ${label(id)}${names.length ? `, referenced by ${names.join(', ')}` : ''}, ${nextOf(id)} ${isNull ? 'is null' : `points to node ${label(nextIds.get(id)!)}`}`}
                  >
                    <title>{`node ${label(id)}`}</title>
                    <StickFigure pose={hot ? 'raise' : 'reach'} tone={tone} walking={walking} facing={facing} filter={sketch}>
                      {/* Worn like a badge: this person's hands are busy with the rope. */}
                      <ValueCard text={label(id)} tone={tone} held={false} />
                    </StickFigure>
                    {selected === id && (
                      <ellipse cx={0} cy={-30} rx={34} ry={46} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="4 5" />
                    )}
                  </g>
                  {/* The labels around the person sit outside the button, so the button's visible text is
                      its value, which its name contains (WCAG 2.5.3); the name still says all of this. */}
                  {/* Beside the loose end of the rope, above the ground line. */}
                  {isNull && <Label x={34} y={-6} text="null" size={15} color="#5b6178" anchor="start" />}
                  <Flags x={0} y={-72} names={names} faint={faint} />
                  {note && <Label x={0} y={24} text={note} size={15} color={textTone(tone)} />}
                  {overlay && (
                    <Label
                      x={0}
                      y={note ? 42 : 24}
                      text={`${nextOf(id)} = ${isNull ? 'null' : `node ${label(nextIds.get(id)!)}`}`}
                      size={14}
                      color="#5b6178"
                    />
                  )}
                </>
              )}
            </Mover>
          );
        })}
      </AnimatePresence>
    </Paper>
  );
}
