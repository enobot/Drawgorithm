// A tree-walking interpreter for a documented subset of JavaScript.
// It runs the user's real code and records a step after each meaningful unit
// of work (a statement, a loop check, a call, a return), with plain-English
// explanations derived only from what actually happened.
import type * as ES from 'estree';
import type { ComputeDetail, Effect, Limits, OutputLine, SourceLoc, Step, StepKind, ValueSnap } from '../trace/types';
import {
  BLOCKED_GLOBALS,
  MAX_ARRAY_LENGTH,
  arrayMethod,
  instanceOf,
  isKnownNativeMethod,
  iterate,
  makeGlobals,
  mapMethod,
  numberMethod,
  setMethod,
  stringMethod,
  type Host,
} from './builtins';
import { fmt, toStr, type NodeNamer } from './describe';
import { EngineFailure, NeedsRun, ShortCircuit, UserThrow, type ErrorContext } from './errors';
import { COMPARISON_OPS, arrayIndex, binaryOp, toNumber, truthy, typeOf } from './ops';
import { locOf, sourceOf, unsupportedFeature } from './parse';
import { captureFrames } from './snapshot';
import {
  Binding,
  ClassValue,
  Closure,
  NativeFn,
  ObjRecord,
  Scope,
  isHeapValue,
  isListNode,
  isNextField,
  isTreeNode,
  nodeValueField,
  treeSides,
  type FnNode,
  type Frame,
  type HeapValue,
  type Unit,
  type Value,
} from './values';

type Completion =
  | { type: 'normal' }
  | { type: 'return'; value: Value }
  | { type: 'break'; label: string | null }
  | { type: 'continue'; label: string | null };

const NORMAL: Completion = { type: 'normal' };
const MAX_OUTPUT_LINES = 1000;
const MAX_OUTPUT_LINE_LENGTH = 2000;

export interface LiveUnit {
  node: ES.Node;
  effects: Effect[];
  explanation: string;
}

export interface InterpreterOptions {
  source: string;
  mode: 'run' | 'live';
  limits: Limits;
}

interface CallOptions {
  /** Called from a built-in such as map() or sort(): expression-bodied arrows run without steps. */
  quiet?: boolean;
  isNew?: boolean;
  fieldsFor?: ClassValue;
  /** Overrides the explanation of the call step (used for the entry call). */
  enterText?: string;
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export class Interpreter implements Host, NodeNamer {
  readonly steps: Step[] = [];
  readonly output: OutputLine[] = [];
  readonly frames: Frame[] = [];
  readonly units: Unit[] = [];
  readonly liveUnits: LiveUnit[] = [];
  /** Every TreeNode/ListNode created, in creation order. */
  readonly nodes: ObjRecord[] = [];
  readonly builtinScope: Scope;
  readonly globalScope: Scope;

  private ops = 0;
  private traceValues = 0;
  private nextFrameId = 1;
  private nextObjectId = 1;
  private ids = new WeakMap<object, number>();
  private objects = new Map<number, HeapValue>();
  private readonly src: string;
  private readonly mode: 'run' | 'live';
  private readonly limits: Limits;

  constructor(opts: InterpreterOptions) {
    this.src = opts.source;
    this.mode = opts.mode;
    this.limits = opts.limits;
    this.builtinScope = new Scope(null, 0, true);
    for (const [name, value] of makeGlobals(this)) {
      this.builtinScope.vars.set(name, new Binding(value, 'builtin', true));
    }
    this.globalScope = new Scope(this.builtinScope, 0, true);
    this.frames.push({
      id: 0,
      name: 'Program',
      label: 'Program',
      fnScope: this.globalScope,
      scope: this.globalScope,
      thisValue: undefined,
      loc: null,
    });
  }

  // ---------------------------------------------------------------- Host

  call(fn: Value, thisArg: Value, args: Value[], node: ES.Node): Value {
    return this.callValue(fn, thisArg, args, node, { quiet: true }, 'callback');
  }

  fail(kind: 'runtime' | 'unsupported' | 'limit', name: string, message: string, node: ES.Node): never {
    throw this.failure(kind, name, message, node);
  }

  effect(e: Effect, refs: HeapValue[] = []): void {
    const u = this.units[this.units.length - 1];
    if (!u) return;
    u.effects.push(e);
    u.refs.push(...refs);
  }

  snap(v: Value): ValueSnap {
    if (v === undefined) return { t: 'undefined' };
    if (v === null) return { t: 'null' };
    if (typeof v === 'number') return { t: 'number', v };
    if (typeof v === 'string') return { t: 'string', v };
    if (typeof v === 'boolean') return { t: 'boolean', v };
    if (v instanceof Closure || v instanceof NativeFn || v instanceof ClassValue) return { t: 'function', name: v.name };
    const u = this.units[this.units.length - 1];
    if (u) u.refs.push(v);
    return { t: 'ref', id: this.idOf(v) };
  }

  idOf = (obj: object): number => {
    let id = this.ids.get(obj);
    if (id === undefined) {
      id = this.nextObjectId++;
      this.ids.set(obj, id);
      this.objects.set(id, obj as HeapValue);
    }
    return id;
  };

  log(text: string, level: 'log' | 'error', node: ES.Node): void {
    if (this.output.length >= MAX_OUTPUT_LINES) {
      this.fail('limit', 'LimitError', `Stopped after ${MAX_OUTPUT_LINES.toLocaleString('en-US')} lines of console output.`, node);
    }
    const clipped =
      text.length > MAX_OUTPUT_LINE_LENGTH
        ? `${text.slice(0, MAX_OUTPUT_LINE_LENGTH)}… (line cut at ${MAX_OUTPUT_LINE_LENGTH} characters)`
        : text;
    this.output.push({ text: clipped, step: this.steps.length, level });
  }

  registerNode(obj: ObjRecord): void {
    this.nodes.push(obj);
    this.idOf(obj);
  }

  tick(node: ES.Node): void {
    if (++this.ops > this.limits.maxOps) {
      this.fail(
        'limit',
        'LimitError',
        `Stopped after ${this.limits.maxOps.toLocaleString('en-US')} operations. The code may be stuck in a loop, or doing more work than a step-by-step drawing can show.`,
        node,
      );
    }
  }

  // ---------------------------------------------------------------- naming

  nodeLabel(obj: ObjRecord): string {
    const field = nodeValueField(obj) ?? 'val';
    const val = obj.props.get(field);
    const shown = typeof val === 'string' ? JSON.stringify(val) : fmt(val, this, 2);
    const twins = this.nodes.filter((n) => n !== obj && n.className === obj.className && n.props.get(field) === val);
    return twins.length ? `node ${shown} (#${this.idOf(obj)})` : `node ${shown}`;
  }

  private f(v: Value): string {
    return fmt(v, this);
  }

  private fs(s: ValueSnap | undefined): string {
    if (!s) return 'undefined';
    switch (s.t) {
      case 'ref':
        return this.f(this.objects.get(s.id));
      case 'function':
        return `function ${s.name}`;
      case 'null':
        return 'null';
      case 'undefined':
        return 'undefined';
      case 'string':
        return JSON.stringify(s.v);
      default:
        return String(s.v);
    }
  }

  private short(text: string, max = 60): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
  }

  private code(node: ES.Node): string {
    return this.short(sourceOf(this.src, node));
  }

