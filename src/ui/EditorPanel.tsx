import { useEffect, useMemo, useRef } from 'react';
import { setFormatListener } from '../editor/monaco';
import { LANGUAGES } from '../languages';
import { PROBLEMS } from '../problems/catalog';
import { starterIn } from '../problems/starters';
import { CUSTOM_ID, displayedRun, problemFor, shownCode, shownLanguage, useStore, workLanguage, currentWork } from '../state/store';
import type { LanguageId } from '../languages';
import { CodeEditor, type EditorMarks } from './CodeEditor';

function useEditorMarks(): EditorMarks {
  const tab = useStore((s) => s.tab);
  const run = useStore((s) => s.run);
  const problemId = useStore((s) => s.problemId);
  const stepIndex = useStore((s) => s.step);
  const live = useStore((s) => s.live.result);
  const lastDrawn = useStore((s) => s.live.lastDrawn);
  const selectedNode = useStore((s) => s.selectedNode);
  const code = useStore(shownCode);

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

/**
 * A walkthrough's answer, read-only, with the running step's line marked as the editor marks it.
 * It is not put in the editor, so the learner's code and its undo history stay untouched.
 */
function AnswerCode({ code, marks }: { code: string; marks: EditorMarks }) {
  const box = useRef<HTMLDivElement>(null);
  const current = marks.current?.line ?? null;
  useEffect(() => {
    if (current !== null) box.current?.querySelector(`[data-line="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);
  return (
    <div ref={box} className="h-full overflow-auto py-3 font-mono text-[14px] leading-[22px]" aria-label="Answer code (read-only)">
      {code
        .replace(/\n$/, '')
        .split('\n')
        .map((text, i) => {
          const line = i + 1;
          const mark =
            line === current ? 'bg-teal-400/15 shadow-[inset_3px_0_0_0_#5eead4]' : line === marks.previousLine ? 'bg-navy-800/70' : '';
          return (
            <div key={line} data-line={line} className={`flex whitespace-pre pr-4 ${mark}`}>
              <span className="w-12 shrink-0 select-none pr-4 text-right text-navy-500">{line}</span>
              <span className="text-navy-100">{text || ' '}</span>
            </div>
          );
        })}
    </div>
  );
}

function SupportedJs() {
  return (
    <details className="text-[12.5px] text-navy-300">
      <summary className="cursor-pointer select-none font-semibold hover:text-navy-100">Supported languages and features</summary>
      <p className="mt-1.5 leading-relaxed">
        Languages that run today: JavaScript and Python. TypeScript, Java and C++ are planned; the Language menu shows each one's status.
      </p>
      <p className="mt-1.5 leading-relaxed">
        Python is real CPython 3.14 (Pyodide) in a sandboxed worker: the whole language and standard library (collections, heapq, math, …),
        TreeNode(val, left, right) and ListNode(val, next), and class Solution. Steps show each line and what it changed; unlike JavaScript,
        they can't show values that were only read or compared. The first run downloads about 10 MB. For JavaScript:
      </p>
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
  const walkthrough = useStore((s) => (s.walkthrough?.problemId === s.problemId ? s.walkthrough : null));
  const endWalkthrough = useStore((s) => s.endWalkthrough);
  const language = useStore((s) => workLanguage(currentWork(s)));
  const editorLanguage = useStore(shownLanguage);
  const setLanguage = useStore((s) => s.setLanguage);
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
  const edited = code !== starterIn(problem, language);

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
          disabled={!edited || !!walkthrough}
          onClick={() => {
            if (window.confirm('Replace your code with the starter code? You can undo this in the editor with Ctrl+Z.')) resetCode();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={requestFormat}
          disabled={!!walkthrough || language !== 'javascript'}
          title={language === 'javascript' ? 'Format Code with Prettier (Shift+Alt+F)' : 'Formatting is available for JavaScript only.'}
        >
          Format Code
        </button>
        <label
          className="flex items-center gap-1.5 text-[12.5px] text-navy-300"
          title="The code is saved automatically. With this on, Ctrl+S also formats it."
        >
          <input type="checkbox" checked={formatOnSave} onChange={(e) => setFormatOnSave(e.target.checked)} className="accent-teal-400" />
          Format on save
        </label>
        <label
          className="ml-auto flex items-center gap-1.5 text-[12.5px] text-navy-300"
          title={LANGUAGES.filter((l) => !l.available)
            .map((l) => `${l.label}: ${l.note}`)
            .join('\n')}
        >
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageId)}
            disabled={!!walkthrough}
            className="rounded-md border border-navy-600 bg-navy-900 px-1.5 py-1 text-[12.5px] text-navy-100 hover:border-navy-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} disabled={!l.available}>
                {l.available ? l.label : `${l.label} (not available yet)`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] text-navy-300">
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
            {/* A practice exercise opened from the Practice list shows here while it is open. */}
            {!PROBLEMS.some((p) => p.id === problemId) && problemId !== CUSTOM_ID && (
              <option value={problemId}>{problemFor(problemId, custom).title}</option>
            )}
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
      {walkthrough && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-700 bg-violet-400/10 px-3 py-1.5 text-[13px]">
          <span className="text-navy-100">
            <strong className="text-violet-100">Answer walkthrough</strong> (read-only). Your own code is kept and comes back when you
            leave.
          </span>
          <button type="button" className="btn-outline h-7" onClick={endWalkthrough}>
            Back to my code
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {walkthrough ? (
          <AnswerCode code={walkthrough.code} marks={marks} />
        ) : (
          <CodeEditor
            value={code}
            onChange={(next) => {
              if (next === useStore.getState().work[useStore.getState().problemId]?.code) return;
              setCode(next);
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
            language={editorLanguage === 'python' ? 'python' : 'javascript'}
          />
        )}
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
              {live.error.loc ? `Line ${live.error.loc.line}: ` : ''}
              {live.error.message}
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
