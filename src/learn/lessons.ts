// Concept lessons: an idea, an authored demo that runs on the board, and where the idea is
// used. Written for Drawgorithms: each demo solves an original problem with the same
// structure as a classic interview question. lessons.test.ts runs every demo case in the
// interpreter, checks its output against an independent computation, and checks that the
// board supports every drawing a lesson names.
import type { ExerciseParam, Renderer } from '../practice/schema';

export type LessonLevel = 'Basics' | 'Core patterns' | 'Advanced patterns';

export const LESSON_LEVELS: { level: LessonLevel; blurb: string }[] = [
  { level: 'Basics', blurb: 'The building blocks every pattern uses.' },
  { level: 'Core patterns', blurb: 'The moves most interview questions are built from.' },
  { level: 'Advanced patterns', blurb: 'Graphs, search and dynamic programming.' },
];

export interface LessonCase {
  label: string;
  inputs: Record<string, unknown>;
  output: unknown;
}

export interface Lesson {
  /** A key of LESSONS (practice/foundations.ts), which holds the title. */
  id: string;
  level: LessonLevel;
  /** The idea, in plain words. */
  idea: string[];
  /** How the demo applies the idea. */
  demoExplanation: string;
  /** What to look for on the board while stepping through, in order. */
  watch: string[];
  /** Interview questions with this structure, described in general terms. */
  usedFor: string[];
  /** Small edits that change the drawing in an instructive way. */
  tryThis: string[];
  demo: {
    entry: string;
    params: ExerciseParam[];
    cases: LessonCase[];
    code: string;
    renderers: Renderer[];
    resultKind?: 'list' | 'tree';
    view?: { resultIndicesInto?: string; mapColumns?: [string, string] };
  };
  /** Practice exercises (Foundations 75 ids) that use the idea. */
  practice: string[];
}

