// App state: the selected problem, the code and inputs being edited, the last
// run's trace and where playback is. Edits are saved to localStorage.
import { create } from 'zustand';
import { DEFAULT_PROBLEM_ID, PROBLEMS, problemById, type ProblemDef } from '../problems/catalog';
import { parseProblemText, parseValue, starterFor, type ParsedProblem } from '../problems/pasted';
import { starterIn } from '../problems/starters';
import type { LanguageId } from '../languages';
import type { ExpectSpec, InputKind, LiveResult, RunRequest, RunResult } from '../trace/types';
import { EngineStopped, cancelObsoleteRun, runInWorker, stopRun } from '../worker/client';
import { readDeepLink, type Pane } from './deepLink';
import { mergeLive, type LiveState } from './live';
import type { FormatResult } from '../editor/format';
import { NO_OVERRIDES, type ArrayRole, type BindingOverrides, type NodeShape, type ObjectRole } from '../viz/bindings';

export interface InputRow {
  name: string;
  text: string;
  kind: InputKind;
}

export interface Work {
  /** The code in the editor, in `language`. */
  code: string;
  caseIndex: number;
  inputs: InputRow[];
  expectedText: string;
  /** Missing in work saved before Python: JavaScript. */
  language?: LanguageId;
  /** The code last written in the other languages, kept while switching. */
  otherCode?: Partial<Record<LanguageId, string>>;
}

export interface CustomProblem {
  text: string;
  entry: string;
}

export type VizTab = 'build' | 'run';

/** An authored answer played on the board in place of the learner's code, which is kept as it is. */
export interface Walkthrough {
  problemId: string;
  code: string;
  /** e.g. "37. Pick a Subset" */
  title: string;
  /** How the answer works, in the authored words. */
  explanation: string[];
}
export type ViewStyle = 'illustrated' | 'technical' | 'both';

export interface RunState {
  status: 'idle' | 'running' | 'done' | 'stopped' | 'failed';
  result: RunResult | null;
  codeAtRun: string;
  problemId: string;
  expect: ExpectSpec;
  /** Why the run stopped without a trace (time limit, Stop button, crash) or why it could not start. */
  message: string | null;
  /** The last run that finished successfully; it stays visible (labeled) after a failed run. */
  lastGood: { result: RunResult; codeAtRun: string; problemId: string; expect: ExpectSpec } | null;
  /** The user chose to step through the partial trace of a failed run. */
  inspectFailed: boolean;
  /** Started automatically after a typing pause rather than by the Run button. */
  auto: boolean;
}

export interface DisplayedRun {
  result: RunResult;
  codeAtRun: string;
  expect: ExpectSpec;
  /** current: the latest run finished. failed-steps: the partial trace of a failed run, opened on request. previous: the last successful run, shown because the latest one failed. */
  kind: 'current' | 'failed-steps' | 'previous';
}

export function runFailed(run: RunState): boolean {
  return run.status === 'stopped' || run.status === 'failed' || run.result?.status === 'error';
}

/** Which trace the Run tab shows. A failed run never replaces the last successful drawing unless asked. */
export function displayedRun(s: Pick<State, 'run' | 'problemId'>): DisplayedRun | null {
  const r = s.run;
  if (r.problemId !== s.problemId) return null;
  if (!runFailed(r)) return r.result ? { result: r.result, codeAtRun: r.codeAtRun, expect: r.expect, kind: 'current' } : null;
  if (r.inspectFailed && r.result && r.result.status === 'error' && r.result.steps.length > 0) {
    return { result: r.result, codeAtRun: r.codeAtRun, expect: r.expect, kind: 'failed-steps' };
  }
  const good = r.lastGood && r.lastGood.problemId === s.problemId ? r.lastGood : null;
  return good ? { result: good.result, codeAtRun: good.codeAtRun, expect: good.expect, kind: 'previous' } : null;
}

