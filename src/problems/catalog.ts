// Built-in examples. Descriptions are written for Drawgorithms; the starter code
// is ordinary JavaScript that the interpreter runs exactly as edited, and `python` holds the
// same program in Python with the same names (run on CPython in engine/python/python.test.ts).
import { lessonProblemById } from '../learn/problems';
import { practiceProblemById } from '../practice/problems';
import type { ExpectSpec, InputKind } from '../trace/types';

export interface ProblemCase {
  label: string;
  inputs: Record<string, unknown>;
  expected: ExpectSpec;
}

export interface ProblemParam {
  name: string;
  kind: InputKind;
}

export interface ProblemDef {
  id: string;
  title: string;
  tags: string[];
  description: string[];
  /** Short note on the approach the starter code takes. */
  explanation: string;
  mode: 'script' | 'function';
  entry?: string;
  params: ProblemParam[];
  /** Set when the function returns a linked list or tree (LeetCode writes an empty one as []). */
  resultKind?: 'list' | 'tree';
  cases: ProblemCase[];
  starter: string;
  /** Small edits to try, shown under the description. */
  tryThis: string[];
  /** Python starter code, with the text that names JavaScript code reworded for it (see starterIn, notesIn). */
  python?: { starter: string; description?: string[]; explanation?: string; tryThis?: string[] };
  view?: {
    /** The result is a list of indexes into this input array. */
    resultIndicesInto?: string;
    /** Column labels for hash maps, e.g. value → index. */
    mapColumns?: [string, string];
    /**
     * The Illustrated style draws arrays of numbers as gumdrops and maps as a notebook
     * (docs/DESIGN_SYSTEM.md). Problems opt in one at a time while the cast is reviewed.
     */
    scene?: 'gumdrops';
    /** Variables shown as big stat cards above the Illustrated drawing, in this order. */
    statCards?: string[];
  };
}

