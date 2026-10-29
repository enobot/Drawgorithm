import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GUIDES, guideFor, referenceVariant } from '../interview/guides';
import { findMoments, lineOf } from '../interview/moments';
import { observeCode, verdict, type Observation, type Verdict } from '../interview/observe';
import { GUIDE_INTRO, GUIDE_TITLE, SECTIONS } from '../interview/parts';
import {
  codeIn,
  say,
  type CaseRef,
  type Growth,
  type InterviewGuide,
  type Passage,
  type SectionId,
  type Variant,
  type Words,
} from '../interview/schema';
import type { LanguageId } from '../languages';
import { FOUNDATIONS } from '../practice/foundations';
import { answerIn } from '../practice/python';
import type { Exercise } from '../practice/schema';
import type { Pane } from '../state/deepLink';
import { currentWork, useStore, workLanguage } from '../state/store';
import { cancelCheck, checkInWorker } from '../worker/client';
import { useMedia } from './useMedia';

// The phone layout's query (NARROW in App.tsx): there the board and the editor are separate tabs.
const NARROW = '(max-width: 767.98px), (max-height: 519.98px) and (max-width: 1199.98px)';

/** The learner's language, for code names in the guide's wording. */
function useLanguage(): LanguageId {
  return useStore((s) => workLanguage(currentWork(s)));
}

function useWords() {
  const language = useLanguage();
  return (w: Words) => say(w, language);
}

const caseLabel = (ref: CaseRef) => (ref.from === 'examples' ? `Example ${ref.index + 1}` : `Test ${ref.index + 1}`);

function inputsText(e: Exercise, inputs: Record<string, unknown>): string {
  return e.content!.params.map((p) => `${p.name} = ${JSON.stringify(inputs[p.name])}`).join(', ');
}

function CaseLine({ exercise, refCase }: { exercise: Exercise; refCase: CaseRef }) {
  const x = exercise.content![refCase.from][refCase.index];
  return (
    <p className="rounded-lg bg-navy-950 px-2.5 py-1.5 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-navy-100">
      <span className="font-sans font-semibold text-navy-300">{caseLabel(refCase)}: </span>
      {inputsText(exercise, x.inputs)} → {JSON.stringify(x.output)}
    </p>
  );
}

/** A fragment of code, wrapped instead of scrolled, so it never needs a scrollbar (or an extra tab stop). */
function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-navy-950 px-1.5 py-0.5 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-navy-100">
      {children}
    </code>
  );
}

/**
 * Board actions: the learner's own code on an example, or the authored answer stepped to one of
 * the example's moments. The answer plays as a walkthrough, which keeps the learner's code
 * untouched and is labeled on the board and in the editor as not being the learner's code.
 */
