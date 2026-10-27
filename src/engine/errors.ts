import type * as ES from 'estree';
import type { Effect, EngineErrorKind, FrameSnap, Heap } from '../trace/types';
import type { Value } from './values';

/** State of the program at the moment an error happened, so the error step can be drawn. */
export interface ErrorContext {
  frames: FrameSnap[];
  heap: Heap;
  effects: Effect[];
}

/** An error raised by the interpreter (TypeError, unsupported syntax, limits...). */
export class EngineFailure extends Error {
  kind: Exclude<EngineErrorKind, 'syntax' | 'setup'>;
  jsName: string;
  node: ES.Node | null;
  context: ErrorContext | null = null;
  constructor(kind: EngineFailure['kind'], jsName: string, message: string, node: ES.Node | null) {
    super(message);
    this.kind = kind;
    this.jsName = jsName;
    this.node = node;
  }
  /** User code may catch ordinary JavaScript errors, but never limits or unsupported syntax. */
  get catchable(): boolean {
    return this.kind === 'runtime';
  }
}

/** A value thrown by the user's own `throw` statement. */
export class UserThrow {
  value: Value;
  node: ES.Node;
  context: ErrorContext | null = null;
  constructor(value: Value, node: ES.Node) {
    this.value = value;
    this.node = node;
  }
}

/** Live Build stops here: running further would execute a function, which is Run's job. */
export class NeedsRun {
  node: ES.Node;
  reason: string;
  constructor(node: ES.Node, reason: string) {
    this.node = node;
    this.reason = reason;
  }
}

/** Thrown internally by `?.` when the left side is null or undefined. */
export class ShortCircuit {}
