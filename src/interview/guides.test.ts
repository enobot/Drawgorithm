// "How to Explain This in an Interview" guides: a guide exists only when it is complete and
// agrees with its exercise. Every section follows its sentence pattern with every blank filled,
// acknowledged rules are the exercise's own words, cases are the exercise's cases, the example
// approach's complexity is the reference answer's, its code links point at lines the reference
// really has, and its moments are steps the reference really takes. Which explanation a
// learner's code gets is checked in observe.test.ts; python.test.ts checks the Python side.
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, runProgram } from '../engine/run';
import { FOUNDATIONS } from '../practice/foundations';
import { PYTHON_ANSWERS } from '../practice/python';
import type { Exercise, ExerciseCase } from '../practice/schema';
import type { RunResult } from '../trace/types';
import { GUIDES, guideFor, referenceVariant } from './guides';
import { findMoments, lineOf } from './moments';
import { SECTIONS } from './parts';
import { say, type CaseRef, type InterviewGuide, type Passage, type SectionId } from './schema';

const WITH_GUIDES = ['f75-04', 'f75-17', 'f75-26'];
const exercise = (id: string) => FOUNDATIONS.find((e) => e.id === id)!;
const caseOf = (e: Exercise, ref: CaseRef) => e.content![ref.from][ref.index];

function run(e: Exercise, code: string, c: Pick<ExerciseCase, 'inputs'>): RunResult {
  const content = e.content!;
  return runProgram({
    code,
    mode: 'function',
    entry: content.entry,
    inputs: content.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: content.resultKind,
  });
}

/** Every passage of a guide with its section: the shared three, then each variant's seven. */
function passages(g: InterviewGuide): [string, SectionId, Passage][] {
  const shared: [string, SectionId, Passage][] = [
    ['shared', 'understand', g.understand],
    ['shared', 'clarify', g.clarify],
    ['shared', 'example', g.example],
  ];
  const own = g.variants.flatMap((v) =>
    (Object.entries(v.sections) as [SectionId, Passage][]).map(([id, p]) => [v.id, id, p] as [string, SectionId, Passage]),
  );
  return [...shared, ...own];
}

/** Both languages' wording of a passage's "You could say…" paragraphs. */
const spoken = (p: Passage) => p.say.flatMap((w) => (typeof w === 'string' ? [w] : [w.javascript, w.python]));

/** Tracy's sentence pattern for each section: the parts every "You could say…" has to contain. */
const PATTERN: Record<SectionId, RegExp[]> = {
  understand: [/^Let me make sure I understand\. We’re given /, /we need to return/],
  clarify: [/^I see that /, /\?/],
  example: [/I’d expect /, / because /],
  baseline: [/^The straightforward approach/, /It works because /, / time because | space because /],
  improve: [/^The repeated work here is /, /[Ww]e could avoid that by /],
  approach: [/^I’ll use /, /keep(?:s|ing)? track of /, /As I process each /, /The important property /],
  narrate: [/^I’m /, / before /, /because otherwise /],
  test: [/^Let me check a typical case first/],
  complexity: [/^We process /, /That gives us /, /\btime\b/, /additional space/],
  wrapUp: [/^This satisfies /, / under /, /One tradeoff is /],
};

// Fields that hold code, cases or data rather than words for the learner.
const NOT_WORDS = new Set([
  'exerciseId',
  'id',
  'line',
  'code',
  'case',
  'cases',
  'vars',
  'match',
  'quote',
  'check',
  'acknowledged',
  'time',
  'space',
  'probe',
  'reference',
]);

