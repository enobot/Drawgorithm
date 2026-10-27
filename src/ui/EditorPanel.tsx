import { useEffect, useMemo } from 'react';
import { setFormatListener } from '../editor/monaco';
import { PROBLEMS } from '../problems/catalog';
import { CUSTOM_ID, currentWork, displayedRun, problemFor, useStore } from '../state/store';
import { CodeEditor, type EditorMarks } from './CodeEditor';

function useEditorMarks(): EditorMarks {
  const tab = useStore((s) => s.tab);
  const run = useStore((s) => s.run);
  const problemId = useStore((s) => s.problemId);
  const stepIndex = useStore((s) => s.step);
  const live = useStore((s) => s.live.result);
  const lastDrawn = useStore((s) => s.live.lastDrawn);
  const selectedNode = useStore((s) => s.selectedNode);
  const code = useStore((s) => currentWork(s).code);

  return useMemo(() => {
    const marks: EditorMarks = { current: null, previousLine: null, related: [], pendingLine: null, error: null };
    marks.pendingLine = live?.pending?.line ?? null;
    const display = displayedRun({ run, problemId });
    // Source locations are only shown when the trace belongs to the code in the editor.
    if (tab === 'run' && display && display.codeAtRun === code) {
      const steps = display.result.steps;
      const step = steps[Math.min(stepIndex, steps.length - 1)];
      const prev = stepIndex > 0 ? steps[stepIndex - 1] : null;
      marks.current = step?.kind === 'error' ? null : (step?.loc ?? null);
      marks.previousLine = prev?.loc?.line ?? null;
    }
    const err = run.result?.error;
    if (tab === 'run' && err?.loc && run.codeAtRun === code && run.problemId === problemId) {
      marks.error = { loc: err.loc, message: `${err.name}: ${err.message}` };
    }
    if (tab === 'build') {
      if (live?.error?.loc) marks.error = { loc: live.error.loc, message: `${live.error.name}: ${live.error.message}` };
      const info = selectedNode !== null ? lastDrawn?.objects[selectedNode] : undefined;
      if (info) {
        marks.related = [info.createdLine, ...info.attached.map((a) => a.line), ...info.changes.map((c) => c.line)].filter(
          (l): l is number => l !== null,
        );
      }
    }
    return marks;
  }, [tab, run, problemId, stepIndex, live, lastDrawn, selectedNode, code]);
}

function SupportedJs() {
  return (
    <details className="text-[12.5px] text-navy-300">
      <summary className="cursor-pointer select-none font-semibold hover:text-navy-100">Supported JavaScript</summary>
      <p className="mt-1.5 leading-relaxed">
        let, const, var, functions, arrow functions, recursion, classes (no extends), if/else, switch, for, for…of, for…in, while, do…while,
        break, continue, try/catch, destructuring, spread, template strings, arrays and their common methods, strings, Map, Set, Math,
        console.log, TreeNode(val, left, right) and ListNode(val, next).
      </p>
      <p className="mt-1 leading-relaxed">
        Not supported yet: async/await, generators, regular expressions, getters/setters, inheritance, Date. Code runs in a sandbox with no
        access to the page, storage, network or timers, and stops after 2,000 steps or 6 seconds.
      </p>
    </details>
  );
}

