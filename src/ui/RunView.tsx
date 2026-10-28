import { useMemo, useState } from 'react';
import { compareRun } from '../problems/compare';
import { displayedRun, problemFor, runFailed, shownCode, useStore, type RunState, type Walkthrough } from '../state/store';
import type { EngineError, Step, StepKind } from '../trace/types';
import { buildTraversalIndex, traversalAt } from '../viz/analysis';
import { CallStack, IllustratedNote, ResultBanner, Structures, type BoardContext } from '../viz/Board';
import { CallTreeSection } from '../viz/CallTreeView';
import { focusOf } from '../viz/focus';
import { listSlotsForSteps } from '../viz/listLayout';
import { NO_OVERRIDES, resolveBindings } from '../viz/bindings';
import { BindingsPanel } from './BindingsPanel';
import { Inspector } from './Inspector';
import { NodeDetails } from './NodeDetails';
import { Playback } from './Playback';
import { SHORT_WIDE, useMedia } from './useMedia';
import { ZoomPan } from './ZoomPan';

const KIND_LABEL: Record<StepKind, string> = {
  start: 'Start',
  declare: 'Create',
  assign: 'Update',
  statement: 'Run',
  condition: 'Check',
  'loop-check': 'Loop check',
  'loop-next': 'Next item',
  jump: 'Jump',
  enter: 'Call',
  return: 'Return',
  done: 'Done',
  error: 'Error',
};

const ERROR_TITLE: Record<EngineError['kind'], string> = {
  syntax: 'Syntax error',
  unsupported: 'Not supported yet',
  runtime: 'The code threw an error',
  limit: 'Stopped by a safety limit',
  setup: 'Nothing to run yet',
};

/** During a walkthrough the code that runs is the authored answer: the engine's "your code" sentences say so. */
const forAnswer = (text: string) => text.replace(/^Your code/, 'The answer').replace(/\byour code\b/g, 'the answer');

