import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collectionOf, COLLECTIONS, type Collection } from '../practice/collections';
import { TOPICS } from '../practice/foundations';
import type { Difficulty, Exercise } from '../practice/schema';
import { useStore } from '../state/store';
import { holdFocusInDialog } from './modal';

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Easy: 'text-teal-200 shadow-[inset_0_0_0_1px_rgb(94_234_212/0.45)]',
  Medium: 'text-amber-200 shadow-[inset_0_0_0_1px_rgb(252_211_77/0.45)]',
  Hard: 'text-rose-200 shadow-[inset_0_0_0_1px_rgb(251_113_133/0.45)]',
};

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

/** A collection's sections: by topic in curriculum order, or by difficulty. */
function sections(c: Collection): { key: string; title: string; list: Exercise[] }[] {
  if (c.groupBy === 'difficulty')
    return DIFFICULTIES.map((d) => ({ key: d, title: d, list: c.exercises.filter((e) => e.difficulty === d) }));
  return TOPICS.map((t) => ({ key: t.id, title: t.title, list: c.exercises.filter((e) => e.topic === t.id) })).filter((s) => s.list.length);
}

/**
 * The optional practice collections. Only exercises whose content, tests and drawings
 * are verified can be opened; the rest are listed as planned with their brief.
 */
export function PracticeBrowser({ onClose }: { onClose: () => void }) {
  const selectProblem = useStore((s) => s.selectProblem);
  const setMobilePane = useStore((s) => s.setMobilePane);
  const problemId = useStore((s) => s.problemId);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Opens on the collection of the exercise being worked on.
  const [collectionId, setCollectionId] = useState(() => collectionOf(problemId)?.id ?? COLLECTIONS[0].id);
  const collection = COLLECTIONS.find((c) => c.id === collectionId)!;
  const ready = collection.exercises.filter((e) => e.status === 'available').length;
  const total = collection.exercises.length;

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

  const open = (id: string) => {
    selectProblem(id);
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
        aria-labelledby="practice-title"
        onClick={(e) => e.stopPropagation()}
        className="panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden sm:max-h-[min(52rem,100%)]"
      >
        <header className="flex flex-col gap-3 border-b border-navy-700 px-5 py-4">
          <div className="flex items-start gap-3">
            <div role="group" aria-label="Practice collection" className="flex flex-wrap rounded-full bg-navy-950 p-0.5">
              {COLLECTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === collectionId}
                  onClick={() => setCollectionId(c.id)}
                  className={`rounded-full px-3.5 py-1 text-[13px] font-semibold transition-colors pointer-coarse:py-2.5 ${
                    c.id === collectionId ? 'bg-navy-700 text-navy-100' : 'text-navy-300 hover:text-navy-100'
                  }`}
                >
                  {c.short}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <button ref={closeRef} type="button" className="btn-quiet shrink-0" onClick={onClose}>
              Close
            </button>
          </div>
          <div>
            <h2 id="practice-title" className="text-[19px] font-bold text-navy-50">
              {collection.title}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-navy-300">
              {collection.blurb} {ready} of {total} exercises are ready: each has tested examples, hints, a reference solution with a
              walkthrough, and a drawing the board supports.
              {ready < total && " The rest are planned and can't be opened yet."}
            </p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {sections(collection).map(({ key, title, list }) => {
            const openable = list.filter((e) => e.status === 'available').length;
            return (
              <section key={key} className="mb-5">
                <h3 className="mb-2 flex items-baseline gap-2 text-[14px] font-semibold text-navy-100">
                  {title}
                  <span className="text-[12px] font-normal text-navy-400">
                    {openable ? `${openable} of ${list.length} ready` : `${list.length} planned`}
                  </span>
                </h3>
                <ul className="flex flex-col gap-1">
                  {list.map((e) => {
                    const available = e.status === 'available';
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          disabled={!available}
                          onClick={() => open(e.id)}
                          aria-current={problemId === e.id ? 'true' : undefined}
                          title={available ? e.brief : `Planned: ${e.brief}`}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors pointer-coarse:min-h-11 ${
                            available ? 'hover:bg-navy-800' : 'cursor-default opacity-60'
                          } ${problemId === e.id ? 'bg-navy-800' : ''}`}
                        >
                          <span className="w-7 shrink-0 text-right text-[12.5px] tabular-nums text-navy-400">{e.number}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-navy-100">{e.title}</span>
                            <span className="block truncate text-[12.5px] text-navy-400">{e.brief}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${DIFFICULTY_STYLE[e.difficulty]}`}
                          >
                            {e.difficulty}
                          </span>
                          <span
                            className={`w-16 shrink-0 text-right text-[12px] font-semibold ${available ? 'text-teal-200' : 'text-navy-500'}`}
                          >
                            {available ? 'Open' : 'Planned'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
