import { useMemo } from 'react';
import { shownLanguage, useStore } from '../state/store';
import { CallStack, FrameContent, IllustratedNote, Structures, type BoardContext } from '../viz/Board';
import { NO_OVERRIDES, resolveBindings } from '../viz/bindings';
import { EMPTY_FOCUS } from '../viz/focus';
import { BindingsPanel } from './BindingsPanel';
import { NodeDetails } from './NodeDetails';
import { ZoomPan } from './ZoomPan';

/**
 * Live Build: the structure the top-level code creates, redrawn as you type.
 * It never runs function bodies (their behavior depends on inputs); Run does that.
 */
export function BuildView() {
  const live = useStore((s) => s.live);
  const cursorLine = useStore((s) => s.cursorLine);
  const selectedNode = useStore((s) => s.selectedNode);
  const selectNode = useStore((s) => s.selectNode);
  const startRun = useStore((s) => s.startRun);
  const details = useStore((s) => s.showDetails);
  const illustrated = useStore((s) => s.viewStyle !== 'technical');
  const technical = useStore((s) => s.viewStyle !== 'illustrated');
  const revealLine = useStore((s) => s.revealLine);
  const python = useStore((s) => shownLanguage(s) === 'python');
  const current = live.result;
  const drawn = current?.step ? current : live.lastDrawn;
  const step = drawn?.step ?? null;
  // Invalid code never produces a new drawing; the last valid one stays, labeled.
  const showingPrevious = !!current && !current.step && !!live.lastDrawn;

  const lineInfo = useMemo(
    () => (drawn && cursorLine !== null ? drawn.lines.find((l) => l.line === cursorLine) : undefined),
    [drawn, cursorLine],
  );
  const overrides = useStore((s) => s.bindings[s.problemId]) ?? NO_OVERRIDES;
  const bindings = useMemo(
    () => (drawn && step ? resolveBindings(step.heap, step.frames, drawn.hints, overrides) : null),
    [drawn, step, overrides],
  );

  if (!current && !drawn) {
    return (
      <p className="p-6 text-[14px] text-navy-300">
        {python ? 'Loading Python to check your code (the first time downloads about 10 MB)…' : 'Reading your code…'}
      </p>
    );
  }

  const program = step?.frames[0];
  const hasDrawing = !!step && (step.frames[0].vars.length > 0 || Object.keys(step.heap).length > 0);
  const ctx: BoardContext | null = step
    ? {
        step,
        hints: bindings!.hints,
        shapeOf: bindings!.shapeOf,
        roles: bindings!.roles,
        focus: EMPTY_FOCUS,
        highlightedIds: new Set(lineInfo?.objIds ?? []),
        highlightedEdges: lineInfo?.edges,
        highlightedVars: new Set(lineInfo?.vars ?? []),
        selectedNode,
        onSelectNode: (id) => selectNode(selectedNode === id ? null : id),
        details,
        illustrated,
        technical,
        onRevealLine: revealLine,
      }
    : null;
  const functions = (current ?? drawn)!.hints.functions;

  return (
    // On short screens the board keeps a usable height and the whole view scrolls.
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-col gap-2 px-4 pt-3">
        {python && (
          <div className="rounded-xl border border-navy-600 bg-navy-850 px-3 py-2 text-[13px] text-navy-200">
            <p className="font-semibold text-navy-100">Live Build draws JavaScript only for now</p>
            <p className="mt-0.5">Python is checked as you type. Run it to watch it step by step.</p>
            <button type="button" className="btn-primary mt-2 h-8" onClick={() => void startRun()}>
              Run
            </button>
          </div>
        )}
        {current?.pending && (
          <div role="status" className="rounded-lg border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-[13px]">
            <p className="font-semibold text-amber-100">Waiting for line {current.pending.line} to finish</p>
            <p className="mt-0.5 font-mono text-[12.5px] text-navy-200">{current.pending.text || '(empty line)'}</p>
            <p className="mt-0.5 text-navy-300">Parser says: {current.pending.message}.</p>
          </div>
        )}
        {current?.error && (
          <div role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 px-3 py-2 text-[13px]">
            <p className="font-semibold text-rose-100">
              {current.error.loc ? `Line ${current.error.loc.line}: ` : ''}
              {current.error.kind === 'runtime' ? `${current.error.name}: ` : ''}
              {current.error.message}
            </p>
            <p className="mt-0.5 text-navy-300">
              {current.error.kind === 'unsupported'
                ? 'Drawgorithms can’t interpret this yet, so nothing new is drawn.'
                : 'The top-level code stopped with this error, so nothing new is drawn.'}
            </p>
          </div>
        )}
        {showingPrevious && (
          <p className="rounded-lg border border-navy-500 bg-navy-850 px-3 py-1.5 text-[13px] text-navy-200">
            <strong className="text-navy-100">Previous valid state.</strong> This is the drawing from the last version of your code that
            ran.
          </p>
        )}
        {current?.stoppedAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy-600 bg-navy-850 px-3 py-2 text-[13px]">
            <span className="text-navy-200">
              Drawn up to line {current.stoppedAt.line - 1}. Line {current.stoppedAt.line} calls a function, which needs Run.
            </span>
            <button type="button" className="btn-outline h-7" onClick={() => void startRun()}>
              Run it
            </button>
          </div>
        )}
      </div>
      {bindings && <BindingsPanel bindings={bindings} />}
      <ZoomPan>
        {ctx && hasDrawing ? (
          <div className="flex flex-col gap-5">
            <Structures ctx={ctx} />
            {selectedNode !== null && step!.heap[selectedNode] && (
              <NodeDetails
                id={selectedNode}
                step={step!}
                heap={step!.heap}
                info={drawn!.objects[selectedNode]}
                shapeOf={bindings!.shapeOf}
                onClose={() => selectNode(null)}
              />
            )}
            {program &&
              program.vars.length > 0 &&
              (step!.frames.length > 1 ? (
                <CallStack ctx={ctx} />
              ) : (
                <section
                  aria-label="Top-level variables"
                  className="w-fit min-w-full rounded-3xl bg-navy-900/90 p-4 shadow-[inset_0_0_0_1px_rgb(125_145_181/0.18)] sm:p-5"
                >
                  <FrameContent frame={program} ctx={ctx} active />
                </section>
              ))}
            {illustrated && <IllustratedNote />}
          </div>
        ) : (
          <div className="max-w-md text-[14px] text-navy-300">
            <p className="text-[16px] font-semibold text-navy-100">Nothing to draw yet</p>
            <p className="mt-1">
              Top-level code such as <code className="font-mono text-teal-200">const root = new TreeNode(5);</code> is drawn here as you
              type.
            </p>
          </div>
        )}
        {functions.length > 0 && (
          <div className="mt-5 flex flex-col gap-1.5">
            <h3 className="section-title">Functions (they run when you press Run)</h3>
            {functions.map((f) => (
              <p key={f.name} className="text-[13px] text-navy-300">
                <span className="font-mono text-violet-200">
                  {f.name}({f.params.join(', ')})
                </span>{' '}
                on line {f.line}: its steps depend on the values it is called with.
              </p>
            ))}
          </div>
        )}
      </ZoomPan>
      {lineInfo && (
        <div
          className="sticky bottom-0 z-10 border-t border-navy-700 bg-navy-900 px-4 py-2.5 text-[13.5px] text-navy-100"
          aria-live="polite"
        >
          <span className="mr-2 rounded bg-violet-400/20 px-1.5 font-mono text-[12px] text-violet-200">line {lineInfo.line}</span>
          {lineInfo.explanation}
        </div>
      )}
    </div>
  );
}
