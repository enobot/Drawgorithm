import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import type { Effect, Heap, HeapSnap, Step, ValueSnap } from '../../trace/types';
import { formatSnap, nodeValueLabel, type ObjectSnap } from '../analysis';
import type { ShapeOf } from '../bindings';
import type { ItemTrack } from './identity';
import { Flags, INK, Label, Mover, Paper, StickFigure, TONE, ValueCard, pressable, useSvgId, type Tone, SketchFilter } from './kit';

type ArraySnap = Extract<HeapSnap, { kind: 'array' }>;

const GROUND = 158;
const DESK_RIGHT = 104;
const FIRST = 140;
const SPACING = 74;

interface QueueSceneProps {
  arr: ArraySnap;
  heap: Heap;
  /** Variables that refer to this array. */
  names: string[];
  /** Item identities at this step (from the trace); without them, positions stand in for identity. */
  track: ItemTrack | null;
  steps?: Step[];
  effects: Effect[];
  reads: Set<number>;
  writes: Set<number>;
  overlay: boolean;
  shapeOf: ShapeOf;
  onSelectNode?: (id: number) => void;
  onRevealLine?: (line: number) => void;
}

function itemText(v: ValueSnap, heap: Heap, shapeOf: ShapeOf): string {
  if (v.t === 'ref') {
    const h = heap[v.id];
    const shape = shapeOf(h);
    if (h && shape) return `node ${nodeValueLabel(h as ObjectSnap, heap, shape)}`;
  }
  return formatSnap(v, heap, 1);
}

/** A value in full, for the picked-person line (cards may shorten it; nested values are spelled out). */
function fullText(v: ValueSnap, heap: Heap, shapeOf: ShapeOf): string {
  if (v.t === 'ref') {
    const h = heap[v.id];
    const shape = shapeOf(h);
    if (h && shape) return `node ${nodeValueLabel(h as ObjectSnap, heap, shape)}`;
  }
  return formatSnap(v, heap);
}

/** What a person holds: a node reference is a round token with the node's value; anything else is written on a card. */
function held(v: ValueSnap, heap: Heap, shapeOf: ShapeOf): { text: string; node: boolean } {
  if (v.t === 'ref') {
    const h = heap[v.id];
    const shape = shapeOf(h);
    if (h && shape) return { text: nodeValueLabel(h as ObjectSnap, heap, shape), node: true };
  }
  return { text: formatSnap(v, heap, 1), node: false };
}

/**
 * A queue as people waiting at a counter: push() adds someone at the back, shift()
 * serves the person at the front. Driven by the array's recorded adds and removes.
 */
