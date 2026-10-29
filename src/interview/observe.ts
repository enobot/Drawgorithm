// What the learner's code actually did, read from its runs: every example and test (the same
// runs as Check all tests) plus three larger inputs that measure how its steps and memory grow.
// Nothing here reads the code's text to guess an approach. Every observation comes from the
// recorded steps and results, and an explanation is offered only when those observations match
// one the guide has wording for.
import { checkExercise, type CaseResult } from '../practice/check';
import type { Exercise, ExerciseCase } from '../practice/schema';
import type { HeapSnap, RunRequest, RunResult, Step, ValueSnap } from '../trace/types';
import { EngineStopped } from '../worker/client';
import type { Growth, InterviewGuide, Requirement, Variant } from './schema';

const NODE_CLASSES = new Set(['ListNode', 'TreeNode']);

/** What one run showed. */
export interface RunFeatures {
  steps: number;
  /** Deepest nesting of one function: 1 means no recursion. */
  depth: number;
  /** Most values held at once in arrays, maps, sets and plain objects other than the inputs, plus nested calls beyond the first. */
  extra: number;
  /** A Map, dict or plain object other than the inputs held values by key. */
  lookupTable: boolean;
  /** Most entries such a table held at once. */
  tableMax: number;
  /** List or tree nodes the code created. */
  createdNodes: number;
  /** Longest array (other than the inputs) holding only nodes. */
  nodeArrayMax: number;
  /** For list inputs: at the first step of the deepest call, how many input nodes had a different next (null without nested calls or list nodes). */
  turnedAtDeepest: number | null;
  /** An input array's contents differ at the end of the run. */
  inputChanged: boolean;
  /** The line run most often, and how many times. */
  hottest: { line: number; hits: number } | null;
}

const refId = (v: ValueSnap | undefined) => (v?.t === 'ref' ? v.id : null);

function depthOf(s: Step): number {
  const counts = new Map<string, number>();
  for (const f of s.frames) counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
  return Math.max(1, ...[...counts].filter(([name]) => name !== 'Program').map(([, n]) => n));
}

/** Values a heap object holds by key or position, when it is a collection. */
function heldValues(h: HeapSnap): number | null {
  if (h.kind === 'array' || h.kind === 'map' || h.kind === 'set') return h.total;
  if (h.kind === 'object' && h.className === null) return h.entries.length;
  return null;
}

const isTable = (h: HeapSnap) => h.kind === 'map' || (h.kind === 'object' && h.className === null);

export function featuresOf(run: RunResult): RunFeatures {
  const steps = run.steps;
  // The entry call's first step: only the inputs exist yet.
  const first = steps.find((s) => s.frames.some((f) => f.name === run.entry)) ?? steps[0];
  const inputIds = new Set(Object.keys(first?.heap ?? {}).map(Number));
  const nodeNext = new Map<number, number | null>();
  for (const h of Object.values(first?.heap ?? {})) {
    if (h.kind === 'object' && h.className === 'ListNode') nodeNext.set(h.id, refId(h.entries.find(([k]) => k === 'next')?.[1]));
  }
  let depth = 1;
  let extra = 0;
  let lookupTable = false;
  let tableMax = 0;
  let nodeArrayMax = 0;
  let createdNodes = 0;
  const hits = new Map<number, number>();
  for (const s of steps) {
    const d = depthOf(s);
    depth = Math.max(depth, d);
    let held = d - 1;
    for (const h of Object.values(s.heap)) {
      if (inputIds.has(h.id)) continue;
      held += heldValues(h) ?? 0;
      if (isTable(h)) {
        lookupTable = true;
        tableMax = Math.max(tableMax, heldValues(h)!);
      }
      if (h.kind === 'array' && h.items.length > 0) {
        const allNodes = h.items.every((v) => {
          const id = refId(v);
          const o = id === null ? undefined : s.heap[id];
          return o?.kind === 'object' && o.className !== null && NODE_CLASSES.has(o.className);
        });
        if (allNodes) nodeArrayMax = Math.max(nodeArrayMax, h.total);
      }
    }
    extra = Math.max(extra, held);
    for (const ef of s.effects) if (ef.type === 'create' && NODE_CLASSES.has(ef.className)) createdNodes++;
    if (s.loc && s.kind !== 'enter') hits.set(s.loc.line, (hits.get(s.loc.line) ?? 0) + 1);
  }
  let turnedAtDeepest: number | null = null;
  if (depth > 1 && nodeNext.size > 0) {
    const deepest = steps.find((s) => depthOf(s) === depth)!;
    turnedAtDeepest = 0;
    for (const [id, next] of nodeNext) {
      const h = deepest.heap[id];
      if (h?.kind === 'object' && refId(h.entries.find(([k]) => k === 'next')?.[1]) !== next) turnedAtDeepest++;
    }
  }
  let inputChanged = false;
  for (const id of inputIds) {
    const before = first.heap[id];
    if (before?.kind !== 'array') continue;
    const last = [...steps].reverse().find((s) => s.heap[id]);
    if (last && JSON.stringify(last.heap[id]) !== JSON.stringify(before)) inputChanged = true;
  }
  const top = [...hits].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return {
    steps: steps.length,
    depth,
    extra,
    lookupTable,
    tableMax,
    createdNodes,
    nodeArrayMax,
    turnedAtDeepest,
    inputChanged,
    hottest: top ? { line: top[0], hits: top[1] } : null,
  };
}

