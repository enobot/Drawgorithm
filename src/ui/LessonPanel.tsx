import { LESSON_CONTENT } from '../learn/lessons';
import { lessonForProblem, lessonProblemId } from '../learn/problems';
import { lessonNotes } from '../learn/python';
import { FOUNDATIONS, LESSONS } from '../practice/foundations';
import { currentWork, useStore, workLanguage } from '../state/store';

/** Everything a lesson adds to the problem panel: what to watch, where the idea is used, what to practice. */
export function LessonPanel({ problemId }: { problemId: string }) {
  const lesson = lessonForProblem(problemId);
  const selectProblem = useStore((s) => s.selectProblem);
  const language = useStore((s) => workLanguage(currentWork(s)));
  if (!lesson) return null;
  const watch = lessonNotes(lesson, language).watch;
  const practice = lesson.practice.map((id) => FOUNDATIONS.find((e) => e.id === id)!).filter(Boolean);
  const next = LESSON_CONTENT[LESSON_CONTENT.indexOf(lesson) + 1];
  return (
    <div key={lesson.id} className="flex flex-col gap-5">
      <p className="rounded-lg bg-teal-400/10 px-3 py-2 text-[12.5px] leading-snug text-teal-100">
        The demo in the editor is written for this lesson. Run it and step through; edit it to experiment, and the drawing follows your
        edits. Reset brings the demo back.
      </p>
      <section className="flex flex-col gap-1.5">
        <h3 className="section-title">What to watch</h3>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[13.5px] leading-snug text-navy-200 marker:text-navy-500">
          {watch.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ol>
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="section-title">Interview questions with this structure</h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13.5px] leading-snug text-navy-200 marker:text-navy-500">
          {lesson.usedFor.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-1.5 text-[13px] leading-snug text-navy-300">
        <h3 className="section-title">Practice it</h3>
        <p className="flex flex-wrap items-center gap-1.5">
          {practice.map((e) => (
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
        {next && (
          <p>
            <strong className="text-navy-200">Next lesson:</strong>{' '}
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-teal-200 hover:bg-navy-800"
              onClick={() => selectProblem(lessonProblemId(next.id))}
            >
              {LESSONS[next.id]}
            </button>
          </p>
        )}
      </section>
    </div>
  );
}