interface State {
  problemId: string;
  work: Record<string, Work>;
  custom: CustomProblem;
  hintDismissed: boolean;
  speed: number;
  tab: VizTab;
  run: RunState;
  step: number;
  playing: boolean;
  live: LiveState;
  cursorLine: number | null;
  selectedNode: number | null;
  /** Narrow screens show one panel at a time. */
  mobilePane: Pane;
  reveal: { line: number; nonce: number } | null;
  /** Ctrl+S formats the code when on (the code itself is always saved automatically). */
  formatOnSave: boolean;
  formatNonce: number;
  formatMessage: { text: string; tone: 'ok' | 'error' } | null;
  /** Run the code with the selected inputs after each typing pause. */
  autoRun: boolean;
  /** Drawings also show secondary detail: indices, declaration kinds, null children. */
  showDetails: boolean;
  /** Illustrated scenes (people, shelves, ropes), the technical drawing, or both together; all show the same trace. */
  viewStyle: ViewStyle;
  /** Zoom of the drawing board, shared by Build and Run (1 = actual size). */
  boardZoom: number;
  /** The user's drawing choices per problem (see viz/bindings.ts). */
  bindings: Record<string, BindingOverrides>;
  /** The answer being walked through, if any (never saved). */
  walkthrough: Walkthrough | null;
}

interface Actions {
  selectProblem(id: string): void;
  setCode(code: string): void;
  resetCode(): void;
  selectCase(index: number): void;
  setInput(name: string, text: string): void;
  setInputKind(name: string, kind: InputKind): void;
  /** Adds an empty input, e.g. for a function parameter the pasted examples didn't cover. */
  addInput(name: string): void;
  removeInput(name: string): void;
  setExpected(text: string): void;
  setCustomText(text: string): void;
  setCustomEntry(entry: string): void;
  /** Switches the editor's language; the code in the other language is kept for switching back. */
  setLanguage(language: LanguageId): void;
  /** `background` and `auto` run without switching tabs; `auto` marks a run started by a typing pause. */
  startRun(opts?: { background?: boolean; auto?: boolean }): Promise<void>;
  stop(): void;
  /** Drops an in-flight run whose code is out of date. */
  cancelRun(): void;
  setAutoRun(on: boolean): void;
  setShowDetails(on: boolean): void;
  setViewStyle(style: ViewStyle): void;
  setBoardZoom(zoom: number): void;
  /** null removes the choice and returns to automatic detection. */
  bindShape(className: string, shape: NodeShape | null): void;
  bindArray(name: string, choice: { role?: ArrayRole; pointers?: string[] } | null): void;
  /** How to draw the Map or object a variable holds (graph, trie, plain); null goes back to automatic. */
  bindObject(name: string, role: ObjectRole | null): void;
  setInspectFailed(inspect: boolean): void;
  /** Runs the authored answer on the selected inputs, from the first step; the learner's code stays untouched. */
  startWalkthrough(w: Omit<Walkthrough, 'problemId'>): void;
  /** Back to the learner's code, which is run again so the board shows it. */
  endWalkthrough(): void;
  requestFormat(): void;
  setFormatOnSave(on: boolean): void;
  showFormatResult(result: FormatResult): void;
  revealLine(line: number): void;
  setStep(step: number): void;
  setPlaying(playing: boolean): void;
  setSpeed(speed: number): void;
  setTab(tab: VizTab): void;
  setLive(result: LiveResult, code: string): void;
  setCursorLine(line: number | null): void;
  selectNode(id: number | null): void;
  dismissHint(): void;
  setMobilePane(pane: State['mobilePane']): void;
}

export const CUSTOM_ID = 'custom';
const STORAGE_KEY = 'drawgorithms:v1';

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.5;
export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(z) ? z : 1));

let latestRun = 0;

/** Problems solved by a function open on Run (the body needs the inputs); scripts open on Build. */
function defaultTab(p: ProblemDef): VizTab {
  return p.mode === 'function' ? 'run' : 'build';
}

const toText = (v: unknown) => (v === undefined ? '' : JSON.stringify(v));

