// The practice collections, in the order the Practice browser shows them. Exercise ids are
// unique across collections (f75-01, i100-001), so any exercise can be found by id alone.
import { COLLECTION_TITLE, FOUNDATIONS } from './foundations';
import { INTERVIEW, INTERVIEW_TITLE } from './interview';
import type { Exercise } from './schema';

export interface Collection {
  id: 'foundations-75' | 'interview-100';
  title: string;
  /** Used as the exercise's first tag, e.g. "Interview 100". */
  short: string;
  /** What the collection is, in one sentence. */
  blurb: string;
  exercises: Exercise[];
  /** How the Practice browser groups the list. */
  groupBy: 'topic' | 'difficulty';
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'foundations-75',
    title: COLLECTION_TITLE,
    short: 'Foundations 75',
    blurb: 'An original practice set written for Drawgorithms, in curriculum order.',
    exercises: FOUNDATIONS,
    groupBy: 'topic',
  },
  {
    id: 'interview-100',
    title: INTERVIEW_TITLE,
    short: 'Interview 100',
    // docs/INTERVIEW-100.md lists the source of every exercise and when the lists were read.
    blurb:
      'Original stories with the structure of problems from widely used interview-prep lists (NeetCode 150, LeetCode’s Top Interview 150 and the Tech Interview Handbook), sorted by difficulty. These are popular study lists, not data on how often interviews ask each one. Drawgorithms is not affiliated with or endorsed by any of them.',
    exercises: INTERVIEW,
    groupBy: 'difficulty',
  },
];

export const ALL_EXERCISES: Exercise[] = COLLECTIONS.flatMap((c) => c.exercises);

export function findExercise(id: string): Exercise | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}

export function collectionOf(id: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.exercises.some((e) => e.id === id));
}
