// The shape of a "How to Explain This in an Interview" guide: what a learner could say about
// one practice exercise, in what order, and why. A guide exists only once it is written for
// its exercise and guides.test.ts checks it against that exercise's statement, cases and
// reference answers (python.test.ts runs the Python side on real CPython). Every other
// exercise's guide is "planned" and shows no guide content.
import type { LanguageId } from '../languages';

/** Text for the learner. A pair gives each language its own wording where code names differ (Map and dict, null and None). */
export type Words = string | { javascript: string; python: string };

/** A fragment of the reference answer in each language; guides.test.ts checks it appears there. */
export interface CodeText {
  javascript: string;
  python: string;
}

/**
 * One of the exercise's examples or additional tests, by position. `note` repeats that case's
 * own note, so a reordered case list fails the guide's tests instead of pointing at the wrong case.
 */
export interface CaseRef {
  from: 'examples' | 'tests';
  index: number;
  note: string;
}

/** The ten sections, in the order an explanation usually goes. */
export type SectionId =
  'understand' | 'clarify' | 'example' | 'baseline' | 'improve' | 'approach' | 'narrate' | 'test' | 'complexity' | 'wrapUp';

/** One section: wording the learner could adapt ("You could say…"), and why it matters. */
export interface Passage {
  /** First-person wording, one paragraph per entry. */
  say: Words[];
  /** "Why this matters": one or two sentences. */
  why: Words;
  /** Lines of the reference answer the passage is about (example approach only). */
  code?: CodeText[];
}

export interface ClarifyPassage extends Passage {
  /** Stated constraints the wording acknowledges instead of asking about, in the exercise's own words (checked). */
  acknowledged: string[];
}

/** A value of a variable in the running call: a plain value, an array of plain values, or { node: v } for a node whose val is v. */
export type MomentValue = number | string | boolean | null | (number | string)[] | { node: number };

/**
 * A moment of the reference run on the example: the first step, after the previous moment's,
 * that ran the line containing `line` while the running call's variables had these values.
 */
export interface Moment {
  say: Words;
  line: CodeText;
  vars: Record<string, MomentValue>;
}

export interface ExamplePassage extends Passage {
  /** An example (not a test), so the board can open it as a case. */
  case: CaseRef;
  moments: Moment[];
}

export interface TestPassage extends Passage {
  /** The cases the wording names, shown with their real inputs and outputs. */
  cases: CaseRef[];
}

/** Sections 4 to 10, which depend on the approach the code takes. */
export interface ApproachSections {
  baseline: Passage;
  improve: Passage;
  approach: Passage;
  narrate: Passage;
  test: TestPassage;
  complexity: Passage;
  wrapUp: Passage;
}

/** How a measured quantity grew as the input grew: steps (time), or values held at once plus nested calls (extra space). */
export type Growth = 'constant' | 'log' | 'linear' | 'quadratic';

/**
 * An approach the guide can explain, and what a run must show for the explanation to describe
 * the learner's code. Exactly one variant is the reference answer's approach (the example approach).
 */
export interface Variant {
  id: string;
  /** e.g. “a lookup table from weight to first position, in one pass” */
  name: Words;
  reference: boolean;
  match: {
    time: Growth;
    space: Growth;
    /** A Map, dict or plain object holds values by key. */
    lookupTable?: boolean;
    /** One function calls itself, nested. */
    recursion?: boolean;
    /** An array holds every node of the input list. */
    nodeArray?: boolean;
    /** On the guide's example, the lookup table never holds every item of the input (the scan stops as soon as it can). */
    onePass?: boolean;
    /** For recursion over a list: whether the links are turned before the nested calls (down) or after them (back). */
    turns?: 'down' | 'back';
  };
  /** The bounds the wording states. For the reference variant they equal the exercise's own solution.complexity. */
  time: string;
  space: string;
  sections: ApproachSections;
}

/** A stated rule that code can break while still returning the right values, checked from its runs. */
export interface Requirement {
  check: 'logarithmic-time' | 'reuse-nodes' | 'input-unchanged';
  /** The rule in the exercise's own words (checked). */
  quote: string;
  /** What to tell the learner when the runs show it broken. */
  explain: Words;
}

/** Larger inputs the learner's code also runs on, to measure how its steps and memory grow. */
export interface Probe {
  /** Three sizes, each `ratio` times the one before. */
  sizes: [number, number, number];
  ratio: number;
  /** Worst-case inputs of size n, by parameter name. */
  inputs: (n: number) => Record<string, unknown>;
  /** What n counts, e.g. “packages”. */
  unit: string;
}

export interface InterviewGuide {
  exerciseId: string;
  understand: Passage;
  clarify: ClarifyPassage;
  example: ExamplePassage;
  variants: Variant[];
  requirements: Requirement[];
  probe: Probe;
}

/** The wording for `language` (Python gets its own where code names differ; every other language reads the JavaScript wording). */
export function say(w: Words, language: LanguageId): string {
  if (typeof w === 'string') return w;
  return language === 'python' ? w.python : w.javascript;
}

/** The fragment of the reference answer in the answer's language. */
export function codeIn(c: CodeText, language: LanguageId): string {
  return language === 'python' ? c.python : c.javascript;
}