function useBoard(exercise: Exercise, guide: InterviewGuide) {
  const language = useLanguage();
  const narrow = useMedia(NARROW);
  const walkthrough = useStore((s) => (s.walkthrough?.problemId === s.problemId ? s.walkthrough : null));
  // The moment waiting for the walkthrough's run to finish, and the pane to stay on (see the subscription below).
  const pending = useRef<number | null>(null);
  const stay = useRef<Pane | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const answer = answerIn(exercise, language)!;
  const onBoard = narrow ? ' Open the Visual tab to see it.' : '';

  /**
   * Keeps the learner where they are: a walkthrough and its run switch tabbed layouts to the
   * board, which would hide the guide (and the focused button) mid-explanation. `act` must start
   * a run; the pane is put back now and again when that run ends. The note says where the board is.
   */
  const keepPane = (act: () => void) => {
    const pane = useStore.getState().mobilePane;
    act();
    useStore.getState().setMobilePane(pane);
    stay.current = pane;
  };

  const runMine = (index: number) => {
    const s = useStore.getState();
    if (s.walkthrough) s.endWalkthrough();
    s.selectCase(index);
    s.setTab('run');
    void useStore.getState().startRun({ background: true });
    pending.current = null;
    setNote(`Running your code on Example ${index + 1}.${onBoard}`);
  };

  const showMoment = (moment: number) => {
    const s = useStore.getState();
    const walkingAnswer = !!walkthrough && walkthrough.code === answer.code;
    // Both paths start a new run synchronously (selectCase reruns an open walkthrough), so the
    // subscription only acts on a run that started after this request.
    keepPane(() => {
      s.selectCase(guide.example.case.index);
      if (!walkingAnswer) {
        s.startWalkthrough({
          code: answer.code,
          language: answer.language,
          title: `${exercise.number}. ${exercise.title}`,
          explanation: answer.explanation,
        });
      }
    });
    pending.current = moment;
    setNote('Running the authored answer on the example…');
  };

  // Once the walkthrough's run has finished: stay on the learner's pane, and step the board to the moment.
  useEffect(
    () =>
      useStore.subscribe((s) => {
        if (stay.current !== null && s.run.status !== 'running') {
          const pane = stay.current;
          stay.current = null;
          if (s.mobilePane !== pane) s.setMobilePane(pane);
        }
        const moment = pending.current;
        if (moment === null) return;
        const w = s.walkthrough?.problemId === s.problemId ? s.walkthrough : null;
        if (!w) {
          pending.current = null;
          setNote('The walkthrough was closed before the moment could be shown.');
          return;
        }
        const r = s.run;
        if (r.status === 'running' || r.codeAtRun !== w.code || r.problemId !== exercise.id) return;
        pending.current = null;
        if (r.status !== 'done' || !r.result || r.result.status !== 'finished') {
          setNote(
            `The authored answer didn’t finish on this example, so the moment can’t be shown: ${r.message ?? r.result?.error?.message ?? 'unknown error'}`,
          );
          return;
        }
        const steps = r.result.steps;
        const at = findMoments(steps, w.code, w.language, guide.example.moments)[moment];
        if (at === null || at === undefined) {
          setNote(`This moment wasn’t found in the run. Pick ${caseLabel(guide.example.case)} again to reset its inputs, then retry.`);
          return;
        }
        s.setPlaying(false);
        s.setStep(at);
        setNote(
          `Step ${at + 1} of ${steps.length} of the authored answer is on the board: ${say(guide.example.moments[moment].say, language)}${narrow ? ' Open the Visual tab to see it.' : ''}`,
        );
      }),
    [exercise.id, guide, language, narrow],
  );

  return { runMine, showMoment, note };
}

type Board = ReturnType<typeof useBoard>;

function StatusNote({ note, tone = 'violet' }: { note: string | null; tone?: 'violet' | 'amber' }) {
  const box = tone === 'violet' ? 'bg-violet-400/10 text-violet-100' : 'bg-amber-300/10 text-amber-100';
  return (
    <p role="status" className={note ? `rounded-lg px-3 py-1.5 text-[12.5px] leading-snug ${box}` : 'sr-only'}>
      {note ?? ''}
    </p>
  );
}

/** One of the ten sections: “You could say…”, “Why this matters”, and what it links to. */
function Section({
  number,
  id,
  passage,
  headingRef,
  children,
}: {
  number: number;
  id: SectionId;
  passage: Passage;
  headingRef?: (el: HTMLHeadingElement | null) => void;
  children?: ReactNode;
}) {
  const t = useWords();
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-navy-700 bg-navy-850 px-3 py-2.5">
      <h5 ref={headingRef} tabIndex={-1} className="text-[14px] font-semibold text-navy-100">
        {number}. {title}
      </h5>
      <p className="text-[12px] font-semibold text-teal-200">You could say…</p>
      <blockquote className="flex flex-col gap-1.5 border-l-2 border-teal-400/60 pl-2.5 text-[13.5px] leading-snug text-navy-100">
        {passage.say.map((p, i) => (
          <p key={i}>“{t(p)}”</p>
        ))}
      </blockquote>
      <p className="text-[13px] leading-snug text-navy-200">
        <strong className="text-navy-100">Why this matters:</strong> {t(passage.why)}
      </p>
      {children}
    </li>
  );
}