/** Every piece of learner-facing text in a guide: plain strings, and { javascript, python } pairs. */
function wordsIn(value: unknown, path = ''): { path: string; words: string | { javascript: string; python: string } }[] {
  if (typeof value === 'string') return [{ path, words: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => wordsIn(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 2 && keys.includes('javascript') && keys.includes('python')) {
      return [{ path, words: value as { javascript: string; python: string } }];
    }
    return Object.entries(value)
      .filter(([k]) => !NOT_WORDS.has(k))
      .flatMap(([k, v]) => wordsIn(v, path ? `${path}.${k}` : k));
  }
  return [];
}

// Code that only one of the two languages has. Learner text read in the other language must not name it.
const PYTHON_ONLY = /\bNone\b|\bdict\b|popleft|\blen\(|\.append\(|\bnxt\b|\bTrue\b|\bFalse\b|\belif\b|\/\/|\bdeque\b/;
const JAVASCRIPT_ONLY = /===|!==|\.length\b|Math\.floor|new Map|\.push\(|\.shift\(\)|\.has\(|\bMap\b|\bnull\b|\bBigInt\b/;

describe('guide catalog', () => {
  it('has complete guides for exactly Pair Sum, linked-list reversal and binary search', () => {
    expect(Object.keys(GUIDES).sort()).toEqual(WITH_GUIDES);
    expect(WITH_GUIDES.map((id) => exercise(id).title)).toEqual(['Balanced Shipment', 'Turn the Chain', 'Find the Reading']);
  });

  it('every other exercise has no guide (it shows as planned)', () => {
    const others = FOUNDATIONS.filter((e) => !WITH_GUIDES.includes(e.id));
    expect(others).toHaveLength(72);
    for (const e of others) expect(guideFor(e.id), e.id).toBeUndefined();
  });

  it('has ten sections, in Tracy’s order', () => {
    expect(SECTIONS.map((s) => s.title)).toEqual([
      'Understanding the problem',
      'Clarifying requirements',
      'Walking through an example',
      'Describing a baseline',
      'Finding an improvement',
      'Explaining the chosen approach',
      'Narrating key code decisions',
      'Testing the solution',
      'Explaining complexity',
      'Wrapping up',
    ]);
  });
});

describe.each(WITH_GUIDES.map((id) => [id, GUIDES[id]] as const))('%s guide', (id, g) => {
  const e = exercise(id);
  const c = e.content!;
  const js = c.solution.code;
  const py = PYTHON_ANSWERS[id];
  const exerciseText = [...c.statement, c.inputFormat, c.outputFormat, ...c.constraints, ...c.rules].join('\n');
  const reference = referenceVariant(g);

  it('fills every section with first-person wording that follows its pattern, and a “Why this matters” note', () => {
    for (const [where, section, p] of passages(g)) {
      expect(p.say.length, `${where} ${section}`).toBeGreaterThan(0);
      const texts = spoken(p);
      const joined = texts.join(' ');
      for (const t of texts) expect(t, `${where} ${section}: no blanks left`).not.toMatch(/_{2,}|\bTODO\b|\[\s*\]\s*\?/);
      // Each language's wording has to follow the pattern on its own.
      for (const language of ['javascript', 'python'] as const) {
        const text = p.say.map((w) => say(w, language)).join(' ');
        for (const re of PATTERN[section]) expect(text, `${where} ${section} (${language}) ${re}`).toMatch(re);
      }
      // Tracy's baseline and wrap-up patterns ("The straightforward approach would be…", "This satisfies…") have no pronoun of their own.
      if (section !== 'baseline' && section !== 'wrapUp')
        expect(joined, `${where} ${section} is first person`).toMatch(/\b(I|I’m|I’d|I’ll|we|We|Let me)\b/);
      expect(typeof p.why === 'string' ? p.why : p.why.javascript, `${where} ${section} why`).toMatch(/\S.{20,}/);
    }
  });

  it('has one reference variant (the example approach) and variants that can’t match the same run', () => {
    expect(g.variants.filter((v) => v.reference)).toHaveLength(1);
    expect(new Set(g.variants.map((v) => v.id)).size).toBe(g.variants.length);
    const signatures = g.variants.map((v) => JSON.stringify(v.match, Object.keys(v.match).sort()));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('acknowledges stated rules in the exercise’s own words', () => {
    expect(g.clarify.acknowledged.length).toBeGreaterThanOrEqual(3);
    for (const q of g.clarify.acknowledged) expect(exerciseText, q).toContain(q);
    for (const r of g.requirements) expect(exerciseText, r.quote).toContain(r.quote);
  });

  it('points only at the exercise’s real cases, and walks through an example', () => {
    const refs = [g.example.case, ...g.variants.flatMap((v) => v.sections.test.cases)];
    for (const ref of refs) expect(caseOf(e, ref)?.note, `${ref.from}[${ref.index}]`).toBe(ref.note);
    expect(g.example.case.from).toBe('examples');
  });

  it('states the complexity of the reference answer that runs, and every variant’s wording states its own bounds', () => {
    expect(reference.time).toBe(c.solution.complexity.time);
    expect(reference.space).toBe(c.solution.complexity.space);
    for (const v of g.variants) {
      const said = spoken(v.sections.complexity).join(' ');
      expect(said, v.id).toContain(`${v.time} time`);
      expect(said, v.id).toContain(`${v.space} additional space`);
    }
  });

  it('links passages to lines the reference answer really has, in both languages', () => {
    const links = [g.understand, g.clarify, g.example, ...Object.values(reference.sections)].flatMap((p) => p.code ?? []);
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const l of links) {
      expect(lineOf(js, l.javascript), l.javascript).toBeGreaterThan(0);
      expect(lineOf(py, l.python), l.python).toBeGreaterThan(0);
    }
    // Only the example approach links to the reference; other variants describe the learner's code.
    for (const v of g.variants.filter((x) => !x.reference)) for (const p of Object.values(v.sections)) expect(p.code, v.id).toBeUndefined();
  });

  it('words code names for the language the learner reads', () => {
    for (const { path, words } of wordsIn(g)) {
      if (typeof words === 'string') {
        expect(words.trim(), path).not.toBe('');
        expect(words, `${path} names Python-only code; give it a { javascript, python } pair`).not.toMatch(PYTHON_ONLY);
        expect(words, `${path} names JavaScript-only code; give it a { javascript, python } pair`).not.toMatch(JAVASCRIPT_ONLY);
      } else {
        expect(words.javascript, `${path}: a pair with the same words should be one string`).not.toBe(words.python);
        expect(words.javascript, `${path}.javascript`).not.toMatch(PYTHON_ONLY);
        expect(words.python, `${path}.python`).not.toMatch(JAVASCRIPT_ONLY);
      }
    }
  });

  it('finds every moment, in order, in the reference run on its example', () => {
    const r = run(e, js, caseOf(e, g.example.case));
    expect(r.status, r.error?.message).toBe('finished');
    const at = findMoments(r.steps, js, 'javascript', g.example.moments);
    expect(at.every((i) => i !== null)).toBe(true);
    for (let i = 1; i < at.length; i++) expect(at[i]!).toBeGreaterThan(at[i - 1]!);
  });
});

describe('moments', () => {
  const e = exercise('f75-04');
  const js = e.content!.solution.code;
  const r = run(e, js, e.content!.examples[0]);

  it('reports a moment that never happens, and every one after it, as not found', () => {
    const [m0, m1] = GUIDES['f75-04'].example.moments;
    const never = { ...m1, vars: { j: 99 } };
    expect(findMoments(r.steps, js, 'javascript', [m0, never, m1])).toEqual([expect.any(Number), null, null]);
  });

  it('searches in order: a moment listed before an earlier one is not found', () => {
    const [m0, m1] = GUIDES['f75-04'].example.moments;
    expect(findMoments(r.steps, js, 'javascript', [m1, m0])).toEqual([expect.any(Number), null]);
  });
});

describe('figures the wording states', () => {
  it('pair sum: nested loops make n(n−1)/2 checks, almost 50 million for 10,000 packages', () => {
    const e = exercise('f75-04');
    const nested = `function balancedPair(weights, target) {
  for (let j = 0; j < weights.length; j++) {
    for (let i = 0; i < j; i++) {
      if (weights[i] + weights[j] === target) return [i, j];
    }
  }
  return [];
}
`;
    const n = 20;
    const r = runProgram({
      code: nested,
      mode: 'function',
      entry: 'balancedPair',
      inputs: [
        { name: 'weights', value: Array.from({ length: n }, (_, k) => k + 1), kind: 'auto' },
        { name: 'target', value: -1, kind: 'auto' },
      ],
      limits: { maxSteps: 20_000 },
    });
    const line = lineOf(nested, 'if (weights[i] + weights[j] === target)');
    expect(r.steps.filter((s) => s.loc?.line === line).length).toBe((n * (n - 1)) / 2);
    expect(e.content!.constraints[0]).toContain('10,000');
    expect((10_000 * 9_999) / 2).toBe(49_995_000);
  });

  it('binary search: at most ⌊log₂ n⌋ + 1 passes, 17 for 100,000 readings', () => {
    const e = exercise('f75-26');
    const js = e.content!.solution.code;
    for (const n of [1, 2, 7, 64, 1000]) {
      const readings = Array.from({ length: n }, (_, k) => 2 * k);
      for (const target of [-1, 1, 2 * n, readings[n - 1]]) {
        const r = run(e, js, { inputs: { readings, target } });
        const line = lineOf(js, 'const mid');
        expect(r.steps.filter((s) => s.loc?.line === line).length).toBeLessThanOrEqual(Math.floor(Math.log2(n)) + 1);
      }
    }
    expect(Math.floor(Math.log2(100_000)) + 1).toBe(17);
  });

  it('reversal: one link turned per node, nothing created; 5,000 nodes is past the 200-nested-call limit', () => {
    const e = exercise('f75-17');
    const js = e.content!.solution.code;
    const r = run(e, js, { inputs: { head: [9, 8, 7, 6, 5] } });
    expect(r.steps.filter((s) => s.loc?.line === lineOf(js, 'curr.next = prev;'))).toHaveLength(5);
    expect(r.steps.flatMap((s) => s.effects).filter((x) => x.type === 'create')).toEqual([]);
    expect(DEFAULT_LIMITS.maxDepth).toBe(200);
    expect(e.content!.constraints[0]).toContain('5,000');
  });
});
