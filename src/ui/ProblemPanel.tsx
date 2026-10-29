import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseValue, suggestStructures } from '../problems/pasted';
import { deepEqual } from '../problems/compare';
import { missingInputs } from '../problems/inputs';
import { notesIn } from '../problems/starters';
import { CUSTOM_ID, currentWork, problemFor, useStore, workLanguage, type InputRow } from '../state/store';
import type { FrameSnap, InputKind, Step } from '../trace/types';
import { buildListDiagram, buildTreeDiagram, nodeLabels, refId } from '../viz/analysis';
import { Cells } from '../viz/ArrayView';
import { EMPTY_FOCUS } from '../viz/focus';
import { ListView } from '../viz/ListView';
import { TreeView } from '../viz/TreeView';
import { ValueText } from '../viz/Value';
import { previewHeap } from '../viz/preview';
import { isLessonId } from '../learn/problems';
import { isPracticeId } from '../practice/problems';
import { LessonBrowser } from './LessonBrowser';
import { LessonPanel } from './LessonPanel';
import { PracticeBrowser } from './PracticeBrowser';
import { PracticePanel } from './PracticePanel';

const KINDS: { value: InputKind; label: string }[] = [
  { value: 'auto', label: 'value' },
  { value: 'tree', label: 'binary tree' },
  { value: 'list', label: 'linked list' },
  { value: 'pos', label: 'cycle position (pos)' },
];

/**
 * Shrinks a wide picture to the panel's width (never enlarges it), so a big input stays a
 * preview instead of pushing the whole panel sideways. Past the smallest readable scale,
 * the preview scrolls on its own.
 */