/**
 * How a quantity grew across three sizes, each `ratio` times the one before, from how much it
 * grew each time: a constant amount (log), `ratio` times as much (linear), `ratio`² times (quadratic).
 * Anything in between is not classified.
 */
export function growthOf(values: number[], ratio: number): Growth | null {
  const [d1, d2] = [values[1] - values[0], values[2] - values[1]];
  if (d1 <= 0 && d2 <= 0) return 'constant';
  if (d1 <= 0 || d2 <= 0) return null;
  const e = Math.log(d2 / d1) / Math.log(ratio);
  if (e < 0.35) return 'log';
  if (e >= 0.65 && e <= 1.35) return 'linear';
  if (e >= 1.65 && e <= 2.35) return 'quadratic';
  return null;
}

export interface Failure {
  result: CaseResult;
  case: ExerciseCase;
}

export interface ProbeRun {
  n: number;
  /** null when the run did not finish (then `message` says why). */
  features: RunFeatures | null;
  message: string | null;
}

export interface Observation {
  results: CaseResult[];
  failures: Failure[];
  probes: ProbeRun[];
  /** Growth of the steps (time) and of the values held plus nested calls (extra space); null when not measured or not classified. */
  time: Growth | null;
  space: Growth | null;
  lookupTable: boolean;
  /** On the guide's example: the lookup table never held every item of the first array input. null without a table. */
  onePass: boolean | null;
  depth: number;
  createdNodes: number;
  nodeArray: boolean;
  turns: 'down' | 'back' | null;
  inputChanged: boolean;
  hottest: { line: number; hits: number; n: number } | null;
}

const key = (inputs: RunRequest['inputs']) => JSON.stringify(inputs.map((i) => [i.name, i.value]));

/**
 * Runs `code` on every example and test (as Check all tests does) and on the guide's three probe
 * inputs, and reports what the runs showed. Returns null when `signal` aborts or a newer request
 * on the same worker supersedes a run, so a stale analysis never reports anything.
 */
