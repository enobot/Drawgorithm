# Drawgorithms

Write code for coding-interview style problems in the language you choose and see what it does. **Build** redraws the structure your top-level code creates as you type. **Run** records your code's real execution and plays it back step by step: source line, variables, data structures, call stack, explanation and output stay in sync.

Languages: JavaScript runs today. TypeScript, Python, Java and C++ are planned through language adapters that produce the same trace; the Language menu marks each one as unavailable until its adapter works and is tested. See [docs/COVERAGE.md](docs/COVERAGE.md).

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

- **Problem panel**: pick a built-in example (Load example), choose a test case, edit inputs (JSON; trees use level order like `[5,3,8,null,4]`; a linked list with a cycle uses a second input of kind **cycle position (pos)**: the last node links back to the node at that index, -1 for none, and it is not passed to your function), or paste your own problem text. Pasted text only pre-fills inputs and expected output; it never generates an animation.
- **Editor**: Run (Ctrl+Enter), Reset, Format Code (Shift+Alt+F, Prettier), optional format on save (Ctrl+S). Unfinished or invalid code is never formatted.
- **Build tab**: draws what top-level code builds (e.g. `const root = new TreeNode(5)`). Function bodies wait for Run. Put the cursor on a line to highlight what it built; click a node to see which lines created and connected it. While code is unfinished, invalid, unsupported or failing, the last valid drawing stays, labeled **Previous valid state**.
- **Run tab**: play/pause, step back/forward (← →), Home/End, speed, draggable timeline. A run that finishes shows the actual result next to the expected output, even when the answer is wrong. A run that fails or hits a limit is not drawn as a result: you get the error and its line, the last successful run stays visible (labeled), and you can choose to step through what ran before it stopped.
- **Drawing board**: every state has a color and a word (now, compared, changed, new, visited, answer, problem), so nothing depends on color alone. **Show details** adds indices, declaration kinds and null children. Zoom with the − / + / Fit buttons, Ctrl/⌘ + wheel or a trackpad pinch, or two fingers on a touch screen; the percentage button resets the view (100%, back to the top). Pan by scrolling or dragging empty board. Plain scrolling is never captured, and the view never recenters by itself. Motion follows the operating system's reduced-motion setting.
- **How structures are laid out**: drawings are never clipped. Each one is sized to its full bounds with padding, and anything wider than the board makes the board scroll (labels are not shrunk below 40% zoom). Small trees (up to 3 levels) use fixed slots, so nodes stay put while the tree grows; bigger trees use a compact layout where every single child leans to its own side. Variable labels sit beside the branch that arrives from the parent and move up a row instead of touching a neighbor. Linked-list nodes keep one place for a whole run, so when code re-points `next` the arrow swings to the new target while the nodes stay still (reversing a list flips arrows in place). Cycles are drawn as dashed rose arrows that loop back, with the explanation underneath. Index labels under array cells are never cut short: a long name (`smallest`) moves to a lower row instead of overlapping its neighbor.
- **Heaps, deques, graphs, tries and union-find**: heaps, graphs, tries and union-find forests are drawn once, above the call stack (a helper such as `siftUp`, `find` or `dfs` often reaches them through a closure); the call that holds them shows a short "drawn above" note. Which variables get these drawings is decided by what the code does with them, so any names work; the usual names (`heap`, `parent`, `graph`, `edges`, `root`, …) are read the same way too. Every choice can be changed in **How this is drawn**:
  - **Heap**: an array the code reaches with heap slot arithmetic (`2 * i + 1`, `2 * i + 2`, `(i - 1) >> 1`, `Math.floor((i - 1) / 2)`), or whose name contains `heap`, or any array you mark as a heap, is drawn as a complete binary tree (the children of slot i are slots 2i+1 and 2i+2) and as cells, in sync, with index variables labeled on both. When a step reads a value from one slot and writes it to another (a swap, or `heap[0] = heap.pop()`), the value glides between the slots and the caption says what moved; writes the trace can't explain that way are shown as plain changes.
  - **Deque**: an array the code uses at both ends (`pop()` together with `shift()` or `unshift()`), or one named `dq`/`deque`, is a lane with front and back labels and indexes; items leave on the end the code used. When the code reads `nums[dq[k]]`, each item also shows the value it points at, and a note says when those values keep one order (a monotonic deque).
  - **Union-find**: an array the code climbs to a root (`x = p[x]`, `while (p[x] !== x)`, `find(p[x])` inside `find(x)`, `p[x] = p[p[x]]`), or one named `parent` (also `par`, `leader`, `root`, `uf`, `dsu`, …), whose items are all slots of the same array is drawn as a forest: an arrow from each slot to its parent, roots ringed, `rank`/`size` next to roots. A write re-points one arrow; the caption says whether a root joined another group or a slot got a shortcut up its own chain. Slots that loop without reaching a root are reported.
  - **Graph**: an adjacency structure (array of neighbor lists, square 0/1 matrix, Map or object of lists) whose lists the code walks as neighbors (`for (const v of adj[u])` with `v` then used as a key), or one named `graph`/`adj`/`neighbors`; or an edge list the code takes apart into two vertices (`for (const [a, b] of edges)` with both used as keys), or one named `edges`/`roads`/`links`/… (pairs, optionally with a weight; vertices 0..n-1 when a variable `n` is next to it), is drawn as vertices on a circle. Each vertex keeps its place for the whole run. One-way entries are arrows, entries listed both ways are lines, weights and repeated entries are labeled. Traversal state comes from what the code writes for a vertex, or from the usual names: marks set to `true` or `add(v)` (`visited`/`seen`: check marks), arrays used as queues or stacks (each vertex's place, e.g. `queue[0]`), values computed from the same structure such as `d[v] = d[u] + 1` (`dist`/`level`: values), another vertex stored as in `from[v] = u` (`prev`/`parent`: dashed arrows back), plus the neighbor entry the step read (violet edge) and the variables holding vertices (the loop's vertex variables, or `u`, `v`, `node`, `start`, …). An edge list gives way to an adjacency structure built from it.
  - **Trie**: nested objects or Maps whose children are single letters (on the node or in a `children`/`next` field), with an end flag such as `end`/`isEnd`/`isWord`, that the code walks down one key at a time (`node = node[ch]`, `node = node.children.get(ch)`), or named `trie`/`root`/`dict`, or of a class named like `Trie`, are drawn as a tree of letters: word ends are ringed and marked "end", the stored words are listed, the path to the node a variable points at is highlighted, and a lookup that finds no branch is reported.
