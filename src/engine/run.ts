// Entry points used by the worker (and tests): Run and Live Build.
import type {
  EngineError,
  Limits,
  LiveLineInfo,
  LiveObjectInfo,
  LiveResult,
  RunRequest,
  RunResult,
  StaticHints,
  Step,
  ValueSnap,
} from '../trace/types';
import { MAX_ARRAY_LENGTH, MAX_STRING_LENGTH, buildList, buildTree, fromJSON, toPlain } from './builtins';
import { inspect } from './describe';
import { EngineFailure, NeedsRun, UserThrow, type ErrorContext } from './errors';
import { collectHints } from './hints';
import { Interpreter } from './interpreter';
import { findUnsupported, locOf, parseProgram } from './parse';
import { captureFrames, snapString } from './snapshot';
import { Closure, ObjRecord, type Value } from './values';

export const DEFAULT_LIMITS: Limits = { maxSteps: 2000, maxOps: 2_000_000, maxDepth: 200, maxTraceValues: 3_000_000 };
export const LIVE_LIMITS: Limits = { maxSteps: 0, maxOps: 300_000, maxDepth: 60, maxTraceValues: 0 };

const EMPTY_HINTS: StaticHints = { pointers: {}, indexed: [], queues: [], stacks: [], functions: [] };

function errorFrom(e: unknown, interp: Interpreter): { error: EngineError; context: ErrorContext | null } {
  if (e instanceof EngineFailure) {
    return {
      error: { kind: e.kind, name: e.jsName, message: e.message, loc: e.node ? locOf(e.node) : null },
      context: e.context,
    };
  }
  if (e instanceof UserThrow) {
    const v = e.value;
    const message =
      v instanceof ObjRecord && v.props.has('message')
        ? `${String(v.props.get('name') ?? v.className ?? 'Error')}: ${String(v.props.get('message'))}`
        : inspect(v);
    return { error: { kind: 'runtime', name: 'Uncaught', message: `Uncaught ${message}`, loc: locOf(e.node) }, context: e.context };
  }
  if (e instanceof RangeError && /call stack/i.test(e.message)) {
    return {
      error: {
        kind: 'limit',
        name: 'RangeError',
        message: 'The calls went too deep for the interpreter. Check that your recursion has a base case.',
        loc: interp.frames[interp.frames.length - 1]?.loc ?? null,
      },
      context: null,
    };
  }
  // A value too big for the JavaScript engine itself (a check above should normally stop it first).
  if (e instanceof RangeError && /invalid string length|invalid array length|allocation failed/i.test(e.message)) {
    return {
      error: {
        kind: 'limit',
        name: 'RangeError',
        message: `A value got too big for Drawgorithms: strings are limited to ${MAX_STRING_LENGTH.toLocaleString('en-US')} characters and arrays to ${MAX_ARRAY_LENGTH.toLocaleString('en-US')} items.`,
        loc: interp.frames[interp.frames.length - 1]?.loc ?? null,
      },
      context: null,
    };
  }
  const message = e instanceof Error ? e.message : String(e);
  return {
    error: { kind: 'runtime', name: 'InternalError', message: `Drawgorithms hit an internal error: ${message}`, loc: null },
    context: null,
  };
}

function inputValue(interp: Interpreter, value: unknown, kind: string, pos = -1): Value {
  if (kind === 'tree') return Array.isArray(value) ? buildTree(interp, value) : null;
  if (kind === 'list') return Array.isArray(value) ? buildList(interp, value, pos) : null;
  return fromJSON(value);
}

/**
 * Reads a `pos` input (see InputKind): it applies to the first linked-list input. Returns the
 * position, or a message when the position can't be used.
 */