export function QueueScene({
  arr,
  heap,
  names,
  track,
  steps,
  effects,
  reads,
  writes,
  overlay,
  shapeOf,
  onSelectNode,
  onRevealLine,
}: QueueSceneProps) {
  const sketch = useSvgId();
  const [picked, setPicked] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const n = arr.items.length;
  const ids = track?.ids ?? arr.items.map((_, i) => `p${i}`);
  // The picked person's full value, written out below the scene (a card can only show a shortened one).
  const pickedIndex = picked === null ? -1 : ids.indexOf(picked);
  const pickedLine = pickedIndex >= 0 ? joinedLineOf(picked!) : undefined;
  const detail =
    pickedIndex >= 0
      ? `You picked ${names[0] ?? 'queue'}[${pickedIndex}] = ${fullText(arr.items[pickedIndex], heap, shapeOf)}.${
          pickedLine ? ` It joined the line at line ${pickedLine}.` : ''
        }`
      : 'Tap or press Enter on a person to see their whole value.';
  function joinedLineOf(id: string) {
    const k = track?.joined.get(id);
    return k !== undefined ? steps?.[k]?.loc?.line : undefined;
  }
  const mine = effects.filter((e) => 'objId' in e && e.objId === arr.id);
  const served = mine.find((e) => e.type === 'array-remove' && e.end === 'front');
  const joinedNow = new Set<string>();
  for (const e of mine) {
    if (e.type !== 'array-add') continue;
    const added = e.end === 'back' ? ids.slice(n - e.values.length) : ids.slice(0, e.values.length);
    added.forEach((id) => joinedNow.add(id));
  }
  const width = FIRST + Math.max(n, 1) * SPACING + 40;
  const height = GROUND + (overlay ? 56 : 40);
  const name = names[0] ?? 'queue';
  const joinedLine = joinedLineOf;

  return (
    <Paper
      width={width}
      height={height}
      label={`${name}: a line of ${n} ${n === 1 ? 'person' : 'people'}`}
      note={
        <>
          Each person is one item of <b>{name}</b>. push() adds someone at the back; shift() serves the person at the front.
          {arr.items.some((v) => held(v, heap, shapeOf).node)
            ? ' A round token is a reference to a node, showing that node’s value.'
            : ''}{' '}
          Simplified: in a real array every remaining item moves down one index when the front leaves; here the line steps forward.
        </>
      }
      overlay={
        overlay ? `${name} = [${arr.items.map((v) => itemText(v, heap, shapeOf)).join(', ')}${arr.total > n ? ', …' : ''}]` : undefined
      }
      detail={n > 0 ? detail : undefined}
    >
      <defs>
        <SketchFilter id={sketch} />
      </defs>
      {/* The counter, where the front of the line is served; the clerk waves when someone is served this step. */}
      <g transform={`translate(52 ${GROUND})`}>
        <StickFigure pose={served ? 'wave' : 'stand'} tone={served ? 'current' : 'idle'} filter={sketch} />
      </g>
      <g filter={`url(#${sketch})`}>
        <line x1={8} y1={GROUND} x2={width - 8} y2={GROUND} stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
        <rect x={16} y={GROUND - 46} width={DESK_RIGHT - 16} height={46} rx={8} fill="#d8cdb4" stroke={INK} strokeWidth={2.2} />
        <line x1={16} y1={GROUND - 34} x2={DESK_RIGHT} y2={GROUND - 34} stroke={INK} strokeWidth={1.4} opacity={0.5} />
      </g>
      <Label x={60} y={GROUND + 22} text="counter" size={15} color="#5b6178" />
      {served && served.type === 'array-remove' && (
        <Label x={60} y={GROUND - 112} text={`served ${itemText(served.value, heap, shapeOf)}`} color={TONE.current} size={17} />
      )}

      {/* The name of the line, over everyone in it. */}
      {n > 0 && (
        <g>
          <path
            d={`M ${FIRST - 24} 40 L ${FIRST - 24} 32 L ${FIRST + (n - 1) * SPACING + 24} 32 L ${FIRST + (n - 1) * SPACING + 24} 40`}
            fill="none"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
          <Flags x={FIRST + ((n - 1) * SPACING) / 2} y={33} names={names.length ? names : [name]} />
        </g>
      )}
      {n === 0 && (
        <Label x={FIRST + 30} y={GROUND - 40} text={`Nobody in line (${name} is empty)`} anchor="start" size={17} color="#5b6178" />
      )}

      <AnimatePresence initial={false}>
        {arr.items.map((v, i) => {
          const id = ids[i];
          const tone: Tone = writes.has(i) ? 'changed' : joinedNow.has(id) ? 'changed' : reads.has(i) ? 'current' : 'idle';
          const note = writes.has(i) ? 'changed' : joinedNow.has(id) ? 'joined' : reads.has(i) ? 'looked at' : null;
          const refId = v.t === 'ref' ? v.id : null;
          const line = joinedLine(id);
          return (
            <Mover
              key={id}
              x={FIRST + i * SPACING}
              y={GROUND}
              enterFrom={{ dx: 90 }}
              // The front person is served off to the left; one popped from the back walks off to the right.
              exitTo={{ dx: i === 0 ? -110 : 90, dy: i === 0 ? -10 : 0 }}
            >
              {(walking) => (
                <g
                  {...pressable(() => {
                    setPicked(picked === id ? null : id);
                    if (refId !== null) onSelectNode?.(refId);
                    if (line) onRevealLine?.(line);
                  })}
                  onFocus={() => setFocused(id)}
                  onBlur={() => setFocused((f) => (f === id ? null : f))}
                  aria-label={`${name}[${i}] = ${fullText(v, heap, shapeOf)}${note ? `, just ${note}` : ''}${line ? `, joined the line at line ${line}` : ''}`}
                >
                  <title>{`${name}[${i}] = ${fullText(v, heap, shapeOf)}${line ? ` (joined at line ${line})` : ''}`}</title>
                  {/* Picked: a solid ring. Keyboard focus: a dashed one, so tabbing through the line is visible. */}
                  {(picked === id || focused === id) && (
                    <ellipse
                      cx={0}
                      cy={-34}
                      rx={32}
                      ry={46}
                      fill="none"
                      stroke={TONE.compare}
                      strokeWidth={2}
                      strokeDasharray={picked === id ? undefined : '5 5'}
                    />
                  )}
                  <StickFigure pose="hold" tone={tone} walking={walking} facing={-1} filter={sketch}>
                    <ValueCard {...held(v, heap, shapeOf)} tone={tone} />
                  </StickFigure>
                  {note && <Label x={0} y={-74} text={note} color={TONE[tone]} size={15} />}
                  {i === 0 && <Label x={0} y={20} text={n === 1 ? 'front & back' : 'front'} size={14} color="#5b6178" />}
                  {i === n - 1 && n > 1 && <Label x={0} y={20} text="back" size={14} color="#5b6178" />}
                  {overlay && <Label x={0} y={38} text={`[${i}]`} size={14} color="#5b6178" />}
                </g>
              )}
            </Mover>
          );
        })}
      </AnimatePresence>
    </Paper>
  );
}
