// Lessons as problems the editor can open: the authored demo is the starter code, so the
// drawing is always the code in the editor (the demo until the learner edits it).
import type { ProblemDef } from '../problems/catalog';
import { LESSONS } from '../practice/foundations';
import { LESSON_CONTENT, type Lesson } from './lessons';

export const lessonProblemId = (lessonId: string) => `lesson-${lessonId}`;
export const isLessonId = (problemId: string) => problemId.startsWith('lesson-');

export function lessonById(lessonId: string): Lesson | undefined {
  return LESSON_CONTENT.find((l) => l.id === lessonId);
}

/** The lesson a problem id opens, if it is a lesson. */
export function lessonForProblem(problemId: string): Lesson | undefined {
  return isLessonId(problemId) ? lessonById(problemId.slice('lesson-'.length)) : undefined;
}

export function lessonProblem(l: Lesson): ProblemDef {
  return {
    id: lessonProblemId(l.id),
    title: LESSONS[l.id] ?? l.id,
    tags: ['Lesson', l.level],
    description: l.idea,
    explanation: l.demoExplanation,
    mode: 'function',
    entry: l.demo.entry,
    params: l.demo.params,
    resultKind: l.demo.resultKind,
    cases: l.demo.cases.map((c) => ({ label: c.label, inputs: c.inputs, expected: { kind: 'return', value: c.output } })),
    starter: l.demo.code,
    tryThis: l.tryThis,
    view: l.demo.view,
  };
}

const LESSON_PROBLEMS = LESSON_CONTENT.map(lessonProblem);

export function lessonProblemById(problemId: string): ProblemDef | undefined {
  return LESSON_PROBLEMS.find((p) => p.id === problemId);
}