export const LESSON_CONTENT: Lesson[] = [
  // ---------------------------------------------------------------- Basics
  {
    id: 'arrays-basics',
    level: 'Basics',
    idea: [
      'An array keeps values in numbered slots: the first slot is 0 and the last is length − 1. Reading or writing nums[i] takes one step, wherever i is.',
      'Remembering where something is (an index) is often more useful than remembering the value itself: the value can always be read back from its slot.',
    ],
    demoExplanation:
      'best holds the index of the largest value seen so far. Each slot from 1 on is compared with nums[best], and best moves only when a strictly larger value appears, so ties keep the first one.',
    watch: [
      'best is a flag on a cell, not a copy of the value.',
      'Each check reads two cells: nums[i] and nums[best].',
      'At the second 9, best stays put: 9 > 9 is false.',
    ],
    usedFor: ['Finding the largest or smallest value and where it is', 'One pass that keeps the best candidate so far'],
    tryThis: ['Change > to >= and run again: best now ends on the last of the equal largest values.'],
    demo: {
      entry: 'largestAt',
      params: [{ name: 'nums', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { nums: [3, 9, 4, 9, 1] }, output: 1 },
        { label: 'Example 2', inputs: { nums: [-5, -2, -8] }, output: 1 },
      ],
      code: `function largestAt(nums) {
  let best = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[best]) best = i;
  }
  return best;
}
`,
      renderers: ['array-cells', 'array-shelves'],
    },
    practice: ['f75-01', 'f75-05', 'f75-08'],
  },
  {
    id: 'loops-and-indexes',
    level: 'Basics',
    idea: [
      'A for loop walks an index through the array: where it starts, when it stops and how it steps decide which slots are visited.',
      'Comparing neighbors means reading i − 1 and i, so the loop starts at 1. Off-by-one mistakes (starting at 0, or stopping at length instead of length − 1) are easy to make here.',
    ],
    demoExplanation:
      'The loop starts at 1 so every slot has a slot before it. Each round compares readings[i] with readings[i − 1] and counts a rise.',
    watch: [
      'i and i − 1 point at neighboring cells.',
      'An equal pair (5, 5) is not a rise.',
      'The loop stops after the last slot, when i equals readings.length.',
    ],
    usedFor: ['Counting changes between neighbors', 'Checking that a sequence is sorted', 'Comparing each value with the one before it'],
    tryThis: ['Start the loop at 0 and run again: readings[-1] is undefined, and the drawing shows the read past the start.'],
    demo: {
      entry: 'countRises',
      params: [{ name: 'readings', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { readings: [3, 5, 5, 2, 8, 9] }, output: 3 },
        { label: 'Example 2', inputs: { readings: [7] }, output: 0 },
      ],
      code: `function countRises(readings) {
  let rises = 0;
  for (let i = 1; i < readings.length; i++) {
    if (readings[i] > readings[i - 1]) rises++;
  }
  return rises;
}
`,
      renderers: ['array-cells', 'array-shelves'],
    },
    practice: ['f75-08', 'f75-10', 'f75-13'],
  },
  {
    id: 'strings-and-chars',
    level: 'Basics',
    idea: [
      'A string is a row of characters you can read by index, like an array, but you can’t change it in place: you build a new string instead.',
      'Many string problems walk runs of equal characters: one index marks where the run starts and a second one moves to where it ends.',
    ],
    demoExplanation:
      'i marks the start of a run. j moves right while the character stays the same, so j − i is the run’s length. The letter and the length are added to out, and i jumps to j.',
    watch: [
      'i and j are flags over the character cells.',
      'j runs ahead while text[j] equals text[i].',
      'out grows by one letter and one count per run.',
    ],
    usedFor: ['Compressing or counting runs of characters', 'Scanning text with two indexes', 'Building a new string from pieces'],
    tryThis: ['Try text "abc": every run has length 1.'],
    demo: {
      entry: 'squeeze',
      params: [{ name: 'text', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { text: 'aaabccdddd' }, output: 'a3b1c2d4' },
        { label: 'Example 2', inputs: { text: '' }, output: '' },
      ],
      code: `function squeeze(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && text[j] === text[i]) j++;
    out += text[i] + (j - i);
    i = j;
  }
  return out;
}
`,
      renderers: ['string-cells'],
    },
    practice: ['f75-06', 'f75-12'],
  },
  {
    id: 'hash-sets',
    level: 'Basics',
    idea: [
      'A set remembers which values it has seen. Asking “is x in the set?” takes about one step, however many values are stored.',
      'That turns “have I seen this before?” from a scan of everything so far into one lookup.',
    ],
    demoExplanation:
      'Each item is looked up in seen first. If it is there, this is the first item seen twice; otherwise it is added and the walk goes on.',
    watch: ['Each lookup is marked found or not found.', 'seen only grows.', 'The run stops at the first lookup that finds something.'],
    usedFor: ['Detecting duplicates', 'Remembering visited places in a search', 'Checking membership quickly'],
    tryThis: ['Swap the two lines inside the loop (add before has): every item is then found.'],
    demo: {
      entry: 'firstRepeat',
      params: [{ name: 'items', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { items: ['fig', 'kiwi', 'plum', 'kiwi', 'fig'] }, output: 'kiwi' },
        { label: 'Example 2', inputs: { items: [1, 2, 3] }, output: null },
      ],
      code: `function firstRepeat(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) return item;
    seen.add(item);
  }
  return null;
}
`,
      renderers: ['hash-set', 'array-cells'],
    },
    practice: ['f75-02', 'f75-72'],
  },
  {
    id: 'hash-maps',
    level: 'Basics',
    idea: [
      'A map stores a value under each key and finds it again in about one step. Counting is the classic use: the key is the thing, the value is how often it appeared.',
      'Updating a count is a lookup followed by a write: read the old count (0 if the key is new), add one, store it back.',
    ],
    demoExplanation:
      'counts maps each word to how often it has appeared so far. best is replaced only when a word’s count passes best’s count, so on a tie the word that reached the top count first wins.',
    watch: ['Each word is looked up, then written back with one more.', 'best changes only when a count strictly passes it.'],
    usedFor: ['Counting frequencies', 'Grouping items by a key', 'Finding a partner value seen earlier (pairs that add up to a target)'],
    tryThis: ['Try ["a", "b", "b", "a"]: both reach 2, and best stays b, the first to get there.'],
    demo: {
      entry: 'mostCommon',
      params: [{ name: 'words', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { words: ['red', 'blue', 'red', 'green', 'blue', 'red'] }, output: 'red' },
        { label: 'Example 2', inputs: { words: ['a', 'b'] }, output: 'a' },
      ],
      code: `function mostCommon(words) {
  const counts = new Map();
  let best = null;
  for (const w of words) {
    counts.set(w, (counts.has(w) ? counts.get(w) : 0) + 1);
    if (best === null || counts.get(w) > counts.get(best)) best = w;
  }
  return best;
}
`,
      renderers: ['hash-map', 'array-cells'],
      view: { mapColumns: ['word', 'count'] },
    },
    practice: ['f75-03', 'f75-04', 'f75-15'],
  },
  {
    id: 'matrices',
    level: 'Basics',
    idea: [
      'A grid is an array of rows, and each row is an array: grid[r][c] is row r, column c. grid.length is the number of rows and grid[0].length the number of columns.',
      'Which loop is outside decides the order cells are visited: rows first reads across, columns first reads down.',
    ],
    demoExplanation: 'The outer loop picks a column c; the inner loop walks down every row r of that column, adding grid[r][c].',
    watch: ['r and c mark the cell being read.', 'c stays fixed while r walks down the column.'],
    usedFor: ['Walking rows, columns or diagonals', 'Grid searches (islands, paths)', 'Rotating or transposing a matrix'],
    tryThis: ['Swap the loops to add up rows instead (and push one total per row).'],
    demo: {
      entry: 'columnTotals',
      params: [{ name: 'grid', kind: 'auto' }],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            grid: [
              [1, 2, 3],
              [4, 5, 6],
            ],
          },
          output: [5, 7, 9],
        },
        { label: 'Example 2', inputs: { grid: [[7], [8], [9]] }, output: [24] },
      ],
      code: `function columnTotals(grid) {
  const totals = [];
  for (let c = 0; c < grid[0].length; c++) {
    let sum = 0;
    for (let r = 0; r < grid.length; r++) sum += grid[r][c];
    totals.push(sum);
  }
  return totals;
}
`,
      renderers: ['grid', 'array-cells'],
    },
    practice: ['f75-73', 'f75-74', 'f75-47'],
  },
  {
    id: 'linked-list-basics',
    level: 'Basics',
    idea: [
      'A linked list is a chain of nodes. Each node holds a value and next, a reference to the node after it; the last node’s next is null.',
      'There are no indexes: to reach a node you follow next from the head, one node at a time.',
    ],
    demoExplanation: 'node starts at head and follows next until it falls off the end (null), counting nodes and adding up their values.',
    watch: [
      'node is a label that moves along the arrows.',
      'The loop ends when node becomes null.',
      'An empty list (head is null) never enters the loop.',
    ],
    usedFor: [
      'Walking or measuring a list',
      'Finding a node by value or position',
      'The first step of reversing, merging or splitting lists',
    ],
    tryThis: ['Change the loop to stop at the last node (node.next !== null) and see which value is missed.'],
    demo: {
      entry: 'listSummary',
      params: [{ name: 'head', kind: 'list' }],
      cases: [
        { label: 'Example 1', inputs: { head: [4, 7, 1] }, output: [3, 12] },
        { label: 'Example 2', inputs: { head: [] }, output: [0, 0] },
      ],
      code: `function listSummary(head) {
  let count = 0;
  let total = 0;
  for (let node = head; node !== null; node = node.next) {
    count++;
    total += node.val;
  }
  return [count, total];
}
`,
      renderers: ['linked-list', 'linked-list-ropes'],
    },
    practice: ['f75-16', 'f75-17', 'f75-20'],
  },
  {
    id: 'stacks',
    level: 'Basics',
    idea: [
      'A stack adds and removes at the same end, the top: the last thing pushed is the first thing popped (last in, first out).',
      'So a stack reverses order, and it remembers what is still waiting to be matched or undone.',
    ],
    demoExplanation: 'Every word is pushed in order. Popping them all takes them off the top, so they come out last word first.',
    watch: ['Pushes stack up the words; the top is the last one pushed.', 'Pops take from the top until the stack is empty.'],
    usedFor: ['Matching brackets', 'Undo and back buttons', 'Evaluating expressions', 'Simulating collisions or cancellations'],
    tryThis: ['Use stack.shift() instead of stack.pop(): the words come out in their original order, like a queue.'],
    demo: {
      entry: 'reverseWords',
      params: [{ name: 'sentence', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { sentence: 'first in last out' }, output: 'out last in first' },
        { label: 'Example 2', inputs: { sentence: 'solo' }, output: 'solo' },
      ],
      code: `function reverseWords(sentence) {
  const stack = [];
  for (const word of sentence.split(' ')) stack.push(word);
  const out = [];
  while (stack.length > 0) out.push(stack.pop());
  return out.join(' ');
}
`,
      renderers: ['stack', 'array-cells'],
    },
    practice: ['f75-21', 'f75-22', 'f75-23'],
  },
  {
    id: 'queues',
    level: 'Basics',
    idea: [
      'A queue adds at the back and removes from the front: the first thing in is the first thing out, like a line at a counter.',
      'Putting an item back at the end gives everyone a turn in order (round robin), and processing in arrival order is the heart of breadth-first search.',
    ],
    demoExplanation:
      'Each print job is [job number, pages left]. The printer takes the front job and prints one page; a job with pages left goes back to the end of the line, and a finished job is recorded.',
    watch: ['Jobs leave from the front and rejoin at the back.', 'done fills in the order jobs finish, not the order they arrived.'],
    usedFor: ['Breadth-first search (levels, fewest steps)', 'Round-robin scheduling', 'Processing events in arrival order'],
    tryThis: ['Give the first job 1 page: it finishes on the first turn.'],
    demo: {
      entry: 'finishOrder',
      params: [{ name: 'pages', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { pages: [2, 1, 3] }, output: [1, 0, 2] },
        { label: 'Example 2', inputs: { pages: [1, 1] }, output: [0, 1] },
      ],
      code: `function finishOrder(pages) {
  const queue = [];
  for (let i = 0; i < pages.length; i++) queue.push([i, pages[i]]);
  const done = [];
  while (queue.length > 0) {
    const [job, left] = queue.shift();
    if (left === 1) done.push(job);
    else queue.push([job, left - 1]);
  }
  return done;
}
`,
      renderers: ['queue-line', 'array-cells'],
    },
    practice: ['f75-34', 'f75-46', 'f75-48'],
  },
  {
    id: 'recursion-basics',
    level: 'Basics',
    idea: [
      'A recursive function solves a task by calling itself on a smaller copy of it. It needs a base case: an input small enough to answer directly.',
      'Each call waits on the call stack for the smaller one to return, then finishes its own part with that answer.',
    ],
    demoExplanation:
      'A number below 10 is its own digit sum (the base case). Otherwise the last digit, n % 10, is added to the digit sum of the rest, Math.floor(n / 10).',
    watch: [
      'The call stack grows by one call per digit.',
      'Calls return in the reverse order they were made.',
      'Each return value is used by the call waiting below it.',
    ],
    usedFor: [
      'Trees and nested structures',
      'Divide and conquer',
      'Backtracking searches',
      'Any “smaller copy of the same problem” definition',
    ],
    tryThis: ['Remove the base case and run: the calls never stop until the depth limit.'],
    demo: {
      entry: 'digitSum',
      params: [{ name: 'n', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { n: 4096 }, output: 19 },
        { label: 'Example 2', inputs: { n: 7 }, output: 7 },
      ],
      code: `function digitSum(n) {
  if (n < 10) return n;
  return (n % 10) + digitSum(Math.floor(n / 10));
}
`,
      renderers: ['call-stack'],
    },
    practice: ['f75-36', 'f75-31', 'f75-32'],
  },
  {
    id: 'sorting',
    level: 'Basics',
    idea: [
      'Insertion sort keeps the front of the array sorted. Each new item is lifted out, the larger items in front of it shift one slot right, and the item drops into the gap.',
      'It is simple and fast for small or nearly sorted inputs, but O(n²) in general; library sorts are O(n log n).',
    ],
    demoExplanation:
      'a is a copy, so nums is not changed. For each i, item = a[i] is held while j walks left over larger values, shifting each one right; then item goes into slot j + 1.',
    watch: [
      'Everything left of i is already sorted.',
      'Shifts copy a value one slot right before item is placed.',
      'Equal values never jump over each other (the sort is stable).',
    ],
    usedFor: ['Sorting first, then scanning (intervals, two pointers, greedy choices)', 'Keeping a small list in order as items arrive'],
    tryThis: ['Try an already sorted array: no shifts happen at all.'],
    demo: {
      entry: 'insertionSort',
      params: [{ name: 'nums', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { nums: [5, 2, 4, 1] }, output: [1, 2, 4, 5] },
        { label: 'Example 2', inputs: { nums: [3, 3, 1] }, output: [1, 3, 3] },
      ],
      code: `function insertionSort(nums) {
  const a = [...nums];
  for (let i = 1; i < a.length; i++) {
    const item = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > item) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = item;
  }
  return a;
}
`,
      renderers: ['array-cells', 'array-shelves'],
    },
    practice: ['f75-29', 'f75-61', 'f75-62'],
  },
  {
    id: 'bits',
    level: 'Basics',
    idea: [
      'Integers are stored in binary. n & 1 is the lowest bit (1 for odd numbers), and n >> 1 shifts every bit one place right, which drops the lowest bit and halves the number.',
      'Reading bits from the right and building the result from the left gives the binary digits.',
    ],
    demoExplanation: 'While rest has bits left, its lowest bit is put in front of digits and rest is shifted right by one.',
    watch: ['rest is drawn as bits; each shift moves them one place right.', 'digits grows from the right end to the left.'],
    usedFor: ['Counting set bits', 'Finding the value that appears once (XOR)', 'Subsets as bit masks', 'Powers of two'],
    tryThis: ['Try 255 or 256 and compare their bits.'],
    demo: {
      entry: 'binaryDigits',
      params: [{ name: 'n', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { n: 13 }, output: '1101' },
        { label: 'Example 2', inputs: { n: 0 }, output: '0' },
      ],
      code: `function binaryDigits(n) {
  if (n === 0) return '0';
  let digits = '';
  let rest = n;
  while (rest > 0) {
    digits = (rest & 1) + digits;
    rest = rest >> 1;
  }
  return digits;
}
`,
      renderers: ['bits'],
    },
    practice: ['f75-71', 'f75-72'],
  },

  // ---------------------------------------------------------------- Core patterns
  {
    id: 'two-pointers',
    level: 'Core patterns',
    idea: [
      'In a sorted array, a pointer at each end can find a pair with a given sum in one pass. If the pair adds up to too little, only moving left right can help; too much, only moving right left can.',
      'Each step rules out one value for good, so the search takes O(n) instead of trying every pair, O(n²).',
    ],
    demoExplanation:
      'left starts at the smallest value and right at the largest. Their sum is compared with target to decide which pointer moves.',
    watch: [
      'The window between left and right shrinks by one each step.',
      'Values outside it are ruled out.',
      'The answer is a pair of indexes into sorted.',
    ],
    usedFor: [
      'Pairs with a target sum in a sorted array',
      'Reversing or checking palindromes',
      'Merging sorted lists',
      'Container and trapping-water style questions',
    ],
    tryThis: ['Try target 2: no pair works, and the pointers meet.'],
    demo: {
      entry: 'pairWithSum',
      params: [
        { name: 'sorted', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { sorted: [1, 3, 4, 6, 9, 11], target: 13 }, output: [2, 4] },
        { label: 'Example 2', inputs: { sorted: [2, 5], target: 4 }, output: [] },
      ],
      code: `function pairWithSum(sorted, target) {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return [];
}
`,
      renderers: ['array-cells', 'array-shelves'],
      view: { resultIndicesInto: 'sorted' },
    },
    practice: ['f75-04', 'f75-07', 'f75-09', 'f75-10'],
  },
  {
    id: 'sliding-window',
    level: 'Core patterns',
    idea: [
      'A sliding window is a stretch of the array between two indexes. right moves forward to take in one more item; left moves forward to give items up when the window breaks a rule.',
      'Every item enters once and leaves at most once, so the whole scan is O(n).',
    ],
    demoExplanation:
      'right adds costs[right] to sum. While sum is over budget, the window gives up costs[left] from the front. The widest window that stays within budget is the answer.',
    watch: [
      'The band between left and right is the window.',
      'The inner loop only ever moves left forward.',
      'An empty window (left past right) is allowed.',
    ],
    usedFor: [
      'Longest or shortest stretch meeting a rule',
      'Substrings without repeated characters',
      'Fixed-size window sums and maximums',
    ],
    tryThis: ['Raise budget to 20: the window never shrinks.'],
    demo: {
      entry: 'longestWithin',
      params: [
        { name: 'costs', kind: 'auto' },
        { name: 'budget', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { costs: [2, 1, 5, 1, 1, 3], budget: 6 }, output: 3 },
        { label: 'Example 2', inputs: { costs: [7], budget: 5 }, output: 0 },
      ],
      code: `function longestWithin(costs, budget) {
  let left = 0;
  let sum = 0;
  let best = 0;
  for (let right = 0; right < costs.length; right++) {
    sum += costs[right];
    while (sum > budget) {
      sum -= costs[left];
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
      renderers: ['array-cells', 'array-shelves'],
    },
    practice: ['f75-11', 'f75-12', 'f75-13', 'f75-25'],
  },
  {
    id: 'prefix-sums',
    level: 'Core patterns',
    idea: [
      'A prefix sum array stores prefix[i] = the total of the first i values. Then the total of any stretch from..to is prefix[to + 1] − prefix[from]: one subtraction instead of a loop.',
      'Building the table takes one pass; after that, every range question costs O(1).',
    ],
    demoExplanation: 'prefix starts with 0 (the total of nothing) and grows by one total per value. Each query subtracts two of its slots.',
    watch: ['Each prefix slot is the one before it plus one value.', 'A query reads exactly two prefix slots.'],
    usedFor: [
      'Range sum queries',
      'Counting subarrays with a given sum (with a map of earlier prefix sums)',
      'Averages and balances over stretches',
    ],
    tryThis: ['Add the query [0, 3]: it reads prefix[4] − prefix[0], the whole array.'],
    demo: {
      entry: 'rangeTotals',
      params: [
        { name: 'nums', kind: 'auto' },
        { name: 'queries', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            nums: [3, -1, 4, 2],
            queries: [
              [0, 1],
              [1, 3],
              [2, 2],
            ],
          },
          output: [2, 5, 4],
        },
        { label: 'Example 2', inputs: { nums: [5], queries: [[0, 0]] }, output: [5] },
      ],
      code: `function rangeTotals(nums, queries) {
  const prefix = [0];
  for (let i = 0; i < nums.length; i++) prefix.push(prefix[i] + nums[i]);
  const out = [];
  for (const [from, to] of queries) out.push(prefix[to + 1] - prefix[from]);
  return out;
}
`,
      renderers: ['array-cells', 'grid'],
    },
    practice: ['f75-14', 'f75-15'],
  },
  {
    id: 'binary-search-idea',
    level: 'Core patterns',
    idea: [
      'Binary search halves the part of a sorted array that can still hold the answer. Checking the middle tells which half to throw away.',
      'Searching for the first slot whose value is at least target (a lower bound) handles duplicates and missing values the same way: the answer is where target would be inserted.',
    ],
    demoExplanation:
      'The answer is always between lo and hi. If sorted[mid] is too small, the answer is after mid; otherwise mid itself could be it, so hi moves to mid. The loop ends when lo meets hi.',
    watch: [
      'The window between lo and hi halves each step.',
      'Cells outside it are dimmed: they are ruled out.',
      'hi starts at length, one past the end, for “insert at the end”.',
    ],
    usedFor: [
      'Finding a value or an insertion point',
      'First and last position of a value',
      'Searching a rotated array',
      'Binary search on the answer (smallest capacity that works)',
    ],
    tryThis: ['Try target 9: lo ends at 5, past every slot.'],
    demo: {
      entry: 'firstAtLeast',
      params: [
        { name: 'sorted', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { sorted: [1, 3, 3, 5, 8], target: 3 }, output: 1 },
        { label: 'Example 2', inputs: { sorted: [1, 3, 3, 5, 8], target: 9 }, output: 5 },
      ],
      code: `function firstAtLeast(sorted, target) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
`,
      renderers: ['array-cells', 'array-shelves'],
    },
    practice: ['f75-26', 'f75-27', 'f75-28', 'f75-30'],
  },
  {
    id: 'fast-slow-pointers',
    level: 'Core patterns',
    idea: [
      'Two pointers walk the same list at different speeds: slow one node per step, fast two. If the list ends, fast reaches the end first. If it loops, fast laps slow and they meet inside the loop.',
      'The same trick finds the middle of a list: when fast reaches the end, slow is halfway.',
    ],
    demoExplanation:
      'slow and fast start at head. Each round slow moves once and fast twice; meeting means a loop, and fast running out of nodes means no loop.',
    watch: [
      'The dashed arrow is the link that closes the loop (built from pos).',
      'fast jumps two nodes per step.',
      'They meet on a node inside the loop.',
    ],
    usedFor: [
      'Detecting a cycle and finding where it starts',
      'Finding the middle node',
      'Spotting repeating sequences (a number that loops back)',
    ],
    tryThis: ['Set pos to -1: fast reaches the end and the answer is false.'],
    demo: {
      entry: 'hasLoop',
      params: [
        { name: 'head', kind: 'list' },
        { name: 'pos', kind: 'pos' },
      ],
      cases: [
        { label: 'Example 1', inputs: { head: [1, 2, 3, 4, 5], pos: 2 }, output: true },
        { label: 'Example 2', inputs: { head: [1, 2, 3], pos: -1 }, output: false },
      ],
      code: `function hasLoop(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
`,
      renderers: ['linked-list'],
    },
    practice: ['f75-18', 'f75-19'],
  },
  {
    id: 'trees-basics',
    level: 'Core patterns',
    idea: [
      'A binary tree node has a value and up to two children, left and right. A leaf has neither.',
      'Most tree answers combine the answers for the two subtrees: the function asks each child, then adds its own part.',
    ],
    demoExplanation:
      'An empty subtree has no leaves, a leaf counts as one, and any other node has as many leaves as its two subtrees together.',
    watch: [
      'The current node is lit; returned counts appear next to finished nodes.',
      'The call tree has the same shape as the tree itself.',
    ],
    usedFor: ['Size, height and leaf counts', 'Checking a property of every node', 'Path sums from root to leaves'],
    tryThis: ['Return 1 for an empty subtree instead of 0 and see every missing child counted.'],
    demo: {
      entry: 'countLeaves',
      params: [{ name: 'node', kind: 'tree' }],
      cases: [
        { label: 'Example 1', inputs: { node: [5, 3, 8, 1, null, 7, 9] }, output: 3 },
        { label: 'Example 2', inputs: { node: [4] }, output: 1 },
      ],
      code: `function countLeaves(node) {
  if (node === null) return 0;
  if (node.left === null && node.right === null) return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}
`,
      renderers: ['binary-tree', 'call-tree', 'call-stack'],
    },
    practice: ['f75-31', 'f75-32'],
  },
  {
    id: 'tree-traversal-dfs',
    level: 'Core patterns',
    idea: [
      'Depth-first search goes all the way down one branch before backing up. The three classic orders differ only in when the node itself is handled: before its children (preorder), between them (inorder) or after them (postorder).',
      'In a binary search tree, inorder visits the values in sorted order.',
    ],
    demoExplanation: 'visit goes left first, then records the node’s value, then goes right; an empty subtree just returns.',
    watch: ['out grows in sorted order because the tree is a search tree.', 'Each node is recorded between its two subtrees.'],
    usedFor: ['Checking a search tree’s order', 'The k-th smallest value', 'Serializing or copying a tree', 'Collecting paths'],
    tryThis: ['Move out.push above visit(node.left) for preorder, or below visit(node.right) for postorder.'],
    demo: {
      entry: 'inOrder',
      params: [{ name: 'root', kind: 'tree' }],
      cases: [
        { label: 'Example 1', inputs: { root: [6, 2, 9, 1, 4, null, 12] }, output: [1, 2, 4, 6, 9, 12] },
        { label: 'Example 2', inputs: { root: [] }, output: [] },
      ],
      code: `function inOrder(root) {
  const out = [];
  const visit = (node) => {
    if (node === null) return;
    visit(node.left);
    out.push(node.val);
    visit(node.right);
  };
  visit(root);
  return out;
}
`,
      renderers: ['binary-tree', 'call-tree', 'array-cells'],
    },
    practice: ['f75-33', 'f75-35'],
  },
  {
    id: 'tree-traversal-bfs',
    level: 'Core patterns',
    idea: [
      'Breadth-first search visits a tree level by level with a queue: take a node from the front, put its children at the back.',
      'Reading the queue’s size at the start of a level tells exactly how many of its nodes belong to that level.',
    ],
    demoExplanation:
      'For each level, size nodes are taken from the queue. The last of them is the one seen from the right; their children wait in the queue for the next level.',
    watch: ['Nodes waiting in the queue are badged in the tree.', 'k counts through one level; the last k records a value.'],
    usedFor: ['Level-by-level output', 'Shortest paths in unweighted graphs and grids', 'Minimum depth', 'Values seen from one side'],
    tryThis: ['Record the first node of each level (k === 0) to see the left side instead.'],
    demo: {
      entry: 'rightSide',
      params: [{ name: 'root', kind: 'tree' }],
      cases: [
        { label: 'Example 1', inputs: { root: [1, 2, 3, null, 5, null, 4] }, output: [1, 3, 4] },
        { label: 'Example 2', inputs: { root: [] }, output: [] },
      ],
      code: `function rightSide(root) {
  if (root === null) return [];
  const out = [];
  const queue = [root];
  while (queue.length > 0) {
    const size = queue.length;
    for (let k = 0; k < size; k++) {
      const node = queue.shift();
      if (k === size - 1) out.push(node.val);
      if (node.left !== null) queue.push(node.left);
      if (node.right !== null) queue.push(node.right);
    }
  }
  return out;
}
`,
      renderers: ['binary-tree', 'queue-line', 'array-cells'],
    },
    practice: ['f75-34', 'f75-48'],
  },
  {
    id: 'heaps',
    level: 'Core patterns',
    idea: [
      'A min-heap keeps the smallest value on top. It lives in an array as a complete binary tree: the children of slot i are slots 2i + 1 and 2i + 2, and every parent is no larger than its children.',
      'Adding a value sifts it up past larger parents; removing the top moves the last value to the top and sifts it down. Both take O(log n).',
    ],
    demoExplanation:
      'push appends x and swaps it up while its parent is larger. pop takes heap[0], puts the last value on top and swaps it down with its smaller child until both children are larger.',
    watch: [
      'The heap is drawn as a tree and as cells at once.',
      'Swaps glide between parent and child.',
      'The top is always the smallest value left.',
    ],
    usedFor: ['The k smallest or largest values', 'Merging sorted streams', 'Running medians (two heaps)', 'Scheduling and shortest paths'],
    tryThis: ['Flip the comparisons (> instead of <) for a max-heap: pop then gives the largest values.'],
    demo: {
      entry: 'smallestK',
      params: [
        { name: 'nums', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { nums: [7, 2, 9, 4, 1, 8], k: 3 }, output: [1, 2, 4] },
        { label: 'Example 2', inputs: { nums: [5, 5, 3], k: 2 }, output: [3, 5] },
      ],
      code: `function smallestK(nums, k) {
  const heap = [];
  const push = (x) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent] <= heap[i]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let small = i;
        if (left < heap.length && heap[left] < heap[small]) small = left;
        if (right < heap.length && heap[right] < heap[small]) small = right;
        if (small === i) break;
        [heap[small], heap[i]] = [heap[i], heap[small]];
        i = small;
      }
    }
    return top;
  };
  for (const x of nums) push(x);
  const out = [];
  for (let t = 0; t < k; t++) out.push(pop());
  return out;
}
`,
      renderers: ['heap-tree', 'array-cells'],
    },
    practice: ['f75-41', 'f75-42', 'f75-43', 'f75-44'],
  },
  {
    id: 'monotonic-stack',
    level: 'Core patterns',
    idea: [
      'A monotonic stack keeps the indexes of values still waiting for an answer, with their values decreasing from bottom to top.',
      'When a larger value arrives, it is the answer for every smaller value on top: they are popped and answered. Each index is pushed and popped once, so the scan is O(n).',
    ],
    demoExplanation:
      'stack holds indexes of values with no larger value yet. A new value pops every waiting index with a smaller value and writes itself as their answer, then waits too.',
    watch: [
      'The stack holds indexes; the values they point at decrease toward the top.',
      'One new value can answer several waiting ones at once.',
      'Values still waiting at the end keep -1.',
    ],
    usedFor: [
      'Next greater or warmer value',
      'Stock spans',
      'Largest rectangle in a histogram',
      'Removing digits to make the smallest number',
    ],
    tryThis: ['Change < to > in the while condition to find the next smaller value instead.'],
    demo: {
      entry: 'nextGreater',
      params: [{ name: 'values', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { values: [2, 7, 3, 5, 4, 6, 1] }, output: [7, -1, 5, 6, 6, -1, -1] },
        { label: 'Example 2', inputs: { values: [9, 8, 7] }, output: [-1, -1, -1] },
      ],
      code: `function nextGreater(values) {
  const answer = values.map(() => -1);
  const stack = [];
  for (let i = 0; i < values.length; i++) {
    while (stack.length > 0 && values[stack[stack.length - 1]] < values[i]) {
      answer[stack.pop()] = values[i];
    }
    stack.push(i);
  }
  return answer;
}
`,
      renderers: ['stack', 'array-cells'],
    },
    practice: ['f75-24', 'f75-23'],
  },
  {
    id: 'greedy',
    level: 'Core patterns',
    idea: [
      'A greedy algorithm makes the choice that looks best right now and never takes it back. It is fast, but it is only correct when you can argue that the best-looking choice never blocks a better answer.',
      'For coins of 25, 10, 5 and 1, taking the largest coin that fits is always optimal; for coins like 4, 3 and 1 it is not (6 = 3 + 3, but greedy gives 4 + 1 + 1).',
    ],
    demoExplanation: 'coins are largest first. Each coin is used as many times as it fits into what is left.',
    watch: ['rest only goes down.', 'A coin is never reconsidered once the loop moves past it.'],
    usedFor: [
      'Interval scheduling (earliest finish first)',
      'Jump games',
      'Gas stations around a loop',
      'Change making with canonical coins',
    ],
    tryThis: ['Try coins [4, 3, 1] with amount 6: greedy uses three coins where two would do.'],
    demo: {
      entry: 'fewestCoins',
      params: [
        { name: 'amount', kind: 'auto' },
        { name: 'coins', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { amount: 68, coins: [25, 10, 5, 1] }, output: [25, 25, 10, 5, 1, 1, 1] },
        { label: 'Example 2', inputs: { amount: 0, coins: [25, 10, 5, 1] }, output: [] },
      ],
      code: `function fewestCoins(amount, coins) {
  const used = [];
  let rest = amount;
  for (const coin of coins) {
    while (rest >= coin) {
      used.push(coin);
      rest -= coin;
    }
  }
  return used;
}
`,
      renderers: ['array-cells'],
    },
    practice: ['f75-62', 'f75-63', 'f75-64', 'f75-65'],
  },
  {
    id: 'intervals',
    level: 'Core patterns',
    idea: [
      'Interval questions usually start by sorting the intervals by where they start. Then any interval that overlaps the current group must start before the group ends.',
      'One pass over the sorted intervals either stretches the last group or starts a new one.',
    ],
    demoExplanation:
      'After sorting by start, each span either overlaps the last merged span (it starts before that one ends), which may then be stretched, or starts a new merged span.',
    watch: ['The sorted copy is drawn as rows of [start, end].', 'last[1] grows when a span overlaps it.'],
    usedFor: [
      'Merging overlapping intervals',
      'Inserting into a schedule',
      'Meeting rooms',
      'Covering a range with as few intervals as possible',
    ],
    tryThis: ['Change <= to < so spans that only touch ([1, 3] and [3, 4]) stay apart.'],
    demo: {
      entry: 'mergeSpans',
      params: [{ name: 'spans', kind: 'auto' }],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            spans: [
              [8, 10],
              [1, 3],
              [2, 6],
              [15, 18],
            ],
          },
          output: [
            [1, 6],
            [8, 10],
            [15, 18],
          ],
        },
        {
          label: 'Example 2',
          inputs: {
            spans: [
              [1, 4],
              [4, 5],
            ],
          },
          output: [[1, 5]],
        },
      ],
      code: `function mergeSpans(spans) {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [start, end] of sorted) {
    const last = out[out.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}
`,
      renderers: ['grid'],
    },
    practice: ['f75-61', 'f75-62'],
  },

  // ---------------------------------------------------------------- Advanced patterns
  {
    id: 'graphs-basics',
    level: 'Advanced patterns',
    idea: [
      'A graph is a set of vertices joined by edges. An adjacency list stores, for each vertex, the vertices it connects to; it is usually built from a list of edges.',
      'A search from one vertex (depth-first with a stack, or breadth-first with a queue) reaches everything connected to it, as long as visited vertices are remembered so nothing is explored twice.',
    ],
    demoExplanation:
      'adj is built from links, both ways. The search pops a vertex, and every neighbor not yet seen is marked and pushed. seen.size is how many vertices were reached.',
    watch: [
      'The graph is drawn from adj; links are drawn as the edge list it came from.',
      'Visited vertices get a check mark.',
      'The stack holds vertices still to explore.',
    ],
    usedFor: ['Counting connected groups', 'Checking if a route exists', 'Flood fill on grids', 'Cloning a graph'],
    tryThis: ['Change the stack to a queue (shift instead of pop): the same vertices are reached in a different order.'],
    demo: {
      entry: 'reachable',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'links', kind: 'auto' },
        { name: 'start', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            n: 6,
            links: [
              [0, 1],
              [1, 2],
              [3, 4],
            ],
            start: 0,
          },
          output: 3,
        },
        { label: 'Example 2', inputs: { n: 3, links: [], start: 2 }, output: 1 },
      ],
      code: `function reachable(n, links, start) {
  const adj = [];
  for (let v = 0; v < n; v++) adj.push([]);
  for (const [a, b] of links) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length > 0) {
    const v = stack.pop();
    for (const w of adj[v]) {
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return seen.size;
}
`,
      renderers: ['graph', 'hash-set', 'stack'],
    },
    practice: ['f75-46', 'f75-47', 'f75-52'],
  },
  {
    id: 'topological-sort',
    level: 'Advanced patterns',
    idea: [
      'In a directed graph of “a must come before b” rules, a topological order lists every vertex after everything it depends on.',
      'Kahn’s method counts, for each vertex, how many rules it still waits on. Vertices waiting on nothing are ready; taking one releases its followers. If some vertices are never ready, the rules contain a cycle.',
    ],
    demoExplanation:
      'next[a] lists what a unlocks and waiting[b] counts what b still needs. Ready vertices are taken in order, and each one lowers the count of the vertices it unlocks.',
    watch: [
      'waiting goes down as vertices are taken.',
      'A vertex joins ready when its count reaches 0.',
      'With a cycle, order ends up short.',
    ],
    usedFor: ['Course or build order', 'Detecting circular dependencies', 'Task scheduling'],
    tryThis: ['Add the rule [3, 0]: a cycle, and the answer becomes [].'],
    demo: {
      entry: 'courseOrder',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'before', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            n: 4,
            before: [
              [0, 1],
              [0, 2],
              [1, 3],
              [2, 3],
            ],
          },
          output: [0, 1, 2, 3],
        },
        {
          label: 'Example 2',
          inputs: {
            n: 2,
            before: [
              [0, 1],
              [1, 0],
            ],
          },
          output: [],
        },
      ],
      code: `function courseOrder(n, before) {
  const next = [];
  const waiting = [];
  for (let v = 0; v < n; v++) {
    next.push([]);
    waiting.push(0);
  }
  for (const [a, b] of before) {
    next[a].push(b);
    waiting[b]++;
  }
  const ready = [];
  for (let v = 0; v < n; v++) if (waiting[v] === 0) ready.push(v);
  const order = [];
  while (ready.length > 0) {
    const v = ready.shift();
    order.push(v);
    for (const w of next[v]) {
      waiting[w]--;
      if (waiting[w] === 0) ready.push(w);
    }
  }
  return order.length === n ? order : [];
}
`,
      renderers: ['graph', 'queue-line', 'array-cells'],
    },
    practice: ['f75-49'],
  },
  {
    id: 'shortest-paths',
    level: 'Advanced patterns',
    idea: [
      'With non-negative weights, Dijkstra’s algorithm finds the cheapest cost from one vertex to all others. It repeatedly settles the unsettled vertex with the smallest known cost: nothing found later can make that cost smaller.',
      'Settling a vertex relaxes its edges: a neighbor’s cost drops if going through this vertex is cheaper. A heap finds the smallest cost fast; this demo scans for it, which is simpler to follow.',
    ],
    demoExplanation:
      'dist starts at Infinity except for from. Each round picks the unsettled vertex u with the smallest dist, marks it done, and lowers dist[w] for each neighbor reachable more cheaply through u. Unreachable vertices are returned as -1.',
    watch: [
      'dist values appear next to the vertices and only go down.',
      'done marks settled vertices.',
      'Each relaxation reads an edge’s weight.',
    ],
    usedFor: ['Cheapest routes and network delays', 'Paths with the least effort or risk', 'Any shortest path with non-negative weights'],
    tryThis: ['Make the edge from 2 to 1 cost 10: vertex 1 is then reached directly instead.'],
    demo: {
      entry: 'cheapest',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'roads', kind: 'auto' },
        { name: 'from', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            n: 4,
            roads: [
              [0, 1, 4],
              [0, 2, 1],
              [2, 1, 2],
              [1, 3, 5],
            ],
            from: 0,
          },
          output: [0, 3, 1, 8],
        },
        { label: 'Example 2', inputs: { n: 3, roads: [[0, 1, 7]], from: 0 }, output: [0, 7, -1] },
      ],
      code: `function cheapest(n, roads, from) {
  const adj = [];
  const dist = [];
  const done = [];
  for (let v = 0; v < n; v++) {
    adj.push([]);
    dist.push(Infinity);
    done.push(false);
  }
  for (const [a, b, cost] of roads) {
    adj[a].push([b, cost]);
    adj[b].push([a, cost]);
  }
  dist[from] = 0;
  for (let round = 0; round < n; round++) {
    let u = -1;
    for (let v = 0; v < n; v++) {
      if (!done[v] && (u === -1 || dist[v] < dist[u])) u = v;
    }
    if (dist[u] === Infinity) break;
    done[u] = true;
    for (const [w, cost] of adj[u]) {
      if (dist[u] + cost < dist[w]) dist[w] = dist[u] + cost;
    }
  }
  return dist.map((d) => (d === Infinity ? -1 : d));
}
`,
      renderers: ['graph', 'array-cells'],
    },
    practice: ['f75-50'],
  },
  {
    id: 'union-find',
    level: 'Advanced patterns',
    idea: [
      'Union-find keeps groups as trees: every slot points to a parent, and a group’s root points to itself. Two items are in the same group when they reach the same root.',
      'Joining two groups hangs one root under the other. Hanging the smaller group under the larger one and shortening paths while climbing keep the trees very flat, so each operation is nearly O(1).',
    ],
    demoExplanation:
      'find climbs to the root, pointing each slot at its grandparent on the way (path halving). Each pair joins two groups unless they already share a root; the larger group becomes the root, and groups counts what is left.',
    watch: [
      'parent is drawn as a forest; roots are ringed with their size.',
      'A union re-points one root.',
      'A shortcut makes a slot skip a level.',
    ],
    usedFor: [
      'Counting connected groups as links arrive',
      'Finding the link that creates a cycle',
      'Merging accounts or friend circles',
      'Minimum spanning trees (Kruskal)',
    ],
    tryThis: ['Add the pair [5, 0]: the last two groups join and the answer becomes 1.'],
    demo: {
      entry: 'countGroups',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'pairs', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            n: 6,
            pairs: [
              [0, 1],
              [2, 3],
              [1, 3],
              [4, 5],
              [0, 2],
            ],
          },
          output: 2,
        },
        { label: 'Example 2', inputs: { n: 3, pairs: [] }, output: 3 },
      ],
      code: `function countGroups(n, pairs) {
  const parent = [];
  const size = [];
  for (let i = 0; i < n; i++) {
    parent.push(i);
    size.push(1);
  }
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let groups = n;
  for (const [a, b] of pairs) {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) continue;
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    size[ra] += size[rb];
    groups--;
  }
  return groups;
}
`,
      renderers: ['union-find', 'array-cells'],
    },
    practice: ['f75-51', 'f75-52', 'f75-53', 'f75-55'],
  },
  {
    id: 'tries',
    level: 'Advanced patterns',
    idea: [
      'A trie stores words letter by letter: each node has one child per next letter, so words that share a prefix share a path from the root.',
      'Looking up a prefix walks one node per letter, however many words are stored. Keeping a count on each node tells how many words pass through it.',
    ],
    demoExplanation:
      'Inserting walks the word’s letters, creating missing children and adding one to each node’s count. A prefix query walks its letters; if a letter is missing the answer is 0, otherwise it is the count of the node it ends on.',
    watch: [
      'Shared prefixes share branches.',
      'The number in a node’s corner is how many words pass through it.',
      'A query for a missing branch is reported.',
    ],
    usedFor: [
      'Prefix search and autocomplete',
      'Word dictionaries with wildcards',
      'Finding words on a board',
      'Shortest root or prefix replacement',
    ],
    tryThis: ['Add the word "team": the t and te nodes count one more.'],
    demo: {
      entry: 'prefixCounts',
      params: [
        { name: 'words', kind: 'auto' },
        { name: 'prefixes', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { words: ['tea', 'ten', 'to', 'inn'], prefixes: ['te', 't', 'i', 'x'] }, output: [2, 3, 1, 0] },
        { label: 'Example 2', inputs: { words: ['a'], prefixes: ['ab'] }, output: [0] },
      ],
      code: `function prefixCounts(words, prefixes) {
  const root = { children: {}, count: 0, end: false };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children[ch]) node.children[ch] = { children: {}, count: 0, end: false };
      node = node.children[ch];
      node.count++;
    }
    node.end = true;
  }
  const out = [];
  for (const p of prefixes) {
    let node = root;
    for (const ch of p) {
      node = node.children[ch];
      if (!node) break;
    }
    out.push(node ? node.count : 0);
  }
  return out;
}
`,
      renderers: ['trie', 'array-cells'],
    },
    practice: ['f75-66', 'f75-67', 'f75-68', 'f75-69'],
  },
  {
    id: 'backtracking',
    level: 'Advanced patterns',
    idea: [
      'Backtracking builds an answer one choice at a time. After exploring everything a choice leads to, it undoes the choice and tries the next one.',
      'The calls form a decision tree. Pruning, refusing a choice that can’t lead anywhere, cuts whole branches from it.',
    ],
    demoExplanation:
      'pick(start, left, chosen) tries each number from start on that still fits into left. It pushes the number, searches for the rest of the sum, and pops it again; reaching left = 0 records a copy of chosen.',
    watch: [
      'The call tree is the decision tree; each box shows start, what is left and the choices so far.',
      'Numbers too big for what is left get no call (pruning).',
      'chosen grows on the way down and shrinks on the way back.',
    ],
    usedFor: ['Subsets and combinations', 'Permutations', 'Word searches on a grid', 'Placing pieces under constraints (n-queens, sudoku)'],
    tryThis: ['Change pick(i + 1, ...) to pick(i, ...) so a number can be used again.'],
    demo: {
      entry: 'sumsTo',
      params: [
        { name: 'nums', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      cases: [
        {
          label: 'Example 1',
          inputs: { nums: [2, 3, 5, 7], target: 10 },
          output: [
            [2, 3, 5],
            [3, 7],
          ],
        },
        { label: 'Example 2', inputs: { nums: [4, 6], target: 5 }, output: [] },
      ],
      code: `function sumsTo(nums, target) {
  const out = [];
  const pick = (start, left, chosen) => {
    if (left === 0) {
      out.push([...chosen]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      if (nums[i] > left) continue;
      chosen.push(nums[i]);
      pick(i + 1, left - nums[i], chosen);
      chosen.pop();
    }
  };
  pick(0, target, []);
  return out;
}
`,
      renderers: ['call-tree', 'array-cells', 'call-stack'],
    },
    practice: ['f75-37', 'f75-38', 'f75-39', 'f75-40'],
  },
  {
    id: 'memoization',
    level: 'Advanced patterns',
    idea: [
      'Some recursions ask the same question many times: ways(k − 1) and ways(k − 2) overlap. Memoization stores each answer the first time it is computed and returns it straight away afterwards.',
      'That turns an exponential number of calls into one real computation per distinct input.',
    ],
    demoExplanation:
      'ways(k) counts the ways to tile a 2 × k strip with 1 × 2 tiles: the first tile stands up (leaving k − 1) or two lie flat (leaving k − 2). memo keeps each answer; a repeated call finds it and returns at once.',
    watch: [
      'Dashed boxes in the call tree repeat an earlier call.',
      'A repeated call finds its answer in memo and makes no calls of its own.',
    ],
    usedFor: ['Counting paths or ways', 'Edit distance and common subsequences, top down', 'Any recursion with repeated subproblems'],
    tryThis: ['Delete the memo.has line and run again: the call tree grows much bigger.'],
    demo: {
      entry: 'tilings',
      params: [{ name: 'n', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { n: 6 }, output: 13 },
        { label: 'Example 2', inputs: { n: 1 }, output: 1 },
      ],
      code: `function tilings(n) {
  const memo = new Map();
  const ways = (k) => {
    if (k <= 1) return 1;
    if (memo.has(k)) return memo.get(k);
    const total = ways(k - 1) + ways(k - 2);
    memo.set(k, total);
    return total;
  };
  return ways(n);
}
`,
      renderers: ['call-tree', 'hash-map', 'call-stack'],
      view: { mapColumns: ['k', 'ways'] },
    },
    practice: ['f75-36', 'f75-59', 'f75-60'],
  },
  {
    id: 'dp-basics',
    level: 'Advanced patterns',
    idea: [
      'Dynamic programming fills a table of answers to smaller questions, in an order where each entry only needs entries already filled.',
      'Counting coin combinations: ways[a] is the number of ways to make amount a. Taking coins one kind at a time counts each combination once, not once per order.',
    ],
    demoExplanation:
      'ways[0] = 1 (pay nothing). For each coin, every amount a from coin up adds the ways to make a − coin, which now may use this coin too.',
    watch: ['Each write reads one earlier cell, a − coin.', 'The table is filled once per coin, left to right.'],
    usedFor: ['Coin change (fewest coins or number of ways)', 'Climbing stairs and house robber style choices', 'Knapsack problems'],
    tryThis: ['Swap the two loops (amounts outside, coins inside): orders are then counted separately, and the answer grows.'],
    demo: {
      entry: 'changeWays',
      params: [
        { name: 'amount', kind: 'auto' },
        { name: 'coins', kind: 'auto' },
      ],
      cases: [
        { label: 'Example 1', inputs: { amount: 5, coins: [1, 2, 5] }, output: 4 },
        { label: 'Example 2', inputs: { amount: 3, coins: [2] }, output: 0 },
      ],
      code: `function changeWays(amount, coins) {
  const ways = [1];
  for (let a = 1; a <= amount; a++) ways.push(0);
  for (const coin of coins) {
    for (let a = coin; a <= amount; a++) ways[a] += ways[a - coin];
  }
  return ways[amount];
}
`,
      renderers: ['array-cells'],
    },
    practice: ['f75-56', 'f75-57', 'f75-58'],
  },
  {
    id: 'dp-2d',
    level: 'Advanced patterns',
    idea: [
      'Some tables have two dimensions: an entry depends on the one above it and the one to its left. Filling row by row, left to right, makes sure both are ready.',
      'Counting grid paths that move only right or down: the ways to reach a cell are the ways to reach the cell above plus the ways to reach the cell on its left. A blocked cell has 0.',
    ],
    demoExplanation:
      'paths[r][c] is filled in reading order: 0 for a wall, 1 for the start, otherwise the cell above plus the cell on the left (0 off the edge).',
    watch: [
      'r and c mark the cell being filled.',
      'Each entry reads the cell above and the cell to the left.',
      'The wall’s 0 cuts off paths through it.',
    ],
    usedFor: [
      'Grid paths with obstacles',
      'Minimum path sums',
      'Longest common subsequence and edit distance (two strings as the two axes)',
    ],
    tryThis: ['Remove the wall (set the middle 1 to 0): there are 6 paths.'],
    demo: {
      entry: 'gridPaths',
      params: [{ name: 'grid', kind: 'auto' }],
      cases: [
        {
          label: 'Example 1',
          inputs: {
            grid: [
              [0, 0, 0],
              [0, 1, 0],
              [0, 0, 0],
            ],
          },
          output: 2,
        },
        {
          label: 'Example 2',
          inputs: {
            grid: [
              [0, 1],
              [0, 0],
            ],
          },
          output: 1,
        },
      ],
      code: `function gridPaths(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const paths = [];
  for (let r = 0; r < rows; r++) {
    paths.push([]);
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) paths[r].push(0);
      else if (r === 0 && c === 0) paths[r].push(1);
      else paths[r].push((r > 0 ? paths[r - 1][c] : 0) + (c > 0 ? paths[r][c - 1] : 0));
    }
  }
  return paths[rows - 1][cols - 1];
}
`,
      renderers: ['grid'],
    },
    practice: ['f75-59', 'f75-60'],
  },
  {
    id: 'divide-and-conquer',
    level: 'Advanced patterns',
    idea: [
      'Divide and conquer splits a problem into halves, solves each half the same way, and combines the two answers.',
      'Merge sort splits the array in two, sorts each half recursively, and merges two sorted halves by repeatedly taking the smaller front value: O(n log n) in every case.',
    ],
    demoExplanation:
      'Arrays of length 0 or 1 are already sorted. Otherwise the two halves are sorted by recursive calls, and i and j walk the halves, always taking the smaller front value into merged.',
    watch: [
      'The call tree shows the splits; each finished call returns its sorted piece.',
      'During a merge, i and j point at the two front values being compared.',
    ],
    usedFor: ['Sorting', 'Counting inversions', 'Building balanced trees from sorted data', 'Finding the k-th largest by partitioning'],
    tryThis: ['Change <= to < in the merge: equal values then come from the right half first.'],
    demo: {
      entry: 'mergeSort',
      params: [{ name: 'nums', kind: 'auto' }],
      cases: [
        { label: 'Example 1', inputs: { nums: [5, 1, 4, 2, 8, 3] }, output: [1, 2, 3, 4, 5, 8] },
        { label: 'Example 2', inputs: { nums: [] }, output: [] },
      ],
      code: `function mergeSort(nums) {
  if (nums.length <= 1) return nums;
  const mid = Math.floor(nums.length / 2);
  const left = mergeSort(nums.slice(0, mid));
  const right = mergeSort(nums.slice(mid));
  const merged = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      merged.push(left[i]);
      i++;
    } else {
      merged.push(right[j]);
      j++;
    }
  }
  while (i < left.length) {
    merged.push(left[i]);
    i++;
  }
  while (j < right.length) {
    merged.push(right[j]);
    j++;
  }
  return merged;
}
`,
      renderers: ['call-tree', 'array-cells', 'call-stack'],
    },
    practice: ['f75-29', 'f75-07', 'f75-43'],
  },
];
