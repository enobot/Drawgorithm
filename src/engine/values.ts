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

/** True for keys JavaScript treats as array indexes ("0", "7", "42"; not "07" or "-1"). */
const isIndexKey = (k: string) => /^(0|[1-9]\d*)$/.test(k) && Number(k) < 4294967295;

/**
 * An object's keys in the order JavaScript lists them (Object.keys, for…in, console.log):
 * integer-like keys first, ascending, then every other key in the order it was added.
 */
export function objectKeys(obj: ObjRecord): string[] {
  const indexes: string[] = [];
  const rest: string[] = [];
  for (const k of obj.props.keys()) (isIndexKey(k) ? indexes : rest).push(k);
  if (!indexes.length) return rest;
  indexes.sort((a, b) => Number(a) - Number(b));
  return [...indexes, ...rest];
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
// Node conventions used for explanations ("node 5"). They match the drawing's
// automatic bindings (viz/bindings.ts); user overrides only affect the drawing.
const VALUE_FIELDS = ['val', 'value', 'data', 'key'];
const NEXT_FIELDS = ['next', 'nxt', 'link'];
const SIDE_FIELDS: [string, string][] = [
  ['left', 'right'],
  ['l', 'r'],
  ['lchild', 'rchild'],
  ['leftChild', 'rightChild'],
];

/** The field holding a node's value, if the object looks like a tree or list node. */
export function nodeValueField(v: Value): string | null {
  if (!(v instanceof ObjRecord) || v.builtin) return null;
  const value = VALUE_FIELDS.find((f) => v.props.has(f));
  if (!value) return null;
  return treeSides(v) || NEXT_FIELDS.some((f) => v.props.has(f)) ? value : null;
}

/** The (left, right) field names of a tree node, if any. */
export function treeSides(v: Value): [string, string] | null {
  if (!(v instanceof ObjRecord) || v.builtin) return null;
  return SIDE_FIELDS.find(([a, b]) => v.props.has(a) && v.props.has(b)) ?? null;
}

export function isNextField(key: string): boolean {
  return NEXT_FIELDS.includes(key);
}

export function isTreeNode(v: Value): boolean {
  return nodeValueField(v) !== null && treeSides(v) !== null;
}

export function isListNode(v: Value): boolean {
  return nodeValueField(v) !== null && treeSides(v) === null && NEXT_FIELDS.some((f) => (v as ObjRecord).props.has(f));
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
