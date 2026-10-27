// Runtime values inside the interpreter. User code only ever sees these;
// it has no path to the real global object, the DOM, storage or the network.
import type * as ES from 'estree';
import type { DeclKind, SourceLoc } from '../trace/types';

export type FnNode = ES.FunctionDeclaration | ES.FunctionExpression | ES.ArrowFunctionExpression;

/** Plain objects, class instances, TreeNode/ListNode and built-in namespaces. */
export class ObjRecord {
  className: string | null;
  props = new Map<string, Value>();
  proto: ClassValue | null;
  /** Built-in namespaces such as Math are never drawn. */
  builtin: boolean;
  constructor(className: string | null, proto: ClassValue | null = null, builtin = false) {
    this.className = className;
    this.proto = proto;
    this.builtin = builtin;
  }
}

export class Closure {
  node: FnNode;
  scope: Scope;
  name: string;
  /** Arrow functions capture `this` where they are created. */
  thisValue: Value;
  isConstructorOf: ClassValue | null = null;
  constructor(node: FnNode, scope: Scope, name: string, thisValue: Value) {
    this.node = node;
    this.scope = scope;
    this.name = name;
    this.thisValue = thisValue;
  }
}

export type NativeImpl = (thisArg: Value, args: Value[], node: ES.Node) => Value;

export class NativeFn {
  name: string;
  call: NativeImpl | null;
  construct: ((args: Value[], node: ES.Node) => Value) | null;
  statics = new Map<string, Value>();
  constructor(name: string, call: NativeImpl | null, construct: ((args: Value[], node: ES.Node) => Value) | null = null) {
    this.name = name;
    this.call = call;
    this.construct = construct;
  }
}

export class ClassValue {
  name: string;
  ctor: Closure | null = null;
  methods = new Map<string, Closure>();
  fields: ES.PropertyDefinition[] = [];
  fieldScope: Scope;
  constructor(name: string, fieldScope: Scope) {
    this.name = name;
    this.fieldScope = fieldScope;
  }
}

export type HeapValue = Value[] | Map<Value, Value> | Set<Value> | ObjRecord;
export type Value = undefined | null | boolean | number | string | HeapValue | Closure | NativeFn | ClassValue;

export function isHeapValue(v: Value): v is HeapValue {
  return Array.isArray(v) || v instanceof Map || v instanceof Set || v instanceof ObjRecord;
}

// Plain boolean results (not type guards): a `false` must not rule out ObjRecord in general.
export function isTreeNode(v: Value): boolean {
  return v instanceof ObjRecord && !v.builtin && v.props.has('val') && (v.props.has('left') || v.props.has('right'));
}

export function isListNode(v: Value): boolean {
  return v instanceof ObjRecord && !v.builtin && v.props.has('val') && v.props.has('next') && !v.props.has('left');
}

export class Binding {
  value: Value;
  kind: DeclKind | 'builtin';
  initialized: boolean;
  constructor(value: Value, kind: DeclKind | 'builtin', initialized: boolean) {
    this.value = value;
    this.kind = kind;
    this.initialized = initialized;
  }
}

export class Scope {
  vars = new Map<string, Binding>();
  parent: Scope | null;
  /** Frame that owns this scope (0 = Program). */
  frameId: number;
  isFunction: boolean;
  constructor(parent: Scope | null, frameId: number, isFunction: boolean) {
    this.parent = parent;
    this.frameId = frameId;
    this.isFunction = isFunction;
  }
  lookup(name: string): Binding | undefined {
    return this.vars.get(name) ?? this.parent?.lookup(name);
  }
  /** The scope that holds `name`, if any. */
  owner(name: string): Scope | undefined {
    return this.vars.has(name) ? this : this.parent?.owner(name);
  }
}

export interface Frame {
  id: number;
  name: string;
  label: string;
  fnScope: Scope;
  scope: Scope;
  thisValue: Value;
  loc: SourceLoc | null;
}

/** Evaluated value of sub-expressions in the current unit, for "2 + 5"-style explanations. */
export interface Unit {
  node: ES.Node;
  effects: import('../trace/types').Effect[];
  values: Map<ES.Node, Value>;
  /** Objects mentioned by effects, so the step's heap includes them even if nothing else points at them. */
  refs: HeapValue[];
}