function cyclePosition(inputs: RunRequest['inputs']): { pos: number; error: string | null } {
  const posInput = inputs.find((i) => i.kind === 'pos');
  if (!posInput) return { pos: -1, error: null };
  const list = inputs.find((i) => i.kind === 'list');
  const p = posInput.value;
  if (!list)
    return { pos: -1, error: `Input ${posInput.name} is a cycle position, but no input is drawn as a linked list for it to link.` };
  const length = Array.isArray(list.value) ? list.value.length : 0;
  if (typeof p !== 'number' || !Number.isInteger(p) || p < -1 || p >= length) {
    return {
      pos: -1,
      error: `Input ${posInput.name} must be -1 (no cycle) or a node position from 0 to ${length - 1}: the last node of ${list.name} links back to that node.`,
    };
  }
  return { pos: p, error: null };
}

export function runProgram(req: RunRequest): RunResult {
  const limits: Limits = { ...DEFAULT_LIMITS, ...req.limits };
  const parsed = parseProgram(req.code);
  if (!parsed.ok) {
    return { status: 'error', steps: [], output: [], error: parsed.error, hints: EMPTY_HINTS, entry: null, notes: [] };
  }
  const program = parsed.program;
  const hints = collectHints(program);
  const unsupported = findUnsupported(program);
  if (unsupported) {
    const loc = locOf(unsupported.node);
    const plural = /s$|\)$/.test(unsupported.feature) && !/^the /.test(unsupported.feature);
    return {
      status: 'error',
      steps: [],
      output: [],
      error: {
        kind: 'unsupported',
        name: 'Unsupported',
        message: `Line ${loc.line}: ${unsupported.feature} ${plural ? 'are' : 'is'} not supported yet in Drawgorithms.`,
        loc,
      },
      hints,
      entry: null,
      notes: [],
    };
  }

  const interp = new Interpreter({ source: req.code, mode: 'run', limits });
  const notes: string[] = [];
  let entry: string | null = null;
  let plainResult: unknown;
  let plainGlobals: Record<string, unknown> | undefined;

  try {
    if (req.mode === 'function') {
      entry = req.entry || hints.functions[0]?.name || null;
      interp.record('start', null, entry ? `Your code defines ${entry}. Next, Run calls it with the inputs.` : 'Ready to run your code.');
    } else {
      interp.record('start', null, 'Ready to run your code from the top.');
    }
    interp.runTopLevel(program);

    if (req.mode === 'function') {
      const binding = entry ? interp.globalScope.vars.get(entry) : undefined;
      const fn = binding?.initialized ? binding.value : undefined;
      // A cycle position builds the linked-list input; it is not an argument.
      const passed = req.inputs.filter((i) => i.kind !== 'pos');
      if (!(fn instanceof Closure)) {
        const message = req.entry
          ? `Define a function named ${req.entry}(${passed.map((i) => i.name).join(', ')}). Run calls it with the inputs.`
          : 'Write a function at the top level of your code. Run calls the first one it finds with the inputs.';
        const error: EngineError = { kind: 'setup', name: 'Setup', message, loc: null };
        interp.record('error', null, message);
        return finish('error', error);
      }
      const cycle = cyclePosition(req.inputs);
      if (cycle.error) {
        const error: EngineError = { kind: 'setup', name: 'Setup', message: cycle.error, loc: null };
        interp.record('error', null, cycle.error);
        return finish('error', error);
      }
      const params = fn.node.params.map((p) =>
        p.type === 'Identifier' ? p.name : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : '',
      );
      const byName = passed.length > 0 && passed.every((i) => params.includes(i.name));
      const ordered = byName ? [...passed].sort((a, b) => params.indexOf(a.name) - params.indexOf(b.name)) : passed;
      if (!byName && passed.length && params.some(Boolean)) {
        notes.push(
          `Inputs were passed in order because their names (${passed.map((i) => i.name).join(', ')}) don't match the parameters (${params.join(', ')}).`,
        );
      }
      const listInput = passed.find((i) => i.kind === 'list');
      const args = ordered.map((i) => inputValue(interp, i.value, i.kind, i === listInput ? cycle.pos : -1));
      const lastBefore = interp.steps.length;
      const value = interp.callEntry(
        fn,
        args,
        ordered.map((i) => i.name),
      );
      const last = interp.steps[interp.steps.length - 1];
      const entryFrame = last && interp.steps.length > lastBefore ? last.frames[last.frames.length - 1] : null;
      const resultSnap = snapOf(interp, value, last);
      plainResult = value === null && req.resultKind ? [] : toPlain(value);
      const doneFrames = last ? last.frames.map((f) => (f === entryFrame ? { ...f, finished: true } : f)) : [];
      pushStep(interp, {
        kind: 'done',
        loc: null,
        explanation: `Finished. ${entryFrame?.label ?? entry}${' '}returned ${interp.describeResult(value)}.`,
        frames: doneFrames,
        heap: last ? last.heap : {},
        effects: [],
        result: resultSnap,
      });
    } else {
      const { frames, heap } = captureFrames(interp.frames, interp.globalScope, interp.idOf);
      pushStep(interp, { kind: 'done', loc: null, explanation: 'Finished. Every line has run.', frames, heap, effects: [] });
      plainGlobals = {};
      for (const [name, b] of interp.globalScope.vars) {
        if (b.initialized && b.kind !== 'function' && b.kind !== 'class' && !(b.value instanceof Closure)) {
          plainGlobals[name] = toPlain(b.value);
        }
      }
    }
    return finish('finished', null);
  } catch (e) {
    const { error, context } = errorFrom(e, interp);
    const ctx = context ?? interp.captureContext();
    pushStep(interp, {
      kind: 'error',
      loc: error.loc,
      explanation: `${error.name === 'Uncaught' || error.name === 'LimitError' ? '' : error.name + ': '}${error.message}`,
      frames: ctx.frames,
      heap: ctx.heap,
      effects: ctx.effects,
    });
    return finish('error', error);
  }

  function finish(status: RunResult['status'], error: EngineError | null): RunResult {
    return {
      status,
      steps: interp.steps,
      output: interp.output,
      error,
      hints,
      entry,
      plainResult,
      plainGlobals,
      notes,
    };
  }
}

