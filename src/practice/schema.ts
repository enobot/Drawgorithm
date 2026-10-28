// The shape of a practice exercise. An exercise is only "available" when every
// authored part below exists AND its tests and visualization support are verified
// (see foundations.test.ts); until then it stays "planned" with just its brief.
import type { InputKind } from '../trace/types';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type TopicId =
  | 'arrays-hashing'
  | 'two-pointers'
  | 'sliding-window'
  | 'linked-lists'
  | 'stacks-queues'
  | 'binary-search'
  | 'trees'
  | 'recursion'
  | 'heaps'
  | 'graphs'
  | 'union-find'
  | 'dp'
  | 'greedy'
  | 'tries'
  | 'bits-matrices';

/**
 * Drawings an exercise needs. Only names listed in SUPPORTED_RENDERERS (foundations.ts)
 * may appear in an available exercise: they are drawn by the board today.
 */
export type Renderer =
  | 'array-cells'
  | 'array-shelves'
  | 'string-cells'
  | 'hash-set'
  | 'hash-map'
  | 'linked-list'
  | 'linked-list-ropes'
  | 'stack'
  | 'queue-line'
  | 'binary-tree'
  | 'call-stack'
  | 'grid'
  | 'heap-tree'
  | 'graph'
  | 'trie'
  | 'deque'
  | 'union-find'
  /** recursive calls as a tree (backtracking decision trees, repeated subproblems) */
  | 'call-tree'
  /** integers as rows of bits */
  | 'bits';

export interface ExerciseParam {
  name: string;
  kind: InputKind;
}

export interface ExerciseCase {
  /** Values for each parameter, in the input format the statement describes. */
  inputs: Record<string, unknown>;
  output: unknown;
  /** Why this case matters (shown with examples; used as the test's name). */
  note: string;
}

export interface Complexity {
  time: string;
  space: string;
  /** What the bounds assume (e.g. average O(1) hash operations). */
  assumptions: string;
}

/** Everything a learner sees for an available exercise. */
export interface ExerciseContent {
  statement: string[];
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  /** Explicit rules: empty input, duplicates, ties, ordering, mutation. */
  rules: string[];
  entry: string;
  params: ExerciseParam[];
  resultKind?: 'list' | 'tree';
  /** Shown to the learner. */
  examples: ExerciseCase[];
  /** Additional tests, run by "Check all tests" (not shown up front). */
  tests: ExerciseCase[];
  starter: { javascript: string };
  /** Revealed one at a time, from a nudge to the full idea. */
  hints: string[];
  /** Authored reference: a worked algorithm, never presented as the learner's code. */
  solution: { explanation: string[]; code: string; complexity: Complexity };
  visualization: { spec: string; renderers: Renderer[] };
  /** Board hints for this exercise, as in the built-in examples. */
  view?: { resultIndicesInto?: string; mapColumns?: [string, string] };
}

export interface Exercise {
  /** Stable id, e.g. "f75-01". */
  id: string;
  number: number;
  title: string;
  topic: TopicId;
  /** Editorial difficulty; reviewed as each exercise is authored. */
  difficulty: Difficulty;
  /** One-line brief of the task. */
  brief: string;
  /** What the drawing should show. */
  visual: string;
  status: 'available' | 'planned';
  /** Lesson ids a learner should know first (see LESSONS). */
  prerequisites: string[];
  /** Exercise ids that practice a related idea. */
  related: string[];
  /** Present exactly when status is "available". */
  content?: ExerciseContent;
}
