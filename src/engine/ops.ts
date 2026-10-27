// JavaScript conversion and operator rules applied to interpreter values.
import { toStr } from './describe';
import { ClassValue, Closure, NativeFn, type Value } from './values';

export function truthy(v: Value): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  if (typeof v === 'string') return v.length > 0;
  return true;
}

export function typeOf(v: Value): string {
  if (v === null) return 'object';
  if (v instanceof Closure || v instanceof NativeFn || v instanceof ClassValue) return 'function';
  if (typeof v === 'object') return 'object';
  return typeof v;
}

type Primitive = undefined | null | boolean | number | string;

export function toPrimitive(v: Value): Primitive {
  if (v === undefined || v === null || typeof v !== 'object') return v as Primitive;
  // Arrays, Maps, objects and functions all convert through their string form.
  return toStr(v);
}

export function toNumber(v: Value): number {
  return Number(toPrimitive(v));
}

/** SameValueZero, used by includes(), Map and Set. */
export function sameValueZero(a: Value, b: Value): boolean {
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  return a === b;
}

export function looseEquals(a: Value, b: Value): boolean {
  const aObj = a !== null && typeof a === 'object';
  const bObj = b !== null && typeof b === 'object';
  if (aObj && bObj) return a === b;
  return (aObj ? toPrimitive(a) : (a as Primitive)) == (bObj ? toPrimitive(b) : (b as Primitive));
}

export function binaryOp(op: string, a: Value, b: Value): Value {
  switch (op) {
    case '===':
      return a === b;
    case '!==':
      return a !== b;
    case '==':
      return looseEquals(a, b);
    case '!=':
      return !looseEquals(a, b);
  }
  const pa = toPrimitive(a);
  const pb = toPrimitive(b);
  switch (op) {
    case '+':
      if (typeof pa === 'string' || typeof pb === 'string') return String(pa) + String(pb);
      return Number(pa) + Number(pb);
    case '-':
      return Number(pa) - Number(pb);
    case '*':
      return Number(pa) * Number(pb);
    case '/':
      return Number(pa) / Number(pb);
    case '%':
      return Number(pa) % Number(pb);
    case '**':
      return Number(pa) ** Number(pb);
    case '<':
      return (pa as number) < (pb as number);
    case '<=':
      return (pa as number) <= (pb as number);
    case '>':
      return (pa as number) > (pb as number);
    case '>=':
      return (pa as number) >= (pb as number);
    case '&':
      return Number(pa) & Number(pb);
    case '|':
      return Number(pa) | Number(pb);
    case '^':
      return Number(pa) ^ Number(pb);
    case '<<':
      return Number(pa) << Number(pb);
    case '>>':
      return Number(pa) >> Number(pb);
    case '>>>':
      return Number(pa) >>> Number(pb);
  }
  throw new Error(`Unknown operator ${op}`);
}

export const COMPARISON_OPS = new Set(['===', '!==', '==', '!=', '<', '<=', '>', '>=']);

/** Array index from a property key, or null if the key is not a valid index. */
export function arrayIndex(key: Value): number | null {
  if (typeof key === 'number') return Number.isInteger(key) && key >= 0 ? key : null;
  if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) return Number(key);
  return null;
}
