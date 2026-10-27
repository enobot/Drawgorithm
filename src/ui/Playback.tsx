import { useEffect } from 'react';
import { useStore } from '../state/store';

const SPEEDS = [0.5, 1, 2, 4];
const BASE_MS = 900;

function Icon({ d, label }: { d: string; label: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <title>{label}</title>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  restart: 'M3 2h2v12H3zM14 2v12L6 8z',
  back: 'M13 2v12L5 8zM3 2h2v12H3z',
  forward: 'M3 2v12l8-6zM11 2h2v12h-2z',
  play: 'M4 2v12l10-6z',
  pause: 'M4 2h3v12H4zM9 2h3v12H9z',
};

/** Play/pause, stepping, speed and the draggable timeline shared by every drawing. */
export function Playback({ total }: { total: number }) {
  const step = useStore((s) => s.step);
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const setStep = useStore((s) => s.setStep);
  const setPlaying = useStore((s) => s.setPlaying);
  const setSpeed = useStore((s) => s.setSpeed);
  const atEnd = step >= total - 1;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setStep(step + 1), BASE_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, step, speed, atEnd, setStep, setPlaying]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-0.5" role="group" aria-label="Playback">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setStep(0)}
          disabled={step === 0}
          aria-label="Restart (Home)"
          title="Restart (Home)"
        >
          <Icon d={ICONS.restart} label="Restart" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          aria-label="Step back (Left arrow)"
          title="Step back (←)"
        >
          <Icon d={ICONS.back} label="Step back" />
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center size-9 rounded-full bg-teal-400 text-navy-950 hover:bg-teal-300 disabled:opacity-40"
          onClick={() => {
            if (atEnd) setStep(0);
            setPlaying(!playing);
          }}
          disabled={total <= 1}
          aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
        >
          <Icon d={playing ? ICONS.pause : ICONS.play} label={playing ? 'Pause' : 'Play'} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setStep(step + 1)}
          disabled={atEnd}
          aria-label="Step forward (Right arrow)"
          title="Step forward (→)"
        >
          <Icon d={ICONS.forward} label="Step forward" />
        </button>
      </div>
      <label className="flex min-w-40 flex-1 items-center gap-3">
        <span className="sr-only">Timeline</span>
        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={step}
          onChange={(e) => {
            setPlaying(false);
            setStep(Number(e.target.value));
          }}
          className="h-1.5 flex-1 cursor-pointer accent-teal-400"
          aria-valuetext={`Step ${step + 1} of ${total}`}
        />
        <span className="w-24 text-right text-[12px] tabular-nums text-navy-300">
          Step {step + 1} of {total}
        </span>
      </label>
      <label className="flex items-center gap-1.5 text-[12px] text-navy-300">
        Speed
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-md border border-navy-600 bg-navy-900 px-1.5 py-1 text-[12px] text-navy-100 hover:border-navy-400"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
