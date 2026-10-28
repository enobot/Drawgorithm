// Fully authored Foundations 75 exercises. Statements, examples, tests, hints and
// reference solutions are original to Drawgorithms. Each one is checked by
// foundations.test.ts: the reference solution must pass every example and test in the
// interpreter, and every expected output is recomputed by an independent method.
import type { ExerciseContent } from './schema';

interface Authored {
  prerequisites: string[];
  related: string[];
  content: ExerciseContent;
}

export const AUTHORED: Record<string, Authored> = {
  'f75-01': {
    prerequisites: ['arrays-basics', 'loops-and-indexes'],
    related: ['f75-02', 'f75-26'],
    content: {
      statement: [
        'A warehouse shelf holds item identifiers in a row, given as the array shelf. Return the index of the first slot that holds wanted, or -1 if no slot holds it.',
      ],
      inputFormat: 'shelf: an array of integers. wanted: an integer.',
      outputFormat: 'An integer: the smallest index i with shelf[i] === wanted, or -1.',
      constraints: ['0 ≤ shelf.length ≤ 10,000', 'Every identifier is an integer from -10^9 to 10^9.'],
      rules: [
        'Empty shelf: return -1.',
        'Duplicates: if wanted appears more than once, return the first (smallest) index.',
        'Values must be exactly equal (===).',
        'Do not change shelf.',
      ],
      entry: 'findFirst',
      params: [
        { name: 'shelf', kind: 'auto' },
        { name: 'wanted', kind: 'auto' },
      ],
      examples: [
        { inputs: { shelf: [42, 17, 8, 17], wanted: 17 }, output: 1, note: '17 is in two slots; the first is index 1.' },
        { inputs: { shelf: [5, 6, 7], wanted: 4 }, output: -1, note: 'Not on the shelf.' },
      ],
      tests: [
        { inputs: { shelf: [], wanted: 3 }, output: -1, note: 'Empty shelf' },
        { inputs: { shelf: [9], wanted: 9 }, output: 0, note: 'One slot, found' },
        { inputs: { shelf: [1, 1, 1], wanted: 1 }, output: 0, note: 'Every slot matches' },
        { inputs: { shelf: [4, 2, 7], wanted: 7 }, output: 2, note: 'Last slot' },
        { inputs: { shelf: [-3, 0, -3], wanted: -3 }, output: 0, note: 'Negative identifiers' },
        { inputs: { shelf: [10, 20, 30], wanted: 0 }, output: -1, note: 'Zero is not on the shelf' },
      ],
      starter: {
        javascript: `function findFirst(shelf, wanted) {
  // Look through the slots in order. Return the first index holding wanted, or -1.
  return -1;
}
`,
      },
      hints: [
        'Look at the slots one at a time, starting from index 0.',
        'The first time shelf[i] equals wanted, you can stop: no earlier slot matched.',
        'If the loop finishes without finding it, the item is not on the shelf: return -1.',
      ],
      solution: {
        explanation: [
          'Walk the shelf from left to right. The first slot that matches is the answer, so return its index immediately.',
          'If no slot matches, the loop ends and the function returns -1.',
        ],
        code: `function findFirst(shelf, wanted) {
  for (let i = 0; i < shelf.length; i++) {
    if (shelf[i] === wanted) return i;
  }
  return -1;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is shelf.length; each comparison takes constant time.' },
      },
      visualization: {
        spec: 'The shelf is drawn as numbered slots. The loop variable i is a flag over the slot being inspected; the illustrated view shows a shopper reading that slot and the comparison the code made. The run stops at the first match.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-02': {
    prerequisites: ['arrays-basics', 'hash-sets'],
    related: ['f75-03', 'f75-04'],
    content: {
      statement: [
        'A door sensor records visitor badge numbers in the order people walk in, as the array log.',
        'Return true if some badge number appears more than once, and false if every badge number is different.',
      ],
      inputFormat: 'log: an array of integers.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ log.length ≤ 100,000', 'Badge numbers are integers from -10^9 to 10^9.'],
      rules: ['An empty log or a log with one entry has no repeats: return false.', 'Do not change log.'],
      entry: 'hasRepeat',
      params: [{ name: 'log', kind: 'auto' }],
      examples: [
        { inputs: { log: [12, 7, 30, 7] }, output: true, note: 'Badge 7 came in twice.' },
        { inputs: { log: [3, 1, 4, 5] }, output: false, note: 'Every badge is different.' },
      ],
      tests: [
        { inputs: { log: [] }, output: false, note: 'Empty log' },
        { inputs: { log: [8] }, output: false, note: 'One visitor' },
        { inputs: { log: [2, 2] }, output: true, note: 'Back-to-back repeat' },
        { inputs: { log: [1, 2, 3, 4, 1] }, output: true, note: 'Repeat far apart' },
        { inputs: { log: [-1, 1] }, output: false, note: 'Opposite signs are different badges' },
        { inputs: { log: [0, 0, 0] }, output: true, note: 'Three times' },
      ],
      starter: {
        javascript: `function hasRepeat(log) {
  // Return true if any badge number appears more than once.
  return false;
}
`,
      },
      hints: [
        'As you walk through the log, you need to remember which badges you have already seen.',
        'A Set answers "have I seen this before?" quickly with has().',
        'Check before you add: if the set already has the badge, you found a repeat.',
      ],
      solution: {
        explanation: [
          'Keep a set of badges seen so far. For each badge, if the set already contains it, the log has a repeat.',
          'Otherwise add it and move on. Reaching the end means every badge was new.',
        ],
        code: `function hasRepeat(log) {
  const seen = new Set();
  for (let i = 0; i < log.length; i++) {
    if (seen.has(log[i])) return true;
    seen.add(log[i]);
  }
  return false;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is log.length; Set has/add take O(1) time on average.' },
      },
      visualization: {
        spec: 'The log is drawn as cells with the index i moving along it, next to the set growing one badge at a time. A lookup that finds the badge is marked "found".',
        renderers: ['array-cells', 'hash-set'],
      },
    },
  },

  'f75-03': {
    prerequisites: ['arrays-basics', 'hash-maps'],
    related: ['f75-02', 'f75-04'],
    content: {
      statement: [
        'A stockroom scanner reads item codes as boxes go past, given as the array codes.',
        'Return how many times each code was scanned, as a list of [code, count] pairs ordered by when each code was first scanned.',
      ],
      inputFormat: 'codes: an array of strings.',
      outputFormat: 'An array of [code, count] pairs, one per distinct code, in order of first appearance.',
      constraints: ['0 ≤ codes.length ≤ 100,000', 'Each code is 1 to 12 characters long.'],
      rules: [
        'Empty input: return [].',
        'Codes are case-sensitive: "AB" and "ab" are different codes.',
        'Order: pairs follow the order in which each code first appears.',
        'Do not change codes.',
      ],
      entry: 'countCodes',
      params: [{ name: 'codes', kind: 'auto' }],
      examples: [
        {
          inputs: { codes: ['bolt', 'nut', 'bolt', 'gear', 'nut', 'bolt'] },
          output: [
            ['bolt', 3],
            ['nut', 2],
            ['gear', 1],
          ],
          note: 'bolt was scanned first, so it comes first.',
        },
        {
          inputs: { codes: ['A', 'a'] },
          output: [
            ['A', 1],
            ['a', 1],
          ],
          note: 'Case matters.',
        },
      ],
      tests: [
        { inputs: { codes: [] }, output: [], note: 'Nothing scanned' },
        { inputs: { codes: ['x'] }, output: [['x', 1]], note: 'One box' },
        { inputs: { codes: ['k', 'k', 'k'] }, output: [['k', 3]], note: 'One code, many times' },
        {
          inputs: { codes: ['b', 'a', 'b', 'c', 'a'] },
          output: [
            ['b', 2],
            ['a', 2],
            ['c', 1],
          ],
          note: 'Order of first appearance, not alphabetical',
        },
      ],
      starter: {
        javascript: `function countCodes(codes) {
  // Return [code, count] pairs in the order each code first appears.
  return [];
}
`,
      },
      hints: [
        'Keep a running count for each code: a Map from code to count.',
        'counts.get(code) is undefined the first time a code appears; treat that as 0.',
        'Remember the order codes first appear in a separate array, then build the pairs from it at the end.',
      ],
      solution: {
        explanation: [
          'A map holds the count for each code seen so far. When a code appears for the first time, it is also added to an order list.',
          'At the end, each code in the order list becomes a [code, count] pair.',
        ],
        code: `function countCodes(codes) {
  const counts = new Map();
  const order = [];
  for (const code of codes) {
    if (!counts.has(code)) {
      counts.set(code, 0);
      order.push(code);
    }
    counts.set(code, counts.get(code) + 1);
  }
  const result = [];
  for (const code of order) {
    result.push([code, counts.get(code)]);
  }
  return result;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(k)',
          assumptions: 'n is codes.length and k the number of distinct codes; Map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The codes are drawn as cells; the counts map shows each code with its count, and the entry being updated is marked "stored". The order array grows as new codes appear.',
        renderers: ['array-cells', 'hash-map'],
      },
      view: { mapColumns: ['code', 'count'] },
    },
  },

  'f75-04': {
    prerequisites: ['arrays-basics', 'hash-maps'],
    related: ['f75-02', 'f75-09'],
    content: {
      statement: [
        'Packages wait on a dock with weights given as the array weights. A balanced shipment is two different packages whose weights add up to target.',
        'Return their indices [i, j] with i < j. If several pairs work, choose the pair with the smallest j; if more than one pair has that j, choose the smallest i. If no pair works, return [].',
      ],
      inputFormat: 'weights: an array of integers. target: an integer.',
      outputFormat: 'An array [i, j] with i < j, or [] when no pair exists.',
      constraints: ['0 ≤ weights.length ≤ 10,000', 'Weights and target are integers from -10^9 to 10^9.'],
      rules: [
        'A package cannot be paired with itself, but two different packages may weigh the same.',
        'Ties: smallest j first, then smallest i.',
        'Fewer than two packages: return [].',
        'Do not change weights.',
      ],
      entry: 'balancedPair',
      params: [
        { name: 'weights', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { weights: [4, 9, 2, 7], target: 11 }, output: [1, 2], note: '9 + 2 = 11 finishes at index 2, before 4 + 7 (index 3).' },
        { inputs: { weights: [5, 5, 3], target: 10 }, output: [0, 1], note: 'Two packages may weigh the same.' },
      ],
      tests: [
        { inputs: { weights: [], target: 5 }, output: [], note: 'No packages' },
        { inputs: { weights: [6], target: 12 }, output: [], note: 'One package cannot pair with itself' },
        { inputs: { weights: [1, 2, 3], target: 7 }, output: [], note: 'No pair works' },
        { inputs: { weights: [3, 3, 3], target: 6 }, output: [0, 1], note: 'Several pairs: smallest j, then smallest i' },
        { inputs: { weights: [2, 8, 8, 2], target: 10 }, output: [0, 1], note: 'Earliest finishing pair' },
        { inputs: { weights: [-4, 10, 6], target: 6 }, output: [0, 1], note: 'Negative weights' },
        { inputs: { weights: [0, 4, 0], target: 0 }, output: [0, 2], note: 'Zero target with zeros apart' },
        { inputs: { weights: [1, 5, 1, 5], target: 6 }, output: [0, 1], note: 'Smallest i for the smallest j' },
      ],
      starter: {
        javascript: `function balancedPair(weights, target) {
  // Return [i, j] (i < j) with weights[i] + weights[j] === target, or [].
  return [];
}
`,
      },
      hints: [
        'For a package of weight w, its partner must weigh target - w.',
        'Walk left to right and keep a Map from weight to the first index where you saw it.',
        'Check the map before adding the current package, so it never pairs with itself, and only store a weight the first time you see it (that gives the smallest i).',
      ],
      solution: {
        explanation: [
          'Scan j from left to right. Before looking at later packages, check whether an earlier package has the needed partner weight target - weights[j]. The first j where that succeeds is the smallest possible j.',
          'The map keeps the first index of each weight, so the partner it returns is the smallest i for that j.',
        ],
        code: `function balancedPair(weights, target) {
  const firstIndex = new Map(); // weight → first index seen
  for (let j = 0; j < weights.length; j++) {
    const partner = target - weights[j];
    if (firstIndex.has(partner)) {
      return [firstIndex.get(partner), j];
    }
    if (!firstIndex.has(weights[j])) {
      firstIndex.set(weights[j], j);
    }
  }
  return [];
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is weights.length; Map operations take O(1) time on average.' },
      },
      visualization: {
        spec: 'Weights are drawn as cells with j moving along them; the needed partner weight is computed beside it, and the firstIndex map shows weight → first index with lookups marked found or missing. The answer cells are ringed at the end.',
        renderers: ['array-cells', 'array-shelves', 'hash-map'],
      },
      view: { resultIndicesInto: 'weights', mapColumns: ['weight', 'first index'] },
    },
  },

  'f75-06': {
    prerequisites: ['strings-and-chars', 'two-pointers'],
    related: ['f75-08', 'f75-07'],
    content: {
      statement: [
        'A message reads the same both ways if, after ignoring every character that is not an English letter (a–z, A–Z) or a digit (0–9), and treating uppercase and lowercase letters as the same, the remaining characters read the same forward and backward.',
        'Return true if message reads the same both ways, otherwise false.',
      ],
      inputFormat: 'message: a string.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ message.length ≤ 200,000'],
      rules: [
        'Only A–Z, a–z and 0–9 count. Spaces, punctuation and any other characters (including accented letters) are ignored.',
        'A message with no counted characters (including the empty string) reads the same both ways: return true.',
        'Uppercase and lowercase versions of a letter are equal; digits are compared as they are.',
      ],
      entry: 'readsSameBothWays',
      params: [{ name: 'message', kind: 'auto' }],
      examples: [
        { inputs: { message: 'Kayak 9 kayak' }, output: true, note: 'Counted characters: kayak9kayak.' },
        { inputs: { message: 'Kayak 9 canoe' }, output: false, note: 'kayak9canoe reversed is eonac9kayak.' },
      ],
      tests: [
        { inputs: { message: '' }, output: true, note: 'Empty message' },
        { inputs: { message: '?!' }, output: true, note: 'No counted characters' },
        { inputs: { message: 'a' }, output: true, note: 'One letter' },
        { inputs: { message: 'Ab' }, output: false, note: 'Two different letters' },
        { inputs: { message: 'A b A' }, output: true, note: 'Spaces are ignored' },
        { inputs: { message: '0P' }, output: false, note: 'Digit against letter' },
        { inputs: { message: '12 3 21' }, output: true, note: 'Digits only' },
        { inputs: { message: 'Ab-ba' }, output: true, note: 'Punctuation in the middle' },
        { inputs: { message: 'racecar1' }, output: false, note: 'A trailing digit breaks it' },
      ],
      starter: {
        javascript: `function readsSameBothWays(message) {
  // Ignore anything that is not a letter or digit; treat upper and lower case as equal.
  return false;
}
`,
      },
      hints: [
        'Put one index at the start and one at the end, and move them toward each other.',
        'Skip characters that do not count. Compare the two counted characters after lowercasing them.',
        'Stop when the indexes meet or cross; any mismatch before that means false.',
      ],
      solution: {
        explanation: [
          'left starts at the first character and right at the last. Each index skips characters that do not count.',
          'When both stand on counted characters, their lowercase forms must match; then both move inward. If they meet or cross without a mismatch, the message reads the same both ways.',
        ],
        code: `function readsSameBothWays(message) {
  function counts(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
  }
  let left = 0;
  let right = message.length - 1;
  while (left < right) {
    if (!counts(message[left])) {
      left++;
    } else if (!counts(message[right])) {
      right--;
    } else {
      if (message[left].toLowerCase() !== message[right].toLowerCase()) return false;
      left++;
      right--;
    }
  }
  return true;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is message.length; each index moves past each character at most once.' },
      },
      visualization: {
        spec: 'The message is drawn as character cells with left and right as markers moving inward; skipped characters are passed over, and each comparison is shown in the explanation.',
        renderers: ['string-cells'],
      },
    },
  },

  'f75-17': {
    prerequisites: ['linked-list-basics'],
    related: ['f75-16', 'f75-20'],
    content: {
      statement: [
        'A singly linked list is given by its first node, head. Each node has a value val and a reference next to the following node (null after the last node).',
        'Reverse the list by changing the next references of the existing nodes, and return the new first node.',
      ],
      inputFormat:
        'head: the first node of a linked list, written as its values in order, e.g. [7, 1, 4] for 7 → 1 → 4 → null. [] is the empty list.',
      outputFormat: 'The first node of the reversed list, written the same way.',
      constraints: ['0 ≤ number of nodes ≤ 5,000', 'Node values are integers from -1000 to 1000.'],
      rules: [
        'Empty list: return null (written []).',
        'Reuse the existing nodes: change next references; do not create new nodes.',
        'Values may repeat; each node keeps its own value.',
      ],
      entry: 'reverseChain',
      params: [{ name: 'head', kind: 'list' }],
      resultKind: 'list',
      examples: [
        { inputs: { head: [7, 1, 4] }, output: [4, 1, 7], note: '7 → 1 → 4 becomes 4 → 1 → 7.' },
        { inputs: { head: [5, 5] }, output: [5, 5], note: 'Same values, but the two nodes swap places.' },
      ],
      tests: [
        { inputs: { head: [] }, output: [], note: 'Empty list' },
        { inputs: { head: [3] }, output: [3], note: 'One node' },
        { inputs: { head: [1, 2] }, output: [2, 1], note: 'Two nodes' },
        { inputs: { head: [9, 8, 7, 6, 5] }, output: [5, 6, 7, 8, 9], note: 'Five nodes' },
        { inputs: { head: [0, -1, 0] }, output: [0, -1, 0], note: 'Reads the same reversed' },
      ],
      starter: {
        javascript: `function reverseChain(head) {
  // Change each node's next so the list runs the other way. Return the new head.
  return head;
}
`,
      },
      hints: [
        'Walk the list with a reference curr, keeping prev: the node just behind it (null at first).',
        'Before changing curr.next, save the rest of the list in another variable, or you lose it.',
        'Point curr.next at prev, then move prev and curr one step forward. When curr is null, prev is the new head.',
      ],
      solution: {
        explanation: [
          'Three references do the work: prev (the reversed part so far), curr (the node being turned around) and next (the rest of the original list).',
          'Each step saves next, turns curr to point back at prev, then advances. No node is created; only next references change.',
        ],
        code: `function reverseChain(head) {
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
        complexity: {
          time: 'O(n)',
          space: 'O(1)',
          assumptions: 'n is the number of nodes; only three references are kept besides the list.',
        },
      },
      visualization: {
        spec: 'Nodes keep their places for the whole run while their next arrows (ropes, in the illustrated view) swing to new targets. prev, curr and next are flags over the nodes they refer to.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'f75-21': {
    prerequisites: ['stacks', 'strings-and-chars'],
    related: ['f75-22', 'f75-23'],
    content: {
      statement: [
        'text contains only the characters ( ) [ ] { }. It is properly nested when every opening symbol is closed by a closing symbol of the same kind, and symbols close in the reverse order they were opened.',
        'Return true if text is properly nested, otherwise false.',
      ],
      inputFormat: 'text: a string made of ( ) [ ] { } only.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ text.length ≤ 10,000'],
      rules: [
        'The empty string is properly nested: return true.',
        'A closing symbol with nothing open, or of the wrong kind, makes text not nested.',
        'Anything still open at the end makes text not nested.',
      ],
      entry: 'isNested',
      params: [{ name: 'text', kind: 'auto' }],
      examples: [
        { inputs: { text: '{[()()]}' }, output: true, note: 'Each pair closes inside the one around it.' },
        { inputs: { text: '[(])' }, output: false, note: '] arrives while ( is still the most recent open symbol.' },
      ],
      tests: [
        { inputs: { text: '' }, output: true, note: 'Empty text' },
        { inputs: { text: '(' }, output: false, note: 'Left open' },
        { inputs: { text: ')' }, output: false, note: 'Closed before anything opened' },
        { inputs: { text: '{()}' }, output: true, note: 'One pair inside another' },
        { inputs: { text: '({}[])' }, output: true, note: 'Two pairs side by side inside a third' },
        { inputs: { text: '(()' }, output: false, note: 'One still open' },
        { inputs: { text: '())' }, output: false, note: 'One extra closing' },
        { inputs: { text: ']' }, output: false, note: 'Closing square bracket alone' },
      ],
      starter: {
        javascript: `function isNested(text) {
  // Return true if every opening symbol is closed in the right order.
  return false;
}
`,
      },
      hints: [
        'The most recently opened symbol must be the first one closed. Which structure gives you "most recent first"?',
        'Push every opening symbol onto a stack.',
        'For a closing symbol, the stack must not be empty and its top must be the matching opener; pop it. At the end, the stack must be empty.',
      ],
      solution: {
        explanation: [
          'A stack holds the symbols that are open, most recent on top. An opening symbol is pushed.',
          'A closing symbol must match the top of the stack, which is then popped. Text is nested when every close matched and nothing is left open.',
        ],
        code: `function isNested(text) {
  const opener = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of text) {
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
    } else {
      if (stack.length === 0 || stack.pop() !== opener[c]) return false;
    }
  }
  return stack.length === 0;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(n)',
          assumptions: 'n is text.length; in the worst case every symbol is an opener and stays on the stack.',
        },
      },
      visualization: {
        spec: 'The stack is drawn upright with the newest symbol on top; pushes settle on top and matching pops lift off, while the loop moves through the text.',
        renderers: ['stack'],
      },
    },
  },

  'f75-26': {
    prerequisites: ['binary-search-idea', 'arrays-basics'],
    related: ['f75-27', 'f75-28'],
    content: {
      statement: [
        'Sensor readings are stored in the array readings, sorted from smallest to largest with no repeated values.',
        'Return the index of target in readings, or -1 if it is not there. Use a method that needs only O(log n) comparisons.',
      ],
      inputFormat: 'readings: an array of distinct integers in ascending order. target: an integer.',
      outputFormat: 'An integer: the index of target, or -1.',
      constraints: ['0 ≤ readings.length ≤ 100,000', 'Values are distinct integers from -10^9 to 10^9, sorted ascending.'],
      rules: ['Empty array: return -1.', 'Values are distinct, so the index is unique.', 'Do not change readings.'],
      entry: 'findReading',
      params: [
        { name: 'readings', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { readings: [2, 5, 8, 12, 19, 23], target: 19 }, output: 4, note: 'Found at index 4.' },
        { inputs: { readings: [2, 5, 8, 12, 19, 23], target: 6 }, output: -1, note: '6 would sit between 5 and 8, but it is not there.' },
      ],
      tests: [
        { inputs: { readings: [], target: 3 }, output: -1, note: 'No readings' },
        { inputs: { readings: [4], target: 4 }, output: 0, note: 'One reading, found' },
        { inputs: { readings: [4], target: 5 }, output: -1, note: 'One reading, missing' },
        { inputs: { readings: [1, 3], target: 1 }, output: 0, note: 'First of two' },
        { inputs: { readings: [1, 3], target: 3 }, output: 1, note: 'Last of two' },
        { inputs: { readings: [-10, -2, 0, 7, 11, 40, 41], target: 41 }, output: 6, note: 'Last reading' },
        { inputs: { readings: [-10, -2, 0, 7, 11, 40, 41], target: -10 }, output: 0, note: 'First reading' },
        { inputs: { readings: [-10, -2, 0, 7, 11, 40, 41], target: 8 }, output: -1, note: 'Missing, in the middle' },
      ],
      starter: {
        javascript: `function findReading(readings, target) {
  let low = 0;
  let high = readings.length - 1;
  // Narrow low..high until target is found or nothing is left.
  return -1;
}
`,
      },
      hints: [
        'Compare target with the reading in the middle: the result tells you which half cannot contain target.',
        'Keep a window low..high of indexes that could still hold target, with mid = Math.floor((low + high) / 2).',
        'Move low to mid + 1 or high to mid - 1; stop when low > high, which means target is not there.',
      ],
      solution: {
        explanation: [
          'low..high is the part of the array that could still contain target. Each comparison with the middle reading rules out half of it.',
          'If the middle reading is too small, everything up to mid is too small too (the array is sorted). If it is too big, everything from mid on is too big.',
        ],
        code: `function findReading(readings, target) {
  let low = 0;
  let high = readings.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (readings[mid] === target) return mid;
    if (readings[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}
`,
        complexity: {
          time: 'O(log n)',
          space: 'O(1)',
          assumptions: 'n is readings.length; each loop pass halves the window and does a constant number of comparisons.',
        },
      },
      visualization: {
        spec: 'Readings are numbered shelf slots. low and high are flags at the edges of the window, mid marks the slot being read, and slots outside low..high are taped off as ruled out. The thought bubble shows each comparison the code made.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-34': {
    prerequisites: ['trees-basics', 'queues', 'tree-traversal-bfs'],
    related: ['f75-31', 'f75-48'],
    content: {
      statement: [
        'Given the root of a binary tree, return its node values grouped by depth: the first group holds the root, the next group holds the nodes one level below it, and so on.',
        'Within a group, values go from left to right.',
      ],
      inputFormat:
        'root: a binary tree written in level order with null for a missing child, e.g. [6, 2, 9, null, 4] is 6 with children 2 and 9, and 4 as the right child of 2. [] is the empty tree.',
      outputFormat: 'An array of arrays of values, one inner array per level from top to bottom.',
      constraints: ['0 ≤ number of nodes ≤ 2,000', 'Node values are integers from -1000 to 1000.'],
      rules: ['Empty tree: return [].', 'Repeated values are kept, each in its own level.', 'Do not change the tree.'],
      entry: 'groupByLevel',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [6, 2, 9, null, 4] }, output: [[6], [2, 9], [4]], note: 'Three levels.' },
        { inputs: { root: [1, 2, null, 3] }, output: [[1], [2], [3]], note: 'A tree that leans left.' },
      ],
      tests: [
        { inputs: { root: [] }, output: [], note: 'Empty tree' },
        { inputs: { root: [5] }, output: [[5]], note: 'Just the root' },
        { inputs: { root: [1, 2, 3, 4, 5, 6, 7] }, output: [[1], [2, 3], [4, 5, 6, 7]], note: 'Full tree' },
        { inputs: { root: [3, 3, 3] }, output: [[3], [3, 3]], note: 'Repeated values' },
        { inputs: { root: [1, null, 2, null, 3] }, output: [[1], [2], [3]], note: 'A tree that leans right' },
        { inputs: { root: [8, 4, null, 2, null, 1] }, output: [[8], [4], [2], [1]], note: 'Four levels, one node each' },
      ],
      starter: {
        javascript: `function groupByLevel(root) {
  const levels = [];
  // Visit the tree one level at a time, from left to right.
  return levels;
}
`,
      },
      hints: [
        'Visit nodes in order of their distance from the root. A queue does exactly that: first in, first out.',
        'At the start of each round, the queue holds exactly one level. Remember how many nodes that is.',
        'Take that many nodes from the front, record their values, and add their children to the back.',
      ],
      solution: {
        explanation: [
          'The queue starts with the root. Each round, its current length is the size of one level.',
          'The round takes exactly that many nodes off the front, so children added to the back during the round wait for the next one.',
        ],
        code: `function groupByLevel(root) {
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
        complexity: {
          time: 'O(n) queue operations',
          space: 'O(w)',
          assumptions:
            'n is the number of nodes and w the widest level. Each node joins and leaves the queue once. Array.shift() can itself take time proportional to the queue length in JavaScript engines; a true queue (or a read index) keeps each step O(1).',
        },
      },
      visualization: {
        spec: 'The tree is drawn with the node being visited lit and nodes waiting in the queue badged. The queue is a line of people at a counter in the illustrated view: children join at the back and the front person is served.',
        renderers: ['binary-tree', 'queue-line'],
      },
    },
  },

  'f75-36': {
    prerequisites: ['recursion-basics', 'memoization'],
    related: ['f75-56', 'f75-57'],
    content: {
      statement: [
        'A staircase has n steps. Each move climbs either one step or two steps.',
        'Return the number of different move sequences that start at the bottom (step 0) and end exactly on step n.',
      ],
      inputFormat: 'n: an integer.',
      outputFormat: 'An integer: the number of move sequences.',
      constraints: ['0 ≤ n ≤ 30 (so the answer stays below 1,400,000)'],
      rules: [
        'n = 0: there is exactly one sequence, the empty one: return 1.',
        'Order matters: 1 then 2 is a different sequence from 2 then 1.',
      ],
      entry: 'countRoutes',
      params: [{ name: 'n', kind: 'auto' }],
      examples: [
        { inputs: { n: 3 }, output: 3, note: '1+1+1, 1+2 and 2+1.' },
        { inputs: { n: 5 }, output: 8, note: 'Eight ways to cover five steps.' },
      ],
      tests: [
        { inputs: { n: 0 }, output: 1, note: 'No steps: the empty sequence' },
        { inputs: { n: 1 }, output: 1, note: 'One step' },
        { inputs: { n: 2 }, output: 2, note: '1+1 or 2' },
        { inputs: { n: 4 }, output: 5, note: 'Four steps' },
        { inputs: { n: 10 }, output: 89, note: 'Ten steps' },
        { inputs: { n: 30 }, output: 1346269, note: 'Largest n: needs remembered answers to finish within the limits' },
      ],
      starter: {
        javascript: `function countRoutes(n) {
  // How many sequences of 1-step and 2-step moves land exactly on step n?
  return 0;
}
`,
      },
      hints: [
        'Think about the last move: it lands on step n from step n - 1 or from step n - 2.',
        'So routes(n) = routes(n - 1) + routes(n - 2), with routes(0) = 1 and routes(1) = 1.',
        'Plain recursion solves the same smaller staircases again and again. Store each answer the first time (in a Map) and reuse it.',
      ],
      solution: {
        explanation: [
          'Every sequence ending on step n ends with a 1-step move from n - 1 or a 2-step move from n - 2, and those two groups never overlap. So the count is routes(n - 1) + routes(n - 2).',
          'A memo map stores each routes(k) once computed, so every k from 0 to n is solved only once.',
        ],
        code: `function countRoutes(n) {
  const memo = new Map();
  function routes(k) {
    if (k <= 1) return 1;
    if (memo.has(k)) return memo.get(k);
    const ways = routes(k - 1) + routes(k - 2);
    memo.set(k, ways);
    return ways;
  }
  return routes(n);
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(n)',
          assumptions:
            'With the memo each k is computed once; the memo and the call stack each hold up to n entries. Without the memo the number of calls grows exponentially.',
        },
      },
      visualization: {
        spec: 'The call stack shows each routes(k) call waiting on smaller ones, base cases returning 1, and answers flowing back up. The memo map fills as answers are stored, and later calls find them there instead of recursing.',
        renderers: ['call-stack', 'hash-map'],
      },
      view: { mapColumns: ['k', 'routes(k)'] },
    },
  },

  'f75-25': {
    prerequisites: ['queues', 'sliding-window'],
    related: ['f75-24', 'f75-11'],
    content: {
      statement: [
        'A sensor logs one reading per minute in the array readings. For every stretch of k consecutive minutes, from the stretch that starts at minute 0 to the one that ends at the last minute, report the highest reading in that stretch.',
        'Return the peaks in order of where each stretch starts.',
      ],
      inputFormat: 'readings: an array of integers. k: an integer, the length of every stretch.',
      outputFormat: 'An array of readings.length - k + 1 integers: entry i is the largest of readings[i] through readings[i + k - 1].',
      constraints: ['1 ≤ k ≤ readings.length ≤ 100,000', 'Each reading is an integer from -10^9 to 10^9.'],
      rules: [
        'k is always at least 1 and at most readings.length, so there is at least one stretch.',
        'k = 1: every reading is its own peak.',
        'Ties: when the highest reading appears more than once in a stretch, the peak is that value.',
        'Aim for O(n) time overall: re-scanning every stretch from scratch is O(n·k).',
        'Do not change readings.',
      ],
      entry: 'windowPeaks',
      params: [
        { name: 'readings', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { readings: [4, 2, 12, 3, 8, 5], k: 3 },
          output: [12, 12, 12, 8],
          note: '12 is the peak of the first three stretches; then it leaves.',
        },
        { inputs: { readings: [7, 7, 7], k: 2 }, output: [7, 7], note: 'Equal readings: the peak is that value.' },
      ],
      tests: [
        { inputs: { readings: [5], k: 1 }, output: [5], note: 'One reading, one stretch' },
        { inputs: { readings: [2, 9, 4], k: 3 }, output: [9], note: 'One stretch covering everything' },
        {
          inputs: { readings: [1, 2, 3, 4, 5], k: 2 },
          output: [2, 3, 4, 5],
          note: 'Rising readings: each new one beats every earlier one',
        },
        { inputs: { readings: [9, 7, 5, 3, 1], k: 2 }, output: [9, 7, 5, 3], note: 'Falling readings: the peak leaves from the front' },
        { inputs: { readings: [-4, -2, -8, -1], k: 2 }, output: [-2, -2, -1], note: 'Negative readings' },
        { inputs: { readings: [3, 1, 3, 1, 3], k: 3 }, output: [3, 3, 3], note: 'The peak value repeats inside the stretch' },
        { inputs: { readings: [6, 1, 2, 0, 5], k: 1 }, output: [6, 1, 2, 0, 5], note: 'k = 1' },
      ],
      starter: {
        javascript: `function windowPeaks(readings, k) {
  const dq = []; // indexes of readings that could still be the peak of a later stretch
  const peaks = [];
  for (let i = 0; i < readings.length; i++) {
    // Drop indexes that can never be a peak again, add i,
    // then record a peak once the first full stretch has been read.
  }
  return peaks;
}
`,
      },
      hints: [
        'When a new reading arrives, any earlier reading that is not larger can never be a peak again: the new one outlasts it and is at least as high.',
        'Keep indexes in a deque whose readings decrease from front to back. Before adding i, pop indexes from the back while their reading is ≤ readings[i].',
        'The front holds the peak of the current stretch. Once the front index is outside the stretch (≤ i - k), shift it off the front.',
      ],
      solution: {
        explanation: [
          'dq holds indexes, and their readings strictly decrease from front to back. When reading i arrives, indexes at the back with a reading ≤ readings[i] are popped: reading i is at least as high and stays in every later stretch longer, so they can never be a peak again.',
          'After pushing i, the front index is the highest reading among the indexes kept. If it has fallen out of the stretch that ends at i (it is ≤ i - k), it is shifted off. From i = k - 1 on, readings[dq[0]] is the peak of the stretch ending at i.',
        ],
        code: `function windowPeaks(readings, k) {
  const dq = [];
  const peaks = [];
  for (let i = 0; i < readings.length; i++) {
    while (dq.length > 0 && readings[dq[dq.length - 1]] <= readings[i]) dq.pop();
    dq.push(i);
    if (dq[0] <= i - k) dq.shift();
    if (i >= k - 1) peaks.push(readings[dq[0]]);
  }
  return peaks;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(k)',
          assumptions:
            'n is readings.length. Each index is pushed once and removed at most once, so the loops do O(n) work in total; shift() is treated as O(1), as in a real deque (on a plain JavaScript array it can cost O(k)).',
        },
      },
      visualization: {
        spec: 'readings is drawn as cells with i over the newest reading. dq is drawn as a deque: front on the left, back on the right, each item with its index and the reading it points at (readings[dq[k]]), and a note when those readings decrease from front to back. Items leave on the end the code used: pop at the back, shift at the front.',
        renderers: ['array-cells', 'deque'],
      },
    },
  },

  'f75-41': {
    prerequisites: ['heaps', 'arrays-basics'],
    related: ['f75-42', 'f75-44'],
    content: {
      statement: [
        'A help desk keeps waiting tickets by priority number: the smaller the number, the more urgent the ticket. You receive the desk’s operations in order, as the array ops.',
        '["add", p] puts a ticket with priority p on the desk. ["next"] takes the most urgent ticket off the desk and records its priority, or records null if the desk is empty.',
        'Return everything ["next"] recorded, in order. Keep the waiting tickets in a binary min-heap stored in an array.',
      ],
      inputFormat: 'ops: an array of operations, each ["add", p] with an integer p, or ["next"].',
      outputFormat: 'An array with one entry per ["next"]: the priority taken off the desk, or null when it was empty.',
      constraints: ['0 ≤ ops.length ≤ 100,000', 'Priorities are integers from -10^9 to 10^9.'],
      rules: [
        'No operations: return [].',
        '["next"] on an empty desk records null and changes nothing.',
        'Duplicates: several tickets may share a priority; each is taken separately.',
        'Each operation should take O(log n) time, where n is the number of waiting tickets: store them as a binary min-heap (the children of slot i are slots 2i+1 and 2i+2).',
        'Name the array so it contains "heap" (for example heap or minHeap) and the drawing shows it as a tree; any other name can be chosen in "How this is drawn".',
      ],
      entry: 'priorityDesk',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: { ops: [['add', 5], ['add', 2], ['add', 8], ['next'], ['add', 1], ['next'], ['next']] },
          output: [2, 1, 5],
          note: 'The most urgent ticket waiting each time: 2, then the new 1, then 5.',
        },
        { inputs: { ops: [['next'], ['add', 3], ['next'], ['next']] }, output: [null, 3, null], note: 'An empty desk records null.' },
      ],
      tests: [
        { inputs: { ops: [] }, output: [], note: 'No operations' },
        { inputs: { ops: [['add', 4], ['add', 4], ['next'], ['next']] }, output: [4, 4], note: 'Two tickets with the same priority' },
        {
          inputs: { ops: [['add', -3], ['add', 0], ['add', -7], ['next'], ['next'], ['next']] },
          output: [-7, -3, 0],
          note: 'Negative priorities',
        },
        {
          inputs: { ops: [['add', 9], ['add', 7], ['add', 5], ['add', 3], ['add', 1], ['next'], ['next'], ['next'], ['next'], ['next']] },
          output: [1, 3, 5, 7, 9],
          note: 'Each new ticket is the most urgent so far: it rises to the top',
        },
        {
          inputs: {
            ops: [['add', 1], ['add', 2], ['add', 3], ['add', 4], ['add', 5], ['add', 6], ['add', 7], ['next'], ['next'], ['next']],
          },
          output: [1, 2, 3],
          note: 'After each removal the moved ticket sinks two levels',
        },
        {
          inputs: { ops: [['add', 10], ['next'], ['add', 20], ['add', 5], ['next'], ['next'], ['next']] },
          output: [10, 5, 20, null],
          note: 'The desk empties and refills',
        },
      ],
      starter: {
        javascript: `function priorityDesk(ops) {
  const heap = []; // heap[0] is the most urgent; the children of slot i are slots 2i + 1 and 2i + 2
  const taken = [];
  for (const op of ops) {
    if (op[0] === 'add') {
      // Put op[1] on the desk, then move it up while it is more urgent than its parent.
    } else {
      // Take heap[0] (or record null), move the last ticket to the top, then move it down.
    }
  }
  return taken;
}
`,
      },
      hints: [
        'In a min-heap every slot is at most its children, so the most urgent ticket is always heap[0]. The parent of slot i is Math.floor((i - 1) / 2).',
        'To add: push the ticket at the end, then swap it with its parent while it is smaller than the parent.',
        'To take the top: record heap[0], move the last ticket into slot 0 (pop it off the end first), then swap it with its smaller child while that child is smaller than it.',
      ],
      solution: {
        explanation: [
          'The heap array keeps the min-heap rule: heap[parent] ≤ heap[i] for every slot. Adding pushes the ticket at the end and swaps it upward while it is smaller than its parent, so the rule holds again.',
          'Taking the top records heap[0], pops the last ticket and puts it in slot 0, then swaps it downward with its smaller child while that child is smaller. Both repairs walk one path between the top and the bottom, so each takes O(log n) swaps.',
        ],
        code: `function priorityDesk(ops) {
  const heap = [];
  const taken = [];
  for (const op of ops) {
    if (op[0] === 'add') {
      heap.push(op[1]);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (heap[parent] <= heap[i]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    } else if (heap.length === 0) {
      taken.push(null);
    } else {
      taken.push(heap[0]);
      const last = heap.pop();
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        while (true) {
          const left = 2 * i + 1;
          const right = 2 * i + 2;
          let smallest = i;
          if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
          if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
          if (smallest === i) break;
          [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
          i = smallest;
        }
      }
    }
  }
  return taken;
}
`,
        complexity: {
          time: 'O(m log m)',
          space: 'O(m)',
          assumptions: 'm is ops.length; at most m tickets wait at once, and each add or next does O(log m) swaps on the heap path.',
        },
      },
      visualization: {
        spec: 'The heap array is drawn twice, in sync: as the complete binary tree it stands for and as its cells. i, parent, left, right and smallest are labels on both. A swap moves both values along the tree edge and between the cells; compared slots are marked "compared".',
        renderers: ['heap-tree', 'array-cells'],
      },
    },
  },

  'f75-46': {
    prerequisites: ['graphs-basics', 'queues'],
    related: ['f75-48', 'f75-47'],
    content: {
      statement: [
        'A region has n towns numbered 0 to n - 1. Each entry [a, b] of roads is a two-way road between towns a and b.',
        'Return true if you can travel from town start to town goal using the roads, and false otherwise.',
      ],
      inputFormat: 'n: an integer. roads: an array of [a, b] pairs. start, goal: integers from 0 to n - 1.',
      outputFormat: 'A boolean.',
      constraints: ['1 ≤ n ≤ 10,000', '0 ≤ roads.length ≤ 20,000', 'Every road joins two different towns.'],
      rules: [
        'start === goal: return true, even with no roads.',
        'No roads: only start itself is reachable.',
        'The same road may be listed more than once, in either order.',
        'Roads are two-way: [a, b] lets you go from a to b and from b to a.',
        'Do not change roads.',
      ],
      entry: 'canReach',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'roads', kind: 'auto' },
        { name: 'start', kind: 'auto' },
        { name: 'goal', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 5,
            roads: [
              [0, 1],
              [1, 2],
              [3, 4],
            ],
            start: 0,
            goal: 2,
          },
          output: true,
          note: '0 → 1 → 2.',
        },
        {
          inputs: {
            n: 5,
            roads: [
              [0, 1],
              [1, 2],
              [3, 4],
            ],
            start: 0,
            goal: 4,
          },
          output: false,
          note: 'Towns 3 and 4 are cut off from 0.',
        },
      ],
      tests: [
        { inputs: { n: 1, roads: [], start: 0, goal: 0 }, output: true, note: 'Start is the goal' },
        { inputs: { n: 3, roads: [], start: 0, goal: 2 }, output: false, note: 'No roads at all' },
        {
          inputs: {
            n: 4,
            roads: [
              [2, 3],
              [3, 2],
              [1, 2],
            ],
            start: 1,
            goal: 3,
          },
          output: true,
          note: 'A road listed twice, in both orders',
        },
        {
          inputs: {
            n: 6,
            roads: [
              [0, 1],
              [1, 2],
              [2, 3],
              [3, 4],
              [4, 5],
            ],
            start: 5,
            goal: 0,
          },
          output: true,
          note: 'A long chain, walked backwards',
        },
        {
          inputs: {
            n: 4,
            roads: [
              [0, 1],
              [2, 3],
            ],
            start: 1,
            goal: 2,
          },
          output: false,
          note: 'Two separate pairs',
        },
        {
          inputs: {
            n: 5,
            roads: [
              [0, 1],
              [1, 2],
              [2, 0],
              [3, 4],
            ],
            start: 2,
            goal: 4,
          },
          output: false,
          note: 'A loop that never reaches the goal',
        },
      ],
      starter: {
        javascript: `function canReach(n, roads, start, goal) {
  const graph = []; // graph[town] will list the towns one road away
  // Build graph from roads, then explore from start, remembering towns already visited.
  return false;
}
`,
      },
      hints: [
        'First turn the road list into neighbor lists: graph[a] gets b and graph[b] gets a.',
        'Explore from start with a queue (or a stack). Keep a visited set so no town is explored twice; a loop of roads would otherwise never end.',
        'If goal is ever taken out of the queue, it is reachable. If the queue empties first, it is not.',
      ],
      solution: {
        explanation: [
          'graph[t] lists the towns one road away from t; each road is added in both directions.',
          'A breadth-first search starts at start. visited holds every town that has entered the queue, so each town is queued once. Reaching goal means a route exists; an empty queue means every reachable town was explored without finding it.',
        ],
        code: `function canReach(n, roads, start, goal) {
  const graph = [];
  for (let town = 0; town < n; town++) graph.push([]);
  for (const [a, b] of roads) {
    graph[a].push(b);
    graph[b].push(a);
  }
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const town = queue.shift();
    if (town === goal) return true;
    for (const next of graph[town]) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
`,
        complexity: {
          time: 'O(n + r)',
          space: 'O(n + r)',
          assumptions: 'r is roads.length; Set operations are O(1) on average and shift() is treated as O(1), as in a real queue.',
        },
      },
      visualization: {
        spec: 'Towns are vertices on a circle. Before graph is built, roads is drawn as the graph (an edge list); then graph’s edges appear as each road is added. During the search, visited towns get a check mark, towns waiting in the queue show their place (queue[0] is next), the town being explored lights up and the neighbor entry being read is a violet edge.',
        renderers: ['graph', 'queue-line', 'hash-set'],
      },
    },
  },

  'f75-48': {
    prerequisites: ['graphs-basics', 'queues'],
    related: ['f75-46', 'f75-50'],
    content: {
      statement: [
        'A network has n stations numbered 0 to n - 1. Each entry [a, b] of links is a two-way link between stations a and b; crossing one link is one hop.',
        'Return the fewest hops needed to get from station start to station goal, or -1 if goal cannot be reached.',
      ],
      inputFormat: 'n: an integer. links: an array of [a, b] pairs. start, goal: integers from 0 to n - 1.',
      outputFormat: 'An integer: the length of a shortest route, counted in links, or -1.',
      constraints: ['1 ≤ n ≤ 10,000', '0 ≤ links.length ≤ 20,000', 'Every link joins two different stations.'],
      rules: [
        'start === goal: return 0.',
        'Unreachable goal: return -1.',
        'The same link may be listed more than once; it is still one hop.',
        'Only the number of hops is returned, so when several shortest routes exist any of them gives the same answer.',
        'Do not change links.',
      ],
      entry: 'fewestHops',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'links', kind: 'auto' },
        { name: 'start', kind: 'auto' },
        { name: 'goal', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 5,
            links: [
              [0, 1],
              [1, 2],
              [2, 3],
              [3, 4],
              [0, 4],
            ],
            start: 0,
            goal: 3,
          },
          output: 2,
          note: '0 → 4 → 3 is shorter than going the long way round.',
        },
        {
          inputs: {
            n: 4,
            links: [
              [0, 1],
              [2, 3],
            ],
            start: 0,
            goal: 3,
          },
          output: -1,
          note: 'No route reaches station 3.',
        },
      ],
      tests: [
        { inputs: { n: 1, links: [], start: 0, goal: 0 }, output: 0, note: 'Already there' },
        { inputs: { n: 2, links: [[0, 1]], start: 1, goal: 0 }, output: 1, note: 'One link, crossed backwards' },
        {
          inputs: {
            n: 5,
            links: [
              [0, 1],
              [0, 1],
              [1, 2],
            ],
            start: 0,
            goal: 2,
          },
          output: 2,
          note: 'A link listed twice',
        },
        {
          inputs: {
            n: 6,
            links: [
              [0, 1],
              [1, 2],
              [2, 3],
              [3, 4],
              [4, 5],
              [5, 0],
            ],
            start: 0,
            goal: 3,
          },
          output: 3,
          note: 'A ring: both ways round are three hops',
        },
        {
          inputs: {
            n: 7,
            links: [
              [0, 1],
              [0, 2],
              [1, 3],
              [2, 3],
              [3, 4],
              [4, 5],
              [5, 6],
              [2, 6],
            ],
            start: 0,
            goal: 6,
          },
          output: 2,
          note: 'A shortcut beats the long path',
        },
        { inputs: { n: 3, links: [[0, 1]], start: 0, goal: 2 }, output: -1, note: 'An isolated station' },
      ],
      starter: {
        javascript: `function fewestHops(n, links, start, goal) {
  const graph = []; // graph[s] will list the stations one link away
  const dist = []; // dist[s]: hops from start, once s has been reached
  // Build graph, then search outward from start one hop at a time.
  return -1;
}
`,
      },
      hints: [
        'Build neighbor lists from links, adding each link in both directions.',
        'A breadth-first search reaches stations in order of their distance: everything 1 hop away, then 2 hops, and so on.',
        'Record dist[v] = dist[u] + 1 the first time v is reached from u, and never change it afterwards. dist[goal] is the answer when goal leaves the queue.',
      ],
      solution: {
        explanation: [
          'graph[s] lists the neighbors of station s. dist starts at -1 everywhere (not reached) and 0 at start.',
          'The queue hands out stations in order of distance. When u is taken out, every neighbor v that is still unreached gets dist[u] + 1 and joins the back of the queue. The first time goal comes out, dist[goal] is the fewest hops; an empty queue means goal was never reached.',
        ],
        code: `function fewestHops(n, links, start, goal) {
  const graph = [];
  for (let s = 0; s < n; s++) graph.push([]);
  for (const [a, b] of links) {
    graph[a].push(b);
    graph[b].push(a);
  }
  const dist = new Array(n).fill(-1);
  dist[start] = 0;
  const queue = [start];
  while (queue.length > 0) {
    const u = queue.shift();
    if (u === goal) return dist[u];
    for (const v of graph[u]) {
      if (dist[v] === -1) {
        dist[v] = dist[u] + 1;
        queue.push(v);
      }
    }
  }
  return -1;
}
`,
        complexity: {
          time: 'O(n + l)',
          space: 'O(n + l)',
          assumptions: 'l is links.length; shift() is treated as O(1), as in a real queue.',
        },
      },
      visualization: {
        spec: 'Stations are vertices on a circle with each one’s dist value next to it, so the search’s layers (0, 1, 2 hops) read directly off the drawing. Stations in the queue show their place, the station being explored lights up, and the neighbor entry being read is a violet edge. If your code records prev[v], those links are drawn as dashed arrows back toward start.',
        renderers: ['graph', 'queue-line', 'array-cells'],
      },
    },
  },

  'f75-51': {
    prerequisites: ['union-find', 'graphs-basics'],
    related: ['f75-52', 'f75-46'],
    content: {
      statement: [
        'A town has n residents numbered 0 to n - 1. Over time, residents meet. You receive the events in order, as the array events.',
        '["link", a, b] means residents a and b met: from now on they and everyone either of them is connected to belong to one community. ["ask", a, b] asks whether a and b are in the same community right now.',
        'Return the answers to every ["ask", …] in order: true if the two residents are connected through links made so far, false otherwise.',
      ],
      inputFormat: 'n: an integer. events: an array of ["link", a, b] and ["ask", a, b], with a and b from 0 to n - 1.',
      outputFormat: 'An array of booleans, one per "ask" event.',
      constraints: ['1 ≤ n ≤ 100,000', '0 ≤ events.length ≤ 100,000'],
      rules: [
        'No events: return [].',
        'A resident is always in their own community: ["ask", a, a] is true.',
        'Links may repeat, or join residents who are already connected; nothing changes then.',
        'An ask only sees links that came before it.',
        'Each event should take close to constant time: use union-find with a parent array (the drawing shows an array named parent as a forest).',
      ],
      entry: 'communities',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'events', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 5,
            events: [
              ['link', 0, 1],
              ['link', 3, 4],
              ['ask', 0, 1],
              ['ask', 1, 3],
              ['link', 1, 4],
              ['ask', 0, 3],
            ],
          },
          output: [true, false, true],
          note: '0 and 3 become connected only after 1 meets 4.',
        },
        {
          inputs: {
            n: 3,
            events: [
              ['ask', 0, 0],
              ['ask', 0, 2],
            ],
          },
          output: [true, false],
          note: 'Before any link, everyone is alone.',
        },
      ],
      tests: [
        { inputs: { n: 1, events: [] }, output: [], note: 'No events' },
        {
          inputs: {
            n: 4,
            events: [
              ['link', 0, 1],
              ['link', 1, 0],
              ['ask', 1, 0],
            ],
          },
          output: [true],
          note: 'The same link twice',
        },
        {
          inputs: {
            n: 6,
            events: [
              ['link', 0, 1],
              ['link', 1, 2],
              ['link', 2, 3],
              ['link', 3, 4],
              ['link', 4, 5],
              ['ask', 0, 5],
              ['ask', 5, 0],
            ],
          },
          output: [true, true],
          note: 'A long chain of links',
        },
        {
          inputs: {
            n: 6,
            events: [
              ['link', 0, 1],
              ['link', 2, 3],
              ['link', 4, 5],
              ['ask', 1, 2],
              ['link', 1, 2],
              ['ask', 0, 3],
              ['ask', 3, 4],
            ],
          },
          output: [false, true, false],
          note: 'An ask only sees earlier links',
        },
        {
          inputs: {
            n: 4,
            events: [
              ['link', 0, 1],
              ['link', 1, 2],
              ['link', 0, 2],
              ['ask', 2, 0],
              ['ask', 3, 3],
            ],
          },
          output: [true, true],
          note: 'A link inside one community, and a resident asked about themself',
        },
      ],
      starter: {
        javascript: `function communities(n, events) {
  const parent = []; // parent[r] === r means r is the root of its community
  const answers = [];
  // Start with everyone as their own root. For each event, find the roots of a and b:
  // "link" joins the two roots, "ask" compares them.
  return answers;
}
`,
      },
      hints: [
        'Give every resident a parent; at the start everyone is their own parent, so everyone is a root. Two residents are in the same community exactly when they lead to the same root.',
        'find(x) follows parent from x until it reaches a root. To link a and b, find both roots and, if they differ, make one root the parent of the other.',
        'Keep chains short: let find point every slot it passes straight at the root (path compression), and hang the smaller community under the larger one (keep a size per root).',
      ],
      solution: {
        explanation: [
          'parent[r] === r marks a root; every other resident points at another resident of the same community, and following parent always ends at that community’s root. size[r] counts a root’s members.',
          'find(x) returns the root and, on the way back, points every slot it passed directly at it. A link finds both roots and, if they differ, hangs the smaller community’s root under the larger one’s. An ask compares the two roots.',
        ],
        code: `function communities(n, events) {
  const parent = [];
  const size = [];
  for (let i = 0; i < n; i++) {
    parent.push(i);
    size.push(1);
  }
  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const answers = [];
  for (const [kind, a, b] of events) {
    const ra = find(a);
    const rb = find(b);
    if (kind === 'ask') {
      answers.push(ra === rb);
    } else if (ra !== rb) {
      if (size[ra] < size[rb]) {
        parent[ra] = rb;
        size[rb] += size[ra];
      } else {
        parent[rb] = ra;
        size[ra] += size[rb];
      }
    }
  }
  return answers;
}
`,
        complexity: {
          time: 'O(n + e·α(n))',
          space: 'O(n)',
          assumptions:
            'e is events.length and α is the inverse Ackermann function (at most 4 for any realistic n), which is what path compression together with union by size guarantees; the recursion in find is at most O(log n) deep thanks to union by size.',
        },
      },
      visualization: {
        spec: 'parent is drawn as a forest above the calls: every resident is a circle with an arrow to its parent, roots are ringed and labeled with their size. A link re-points one root’s arrow; find’s shortcuts re-point arrows toward the root, and the caption says which happened. The recursive find calls are on the call stack, and parent is also shown as cells.',
        renderers: ['union-find', 'array-cells', 'call-stack'],
      },
    },
  },

  'f75-66': {
    prerequisites: ['tries', 'strings-and-chars'],
    related: ['f75-67', 'f75-68'],
    content: {
      statement: [
        'Build a small dictionary that answers two kinds of questions quickly. You receive operations in order, as the array ops.',
        '["add", word] adds word to the dictionary. ["has", word] asks whether word itself was added. ["starts", prefix] asks whether some added word begins with prefix.',
        'Return an array with one entry per operation: null for "add", and the answer (true or false) for "has" and "starts".',
      ],
      inputFormat: 'ops: an array of ["add", word], ["has", word] and ["starts", prefix].',
      outputFormat: 'An array of the same length as ops: null for each "add", a boolean for each "has" and "starts".',
      constraints: ['0 ≤ ops.length ≤ 30,000', 'Every word and prefix has 1 to 20 lowercase letters a–z.'],
      rules: [
        'No operations: return [].',
        'Adding a word that is already there changes nothing.',
        '"has" needs the exact word: "ca" is not in the dictionary just because "cat" is.',
        'A word starts with itself: after adding "bee", ["starts", "bee"] is true.',
        'Each operation should take time proportional to the length of its word or prefix, not to the size of the dictionary: use a trie.',
      ],
      entry: 'runDictionary',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: {
            ops: [
              ['add', 'car'],
              ['add', 'cat'],
              ['has', 'ca'],
              ['starts', 'ca'],
              ['has', 'cat'],
            ],
          },
          output: [null, null, false, true, true],
          note: '"ca" is only a prefix; "cat" is a word.',
        },
        {
          inputs: {
            ops: [
              ['starts', 'd'],
              ['add', 'do'],
              ['starts', 'd'],
              ['has', 'do'],
              ['has', 'dog'],
            ],
          },
          output: [false, null, true, true, false],
          note: 'Answers only see words added before them.',
        },
      ],
      tests: [
        { inputs: { ops: [] }, output: [], note: 'No operations' },
        {
          inputs: {
            ops: [
              ['add', 'a'],
              ['has', 'a'],
              ['starts', 'a'],
            ],
          },
          output: [null, true, true],
          note: 'A one-letter word',
        },
        {
          inputs: {
            ops: [
              ['add', 'tea'],
              ['add', 'tea'],
              ['has', 'tea'],
              ['has', 'te'],
            ],
          },
          output: [null, null, true, false],
          note: 'Added twice; a prefix is not a word',
        },
        {
          inputs: {
            ops: [
              ['add', 'ten'],
              ['add', 'tent'],
              ['has', 'ten'],
              ['has', 'tent'],
              ['starts', 'tents'],
            ],
          },
          output: [null, null, true, true, false],
          note: 'A word inside a longer word',
        },
        {
          inputs: {
            ops: [
              ['add', 'bee'],
              ['starts', 'bee'],
              ['starts', 'be'],
              ['starts', 'b'],
              ['starts', 'c'],
            ],
          },
          output: [null, true, true, true, false],
          note: 'A word starts with itself and with each of its prefixes',
        },
        {
          inputs: {
            ops: [
              ['has', 'x'],
              ['starts', 'x'],
            ],
          },
          output: [false, false],
          note: 'An empty dictionary',
        },
      ],
      starter: {
        javascript: `function runDictionary(ops) {
  const root = { children: {}, end: false }; // children: one branch per letter; end: a word stops here
  const out = [];
  for (const [kind, text] of ops) {
    // "add": walk down text, creating missing branches, and mark the last node as a word end.
    // "has" and "starts": walk down text and see where you end up.
  }
  return out;
}
`,
      },
      hints: [
        'Store words as paths of letters from a shared root: words with the same beginning share the same first branches.',
        'Each node is { children: {}, end: false }. To add, follow (or create) node.children[ch] for every letter, then set end = true on the last node.',
        'To answer, follow the letters. If a branch is missing, the answer is false. Otherwise "starts" is true, and "has" is true only if the last node’s end is true.',
      ],
      solution: {
        explanation: [
          'Each node holds children, one branch per letter, and end, which is true where an added word stops. The path from the root spells a prefix.',
          'Adding walks the word letter by letter, creating missing branches, and marks the last node. A query walks the same way and stops at the first missing branch: "starts" asks whether the walk finished, "has" also needs the end mark on the last node.',
        ],
        code: `function runDictionary(ops) {
  const root = { children: {}, end: false };
  const out = [];
  for (const [kind, text] of ops) {
    if (kind === 'add') {
      let node = root;
      for (const ch of text) {
        if (!node.children[ch]) node.children[ch] = { children: {}, end: false };
        node = node.children[ch];
      }
      node.end = true;
      out.push(null);
    } else {
      let node = root;
      for (const ch of text) {
        node = node.children[ch];
        if (!node) break;
      }
      out.push(kind === 'has' ? !!node && node.end : !!node);
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(total letters)',
          space: 'O(letters added)',
          assumptions: 'Each operation walks one node per letter; looking up a child by letter is O(1) on average.',
        },
      },
      visualization: {
        spec: 'The dictionary is drawn as a tree of letters from root: each branch is one character and a node where a word ends is ringed and marked "end", with the stored words listed underneath. node is a label on the node the code is at, the path from the root to it is highlighted, new branches appear as they are created, and a missing branch is reported in words.',
        renderers: ['trie'],
      },
    },
  },
};
