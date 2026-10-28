// Python versions of the lesson demos: one file per lesson in ./python, named by its id
// (arrays-basics.py). Each does what the JavaScript demo does with the same names, so the
// lesson's notes and drawings apply to both; where a note names JavaScript code,
// PYTHON_NOTES has the Python wording. python.test.ts runs every demo on real CPython.
import type { LanguageId } from '../languages';
import type { Lesson } from './lessons';

const FILES = import.meta.glob<string>('./python/*.py', { query: '?raw', import: 'default', eager: true });

/** Lesson id → Python demo. */
export const PYTHON_DEMOS: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, code]) => [path.slice(path.lastIndexOf('/') + 1, -'.py'.length), code]),
);

export interface LessonNotes {
  idea: string[];
  demoExplanation: string;
  watch: string[];
  tryThis: string[];
}

/** The notes that name JavaScript code, reworded for the Python demo (only the ones that differ). */
export const PYTHON_NOTES: Record<string, Partial<LessonNotes>> = {
  'loops-and-indexes': {
    watch: [
      'i and i − 1 point at neighboring cells.',
      'An equal pair (5, 5) is not a rise.',
      'The loop stops after the last slot: range(1, len(readings)) ends just before len(readings).',
    ],
    tryThis: [
      'Start the loop at 0 and run again: in Python readings[-1] is the last reading, so the first round compares the first reading with the last one.',
    ],
  },
  matrices: {
    idea: [
      'A grid is a list of rows, and each row is a list: grid[r][c] is row r, column c. len(grid) is the number of rows and len(grid[0]) the number of columns.',
      'Which loop is outside decides the order cells are visited: rows first reads across, columns first reads down.',
    ],
    tryThis: ['Swap the loops to add up rows instead (and append one total per row).'],
  },
  'linked-list-basics': {
    idea: [
      'A linked list is a chain of nodes. Each node holds a value and next, a reference to the node after it; the last node’s next is None.',
      'There are no indexes: to reach a node you follow next from the head, one node at a time.',
    ],
    demoExplanation: 'node starts at head and follows next until it falls off the end (None), counting nodes and adding up their values.',
    watch: [
      'node is a label that moves along the arrows.',
      'The loop ends when node becomes None.',
      'An empty list (head is None) never enters the loop.',
    ],
    tryThis: ['Change the loop to stop at the last node (while node.next is not None) and see which value is missed.'],
  },
  'hash-sets': {
    tryThis: ['Move seen.add(item) above the if: every item is then found.'],
  },
  stacks: {
    tryThis: ['Use stack.pop(0) instead of stack.pop(): the words come out in their original order, like a queue.'],
  },
  'recursion-basics': {
    demoExplanation:
      'A number below 10 is its own digit sum (the base case). Otherwise the last digit, n % 10, is added to the digit sum of the rest, n // 10.',
  },
  'sliding-window': {
    demoExplanation:
      'right adds costs[right] to total. While total is over budget, the window gives up costs[left] from the front. The widest window that stays within budget is the answer.',
  },
  'fast-slow-pointers': {
    tryThis: ['Set pos to -1: fast reaches the end and the answer is False.'],
  },
  'tree-traversal-dfs': {
    tryThis: ['Move out.append(node.val) above visit(node.left) for preorder, or below visit(node.right) for postorder.'],
  },
  'tree-traversal-bfs': {
    tryThis: ['Record the first node of each level (k == 0) to see the left side instead.'],
  },
  'graphs-basics': {
    demoExplanation:
      'adj is built from links, both ways. The search pops a vertex, and every neighbor not yet seen is marked and pushed. len(seen) is how many vertices were reached.',
    tryThis: ['Change the stack to a queue (stack.pop(0) instead of stack.pop()): the same vertices are reached in a different order.'],
  },
  'topological-sort': {
    demoExplanation:
      'unlocks[a] lists what a unlocks and waiting[b] counts what b still needs. Ready vertices are taken in order, and each one lowers the count of the vertices it unlocks.',
  },
  'shortest-paths': {
    demoExplanation:
      'dist starts at math.inf except for from_ (from is a reserved word in Python, so the parameter takes a trailing underscore; Run still passes it the input from). Each round picks the unsettled vertex u with the smallest dist, marks it done, and lowers dist[w] for each neighbor reachable more cheaply through u. Unreachable vertices are returned as -1.',
  },
  backtracking: {
    demoExplanation:
      'pick(start, left, chosen) tries each number from start on that still fits into left. It appends the number, searches for the rest of the sum, and pops it again; reaching left = 0 records a copy of chosen.',
  },
  memoization: {
    tryThis: ['Delete the two lines that check memo (if k in memo) and run again: the call tree grows much bigger.'],
  },
};

/** A lesson's idea and notes on its demo, in the words for the demo in `language`. */
export function lessonNotes(l: Lesson, language: LanguageId): LessonNotes {
  const python = language === 'python' && PYTHON_DEMOS[l.id] ? PYTHON_NOTES[l.id] : undefined;
  return {
    idea: python?.idea ?? l.idea,
    demoExplanation: python?.demoExplanation ?? l.demoExplanation,
    watch: python?.watch ?? l.watch,
    tryThis: python?.tryThis ?? l.tryThis,
  };
}