- **Call tree (recursion and backtracking)**: when a call makes two or more recursive calls (a search, a divide-and-conquer, a recursion with repeated subproblems), the calls are drawn as a tree above the call stack, read from the recorded frames: each box is one call with the arguments it got, under the call that made it. It grows as the run makes calls; the running call is lit, the calls waiting on it are ringed, a finished call shows what it returned, and a call with the same arguments as an earlier one is dashed (a repeated subproblem). Functions are matched by name, and calls through a helper or callback hang from the recursive call that made them. More than 160 calls are summarized instead of drawn.
- **Bits**: numbers the code combines bit by bit (operands of `&`, `|`, `^`, `~`, and `&=`, `|=`, `^=`; a shift alone is halving, not bits) also get a row of bits in their call, lined up by place value with every other such number, one width for the whole run (32 bits, two's complement, once a value is negative). The bits a step changed are outlined.
- **Node classes and the current node**: a class whose objects link to each other is read as list or tree nodes from its data; its value field is a usual name (`val`, `value`, `data`, …) or else the one field that only holds plain values. The node a call is working on is a usual name (`node`, `cur`, …), else a variable the code steps along its own field (`w = w.next`), else a parameter.

## Illustrated and Technical views

The Visual panel has two picture styles, switchable at any time without changing the run or the step:

- **Illustrated**: sketchbook scenes drawn from the same trace. A **queue** (an array the code uses with `shift()`) is a line of people at a counter: `push()` adds someone at the back, `shift()` serves the front person (the clerk waves and the scene says who was served). A **linked list** is people holding one-way ropes: each rope is that node's `next`, it swings when `next` is re-pointed, and a loose rope means `null`. An **array read through index variables** (binary search, linear search) is a row of numbered shelf slots: index variables are flags, a shopper stands at the slot the code read most recently, a thought bubble shows the comparison the code actually made, and slots outside a `left..right` window are taped off. Each scene says how the analogy is simplified. **Technical overlay** adds indices and the collection state in code terms. Clicking a person in the queue scrolls the editor to the line where they joined.
- **Technical**: the cell, node and arrow drawings.

Trees, maps, sets, stacks, grids, heaps, deques, graphs, tries and union-find forests are drawn the technical way in both styles for now. Item identities in a queue come from the trace's recorded adds and removes; after an operation that reorders items without recording how (`sort`, `splice`), the scene starts over with a new arrangement instead of inventing movements.

## Practice: Drawgorithm Foundations 75

An optional, original practice collection (the **Practice** button in the Problem panel). It is written for Drawgorithms; it is not an official collection of any platform and makes no claim about which questions interviews use most. All 75 exercises are available. An exercise becomes available only when its statement, formats, constraints, rules (empty input, duplicates, ties, ordering, mutation), examples, additional tests, starter code, progressive hints, reference solution with complexity and assumptions, and visualization are written, and `src/practice/foundations.test.ts` verifies them: the reference passes every case in the interpreter, every expected output matches an independent computation, the starter runs (and fails at least one case), and every drawing it needs is supported.

Opening an exercise loads its examples as cases and its starter code into the editor. **Check all tests** runs the code in the editor on the examples and the additional tests in a separate engine worker (same limits as Run) and reports each case as passed, failed (expected vs. actual) or error. **Walk through the answer** (under **Stuck?**) plays the authored reference solution on the selected example on the board, from its first step, with how it works: the editor panel shows the answer read-only, the board and every step say it is the authored answer and not the learner's code, and picking another example replays it there. The learner's code is never changed (it isn't even put in the editor, so its undo history stays as it was); **Back to my code** returns to it and runs it again, and a walkthrough never becomes the "previous valid state" shown after a failed run of the learner's code. The reference solution's text also sits behind its own reveal. Prerequisite lessons are named but not written yet. Starter code exists for JavaScript, the only language the interpreter runs today.

## Screen sizes

- **Wide (1200px and up)**: Problem, Code and Visual side by side, each resizable; Problem and Code can be hidden.
- **Medium (768–1199px, tablets)**: the drawing beside a tabbed Problem/Code panel; **Widen drawing** hides the left panel.
- **Narrow (phones, and phones in landscape)**: one panel at a time (Problem, Code, Visual), opening on Visual. In landscape the step controls sit beside the drawing.

Switching tabs, rotating or resizing keeps the code, the editor's cursor and undo history, inputs, and playback position. Buttons grow to at least 44px on touch screens, text fields use 16px so iOS doesn't zoom the page, and with the on-screen keyboard open the app fits the visible area.

**Demo links** open an example directly, e.g. `/?example=two-sum&view=visual` (ids: `tree-build`, `variables`, `two-sum`, `binary-search`, `level-order`, `reverse-list`; views: `problem`, `code`, `visual`). The parameters are removed from the address after loading, and a visitor's saved work for that example is kept.

Tested so far in Chromium's device emulation (375×812 portrait, 812×375 landscape, 768×1024, 1366×768). Not yet tested on a real iPhone (Safari) or Android phone; [docs/PHONE-TESTING.md](docs/PHONE-TESTING.md) explains how to open the dev server on a phone and what to check.

Motion was checked frame by frame in headless Edge: people in the queue scene glide to their new places with swinging legs that stop when they arrive, list ropes swing to their new target while the nodes stay put, and with the reduced-motion setting emulated (the same media query the OS sets) everything changes at once, with no walking.

## Supported JavaScript (the first language adapter)

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
  viz/             Renderers (blocks, arrays/strings with pointers, grids, maps, sets, objects, trees, linked lists, call stack,
                   heaps, deques, graphs, tries, union-find forests)
                   and pure analysis (tree layout, cycles/shared/detached nodes, traversal state, index pointers)
  ui/              Panels: problem, editor (Monaco), Build and Run views, playback, inspector, zoomable board, layouts per screen size
  state/           App state (zustand), persistence, which drawing is shown
  editor/          Monaco setup and the Prettier formatter
  problems/        Built-in examples, pasted-problem parsing, expected-vs-actual comparison
  practice/        Foundations 75: exercise schema, catalog, authored exercises, test checker
  viz/illustrated/ Illustrated scenes (queue, linked list, shelves) and their sketch kit
```

User code is parsed with acorn and interpreted, never `eval`ed, so it cannot reach the worker's globals. Every step is plain data, so playback is deterministic in both directions and object identities (heap ids) stay stable across steps. Visuals are derived only from recorded state; explanations are written from what actually happened (the operator, the values, the branch taken).

Coverage, the capability matrix and the staged plan are in [docs/COVERAGE.md](docs/COVERAGE.md).

## Tests

`npm test` runs Vitest: trace generation, Two Sum duplicates, Binary Search boundaries, execution limits, unsupported syntax, Live Build (unfinished code, cycles, shared and detached nodes, null children), tree layout and traversal state, representative LeetCode-style patterns, the formatter, stale-run cancellation, demo links and zoom limits, queue item identities for the illustrated view, the heap, deque, union-find, graph and trie readers (which variables get them, swaps, parent links, graph forms and traversal state, trie words and missing branches), and the Foundations 75 catalog and checker.