function snapOf(interp: Interpreter, value: Value, last: Step | undefined): ValueSnap {
  if (value === undefined) return { t: 'undefined' };
  if (value === null) return { t: 'null' };
  if (typeof value === 'number') return { t: 'number', v: value };
  if (typeof value === 'string') return snapString(value);
  if (typeof value === 'boolean') return { t: 'boolean', v: value };
  if (value instanceof Closure) return { t: 'function', name: value.name };
  const id = interp.idOf(value as object);
  if (last && !last.heap[id]) {
    // The returned object was not visible in the last step; add it so the result can be drawn.
    const { heap } = captureFrames([], interp.globalScope, interp.idOf, [value]);
    Object.assign(last.heap, heap);
  }
  return { t: 'ref', id };
}

function pushStep(interp: Interpreter, s: Omit<Step, 'index' | 'outputCount'>): void {
  interp.steps.push({ ...s, index: interp.steps.length, outputCount: interp.output.length });
}

// ------------------------------------------------------------------ Live Build

/** A Live Build result with no new drawing: the UI keeps showing the previous valid state. */
function noDrawing(fields: Pick<LiveResult, 'status' | 'pending' | 'error' | 'hints'>): LiveResult {
  return { ...fields, step: null, lines: [], objects: {}, allNodeIds: [], stoppedAt: null, drawnThroughLine: 0 };
}

/**
 * Live Build: runs the top-level code and draws the structure it creates.
 * A new drawing is produced only when the whole file parses, uses supported
 * syntax and runs without errors. Otherwise the result carries the problem and
 * no drawing, so the previous valid drawing stays on screen.
 */
