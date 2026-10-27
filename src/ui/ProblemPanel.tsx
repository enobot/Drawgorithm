import { useMemo } from 'react';
import { parseValue } from '../problems/pasted';
import { CUSTOM_ID, currentWork, problemFor, useStore, type InputRow } from '../state/store';
import type { FrameSnap, InputKind, Step } from '../trace/types';
import { buildListDiagram, buildTreeDiagram, nodeLabels, refId } from '../viz/analysis';
import { Cells } from '../viz/ArrayView';
import { EMPTY_FOCUS } from '../viz/focus';
import { ListView } from '../viz/ListView';
import { TreeView } from '../viz/TreeView';
import { ValueText } from '../viz/Value';
import { previewHeap } from '../viz/preview';

const KINDS: { value: InputKind; label: string }[] = [
  { value: 'auto', label: 'value' },
  { value: 'tree', label: 'binary tree' },
  { value: 'list', label: 'linked list' },
];

/** Draws one input the way the board would, so the problem has a picture before any code runs. */
function InputPicture({ row }: { row: InputRow }) {
  const parsed = parseValue(row.text);
  const picture = useMemo(() => (parsed.ok ? previewHeap(parsed.value, row.kind) : null), [parsed.ok, parsed.value, row.kind]);
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
        <TreeView
          diagram={buildTreeDiagram(heap, [id], new Set([id]))}
          heap={heap}
          labels={labels}
          written={EMPTY_FOCUS.propWrites}
          created={EMPTY_FOCUS.created}
        />
      );
    }
    return <ListView diagram={buildListDiagram(heap, [id], new Set([id]))} heap={heap} labels={labels} written={[]} created={new Set()} />;
  }
  if (h?.kind === 'array') {
    return (
      <div className="overflow-x-auto pb-1">
        <Cells items={h.items} total={h.total} heap={heap} markers={[]} reads={new Set()} writes={new Set()} role="array" />
      </div>
    );
  }
  return null;
}

function PasteBox() {
  const custom = useStore((s) => s.custom);
  const setCustomText = useStore((s) => s.setCustomText);
  const setCustomEntry = useStore((s) => s.setCustomEntry);
  const p = problemFor(CUSTOM_ID, custom);
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
        drawing always comes from running the JavaScript you write.
      </p>
      {custom.text.trim() && (
        <p className="text-[12.5px] text-navy-300">
          Found {p.cases.length} {p.cases.length === 1 ? 'example' : 'examples'}
          {p.params.length ? ` with inputs ${p.params.map((x) => x.name).join(', ')}` : ''}.
          {p.cases.length === 0 && ' Add lines like “Input: x = [1,2]” and “Output: 3”, or type inputs below.'}
        </p>
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
  const p = problemFor(problemId, custom);
  const isCustom = problemId === CUSTOM_ID;
  const expectedOk = !work.expectedText.trim() || parseValue(work.expectedText).ok;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[19px] font-bold leading-tight text-navy-100">{p.title}</h2>
          {!isCustom && (
            <button type="button" className="btn-quiet h-7 shrink-0 px-2 text-[12px]" onClick={() => selectProblem(CUSTOM_ID)}>
              Paste a problem
            </button>
          )}
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

      {p.description.length > 0 && (
        <section className="flex flex-col gap-2 text-[14px] leading-relaxed text-navy-200">
          {p.description.map((d, i) => (
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
                {ok && <InputPicture row={row} />}
              </div>
            );
          })}
        {p.mode === 'function' && work.inputs.length === 0 && (
          <p className="text-[13px] text-navy-300">
            No inputs found. Paste a problem with examples, or Run calls your function with no arguments.
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
        {p.params.some((x) => x.kind === 'tree') && (
          <p className="text-[12px] text-navy-400">
            Trees use level order: [5,3,8,null,4] means 5 has children 3 and 8, and 4 is the right child of 3.
          </p>
        )}
      </section>

      {p.explanation && (
        <section className="flex flex-col gap-1.5">
          <h3 className="section-title">How the starter code works</h3>
          <p className="text-[14px] leading-relaxed text-navy-200">{p.explanation}</p>
        </section>
      )}

      {p.tryThis.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="section-title">Try changing</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13.5px] text-navy-200 marker:text-navy-500">
            {p.tryThis.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
