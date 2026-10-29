import { useEffect, useRef, useState } from 'react';
import { LANGUAGES } from '../languages';
import { lessonProblemId } from '../learn/problems';
import { checkExercise, type CaseResult } from '../practice/check';
import { findExercise } from '../practice/collections';
import { LESSONS } from '../practice/foundations';
import { answerIn } from '../practice/python';
import type { Exercise } from '../practice/schema';
import { currentWork, useStore, workLanguage } from '../state/store';
import { cancelCheck, checkInWorker } from '../worker/client';

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-navy-200">{title}</h4>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-[13.5px] leading-snug text-navy-200 marker:text-navy-500">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/** Hints, one at a time: from a nudge to the full idea. */
function Hints({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-title">Hints</h3>
      {hints.slice(0, shown).map((h, i) => (
        <p key={h} className="rounded-xl bg-navy-850 px-3 py-2 text-[13.5px] leading-snug text-navy-100">
          <span className="mr-1.5 font-semibold text-teal-200">Hint {i + 1}.</span>
          {h}
        </p>
      ))}
      {shown < hints.length ? (
        <button type="button" className="btn-outline self-start" onClick={() => setShown(shown + 1)}>
          Show hint {shown + 1} of {hints.length}
        </button>
      ) : (
        <p className="text-[12.5px] text-navy-400">That's every hint.</p>
      )}
    </section>
  );
}