/** Reference lines a passage is about, with their line numbers in the answer for the learner's language. */
function ReferenceLines({ passage, code }: { passage: Passage; code: string }) {
  const language = useLanguage();
  if (!passage.code?.length) return null;
  return (
    <div className="text-[12.5px] leading-snug text-navy-300">
      <p>In the authored answer:</p>
      <ul className="mt-1 flex flex-col gap-1">
        {passage.code.map((c, i) => (
          <li key={i}>
            line {lineOf(code, codeIn(c, language))}: <Code>{codeIn(c, language)}</Code>
          </li>
        ))}
      </ul>
    </div>
  );
}

const APPROACH_SECTIONS: Exclude<SectionId, 'understand' | 'clarify' | 'example'>[] = [
  'baseline',
  'improve',
  'approach',
  'narrate',
  'test',
  'complexity',
  'wrapUp',
];

/** The authored example approach, revealed one section at a time so it doesn't spoil the problem. */
function ExampleApproach({ guide, exercise, board }: { guide: InterviewGuide; exercise: Exercise; board: Board }) {
  const t = useWords();
  const language = useLanguage();
  const [shown, setShown] = useState(0);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const showFirst = useRef<HTMLButtonElement>(null);
  const focus = useRef<number | 'start' | null>(null);
  const reference = referenceVariant(guide);
  const answer = answerIn(exercise, language)!;
  useEffect(() => {
    // Revealing moves keyboard focus to the first new section; hiding them all returns it to the first button.
    const f = focus.current;
    focus.current = null;
    if (f === 'start') showFirst.current?.focus();
    else if (f !== null) headings.current[f]?.focus();
  }, [shown]);
  const reveal = (count: number) => {
    focus.current = shown;
    setShown(count);
  };
  const passages: Passage[] = [guide.understand, guide.clarify, guide.example, ...APPROACH_SECTIONS.map((id) => reference.sections[id])];
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2.5">
      <h4 id={`${id}-title`} className="text-[15px] font-semibold text-navy-100">
        Example approach
      </h4>
      <p className="rounded-lg bg-amber-300/10 px-3 py-1.5 text-[12.5px] leading-snug text-amber-100">
        Written for this exercise from its authored answer, {t(reference.name)}. It isn’t your code. Reveal one section at a time if you’d
        like to try each part yourself first.
      </p>
      {shown > 0 && (
        <ol className="flex flex-col gap-2">
          {passages.slice(0, shown).map((p, i) => {
            const sectionId = SECTIONS[i].id;
            return (
              <Section
                key={sectionId}
                number={i + 1}
                id={sectionId}
                passage={p}
                headingRef={(el) => {
                  headings.current[i] = el;
                }}
              >
                {sectionId === 'example' && <ExampleLinks guide={guide} exercise={exercise} board={board} />}
                {sectionId === 'test' &&
                  reference.sections.test.cases.map((c) => <CaseLine key={`${c.from}${c.index}`} exercise={exercise} refCase={c} />)}
                <ReferenceLines passage={p} code={answer.code} />
              </Section>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-1.5">
        {shown < SECTIONS.length && (
          <button ref={showFirst} type="button" className="btn-outline" onClick={() => reveal(shown + 1)}>
            Show section {shown + 1}: {SECTIONS[shown].title}
          </button>
        )}
        {shown < SECTIONS.length && (
          <button type="button" className="btn-quiet" onClick={() => reveal(SECTIONS.length)}>
            Show all ten sections
          </button>
        )}
        {shown > 0 && (
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              focus.current = 'start';
              setShown(0);
            }}
          >
            Hide the example approach
          </button>
        )}
      </div>
    </section>
  );
}

/** The example's board links: the learner's own run, and each moment of the authored answer's run. */
function ExampleLinks({ guide, exercise, board }: { guide: InterviewGuide; exercise: Exercise; board: Board }) {
  const t = useWords();
  const ref = guide.example.case;
  return (
    <div className="flex flex-col gap-1.5">
      <CaseLine exercise={exercise} refCase={ref} />
      <button type="button" className="btn-outline self-start" onClick={() => board.runMine(ref.index)}>
        Run my code on {caseLabel(ref)}
      </button>
      <p className="text-[12.5px] leading-snug text-navy-300">
        Each moment below comes from the authored answer’s run on {caseLabel(ref)}. “Show on the board” plays that answer, not your code,
        and stops at the step where it happens.
      </p>
      <ol className="flex flex-col gap-1.5">
        {guide.example.moments.map((m, i) => (
          <li key={i} className="flex flex-col gap-1 rounded-lg bg-navy-900 px-3 py-2 text-[13px] leading-snug text-navy-200">
            <span>
              <span className="mr-1 font-semibold text-navy-100">{i + 1}.</span>
              {t(m.say)}
            </span>
            <button
              type="button"
              className="btn-outline h-7 self-start"
              onClick={() => board.showMoment(i)}
              aria-label={`Show moment ${i + 1} on the board`}
            >
              Show on the board
            </button>
          </li>
        ))}
      </ol>
      <StatusNote note={board.note} />
    </div>
  );
}

const GROWTH_WORDS: Record<Growth, string> = {
  constant: 'stayed the same',
  log: 'grew by about the same amount each time n was multiplied (logarithmic)',
  linear: 'grew in proportion to n (linear)',
  quadratic: 'grew with the square of n (quadratic)',
};

/** What the runs showed, each line backed by a measurement. */
function Evidence({ guide, exercise, o }: { guide: InterviewGuide; exercise: Exercise; o: Observation }) {
  const revealLine = useStore((s) => s.revealLine);
  const narrow = useMedia(NARROW);
  const passed = o.results.filter((r) => r.status === 'passed').length;
  const p = guide.probe;
  const sizes = p.sizes.join(', ');
  const measured = o.probes.every((x) => x.features);
  const lists = exercise.content!.params.some((x) => x.kind === 'list');
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-snug text-navy-200 marker:text-navy-300">
      <li>
        Passed {passed} of {o.results.length} examples and tests.
      </li>
      {measured ? (
        <>
          <li>
            Steps for {sizes} {p.unit}: {o.probes.map((x) => x.features!.steps).join(', ')}. They{' '}
            {o.time ? GROWTH_WORDS[o.time] : 'grew in a way this guide doesn’t classify'}.
          </li>
          <li>
            Most values held at once besides the inputs, counting nested calls: {o.probes.map((x) => x.features!.extra).join(', ')}. That{' '}
            {o.space ? GROWTH_WORDS[o.space] : 'grew in a way this guide doesn’t classify'}.
          </li>
        </>
      ) : (
        o.probes
          .filter((x) => !x.features)
          .map((x) => (
            <li key={x.n}>
              The run on {x.n} {p.unit} didn’t finish: {x.message}
            </li>
          ))
      )}
      <li>{o.lookupTable ? 'It kept a lookup table (values stored by key).' : 'It kept no lookup table.'}</li>
      <li>
        {o.depth > 1 ? `It called a function inside itself, up to ${o.depth} calls deep.` : 'It made no nested calls of the same function.'}
      </li>
      {lists && <li>{o.createdNodes > 0 ? `It created ${o.createdNodes} new nodes.` : 'It created no new nodes.'}</li>}
      {lists && o.nodeArray && <li>It stored every node of the list at once.</li>}
      {o.inputChanged && <li>It changed an input array.</li>}
      {o.hottest && (
        <li>
          The line it ran most often: line {o.hottest.line}, {o.hottest.hits} times for {o.hottest.n} {p.unit}.{' '}
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 font-semibold text-teal-200 hover:bg-navy-800"
            onClick={() => revealLine(o.hottest!.line)}
          >
            Show line {o.hottest.line} in the editor
          </button>
          {narrow && ' (on the Code tab)'}
        </li>
      )}
    </ul>
  );
}

function VariantSections({ variant }: { variant: Variant }) {
  return (
    <ol start={4} className="flex flex-col gap-2">
      {APPROACH_SECTIONS.map((id, i) => (
        <Section key={id} number={i + 4} id={id} passage={variant.sections[id]} />
      ))}
    </ol>
  );
}

function ExplainResult({ guide, exercise, o, v }: { guide: InterviewGuide; exercise: Exercise; o: Observation; v: Verdict }) {
  const t = useWords();
  return (
    <div className="flex flex-col gap-2.5">
      {v.kind === 'failing' && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-[13px] leading-snug text-amber-100">
          <p className="font-semibold">
            Your code doesn’t pass every test yet, so there’s no explanation to match. Here is what the runs showed:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {o.failures.map((f) => (
              <li key={f.result.label}>
                {f.result.label} ({f.result.note}): {inputsText(exercise, f.case.inputs)}. {f.result.message}
              </li>
            ))}
          </ul>
          <p>
            Fix those first: step through a failing case on the board to see where it goes wrong. The example approach above shows one way
            to solve it. When every test passes, explain your code again.
          </p>
        </div>
      )}
      {v.kind === 'unmet' && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-[13px] leading-snug text-amber-100">
          {v.requirements.map((r) => (
            <div key={r.check} className="flex flex-col gap-1">
              <p>{t(r.explain)}</p>
              <p>The rule: “{r.quote}”</p>
            </div>
          ))}
          <p>The example approach above shows a version that meets it.</p>
        </div>
      )}
      {v.kind === 'unmatched' && (
        <p className="rounded-lg bg-navy-850 px-3 py-2 text-[13px] leading-snug text-navy-200">
          Your code passes every test, but what its runs showed doesn’t match an approach this guide has wording for, so here is only what
          was observed. Use the ten sections of the example approach as an outline and describe your approach in your own words.
        </p>
      )}
      {v.kind === 'matched' && (
        <p className="rounded-lg bg-teal-400/10 px-3 py-2 text-[13px] leading-snug text-teal-100">
          Your code passes every test, and its runs match {t(v.variant.name)}: {v.variant.time} time and {v.variant.space} extra space. Here
          is wording for sections 4 to 10 that describes that approach; sections 1 to 3 don’t depend on your code, so use them from the
          example approach. Check each sentence against your own lines before you use it.
        </p>
      )}
      <div>
        <h5 className="text-[13px] font-semibold text-navy-100">What the runs showed</h5>
        <Evidence guide={guide} exercise={exercise} o={o} />
      </div>
      {v.kind === 'matched' && <VariantSections variant={v.variant} />}
    </div>
  );
}