export function EditorPanel() {
  const problemId = useStore((s) => s.problemId);
  const custom = useStore((s) => s.custom);
  const code = useStore((s) => currentWork(s).code);
  const runStatus = useStore((s) => s.run.status);
  const hintDismissed = useStore((s) => s.hintDismissed);
  const reveal = useStore((s) => s.reveal);
  const live = useStore((s) => s.live.result);
  const formatOnSave = useStore((s) => s.formatOnSave);
  const formatNonce = useStore((s) => s.formatNonce);
  const formatMessage = useStore((s) => s.formatMessage);
  const {
    setCode,
    startRun,
    stop,
    resetCode,
    selectProblem,
    setCursorLine,
    dismissHint,
    setTab,
    requestFormat,
    setFormatOnSave,
    showFormatResult,
  } = useStore.getState();
  useEffect(() => setFormatListener(showFormatResult), [showFormatResult]);
  useEffect(() => {
    if (!formatMessage) return;
    const t = window.setTimeout(() => useStore.setState({ formatMessage: null }), 6000);
    return () => window.clearTimeout(t);
  }, [formatMessage]);
  const marks = useEditorMarks();
  const problem = problemFor(problemId, custom);
  const running = runStatus === 'running';
  const edited = code !== problem.starter;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-700 px-3 py-2">
        {running ? (
          <button type="button" className="btn bg-rose-400 text-navy-950 hover:bg-rose-300" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => void startRun()} title="Run (Ctrl+Enter)">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="currentColor">
              <path d="M2 1v10l9-5z" />
            </svg>
            Run
          </button>
        )}
        <button
          type="button"
          className="btn-quiet"
          disabled={!edited}
          onClick={() => {
            if (window.confirm('Replace your code with the starter code? You can undo this in the editor with Ctrl+Z.')) resetCode();
          }}
        >
          Reset
        </button>
        <button type="button" className="btn-quiet" onClick={requestFormat} title="Format Code with Prettier (Shift+Alt+F)">
          Format Code
        </button>
        <label
          className="flex items-center gap-1.5 text-[12.5px] text-navy-300"
          title="The code is saved automatically. With this on, Ctrl+S also formats it."
        >
          <input type="checkbox" checked={formatOnSave} onChange={(e) => setFormatOnSave(e.target.checked)} className="accent-teal-400" />
          Format on save
        </label>
        <label className="ml-auto flex items-center gap-1.5 text-[12.5px] text-navy-300">
          Load example
          <select
            value={problemId}
            onChange={(e) => selectProblem(e.target.value)}
            className="max-w-44 rounded-md border border-navy-600 bg-navy-900 px-1.5 py-1 text-[12.5px] text-navy-100 hover:border-navy-400"
          >
            {PROBLEMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
            <option value={CUSTOM_ID}>Your pasted problem</option>
          </select>
        </label>
      </div>
      {!hintDismissed && (
        <div className="flex items-center justify-between gap-2 border-b border-navy-700 bg-teal-400/10 px-3 py-1.5 text-[13px]">
          <span>
            <strong className="text-teal-200">Write it. Run it. See it.</strong>{' '}
            <span className="text-navy-200">Edit the code to change the drawing, then press Run to step through it.</span>
          </span>
          <button type="button" onClick={dismissHint} className="icon-btn size-6 shrink-0 text-[12px]" aria-label="Dismiss hint">
            ✕
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={code}
          onChange={(next) => {
            if (next === useStore.getState().work[useStore.getState().problemId]?.code) return;
            setCode(next);
            if (useStore.getState().tab === 'run') setTab('build');
          }}
          onRun={() => void startRun()}
          onCursorLine={setCursorLine}
          onSave={() => {
            if (useStore.getState().formatOnSave) requestFormat();
            else
              useStore.setState({
                formatMessage: { text: 'Your code is saved automatically. Turn on Format on save to format with Ctrl+S.', tone: 'ok' },
              });
          }}
          marks={marks}
          reveal={reveal}
          formatNonce={formatNonce}
        />
      </div>
      <div className="flex flex-col gap-1.5 border-t border-navy-700 px-3 py-2">
        <p className="text-[12.5px]" aria-live="polite">
          {formatMessage ? (
            <span className={formatMessage.tone === 'ok' ? 'text-teal-200' : 'text-amber-200'}>{formatMessage.text}</span>
          ) : live?.pending ? (
            <span className="text-amber-200">
              Line {live.pending.line} is unfinished: {live.pending.message}.
            </span>
          ) : live?.error ? (
            <span className="text-rose-300">
              Line {live.error.loc?.line}: {live.error.message}
            </span>
          ) : (
            <span className="text-navy-400">Ctrl+Enter runs the code. ← → step through it when the editor isn’t focused.</span>
          )}
        </p>
        <SupportedJs />
      </div>
    </div>
  );
}