/** Runs the code in the editor on every example and additional test, in its own engine worker. */
function CheckTests({ exercise }: { exercise: Exercise }) {
  const code = useStore((s) => currentWork(s).code);
  const language = useStore((s) => workLanguage(currentWork(s)));
  const [state, setState] = useState<{ code: string; results: CaseResult[] } | 'checking' | null>(null);
  // One check at a time: leaving the exercise cancels it, so its results can't land later.
  const current = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      current.current?.abort();
      cancelCheck();
    },
    [],
  );
  const run = async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState('checking');
    const results = await checkExercise(exercise, code, (req) => checkInWorker(req, language), controller.signal);
    if (controller.signal.aborted || results === null) return;
    setState({ code, results });
  };
  const results = state && state !== 'checking' ? state.results : null;
  const passed = results?.filter((r) => r.status === 'passed').length ?? 0;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-title">Check your code</h3>
      <p className="text-[12.5px] leading-snug text-navy-400">
        Runs the code in the editor on the {exercise.content!.examples.length} examples and {exercise.content!.tests.length} more tests,
        each with the same limits as Run.
      </p>
      <button type="button" className="btn-primary self-start" onClick={() => void run()} disabled={state === 'checking'}>
        {state === 'checking' ? 'Checking…' : 'Check all tests'}
      </button>
      {results && (
        <div role="status" className="flex flex-col gap-1.5">
          <p className={`text-[14px] font-semibold ${passed === results.length ? 'text-emerald-200' : 'text-navy-100'}`}>
            {passed} of {results.length} passed
          </p>
          {state !== 'checking' && state && state.code !== code && (
            <p className="text-[12.5px] text-amber-200">You edited the code after this check. Check again to test the new version.</p>
          )}
          <ul className="flex flex-col gap-1">
            {results.map((r) => (
              <li key={r.label} className="rounded-lg bg-navy-850 px-3 py-1.5 text-[13px] leading-snug">
                <span
                  className={`mr-2 font-semibold ${r.status === 'passed' ? 'text-emerald-300' : r.status === 'failed' ? 'text-amber-200' : 'text-rose-300'}`}
                >
                  {r.status === 'passed' ? '✓ passed' : r.status === 'failed' ? '✗ failed' : '! error'}
                </span>
                <span className="text-navy-100">
                  {r.label}: {r.note}
                </span>
                {r.status !== 'passed' && <span className="block text-navy-300">{r.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Plays the authored answer (in the learner's language) on the board, one step at a time, without touching the learner's code. */
function WalkthroughButton({ exercise }: { exercise: Exercise }) {
  const startWalkthrough = useStore((s) => s.startWalkthrough);
  const endWalkthrough = useStore((s) => s.endWalkthrough);
  const walking = useStore((s) => s.walkthrough?.problemId === exercise.id);
  const language = useStore((s) => workLanguage(currentWork(s)));
  const answer = answerIn(exercise, language)!;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-title">Stuck?</h3>
      <p className="text-[12.5px] leading-snug text-navy-400">
        Watch the authored answer run on the selected example, step by step, with the drawing. Your own code stays as it is.
      </p>
      {walking ? (
        <button type="button" className="btn-outline self-start" onClick={endWalkthrough}>
          Back to my code
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary self-start"
          onClick={() =>
            startWalkthrough({
              code: answer.code,
              language: answer.language,
              title: `${exercise.number}. ${exercise.title}`,
              explanation: answer.explanation,
            })
          }
        >
          Walk through the answer
        </button>
      )}
    </section>
  );
}

/** The authored reference in the learner's language, kept visibly separate from the learner's own code. */
function Reference({ exercise }: { exercise: Exercise }) {
  const s = exercise.content!.solution;
  const language = useStore((st) => workLanguage(currentWork(st)));
  const answer = answerIn(exercise, language)!;
  const label = LANGUAGES.find((l) => l.id === answer.language)?.label ?? answer.language;
  return (
    <details className="rounded-xl bg-navy-850 px-3 py-2">
      <summary className="cursor-pointer select-none text-[13.5px] font-semibold text-navy-100">
        Reference solution in {label} (authored, not your code)
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-[13.5px] leading-snug text-navy-200">
        <p className="rounded-lg bg-amber-300/10 px-2.5 py-1.5 text-[12.5px] text-amber-100">
          This is a worked reference written for this exercise. The drawing shows your own code unless you choose Walk through the answer.
        </p>
        {answer.explanation.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {/* Focusable, so the code can be scrolled sideways with the keyboard. */}
        <pre
          tabIndex={0}
          role="region"
          aria-label="Reference solution code"
          className="overflow-x-auto rounded-lg bg-navy-950 p-3 font-mono text-[12.5px] leading-relaxed text-navy-100"
        >
          {answer.code}
        </pre>
        <p>
          <strong className="text-navy-100">Time:</strong> {s.complexity.time}. <strong className="text-navy-100">Extra space:</strong>{' '}
          {s.complexity.space}. {s.complexity.assumptions}
        </p>
      </div>
    </details>
  );
}

/** Everything a practice exercise (from any collection) adds to the problem panel. */
export function PracticePanel({ exerciseId }: { exerciseId: string }) {
  const exercise = findExercise(exerciseId);
  const selectProblem = useStore((s) => s.selectProblem);
  if (!exercise?.content) return null;
  const c = exercise.content;
  const related = exercise.related.map((id) => findExercise(id)!).filter(Boolean);
  return (
    // Keyed by exercise so hints and check results start fresh for each one.
    <div key={exercise.id} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="section-title">Details</h3>
        <p className="text-[13.5px] leading-snug text-navy-200">
          <strong className="text-navy-100">Input:</strong> {c.inputFormat}
        </p>
        <p className="text-[13.5px] leading-snug text-navy-200">
          <strong className="text-navy-100">Output:</strong> {c.outputFormat}
        </p>
        <List title="Constraints" items={c.constraints} />
        <List title="Rules" items={c.rules} />
      </section>
      <Hints hints={c.hints} />
      <CheckTests exercise={exercise} />
      <WalkthroughButton exercise={exercise} />
      <Reference exercise={exercise} />
      <section className="flex flex-col gap-1.5 text-[13px] leading-snug text-navy-300">
        <h3 className="section-title">What the drawing shows</h3>
        <p>{c.visualization.spec}</p>
        <p className="flex flex-wrap items-center gap-1.5">
          <strong className="text-navy-200">Before this:</strong>
          {exercise.prerequisites.map((l) => (
            <button
              key={l}
              type="button"
              className="rounded-md px-1.5 py-0.5 text-teal-200 hover:bg-navy-800"
              onClick={() => selectProblem(lessonProblemId(l))}
            >
              {LESSONS[l]}
            </button>
          ))}
        </p>
        {related.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5">
            <strong className="text-navy-200">Related:</strong>
            {related.map((r) =>
              r.status === 'available' ? (
                <button
                  key={r.id}
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-teal-200 hover:bg-navy-800"
                  onClick={() => selectProblem(r.id)}
                >
                  {r.number}. {r.title}
                </button>
              ) : (
                <span key={r.id} className="px-1.5 text-navy-400">
                  {r.number}. {r.title} (planned)
                </span>
              ),
            )}
          </p>
        )}
      </section>
    </div>
  );
}