type Analysis =
  | { status: 'running' }
  | { status: 'done'; code: string; o: Observation; v: Verdict }
  | { status: 'interrupted' }
  | { status: 'error'; message: string };

/** After the learner writes code: the explanation that matches what their runs actually did. */
function ExplainMine({ guide, exercise }: { guide: InterviewGuide; exercise: Exercise }) {
  const code = useStore((s) => currentWork(s).code);
  const language = useLanguage();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const current = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(
    () => () => {
      // Leaving the exercise cancels the analysis, so its results can't land later.
      if (current.current) {
        current.current.abort();
        cancelCheck();
      }
    },
    [],
  );
  const explain = async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setAnalysis({ status: 'running' });
    try {
      const o = await observeCode(exercise, guide, code, (req) => checkInWorker(req, language), controller.signal);
      if (controller.signal.aborted) return;
      current.current = null;
      setAnalysis(o ? { status: 'done', code, o, v: verdict(guide, o) } : { status: 'interrupted' });
    } catch (err) {
      if (controller.signal.aborted) return;
      current.current = null;
      setAnalysis({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };
  const note =
    analysis?.status === 'running'
      ? 'Running your code on every test and on three larger inputs…'
      : analysis?.status === 'interrupted'
        ? 'Another check started on the same worker, so this one stopped. Press Explain my code again.'
        : analysis?.status === 'error'
          ? `The analysis failed: ${analysis.message}`
          : null;
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2.5">
      <h4 id={`${id}-title`} className="text-[15px] font-semibold text-navy-100">
        Explain your own code
      </h4>
      <p className="text-[13px] leading-snug text-navy-200">
        Once you have a solution, this runs it on every example and test, and on three larger inputs to see how its steps and memory grow.
        Then it picks the wording that matches what your code actually did, or says what it observed when nothing matches. It goes by what
        the runs show, not by reading your code, and nothing leaves your browser.
      </p>
      <button type="button" className="btn-primary self-start" disabled={analysis?.status === 'running'} onClick={() => void explain()}>
        {analysis?.status === 'running' ? 'Checking your code…' : 'Explain my code'}
      </button>
      <StatusNote note={note} tone={analysis?.status === 'running' ? 'violet' : 'amber'} />
      {analysis?.status === 'done' && (
        <>
          {analysis.code !== code && (
            <p className="text-[12.5px] text-amber-200">You edited the code after this. Explain it again to match the new version.</p>
          )}
          <ExplainResult guide={guide} exercise={exercise} o={analysis.o} v={analysis.v} />
        </>
      )}
    </section>
  );
}

/** Exercises with a guide, for the planned state's links. */
const WITH_GUIDES = FOUNDATIONS.filter((e) => GUIDES[e.id]);

/**
 * "How to Explain This in an Interview": an optional, text-only guide to explaining a practice
 * exercise, opened by the learner beside the coding workspace. Only exercises with a guide get one;
 * every other exercise says its guide is planned.
 */
export function InterviewCoach({ exercise }: { exercise: Exercise }) {
  const guide = guideFor(exercise.id);
  const selectProblem = useStore((s) => s.selectProblem);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!guide) {
    return (
      <section aria-labelledby={`${id}-title`} className="flex flex-col gap-1.5">
        <h3 id={`${id}-title`} className="section-title">
          {GUIDE_TITLE}
        </h3>
        <p className="text-[13px] leading-snug text-navy-200">
          <strong className="text-navy-100">Guide: planned.</strong> The guide for this exercise hasn’t been written and checked yet, so
          there’s nothing here for now.
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-navy-300">
          <span>Exercises with a guide:</span>
          {WITH_GUIDES.map((e) => (
            <button
              key={e.id}
              type="button"
              className="rounded-md px-1.5 py-0.5 text-teal-200 hover:bg-navy-800"
              onClick={() => selectProblem(e.id)}
            >
              {e.number}. {e.title}
            </button>
          ))}
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2.5">
      <h3 id={`${id}-title`} className="section-title">
        {GUIDE_TITLE}
      </h3>
      <p className="text-[13.5px] leading-snug text-navy-200">{GUIDE_INTRO}</p>
      <button
        type="button"
        className={open ? 'btn-quiet self-start' : 'btn-primary self-start'}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close the guide' : 'Open the guide'}
      </button>
      {/* Kept mounted while closed, so closing and reopening keeps what was revealed and explained. */}
      <div id={`${id}-body`} hidden={!open} className="flex flex-col gap-4">
        <GuideBody guide={guide} exercise={exercise} />
      </div>
    </section>
  );
}

function GuideBody({ guide, exercise }: { guide: InterviewGuide; exercise: Exercise }) {
  const board = useBoard(exercise, guide);
  return (
    <>
      <ExampleApproach guide={guide} exercise={exercise} board={board} />
      <ExplainMine guide={guide} exercise={exercise} />
    </>
  );
}
