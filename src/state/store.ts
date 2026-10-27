// App state: the selected problem, the code and inputs being edited, the last
// run's trace and where playback is. Edits are saved to localStorage.
import { create } from 'zustand';
import { DEFAULT_PROBLEM_ID, PROBLEMS, problemById, type ProblemDef } from '../problems/catalog';
import { parseProblemText, parseValue, starterFor, type ParsedProblem } from '../problems/pasted';
import type { ExpectSpec, InputKind, LiveResult, RunRequest, RunResult } from '../trace/types';
import { EngineStopped, runInWorker, stopRun } from '../worker/client';
import { mergeLive, type LiveState } from './live';
import type { FormatResult } from '../editor/format';

export interface InputRow {
  name: string;
  text: string;
  kind: InputKind;
}

export interface Work {
  code: string;
  caseIndex: number;
  inputs: InputRow[];
  expectedText: string;
}

export interface CustomProblem {
  text: string;
  entry: string;
}

export type VizTab = 'build' | 'run';

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
  mobilePane: 'problem' | 'code' | 'visual';
  reveal: { line: number; nonce: number } | null;
  /** Ctrl+S formats the code when on (the code itself is always saved automatically). */
  formatOnSave: boolean;
  formatNonce: number;
  formatMessage: { text: string; tone: 'ok' | 'error' } | null;
}

interface Actions {
  selectProblem(id: string): void;
  setCode(code: string): void;
  resetCode(): void;
  selectCase(index: number): void;
  setInput(name: string, text: string): void;
  setInputKind(name: string, kind: InputKind): void;
  setExpected(text: string): void;
  setCustomText(text: string): void;
  setCustomEntry(entry: string): void;
  /** `background` runs without switching to the Run tab (used on first load). */
  startRun(opts?: { background?: boolean }): Promise<void>;
  stop(): void;
  setInspectFailed(inspect: boolean): void;
  requestFormat(): void;
  setFormatOnSave(on: boolean): void;
  showFormatResult(result: FormatResult): void;
  revealLine(line: number): void;
  setStep(step: number): void;
  setPlaying(playing: boolean): void;
  setSpeed(speed: number): void;
  setTab(tab: VizTab): void;
  setLive(result: LiveResult): void;
  setCursorLine(line: number | null): void;
  selectNode(id: number | null): void;
  dismissHint(): void;
  setMobilePane(pane: State['mobilePane']): void;
}

export const CUSTOM_ID = 'custom';
const STORAGE_KEY = 'drawgorithms:v1';

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
const initialProblemId =
  saved.problemId && (saved.problemId === CUSTOM_ID || problemById(saved.problemId)) ? saved.problemId : DEFAULT_PROBLEM_ID;
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
  tab: 'build',
  run: {
    status: 'idle',
    result: null,
    codeAtRun: '',
    problemId: '',
    expect: { kind: 'none' },
    message: null,
    lastGood: null,
    inspectFailed: false,
  },
  step: 0,
  playing: false,
  live: { result: null, lastDrawn: null },
  cursorLine: null,
  selectedNode: null,
  mobilePane: 'code',
  reveal: null,
  formatOnSave: saved.formatOnSave ?? false,
  formatNonce: 0,
  formatMessage: null,

  selectProblem(id) {
    const s = get();
    const p = problemFor(id, s.custom);
    set({
      problemId: id,
      work: s.work[id] ? s.work : { ...s.work, [id]: freshWork(p) },
      playing: false,
      selectedNode: null,
      tab: 'build',
      live: { result: null, lastDrawn: null },
    });
  },

  setCode(code) {
    const s = get();
    const w = currentWork(s);
    set({ work: { ...s.work, [s.problemId]: { ...w, code } } });
  },

  resetCode() {
    const s = get();
    const p = problemFor(s.problemId, s.custom);
    set({ work: { ...s.work, [s.problemId]: { ...currentWork(s), code: p.starter } } });
  },

  selectCase(index) {
    const s = get();
    const p = problemFor(s.problemId, s.custom);
    set({ work: { ...s.work, [s.problemId]: caseWork(p, index, currentWork(s).code) } });
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
    const s = get();
    if (s.run.status === 'running') return;
    const show = opts.background ? {} : { tab: 'run' as const };
    const p = problemFor(s.problemId, s.custom);
    const w = currentWork(s);
    const bad = w.inputs.find((r) => !parseValue(r.text).ok);
    if (p.mode === 'function' && bad) {
      set({
        run: {
          ...s.run,
          status: 'failed',
          problemId: p.id,
          inspectFailed: false,
          message: `Input ${bad.name} is not valid JSON. Example: [2, 7, 11, 15] or 9 or "text".`,
        },
        playing: false,
        ...show,
      });
      return;
    }
    const expect = expectFrom(p, w.expectedText);
    const request: RunRequest = {
      code: w.code,
      mode: p.mode,
      entry: p.entry,
      resultKind: p.resultKind,
      inputs: p.mode === 'function' ? w.inputs.map((r) => ({ name: r.name, value: parseValue(r.text).value, kind: r.kind })) : [],
    };
    const lastGood = s.run.lastGood;
    set({
      run: {
        status: 'running',
        result: s.run.result,
        codeAtRun: w.code,
        problemId: p.id,
        expect,
        message: null,
        lastGood,
        inspectFailed: false,
      },
      playing: false,
      ...show,
    });
    try {
      const result = await runInWorker(request);
      const ok = result.status === 'finished';
      set({
        run: {
          status: 'done',
          result,
          codeAtRun: w.code,
          problemId: p.id,
          expect,
          message: null,
          // Only a run that finished becomes the new drawing to fall back on.
          lastGood: ok ? { result, codeAtRun: w.code, problemId: p.id, expect } : lastGood,
          inspectFailed: false,
        },
        step: 0,
        selectedNode: null,
        ...(opts.background ? {} : { mobilePane: 'visual' as const }),
      });
    } catch (e) {
      const message = e instanceof EngineStopped ? e.message : `The engine failed: ${String(e)}`;
      const status = e instanceof EngineStopped && e.reason === 'stopped' ? 'stopped' : 'failed';
      set({ run: { ...get().run, status, message, result: null, inspectFailed: false }, step: 0, playing: false });
    }
  },

  stop() {
    stopRun();
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

  setLive(result) {
    set({ live: mergeLive(get().live, result) });
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

let saveTimer: number | undefined;
useStore.subscribe((s) => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const data: Saved = {
      problemId: s.problemId,
      work: s.work,
      custom: s.custom,
      hintDismissed: s.hintDismissed,
      speed: s.speed,
      formatOnSave: s.formatOnSave,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode, quota); edits still work for this session.
    }
  }, 300);
});
