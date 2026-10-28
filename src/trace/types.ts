// The trace model: everything the engine records and the UI draws.
// Steps are plain, immutable data so they can cross the worker boundary
// and be replayed in any order (forward, backward, scrubbing).

export interface SourceLoc {
  line: number; // 1-based
  column: number; // 0-based
  endLine: number;
  endColumn: number;
  start: number; // character offsets into the source
  end: number;
}

export type ValueSnap =
  | { t: 'number'; v: number }
  /** Long strings keep only their first characters in a step; `len` is then the full length. */
  | { t: 'string'; v: string; len?: number }
  | { t: 'boolean'; v: boolean }
  | { t: 'null' }
  | { t: 'undefined' }
  | { t: 'ref'; id: number }
  | { t: 'function'; name: string };

export type HeapSnap =
  | { kind: 'array'; id: number; items: ValueSnap[]; total: number }
  | { kind: 'map'; id: number; entries: [ValueSnap, ValueSnap][]; total: number }
  | { kind: 'set'; id: number; items: ValueSnap[]; total: number }
  | { kind: 'object'; id: number; className: string | null; entries: [string, ValueSnap][] };

export type Heap = Record<number, HeapSnap>;

export type DeclKind = 'let' | 'const' | 'var' | 'param' | 'function' | 'class' | 'this';

export interface VarSnap {
  name: string;
  value: ValueSnap;
  declKind: DeclKind;
}

export interface FrameSnap {
  id: number;
  name: string;
  /** e.g. `height(node 3)` */
  label: string;
  vars: VarSnap[];
  loc: SourceLoc | null;
  /** Set on the step where this frame returns. */
  returning?: ValueSnap;
  /** True on the final step, after the call has finished. */
  finished?: boolean;
}

export interface ComputeDetail {
  /** Source text, e.g. `a + b` */
  expression: string;
  /** Same expression with values substituted, e.g. `2 + 5` */
  substituted: string;
  /** Formatted result, e.g. `7` */
  result: string;
}

export type Effect =
  | { type: 'read'; name: string; frameId: number; value: ValueSnap }
  | { type: 'declare'; name: string; frameId: number; value: ValueSnap; compute?: ComputeDetail }
  | { type: 'assign'; name: string; frameId: number; before: ValueSnap; after: ValueSnap; compute?: ComputeDetail }
  | { type: 'index-read'; objId: number; index: number; value: ValueSnap }
  | { type: 'index-write'; objId: number; index: number; before: ValueSnap; after: ValueSnap }
  | { type: 'char-read'; name: string; index: number; value: ValueSnap }
  /** value is undefined when the object has no such field. */
  | { type: 'prop-read'; objId: number; key: string; value: ValueSnap }
  | { type: 'prop-write'; objId: number; key: string; before: ValueSnap; after: ValueSnap }
  | { type: 'map-lookup'; objId: number; key: ValueSnap; found: boolean; value?: ValueSnap; method: 'get' | 'has' }
  | { type: 'map-insert'; objId: number; key: ValueSnap; value: ValueSnap; before?: ValueSnap }
  | { type: 'map-delete'; objId: number; key: ValueSnap; existed: boolean }
  | { type: 'set-add'; objId: number; value: ValueSnap; existed: boolean }
  | { type: 'set-lookup'; objId: number; value: ValueSnap; found: boolean }
  | { type: 'set-delete'; objId: number; value: ValueSnap; existed: boolean }
  | { type: 'array-add'; objId: number; end: 'front' | 'back'; values: ValueSnap[] }
  | { type: 'array-remove'; objId: number; end: 'front' | 'back'; value: ValueSnap }
  | { type: 'array-change'; objId: number; method: string }
  | { type: 'create'; objId: number; className: string }
  | { type: 'compare'; text: string; result: boolean }
  | { type: 'call'; callee: string; frameId: number }
  | { type: 'return'; frameId: number; value: ValueSnap }
  | { type: 'log'; text: string };

export type StepKind =
  'start' | 'declare' | 'assign' | 'statement' | 'condition' | 'loop-check' | 'loop-next' | 'jump' | 'enter' | 'return' | 'done' | 'error';

export interface Step {
  index: number;
  kind: StepKind;
  loc: SourceLoc | null;
  explanation: string;
  /** Call stack, outermost (Program) first. The last frame is the active one. */
  frames: FrameSnap[];
  heap: Heap;
  effects: Effect[];
  /** How many console lines exist at this step. */
  outputCount: number;
  /** For condition/loop-check steps: which way the check went. */
  outcome?: boolean;
  /** On the done step: the value the entry function returned. */
  result?: ValueSnap;
}

export type EngineErrorKind = 'syntax' | 'unsupported' | 'runtime' | 'limit' | 'setup';

export interface EngineError {
  kind: EngineErrorKind;
  /** JavaScript error name when it maps to one, e.g. TypeError. */
  name: string;
  message: string;
  loc: SourceLoc | null;
}

export interface FunctionInfo {
  name: string;
  params: string[];
  line: number;
}