export const PROBLEMS: ProblemDef[] = [
  {
    id: 'tree-build',
    title: 'Build a Binary Tree',
    tags: ['Binary tree', 'Recursion (DFS)'],
    description: [
      'Build a small binary tree one node at a time, then measure its height with a recursive depth-first search.',
      'The height is the number of nodes on the longest path from the root down to a leaf.',
    ],
    explanation:
      'height(node) asks each subtree for its height, then adds 1 for the node itself. An empty subtree (null) has height 0, which stops the recursion.',
    mode: 'script',
    params: [],
    cases: [{ label: 'Example', inputs: {}, expected: { kind: 'variables', values: { h: 3 } } }],
    starter: `// Build a binary tree. Live Build draws it as you type.
const root = new TreeNode(5);
root.left = new TreeNode(3);
root.right = new TreeNode(8);
root.left.right = new TreeNode(4);

// Depth-first search: a tree's height is 1 + its taller subtree.
function height(node) {
  if (node === null) return 0;
  const left = height(node.left);
  const right = height(node.right);
  return 1 + Math.max(left, right);
}

const h = height(root);
`,
    tryThis: [
      'Change new TreeNode(3) to new TreeNode(9) and watch the drawing update.',
      'Attach node 4 somewhere else, such as root.right.right.',
      'Add root.left.left = root on a new line to see how a cycle is drawn.',
    ],
    python: {
      starter: `# Build a binary tree. Live Build draws it as you type.
root = TreeNode(5)
root.left = TreeNode(3)
root.right = TreeNode(8)
root.left.right = TreeNode(4)


# Depth-first search: a tree's height is 1 + its taller subtree.
def height(node):
    if node is None:
        return 0
    left = height(node.left)
    right = height(node.right)
    return 1 + max(left, right)


h = height(root)
`,
      explanation:
        'height(node) asks each subtree for its height, then adds 1 for the node itself. An empty subtree (None) has height 0, which stops the recursion.',
      tryThis: [
        'Change TreeNode(3) to TreeNode(9) and watch the drawing update.',
        'Attach node 4 somewhere else, such as root.right.right.',
        'Add root.left.left = root on a new line to see how a cycle is drawn.',
      ],
    },
  },
  {
    id: 'variables',
    title: 'Variables & Addition',
    tags: ['Basics'],
    description: [
      'Store two numbers in variables, then add them into a third variable.',
      'Reading a and b to compute sum copies their values. It does not change a or b.',
    ],
    explanation: 'Each let creates a labeled block. a + b reads both blocks, and the result goes into a new block named sum.',
    mode: 'script',
    params: [],
    cases: [{ label: 'Example', inputs: {}, expected: { kind: 'variables', values: { sum: 7 } } }],
    starter: `let a = 2;
let b = 5;
let sum = a + b;
`,
    tryThis: ['Change b to 10.', 'Add a line: a = a + 1; then compare a and sum.'],
    python: {
      starter: `a = 2
b = 5
sum = a + b
`,
      explanation: 'Each assignment creates a labeled block. a + b reads both blocks, and the result goes into a new block named sum.',
      tryThis: ['Change b to 10.', 'Add a line: a = a + 1, then compare a and sum.'],
    },
  },
  {
    id: 'serve-line',
    title: 'Serve the Line (Queue)',
    tags: ['Array', 'Queue'],
    description: [
      'A ticket counter: people join at the back of the line and are served from the front, first come, first served.',
      'push() adds a value at the end of the array (the back of the line). shift() removes and returns the first value (the front).',
    ],
    explanation:
      'A queue is first in, first out: whoever joined earliest is served next. Using one array, push() is joining the line and shift() is being served.',
    mode: 'script',
    params: [],
    cases: [{ label: 'Example', inputs: {}, expected: { kind: 'variables', values: { first: 7, second: 3, waiting: 2 } } }],
    starter: `// A ticket counter: join at the back, get served from the front.
const line = [];
line.push(7);
line.push(3);
line.push(9);

const first = line.shift(); // the person who joined first
line.push(5);
const second = line.shift();
const waiting = line.length;
`,
    tryThis: [
      'Swap shift() for pop(). Who gets served now?',
      'Add line.push(1) before the first shift() and watch where the new person stands.',
    ],
    python: {
      starter: `from collections import deque

# A ticket counter: join at the back, get served from the front.
line = deque()
line.append(7)
line.append(3)
line.append(9)

first = line.popleft()  # the person who joined first
line.append(5)
second = line.popleft()
waiting = len(line)
`,
      description: [
        'A ticket counter: people join at the back of the line and are served from the front, first come, first served.',
        'line is a deque (from collections). append() adds a value at its right end (the back of the line). popleft() removes and returns the leftmost value (the front).',
      ],
      explanation:
        'A queue is first in, first out: whoever joined earliest is served next. With a deque, append() is joining the line and popleft() is being served, and both take constant time.',
      tryThis: [
        'Swap popleft() for pop(). Who gets served now?',
        'Add line.append(1) before the first popleft() and watch where the new person stands.',
      ],
    },
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    tags: ['Array', 'Hash map'],
    description: [
      'Given an array of integers nums and a number target, return the indexes of the two numbers that add up to target.',
      'Each input has exactly one answer, and the same element cannot be used twice. The two indexes can be in any order.',
    ],
    explanation:
      'Walk through nums once. For each number, compute the complement target − nums[i]. If an earlier number equals the complement, the map already holds its index. Otherwise, remember this number and its index in the map.',
    mode: 'function',
    entry: 'twoSum',
    params: [
      { name: 'nums', kind: 'auto' },
      { name: 'target', kind: 'auto' },
    ],
    cases: [
      { label: 'Example 1', inputs: { nums: [2, 7, 11, 15], target: 9 }, expected: { kind: 'return', value: [0, 1] } },
      { label: 'Example 2', inputs: { nums: [3, 2, 4], target: 6 }, expected: { kind: 'return', value: [1, 2] } },
      { label: 'Duplicates', inputs: { nums: [3, 3], target: 6 }, expected: { kind: 'return', value: [0, 1] } },
    ],
    starter: `function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}
`,
    tryThis: [
      'Pick the Duplicates case: [3, 3] with target 6.',
      'Move seen.set(nums[i], i) above the if and run the Duplicates case to see the bug it causes.',
    ],
    python: {
      starter: `def twoSum(nums, target):
    seen = {}  # value → index

    for i in range(len(nums)):
        complement = target - nums[i]
        if complement in seen:
            return [seen[complement], i]
        seen[nums[i]] = i
    return []
`,
      explanation:
        'Walk through nums once. For each number, compute the complement target − nums[i]. If an earlier number equals the complement, the dict already holds its index. Otherwise, remember this number and its index in the dict.',
      tryThis: [
        'Pick the Duplicates case: [3, 3] with target 6.',
        'Move seen[nums[i]] = i above the if and run the Duplicates case to see the bug it causes.',
      ],
    },
    view: { resultIndicesInto: 'nums', mapColumns: ['value', 'index'], scene: 'gumdrops', statCards: ['target', 'complement'] },
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    tags: ['Array', 'Two pointers'],
    description: [
      'nums is sorted from smallest to largest. Return the index of target in nums, or -1 if it is not there.',
      'Binary search keeps a window from left to right that could still contain target, and halves it at every step.',
    ],
    explanation:
      'mid is the middle of the window. If nums[mid] is too small, everything up to mid can be ruled out (left = mid + 1). If it is too big, everything from mid on can be ruled out (right = mid - 1).',
    mode: 'function',
    entry: 'search',
    params: [
      { name: 'nums', kind: 'auto' },
      { name: 'target', kind: 'auto' },
    ],
    cases: [
      { label: 'Found', inputs: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, expected: { kind: 'return', value: 4 } },
      { label: 'Not found', inputs: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, expected: { kind: 'return', value: -1 } },
      { label: 'One item', inputs: { nums: [5], target: 5 }, expected: { kind: 'return', value: 0 } },
    ],
    starter: `function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}
`,
    tryThis: ['Try target 12 (the last item) and -1 (the first).', 'Change left <= right to left < right and search for 5 in [5].'],
    python: {
      starter: `def search(nums, target):
    left = 0
    right = len(nums) - 1

    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
`,
    },
  },
  {
    id: 'level-order',
    title: 'Level Order (BFS)',
    tags: ['Binary tree', 'Queue (BFS)'],
    description: [
      'Given the root of a binary tree, return its values level by level, from top to bottom and left to right.',
      'The tree input uses level-order format: [5,3,8,null,4] means 5 is the root, 3 and 8 are its children, and 4 is the right child of 3.',
    ],
    explanation:
      'Breadth-first search keeps a queue of nodes to visit. Each pass of the outer loop takes every node currently in the queue (one level) and adds their children to the back.',
    mode: 'function',
    entry: 'levelOrder',
    params: [{ name: 'root', kind: 'tree' }],
    cases: [
      { label: 'Example 1', inputs: { root: [5, 3, 8, null, 4] }, expected: { kind: 'return', value: [[5], [3, 8], [4]] } },
      { label: 'One node', inputs: { root: [1] }, expected: { kind: 'return', value: [[1]] } },
      { label: 'Empty tree', inputs: { root: [] }, expected: { kind: 'return', value: [] } },
    ],
    starter: `function levelOrder(root) {
  const levels = [];
  if (root === null) return levels;

  const queue = [root];
  while (queue.length > 0) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
    }
    levels.push(level);
  }
  return levels;
}
`,
    tryThis: ['Swap the two queue.push lines to visit right children first.'],
    python: {
      starter: `from collections import deque


def levelOrder(root):
    levels = []
    if root is None:
        return levels

    queue = deque([root])
    while len(queue) > 0:
        size = len(queue)
        level = []
        for _ in range(size):
            node = queue.popleft()
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        levels.append(level)
    return levels
`,
      tryThis: ['Swap the two queue.append lines to visit right children first.'],
    },
  },
  {
    id: 'reverse-list',
    title: 'Reverse a Linked List',
    tags: ['Linked list', 'Pointers'],
    description: [
      'Given the head of a singly linked list, reverse the list and return the new head.',
      'The input [1,2,3,4] means 1 → 2 → 3 → 4 → null.',
    ],
    explanation:
      'Walk the list with curr. Before changing curr.next, save the rest of the list in next. Then point curr back at prev and move both pointers one step forward.',
    mode: 'function',
    entry: 'reverseList',
    params: [{ name: 'head', kind: 'list' }],
    resultKind: 'list',
    cases: [
      { label: 'Example 1', inputs: { head: [1, 2, 3, 4] }, expected: { kind: 'return', value: [4, 3, 2, 1] } },
      { label: 'One node', inputs: { head: [1] }, expected: { kind: 'return', value: [1] } },
      { label: 'Empty list', inputs: { head: [] }, expected: { kind: 'return', value: [] } },
    ],
    starter: `function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
`,
    tryThis: ['Delete the line const next = curr.next; and use curr = curr.next at the end. What breaks?'],
    python: {
      starter: `def reverseList(head):
    prev = None
    curr = head
    while curr is not None:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev
`,
      description: [
        'Given the head of a singly linked list, reverse the list and return the new head.',
        'The input [1,2,3,4] means 1 → 2 → 3 → 4 → None.',
      ],
      explanation:
        'Walk the list with curr. Before changing curr.next, save the rest of the list in nxt. Then point curr back at prev and move both pointers one step forward.',
      tryThis: ['Delete the line nxt = curr.next and use curr = curr.next at the end. What breaks?'],
    },
  },
];

export const DEFAULT_PROBLEM_ID = 'tree-build';

/** A built-in example, or an available Foundations 75 exercise. */
export function problemById(id: string): ProblemDef | undefined {
  return PROBLEMS.find((p) => p.id === id) ?? practiceProblemById(id) ?? lessonProblemById(id);
}