export async function observeCode(
  e: Exercise,
  g: InterviewGuide,
  code: string,
  run: (req: RunRequest) => Promise<RunResult>,
  signal?: AbortSignal,
): Promise<Observation | null> {
  const c = e.content!;
  const byInputs = new Map<string, RunResult>();
  const results = await checkExercise(
    e,
    code,
    async (req) => {
      const r = await run(req);
      byInputs.set(key(req.inputs), r);
      return r;
    },
    signal,
  );
  if (!results) return null;
  const cases = [...c.examples, ...c.tests];
  const request = (inputs: Record<string, unknown>): RunRequest => ({
    code,
    mode: 'function',
    entry: c.entry,
    inputs: c.params.map((p) => ({ name: p.name, value: inputs[p.name], kind: p.kind })),
    resultKind: c.resultKind,
  });
  const caseRuns = cases.map((x) => byInputs.get(key(request(x.inputs).inputs)));
  const failures = results.flatMap((r, i) => (r.status === 'passed' ? [] : [{ result: r, case: cases[i] }]));

  const probes: ProbeRun[] = [];
  for (const n of g.probe.sizes) {
    if (signal?.aborted) return null;
    try {
      const r = await run(request(g.probe.inputs(n)));
      if (signal?.aborted) return null;
      probes.push(
        r.status === 'finished'
          ? { n, features: featuresOf(r), message: null }
          : { n, features: null, message: r.error?.message ?? 'The run did not finish.' },
      );
    } catch (err) {
      if (signal?.aborted || (err instanceof EngineStopped && err.reason === 'superseded')) return null;
      probes.push({ n, features: null, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const measured = probes.every((p) => p.features) ? probes.map((p) => p.features!) : null;
  const caseFeatures = caseRuns.flatMap((r) => (r?.status === 'finished' ? [featuresOf(r)] : []));
  const all = [...caseFeatures, ...(measured ?? [])];
  const largest = measured?.[measured.length - 1] ?? null;
  const largestN = g.probe.sizes[g.probe.sizes.length - 1];
  const depth = Math.max(1, ...all.map((f) => f.depth));

  const exampleRun = caseRuns[g.example.case.index];
  const exampleFeatures = exampleRun?.status === 'finished' ? featuresOf(exampleRun) : null;
  const firstArray = c.params.map((p) => c.examples[g.example.case.index].inputs[p.name]).find(Array.isArray);
  const onePass = exampleFeatures?.lookupTable && firstArray ? exampleFeatures.tableMax < firstArray.length : null;

  let turns: Observation['turns'] = null;
  if (largest && largest.depth > 1 && largest.turnedAtDeepest !== null) {
    if (largest.turnedAtDeepest === 0) turns = 'back';
    else if (largest.turnedAtDeepest >= largestN - 1) turns = 'down';
  }

  return {
    results,
    failures,
    probes,
    time: measured
      ? growthOf(
          measured.map((f) => f.steps),
          g.probe.ratio,
        )
      : null,
    space: measured
      ? growthOf(
          measured.map((f) => f.extra),
          g.probe.ratio,
        )
      : null,
    lookupTable: all.some((f) => f.lookupTable),
    onePass,
    depth,
    createdNodes: all.reduce((n, f) => n + f.createdNodes, 0),
    nodeArray: !!largest && largest.nodeArrayMax >= largestN,
    turns,
    inputChanged: caseFeatures.some((f) => f.inputChanged),
    hottest: largest?.hottest ? { ...largest.hottest, n: largestN } : null,
  };
}

/** A stated rule the runs show broken (only judged when the runs measured what it needs). */
export function unmet(g: InterviewGuide, o: Observation): Requirement[] {
  return g.requirements.filter((r) => {
    if (r.check === 'logarithmic-time') return o.time !== null && o.time !== 'log' && o.time !== 'constant';
    if (r.check === 'reuse-nodes') return o.createdNodes > 0;
    return o.inputChanged;
  });
}

export function matches(v: Variant, o: Observation): boolean {
  const m = v.match;
  return (
    m.time === o.time &&
    m.space === o.space &&
    (m.lookupTable === undefined || m.lookupTable === o.lookupTable) &&
    (m.recursion === undefined || m.recursion === o.depth > 1) &&
    (m.nodeArray === undefined || m.nodeArray === o.nodeArray) &&
    (m.onePass === undefined || m.onePass === o.onePass) &&
    (m.turns === undefined || m.turns === o.turns)
  );
}

export type Verdict =
  /** Some case failed or errored: report what was observed, explain nothing. */
  | { kind: 'failing' }
  /** Every case passed, but a stated rule is broken. */
  | { kind: 'unmet'; requirements: Requirement[] }
  /** The runs match an approach the guide has wording for. */
  | { kind: 'matched'; variant: Variant }
  /** Every case passed, and no authored approach matches what the runs showed. */
  | { kind: 'unmatched' };

export function verdict(g: InterviewGuide, o: Observation): Verdict {
  if (o.failures.length > 0) return { kind: 'failing' };
  const broken = unmet(g, o);
  if (broken.length > 0) return { kind: 'unmet', requirements: broken };
  const variant = g.variants.find((v) => matches(v, o));
  return variant ? { kind: 'matched', variant } : { kind: 'unmatched' };
}