export function liveBuild(code: string): LiveResult {
  const parsed = parseProgram(code);
  if (!parsed.ok) {
    const lines = code.split('\n');
    const errLine = parsed.error.loc?.line ?? lines.length;
    // Find where the unfinished statement starts: the longest prefix of whole lines that parses.
    let line = errLine;
    for (let cut = Math.min(errLine - 1, lines.length); cut >= 0; cut--) {
      if (parseProgram(lines.slice(0, cut).join('\n')).ok) {
        line = cut + 1;
        break;
      }
    }
    return noDrawing({
      status: 'pending',
      pending: { line, text: (lines[line - 1] ?? '').trim(), message: parsed.error.message },
      error: null,
      hints: EMPTY_HINTS,
    });
  }
  const program = parsed.program;
  const hints = collectHints(program);
  const unsupported = findUnsupported(program);
  if (unsupported) {
    const loc = locOf(unsupported.node);
    return noDrawing({
      status: 'error',
      pending: null,
      error: {
        kind: 'unsupported',
        name: 'Unsupported',
        message: `${unsupported.feature} not supported yet.`.replace(/^./, (c) => c.toUpperCase()),
        loc,
      },
      hints,
    });
  }

  const interp = new Interpreter({ source: code, mode: 'live', limits: LIVE_LIMITS });
  let stoppedAt: LiveResult['stoppedAt'] = null;
  try {
    interp.runTopLevel(program);
  } catch (e) {
    if (e instanceof NeedsRun) {
      stoppedAt = { line: e.node.loc!.start.line, reason: e.reason };
    } else {
      // The top-level code failed: report it, and draw nothing new.
      return noDrawing({ status: 'error', pending: null, error: errorFrom(e, interp).error, hints });
    }
  }

  const { frames, heap } = captureFrames(interp.frames.slice(0, 1), interp.globalScope, interp.idOf, interp.nodes);
  const step: Step = { index: 0, kind: 'done', loc: null, explanation: '', frames, heap, effects: [], outputCount: interp.output.length };

  const lines = new Map<number, LiveLineInfo>();
  const objects: Record<number, LiveObjectInfo> = {};
  const obj = (id: number): LiveObjectInfo => (objects[id] ??= { createdLine: null, createdSource: null, changes: [], attached: [] });

  for (const u of interp.liveUnits) {
    const line = u.node.loc!.start.line;
    const info: LiveLineInfo = lines.get(line) ?? { line, explanation: '', objIds: [], edges: [], vars: [] };
    info.explanation = u.explanation;
    const addId = (id: number) => {
      if (!info.objIds.includes(id)) info.objIds.push(id);
    };
    for (const e of u.effects) {
      switch (e.type) {
        case 'create':
          addId(e.objId);
          obj(e.objId).createdLine ??= line;
          obj(e.objId).createdSource ??= interp.sourceText(u.node);
          break;
        case 'prop-write':
          addId(e.objId);
          if (!info.edges.some((x) => x.objId === e.objId && x.key === e.key)) info.edges.push({ objId: e.objId, key: e.key });
          obj(e.objId).changes.push({ line, key: e.key, text: u.explanation });
          if (e.after.t === 'ref') {
            addId(e.after.id);
            obj(e.after.id).attached.push({ line, text: u.explanation });
          }
          if (e.before.t === 'ref' && (e.after.t !== 'ref' || e.after.id !== e.before.id)) {
            info.replaced = { objId: e.objId, key: e.key, oldId: e.before.id, newValue: e.after };
          }
          break;
        case 'declare':
        case 'assign': {
          if (!info.vars.includes(e.name)) info.vars.push(e.name);
          const v = e.type === 'declare' ? e.value : e.after;
          if (v.t === 'ref') {
            addId(v.id);
            obj(v.id).attached.push({ line, text: `${e.name} points to it (line ${line}).` });
          }
          break;
        }
        case 'index-write':
        case 'array-add':
        case 'array-remove':
        case 'array-change':
        case 'map-insert':
        case 'map-delete':
        case 'set-add':
        case 'set-delete':
          addId(e.objId);
          break;
      }
    }
    lines.set(line, info);
  }

  const lastUnit = interp.liveUnits[interp.liveUnits.length - 1];
  const drawnThroughLine = stoppedAt ? stoppedAt.line - 1 : (lastUnit?.node.loc?.end.line ?? program.loc?.end.line ?? 0);

  return {
    status: stoppedAt ? 'needs-run' : 'ok',
    step,
    lines: [...lines.values()].sort((a, b) => a.line - b.line),
    objects,
    allNodeIds: interp.nodes.map((n) => interp.idOf(n)),
    pending: null,
    stoppedAt,
    error: null,
    hints,
    drawnThroughLine,
  };
}
