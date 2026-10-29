import type { OutputLine, Step } from '../trace/types';
import { formatSnap } from '../viz/analysis';
import { focusOf } from '../viz/focus';
import { NameTag } from '../viz/Value';

/** Compact variable list for the active call, plus everything printed so far. */
export function Inspector({ step, output }: { step: Step; output: OutputLine[] }) {
  const frame = step.frames[step.frames.length - 1];
  const focus = focusOf(step);
  const printed = output.slice(0, step.outputCount);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section aria-label="Variables" className="min-w-0">
        <h3 className="section-title mb-1.5">Variables {frame && frame.name !== 'Program' ? `in ${frame.name}` : ''}</h3>
        {frame && frame.vars.length ? (
          <table className="w-full text-[13px]">
            <tbody>
              {frame.vars.map((v) => (
                <tr key={v.name} className={focus.changed.has(v.name) ? 'bg-amber-300/10' : ''}>
                  <td className="py-0.5 pr-2 align-top">
                    <NameTag name={v.name} />
                  </td>
                  <td className="py-0.5 font-mono text-navy-100 break-all">{formatSnap(v.value, step.heap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-navy-400">None yet.</p>
        )}
      </section>
      <section aria-label="Output" className="min-w-0">
        <h3 className="section-title mb-1.5">Output</h3>
        <div className="max-h-32 overflow-auto rounded-lg bg-navy-950 px-2.5 py-1.5 font-mono text-[12.5px]">
          {printed.length ? (
            printed.map((l, i) => (
              <div key={i} className={l.level === 'error' ? 'text-rose-300' : 'text-navy-200'}>
                {l.text}
              </div>
            ))
          ) : (
            <span className="text-navy-400">console.log output appears here.</span>
          )}
        </div>
      </section>
    </div>
  );
}
