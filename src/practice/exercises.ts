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
};
