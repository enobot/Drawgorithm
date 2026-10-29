import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LESSON_CONTENT, LESSON_LEVELS } from '../learn/lessons';
import { lessonProblemId } from '../learn/problems';
import { LESSONS } from '../practice/foundations';
import { useStore } from '../state/store';
import { holdFocusInDialog } from './modal';

/** The concept lessons, from the basics to the advanced patterns. */
export function LessonBrowser({ onClose }: { onClose: () => void }) {
  const selectProblem = useStore((s) => s.selectProblem);
  const setMobilePane = useStore((s) => s.setMobilePane);
  const problemId = useStore((s) => s.problemId);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus stays in the list while it is open, and goes back to the button that opened it.
    const release = holdFocusInDialog();
    closeRef.current?.focus();
    return release;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = (lessonId: string) => {
    selectProblem(lessonProblemId(lessonId));
    setMobilePane('problem');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lessons-title"
        onClick={(e) => e.stopPropagation()}
        className="panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden sm:max-h-[min(52rem,100%)]"
      >
        <header className="flex items-start gap-3 border-b border-navy-700 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="lessons-title" className="text-[19px] font-bold text-navy-50">
              Lessons
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-navy-300">
              Each lesson explains one idea and opens a short demo that runs on the board, step by step. The demos are original problems
              with the same structure as classic interview questions, and each lesson links to exercises that practice it.
            </p>
          </div>
          <button ref={closeRef} type="button" className="btn-quiet shrink-0" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {LESSON_LEVELS.map(({ level, blurb }) => (
            <section key={level} className="mb-5">
              <h3 className="mb-2 flex items-baseline gap-2 text-[14px] font-semibold text-navy-100">
                {level}
                <span className="text-[12px] font-normal text-navy-400">{blurb}</span>
              </h3>
              <ul className="flex flex-col gap-1">
                {LESSON_CONTENT.filter((l) => l.level === level).map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => open(l.id)}
                      aria-current={problemId === lessonProblemId(l.id) ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-navy-800 pointer-coarse:min-h-11 ${
                        problemId === lessonProblemId(l.id) ? 'bg-navy-800' : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-navy-100">{LESSONS[l.id]}</span>
                        <span className="block truncate text-[12.5px] text-navy-400" title={l.idea[0]}>
                          {l.idea[0]}
                        </span>
                      </span>
                      <span className="w-12 shrink-0 text-right text-[12px] font-semibold text-teal-200">Open</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