/** Facts read from the source code (not from running it). */
export interface StaticHints {
  /** arrayName -> index variables used with it, with the axis (0 = row/first index, 1 = second index) */
  pointers: Record<string, { name: string; axis: number }[]>;
  /** names that the code indexes like strings or arrays (s[i], s.charAt(i)) */
  indexed: string[];
  /** arrays used as queues (.shift()) */
  queues: string[];
  /** arrays used as stacks (.pop() without .shift()) */
  stacks: string[];
  /** arrays used at both ends (.pop() and .shift() or .unshift()); they are also listed in queues */
  deques?: string[];
  /** arrays whose items are used as indexes into other arrays: `nums[dq[0]]` gives dq → [nums] */
  indexInto?: Record<string, string[]>;
  /** structures recognized by what the code does with them, whatever they are named */
  usage?: UsageHints;
  /** top-level functions */
  functions: FunctionInfo[];
}

/** Variable names grouped by how the code uses them (see collectUsage in engine/hints.ts). */
export interface UsageHints {
  /** arrays indexed with binary-heap slot arithmetic: 2 * i + 1, 2 * i + 2, (i - 1) >> 1 */
  heaps: string[];
  /** arrays followed to a slot that is its own parent: x = p[x], while (p[x] !== x), find(p[x]) */
  parents: string[];
  /** arrays, Maps or objects whose entry lists are walked as neighbors used as keys: for (const v of adj[u]) seen.has(v) */
  adjacency: string[];
  /** arrays of pairs taken apart into two keys: for (const [a, b] of edges) adj[a].push(b) */
  edgeLists: string[];
  /** the code walks down nested objects by key: node = node[ch], node = node.children.get(ch) */
  trieWalk: boolean;
  /** variables that step along a field of their own: cur = cur.next, node = node.left */
  walkers: string[];
  /** numbers combined bit by bit: operands of &, |, ^ and ~, and targets of &=, |=, ^= (shifts alone are halving, not bits) */
  bits: string[];
  /** variables that hold a vertex there: u and v in for (const v of adj[u]), a and b in for (const [a, b] of edges) */
  vertices: string[];
  /** per-vertex structures, read from how the code writes them for a vertex */
  visited: string[];
  distances: string[];
  predecessors: string[];
}

export type ExpectSpec = { kind: 'none' } | { kind: 'return'; value: unknown } | { kind: 'variables'; values: Record<string, unknown> };

/**
 * `pos` is the cycle convention for linked lists: the last node of the linked-list input
 * links back to the node at this index (-1: no cycle). It builds the list and is not
 * passed to the function.
 */
export type InputKind = 'auto' | 'tree' | 'list' | 'pos';

export interface InputSpec {
  name: string;
  value: unknown;
  kind: InputKind;
}

export interface RunRequest {
  code: string;
  mode: 'script' | 'function';
  /** Function to call in function mode. Empty means "the first top-level function". */
  entry?: string;
  inputs: InputSpec[];
  /** When the function returns a linked list or tree, `null` means the empty one and is written as []. */
  resultKind?: 'list' | 'tree';
  limits?: Partial<Limits>;
}

export interface Limits {
  maxSteps: number;
  maxOps: number;
  maxDepth: number;
  /** Total values stored across all step snapshots; keeps big inputs from exhausting memory. */
  maxTraceValues: number;
}

export interface OutputLine {
  text: string;
  step: number;
  level: 'log' | 'error';
}

export interface RunResult {
  status: 'finished' | 'error';
  steps: Step[];
  output: OutputLine[];
  error: EngineError | null;
  hints: StaticHints;
  /** Name of the function Run called, in function mode. */
  entry: string | null;
  /** JSON-friendly result, for comparing with the expected output. */
  plainResult?: unknown;
  /** JSON-friendly values of top-level variables at the end (script mode). */
  plainGlobals?: Record<string, unknown>;
  notes: string[];
}

// ---------- Live Build ----------

export interface LiveLineInfo {
  line: number;
  explanation: string;
  /** Heap objects this line created, changed, or pointed a variable at. */
  objIds: number[];
  /** Connections this line set: object id + property name. */
  edges: { objId: number; key: string }[];
  vars: string[];
  /** A child that was replaced on this line (it may now be detached). */
  replaced?: { objId: number; key: string; oldId: number; newValue: ValueSnap };
}

export interface LiveObjectInfo {
  createdLine: number | null;
  createdSource: string | null;
  /** Lines that changed one of this object's properties. */
  changes: { line: number; key: string; text: string }[];
  /** Lines that made another object (or variable) point at this one. */
  attached: { line: number; text: string }[];
}

export type LiveStatus = 'ok' | 'pending' | 'needs-run' | 'error';

export interface LiveResult {
  status: LiveStatus;
  /** Final state of the top-level code that could run. */
  step: Step | null;
  lines: LiveLineInfo[];
  objects: Record<number, LiveObjectInfo>;
  /** All tree/list nodes the code created, including ones nothing points to any more. */
  allNodeIds: number[];
  /** Line that is still being typed (syntax error); everything before it is drawn. */
  pending: { line: number; text: string; message: string } | null;
  /** Where Live Build stopped because running further needs the Run button. */
  stoppedAt: { line: number; reason: string } | null;
  error: EngineError | null;
  hints: StaticHints;
  /** Last line whose code was interpreted. */
  drawnThroughLine: number;
}
