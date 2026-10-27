import { useMemo } from 'react';
import { compareRun } from '../problems/compare';
import { currentWork, displayedRun, problemFor, runFailed, useStore, type RunState } from '../state/store';
import type { EngineError, Step, StepKind } from '../trace/types';
import { buildTraversalIndex, traversalAt } from '../viz/analysis';
import { CallStack, ResultBanner, Structures, type BoardContext } from '../viz/Board';
import { focusOf } from '../viz/focus';
import { Inspector } from './Inspector';
import { NodeDetails } from './NodeDetails';
import { Playback } from './Playback';

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

function Explanation({ step }: { step: Step }) {
  const tone =
    step.kind === 'error'
      ? 'border-rose-400/60 bg-rose-400/10'
      : step.kind === 'done'
        ? 'border-teal-400/50 bg-teal-400/10'
        : step.kind === 'enter' || step.kind === 'return'
          ? 'border-violet-400/50 bg-violet-400/10'
          : 'border-navy-600 bg-navy-850';
  return (
    <div aria-live="polite" className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="mb-1 flex items-center gap-2 text-[12px]">
        <span className="font-semibold text-navy-200">{KIND_LABEL[step.kind]}</span>
        {step.loc && <span className="rounded bg-navy-800 px-1.5 font-mono text-navy-300">line {step.loc.line}</span>}
        {step.outcome !== undefined && (
          <span className={`rounded px-1.5 font-semibold ${step.outcome ? 'bg-teal-400/20 text-teal-200' : 'bg-navy-700 text-navy-200'}`}>
            {step.outcome ? 'true' : 'false'}
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-navy-100">{step.explanation}</p>
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

export function RunView() {
  const run = useStore((s) => s.run);
  const problemId = useStore((s) => s.problemId);
  const index = useStore((s) => s.step);
  const selectedNode = useStore((s) => s.selectedNode);
  const selectNode = useStore((s) => s.selectNode);
  const custom = useStore((s) => s.custom);
  const code = useStore((s) => currentWork(s).code);
  const startRun = useStore((s) => s.startRun);
  const display = useMemo(() => displayedRun({ run, problemId }), [run, problemId]);
  const result = display?.result ?? null;
  const problem = problemFor(problemId, custom);
  const traversal = useMemo(() => (result ? buildTraversalIndex(result.steps) : null), [result]);
  const step = result?.steps[Math.min(index, result.steps.length - 1)];
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
    hints: result.hints,
    focus,
    view: problem.view,
    resultCells: step.kind === 'done' ? resultIndexCells(step, problem.view?.resultIndicesInto) : undefined,
    current: tr?.current,
    visited: tr?.visited,
    returned: tr?.returned,
    selectedNode,
    onSelectNode: (id) => selectNode(selectedNode === id ? null : id),
  };
  const comparison = step.kind === 'done' && display ? compareRun(display.expect, result) : null;
  const stale = display!.kind === 'current' && display!.codeAtRun !== code && run.status !== 'running';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {failed && <FailureBanner run={run} inspecting={display!.kind === 'failed-steps'} />}
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
      {stale && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-100">
          <span>You edited the code after this run. The drawing still shows the old run.</span>
          <button type="button" className="btn-outline h-7" onClick={() => void startRun()}>
            Run again
          </button>
        </div>
      )}
      {run.status === 'running' && <p className="mx-4 mt-3 text-[13px] text-navy-300">Running your code…</p>}
      {result.notes.map((n) => (
        <p key={n} className="mx-4 mt-3 text-[13px] text-navy-300">
          {n}
        </p>
      ))}
      <div className="board-grid min-h-0 flex-1 overflow-auto px-4 py-4">
        <div className="flex flex-col gap-5">
          {step.kind === 'done' && <ResultBanner step={step} comparison={comparison} />}
          <Structures ctx={ctx} />
          {selectedNode !== null && step.heap[selectedNode] && (
            <NodeDetails
              id={selectedNode}
              step={step}
              heap={step.heap}
              visited={tr?.visited.has(selectedNode)}
              returned={tr?.returned.get(selectedNode)}
              onClose={() => selectNode(null)}
            />
          )}
          <CallStack ctx={ctx} />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-navy-700 bg-navy-900 px-4 py-3">
        <Explanation step={step} />
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
  );
}