export function customProblemDef(custom: CustomProblem): ProblemDef {
  const parsed: ParsedProblem | null = custom.text.trim() ? parseProblemText(custom.text) : null;
  const first = parsed?.examples[0];
  return {
    id: CUSTOM_ID,
    title: parsed?.title || 'Your problem',
    tags: ['Pasted'],
    description: parsed?.description ? parsed.description.split(/\n+/) : [],
    explanation: '',
    mode: 'function',
    entry: custom.entry.trim() || undefined,
    params: (first?.inputs ?? []).map((i) => ({ name: i.name, kind: parsed?.kinds[i.name] ?? 'auto' })),
    cases: (parsed?.examples ?? []).map((ex, i) => ({
      label: `Example ${i + 1}`,
      inputs: Object.fromEntries(ex.inputs.map((x) => [x.name, x.parsed.value])),
      expected: ex.output?.ok ? { kind: 'return', value: ex.output.value } : { kind: 'none' },
    })),
    starter: parsed ? starterFor(parsed) : 'function solve(input) {\n  // Write your solution here.\n\n}\n',
    tryThis: [],
  };
}

export function problemFor(id: string, custom: CustomProblem): ProblemDef {
  return id === CUSTOM_ID ? customProblemDef(custom) : (problemById(id) ?? PROBLEMS[0]);
}

function caseWork(p: ProblemDef, index: number, code: string): Work {
  const c = p.cases[index];
  const expected = c?.expected;
  return {
    code,
    caseIndex: index,
    inputs: p.params.map((param) => ({ name: param.name, text: toText(c?.inputs[param.name]), kind: param.kind })),
    expectedText: !expected || expected.kind === 'none' ? '' : toText(expected.kind === 'return' ? expected.value : expected.values),
  };
}

function freshWork(p: ProblemDef): Work {
  return caseWork(p, 0, p.starter);
}

interface Saved {
  problemId: string;
  work: Record<string, Work>;
  custom: CustomProblem;
  hintDismissed: boolean;
  speed: number;
  formatOnSave: boolean;
  autoRun: boolean;
  showDetails: boolean;
  viewStyle: ViewStyle;
  bindings: Record<string, BindingOverrides>;
}