function FitWidth({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const scale = Math.max(0.45, Math.min(1, o.clientWidth / Math.max(i.scrollWidth, 1)));
      const height = i.scrollHeight;
      setFit((f) => (f.scale === scale && f.height === height ? f : { scale, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    // Exactly as tall as the shrunk picture; the unscaled layout box must not add a vertical scrollbar.
    <div ref={outer} className="overflow-x-auto overflow-y-hidden" style={{ height: fit.height ? fit.height * fit.scale : undefined }}>
      <div ref={inner} style={fit.scale === 1 ? undefined : { transform: `scale(${fit.scale})`, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Draws one input the way the board would, so the problem has a picture before any code runs.
 * `pos` is the cycle position for the linked-list input; `listName` names that input for a `pos` row.
 */
function InputPicture({ row, pos, listName }: { row: InputRow; pos: number; listName: string | null }) {
  const parsed = parseValue(row.text);
  const picture = useMemo(
    () => (parsed.ok && row.kind !== 'pos' ? previewHeap(parsed.value, row.kind, pos) : null),
    [parsed.ok, parsed.value, row.kind, pos],
  );
  if (row.kind === 'pos') {
    return (
      <p className="text-[12.5px] text-navy-300">
        {!listName
          ? 'No input is drawn as a linked list, so this position links nothing.'
          : parsed.value === -1
            ? `-1: ${listName} has no cycle.`
            : `The last node of ${listName} links back to the node at position ${String(parsed.value)} (counting from 0).`}{' '}
        This input builds the list; it is not passed to your function.
      </p>
    );
  }
  if (!picture) return null;
  const { heap, root } = picture;
  const id = refId(root);
  if (id === null) return <ValueText v={root} heap={heap} className="font-mono text-[15px]" />;
  const h = heap[id];
  if (row.kind === 'tree' || row.kind === 'list') {
    const frames: FrameSnap[] = [
      { id: 0, name: 'input', label: 'input', loc: null, vars: [{ name: row.name, value: root, declKind: 'param' }] },
    ];
    const step: Step = { index: 0, kind: 'start', loc: null, explanation: '', frames, heap, effects: [], outputCount: 0 };
    const labels = nodeLabels(step.frames, heap);
    if (row.kind === 'tree') {
      return (
        <FitWidth>
          <TreeView
            diagram={buildTreeDiagram(heap, [id], new Set([id]))}
            heap={heap}
            labels={labels}
            written={EMPTY_FOCUS.propWrites}
            created={EMPTY_FOCUS.created}
          />
        </FitWidth>
      );
    }
    return (
      <FitWidth>
        <ListView diagram={buildListDiagram(heap, [id], new Set([id]))} heap={heap} labels={labels} written={[]} created={new Set()} />
      </FitWidth>
    );
  }
  if (h?.kind === 'array') {
    return (
      <FitWidth>
        <div className="p-1">
          <Cells items={h.items} total={h.total} heap={heap} markers={[]} reads={new Set()} writes={new Set()} role="array" />
        </div>
      </FitWidth>
    );
  }
  return null;
}

function PasteBox() {
  const custom = useStore((s) => s.custom);
  const setCustomText = useStore((s) => s.setCustomText);
  const setCustomEntry = useStore((s) => s.setCustomEntry);
  const p = problemFor(CUSTOM_ID, custom);
  const suggestions = useMemo(() => suggestStructures(custom.text), [custom.text]);
  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="paste" className="section-title">
        Problem text
      </label>
      <textarea
        id="paste"
        value={custom.text}
        onChange={(e) => setCustomText(e.target.value)}
        rows={7}
        placeholder={'Paste a problem, including its examples:\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]'}
        className="field resize-y font-sans text-[13px] leading-relaxed"
      />
      <p className="rounded-lg border border-navy-600 bg-navy-850 px-3 py-2 text-[13px] leading-relaxed text-navy-200">
        Pasting text does not create an animation by itself. Drawgorithms reads the examples to fill in the inputs and expected output. The
        drawing always comes from running the code you write.
      </p>
      {custom.text.trim() && (
        <p className="text-[12.5px] text-navy-300">
          Found {p.cases.length} {p.cases.length === 1 ? 'example' : 'examples'}
          {p.params.length ? ` with inputs ${p.params.map((x) => x.name).join(', ')}` : ''}.
          {p.cases.length === 0 && ' Add lines like “Input: x = [1,2]” and “Output: 3”, or type inputs below.'}
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="text-[12.5px] text-navy-300">
          <p>Suggested from the description (not checked against your code):</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <li
                key={s.structure}
                className="rounded-md border border-navy-600 px-1.5 py-0.5"
                title={`The description says “${s.because}”.`}
              >
                {s.structure} <span className="text-navy-400">(“{s.because}”)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex flex-col gap-1 text-[13px] text-navy-300">
        Function Run should call
        <input
          value={custom.entry}
          onChange={(e) => setCustomEntry(e.target.value)}
          placeholder="first function in your code"
          className="field"
          spellCheck={false}
        />
      </label>
    </section>
  );
}

export function ProblemPanel() {
  const problemId = useStore((s) => s.problemId);
  const custom = useStore((s) => s.custom);
  const work = useStore((s) => currentWork(s));
  const selectCase = useStore((s) => s.selectCase);
  const setInput = useStore((s) => s.setInput);
  const setInputKind = useStore((s) => s.setInputKind);
  const setExpected = useStore((s) => s.setExpected);
  const selectProblem = useStore((s) => s.selectProblem);
  const addInput = useStore((s) => s.addInput);
  const removeInput = useStore((s) => s.removeInput);
  const hints = useStore((s) => (s.live.result?.status === 'pending' ? s.live.lastDrawn?.hints : s.live.result?.hints));
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const p = problemFor(problemId, custom);
  // The description and notes in the words for the code the learner's language starts from.
  const notes = notesIn(p, workLanguage(work));
  const isCustom = problemId === CUSTOM_ID;
  const expectedOk = !work.expectedText.trim() || parseValue(work.expectedText).ok;
  // A cycle position is not an argument (see InputKind), so it never stands in for a parameter.
  const missing = missingInputs(
    p,
    work.inputs.filter((r) => r.kind !== 'pos').map((r) => r.name),
    hints,
  );
  // A `pos` input links the tail of the first linked-list input back into the list.
  const listRow = work.inputs.find((r) => r.kind === 'list');
  const posRow = work.inputs.find((r) => r.kind === 'pos');
  const cyclePos = posRow ? parseValue(posRow.text).value : -1;
  const selectedCase = p.cases[work.caseIndex];
  const inputsEdited = !!selectedCase && work.inputs.some((r) => !deepEqual(parseValue(r.text).value, selectedCase.inputs[r.name]));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <header className="flex flex-col gap-2">
        {/* The buttons wrap under the title when the panel is too narrow for both. */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-[19px] font-bold leading-tight text-navy-100">{p.title}</h2>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn-quiet h-7 px-2 text-[12px]" onClick={() => setLessonsOpen(true)}>
              Learn
            </button>
            <button type="button" className="btn-quiet h-7 px-2 text-[12px]" onClick={() => setPracticeOpen(true)}>
              Practice
            </button>
            {!isCustom && (
              <button type="button" className="btn-quiet h-7 px-2 text-[12px]" onClick={() => selectProblem(CUSTOM_ID)}>
                Paste a problem
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <span key={t} className="rounded-md border border-navy-600 px-1.5 py-0.5 text-[11.5px] text-navy-300">
              {t}
            </span>
          ))}
        </div>
      </header>

      {isCustom && <PasteBox />}

      {notes.description.length > 0 && (
        <section className="flex flex-col gap-2 text-[14px] leading-relaxed text-navy-200">
          {notes.description.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">{p.mode === 'function' ? 'Inputs' : 'Values'}</h3>
          {p.cases.length > 1 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Test cases">
              {p.cases.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => selectCase(i)}
                  aria-pressed={work.caseIndex === i}
                  className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${
                    work.caseIndex === i ? 'bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/60' : 'text-navy-300 hover:bg-navy-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {p.mode === 'script' && (
          <p className="text-[13px] text-navy-300">This example sets its values in the code. Edit them in the editor.</p>
        )}
        {p.mode === 'function' &&
          work.inputs.map((row) => {
            const ok = parseValue(row.text).ok;
            return (
              <div key={row.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`in-${row.name}`} className="font-mono text-[13px] font-semibold text-navy-100">
                    {row.name}
                  </label>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => removeInput(row.name)}
                      className="ml-auto text-[11.5px] text-navy-400 hover:text-navy-100"
                      aria-label={`Remove input ${row.name}`}
                    >
                      remove
                    </button>
                  )}
                  <select
                    value={row.kind}
                    onChange={(e) => setInputKind(row.name, e.target.value as InputKind)}
                    aria-label={`Draw ${row.name} as`}
                    className="rounded-md border border-navy-600 bg-navy-900 px-1.5 py-0.5 text-[12px] text-navy-200 hover:border-navy-400"
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  id={`in-${row.name}`}
                  value={row.text}
                  onChange={(e) => setInput(row.name, e.target.value)}
                  spellCheck={false}
                  aria-invalid={!ok}
                  className={`field ${ok ? '' : 'border-rose-400'}`}
                />
                {!ok && <p className="text-[12px] text-rose-300">Not valid JSON yet, e.g. [2, 7, 11, 15], 9 or "abc".</p>}
                {ok && (
                  <InputPicture
                    row={row}
                    pos={row === listRow && typeof cyclePos === 'number' ? cyclePos : -1}
                    listName={listRow?.name ?? null}
                  />
                )}
              </div>
            );
          })}
        {p.mode === 'function' && missing.names.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-100">
            <p>
              Your function {missing.fn}() takes {missing.names.map((n) => `“${n}”`).join(', ')}, but there is no input with{' '}
              {missing.names.length === 1 ? 'that name' : 'those names'}. It would receive undefined.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {missing.names.map((n) => (
                <button key={n} type="button" className="btn-outline h-7" onClick={() => addInput(n)}>
                  Add input {n}
                </button>
              ))}
            </div>
          </div>
        )}
        {p.mode === 'function' && work.inputs.length === 0 && missing.names.length === 0 && (
          <p className="text-[13px] text-navy-300">
            No inputs yet. Paste a problem with examples, or write your function and its parameters will be offered here.
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[13px] font-semibold text-navy-100">
            {p.mode === 'script' ? 'expected values' : 'expected output'}
          </span>
          <input
            value={work.expectedText}
            onChange={(e) => setExpected(e.target.value)}
            spellCheck={false}
            placeholder={p.mode === 'script' ? '{"sum": 7}' : 'optional, e.g. [0, 1]'}
            aria-invalid={!expectedOk}
            className={`field ${expectedOk ? '' : 'border-rose-400'}`}
          />
        </label>
        {inputsEdited && work.expectedText.trim() && (
          <p className="text-[12.5px] text-amber-200">
            You changed the inputs, so this expected output (from {selectedCase.label}) may no longer apply. Update or clear it.
          </p>
        )}
        {p.params.some((x) => x.kind === 'tree') && (
          <p className="text-[12px] text-navy-400">
            Trees use level order: [5,3,8,null,4] means 5 has children 3 and 8, and 4 is the right child of 3.
          </p>
        )}
      </section>

      {notes.explanation && (
        <section className="flex flex-col gap-1.5">
          <h3 className="section-title">{isLessonId(problemId) ? 'How the demo works' : 'How the starter code works'}</h3>
          <p className="text-[14px] leading-relaxed text-navy-200">{notes.explanation}</p>
        </section>
      )}

      {notes.tryThis.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="section-title">Try changing</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-navy-200 marker:text-navy-500">
            {notes.tryThis.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {isPracticeId(problemId) && <PracticePanel exerciseId={problemId} />}
      {isLessonId(problemId) && <LessonPanel problemId={problemId} />}
      {practiceOpen && <PracticeBrowser onClose={() => setPracticeOpen(false)} />}
      {lessonsOpen && <LessonBrowser onClose={() => setLessonsOpen(false)} />}
    </div>
  );
}