  /** A variable name that refers to this object right now, searching the active frame first. */
  private nameFor(id: number): string | null {
    const obj = this.objects.get(id);
    if (obj === undefined) return null;
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const fr = this.frames[i];
      for (let s: Scope | null = fr.scope; s && s !== this.builtinScope; s = s.parent) {
        for (const [name, b] of s.vars) if (b.initialized && b.value === obj) return name;
        if (s === fr.fnScope) break;
      }
      if (fr.thisValue instanceof ObjRecord) {
        for (const [k, v] of fr.thisValue.props) if (v === obj) return `this.${k}`;
      }
    }
    return null;
  }

  private objName(id: number, fallback: string): string {
    return this.nameFor(id) ?? fallback;
  }

  // ---------------------------------------------------------------- errors & limits

  failure(kind: EngineFailure['kind'], name: string, message: string, node: ES.Node | null): EngineFailure {
    const err = new EngineFailure(kind, name, message, node);
    err.context = this.captureContext();
    return err;
  }

  captureContext(): ErrorContext {
    const u = this.units[this.units.length - 1];
    const { frames, heap } = captureFrames(this.frames, this.globalScope, this.idOf, u ? u.refs : []);
    return { frames, heap, effects: u ? u.effects.slice() : [] };
  }

  // ---------------------------------------------------------------- steps

  private get frame(): Frame {
    return this.frames[this.frames.length - 1];
  }

  private begin(node: ES.Node): Unit {
    const u: Unit = { node, effects: [], values: new Map(), refs: [] };
    this.units.push(u);
    this.frame.loc = locOf(node);
    return u;
  }

  private drop(u: Unit): void {
    const i = this.units.lastIndexOf(u);
    if (i >= 0) this.units.length = i;
  }

  private end(
    u: Unit,
    kind: StepKind,
    explanation: string,
    extra: { outcome?: boolean; returning?: ValueSnap; loc?: SourceLoc } = {},
  ): void {
    this.drop(u);
    if (this.mode === 'live') {
      if (this.frames.length === 1) this.liveUnits.push({ node: u.node, effects: u.effects, explanation });
      return;
    }
    this.record(kind, extra.loc ?? locOf(u.node), explanation, u.effects, u.refs, extra);
  }

  record(
    kind: StepKind,
    loc: SourceLoc | null,
    explanation: string,
    effects: Effect[] = [],
    refs: HeapValue[] = [],
    extra: { outcome?: boolean; returning?: ValueSnap; result?: ValueSnap } = {},
  ): void {
    if (this.mode === 'live') return;
    if (this.steps.length >= this.limits.maxSteps) {
      throw this.failure(
        'limit',
        'LimitError',
        `Stopped after ${this.limits.maxSteps.toLocaleString('en-US')} steps. If you expected it to finish sooner, check that your loop condition eventually becomes false and that recursion reaches its base case.`,
        null,
      );
    }
    const { frames, heap, size } = captureFrames(this.frames, this.globalScope, this.idOf, refs);
    this.traceValues += size;
    if (this.traceValues > this.limits.maxTraceValues) {
      throw this.failure(
        'limit',
        'LimitError',
        `Stopped after ${this.steps.length.toLocaleString('en-US')} steps because the recorded drawing got too large (big data structures × many steps). Try a smaller input.`,
        null,
      );
    }
    if (extra.returning) frames[frames.length - 1].returning = extra.returning;
    const step: Step = {
      index: this.steps.length,
      kind,
      loc,
      explanation,
      frames,
      heap,
      effects,
      outputCount: this.output.length,
    };
    if (extra.outcome !== undefined) step.outcome = extra.outcome;
    if (extra.result) step.result = extra.result;
    this.steps.push(step);
  }

  private note(node: ES.Node, v: Value): void {
    const u = this.units[this.units.length - 1];
    if (u) u.values.set(node, v);
  }

  private valueOf(node: ES.Node): Value | typeof MISSING {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const vals = this.units[i].values;
      if (vals.has(node)) return vals.get(node);
    }
    return MISSING;
  }

  // ---------------------------------------------------------------- program

  runTopLevel(program: ES.Program): void {
    this.hoistVars(program.body, this.globalScope);
    this.hoistLexical(program.body, this.globalScope);
    const c = this.execStatements(program.body);
    if (c.type !== 'normal') {
      // break/continue/return outside their context are syntax errors; nothing to do.
    }
  }

  /** Calls the entry function chosen by Run with the problem inputs. */
  callEntry(fn: Closure, args: Value[], inputNames: string[]): Value {
    const named = inputNames.map((n, i) => `${n} = ${this.f(args[i])}`).join(' and ');
    const text = named ? `Run calls ${fn.name} with ${named} (the inputs from the problem panel).` : `Run calls ${fn.name}().`;
    return this.callFunction(fn, undefined, args, fn.node, { enterText: text });
  }

  // ---------------------------------------------------------------- hoisting

  private patternNames(p: ES.Pattern | null | undefined, out: string[] = []): string[] {
    if (!p) return out;
    switch (p.type) {
      case 'Identifier':
        out.push(p.name);
        break;
      case 'ArrayPattern':
        for (const e of p.elements) this.patternNames(e, out);
        break;
      case 'ObjectPattern':
        for (const prop of p.properties) this.patternNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
        break;
      case 'RestElement':
        this.patternNames(p.argument, out);
        break;
      case 'AssignmentPattern':
        this.patternNames(p.left, out);
        break;
    }
    return out;
  }

  private hoistVars(stmts: ES.Node[], fnScope: Scope): void {
    const visit = (n: ES.Node | null | undefined): void => {
      if (!n) return;
      switch (n.type) {
        case 'VariableDeclaration':
          if (n.kind === 'var') {
            for (const d of n.declarations) {
              for (const name of this.patternNames(d.id)) {
                if (!fnScope.vars.has(name)) fnScope.vars.set(name, new Binding(undefined, 'var', true));
              }
            }
          }
          break;
        case 'BlockStatement':
          n.body.forEach(visit);
          break;
        case 'IfStatement':
          visit(n.consequent);
          visit(n.alternate);
          break;
        case 'ForStatement':
          visit(n.init);
          visit(n.body);
          break;
        case 'ForInStatement':
        case 'ForOfStatement':
          visit(n.left);
          visit(n.body);
          break;
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'LabeledStatement':
          visit(n.body);
          break;
        case 'TryStatement':
          visit(n.block);
          visit(n.handler?.body);
          visit(n.finalizer);
          break;
        case 'SwitchStatement':
          for (const c of n.cases) c.consequent.forEach(visit);
          break;
      }
    };
    stmts.forEach(visit);
  }

  private hoistLexical(stmts: ES.Node[], scope: Scope): void {
    for (const s of stmts) {
      if (s.type === 'VariableDeclaration' && s.kind !== 'var') {
        if (s.kind !== 'let' && s.kind !== 'const')
          this.fail('unsupported', 'Unsupported', `${s.kind} declarations are not supported yet.`, s);
        for (const d of s.declarations) {
          for (const name of this.patternNames(d.id)) scope.vars.set(name, new Binding(undefined, s.kind, false));
        }
      } else if (s.type === 'ClassDeclaration' && s.id) {
        scope.vars.set(s.id.name, new Binding(undefined, 'class', false));
      } else if (s.type === 'FunctionDeclaration' && s.id) {
        scope.vars.set(s.id.name, new Binding(this.makeClosure(s, s.id.name, scope), 'function', true));
      }
    }
  }

  private makeClosure(node: FnNode, name: string, scope: Scope = this.frame.scope): Closure {
    const feature = unsupportedFeature(node);
    if (feature) this.fail('unsupported', 'Unsupported', `${capitalize(feature)} are not supported yet.`, node);
    return new Closure(node, scope, name, node.type === 'ArrowFunctionExpression' ? this.frame.thisValue : undefined);
  }

  // ---------------------------------------------------------------- statements

  private execStatements(stmts: ES.Node[]): Completion {
    for (const s of stmts) {
      const c = this.exec(s as ES.Statement, []);
      if (c.type !== 'normal') return c;
    }
    return NORMAL;
  }

  private execBlock(stmts: ES.Statement[], scope = new Scope(this.frame.scope, this.frame.id, false)): Completion {
    const outer = this.frame.scope;
    this.hoistLexical(stmts, scope);
    this.frame.scope = scope;
    try {
      return this.execStatements(stmts);
    } finally {
      this.frame.scope = outer;
    }
  }

  private exec(node: ES.Statement | ES.Declaration | ES.ModuleDeclaration, labels: string[]): Completion {
    this.tick(node);
    switch (node.type) {
      case 'VariableDeclaration':
        this.execDeclaration(node);
        return NORMAL;
      case 'FunctionDeclaration':
      case 'EmptyStatement':
        return NORMAL;
      case 'ClassDeclaration': {
        const u = this.begin(node);
        const cls = this.makeClass(node);
        const b = this.frame.scope.vars.get(cls.name);
        if (b) {
          b.value = cls;
          b.initialized = true;
        }
        this.end(u, 'declare', `Define class ${cls.name}.`);
        return NORMAL;
      }
      case 'ExpressionStatement':
        this.execExpressionStatement(node);
        return NORMAL;
      case 'BlockStatement':
        return this.execBlock(node.body);
      case 'IfStatement': {
        const u = this.begin(node.test);
        const t = this.evalExpr(node.test);
        const ok = truthy(t);
        const then = ok ? 'run the if block' : node.alternate ? 'go to the else branch' : 'skip the if block';
        this.end(u, 'condition', this.describeCheck(node.test, t, ok, then, u), { outcome: ok });
        if (ok) return this.exec(node.consequent, []);
        if (node.alternate) return this.exec(node.alternate, []);
        return NORMAL;
      }
      case 'ForStatement':
        return this.execFor(node, labels);
      case 'ForOfStatement':
      case 'ForInStatement':
        return this.execForEach(node, labels);
      case 'WhileStatement':
      case 'DoWhileStatement':
        return this.execWhile(node, labels);
      case 'ReturnStatement': {
        const u = this.begin(node);
        const v = node.argument ? this.evalExpr(node.argument) : undefined;
        const value = this.snap(v);
        this.effect({ type: 'return', frameId: this.frame.id, value });
        let text: string;
        if (!node.argument) text = `${this.frame.label} returns (no value, so undefined).`;
        else if (node.argument.type === 'Literal' || node.argument.type === 'Identifier') {
          text = `${this.frame.label} returns ${this.f(v)}.`;
        } else text = `${this.frame.label} returns ${this.computation(node.argument, v)}.`;
        const extra = this.effectPhrases(u.effects, true);
        this.end(u, 'return', extra ? `${text} ${extra}` : text, { returning: value });
        return { type: 'return', value: v };
      }
      case 'BreakStatement':
      case 'ContinueStatement': {
        const u = this.begin(node);
        const isBreak = node.type === 'BreakStatement';
        const label = node.label ? node.label.name : null;
        this.end(
          u,
          'jump',
          isBreak
            ? `break: leave the ${label ? `loop labeled ${label}` : 'loop'} right away.`
            : `continue: skip the rest of this pass and go to the next loop check.`,
        );
        return { type: isBreak ? 'break' : 'continue', label };
      }
      case 'ThrowStatement': {
        const u = this.begin(node);
        const v = this.evalExpr(node.argument);
        this.end(u, 'statement', `Throw ${this.describeThrown(v)}.`);
        const t = new UserThrow(v, node);
        t.context = this.captureContext();
        throw t;
      }
      case 'TryStatement':
        return this.execTry(node, labels);
      case 'SwitchStatement':
        return this.execSwitch(node, labels);
      case 'LabeledStatement': {
        const c = this.exec(node.body, [...labels, node.label.name]);
        if (c.type === 'break' && c.label === node.label.name) return NORMAL;
        return c;
      }
      default:
        return this.fail('unsupported', 'Unsupported', `${node.type} is not supported yet.`, node);
    }
  }

  private execDeclaration(node: ES.VariableDeclaration): void {
    const u = this.begin(node);
    const parts: string[] = [];
    for (const d of node.declarations) {
      const value = d.init ? this.evalNamed(d.init, d.id.type === 'Identifier' ? d.id.name : '') : undefined;
      if (d.id.type === 'Identifier') {
        const compute = d.init ? this.computeDetail(d.init, value) : undefined;
        this.declareName(d.id.name, value, node.kind as 'var' | 'let' | 'const', compute);
        parts.push(this.describeDeclare(d.id.name, d.init ?? null, value));
      } else {
        this.bindPattern(d.id, value, node.kind as 'var' | 'let' | 'const');
        parts.push(`Unpack ${d.init ? this.code(d.init) : 'undefined'} into ${this.code(d.id)}.`);
      }
    }
    const phrases = this.effectPhrases(u.effects, false);
    this.end(u, 'declare', [parts.join(' '), phrases].filter(Boolean).join(' '));
  }

  private execExpressionStatement(node: ES.ExpressionStatement): void {
    const u = this.begin(node);
    const e = node.expression;
    const v = this.evalExpr(e);
    let kind: StepKind = 'statement';
    let text: string;
    if (e.type === 'AssignmentExpression') {
      kind = 'assign';
      text = this.describeAssign(e, v, u);
    } else if (e.type === 'UpdateExpression') {
      kind = 'assign';
      text = this.describeUpdate(e, u);
    } else if (e.type === 'CallExpression') {
      text = this.describeCallStatement(e, v, u);
    } else {
      text = `Evaluate ${this.code(e)} → ${this.f(v)}.`;
    }
    this.end(u, kind, text);
  }

  private loopEnds(c: Completion, labels: string[]): 'break' | 'continue' | 'propagate' | 'next' {
    if (c.type === 'break') return c.label === null || labels.includes(c.label) ? 'break' : 'propagate';
    if (c.type === 'continue') return c.label === null || labels.includes(c.label) ? 'continue' : 'propagate';
    if (c.type === 'return') return 'propagate';
    return 'next';
  }

  private execFor(node: ES.ForStatement, labels: string[]): Completion {
    const outer = this.frame.scope;
    let loopScope = new Scope(outer, this.frame.id, false);
    this.frame.scope = loopScope;
    try {
      let perIteration: string[] = [];
      if (node.init) {
        if (node.init.type === 'VariableDeclaration') {
          this.hoistLexical([node.init], loopScope);
          this.execDeclaration(node.init);
          if (node.init.kind !== 'var') perIteration = node.init.declarations.flatMap((d) => this.patternNames(d.id));
        } else {
          const u = this.begin(node.init);
          const v = this.evalExpr(node.init);
          this.end(
            u,
            'assign',
            node.init.type === 'AssignmentExpression' ? this.describeAssign(node.init, v, u) : `Evaluate ${this.code(node.init)}.`,
          );
        }
      }
      for (;;) {
        if (node.test) {
          const u = this.begin(node.test);
          const t = this.evalExpr(node.test);
          const ok = truthy(t);
          this.end(u, 'loop-check', this.describeCheck(node.test, t, ok, ok ? 'run the loop body' : 'the loop ends', u), { outcome: ok });
          if (!ok) break;
        }
        const c = this.exec(node.body, []);
        const what = this.loopEnds(c, labels);
        if (what === 'break') break;
        if (what === 'propagate') return c;
        if (perIteration.length) {
          // let-loops get a fresh copy of their variables each pass, like real JavaScript.
          const next = new Scope(outer, this.frame.id, false);
          for (const name of perIteration) {
            const b = loopScope.vars.get(name)!;
            next.vars.set(name, new Binding(b.value, b.kind, b.initialized));
          }
          loopScope = next;
          this.frame.scope = next;
        }
        if (node.update) {
          const u = this.begin(node.update);
          const v = this.evalExpr(node.update);
          const text =
            node.update.type === 'UpdateExpression'
              ? this.describeUpdate(node.update, u)
              : node.update.type === 'AssignmentExpression'
                ? this.describeAssign(node.update, v, u)
                : `Evaluate ${this.code(node.update)}.`;
          this.end(u, 'assign', text);
        }
      }
      return NORMAL;
    } finally {
      this.frame.scope = outer;
    }
  }

  private loopHeadLoc(node: ES.ForOfStatement | ES.ForInStatement | ES.WhileStatement): SourceLoc {
    const loc = locOf(node);
    const body = locOf(node.body);
    return { ...loc, endLine: body.line, endColumn: body.column, end: body.start };
  }

  private execForEach(node: ES.ForOfStatement | ES.ForInStatement, labels: string[]): Completion {
    const outer = this.frame.scope;
    const source = this.evalExpr(node.right);
    const isOf = node.type === 'ForOfStatement';
    let items: Value[];
    let live: Value[] | null = null;
    if (isOf) {
      if (Array.isArray(source)) live = source;
      items = live ? [] : iterate(this, source, node.right);
    } else if (source instanceof ObjRecord) items = [...source.props.keys()];
    else if (Array.isArray(source) || typeof source === 'string') items = [...source].map((_, i) => String(i));
    else items = [];
    const what = this.code(node.right);
    const leftName = node.left.type === 'VariableDeclaration' ? this.code(node.left.declarations[0].id) : this.code(node.left);
    try {
      for (let i = 0; ; i++) {
        const done = live ? i >= live.length : i >= items.length;
        const u = this.begin(node.right);
        if (done) {
          this.end(u, 'loop-check', `${what} has no more ${isOf ? 'items' : 'keys'}, so the loop ends.`, {
            outcome: false,
            loc: this.loopHeadLoc(node),
          });
          break;
        }
        const value = live ? live[i] : items[i];
        if (live) this.effect({ type: 'index-read', objId: this.idOf(live), index: i, value: this.snap(value) }, [live]);
        const iterScope = new Scope(outer, this.frame.id, false);
        this.frame.scope = iterScope;
        if (node.left.type === 'VariableDeclaration') {
          const kind = node.left.kind as 'var' | 'let' | 'const';
          this.bindPattern(node.left.declarations[0].id, value, kind);
        } else {
          this.assignPattern(node.left, value);
        }
        this.end(u, 'loop-next', `Next ${isOf ? 'item' : 'key'} from ${what}: ${leftName} = ${this.f(value)}.`, {
          outcome: true,
          loc: this.loopHeadLoc(node),
        });
        const c = this.exec(node.body, []);
        const next = this.loopEnds(c, labels);
        if (next === 'break') break;
        if (next === 'propagate') return c;
      }
      return NORMAL;
    } finally {
      this.frame.scope = outer;
    }
  }

  private execWhile(node: ES.WhileStatement | ES.DoWhileStatement, labels: string[]): Completion {
    let first = node.type === 'DoWhileStatement';
    for (;;) {
      if (!first) {
        const u = this.begin(node.test);
        const t = this.evalExpr(node.test);
        const ok = truthy(t);
        this.end(u, 'loop-check', this.describeCheck(node.test, t, ok, ok ? 'run the loop body' : 'the loop ends', u), { outcome: ok });
        if (!ok) break;
      }
      first = false;
      const c = this.exec(node.body, []);
      const what = this.loopEnds(c, labels);
      if (what === 'break') break;
      if (what === 'propagate') return c;
    }
    return NORMAL;
  }

  private isCatchable(e: unknown): e is EngineFailure | UserThrow {
    return e instanceof UserThrow || (e instanceof EngineFailure && e.catchable);
  }

  private execTry(node: ES.TryStatement, labels: string[]): Completion {
    const depth = this.units.length;
    const scope = this.frame.scope;
    let result: Completion;
    try {
      result = this.exec(node.block, labels);
    } catch (e) {
      if (!node.handler || !this.isCatchable(e)) throw e;
      this.units.length = depth;
      this.frame.scope = scope;
      const errValue = e instanceof UserThrow ? e.value : this.errorObject(e);
      const catchScope = new Scope(scope, this.frame.id, false);
      this.frame.scope = catchScope;
      try {
        const u = this.begin(node.handler.param ?? node.handler);
        if (node.handler.param) this.bindPattern(node.handler.param, errValue, 'let');
        this.end(u, 'statement', `Caught ${this.describeThrown(errValue)}. Run the catch block.`);
        result = this.execBlock(node.handler.body.body);
      } finally {
        this.frame.scope = scope;
      }
    } finally {
      if (node.finalizer) {
        const f = this.exec(node.finalizer, labels);
        if (f.type !== 'normal') result = f;
      }
    }
    return result;
  }

  private errorObject(e: EngineFailure): ObjRecord {
    const obj = new ObjRecord(e.jsName);
    obj.props.set('name', e.jsName);
    obj.props.set('message', e.message);
    return obj;
  }

  private describeThrown(v: Value): string {
    if (v instanceof ObjRecord && v.props.has('message')) {
      return `${toStr(v.props.get('name') ?? v.className ?? 'Error')}: ${toStr(v.props.get('message'))}`;
    }
    return this.f(v);
  }

  private execSwitch(node: ES.SwitchStatement, labels: string[]): Completion {
    const u = this.begin(node.discriminant);
    const d = this.evalExpr(node.discriminant);
    let start = -1;
    for (let i = 0; i < node.cases.length; i++) {
      const test = node.cases[i].test;
      if (test && this.evalExpr(test) === d) {
        start = i;
        break;
      }
    }
    if (start < 0) start = node.cases.findIndex((c) => !c.test);
    const target =
      start < 0 ? 'no case matches' : node.cases[start].test ? `go to case ${this.code(node.cases[start].test!)}` : 'go to default';
    this.end(u, 'condition', `Switch on ${this.code(node.discriminant)} = ${this.f(d)}: ${target}.`);
    if (start < 0) return NORMAL;
    const scope = new Scope(this.frame.scope, this.frame.id, false);
    const outer = this.frame.scope;
    this.hoistLexical(
      node.cases.flatMap((c) => c.consequent),
      scope,
    );
    this.frame.scope = scope;
    try {
      for (let i = start; i < node.cases.length; i++) {
        const c = this.execStatements(node.cases[i].consequent);
        if (c.type === 'break' && (c.label === null || labels.includes(c.label))) return NORMAL;
        if (c.type !== 'normal') return c;
      }
      return NORMAL;
    } finally {
      this.frame.scope = outer;
    }
  }

  // ---------------------------------------------------------------- variables

  private lookup(name: string, node: ES.Node): Binding {
    const b = this.frame.scope.lookup(name);
    if (!b) {
      if (BLOCKED_GLOBALS.has(name)) {
        this.fail(
          'unsupported',
          'Unsupported',
          `${name} is not available here. Code runs in a sandbox with no access to the page, storage, network, timers or dates.`,
          node,
        );
      }
      this.fail('runtime', 'ReferenceError', `${name} is not defined`, node);
    }
    if (!b.initialized) this.fail('runtime', 'ReferenceError', `Cannot access '${name}' before initialization`, node);
    return b;
  }

  private readVar(node: ES.Identifier): Value {
    const b = this.lookup(node.name, node);
    if (b.kind !== 'builtin' && !(b.value instanceof Closure) && !(b.value instanceof ClassValue)) {
      const owner = this.frame.scope.owner(node.name)!;
      this.effect({ type: 'read', name: node.name, frameId: owner.frameId, value: this.snap(b.value) });
    }
    return b.value;
  }

  private declareName(name: string, value: Value, kind: 'var' | 'let' | 'const' | 'param', compute?: ComputeDetail): void {
    let scope = this.frame.scope;
    if (kind === 'var') while (!scope.isFunction && scope.parent) scope = scope.parent;
    const existing = scope.vars.get(name);
    if (existing) {
      existing.value = value;
      existing.initialized = true;
    } else {
      scope.vars.set(name, new Binding(value, kind, true));
    }
    this.effect({ type: 'declare', name, frameId: this.frame.id, value: this.snap(value), ...(compute ? { compute } : {}) });
  }

  private assignVar(name: string, value: Value, node: ES.Node, compute?: ComputeDetail): void {
    const scope = this.frame.scope.owner(name);
    if (!scope) {
      this.fail('runtime', 'ReferenceError', `${name} is not defined. Declare it first with let or const.`, node);
    }
    const b = scope.vars.get(name)!;
    if (!b.initialized) this.fail('runtime', 'ReferenceError', `Cannot access '${name}' before initialization`, node);
    if (b.kind === 'const') this.fail('runtime', 'TypeError', `Assignment to constant variable '${name}'.`, node);
    if (b.kind === 'builtin') this.fail('runtime', 'TypeError', `${name} is built in and cannot be reassigned here.`, node);
    const before = this.snap(b.value);
    b.value = value;
    this.effect({ type: 'assign', name, frameId: scope.frameId, before, after: this.snap(value), ...(compute ? { compute } : {}) });
  }

  private bindPattern(p: ES.Pattern, value: Value, kind: 'var' | 'let' | 'const' | 'param'): void {
    switch (p.type) {
      case 'Identifier':
        this.declareName(p.name, value, kind);
        return;
      case 'AssignmentPattern':
        this.bindPattern(
          p.left,
          value === undefined ? this.evalNamed(p.right, p.left.type === 'Identifier' ? p.left.name : '') : value,
          kind,
        );
        return;
      case 'ArrayPattern': {
        const items = iterate(this, value, p);
        p.elements.forEach((el, i) => {
          if (!el) return;
          if (el.type === 'RestElement') this.bindPattern(el.argument, items.slice(i), kind);
          else this.bindPattern(el, items[i], kind);
        });
        return;
      }
      case 'ObjectPattern': {
        const used: string[] = [];
        for (const prop of p.properties) {
          if (prop.type === 'RestElement') {
            const rest = new ObjRecord(null);
            if (value instanceof ObjRecord) for (const [k, v] of value.props) if (!used.includes(k)) rest.props.set(k, v);
            this.bindPattern(prop.argument, rest, kind);
          } else {
            const key = this.propertyKey(prop);
            used.push(key);
            this.bindPattern(prop.value, this.getMember(value, key, prop), kind);
          }
        }
        return;
      }
      default:
        this.fail('unsupported', 'Unsupported', `This kind of declaration (${p.type}) is not supported yet.`, p);
    }
  }

  private assignPattern(p: ES.Pattern, value: Value): void {
    switch (p.type) {
      case 'Identifier':
        this.assignVar(p.name, value, p);
        return;
      case 'MemberExpression': {
        const obj = this.evalExpr(p.object as ES.Expression);
        const key = p.computed ? this.evalExpr(p.property as ES.Expression) : (p.property as ES.Identifier).name;
        this.setMember(obj, key, value, p);
        return;
      }
      case 'AssignmentPattern':
        this.assignPattern(p.left, value === undefined ? this.evalExpr(p.right) : value);
        return;
      case 'ArrayPattern': {
        const items = iterate(this, value, p);
        p.elements.forEach((el, i) => {
          if (!el) return;
          if (el.type === 'RestElement') this.assignPattern(el.argument, items.slice(i));
          else this.assignPattern(el, items[i]);
        });
        return;
      }
      case 'ObjectPattern':
        for (const prop of p.properties) {
          if (prop.type === 'RestElement')
            this.fail('unsupported', 'Unsupported', 'Rest in object destructuring assignment is not supported yet.', prop);
          else this.assignPattern(prop.value, this.getMember(value, this.propertyKey(prop), prop));
        }
        return;
      default:
        this.fail('unsupported', 'Unsupported', `Assigning to ${p.type} is not supported yet.`, p);
    }
  }

  private propertyKey(prop: ES.Property | ES.AssignmentProperty | ES.MethodDefinition | ES.PropertyDefinition): string {
    if (prop.computed) return toStr(this.evalExpr(prop.key as ES.Expression));
    if (prop.key.type === 'Identifier') return prop.key.name;
    if (prop.key.type === 'Literal') return String(prop.key.value);
    return this.fail('unsupported', 'Unsupported', 'This kind of property name is not supported yet.', prop.key);
  }

  // ---------------------------------------------------------------- expressions

  /** Evaluates a function/class expression with an inferred name (const f = () => ...). */
  private evalNamed(node: ES.Expression, name: string): Value {
    if ((node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && !('id' in node && node.id)) {
      this.tick(node);
      return this.makeClosure(node, name);
    }
    if (node.type === 'ClassExpression' && !node.id) {
      this.tick(node);
      return this.makeClass(node, name);
    }
    return this.evalExpr(node);
  }

  evalExpr(node: ES.Expression | ES.SpreadElement | ES.Super | ES.PrivateIdentifier | ES.Pattern): Value {
    this.tick(node);
    let v: Value;
    switch (node.type) {
      case 'Literal': {
        const feature = unsupportedFeature(node);
        if (feature) this.fail('unsupported', 'Unsupported', `${capitalize(feature)} are not supported yet.`, node);
        return node.value as Value;
      }
      case 'Identifier':
        v = this.readVar(node);
        break;
      case 'TemplateLiteral': {
        let s = '';
        node.quasis.forEach((q, i) => {
          s += q.value.cooked ?? q.value.raw;
          if (i < node.expressions.length) s += toStr(this.evalExpr(node.expressions[i]));
        });
        return s;
      }
      case 'ArrayExpression': {
        const arr: Value[] = [];
        for (const el of node.elements) {
          if (el === null) arr.push(undefined);
          else if (el.type === 'SpreadElement') arr.push(...iterate(this, this.evalExpr(el.argument), el));
          else arr.push(this.evalExpr(el));
          if (arr.length > MAX_ARRAY_LENGTH) this.fail('limit', 'RangeError', 'That array is too large for Drawgorithms.', node);
        }
        return arr;
      }
      case 'ObjectExpression':
        return this.evalObject(node);
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.makeClosure(node, node.type === 'FunctionExpression' && node.id ? node.id.name : '');
      case 'ClassExpression':
        return this.makeClass(node);
      case 'UnaryExpression':
        v = this.evalUnary(node);
        break;
      case 'UpdateExpression':
        v = this.evalUpdate(node);
        break;
      case 'BinaryExpression': {
        if (node.left.type === 'PrivateIdentifier')
          return this.fail('unsupported', 'Unsupported', 'Private fields are not supported yet.', node);
        const l = this.evalExpr(node.left);
        const r = this.evalExpr(node.right);
        if (node.operator === 'in') {
          if (r instanceof ObjRecord) v = r.props.has(toStr(l));
          else if (Array.isArray(r)) v = arrayIndex(l) !== null && (arrayIndex(l) as number) < r.length;
          else if (r instanceof Map || r instanceof Set) v = false;
          else return this.fail('runtime', 'TypeError', `Cannot use 'in' operator to search for '${toStr(l)}' in ${toStr(r)}`, node);
        } else if (node.operator === 'instanceof') {
          v = instanceOf(l, r);
        } else {
          v = binaryOp(node.operator, l, r);
        }
        if (COMPARISON_OPS.has(node.operator)) {
          this.effect({ type: 'compare', text: `${this.f(l)} ${node.operator} ${this.f(r)}`, result: v as boolean });
        }
        break;
      }
      case 'LogicalExpression': {
        const l = this.evalExpr(node.left);
        if (node.operator === '&&') v = truthy(l) ? this.evalExpr(node.right) : l;
        else if (node.operator === '||') v = truthy(l) ? l : this.evalExpr(node.right);
        else v = l === null || l === undefined ? this.evalExpr(node.right) : l;
        break;
      }
      case 'ConditionalExpression':
        v = truthy(this.evalExpr(node.test)) ? this.evalExpr(node.consequent) : this.evalExpr(node.alternate);
        break;
      case 'AssignmentExpression':
        v = this.evalAssign(node);
        break;
      case 'MemberExpression':
        v = this.evalMember(node);
        break;
      case 'ChainExpression':
        try {
          v = this.evalExpr(node.expression);
        } catch (e) {
          if (e instanceof ShortCircuit) v = undefined;
          else throw e;
        }
        break;
      case 'CallExpression':
        v = this.evalCall(node);
        break;
      case 'NewExpression':
        v = this.evalNew(node);
        break;
      case 'SequenceExpression':
        v = undefined;
        for (const e of node.expressions) v = this.evalExpr(e);
        break;
      case 'ThisExpression':
        return this.frame.thisValue;
      default: {
        const feature = unsupportedFeature(node);
        return this.fail(
          'unsupported',
          'Unsupported',
          `${capitalize(feature ?? node.type)} ${feature ? 'are' : 'is'} not supported yet.`,
          node,
        );
      }
    }
    this.note(node, v);
    return v;
  }

  private evalObject(node: ES.ObjectExpression): Value {
    const obj = new ObjRecord(null);
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') {
        const src = this.evalExpr(prop.argument);
        if (src instanceof ObjRecord) for (const [k, v] of src.props) obj.props.set(k, v);
        else if (Array.isArray(src)) src.forEach((v, i) => obj.props.set(String(i), v));
        continue;
      }
      if (prop.kind !== 'init') this.fail('unsupported', 'Unsupported', 'Getters and setters are not supported yet.', prop);
      const key = this.propertyKey(prop);
      const valueNode = prop.value as ES.Expression;
      obj.props.set(key, this.evalNamed(valueNode, key));
    }
    return obj;
  }

  private evalUnary(node: ES.UnaryExpression): Value {
    if (node.operator === 'typeof' && node.argument.type === 'Identifier' && !this.frame.scope.lookup(node.argument.name)) {
      return 'undefined';
    }
    if (node.operator === 'delete') {
      const arg = node.argument;
      if (arg.type !== 'MemberExpression') return true;
      const obj = this.evalExpr(arg.object as ES.Expression);
      const key = arg.computed ? toStr(this.evalExpr(arg.property as ES.Expression)) : (arg.property as ES.Identifier).name;
      if (obj instanceof ObjRecord && !obj.builtin) {
        const before = this.snap(obj.props.get(key));
        obj.props.delete(key);
        this.effect({ type: 'prop-write', objId: this.idOf(obj), key, before, after: { t: 'undefined' } }, [obj]);
        return true;
      }
      return this.fail('unsupported', 'Unsupported', 'delete only works on plain object properties here.', node);
    }
    const v = this.evalExpr(node.argument);
    switch (node.operator) {
      case '!':
        return !truthy(v);
      case '-':
        return -toNumber(v);
      case '+':
        return toNumber(v);
      case '~':
        return ~toNumber(v);
      case 'typeof':
        return typeOf(v);
      case 'void':
        return undefined;
    }
    return this.fail('unsupported', 'Unsupported', `The ${node.operator} operator is not supported yet.`, node);
  }

  private evalUpdate(node: ES.UpdateExpression): Value {
    const delta = node.operator === '++' ? 1 : -1;
    const arg = node.argument;
    if (arg.type === 'Identifier') {
      const old = toNumber(this.readVar(arg));
      this.assignVar(arg.name, old + delta, node);
      return node.prefix ? old + delta : old;
    }
    if (arg.type === 'MemberExpression') {
      const obj = this.evalExpr(arg.object as ES.Expression);
      const key = arg.computed ? this.evalExpr(arg.property as ES.Expression) : (arg.property as ES.Identifier).name;
      const old = toNumber(this.getMember(obj, key, arg));
      this.setMember(obj, key, old + delta, node);
      return node.prefix ? old + delta : old;
    }
    return this.fail('unsupported', 'Unsupported', 'This kind of ++/-- target is not supported.', node);
  }

  private evalAssign(node: ES.AssignmentExpression): Value {
    const op = node.operator;
    const left = node.left;
    if (left.type === 'Identifier') {
      if (op === '=') {
        const v = this.evalNamed(node.right, left.name);
        this.assignVar(left.name, v, node, this.computeDetail(node.right, v));
        return v;
      }
      if (op === '&&=' || op === '||=' || op === '??=') {
        const cur = this.readVar(left);
        const go = op === '&&=' ? truthy(cur) : op === '||=' ? !truthy(cur) : cur === null || cur === undefined;
        if (!go) return cur;
        const v = this.evalExpr(node.right);
        this.assignVar(left.name, v, node);
        return v;
      }
      const cur = this.readVar(left);
      const r = this.evalExpr(node.right);
      const v = binaryOp(op.slice(0, -1), cur, r);
      this.assignVar(left.name, v, node, {
        expression: `${left.name} ${op.slice(0, -1)} ${this.code(node.right)}`,
        substituted: `${this.f(cur)} ${op.slice(0, -1)} ${this.f(r)}`,
        result: this.f(v),
      });
      return v;
    }
    if (left.type === 'MemberExpression') {
      const obj = this.evalExpr(left.object as ES.Expression);
      const key = left.computed ? this.evalExpr(left.property as ES.Expression) : (left.property as ES.Identifier).name;
      if (op === '=') {
        const v = this.evalNamed(node.right, typeof key === 'string' ? key : '');
        this.setMember(obj, key, v, node);
        return v;
      }
      const cur = this.getMember(obj, key, left);
      if (op === '&&=' || op === '||=' || op === '??=') {
        const go = op === '&&=' ? truthy(cur) : op === '||=' ? !truthy(cur) : cur === null || cur === undefined;
        if (!go) return cur;
        const v = this.evalExpr(node.right);
        this.setMember(obj, key, v, node);
        return v;
      }
      const v = binaryOp(op.slice(0, -1), cur, this.evalExpr(node.right));
      this.setMember(obj, key, v, node);
      return v;
    }
    if (op !== '=') this.fail('unsupported', 'Unsupported', 'Compound assignment to a pattern is not supported.', node);
    const v = this.evalExpr(node.right);
    this.assignPattern(left, v);
    return v;
  }

  private evalMember(node: ES.MemberExpression): Value {
    if (node.object.type === 'Super') return this.fail('unsupported', 'Unsupported', 'super is not supported yet.', node);
    const obj = this.evalExpr(node.object);
    if (node.optional && (obj === null || obj === undefined)) throw new ShortCircuit();
    if (node.property.type === 'PrivateIdentifier')
      return this.fail('unsupported', 'Unsupported', 'Private fields are not supported yet.', node);
    const key = node.computed ? this.evalExpr(node.property) : (node.property as ES.Identifier).name;
    return this.getMember(obj, key, node);
  }

  getMember(obj: Value, key: Value, node: ES.Node, forCall = false): Value {
    if (obj === null || obj === undefined) {
      const what =
        node.type === 'MemberExpression'
          ? ` (${this.code((node as ES.MemberExpression).object)} is ${obj === null ? 'null' : 'undefined'})`
          : '';
      return this.fail(
        'runtime',
        'TypeError',
        `Cannot read properties of ${obj === null ? 'null' : 'undefined'} (reading '${toStr(key)}')${what}`,
        node,
      );
    }
    if (typeof obj === 'string') {
      const idx = arrayIndex(key);
      if (idx !== null) {
        const ch = obj[idx];
        if (!forCall && node.type === 'MemberExpression' && (node as ES.MemberExpression).object.type === 'Identifier') {
          const name = ((node as ES.MemberExpression).object as ES.Identifier).name;
          this.effect({ type: 'char-read', name, index: idx, value: this.snap(ch) });
        }
        return ch;
      }
      if (key === 'length') return obj.length;
      return stringMethod(this, obj, toStr(key));
    }
    if (typeof obj === 'number') return numberMethod(obj, toStr(key));
    if (typeof obj === 'boolean') return key === 'toString' ? new NativeFn('toString', () => String(obj)) : undefined;
    if (Array.isArray(obj)) {
      const idx = arrayIndex(key);
      if (idx !== null) {
        const v = obj[idx];
        this.effect({ type: 'index-read', objId: this.idOf(obj), index: idx, value: this.snap(v) }, [obj]);
        return v;
      }
      if (key === 'length') return obj.length;
      return arrayMethod(this, obj, toStr(key));
    }
    if (obj instanceof Map) return key === 'size' ? obj.size : mapMethod(this, obj, toStr(key));
    if (obj instanceof Set) return key === 'size' ? obj.size : setMethod(this, obj, toStr(key));
    if (obj instanceof ObjRecord) {
      const k = toStr(key);
      if (obj.builtin) {
        if (obj.props.has(k)) return obj.props.get(k);
        const real = ({ Math, console, JSON } as Record<string, object>)[obj.className ?? ''];
        if (real && k in real) this.fail('unsupported', 'Unsupported', `${obj.className}.${k} is not supported yet.`, node);
        return undefined;
      }
      if (obj.props.has(k)) {
        const v = obj.props.get(k);
        this.effect({ type: 'prop-read', objId: this.idOf(obj), key: k, value: this.snap(v) }, [obj]);
        return v;
      }
      const method = obj.proto?.methods.get(k);
      if (method) return method;
      if (k === 'hasOwnProperty') return new NativeFn('hasOwnProperty', (_t, a) => obj.props.has(toStr(a[0])));
      return undefined;
    }
    if (obj instanceof NativeFn) {
      const k = toStr(key);
      if (obj.statics.has(k)) return obj.statics.get(k);
      if (k === 'name') return obj.name;
      const real = ({ Array, Number, String, Object, Map, Set } as Record<string, object>)[obj.name];
      if (real && k in real) this.fail('unsupported', 'Unsupported', `${obj.name}.${k} is not supported yet.`, node);
      return undefined;
    }
    if (obj instanceof Closure) {
      if (key === 'name') return obj.name;
      if (key === 'length') return obj.node.params.length;
      if (key === 'call' || key === 'apply' || key === 'bind') {
        this.fail('unsupported', 'Unsupported', `.${key}() on functions is not supported yet.`, node);
      }
      return undefined;
    }
    if (obj instanceof ClassValue) return key === 'name' ? obj.name : undefined;
    return undefined;
  }

  setMember(obj: Value, key: Value, value: Value, node: ES.Node): void {
    if (obj === null || obj === undefined) {
      const target =
        node.type === 'AssignmentExpression' && (node as ES.AssignmentExpression).left.type === 'MemberExpression'
          ? ` (${this.code(((node as ES.AssignmentExpression).left as ES.MemberExpression).object)} is ${obj === null ? 'null' : 'undefined'})`
          : '';
      this.fail(
        'runtime',
        'TypeError',
        `Cannot set properties of ${obj === null ? 'null' : 'undefined'} (setting '${toStr(key)}')${target}`,
        node,
      );
    }
    if (Array.isArray(obj)) {
      const idx = arrayIndex(key);
      if (idx !== null) {
        if (idx >= MAX_ARRAY_LENGTH) this.fail('limit', 'RangeError', 'That index is too large for Drawgorithms.', node);
        const before = this.snap(obj[idx]);
        while (obj.length < idx) obj.push(undefined);
        obj[idx] = value;
        this.effect({ type: 'index-write', objId: this.idOf(obj), index: idx, before, after: this.snap(value) }, [obj]);
        return;
      }
      if (key === 'length') {
        const n = toNumber(value);
        if (!Number.isInteger(n) || n < 0 || n > MAX_ARRAY_LENGTH) this.fail('runtime', 'RangeError', 'Invalid array length', node);
        while (obj.length < n) obj.push(undefined);
        obj.length = n;
        this.effect({ type: 'array-change', objId: this.idOf(obj), method: 'length' }, [obj]);
        return;
      }
      this.fail('unsupported', 'Unsupported', `Only number indexes can be set on arrays (tried ${this.f(key)}).`, node);
    }
    if (obj instanceof ObjRecord && !obj.builtin) {
      const k = toStr(key);
      const before = this.snap(obj.props.get(k));
      obj.props.set(k, value);
      this.effect({ type: 'prop-write', objId: this.idOf(obj), key: k, before, after: this.snap(value) }, [obj]);
      return;
    }
    if (obj instanceof Map) {
      this.fail(
        'unsupported',
        'Unsupported',
        `map[${this.f(key)}] = … sets a plain property, not a Map entry. Use map.set(key, value).`,
        node,
      );
    }
    if (obj instanceof Set) this.fail('unsupported', 'Unsupported', 'Use set.add(value) to put values in a Set.', node);
    if (typeof obj === 'string')
      this.fail('runtime', 'TypeError', `Cannot assign to index ${toStr(key)} of a string. Strings cannot be changed in place.`, node);
    this.fail('runtime', 'TypeError', `Cannot set property '${toStr(key)}' on ${this.f(obj)}.`, node);
  }

  private evalArgs(args: (ES.Expression | ES.SpreadElement)[]): Value[] {
    const out: Value[] = [];
    for (const a of args) {
      if (a.type === 'SpreadElement') out.push(...iterate(this, this.evalExpr(a.argument), a));
      else out.push(this.evalExpr(a));
    }
    return out;
  }

  private evalCall(node: ES.SimpleCallExpression): Value {
    const callee = node.callee;
    let fn: Value;
    let thisArg: Value;
    if (callee.type === 'Super') return this.fail('unsupported', 'Unsupported', 'super() is not supported yet.', node);
    if (callee.type === 'MemberExpression') {
      if (callee.object.type === 'Super') return this.fail('unsupported', 'Unsupported', 'super is not supported yet.', node);
      const obj = this.evalExpr(callee.object);
      if (callee.optional && (obj === null || obj === undefined)) throw new ShortCircuit();
      if (callee.property.type === 'PrivateIdentifier')
        return this.fail('unsupported', 'Unsupported', 'Private methods are not supported yet.', node);
      const key = callee.computed ? toStr(this.evalExpr(callee.property)) : (callee.property as ES.Identifier).name;
      fn = this.getMember(obj, key, callee, true);
      thisArg = obj;
      if (fn === undefined && isKnownNativeMethod(obj, key)) {
        const kind = Array.isArray(obj)
          ? 'Array'
          : typeof obj === 'string'
            ? 'String'
            : obj instanceof Map
              ? 'Map'
              : obj instanceof Set
                ? 'Set'
                : 'Number';
        this.fail('unsupported', 'Unsupported', `${kind} method .${key}() is not supported yet.`, callee);
      }
    } else {
      fn = this.evalExpr(callee);
      thisArg = undefined;
    }
    if (node.optional && (fn === null || fn === undefined)) throw new ShortCircuit();
    const args = this.evalArgs(node.arguments);
    return this.callValue(fn, thisArg, args, node, {}, this.code(callee));
  }

  private callValue(fn: Value, thisArg: Value, args: Value[], node: ES.Node, opts: CallOptions, displayName: string): Value {
    if (fn instanceof Closure) return this.callFunction(fn, thisArg, args, node, opts);
    if (fn instanceof NativeFn) {
      if (!fn.call) return this.fail('runtime', 'TypeError', `${displayName} is not a function`, node);
      return fn.call(thisArg, args, node);
    }
    if (fn instanceof ClassValue)
      return this.fail('runtime', 'TypeError', `Class constructor ${fn.name} cannot be invoked without 'new'`, node);
    return this.fail('runtime', 'TypeError', `${displayName} is not a function`, node);
  }

  private evalNew(node: ES.NewExpression): Value {
    const ctor = this.evalExpr(node.callee as ES.Expression);
    const args = this.evalArgs(node.arguments);
    let result: Value;
    if (ctor instanceof NativeFn) {
      if (!ctor.construct) return this.fail('runtime', 'TypeError', `${ctor.name} is not a constructor`, node);
      result = ctor.construct(args, node);
    } else if (ctor instanceof ClassValue) {
      const obj = new ObjRecord(ctor.name, ctor);
      if (ctor.ctor) {
        this.callFunction(ctor.ctor, obj, args, node, { isNew: true, fieldsFor: ctor });
      } else {
        const saved = this.frame.thisValue;
        this.frame.thisValue = obj;
        try {
          this.initFields(ctor, obj);
        } finally {
          this.frame.thisValue = saved;
        }
      }
      result = obj;
    } else if (ctor instanceof Closure) {
      if (ctor.node.type === 'ArrowFunctionExpression')
        return this.fail('runtime', 'TypeError', `${ctor.name || 'This arrow function'} is not a constructor`, node);
      const obj = new ObjRecord(ctor.name || null);
      const r = this.callFunction(ctor, obj, args, node, { isNew: true });
      result = isHeapValue(r) ? r : obj;
    } else {
      return this.fail('runtime', 'TypeError', `${this.code(node.callee)} is not a constructor`, node);
    }
    if (result instanceof ObjRecord && (isTreeNode(result) || isListNode(result)) && !this.nodes.includes(result)) {
      this.registerNode(result);
    }
    if (isHeapValue(result)) {
      const className = Array.isArray(result)
        ? 'Array'
        : result instanceof Map
          ? 'Map'
          : result instanceof Set
            ? 'Set'
            : (result.className ?? 'Object');
      this.effect({ type: 'create', objId: this.idOf(result), className }, [result]);
    }
    this.note(node, result);
    return result;
  }

  private initFields(cls: ClassValue, obj: ObjRecord): void {
    for (const field of cls.fields) {
      const key = this.propertyKey(field);
      obj.props.set(key, field.value ? this.evalExpr(field.value as ES.Expression) : undefined);
    }
  }

  private makeClass(node: ES.ClassDeclaration | ES.ClassExpression, inferred = ''): ClassValue {
    const feature = unsupportedFeature(node);
    if (feature) this.fail('unsupported', 'Unsupported', `${capitalize(feature)} is not supported yet.`, node);
    const name = node.id?.name ?? inferred ?? 'AnonymousClass';
    const cls = new ClassValue(name, this.frame.scope);
    for (const el of node.body.body) {
      if (el.type === 'MethodDefinition') {
        const f = unsupportedFeature(el);
        if (f) this.fail('unsupported', 'Unsupported', `${capitalize(f)} are not supported yet.`, el);
        const key = this.propertyKey(el);
        const closure = this.makeClosure(el.value, el.kind === 'constructor' ? name : `${name}.${key}`);
        if (el.kind === 'constructor') {
          closure.isConstructorOf = cls;
          cls.ctor = closure;
        } else cls.methods.set(key, closure);
      } else if (el.type === 'PropertyDefinition') {
        const f = unsupportedFeature(el);
        if (f) this.fail('unsupported', 'Unsupported', `${capitalize(f)} are not supported yet.`, el);
        cls.fields.push(el);
      } else {
        this.fail('unsupported', 'Unsupported', 'Static blocks are not supported yet.', el);
      }
    }
    return cls;
  }

  // ---------------------------------------------------------------- calls

  private headerLoc(node: FnNode): SourceLoc {
    const loc = locOf(node);
    const body = locOf(node.body);
    if (node.body.type === 'BlockStatement') return { ...loc, endLine: body.line, endColumn: body.column + 1, end: body.start + 1 };
    return loc;
  }

  private closingLoc(body: ES.BlockStatement): SourceLoc {
    const loc = locOf(body);
    return {
      line: loc.endLine,
      column: Math.max(0, loc.endColumn - 1),
      endLine: loc.endLine,
      endColumn: loc.endColumn,
      start: loc.end - 1,
      end: loc.end,
    };
  }

  private callFunction(fn: Closure, thisArg: Value, args: Value[], callNode: ES.Node, opts: CallOptions): Value {
    if (this.mode === 'live' && !opts.isNew) {
      throw new NeedsRun(
        callNode,
        `${fn.name || 'This function'}() runs when you press Run. Live Build only draws what top-level code builds.`,
      );
    }
    if (this.frames.length > this.limits.maxDepth) {
      this.fail(
        'limit',
        'RangeError',
        `More than ${this.limits.maxDepth} nested calls. Check that your recursion has a base case and that each call moves toward it.`,
        callNode,
      );
    }
    const node = fn.node;
    const id = this.nextFrameId++;
    const fnScope = new Scope(fn.scope, id, true);
    const name = fn.name || 'anonymous';
    const label = opts.isNew
      ? `new ${name}(${args.map((a) => this.f(a)).join(', ')})`
      : `${name}(${args.map((a) => this.f(a)).join(', ')})`;
    const frame: Frame = {
      id,
      name,
      label,
      fnScope,
      scope: fnScope,
      thisValue: node.type === 'ArrowFunctionExpression' ? fn.thisValue : thisArg,
      loc: this.headerLoc(node),
    };
    const quiet = !!opts.quiet && node.body.type !== 'BlockStatement';
    const enterText = opts.enterText ?? this.describeEnter(fn, args, callNode, label);
    this.frames.push(frame);
    const unitDepth = this.units.length;
    try {
      node.params.forEach((p, i) => {
        if (p.type === 'RestElement') this.bindPattern(p.argument, args.slice(i), 'param');
        else this.bindPattern(p, args[i], 'param');
      });
      if (opts.fieldsFor && thisArg instanceof ObjRecord) this.initFields(opts.fieldsFor, thisArg);
      if (node.body.type === 'BlockStatement') {
        this.hoistVars(node.body.body, fnScope);
        this.hoistLexical(node.body.body, fnScope);
      }
      if (!quiet) {
        this.record('enter', this.headerLoc(node), enterText, [{ type: 'call', callee: label, frameId: id }], args.filter(isHeapValue));
      }
      if (node.body.type !== 'BlockStatement') {
        const u = this.begin(node.body);
        const v = this.evalExpr(node.body);
        if (quiet) this.drop(u);
        else {
          const value = this.snap(v);
          this.effect({ type: 'return', frameId: id, value });
          this.end(u, 'return', `${label} returns ${this.computation(node.body, v)}.`, { returning: value });
        }
        return v;
      }
      const c = this.execStatements(node.body.body);
      if (c.type === 'return') return c.value;
      if (!quiet) {
        const text = opts.isNew
          ? `${label} finishes building the new ${name}.`
          : `${label} reaches its end without a return statement, so it returns undefined.`;
        this.record('return', this.closingLoc(node.body), text, [{ type: 'return', frameId: id, value: { t: 'undefined' } }], [], {
          returning: opts.isNew ? this.snap(thisArg) : { t: 'undefined' },
        });
      }
      return undefined;
    } finally {
      this.frames.pop();
      this.units.length = unitDepth;
    }
  }

  // ---------------------------------------------------------------- explanations

  /** `a + b` with values put in: `2 + 5`. Returns null when nothing useful can be substituted. */
  private substitute(node: ES.Node): string {
    const val = (n: ES.Node): string => {
      const v = this.valueOf(n);
      return v === MISSING ? this.code(n) : this.f(v);
    };
    const wrap = (n: ES.Node): string => {
      const s = this.substitute(n);
      return n.type === 'BinaryExpression' || n.type === 'LogicalExpression' ? `(${s})` : s;
    };
    switch (node.type) {
      case 'Literal':
        return this.code(node);
      case 'Identifier':
      case 'MemberExpression':
        return val(node);
      case 'BinaryExpression':
      case 'LogicalExpression':
        if (node.type === 'LogicalExpression' && this.valueOf(node.right) === MISSING) {
          return `${wrap(node.left)} ${node.operator} …`;
        }
        return `${wrap(node.left as ES.Node)} ${node.operator} ${wrap(node.right)}`;
      case 'UnaryExpression':
        return node.operator === 'typeof' ? `typeof ${wrap(node.argument)}` : `${node.operator}${wrap(node.argument)}`;
      case 'CallExpression':
        if (node.callee.type === 'Super') return this.code(node);
        return `${this.code(node.callee)}(${node.arguments.map((a) => (a.type === 'SpreadElement' ? this.code(a) : this.substitute(a))).join(', ')})`;
      case 'ArrayExpression':
        return `[${node.elements.map((e) => (e === null ? '' : e.type === 'SpreadElement' ? this.code(e) : this.substitute(e))).join(', ')}]`;
      default:
        return this.code(node);
    }
  }

  /** "target - nums[i] = 9 - 2 = 7" */
  private computation(expr: ES.Node, value: Value): string {
    const source = this.code(expr);
    const result = this.f(value);
    const sub = this.substitute(expr);
    const parts = [source];
    if (sub !== source && sub !== result) parts.push(sub);
    if (result !== source) parts.push(result);
    return parts.join(' = ');
  }

  private computeDetail(expr: ES.Node, value: Value): ComputeDetail | undefined {
    if (!['BinaryExpression', 'LogicalExpression', 'UnaryExpression', 'CallExpression'].includes(expr.type)) return undefined;
    if (expr.type === 'CallExpression' && expr.callee.type !== 'MemberExpression') return undefined;
    return { expression: this.code(expr), substituted: this.substitute(expr), result: this.f(value) };
  }

  /** Leaves of a pure arithmetic expression like `a + b`, or null if it has calls, members, etc. */
  private arithmeticLeaves(node: ES.Node, out: string[] = []): string[] | null {
    if (node.type === 'Identifier') {
      out.push(node.name);
      return out;
    }
    if (node.type === 'Literal') return out;
    if (node.type === 'BinaryExpression' && node.left.type !== 'PrivateIdentifier') {
      return this.arithmeticLeaves(node.left, out) && this.arithmeticLeaves(node.right, out);
    }
    return null;
  }

  private describeDeclare(name: string, init: ES.Expression | null, value: Value): string {
    if (!init) return `Declare ${name}. It holds undefined for now.`;
    if (init.type === 'NewExpression') {
      if (isTreeNode(value) || isListNode(value)) return `Create ${this.f(value)} and store it in ${name}.`;
      if (value instanceof Map && value.size === 0) return `Create an empty Map named ${name}.`;
      if (value instanceof Set && value.size === 0) return `Create an empty Set named ${name}.`;
      if (value instanceof ObjRecord) return `Create a new ${value.className ?? 'object'} and store it in ${name}.`;
      return `Create ${name} = ${this.f(value)}.`;
    }
    if (init.type === 'Literal' || init.type === 'ArrayExpression' || init.type === 'ObjectExpression' || init.type === 'TemplateLiteral') {
      return `Create ${name} = ${this.f(value)}.`;
    }
    if (value instanceof Closure) return `Define function ${name}.`;
    let text = `Create ${name} = ${this.computation(init, value)}.`;
    const leaves = this.arithmeticLeaves(init);
    if (init.type === 'BinaryExpression' && leaves && leaves.length) {
      const names = [...new Set(leaves)];
      const vals = names.map((n) => this.f(this.frame.scope.lookup(n)?.value));
      const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      text += ` ${list} ${names.length === 1 ? 'keeps its' : 'keep their'} original ${names.length === 1 ? 'value' : 'values'} (${vals.join(' and ')}).`;
    }
    const subtree = this.subtreeNote(init, value);
    if (subtree) text += ` ${subtree}`;
    return text;
  }

  /** "The left subtree of node 5 returned 2." for `height(node.left)`. */
  private subtreeNote(expr: ES.Node, value: Value): string | null {
    if (expr.type !== 'CallExpression' || expr.arguments.length === 0) return null;
    const arg = expr.arguments[0];
    if (arg.type !== 'MemberExpression' || arg.computed || arg.property.type !== 'Identifier') return null;
    const side = arg.property.name;
    if (side !== 'left' && side !== 'right') return null;
    const parent = this.valueOf(arg.object);
    if (parent === MISSING || !isTreeNode(parent as Value)) return null;
    return `The ${side} subtree of ${this.f(parent as Value)} returned ${this.f(value)}.`;
  }

  private describeAssign(e: ES.AssignmentExpression, value: Value, u: Unit): string {
    const left = e.left;
    if (left.type === 'Identifier') {
      const eff = [...u.effects].reverse().find((x) => x.type === 'assign' && x.name === left.name) as
        Extract<Effect, { type: 'assign' }> | undefined;
      const was = eff ? this.fs(eff.before) : 'unknown';
      if (e.operator === '=') {
        if (e.right.type === 'Literal' || e.right.type === 'ArrayExpression' || e.right.type === 'ObjectExpression') {
          return `${left.name} = ${this.f(value)} (it was ${was}).`;
        }
        if (e.right.type === 'Identifier' && (isTreeNode(value) || isListNode(value))) {
          return `${left.name} now points to ${this.f(value)} (same node as ${e.right.name}; it was ${was}).`;
        }
        const note = this.subtreeNote(e.right, value);
        return `${left.name} = ${this.computation(e.right, value)} (it was ${was}).${note ? ' ' + note : ''}`;
      }
      if (eff?.compute) return `${left.name} ${e.operator} ${this.code(e.right)}: ${eff.compute.substituted} = ${eff.compute.result}.`;
      return `${left.name} ${e.operator} ${this.code(e.right)} → ${this.f(value)} (it was ${was}).`;
    }
    if (left.type === 'ArrayPattern' && e.right.type === 'ArrayExpression' && left.elements.length === 2 && e.right.elements.length === 2) {
      const [l0, l1] = left.elements;
      const [r0, r1] = e.right.elements;
      if (l0 && l1 && r0 && r1 && this.code(l0) === this.code(r1) && this.code(l1) === this.code(r0)) {
        const vals = Array.isArray(value) ? value : [];
        return `Swap ${this.code(l0)} and ${this.code(l1)}: now ${this.code(l0)} = ${this.f(vals[0])} and ${this.code(l1)} = ${this.f(vals[1])}.`;
      }
    }
    const phrases = this.effectPhrases(u.effects, false);
    return phrases || `Assign ${this.code(e)}.`;
  }

  private describeUpdate(e: ES.UpdateExpression, u: Unit): string {
    const eff = [...u.effects].reverse().find((x) => x.type === 'assign' || x.type === 'index-write' || x.type === 'prop-write');
    const what = this.code(e.argument);
    const dir = e.operator === '++' ? 'goes up by 1' : 'goes down by 1';
    if (eff && (eff.type === 'assign' || eff.type === 'index-write' || eff.type === 'prop-write')) {
      return `${what} ${dir}: ${this.fs(eff.before)} → ${this.fs(eff.after)}.`;
    }
    return `${what} ${dir}.`;
  }

  private describeCallStatement(e: ES.SimpleCallExpression, value: Value, u: Unit): string {
    const phrases = this.effectPhrases(u.effects, false);
    if (phrases) return phrases;
    const callee = e.callee.type === 'Super' ? 'super' : this.code(e.callee);
    const returned = value === undefined ? '' : ` It returned ${this.f(value)}, which is not stored.`;
    return `${callee}(…) finished.${returned}`;
  }

  private describeCheck(test: ES.Node, value: Value, ok: boolean, then: string, u: Unit): string {
    const source = this.code(test);
    const sub = this.substitute(test);
    const lookups = u.effects
      .filter((x) => x.type === 'map-lookup' || x.type === 'set-lookup')
      .map((x) => this.phrase(x, true))
      .filter(Boolean);
    const detail = lookups.length ? ` (${lookups.join('; ')})` : '';
    if (typeof value === 'boolean') {
      const middle = sub !== source ? `${sub} → ` : '';
      return `Check ${source}: ${middle}${value}${detail}, so ${then}.`;
    }
    return `Check ${source}: ${this.f(value)} is ${ok ? 'truthy' : 'falsy'}${detail}, so ${then}.`;
  }

  private describeEnter(fn: Closure, args: Value[], callNode: ES.Node, label: string): string {
    if (callNode.type === 'CallExpression') {
      const argNode = callNode.arguments[0];
      if (argNode && argNode.type === 'MemberExpression' && !argNode.computed && argNode.property.type === 'Identifier') {
        const side = argNode.property.name;
        const parent = this.valueOf(argNode.object);
        if ((side === 'left' || side === 'right') && parent !== MISSING && isTreeNode(parent as Value)) {
          const p = this.f(parent as Value);
          if (args[0] === null || args[0] === undefined) return `${capitalize(p)} has no ${side} child: call ${label}.`;
          return `Explore the ${side} child of ${p} (${this.f(args[0])}): call ${label}.`;
        }
        if (side === 'next' && parent !== MISSING && isListNode(parent as Value)) {
          return `Move to the node after ${this.f(parent as Value)}: call ${label}.`;
        }
      }
    }
    if (isTreeNode(args[0])) return `Call ${label} and visit ${this.f(args[0])}.`;
    void fn;
    return `Call ${label}.`;
  }

  private effectPhrases(effects: Effect[], lookupsOnly: boolean): string {
    const out: string[] = [];
    for (const e of effects) {
      if (lookupsOnly && e.type !== 'map-lookup' && e.type !== 'set-lookup') continue;
      const p = this.phrase(e, false);
      if (p && !out.includes(p)) out.push(p);
    }
    return out.map((p) => capitalize(p) + '.').join(' ');
  }

  private phrase(e: Effect, inline: boolean): string | null {
    void inline;
    switch (e.type) {
      case 'array-add': {
        const name = this.objName(e.objId, 'the array');
        const vals = e.values.map((v) => this.fs(v)).join(', ');
        return e.end === 'back' ? `add ${vals} to the end of ${name}` : `add ${vals} to the front of ${name}`;
      }
      case 'array-remove': {
        const name = this.objName(e.objId, 'the array');
        return e.end === 'back'
          ? `remove ${this.fs(e.value)} from the end of ${name}`
          : `take ${this.fs(e.value)} from the front of ${name}`;
      }
      case 'array-change': {
        const name = this.objName(e.objId, 'the array');
        const verbs: Record<string, string> = {
          sort: 'sort',
          reverse: 'reverse',
          fill: 'fill',
          splice: 'splice',
          clear: 'clear',
          length: 'resize',
        };
        return `${verbs[e.method] ?? 'change'} ${name}`;
      }
      case 'map-insert': {
        const name = this.objName(e.objId, 'the map');
        return e.before
          ? `update ${name}: key ${this.fs(e.key)} now maps to ${this.fs(e.value)} (was ${this.fs(e.before)})`
          : `store ${this.fs(e.key)} → ${this.fs(e.value)} in ${name}`;
      }
      case 'map-lookup': {
        const name = this.objName(e.objId, 'the map');
        if (e.method === 'get')
          return e.found
            ? `${name}.get(${this.fs(e.key)}) → ${this.fs(e.value)}`
            : `${this.fs(e.key)} is not a key in ${name}, so get returns undefined`;
        return e.found ? `${name} has key ${this.fs(e.key)}` : `${this.fs(e.key)} is not a key in ${name}`;
      }
      case 'map-delete':
        return e.existed ? `remove key ${this.fs(e.key)} from ${this.objName(e.objId, 'the map')}` : null;
      case 'set-add': {
        const name = this.objName(e.objId, 'the set');
        return e.existed ? `${this.fs(e.value)} is already in ${name}` : `add ${this.fs(e.value)} to ${name}`;
      }
      case 'set-lookup': {
        const name = this.objName(e.objId, 'the set');
        return e.found ? `${name} contains ${this.fs(e.value)}` : `${this.fs(e.value)} is not in ${name}`;
      }
      case 'set-delete':
        return e.existed ? `remove ${this.fs(e.value)} from ${this.objName(e.objId, 'the set')}` : null;
      case 'index-write': {
        const name = this.objName(e.objId, 'the array');
        return `set ${name}[${e.index}] = ${this.fs(e.after)} (it was ${this.fs(e.before)})`;
      }
      case 'prop-write':
        return this.propWritePhrase(e);
      case 'log':
        return `print: ${e.text.length > 60 ? e.text.slice(0, 59) + '…' : e.text}`;
      default:
        return null;
    }
  }

  private propWritePhrase(e: Extract<Effect, { type: 'prop-write' }>): string {
    const obj = this.objects.get(e.objId) as Value;
    const owner = this.f(obj);
    const after = this.fs(e.after);
    const before = this.fs(e.before);
    const isNodeRef = (s: ValueSnap) =>
      s.t === 'ref' && (isTreeNode(this.objects.get(s.id) as Value) || isListNode(this.objects.get(s.id) as Value));
    const sides = treeSides(obj);
    // Custom field names (l/r, lchild/rchild) are described as left/right.
    const side = sides && isTreeNode(obj) ? (e.key === sides[0] ? 'left' : e.key === sides[1] ? 'right' : null) : null;
    if (side) {
      if (e.after.t === 'ref' && isNodeRef(e.after)) {
        if (e.before.t === 'ref' && e.before.id !== e.after.id) {
          return `replace the ${side} child of ${owner}: ${before} → ${after}. ${capitalize(before)} is no longer connected to ${owner}`;
        }
        if (e.before.t === 'ref' && e.before.id === e.after.id) return `${owner}'s ${side} child is still ${after}`;
        return `connect ${after} as the ${side} child of ${owner}`;
      }
      if (e.after.t === 'null' || e.after.t === 'undefined') {
        return e.before.t === 'ref'
          ? `remove ${before} as the ${side} child of ${owner} (set it to ${after})`
          : `${owner}'s ${side} child stays ${after}`;
      }
      return `set the ${e.key} of ${owner} to ${after}`;
    }
    if (isListNode(obj) && isNextField(e.key)) {
      if (e.after.t === 'ref')
        return `point ${owner}'s ${e.key} to ${after}${e.before.t === 'ref' && e.before.id !== e.after.id ? ` (it pointed to ${before})` : ''}`;
      return `point ${owner}'s ${e.key} to ${after}${e.before.t === 'ref' ? ` (it pointed to ${before})` : ''}`;
    }
    const name = this.nameFor(e.objId) ?? owner;
    return `set ${name}.${e.key} = ${after}${e.before.t !== 'undefined' ? ` (it was ${before})` : ''}`;
  }

  // ---------------------------------------------------------------- result helpers

  describeResult(v: Value): string {
    return this.f(v);
  }

  sourceText(node: ES.Node): string {
    return this.code(node);
  }
}

const MISSING = Symbol('missing');