function load(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

const saved = load();
// A demo link wins over the last session; the visitor's saved work for that example is kept.
const link = typeof location === 'undefined' ? {} : readDeepLink(location.search, (id) => !!problemById(id));
const initialProblemId =
  link.problemId ??
  (saved.problemId && (saved.problemId === CUSTOM_ID || problemById(saved.problemId)) ? saved.problemId : DEFAULT_PROBLEM_ID);
const initialCustom: CustomProblem = saved.custom ?? { text: '', entry: '' };

export const useStore = create<State & Actions>()((set, get) => ({
  problemId: initialProblemId,
  // The selected problem always has its work entry, so selectors return a stable object.
  work: {
    ...saved.work,
    [initialProblemId]: saved.work?.[initialProblemId] ?? freshWork(problemFor(initialProblemId, initialCustom)),
  },
  custom: initialCustom,
  hintDismissed: saved.hintDismissed ?? false,
  speed: saved.speed ?? 1,
  tab: defaultTab(problemFor(initialProblemId, initialCustom)),
  run: {
    status: 'idle',
    result: null,
    codeAtRun: '',
    problemId: '',
    expect: { kind: 'none' },
    message: null,
    lastGood: null,
    inspectFailed: false,
    auto: false,
  },
  step: 0,
  playing: false,
  live: { result: null, code: null, lastDrawn: null },
  cursorLine: null,
  selectedNode: null,
  // Phones open on the drawing: the first thing a new visitor sees is the code running.
  mobilePane: link.pane ?? 'visual',
  reveal: null,
  formatOnSave: saved.formatOnSave ?? false,
  formatNonce: 0,
  formatMessage: null,
  autoRun: saved.autoRun ?? true,
  showDetails: saved.showDetails ?? false,
  viewStyle: saved.viewStyle === 'technical' || saved.viewStyle === 'both' ? saved.viewStyle : 'illustrated',
  boardZoom: 1,
  bindings: saved.bindings ?? {},
  walkthrough: null,

  selectProblem(id) {
    const s = get();
    const p = problemFor(id, s.custom);
    s.cancelRun();
    set({
      problemId: id,
      work: s.work[id] ? s.work : { ...s.work, [id]: freshWork(p) },
      playing: false,
      selectedNode: null,
      tab: defaultTab(p),
      live: { result: null, code: null, lastDrawn: null },
      walkthrough: null,
    });
  },

  setCode(code) {
    const s = get();
    const w = currentWork(s);
    if (w.code === code) return;
    // A run of the old code is obsolete now.
    s.cancelRun();
    set({ work: { ...s.work, [s.problemId]: { ...w, code } } });
  },

  resetCode() {
    const s = get();
    const p = problemFor(s.problemId, s.custom);
    const w = currentWork(s);
    set({ work: { ...s.work, [s.problemId]: { ...w, code: starterIn(p, workLanguage(w)) } } });
  },

  setLanguage(language) {
    const s = get();
    const w = currentWork(s);
    const current = workLanguage(w);
    if (current === language) return;
    s.cancelRun();
    const otherCode = { ...w.otherCode, [current]: w.code };
    const code = otherCode[language] ?? starterIn(problemFor(s.problemId, s.custom), language);
    delete otherCode[language];
    set({ work: { ...s.work, [s.problemId]: { ...w, language, code, otherCode } }, live: { result: null, code: null, lastDrawn: null } });
  },

  selectCase(index) {
    const s = get();
    const p = problemFor(s.problemId, s.custom);
    set({ work: { ...s.work, [s.problemId]: caseWork(p, index, currentWork(s).code) } });
    // Auto-run waits during a walkthrough, so the answer is replayed on the new case from its first step.
    if (s.walkthrough?.problemId === s.problemId) void get().startRun();
  },

  setInput(name, text) {
    const s = get();
    const w = currentWork(s);
    set({ work: { ...s.work, [s.problemId]: { ...w, inputs: w.inputs.map((r) => (r.name === name ? { ...r, text } : r)) } } });
  },

  setInputKind(name, kind) {
    const s = get();
    const w = currentWork(s);
    set({ work: { ...s.work, [s.problemId]: { ...w, inputs: w.inputs.map((r) => (r.name === name ? { ...r, kind } : r)) } } });
  },

  addInput(name) {
    const s = get();
    const w = currentWork(s);
    if (w.inputs.some((r) => r.name === name)) return;
    set({ work: { ...s.work, [s.problemId]: { ...w, inputs: [...w.inputs, { name, text: '', kind: 'auto' }] } } });
  },

  removeInput(name) {
    const s = get();
    const w = currentWork(s);
    set({ work: { ...s.work, [s.problemId]: { ...w, inputs: w.inputs.filter((r) => r.name !== name) } } });
  },

  setExpected(text) {
    const s = get();
    set({ work: { ...s.work, [s.problemId]: { ...currentWork(s), expectedText: text } } });
  },

  setCustomText(text) {
    const s = get();
    const custom = { ...s.custom, text };
    const p = customProblemDef(custom);
    const old = s.work[CUSTOM_ID];
    const previousStarter = customProblemDef(s.custom).starter;
    // Keep code the user already wrote; only an untouched starter follows the new text.
    const code = old && old.code !== previousStarter ? old.code : p.starter;
    set({ custom, work: { ...s.work, [CUSTOM_ID]: caseWork(p, 0, code) } });
  },

  setCustomEntry(entry) {
    set({ custom: { ...get().custom, entry } });
  },

  async startRun(opts = {}) {
    // Only the newest run may publish its result; older ones are cancelled.
    const token = ++latestRun;
    const s = get();
    const quiet = opts.background || opts.auto;
    const show = quiet ? {} : { tab: 'run' as const };
    const p = problemFor(s.problemId, s.custom);
    const w = currentWork(s);
    const code = shownCode(s);
    const walking = s.walkthrough?.problemId === s.problemId;
    const bad = w.inputs.find((r) => !parseValue(r.text).ok);
    if (p.mode === 'function' && bad) {
      cancelObsoleteRun();
      set({
        run: {
          ...s.run,
          status: 'failed',
          result: null,
          codeAtRun: code,
          problemId: p.id,
          inspectFailed: false,
          auto: !!opts.auto,
          message: `Input ${bad.name} is not valid JSON yet. Example: [2, 7, 11, 15] or 9 or "text".`,
        },
        playing: false,
        ...show,
      });
      return;
    }
    const expect = expectFrom(p, w.expectedText);
    const request: RunRequest = {
      code,
      mode: p.mode,
      entry: p.entry,
      resultKind: p.resultKind,
      inputs: p.mode === 'function' ? w.inputs.map((r) => ({ name: r.name, value: parseValue(r.text).value, kind: r.kind })) : [],
    };
    const lastGood = s.run.lastGood;
    // While running, the previous trace stays paired with the code that produced it.
    set({ run: { ...s.run, status: 'running', message: null, inspectFailed: false, auto: !!opts.auto }, playing: false, ...show });
    try {
      const result = await runInWorker(request, shownLanguage(s));
      if (token !== latestRun) return;
      const ok = result.status === 'finished';
      set({
        run: {
          status: 'done',
          result,
          codeAtRun: code,
          problemId: p.id,
          expect,
          message: null,
          // Only a run of the learner's own code that finished becomes the drawing to fall back on (never a walkthrough).
          lastGood: ok && !walking ? { result, codeAtRun: code, problemId: p.id, expect } : lastGood,
          inspectFailed: false,
          auto: !!opts.auto,
        },
        // An automatic run opens on its final state (the drawing your code ends with); Run starts from the top.
        step: opts.auto && ok ? result.steps.length - 1 : 0,
        selectedNode: null,
        ...(quiet ? {} : { mobilePane: 'visual' as const }),
      });
    } catch (e) {
      if (token !== latestRun) return;
      if (e instanceof EngineStopped && e.reason === 'superseded') return;
      const message = e instanceof EngineStopped ? e.message : `The engine failed: ${String(e)}`;
      const status = e instanceof EngineStopped && e.reason === 'stopped' ? 'stopped' : 'failed';
      set({
        run: { ...get().run, status, message, result: null, codeAtRun: code, problemId: p.id, inspectFailed: false },
        step: 0,
        playing: false,
      });
    }
  },

  stop() {
    stopRun();
  },

  cancelRun() {
    const r = get().run;
    if (r.status !== 'running') return;
    latestRun++;
    cancelObsoleteRun();
    set({ run: { ...r, status: r.result ? 'done' : 'idle' } });
  },

  setAutoRun(on) {
    set({ autoRun: on });
  },

  setShowDetails(on) {
    set({ showDetails: on });
  },

  setViewStyle(style) {
    set({ viewStyle: style });
  },

  setBoardZoom(zoom) {
    set({ boardZoom: clampZoom(zoom) });
  },

  bindShape(className, shape) {
    const s = get();
    const cur = s.bindings[s.problemId] ?? NO_OVERRIDES;
    const shapes = { ...cur.shapes };
    if (shape) shapes[className] = shape;
    else delete shapes[className];
    set({ bindings: { ...s.bindings, [s.problemId]: { ...cur, shapes } } });
  },

  bindArray(name, choice) {
    const s = get();
    const cur = s.bindings[s.problemId] ?? NO_OVERRIDES;
    const arrays = { ...cur.arrays };
    if (choice) arrays[name] = { ...arrays[name], ...choice };
    else delete arrays[name];
    set({ bindings: { ...s.bindings, [s.problemId]: { ...cur, arrays } } });
  },

  bindObject(name, role) {
    const s = get();
    const cur = s.bindings[s.problemId] ?? NO_OVERRIDES;
    const objects = { ...cur.objects };
    if (role) objects[name] = role;
    else delete objects[name];
    set({ bindings: { ...s.bindings, [s.problemId]: { ...cur, objects } } });
  },

  requestFormat() {
    set({ formatNonce: get().formatNonce + 1 });
  },

  setFormatOnSave(on) {
    set({ formatOnSave: on });
  },

  showFormatResult(result) {
    set({
      formatMessage: result.ok
        ? { text: result.changed ? 'Formatted with Prettier. Ctrl+Z undoes it.' : 'Already formatted.', tone: 'ok' }
        : { text: result.message, tone: 'error' },
    });
  },

  startWalkthrough(w) {
    const s = get();
    s.cancelRun();
    set({ walkthrough: { ...w, problemId: s.problemId }, tab: 'run', mobilePane: 'visual', playing: false, selectedNode: null });
    void get().startRun();
  },

  endWalkthrough() {
    if (!get().walkthrough) return;
    get().cancelRun();
    set({ walkthrough: null, playing: false, selectedNode: null });
    void get().startRun({ background: true });
  },

  setInspectFailed(inspect) {
    set({ run: { ...get().run, inspectFailed: inspect }, step: 0, playing: false, selectedNode: null });
  },

  revealLine(line) {
    set({ reveal: { line, nonce: (get().reveal?.nonce ?? 0) + 1 } });
  },

  setStep(step) {
    const total = displayedRun(get())?.result.steps.length ?? 0;
    set({ step: Math.max(0, Math.min(step, total - 1)) });
  },

  setPlaying(playing) {
    set({ playing });
  },

  setSpeed(speed) {
    set({ speed });
  },

  setTab(tab) {
    set({ tab, playing: false, selectedNode: null });
  },

  setLive(result, code) {
    set({ live: mergeLive(get().live, result, code) });
  },

  setCursorLine(line) {
    if (get().cursorLine !== line) set({ cursorLine: line });
  },

  selectNode(id) {
    set({ selectedNode: id });
  },

  dismissHint() {
    set({ hintDismissed: true });
  },

  setMobilePane(pane) {
    set({ mobilePane: pane });
  },
}));

export function currentWork(s: Pick<State, 'problemId' | 'work' | 'custom'>): Work {
  return s.work[s.problemId] ?? freshWork(problemFor(s.problemId, s.custom));
}

export const workLanguage = (w: Work): LanguageId => w.language ?? 'javascript';

/** The language of the code the editor panel shows: a walkthrough's answer is JavaScript. */
export function shownLanguage(s: Pick<State, 'problemId' | 'work' | 'custom' | 'walkthrough'>): LanguageId {
  return s.walkthrough?.problemId === s.problemId ? 'javascript' : workLanguage(currentWork(s));
}

/** The code the editor panel shows and Run runs: a walkthrough's answer while one is open, otherwise the learner's own. */
export function shownCode(s: Pick<State, 'problemId' | 'work' | 'custom' | 'walkthrough'>): string {
  return s.walkthrough?.problemId === s.problemId ? s.walkthrough.code : currentWork(s).code;
}

export function expectFrom(p: ProblemDef, text: string): ExpectSpec {
  if (!text.trim()) return { kind: 'none' };
  const parsed = parseValue(text);
  if (!parsed.ok) return { kind: 'none' };
  if (p.mode === 'script') {
    const v = parsed.value;
    return v && typeof v === 'object' && !Array.isArray(v) ? { kind: 'variables', values: v as Record<string, unknown> } : { kind: 'none' };
  }
  return { kind: 'return', value: parsed.value };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data: Saved = {
      problemId: s.problemId,
      work: s.work,
      custom: s.custom,
      hintDismissed: s.hintDismissed,
      speed: s.speed,
      formatOnSave: s.formatOnSave,
      autoRun: s.autoRun,
      showDetails: s.showDetails,
      viewStyle: s.viewStyle,
      bindings: s.bindings,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode, quota); edits still work for this session.
    }
  }, 300);
});