function Explanation({ step, walking }: { step: Step; walking: boolean }) {
  const tone =
    step.kind === 'error'
      ? 'border-rose-400/60 bg-rose-400/10'
      : step.kind === 'done'
        ? 'border-teal-400/50 bg-teal-400/10'
        : step.kind === 'enter' || step.kind === 'return'
          ? 'border-violet-400/50 bg-violet-400/10'
          : 'border-navy-600 bg-navy-850';
  return (
    <div aria-live="polite" className={`rounded-2xl border px-4 py-3 max-sm:px-3 max-sm:py-2 ${tone}`}>
      <div className="mb-1 flex items-center gap-2 text-[12px] max-sm:mb-0.5">
        <span className="font-semibold text-navy-200">{KIND_LABEL[step.kind]}</span>
        {step.loc && <span className="rounded bg-navy-800 px-1.5 font-mono text-navy-300">line {step.loc.line}</span>}
        {step.outcome !== undefined && (
          <span className={`rounded px-1.5 font-semibold ${step.outcome ? 'bg-teal-400/20 text-teal-200' : 'bg-navy-700 text-navy-200'}`}>
            {step.outcome ? 'true' : 'false'}
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-navy-100 max-sm:text-[14px] max-sm:leading-snug">
        {walking ? forAnswer(step.explanation) : step.explanation}
      </p>
    </div>
  );
}

function resultIndexCells(step: Step, arrayName: string | undefined) {
  if (!arrayName || !step.result || step.result.t !== 'ref') return undefined;
  const h = step.heap[step.result.id];
  if (!h || h.kind !== 'array') return undefined;
  const idx = h.items.filter((v) => v.t === 'number' && Number.isInteger(v.v)).map((v) => (v as { v: number }).v);
  return idx.length === h.items.length ? { arrayName, indices: new Set(idx) } : undefined;
}

/** Why the latest run is not drawn as a result, with the line and a way to inspect the partial steps. */
function FailureBanner({ run, inspecting }: { run: RunState; inspecting: boolean }) {
  const revealLine = useStore((s) => s.revealLine);
  const setInspectFailed = useStore((s) => s.setInspectFailed);
  const error = run.result?.error ?? null;
  const partial = run.result?.status === 'error' ? run.result.steps.length - 1 : 0;
  const title = run.message
    ? run.status === 'stopped'
      ? 'Run stopped'
      : 'The run did not finish'
    : error
      ? ERROR_TITLE[error.kind]
      : 'The run did not finish';
  const message =
    run.message ?? (error ? `${error.kind === 'runtime' && error.name !== 'Uncaught' ? `${error.name}: ` : ''}${error.message}` : '');
  return (
    <div role="alert" className="mx-4 mt-3 rounded-xl border border-rose-400/60 bg-rose-400/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-rose-100">{title}</p>
        {error?.loc && (
          <button
            type="button"
            onClick={() => revealLine(error.loc!.line)}
            className="rounded bg-navy-800 px-1.5 font-mono text-[12px] text-navy-200 hover:bg-navy-700"
          >
            line {error.loc.line}
          </button>
        )}
      </div>
      <p className="mt-1 text-[14px] text-navy-100">{message}</p>
      <p className="mt-1 text-[12.5px] text-navy-300">
        A run that does not finish is not drawn as a result. Fix the code, then press Run again.
      </p>
      {partial > 0 && (
        <button type="button" className="btn-outline mt-2 h-7" onClick={() => setInspectFailed(!inspecting)}>
          {inspecting
            ? 'Back to the error summary'
            : `Step through the ${partial} ${partial === 1 ? 'step' : 'steps'} that ran before it stopped`}
        </button>
      )}
    </div>
  );
}

/** Says the board is playing the authored answer, not the learner's code, with how the answer works. */
function WalkthroughBanner({ walkthrough }: { walkthrough: Walkthrough }) {
  const endWalkthrough = useStore((s) => s.endWalkthrough);
  return (
    <div role="status" className="mx-4 mt-3 rounded-xl border border-violet-300/50 bg-violet-400/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-violet-100">Walkthrough: the authored answer to {walkthrough.title}</p>
        <button type="button" className="btn-outline h-7" onClick={endWalkthrough}>
          Back to my code
        </button>
      </div>
      <p className="mt-1 text-[13px] text-navy-200">
        This drawing runs the reference solution, not your code; your code is kept as it was. Step through it, or pick another example to
        replay it there.
      </p>
      <details className="mt-1.5 text-[13px] text-navy-200">
        <summary className="cursor-pointer select-none font-semibold text-navy-100">How this answer works</summary>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {walkthrough.explanation.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

export function RunView() {
  const run = useStore((s) => s.run);
  const problemId = useStore((s) => s.problemId);
  const index = useStore((s) => s.step);
  const selectedNode = useStore((s) => s.selectedNode);
  const selectNode = useStore((s) => s.selectNode);
  const custom = useStore((s) => s.custom);
  const code = useStore(shownCode);
  const walkthrough = useStore((s) => (s.walkthrough?.problemId === s.problemId ? s.walkthrough : null));
  const startRun = useStore((s) => s.startRun);
  const details = useStore((s) => s.showDetails);
  const illustrated = useStore((s) => s.viewStyle !== 'technical');
  const technical = useStore((s) => s.viewStyle !== 'illustrated');
  const revealLine = useStore((s) => s.revealLine);
  const [zoomSlot, setZoomSlot] = useState<HTMLDivElement | null>(null);
  const sideBySide = useMedia(SHORT_WIDE);
  const display = useMemo(() => displayedRun({ run, problemId }), [run, problemId]);
  const result = display?.result ?? null;
  const problem = problemFor(problemId, custom);
  const overrides = useStore((s) => s.bindings[s.problemId]) ?? NO_OVERRIDES;
  const step = result?.steps[Math.min(index, result.steps.length - 1)];
  const bindings = useMemo(
    () => (result && step ? resolveBindings(step.heap, step.frames, result.hints, overrides) : null),
    [result, step, overrides],
  );
  // Traversal state (visited, returned values) and list node places are read through the bindings of the final state.
  const runShapeOf = useMemo(() => {
    if (!result) return null;
    const last = result.steps[result.steps.length - 1];
    return resolveBindings(last.heap, last.frames, result.hints, overrides).shapeOf;
  }, [result, overrides]);
  const traversal = useMemo(
    () => (result && runShapeOf ? buildTraversalIndex(result.steps, runShapeOf, result.hints.usage?.walkers) : null),
    [result, runShapeOf],
  );
  // List nodes keep one place for the whole run, so re-pointing `next` moves arrows, not boxes.
  const listPlaces = useMemo(() => (result && runShapeOf ? listSlotsForSteps(result.steps, runShapeOf) : undefined), [result, runShapeOf]);
  const focus = useMemo(() => focusOf(step ?? null), [step]);
  const failed = run.problemId === problemId && runFailed(run) && run.status !== 'running';

  if (!result || !step) {
    return (
      <div className="flex h-full flex-col">
        {failed && <FailureBanner run={run} inspecting={false} />}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          {run.status === 'running' ? (
            <>
              <p className="text-navy-200">Running your code…</p>
              <button type="button" className="btn bg-rose-400 text-navy-950 hover:bg-rose-300" onClick={() => useStore.getState().stop()}>
                Stop
              </button>
            </>
          ) : (
            !failed && (
              <>
                <p className="text-[17px] font-semibold text-navy-100">Press Run to watch your code execute.</p>
                <p className="max-w-sm text-[14px] text-navy-300">Each step shows the line that ran, what changed, and why.</p>
                <button type="button" className="btn-primary mt-1" onClick={() => void startRun()}>
                  Run
                </button>
              </>
            )
          )}
        </div>
      </div>
    );
  }

  const tr = traversal ? traversalAt(traversal, step.index) : null;
  const ctx: BoardContext = {
    step,
    hints: bindings!.hints,
    shapeOf: bindings!.shapeOf,
    roles: bindings!.roles,
    focus,
    view: problem.view,
    resultCells: step.kind === 'done' ? resultIndexCells(step, problem.view?.resultIndicesInto) : undefined,
    current: tr?.current,
    visited: tr?.visited,
    returned: tr?.returned,
    selectedNode,
    onSelectNode: (id) => selectNode(selectedNode === id ? null : id),
    details,
    listSlots: listPlaces,
    illustrated,
    technical,
    steps: result.steps,
    onRevealLine: revealLine,
  };
  const comparison = step.kind === 'done' && display ? compareRun(display.expect, result) : null;
  // A trace is never presented as belonging to code it did not come from.
  const stale = display!.codeAtRun !== code;
  const running = run.status === 'running';

  return (
    // On short screens the board keeps a usable height and the whole view scrolls, with playback pinned below.
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {failed && <FailureBanner run={run} inspecting={display!.kind === 'failed-steps'} />}
      {walkthrough && <WalkthroughBanner walkthrough={walkthrough} />}
      {display!.kind === 'previous' && (
        <p className="mx-4 mt-3 rounded-lg border border-navy-500 bg-navy-850 px-3 py-2 text-[13px] text-navy-200">
          <strong className="text-navy-100">Previous valid state:</strong> your last run that finished
          {display!.codeAtRun === code ? ' (same code).' : ', from an older version of your code.'}
        </p>
      )}
      {display!.kind === 'failed-steps' && (
        <p className="mx-4 mt-3 rounded-lg border border-rose-400/50 bg-navy-850 px-3 py-2 text-[13px] text-navy-200">
          <strong className="text-rose-100">Failed run:</strong> these are the steps that ran before it stopped. They are not a finished
          result.
        </p>
      )}
      {stale && display!.kind === 'current' && (
        <div
          role="status"
          className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-100"
        >
          <span>
            {running
              ? 'Running your latest edit. Until it finishes, this is the run of your previous code.'
              : 'You edited the code after this run. The drawing still shows the old run.'}
          </span>
          {!running && (
            <button type="button" className="btn-outline h-7" onClick={() => void startRun()}>
              Run again
            </button>
          )}
        </div>
      )}
      {running && !stale && <p className="mx-4 mt-3 text-[13px] text-navy-300">Running your code…</p>}
      {/* Shown for the whole run, not per step, so stepping never shifts the drawing. */}
      {!running && !stale && run.auto && display!.kind === 'current' && (
        <p className="mx-4 mt-3 text-[12.5px] text-navy-300 short:hidden">Ran automatically after your last edit.</p>
      )}
      {result.notes.map((n) => (
        <p key={n} className="mx-4 mt-3 text-[13px] text-navy-300">
          {n}
        </p>
      ))}
      <BindingsPanel bindings={bindings!} />
      {/* Short, wide screens (phones in landscape) put the step controls beside the drawing instead of under it. */}
      <div className="flex min-h-0 flex-1 flex-col short-wide:flex-row">
        <ZoomPan controlsSlot={sideBySide ? null : zoomSlot}>
          <div className="flex flex-col gap-5">
            <Structures ctx={ctx} />
            {selectedNode !== null && step.heap[selectedNode] && (
              <NodeDetails
                id={selectedNode}
                step={step}
                heap={step.heap}
                shapeOf={bindings!.shapeOf}
                visited={tr?.visited.has(selectedNode)}
                returned={tr?.returned.get(selectedNode)}
                onClose={() => selectNode(null)}
              />
            )}
            <CallTreeSection steps={result.steps} step={step} />
            <CallStack ctx={ctx} />
            {illustrated && <IllustratedNote />}
          </div>
        </ZoomPan>
        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-navy-700 bg-navy-900 px-4 py-3 max-sm:gap-2 max-sm:py-2.5 short-wide:static short-wide:w-[19rem] short-wide:shrink-0 short-wide:gap-2 short-wide:overflow-y-auto short-wide:border-t-0 short-wide:border-l short-wide:py-2.5">
          {/* The zoom controls sit just above the pinned bar, so they stay visible however the view is scrolled. */}
          {!sideBySide && <div ref={setZoomSlot} className="absolute bottom-full right-3 mb-3" />}
          {/* The result lives with the explanation, so reaching the end never pushes the drawing down. */}
          {step.kind === 'done' ? (
            <ResultBanner step={step} comparison={comparison} />
          ) : (
            <Explanation step={step} walking={!!walkthrough} />
          )}
          <Playback total={result.steps.length} />
          <details className="group">
            <summary className="cursor-pointer select-none text-[13px] font-semibold text-navy-300 hover:text-navy-100">
              Variables and output
            </summary>
            <div className="mt-2">
              <Inspector step={step} output={result.output} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
