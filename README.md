# Drawgorithms

Write JavaScript for coding-interview style problems and see what it does. **Build** redraws the structure your top-level code creates as you type. **Run** records your code's real execution and plays it back step by step: source line, variables, data structures, call stack, explanation and output stay in sync.

Drawgorithms is an independent project. It is not affiliated with LeetCode. The built-in problems are written for this project.

## Setup

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # type check + lint + tests
npm run build      # production build in dist/
npm run format:check
```

No API key or backend is needed. Code and settings are saved in the browser (localStorage).

## Using it

- **Problem panel**: pick a built-in example (Load example), choose a test case, edit inputs (JSON; trees use level order like `[5,3,8,null,4]`), or paste your own problem text. Pasted text only pre-fills inputs and expected output; it never generates an animation.
- **Editor**: Run (Ctrl+Enter), Reset, Format Code (Shift+Alt+F, Prettier), optional format on save (Ctrl+S). Unfinished or invalid code is never formatted.
- **Build tab**: draws what top-level code builds (e.g. `const root = new TreeNode(5)`). Function bodies wait for Run. Put the cursor on a line to highlight what it built; click a node to see which lines created and connected it. While code is unfinished, invalid, unsupported or failing, the last valid drawing stays, labeled **Previous valid state**.
- **Run tab**: play/pause, step back/forward (← →), Home/End, speed, draggable timeline. A run that finishes shows the actual result next to the expected output, even when the answer is wrong. A run that fails or hits a limit is not drawn as a result: you get the error and its line, the last successful run stays visible (labeled), and you can choose to step through what ran before it stopped.

## Supported JavaScript

let/const/var, functions, arrow functions, recursion, closures, classes without `extends`, `new`, if/else, switch, for, for…of, for…in, while, do…while, labeled break/continue, try/catch/finally, throw, destructuring, spread/rest, default parameters, template strings, optional chaining, `??`, and the usual operators.

Built-ins: arrays (push, pop, shift, unshift, slice, splice, indexOf, includes, join, reverse, sort, fill, map, filter, forEach, reduce, some, every, find…, at, flat, keys/values/entries), strings (charAt, charCodeAt, slice, substring, split with a string, indexOf, includes, toLowerCase, trim, padStart, repeat, replace with a string…), Map, Set, Math, Number, String, Boolean, Array.from/isArray/of, Object.keys/values/entries/fromEntries, JSON, console.log, `TreeNode(val, left, right)`, `ListNode(val, next)`.

Not supported yet (each gives a clear message naming the feature and line): async/await, generators, regular expressions, getters/setters, class inheritance, private fields, `arguments`, Date, timers, and anything that touches the page, storage or network.

Safety limits per run: 2,000 recorded steps, 2,000,000 operations, 200 nested calls, 3,000,000 recorded values across all steps, 1,000 lines of console output, 100,000 array items, 6 seconds, and a Stop button. Live Build: top-level code only, 300,000 operations, 1.5 seconds. These caps bound memory indirectly; a browser worker has no hard memory quota.

## Architecture

```
src/
  trace/types.ts   Trace contract: steps (immutable snapshots of frames + heap), effects, errors, Live Build results
  engine/          JavaScript adapter: acorn parser, tree-walking interpreter, built-ins, snapshots, limits, Run and Live Build
  worker/          Runs the engine in Web Workers (one for Run, one for Live Build); time limit and Stop terminate the worker
  viz/             Renderers (blocks, arrays/strings with pointers, grids, maps, sets, objects, trees, linked lists, call stack)
                   and pure analysis (tree layout, cycles/shared/detached nodes, traversal state, index pointers)
  ui/              Panels: problem, editor (Monaco), Build and Run views, playback, inspector
  state/           App state (zustand), persistence, which drawing is shown
  editor/          Monaco setup and the Prettier formatter
  problems/        Built-in examples, pasted-problem parsing, expected-vs-actual comparison
```

User code is parsed with acorn and interpreted, never `eval`ed, so it cannot reach the worker's globals. Every step is plain data, so playback is deterministic in both directions and object identities (heap ids) stay stable across steps. Visuals are derived only from recorded state; explanations are written from what actually happened (the operator, the values, the branch taken).

Coverage, the capability matrix and the staged plan are in [docs/COVERAGE.md](docs/COVERAGE.md).

## Tests

`npm test` runs Vitest: trace generation, Two Sum duplicates, Binary Search boundaries, execution limits, unsupported syntax, Live Build (unfinished code, cycles, shared and detached nodes, null children), tree layout and traversal state, representative LeetCode-style patterns, and the formatter.
