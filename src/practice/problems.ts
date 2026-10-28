// Available practice exercises as problems the editor can open. Only the learner-
// visible examples become selectable cases; the additional tests stay with the
// exercise and are run by "Check all tests".
import type { ProblemDef } from '../problems/catalog';
import { FOUNDATIONS, TOPICS } from './foundations';
import type { Exercise } from './schema';

export function practiceProblem(e: Exercise): ProblemDef | undefined {
  if (e.status !== 'available' || !e.content) return undefined;
  const c = e.content;
  return {
    id: e.id,
    title: `${e.number}. ${e.title}`,
    tags: ['Foundations 75', TOPICS.find((t) => t.id === e.topic)?.title ?? e.topic, e.difficulty],
    description: c.statement,
    // The starter is only a stub, so there is no "how the starter code works" note.
    explanation: '',
    mode: 'function',
    entry: c.entry,
    params: c.params,
    resultKind: c.resultKind,
    cases: c.examples.map((x, i) => ({ label: `Example ${i + 1}`, inputs: x.inputs, expected: { kind: 'return', value: x.output } })),
    starter: c.starter.javascript,
    tryThis: [],
    view: c.view,
  };
}

const PRACTICE_PROBLEMS = FOUNDATIONS.map(practiceProblem).filter((p): p is ProblemDef => !!p);

export function practiceProblemById(id: string): ProblemDef | undefined {
  return PRACTICE_PROBLEMS.find((p) => p.id === id);
}

export const isPracticeId = (id: string) => /^f75-\d{2}$/.test(id);
