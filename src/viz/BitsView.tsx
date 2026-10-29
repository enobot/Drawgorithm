// Integers the code works on bit by bit (UsageHints.bits), drawn as rows of bits lined up by
// place value, so a & b, acc ^ x and n >>> 1 can be read column by column. The bits shown are
// the recorded values; bits a step changed are marked from that step's assign effect.
import type { FrameSnap, Step, VarSnap } from '../trace/types';
import { NameTag } from './Value';

/** The 32-bit range JavaScript's bit operators work in (as signed or unsigned numbers). */
const inRange = (v: number) => Number.isInteger(v) && v >= -(2 ** 31) && v < 2 ** 32;
const isBitValue = (v: VarSnap) => v.value.t === 'number' && inRange(v.value.v);

/** Bit k of v, reading a negative number as 32-bit two's complement. */
const bitOf = (v: number, k: number) => Math.floor((v < 0 ? v >>> 0 : v) / 2 ** k) % 2;

const widths = new WeakMap<Step[], Map<string, number>>();

/**
 * How many bits to show for `names` over the whole run, so the rows keep one width while
 * stepping: a multiple of 4 from 4 to 32; 32 when any of them is ever negative.
 */
export function bitWidth(steps: Step[], names: string[]): number {
  const key = [...names].sort().join(',');
  const cached = widths.get(steps)?.get(key);
  if (cached !== undefined) return cached;
  const wanted = new Set(names);
  let max = 0;
  let negative = false;
  for (const s of steps)
    for (const f of s.frames)
      for (const v of f.vars) {
        if (!wanted.has(v.name) || !isBitValue(v) || v.value.t !== 'number') continue;
        if (v.value.v < 0) negative = true;
        else max = Math.max(max, v.value.v);
      }
  const length = max === 0 ? 1 : Math.floor(Math.log2(max)) + 1;
  const width = negative || length > 31 ? 32 : Math.min(32, Math.max(4, Math.ceil(length / 4) * 4));
  if (!widths.has(steps)) widths.set(steps, new Map());
  widths.get(steps)!.set(key, width);
  return width;
}

export interface BitRowsProps {
  frame: FrameSnap;
  step: Step;
  steps: Step[] | undefined;
  /** Variable names the code works on bit by bit. */
  names: string[];
  /** Only the running call marks what this step changed. */
  active: boolean;
}

export function BitRows({ frame, step, steps, names, active }: BitRowsProps) {
  const rows = frame.vars.filter((v) => names.includes(v.name) && isBitValue(v));
  if (!rows.length) return null;
  const width = bitWidth(steps ?? [step], names);
  const places = Array.from({ length: width }, (_, i) => width - 1 - i);
  // What this step wrote: the bits that differ from before (or every bit of a new variable).
  const changedOf = (name: string): ((k: number) => boolean) => {
    if (!active) return () => false;
    for (const e of step.effects) {
      if ((e.type !== 'assign' && e.type !== 'declare') || e.name !== name || e.frameId !== frame.id) continue;
      if (e.type === 'declare') return () => true;
      if (e.before.t === 'number' && e.after.t === 'number' && inRange(e.before.v) && inRange(e.after.v)) {
        const before = e.before.v;
        const after = e.after.v;
        return (k) => bitOf(before, k) !== bitOf(after, k);
      }
    }
    return () => false;
  };
  const marks = rows.map((v) => changedOf(v.name));
  const anyChanged = rows.some((_, i) => places.some((k) => marks[i](k)));
  const gapBefore = (k: number) => (k % 4 === 3 && k !== width - 1 ? 'ml-1.5' : '');

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid w-fit items-center gap-x-3 gap-y-1.5"
        style={{ gridTemplateColumns: 'auto auto auto' }}
        aria-label="Numbers as bits"
      >
        <span />
        <div className="flex gap-[3px]" aria-hidden>
          {places.map((k) => (
            <span key={k} className={`w-[18px] text-center font-mono text-[9.5px] text-navy-400 ${gapBefore(k)}`}>
              {k}
            </span>
          ))}
        </div>
        <span />
        {rows.map((v, i) => {
          const value = v.value.t === 'number' ? v.value.v : 0;
          const shown = places.map((k) => bitOf(value, k)).join('');
          return [
            <NameTag key={`${v.name}-name`} name={v.name} className="justify-self-end" />,
            <div key={`${v.name}-bits`} className="flex gap-[3px]" aria-label={`${v.name} in binary: ${shown}`}>
              {places.map((k) => {
                const one = bitOf(value, k) === 1;
                const changed = marks[i](k);
                return (
                  <span
                    key={k}
                    className={`flex h-[22px] w-[18px] items-center justify-center rounded font-mono text-[12px] font-semibold transition-colors duration-300 ${gapBefore(k)} ${
                      one
                        ? 'bg-teal-400/25 text-teal-100 shadow-[inset_0_0_0_1px_rgb(94_234_212/0.6)]'
                        : 'bg-navy-850 text-navy-400 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.2)]'
                    } ${changed ? 'outline-2 outline-offset-1 outline-amber-300' : ''}`}
                  >
                    {one ? 1 : 0}
                  </span>
                );
              })}
            </div>,
            <span key={`${v.name}-value`} className="whitespace-nowrap font-mono text-[12.5px] text-navy-200">
              = {value}
              {value < 0 && <span className="text-navy-400"> (two’s complement)</span>}
            </span>,
          ];
        })}
      </div>
      <p className="max-w-xl text-[12.5px] text-navy-300">
        Bit k is worth 2<sup>k</sup>; the rightmost is bit 0.{anyChanged ? ' Outlined bits changed in this step.' : ''}
      </p>
    </div>
  );
}
