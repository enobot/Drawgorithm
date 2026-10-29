// The Python lesson demos on real CPython (Pyodide, loaded from node_modules): every demo
// returns the stated output well inside the run limits and draws what its lesson says to
// watch, as the JavaScript demos do (lessons.test.ts).
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { installTracer, runPython } from '../engine/python/runPython';
import { problemById, type ProblemDef } from '../problems/catalog';
import { deepEqual } from '../problems/compare';
import { notesIn, pythonStarter, starterIn } from '../problems/starters';
import { resolveBindings } from '../viz/bindings';
import { readCallTree } from '../viz/structures';
import { LESSON_CONTENT, type Lesson, type LessonCase } from './lessons';
import { lessonProblemId } from './problems';
import { lessonNotes, PYTHON_DEMOS, PYTHON_NOTES } from './python';

let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide();
  installTracer(py);
}, 120_000);

function runCase(l: Lesson, c: LessonCase) {
  return runPython(py, {
    code: PYTHON_DEMOS[l.id],
    mode: 'function',
    entry: l.demo.entry,
    inputs: l.demo.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: l.demo.resultKind,
  });
}

describe('Python lesson demos', () => {
  it('has a Python demo for every lesson, and none for anything else', () => {
    expect(Object.keys(PYTHON_DEMOS).sort()).toEqual(LESSON_CONTENT.map((l) => l.id).sort());
  });

  it('rewords only notes that exist, keeping how many there are', () => {
    for (const [id, notes] of Object.entries(PYTHON_NOTES)) {
      const l = LESSON_CONTENT.find((x) => x.id === id);
      expect(l, id).toBeTruthy();
      if (notes.idea) expect(notes.idea.length, id).toBe(l!.idea.length);
      if (notes.watch) expect(notes.watch.length, id).toBe(l!.watch.length);
      if (notes.tryThis) expect(notes.tryThis.length, id).toBe(l!.tryThis.length);
    }
  });

  it('opens a lesson with its demo and notes in the chosen language', () => {
    const l = LESSON_CONTENT.find((x) => x.id === 'loops-and-indexes')!;
    const p = problemById(lessonProblemId(l.id))!;
    expect(starterIn(p, 'python')).toBe(PYTHON_DEMOS[l.id]);
    expect(starterIn(p, 'javascript')).toBe(l.demo.code);
    expect(notesIn(p, 'python').tryThis).toEqual(lessonNotes(l, 'python').tryThis);
    expect(notesIn(p, 'python').tryThis).not.toEqual(l.tryThis);
    expect(notesIn(p, 'javascript')).toEqual({ description: l.idea, explanation: l.demoExplanation, tryThis: l.tryThis });
    expect(lessonNotes(l, 'javascript')).toEqual({ idea: l.idea, demoExplanation: l.demoExplanation, watch: l.watch, tryThis: l.tryThis });
    // A generated stub has no notes to show; the description is the problem's own. Every built-in
    // example now has a Python version, so this uses one without it (as exercises and pasted problems are).
    const plain: ProblemDef = { ...problemById('tree-build')!, python: undefined };
    expect(starterIn(plain, 'python')).toBe(pythonStarter(plain));
    expect(notesIn(plain, 'python')).toEqual({ description: plain.description, explanation: '', tryThis: [] });
  });

  it('writes a stub Python can run when an input is named like a reserved word', () => {
    const l = LESSON_CONTENT.find((x) => x.id === 'shortest-paths')!;
    const stub = pythonStarter(problemById(lessonProblemId(l.id))!);
    expect(stub.split('\n')[0]).toBe('def cheapest(n, roads, from_):');
    const c = l.demo.cases[0];
    const run = runPython(py, {
      code: stub,
      mode: 'function',
      entry: l.demo.entry,
      inputs: l.demo.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    });
    expect(run.status, run.error?.message).toBe('finished');
    expect(run.notes).toEqual([]);
  });
});

describe.each(LESSON_CONTENT.map((l) => [l.id, l] as const))('lesson %s in Python', (_id, l) => {
  it('returns the stated output on every case, well inside the run limits', () => {
    for (const c of l.demo.cases) {
      const run = runCase(l, c);
      expect(run.status, `${c.label}: ${run.error?.message}`).toBe('finished');
      expect(deepEqual(run.plainResult, c.output), `${c.label}: got ${JSON.stringify(run.plainResult)}`).toBe(true);
      expect(run.steps.length, c.label).toBeLessThan(1500);
      // Inputs reach the parameters by name (no "passed in order" note).
      expect(run.notes ?? [], c.label).toEqual([]);
    }
  });

  it('draws what the lesson says to watch', () => {
    const run = runCase(l, l.demo.cases[0]);
    const r = l.demo.renderers;
    if (r.includes('call-tree')) expect(readCallTree(run.steps).branching).toBe(true);
    if (r.includes('bits')) expect(run.hints.usage?.bits.length).toBeGreaterThan(0);
    const roles = new Set(run.steps.flatMap((s) => [...resolveBindings(s.heap, s.frames, run.hints).roles.values()].map((b) => b.role)));
    if (r.includes('heap-tree')) expect(roles.has('heap')).toBe(true);
    if (r.includes('graph')) expect(roles.has('graph')).toBe(true);
    if (r.includes('union-find')) expect(roles.has('union-find')).toBe(true);
    if (r.includes('trie')) expect(roles.has('trie')).toBe(true);
  });
});
