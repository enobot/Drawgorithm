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

  'f75-05': {
    prerequisites: ['arrays-basics', 'prefix-sums'],
    related: ['f75-14', 'f75-04'],
    content: {
      statement: [
        'A factory line has machines with output multipliers given as the array values. For each machine, report what the line would multiply to if that one machine were switched off: the product of every other value.',
        'Return an array where entry i is the product of all values except values[i]. Do it without division.',
      ],
      inputFormat: 'values: an array of integers.',
      outputFormat: 'An array of values.length integers.',
      constraints: [
        '1 ≤ values.length ≤ 100,000',
        'Each value is an integer from -30 to 30.',
        'Every product of all values but one fits in a 32-bit signed integer.',
      ],
      rules: [
        'One value: the product of no values is 1, so return [1].',
        'Zeros and duplicates are allowed; a zero makes every product that includes it 0.',
        'Do not use division: a value of 0 would make it fail.',
        'Do not change values.',
      ],
      entry: 'productsWithoutOne',
      params: [{ name: 'values', kind: 'auto' }],
      examples: [
        { inputs: { values: [2, 3, 4, 5] }, output: [60, 40, 30, 24], note: 'Entry 0 is 3 × 4 × 5 = 60.' },
        { inputs: { values: [1, 0, 3] }, output: [0, 3, 0], note: 'Only the entry that skips the 0 is not 0.' },
      ],
      tests: [
        { inputs: { values: [7] }, output: [1], note: 'One machine' },
        { inputs: { values: [-1, 2, -3] }, output: [-6, 3, -2], note: 'Negative values' },
        { inputs: { values: [0, 0, 5] }, output: [0, 0, 0], note: 'Two zeros' },
        { inputs: { values: [2, 2, 2, 2] }, output: [8, 8, 8, 8], note: 'All the same' },
        { inputs: { values: [5, -1] }, output: [-1, 5], note: 'Two values swap' },
      ],
      starter: {
        javascript: `function productsWithoutOne(values) {
  const result = []; // result[i]: product of everything except values[i]
  // Hint: what is multiplied before position i, and what after it?
  return result;
}
`,
      },
      hints: [
        'The product of everything except values[i] is (product of everything before i) × (product of everything after i).',
        'Walk left to right keeping a running product of what came before, and store it in result[i].',
        'Then walk right to left with a running product of what comes after, multiplying it into result[i].',
      ],
      solution: {
        explanation: [
          'result[i] first gets the product of every value before i: a running product, multiplied in only after it is stored, so values[i] itself never enters.',
          'A second pass from the right multiplies in the product of every value after i the same way. Each entry ends up with everything except its own value, and no division is needed.',
        ],
        code: `function productsWithoutOne(values) {
  const n = values.length;
  const result = new Array(n).fill(1);
  let before = 1;
  for (let i = 0; i < n; i++) {
    result[i] = before;
    before *= values[i];
  }
  let after = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= after;
    after *= values[i];
  }
  return result;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(1) besides the output',
          assumptions: 'n is values.length; the output array is not counted as extra space.',
        },
      },
      visualization: {
        spec: 'values and result are drawn as cells with i over the slot being filled. The first pass writes the products before each slot left to right; the second pass multiplies in the products after each slot right to left, so each write lights up the cell it changed.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-07': {
    prerequisites: ['arrays-basics', 'two-pointers'],
    related: ['f75-20', 'f75-08'],
    content: {
      statement: [
        'Two delivery depots each log the times their trucks arrive, in increasing order, as the arrays first and second.',
        'Return one list of every arrival time from both logs, in increasing order.',
      ],
      inputFormat: 'first, second: arrays of integers, each sorted in non-decreasing order.',
      outputFormat: 'An array holding every value of first and second, sorted in non-decreasing order.',
      constraints: ['0 ≤ first.length, second.length ≤ 100,000', 'Times are integers from -10^9 to 10^9.'],
      rules: [
        'Either log, or both, may be empty.',
        'Duplicates are kept: a time logged twice appears twice.',
        'Use both logs’ order: aim for O(n + m), not sorting everything again.',
        'Do not change first or second.',
      ],
      entry: 'mergeLogs',
      params: [
        { name: 'first', kind: 'auto' },
        { name: 'second', kind: 'auto' },
      ],
      examples: [
        { inputs: { first: [1, 4, 9], second: [2, 3, 10] }, output: [1, 2, 3, 4, 9, 10], note: 'The two logs interleave.' },
        { inputs: { first: [5, 5], second: [5] }, output: [5, 5, 5], note: 'Equal times are all kept.' },
      ],
      tests: [
        { inputs: { first: [], second: [] }, output: [], note: 'Both logs empty' },
        { inputs: { first: [], second: [1, 2] }, output: [1, 2], note: 'First log empty' },
        { inputs: { first: [3], second: [] }, output: [3], note: 'Second log empty' },
        { inputs: { first: [1, 2, 3], second: [4, 5] }, output: [1, 2, 3, 4, 5], note: 'One log entirely before the other' },
        { inputs: { first: [-5, 0, 7], second: [-6, 0, 8] }, output: [-6, -5, 0, 0, 7, 8], note: 'Negative times and a shared time' },
      ],
      starter: {
        javascript: `function mergeLogs(first, second) {
  const merged = [];
  // Keep one index in each log and repeatedly take the smaller time.
  return merged;
}
`,
      },
      hints: [
        'The smallest time overall is the smaller of first[0] and second[0].',
        'Keep an index i into first and j into second. Push the smaller of first[i] and second[j], and move that index.',
        'When one log runs out, push everything left in the other.',
      ],
      solution: {
        explanation: [
          'i and j point at the next unused time in each log. Whichever is smaller (first on ties) is the next time overall: it is pushed and its index moves on.',
          'When one log is used up, the rest of the other is already in order and is pushed as it is.',
        ],
        code: `function mergeLogs(first, second) {
  const merged = [];
  let i = 0;
  let j = 0;
  while (i < first.length && j < second.length) {
    if (first[i] <= second[j]) {
      merged.push(first[i]);
      i++;
    } else {
      merged.push(second[j]);
      j++;
    }
  }
  while (i < first.length) {
    merged.push(first[i]);
    i++;
  }
  while (j < second.length) {
    merged.push(second[j]);
    j++;
  }
  return merged;
}
`,
        complexity: {
          time: 'O(n + m)',
          space: 'O(n + m) for the output',
          assumptions: 'n and m are the two lengths; push is O(1) amortized.',
        },
      },
      visualization: {
        spec: 'first and second are drawn as cells with i and j over the next unused time in each; merged grows one cell at a time. Each comparison marks the two times it compared.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-08': {
    prerequisites: ['arrays-basics', 'two-pointers'],
    related: ['f75-07', 'f75-02'],
    content: {
      statement: [
        'A sensor stores its readings in increasing order in the array readings, but it repeats a reading whenever the value doesn’t change.',
        'Compact the array in place: move the distinct readings, once each and in order, to the front of readings. Return k, the number of distinct readings. What is left after the first k slots doesn’t matter.',
      ],
      inputFormat: 'readings: an array of integers sorted in non-decreasing order.',
      outputFormat: 'An integer k. After the call, readings[0] to readings[k - 1] hold the distinct readings in increasing order.',
      constraints: ['0 ≤ readings.length ≤ 100,000', 'Readings are integers from -10^9 to 10^9.'],
      rules: [
        'Empty array: return 0.',
        'Change readings in place; don’t build a second array. Use O(1) extra space.',
        'Only k is checked by the tests; the drawing shows whether the first k slots are right.',
      ],
      entry: 'compactReadings',
      params: [{ name: 'readings', kind: 'auto' }],
      examples: [
        { inputs: { readings: [1, 1, 2] }, output: 2, note: 'The front becomes [1, 2, …].' },
        { inputs: { readings: [3, 3, 3, 5, 8, 8, 9] }, output: 4, note: 'The front becomes [3, 5, 8, 9, …].' },
      ],
      tests: [
        { inputs: { readings: [] }, output: 0, note: 'No readings' },
        { inputs: { readings: [7] }, output: 1, note: 'One reading' },
        { inputs: { readings: [2, 2, 2, 2] }, output: 1, note: 'All the same' },
        { inputs: { readings: [1, 2, 3] }, output: 3, note: 'No repeats' },
        { inputs: { readings: [-3, -3, 0, 0, 4] }, output: 3, note: 'Negative readings' },
      ],
      starter: {
        javascript: `function compactReadings(readings) {
  // Keep a write index: the next slot that should receive a new distinct reading.
  return readings.length;
}
`,
      },
      hints: [
        'Because the array is sorted, equal readings sit next to each other.',
        'Use two indexes: read walks every slot; write is where the next new reading goes.',
        'A reading is new when it differs from the last one written, readings[write - 1]. Copy it to readings[write] and move write on.',
      ],
      solution: {
        explanation: [
          'write is the length of the compacted front. readings[0] always stays, so write starts at 1.',
          'read scans the rest. A reading different from readings[write - 1] (the last kept one) is new: it is copied to readings[write] and write grows. At the end, write is k.',
        ],
        code: `function compactReadings(readings) {
  if (readings.length === 0) return 0;
  let write = 1;
  for (let read = 1; read < readings.length; read++) {
    if (readings[read] !== readings[write - 1]) {
      readings[write] = readings[read];
      write++;
    }
  }
  return write;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is readings.length.' },
      },
      visualization: {
        spec: 'readings is drawn as cells with read and write as flags. Each copy lights up the cell written; the slots before write are the compacted readings so far.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-09': {
    prerequisites: ['arrays-basics', 'two-pointers'],
    related: ['f75-04', 'f75-10'],
    content: {
      statement: [
        'A loading dock lists package weights in increasing order in the array weights. Two different packages go on the scale together, and the goal is a total as close to target as possible.',
        'Return the sum of the two packages whose total is closest to target. If two sums are equally close (one below and one above target), return the smaller one.',
      ],
      inputFormat: 'weights: an array of integers in non-decreasing order. target: an integer.',
      outputFormat: 'An integer: weights[i] + weights[j] for some i < j.',
      constraints: ['2 ≤ weights.length ≤ 100,000', 'Weights and target are integers from -10^9 to 10^9.'],
      rules: [
        'The two packages must be at different positions; they may weigh the same.',
        'Ties: equally close sums → the smaller sum.',
        'An exact match is the closest possible: return target.',
        'Aim for O(n): the weights are already sorted.',
        'Do not change weights.',
      ],
      entry: 'closestPairSum',
      params: [
        { name: 'weights', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { weights: [1, 3, 6, 10, 15], target: 12 }, output: 11, note: '11 and 13 are both 1 away; 11 is smaller.' },
        { inputs: { weights: [2, 5, 9], target: 20 }, output: 14, note: 'Even the two heaviest fall short.' },
      ],
      tests: [
        { inputs: { weights: [4, 4], target: 1 }, output: 8, note: 'Only one pair' },
        { inputs: { weights: [-5, -2, 3, 8], target: 0 }, output: 1, note: 'Negative weights' },
        { inputs: { weights: [1, 2, 3, 4, 5], target: 7 }, output: 7, note: 'An exact match' },
        { inputs: { weights: [10, 20, 30, 40], target: 25 }, output: 30, note: 'Every pair is above target' },
        { inputs: { weights: [0, 0, 0], target: 5 }, output: 0, note: 'Equal weights' },
        { inputs: { weights: [-10, -3, 7, 11], target: -12 }, output: -13, note: 'A negative target' },
      ],
      starter: {
        javascript: `function closestPairSum(weights, target) {
  // Start with the lightest and heaviest packages and move inward.
  return weights[0] + weights[1];
}
`,
      },
      hints: [
        'Put left at the lightest package and right at the heaviest. Their sum is either too small, too big, or exactly target.',
        'Too small: only moving left to a heavier package can raise the sum. Too big: only moving right down can lower it.',
        'Remember the best sum seen so far, comparing |sum - target| and, on a tie, the smaller sum.',
      ],
      solution: {
        explanation: [
          'left and right start at the two ends. If their sum is below target, every pair using weights[left] with a lighter partner is even further below, so left moves right. If it is above, right moves left by the same argument. Each move discards only pairs that cannot beat what was already seen.',
          'best keeps the closest sum so far, preferring the smaller sum on equal distance. An exact match returns at once.',
        ],
        code: `function closestPairSum(weights, target) {
  let left = 0;
  let right = weights.length - 1;
  let best = weights[left] + weights[right];
  while (left < right) {
    const sum = weights[left] + weights[right];
    const gap = Math.abs(sum - target);
    const bestGap = Math.abs(best - target);
    if (gap < bestGap || (gap === bestGap && sum < best)) best = sum;
    if (sum === target) return sum;
    if (sum < target) left++;
    else right--;
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is weights.length; each step moves one of the two indexes inward.' },
      },
      visualization: {
        spec: 'weights is drawn as cells with left and right as flags and the band between them; the illustrated view shows shelves with the two packages being weighed. Each comparison marks the two weights read.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-10': {
    prerequisites: ['arrays-basics', 'two-pointers'],
    related: ['f75-09', 'f75-24'],
    content: {
      statement: [
        'A row of columns has the heights given in the array heights, each column one unit wide. After a storm, rain fills every dip between taller columns, as high as the lower of the tallest columns on its left and right.',
        'Return how many units of water stay trapped.',
      ],
      inputFormat: 'heights: an array of non-negative integers.',
      outputFormat: 'An integer: the total trapped water.',
      constraints: ['0 ≤ heights.length ≤ 100,000', '0 ≤ heights[i] ≤ 100,000'],
      rules: [
        'Fewer than three columns trap nothing.',
        'Water above a column is min(tallest to its left, tallest to its right) − its height, or 0 if that is negative.',
        'The ends spill: nothing is held past the first or last column.',
        'Aim for O(n) time and O(1) extra space.',
        'Do not change heights.',
      ],
      entry: 'trappedWater',
      params: [{ name: 'heights', kind: 'auto' }],
      examples: [
        { inputs: { heights: [3, 0, 2, 0, 4] }, output: 7, note: '3 + 1 + 3 units over the three low columns.' },
        { inputs: { heights: [2, 1, 2] }, output: 1, note: 'One unit in the middle.' },
      ],
      tests: [
        { inputs: { heights: [] }, output: 0, note: 'No columns' },
        { inputs: { heights: [5] }, output: 0, note: 'One column' },
        { inputs: { heights: [1, 2, 3] }, output: 0, note: 'Rising: everything spills' },
        { inputs: { heights: [3, 2, 1] }, output: 0, note: 'Falling: everything spills' },
        { inputs: { heights: [4, 1, 1, 4] }, output: 6, note: 'A flat basin' },
        { inputs: { heights: [0, 2, 0, 3, 0, 1, 0] }, output: 3, note: 'Two separate pools' },
      ],
      starter: {
        javascript: `function trappedWater(heights) {
  let water = 0;
  // Each column holds min(tallest on its left, tallest on its right) - its own height.
  return water;
}
`,
      },
      hints: [
        'The water over one column depends only on the tallest column to its left and the tallest to its right.',
        'Walk inward from both ends with left and right, keeping leftMax and rightMax.',
        'Move the side whose column is lower: its water is decided by its own side’s maximum, because the other side already has something at least as tall.',
      ],
      solution: {
        explanation: [
          'left and right walk inward; leftMax and rightMax are the tallest columns passed on each side. If heights[left] < heights[right], the right side has a column at least as tall as anything on the left, so the water over left is leftMax − heights[left] (after updating leftMax). Then left moves.',
          'Otherwise the same reasoning applies to the right side. Every column is settled once, so one pass is enough.',
        ],
        code: `function trappedWater(heights) {
  let left = 0;
  let right = heights.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left < right) {
    if (heights[left] < heights[right]) {
      leftMax = Math.max(leftMax, heights[left]);
      water += leftMax - heights[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, heights[right]);
      water += rightMax - heights[right];
      right--;
    }
  }
  return water;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is heights.length.' },
      },
      visualization: {
        spec: 'heights is drawn as cells with left and right as flags and the band between them still to settle; leftMax, rightMax and water are blocks that change as each column is settled.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-11': {
    prerequisites: ['arrays-basics', 'sliding-window'],
    related: ['f75-13', 'f75-25'],
    content: {
      statement: [
        'An observatory logs one brightness reading per hour in the array readings. Find the best stretch of exactly k consecutive hours: the one whose readings add up to the most.',
        'Return that largest total.',
      ],
      inputFormat: 'readings: an array of integers. k: an integer.',
      outputFormat: 'An integer: the largest sum of k consecutive readings.',
      constraints: ['1 ≤ k ≤ readings.length ≤ 100,000', 'Readings are integers from -10^4 to 10^4.'],
      rules: [
        'k is always valid, so there is at least one stretch.',
        'Readings can be negative; the answer can be negative.',
        'Aim for O(n): update the total as the stretch slides instead of re-adding k readings each time.',
        'Do not change readings.',
      ],
      entry: 'bestWindowSum',
      params: [
        { name: 'readings', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        { inputs: { readings: [2, -1, 4, 3, -2, 5], k: 2 }, output: 7, note: '4 + 3 is the best pair of hours.' },
        { inputs: { readings: [5, 5, 5], k: 3 }, output: 15, note: 'Only one stretch.' },
      ],
      tests: [
        { inputs: { readings: [9], k: 1 }, output: 9, note: 'One reading' },
        { inputs: { readings: [-4, -2, -7], k: 2 }, output: -6, note: 'All negative' },
        { inputs: { readings: [1, 2, 3, 4], k: 1 }, output: 4, note: 'k = 1: the largest reading' },
        { inputs: { readings: [3, -10, 3, 3], k: 2 }, output: 6, note: 'The best stretch is at the end' },
        { inputs: { readings: [0, 0, 0, 0], k: 4 }, output: 0, note: 'All zero' },
      ],
      starter: {
        javascript: `function bestWindowSum(readings, k) {
  // Add up the first k readings, then slide the stretch one hour at a time.
  return 0;
}
`,
      },
      hints: [
        'Two neighboring stretches share k − 1 readings.',
        'Sliding one step right adds readings[right] and drops readings[right − k].',
        'Start best at the first stretch’s total, not 0: every total might be negative.',
      ],
      solution: {
        explanation: [
          'sum starts as the total of the first k readings, and best as that total.',
          'Each step moves the stretch to end at right and start at left = right − k + 1: it adds readings[right] and subtracts readings[left − 1], the hour that left the stretch. best keeps the largest total.',
        ],
        code: `function bestWindowSum(readings, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += readings[i];
  let best = sum;
  for (let right = k; right < readings.length; right++) {
    const left = right - k + 1;
    sum += readings[right] - readings[left - 1];
    best = Math.max(best, sum);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is readings.length.' },
      },
      visualization: {
        spec: 'readings is drawn as cells; left and right mark the current stretch with a band between them, and sum and best are blocks that update as the stretch slides.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-12': {
    prerequisites: ['strings-and-chars', 'sliding-window', 'hash-maps'],
    related: ['f75-11', 'f75-13'],
    content: {
      statement: [
        'A radio scanner records a band as the string signal, one character per channel. A quiet stretch is a run of consecutive channels with no character repeated.',
        'Return the length of the longest quiet stretch.',
      ],
      inputFormat: 'signal: a string.',
      outputFormat: 'An integer: the length of the longest substring with all-different characters.',
      constraints: ['0 ≤ signal.length ≤ 50,000', 'signal may contain letters, digits, spaces and symbols.'],
      rules: [
        'Empty string: return 0.',
        'Characters are compared exactly: "a" and "A" are different, and a space is a character.',
        'Aim for O(n): don’t check every substring.',
      ],
      entry: 'longestQuietStretch',
      params: [{ name: 'signal', kind: 'auto' }],
      examples: [
        { inputs: { signal: 'wavelength' }, output: 6, note: '"veleng" repeats e; "length" has 6 different letters.' },
        { inputs: { signal: 'zzzz' }, output: 1, note: 'Every stretch longer than 1 repeats z.' },
      ],
      tests: [
        { inputs: { signal: '' }, output: 0, note: 'Empty signal' },
        { inputs: { signal: 'a' }, output: 1, note: 'One channel' },
        { inputs: { signal: 'ab ba' }, output: 3, note: 'A space counts as a character' },
        { inputs: { signal: 'aab' }, output: 2, note: 'The repeat is at the start' },
        { inputs: { signal: 'kayak' }, output: 3, note: 'A palindrome' },
        { inputs: { signal: '0123456789' }, output: 10, note: 'Nothing repeats' },
        { inputs: { signal: 'AaAa' }, output: 2, note: 'Case matters' },
      ],
      starter: {
        javascript: `function longestQuietStretch(signal) {
  let best = 0;
  // Grow a window to the right; when a character repeats, move its left edge past the earlier copy.
  return best;
}
`,
      },
      hints: [
        'Keep a window signal[left..right] with no repeats, growing it one character at a time.',
        'When signal[right] already appears inside the window, the window must start after that earlier copy.',
        'A Map from character to the last index it was seen at tells you where that copy is in O(1).',
      ],
      solution: {
        explanation: [
          'The window signal[left..right] never contains a repeat. lastSeen maps each character to the last index where it appeared.',
          'When the new character was last seen at or after left, it is inside the window, so left jumps to just past it. After recording right as its last position, the window is valid again and its length is a candidate.',
        ],
        code: `function longestQuietStretch(signal) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < signal.length; right++) {
    const ch = signal[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) left = lastSeen.get(ch) + 1;
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(min(n, c))',
          assumptions: 'n is signal.length and c the number of different characters; Map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'signal is drawn as character cells with left and right marking the window; lastSeen is a map whose lookups show found or not found, and the entry being updated is marked "stored".',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['character', 'last index'] },
    },
  },

  'f75-13': {
    prerequisites: ['arrays-basics', 'sliding-window'],
    related: ['f75-11', 'f75-15'],
    content: {
      statement: [
        'A warehouse receives shipments in order, with sizes given in the array quantities (every size is positive). The manager wants the shortest run of consecutive shipments whose sizes add up to at least target.',
        'Return the length of that shortest run, or 0 if even all shipments together fall short.',
      ],
      inputFormat: 'quantities: an array of positive integers. target: a positive integer.',
      outputFormat: 'An integer: the length of the shortest qualifying run, or 0.',
      constraints: ['0 ≤ quantities.length ≤ 100,000', '1 ≤ quantities[i] ≤ 10,000', '1 ≤ target ≤ 10^9'],
      rules: [
        'No shipments, or a total below target: return 0.',
        '"At least": a run summing to more than target also counts.',
        'Aim for O(n): because every size is positive, a growing run only grows its total.',
        'Do not change quantities.',
      ],
      entry: 'shortestStretch',
      params: [
        { name: 'quantities', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { quantities: [3, 1, 4, 1, 5, 9], target: 10 }, output: 2, note: '5 + 9 = 14 is the shortest run reaching 10.' },
        { inputs: { quantities: [1, 1, 1], target: 5 }, output: 0, note: 'Everything together is only 3.' },
      ],
      tests: [
        { inputs: { quantities: [], target: 3 }, output: 0, note: 'No shipments' },
        { inputs: { quantities: [7], target: 7 }, output: 1, note: 'One shipment, exactly enough' },
        { inputs: { quantities: [2, 2, 2, 2], target: 8 }, output: 4, note: 'Only everything together is enough' },
        { inputs: { quantities: [10, 1, 1], target: 5 }, output: 1, note: 'The first shipment alone' },
        { inputs: { quantities: [1, 2, 3, 4, 5], target: 11 }, output: 3, note: 'The run is at the end' },
      ],
      starter: {
        javascript: `function shortestStretch(quantities, target) {
  // Grow a run to the right; while its total reaches target, record it and shrink it from the left.
  return 0;
}
`,
      },
      hints: [
        'Keep a run quantities[left..right] and its total.',
        'Extend the run with each new shipment. As long as the total is at least target, the run qualifies: record its length, then drop quantities[left] to try a shorter one.',
        'Start best at Infinity so any qualifying run beats it, and return 0 if it never changed.',
      ],
      solution: {
        explanation: [
          'right adds one shipment at a time to total. Whenever total reaches target, the run left..right qualifies; its length is a candidate, and shipments leave from the left while the total stays at least target.',
          'Each index enters and leaves the run at most once, so the work is linear. Infinity means no run qualified, which is reported as 0.',
        ],
        code: `function shortestStretch(quantities, target) {
  let left = 0;
  let total = 0;
  let best = Infinity;
  for (let right = 0; right < quantities.length; right++) {
    total += quantities[right];
    while (total >= target) {
      best = Math.min(best, right - left + 1);
      total -= quantities[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(1)',
          assumptions: 'n is quantities.length; positive sizes guarantee each index enters and leaves the run once.',
        },
      },
      visualization: {
        spec: 'quantities is drawn as cells with left and right marking the run and a band between them; total and best are blocks that change as the run grows on the right and shrinks on the left.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-14': {
    prerequisites: ['arrays-basics', 'prefix-sums'],
    related: ['f75-15', 'f75-05'],
    content: {
      statement: [
        'A shop’s ledger lists each day’s profit in the array values (a loss is negative). The accountant asks many questions of the form [lo, hi]: what was the total profit from day lo through day hi, inclusive?',
        'Return the answers in the order of queries. Prepare once so each question takes constant time.',
      ],
      inputFormat: 'values: an array of integers. queries: an array of [lo, hi] pairs with 0 ≤ lo ≤ hi < values.length.',
      outputFormat: 'An array with one integer per query: values[lo] + … + values[hi].',
      constraints: ['1 ≤ values.length ≤ 100,000', '0 ≤ queries.length ≤ 100,000', 'Values are integers from -10^4 to 10^4.'],
      rules: [
        'No queries: return [].',
        'Both ends are included: [2, 2] is just values[2].',
        'Every query is valid (lo ≤ hi, both inside the array).',
        'Do not change values.',
      ],
      entry: 'rangeSums',
      params: [
        { name: 'values', kind: 'auto' },
        { name: 'queries', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            values: [4, -1, 2, 7],
            queries: [
              [0, 1],
              [1, 3],
              [2, 2],
            ],
          },
          output: [3, 8, 2],
          note: '4 − 1 = 3; −1 + 2 + 7 = 8; just 2.',
        },
        { inputs: { values: [5], queries: [[0, 0]] }, output: [5], note: 'One day.' },
      ],
      tests: [
        { inputs: { values: [1, 2, 3], queries: [] }, output: [], note: 'No questions' },
        { inputs: { values: [0, 0, 0], queries: [[0, 2]] }, output: [0], note: 'All zero' },
        {
          inputs: {
            values: [-2, -3, 10],
            queries: [
              [0, 2],
              [1, 1],
            ],
          },
          output: [5, -3],
          note: 'Losses',
        },
        {
          inputs: {
            values: [1, 1, 1, 1, 1],
            queries: [
              [0, 4],
              [3, 4],
              [0, 0],
            ],
          },
          output: [5, 2, 1],
          note: 'Whole range, a tail, a single day',
        },
      ],
      starter: {
        javascript: `function rangeSums(values, queries) {
  const answers = [];
  // Build running totals once, then answer each [lo, hi] with one subtraction.
  return answers;
}
`,
      },
      hints: [
        'Adding up lo..hi for every query costs O(n) each. Can earlier work be reused?',
        'Let prefix[i] be the total of the first i values (prefix[0] = 0).',
        'The total of lo..hi is prefix[hi + 1] − prefix[lo].',
      ],
      solution: {
        explanation: [
          'prefix has one more slot than values: prefix[i] is the sum of values[0..i−1], built with one running pass.',
          'The sum from lo through hi is everything up to hi minus everything before lo: prefix[hi + 1] − prefix[lo]. Each query is one subtraction.',
        ],
        code: `function rangeSums(values, queries) {
  const prefix = [0];
  for (let i = 0; i < values.length; i++) prefix.push(prefix[i] + values[i]);
  const answers = [];
  for (const [lo, hi] of queries) answers.push(prefix[hi + 1] - prefix[lo]);
  return answers;
}
`,
        complexity: { time: 'O(n + q)', space: 'O(n)', assumptions: 'n is values.length and q is queries.length.' },
      },
      visualization: {
        spec: 'values and prefix are drawn as cells; prefix grows by one running total per step. For each query, the two prefix cells it subtracts light up as read.',
        renderers: ['array-cells', 'grid'],
      },
    },
  },

  'f75-15': {
    prerequisites: ['prefix-sums', 'hash-maps'],
    related: ['f75-14', 'f75-04'],
    content: {
      statement: [
        'A trader records daily gains and losses in the array values. Count the stretches of consecutive days (at least one day long) whose values add up to exactly target.',
        'Return that count.',
      ],
      inputFormat: 'values: an array of integers (negative values allowed). target: an integer.',
      outputFormat: 'An integer: the number of contiguous subarrays summing to target.',
      constraints: ['0 ≤ values.length ≤ 20,000', 'Values are integers from -1,000 to 1,000.', 'target is an integer from -10^7 to 10^7.'],
      rules: [
        'No values: return 0.',
        'Stretches at different positions count separately, even when they hold the same numbers.',
        'Negative values are allowed, so a sliding window does not work here.',
        'Aim for O(n) with a map of running totals.',
        'Do not change values.',
      ],
      entry: 'countStretches',
      params: [
        { name: 'values', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { values: [1, 2, 3, -2, 2], target: 3 }, output: 4, note: '[1, 2], [3], [3, −2, 2] and [2, 3, −2].' },
        { inputs: { values: [0, 0], target: 0 }, output: 3, note: 'Each 0 alone, and both together.' },
      ],
      tests: [
        { inputs: { values: [], target: 0 }, output: 0, note: 'No values' },
        { inputs: { values: [5], target: 5 }, output: 1, note: 'One value' },
        { inputs: { values: [1, -1, 1, -1], target: 0 }, output: 4, note: 'Gains cancel losses' },
        { inputs: { values: [2, 2, 2], target: 4 }, output: 2, note: 'Overlapping stretches' },
        { inputs: { values: [-3, 3, -3, 3], target: 0 }, output: 4, note: 'Negative values first' },
        { inputs: { values: [1, 2, 3], target: 7 }, output: 0, note: 'No stretch reaches 7' },
      ],
      starter: {
        javascript: `function countStretches(values, target) {
  let count = 0;
  // A stretch ending here sums to target when an earlier running total equals running - target.
  return count;
}
`,
      },
      hints: [
        'Let running be the total of all values so far. A stretch ending here sums to target exactly when an earlier running total was running − target.',
        'Count how many times each running total has appeared in a Map.',
        'Start the map with 0 seen once: that stands for “before any value”, so stretches starting at day 0 are counted.',
      ],
      solution: {
        explanation: [
          'seen counts how often each running total has occurred, starting with 0 once (the empty prefix). For each value, running grows; every earlier prefix with total running − target starts a stretch that ends here and sums to target.',
          'Those stretches are added to count, then the current running total is recorded for later days.',
        ],
        code: `function countStretches(values, target) {
  const seen = new Map([[0, 1]]);
  let running = 0;
  let count = 0;
  for (const value of values) {
    running += value;
    count += seen.get(running - target) ?? 0;
    seen.set(running, (seen.get(running) ?? 0) + 1);
  }
  return count;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is values.length; Map operations take O(1) time on average.' },
      },
      visualization: {
        spec: 'values is drawn as cells with the item being added read; running and count are blocks, and seen is a map from running total to how many times it occurred, with lookups marked found or not found.',
        renderers: ['array-cells', 'hash-map'],
      },
      view: { mapColumns: ['running total', 'times seen'] },
    },
  },

  'f75-16': {
    prerequisites: ['linked-list-basics'],
    related: ['f75-17', 'f75-18'],
    content: {
      statement: [
        'A scavenger hunt is a chain of clue cards: each card has a value and points to the next card, and the last card points to nothing. head is the first card of a singly linked list.',
        'Return the values of the cards in the order you meet them, starting at head.',
      ],
      inputFormat: 'head: a singly linked list, written as its values in order (e.g. [3, 1, 4]).',
      outputFormat: 'An array of the values from head to the end.',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are integers from -10^5 to 10^5.'],
      rules: ['Empty list (head is null): return [].', 'Repeated values are returned each time they appear.', 'Do not change the list.'],
      entry: 'listValues',
      params: [{ name: 'head', kind: 'list' }],
      examples: [
        { inputs: { head: [3, 1, 4] }, output: [3, 1, 4], note: 'Three cards, in chain order.' },
        { inputs: { head: [] }, output: [], note: 'No cards at all.' },
      ],
      tests: [
        { inputs: { head: [7] }, output: [7], note: 'One card' },
        { inputs: { head: [1, 1, 2] }, output: [1, 1, 2], note: 'A repeated value' },
        { inputs: { head: [-1, 0, 1] }, output: [-1, 0, 1], note: 'Negative values' },
        { inputs: { head: [5, 4, 3, 2, 1] }, output: [5, 4, 3, 2, 1], note: 'A longer chain' },
      ],
      starter: {
        javascript: `function listValues(head) {
  const values = [];
  // Start at head and follow next until it is null.
  return values;
}
`,
      },
      hints: [
        'Keep a variable that points at the card you are on, starting with head.',
        'Record curr.val, then move with curr = curr.next.',
        'Stop when curr is null: that is past the last card.',
      ],
      solution: {
        explanation: [
          'curr starts at head. While it points at a node, its value is recorded and curr moves to curr.next.',
          'When curr becomes null the chain has ended, and the recorded values are in chain order.',
        ],
        code: `function listValues(head) {
  const values = [];
  let curr = head;
  while (curr !== null) {
    values.push(curr.val);
    curr = curr.next;
  }
  return values;
}
`,
        complexity: { time: 'O(n)', space: 'O(n) for the output', assumptions: 'n is the number of nodes.' },
      },
      visualization: {
        spec: 'The list is drawn as nodes joined by next arrows (people holding ropes in the illustrated view) with curr as a flag that moves along them; values grows as cells.',
        renderers: ['linked-list', 'linked-list-ropes', 'array-cells'],
      },
    },
  },

  'f75-18': {
    prerequisites: ['linked-list-basics', 'two-pointers'],
    related: ['f75-16', 'f75-19'],
    content: {
      statement: [
        'A parade is a singly linked list of floats starting at head. The announcer stands at the middle float.',
        'Return the middle node. When the parade has an even number of floats, there are two middle floats: return the second one.',
      ],
      inputFormat: 'head: a singly linked list, written as its values in order.',
      outputFormat: 'The middle node, shown as the list from that node to the end.',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are integers from -10^5 to 10^5.'],
      rules: [
        'Empty list: return null (shown as []).',
        'Odd length: the exact middle. Even length: the second of the two middle nodes.',
        'Return the node itself, not a copy. Aim for one pass with O(1) extra space.',
      ],
      entry: 'middleNode',
      params: [{ name: 'head', kind: 'list' }],
      resultKind: 'list',
      examples: [
        { inputs: { head: [10, 20, 30, 40, 50] }, output: [30, 40, 50], note: 'Five floats: the third is the middle.' },
        { inputs: { head: [6, 7, 8, 9] }, output: [8, 9], note: 'Four floats: the second middle one.' },
      ],
      tests: [
        { inputs: { head: [4] }, output: [4], note: 'One float' },
        { inputs: { head: [1, 2] }, output: [2], note: 'Two floats: the second' },
        { inputs: { head: [9, 8, 7] }, output: [8, 7], note: 'Three floats' },
        { inputs: { head: [] }, output: [], note: 'No parade' },
        { inputs: { head: [1, 2, 3, 4, 5, 6] }, output: [4, 5, 6], note: 'Six floats' },
      ],
      starter: {
        javascript: `function middleNode(head) {
  // Move one pointer one step at a time and another two steps at a time.
  return head;
}
`,
      },
      hints: [
        'Counting the nodes first and then walking half way works, but takes two passes.',
        'Move slow by one node and fast by two nodes each round.',
        'When fast can’t make another double step, slow is at the middle.',
      ],
      solution: {
        explanation: [
          'slow and fast both start at head. Each round slow moves one node and fast two, so fast has always covered twice the distance.',
          'The loop stops when fast is null or on the last node; slow is then halfway, which for an even length is the second middle node.',
        ],
        code: `function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is the number of nodes.' },
      },
      visualization: {
        spec: 'The list is drawn as nodes with next arrows (ropes in the illustrated view); slow and fast are flags, fast jumping two nodes for every one of slow.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'f75-19': {
    prerequisites: ['linked-list-basics', 'two-pointers'],
    related: ['f75-18', 'f75-16'],
    content: {
      statement: [
        'A conveyor belt is a singly linked list of trays starting at head. A faulty joint may send the last tray’s next back to an earlier tray, and then the belt loops forever.',
        'Return the position of the first tray the loop comes back to, counting from 0 at head, or -1 if the belt ends.',
      ],
      inputFormat:
        'head: a singly linked list, written as its values in order. pos: where the last tray’s next points (a position from 0), or -1 if it points to nothing. pos only builds the belt: your function receives head alone.',
      outputFormat: 'An integer: the position where the loop starts, or -1.',
      constraints: [
        '0 ≤ number of trays ≤ 10,000',
        'pos is -1 or a position from 0 to the number of trays − 1.',
        'Values are integers from -10^5 to 10^5.',
      ],
      rules: [
        'Empty belt: return -1.',
        'A tray whose next is itself is a loop that starts at that tray.',
        'Values may repeat: trays are told apart by position, not by value.',
        'Do not change any next field. Aim for O(1) extra space; a set of visited trays works but uses O(n).',
      ],
      entry: 'loopStart',
      params: [
        { name: 'head', kind: 'list' },
        { name: 'pos', kind: 'pos' },
      ],
      examples: [
        { inputs: { head: [3, 2, 0, -4], pos: 1 }, output: 1, note: 'The last tray links back to the second one.' },
        { inputs: { head: [5, 6, 7], pos: -1 }, output: -1, note: 'The belt ends: no loop.' },
      ],
      tests: [
        { inputs: { head: [1], pos: 0 }, output: 0, note: 'One tray linked to itself' },
        { inputs: { head: [1], pos: -1 }, output: -1, note: 'One tray, no loop' },
        { inputs: { head: [], pos: -1 }, output: -1, note: 'Empty belt' },
        { inputs: { head: [1, 2], pos: 0 }, output: 0, note: 'Two trays looping back to the first' },
        { inputs: { head: [4, 4, 4, 4], pos: 2 }, output: 2, note: 'Equal values: positions identify trays' },
        { inputs: { head: [1, 2, 3, 4, 5, 6, 7, 8], pos: 7 }, output: 7, note: 'The last tray links to itself' },
        { inputs: { head: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], pos: 3 }, output: 3, note: 'A longer belt with the loop in the middle' },
      ],
      starter: {
        javascript: `function loopStart(head) {
  // Return the position (from 0) where the loop begins, or -1 if the belt ends.
  return -1;
}
`,
      },
      hints: [
        'Walking the belt and remembering every tray in a set finds the first repeat, at O(n) extra space.',
        'Move slow by one tray and fast by two. If the belt loops, fast catches up with slow inside the loop; if it ends, fast reaches null.',
        'From the meeting point, the loop’s start is exactly as far as it is from head. Walk one pointer from head and one from the meeting point, one step each, counting steps until they meet.',
      ],
      solution: {
        explanation: [
          'Phase 1: slow moves one tray and fast two per round. Without a loop, fast reaches the end. With a loop, fast gains one tray per round inside it, so they meet.',
          'Phase 2: say head is a trays before the loop and the loop has c trays. When they meet, slow has walked some s trays and fast 2s, and the difference s is a whole number of loops. So walking a more trays from the meeting point lands on the loop start, just as walking a trays from head does. Two pointers stepped together from head and from the meeting point meet there, after a steps: the answer.',
        ],
        code: `function loopStart(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      let a = head;
      let b = slow;
      let position = 0;
      while (a !== b) {
        a = a.next;
        b = b.next;
        position++;
      }
      return position;
    }
  }
  return -1;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(1)',
          assumptions: 'n is the number of trays; fast meets slow within one lap of the loop after slow enters it.',
        },
      },
      visualization: {
        spec: 'The belt is drawn as nodes with next arrows; the arrow that closes the loop is dashed and marked. slow and fast are flags, fast jumping two trays for every one of slow, then a and b walk together to the loop start.',
        renderers: ['linked-list'],
      },
    },
  },

  'f75-20': {
    prerequisites: ['linked-list-basics', 'two-pointers'],
    related: ['f75-07', 'f75-17'],
    content: {
      statement: [
        'Two conveyor belts each carry boxes in increasing order of weight, as the sorted singly linked lists a and b.',
        'Combine them into one sorted chain by re-linking the existing nodes, and return its first node.',
      ],
      inputFormat: 'a, b: singly linked lists, each sorted in non-decreasing order.',
      outputFormat: 'The head of the merged sorted list, shown as its values.',
      constraints: ['0 ≤ nodes in each list ≤ 10,000', 'Values are integers from -10^5 to 10^5.'],
      rules: [
        'Either list, or both, may be empty.',
        'Equal values are all kept.',
        'Reuse the nodes: change next links instead of creating new value nodes (one placeholder node is fine).',
      ],
      entry: 'mergeChains',
      params: [
        { name: 'a', kind: 'list' },
        { name: 'b', kind: 'list' },
      ],
      resultKind: 'list',
      examples: [
        { inputs: { a: [1, 4, 7], b: [2, 3, 9] }, output: [1, 2, 3, 4, 7, 9], note: 'The two chains interleave.' },
        { inputs: { a: [], b: [5] }, output: [5], note: 'One chain is empty.' },
      ],
      tests: [
        { inputs: { a: [], b: [] }, output: [], note: 'Both empty' },
        { inputs: { a: [1, 1], b: [1] }, output: [1, 1, 1], note: 'Equal values' },
        { inputs: { a: [5, 6], b: [1, 2] }, output: [1, 2, 5, 6], note: 'One chain entirely first' },
        { inputs: { a: [-3, 0], b: [-1] }, output: [-3, -1, 0], note: 'Negative values' },
      ],
      starter: {
        javascript: `function mergeChains(a, b) {
  // Start from a placeholder node and keep attaching the smaller front node.
  return a;
}
`,
      },
      hints: [
        'A placeholder node in front of the result means the first attachment is no special case.',
        'Keep tail, the last node of the merged chain. Attach whichever of a and b has the smaller value, and move that list forward.',
        'When one list runs out, attach the rest of the other in one step.',
      ],
      solution: {
        explanation: [
          'dummy is a placeholder whose next will be the merged head; tail is the last node attached so far.',
          'Each round attaches the smaller front node (a’s on ties) to tail and advances that list. When one list is empty, the other’s remaining nodes are already sorted and are attached all at once. No value node is created.',
        ],
        code: `function mergeChains(a, b) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a !== null && b !== null) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a !== null ? a : b;
  return dummy.next;
}
`,
        complexity: { time: 'O(n + m)', space: 'O(1)', assumptions: 'n and m are the list lengths; only next links change.' },
      },
      visualization: {
        spec: 'Both lists are drawn as nodes with next arrows that swing as they are re-linked (ropes in the illustrated view); a, b and tail are flags on the nodes they point at.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'f75-22': {
    prerequisites: ['stacks', 'strings-and-chars'],
    related: ['f75-21', 'f75-23'],
    content: {
      statement: [
        'A simple notebook starts empty. You receive commands in order, as the array commands: ["append", text] adds text to the end of the document, and ["undo"] removes the most recent append that hasn’t been undone yet.',
        'Return the document after every command has run.',
      ],
      inputFormat: 'commands: an array of ["append", text] and ["undo"].',
      outputFormat: 'A string: the final document.',
      constraints: ['0 ≤ commands.length ≤ 10,000', 'Each text has 0 to 100 characters.'],
      rules: [
        'No commands: return "".',
        'Undo with nothing left to undo does nothing.',
        'An empty append is still an append: undoing it removes nothing from the text but uses up that undo.',
        'Undos go back in order: the second undo in a row removes the append before the one the first undo removed.',
      ],
      entry: 'notebook',
      params: [{ name: 'commands', kind: 'auto' }],
      examples: [
        {
          inputs: { commands: [['append', 'Hi'], ['append', ' there'], ['undo'], ['append', '!']] },
          output: 'Hi!',
          note: 'The undo removes " there".',
        },
        { inputs: { commands: [['undo'], ['append', 'a']] }, output: 'a', note: 'The first undo has nothing to undo.' },
      ],
      tests: [
        { inputs: { commands: [] }, output: '', note: 'No commands' },
        { inputs: { commands: [['append', 'x'], ['undo'], ['undo']] }, output: '', note: 'More undos than appends' },
        {
          inputs: { commands: [['append', 'ab'], ['append', 'cd'], ['append', 'ef'], ['undo'], ['undo']] },
          output: 'ab',
          note: 'Two undos in a row',
        },
        { inputs: { commands: [['append', ''], ['append', 'q'], ['undo']] }, output: '', note: 'An empty append' },
        {
          inputs: { commands: [['append', '1'], ['append', '2'], ['undo'], ['append', '3']] },
          output: '13',
          note: 'Appending after an undo',
        },
      ],
      starter: {
        javascript: `function notebook(commands) {
  let doc = '';
  const history = []; // what each append added, most recent last
  // Run each command; undo takes back the most recent append.
  return doc;
}
`,
      },
      hints: [
        'Undo needs the most recent append first: last in, first out.',
        'Push each appended text onto a stack.',
        'For undo, pop the last text and cut that many characters off the end of the document.',
      ],
      solution: {
        explanation: [
          'history is a stack of appended texts. An append adds its text to the document and pushes it.',
          'An undo pops the most recent text (if any) and removes that many characters from the end of the document, which are exactly the ones it added.',
        ],
        code: `function notebook(commands) {
  let doc = '';
  const history = [];
  for (const command of commands) {
    if (command[0] === 'append') {
      history.push(command[1]);
      doc += command[1];
    } else if (history.length > 0) {
      const last = history.pop();
      doc = doc.slice(0, doc.length - last.length);
    }
  }
  return doc;
}
`,
        complexity: {
          time: 'O(n + L)',
          space: 'O(L)',
          assumptions: 'n is commands.length and L the total length of all appended text; string slicing is linear in the length copied.',
        },
      },
      visualization: {
        spec: 'history is drawn as a stack: each append settles on top and each undo lifts the top off. doc is a value block that grows and shrinks with it.',
        renderers: ['stack', 'grid'],
      },
    },
  },

  'f75-23': {
    prerequisites: ['stacks'],
    related: ['f75-21', 'f75-24'],
    content: {
      statement: [
        'A line of asteroids flies through space, given left to right as the array asteroids. The absolute value is an asteroid’s size; a positive sign means it moves right and a negative sign means it moves left. All move at the same speed.',
        'When a right-moving asteroid meets a left-moving one, the smaller one shatters; equal sizes both shatter. Asteroids moving the same way never meet. Return the asteroids left after every collision, in order.',
      ],
      inputFormat: 'asteroids: an array of non-zero integers.',
      outputFormat: 'An array of the surviving asteroids, left to right.',
      constraints: ['0 ≤ asteroids.length ≤ 10,000', '1 ≤ |asteroids[i]| ≤ 1,000'],
      rules: [
        'Only a right-mover on the left meets a left-mover on its right; a left-mover on the left and a right-mover on the right fly apart.',
        'Equal sizes: both shatter.',
        'A surviving asteroid keeps going and may meet more asteroids.',
        'Do not change asteroids.',
      ],
      entry: 'survivors',
      params: [{ name: 'asteroids', kind: 'auto' }],
      examples: [
        { inputs: { asteroids: [4, 9, -6] }, output: [4, 9], note: '-6 meets 9 and shatters.' },
        { inputs: { asteroids: [7, -7] }, output: [], note: 'Equal sizes: both shatter.' },
      ],
      tests: [
        { inputs: { asteroids: [] }, output: [], note: 'Empty sky' },
        { inputs: { asteroids: [-2, -1, 1, 2] }, output: [-2, -1, 1, 2], note: 'Flying apart: no collisions' },
        { inputs: { asteroids: [3, -5, 2] }, output: [-5, 2], note: '-5 wins and keeps going' },
        { inputs: { asteroids: [1, 2, 3, -10] }, output: [-10], note: 'One asteroid destroys a whole group' },
        { inputs: { asteroids: [10, -2, -3, 4] }, output: [10, 4], note: 'A big right-mover survives two hits' },
        { inputs: { asteroids: [5, -5, -1] }, output: [-1], note: 'After a tie, the next one flies on' },
      ],
      starter: {
        javascript: `function survivors(asteroids) {
  const stack = []; // survivors so far; the last one is the nearest to the next asteroid
  // A left-mover collides with right-movers on top of the stack.
  return stack;
}
`,
      },
      hints: [
        'Process asteroids left to right. Only the most recent survivor can be hit next.',
        'Keep survivors on a stack. A left-mover hits the top while the top moves right.',
        'Pop smaller right-movers; on a tie pop and stop; if the top is bigger, the new asteroid shatters.',
      ],
      solution: {
        explanation: [
          'stack holds the survivors so far, left to right. A new left-mover can only meet right-movers on top of the stack.',
          'While it is alive and the top moves right: a smaller top shatters (pop and continue), an equal top shatters with it (pop, and it is gone), and a bigger top destroys it. Anything still alive is pushed.',
        ],
        code: `function survivors(asteroids) {
  const stack = [];
  for (const rock of asteroids) {
    let alive = true;
    while (alive && rock < 0 && stack.length > 0 && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -rock) {
        stack.pop();
      } else if (top === -rock) {
        stack.pop();
        alive = false;
      } else {
        alive = false;
      }
    }
    if (alive) stack.push(rock);
  }
  return stack;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is asteroids.length; each asteroid is pushed and popped at most once.' },
      },
      visualization: {
        spec: 'The survivors are drawn as a stack: a new asteroid lands on top or shatters, and every pop is a collision. asteroids is drawn as cells with the one arriving read.',
        renderers: ['stack', 'array-cells'],
      },
    },
  },

  'f75-24': {
    prerequisites: ['stacks', 'arrays-basics'],
    related: ['f75-23', 'f75-25'],
    content: {
      statement: [
        'A weather station logs one temperature per day in the array temps. For each day, find how many days you must wait for a strictly warmer day.',
        'Return an array where entry i is that wait, or 0 if no later day is warmer.',
      ],
      inputFormat: 'temps: an array of integers.',
      outputFormat: 'An array of temps.length integers.',
      constraints: ['0 ≤ temps.length ≤ 100,000', 'Temperatures are integers from -100 to 150.'],
      rules: [
        'Strictly warmer: an equal temperature does not count.',
        'No warmer day later: 0.',
        'Aim for O(n): don’t scan ahead from every day.',
        'Do not change temps.',
      ],
      entry: 'daysUntilWarmer',
      params: [{ name: 'temps', kind: 'auto' }],
      examples: [
        { inputs: { temps: [30, 32, 31, 35] }, output: [1, 2, 1, 0], note: 'Day 1 waits until day 3 for something above 32.' },
        { inputs: { temps: [50, 50, 50] }, output: [0, 0, 0], note: 'Equal is not warmer.' },
      ],
      tests: [
        { inputs: { temps: [] }, output: [], note: 'No days' },
        { inputs: { temps: [70] }, output: [0], note: 'One day' },
        { inputs: { temps: [60, 61, 62] }, output: [1, 1, 0], note: 'Warming every day' },
        { inputs: { temps: [62, 61, 60] }, output: [0, 0, 0], note: 'Cooling every day' },
        { inputs: { temps: [40, 35, 38, 41] }, output: [3, 1, 1, 0], note: 'One warm day answers three' },
        { inputs: { temps: [-5, -10, 0] }, output: [2, 1, 0], note: 'Below zero' },
      ],
      starter: {
        javascript: `function daysUntilWarmer(temps) {
  const answer = new Array(temps.length).fill(0);
  const stack = []; // indexes of days still waiting for a warmer day
  // When a warm day arrives, it answers every waiting day that is colder.
  return answer;
}
`,
      },
      hints: [
        'A day keeps waiting until a warmer day shows up. Many days can be waiting at once.',
        'Keep the waiting days’ indexes on a stack; their temperatures never increase from bottom to top.',
        'For each new day, pop every waiting day that is colder and record i − j for it; then push the new day.',
      ],
      solution: {
        explanation: [
          'stack holds indexes of days that have not seen a warmer day yet; their temperatures never increase from bottom to top, so the coldest waiting day is on top.',
          'When day i arrives, every waiting day colder than it is answered (answer[j] = i − j) and popped. Then i starts waiting. Days still on the stack at the end keep 0.',
        ],
        code: `function daysUntilWarmer(temps) {
  const answer = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length > 0 && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return answer;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is temps.length; each index is pushed and popped at most once.' },
      },
      visualization: {
        spec: 'temps and answer are drawn as cells; stack holds the indexes of waiting days and is drawn as a stack. Each pop writes one answer cell.',
        renderers: ['array-cells', 'stack'],
      },
    },
  },

  'f75-27': {
    prerequisites: ['binary-search-idea'],
    related: ['f75-26', 'f75-28'],
    content: {
      statement: [
        'A sorted log of readings, readings, may contain the same reading several times in a row. Find where target first appears and where it last appears.',
        'Return [first, last] as indexes, or [-1, -1] if target is not in the log.',
      ],
      inputFormat: 'readings: an array of integers in non-decreasing order. target: an integer.',
      outputFormat: 'An array [first, last] of indexes, or [-1, -1].',
      constraints: ['0 ≤ readings.length ≤ 100,000', 'Readings and target are integers from -10^9 to 10^9.'],
      rules: [
        'Empty log or target missing: [-1, -1].',
        'One occurrence: first and last are the same index.',
        'Aim for O(log n): two binary searches, not a scan.',
        'Do not change readings.',
      ],
      entry: 'firstAndLast',
      params: [
        { name: 'readings', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { readings: [1, 3, 3, 3, 6], target: 3 }, output: [1, 3], note: '3 fills slots 1 to 3.' },
        { inputs: { readings: [2, 4, 6], target: 5 }, output: [-1, -1], note: '5 is not in the log.' },
      ],
      tests: [
        { inputs: { readings: [], target: 1 }, output: [-1, -1], note: 'Empty log' },
        { inputs: { readings: [9], target: 9 }, output: [0, 0], note: 'One reading, found' },
        { inputs: { readings: [4, 4, 4, 4], target: 4 }, output: [0, 3], note: 'Every slot matches' },
        { inputs: { readings: [1, 2, 3], target: 1 }, output: [0, 0], note: 'At the start' },
        { inputs: { readings: [1, 2, 3], target: 3 }, output: [2, 2], note: 'At the end' },
        { inputs: { readings: [-5, -5, 0, 7, 7], target: 7 }, output: [3, 4], note: 'A run at the end' },
      ],
      starter: {
        javascript: `function firstAndLast(readings, target) {
  // Binary search for the first slot holding target, then for the first slot holding more than target.
  return [-1, -1];
}
`,
      },
      hints: [
        'A normal binary search stops at any match. You need the boundary of the run instead.',
        'Search for the first index whose reading is at least the value (keep going left after a match).',
        'For integers, the last target is one before the first reading that is at least target + 1.',
      ],
      solution: {
        explanation: [
          'lowerBound(value) finds the first index whose reading is at least value: lo..hi is the range still possible, and a reading below value pushes lo past mid, otherwise hi comes down to mid.',
          'first = lowerBound(target). If that slot doesn’t hold target, target is missing. Otherwise the run ends just before lowerBound(target + 1), the first reading above target.',
        ],
        code: `function firstAndLast(readings, target) {
  const lowerBound = (value) => {
    let lo = 0;
    let hi = readings.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (readings[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const first = lowerBound(target);
  if (first === readings.length || readings[first] !== target) return [-1, -1];
  return [first, lowerBound(target + 1) - 1];
}
`,
        complexity: {
          time: 'O(log n)',
          space: 'O(1)',
          assumptions: 'n is readings.length; readings are integers, so target + 1 is the next possible value.',
        },
      },
      visualization: {
        spec: 'readings is drawn as cells (numbered shelves in the illustrated view) with lo, mid and hi as flags; the slots outside lo..hi are dimmed as each search narrows. The call stack shows the two lowerBound searches.',
        renderers: ['array-cells', 'array-shelves', 'call-stack'],
      },
    },
  },

  'f75-28': {
    prerequisites: ['binary-search-idea'],
    related: ['f75-26', 'f75-27'],
    content: {
      statement: [
        'An archive of document numbers was sorted in increasing order and then rotated: some prefix was moved to the end, so [10, 20, 30, 40, 50] might be stored as [40, 50, 10, 20, 30]. The numbers are all different.',
        'Return the index of target in archive, or -1 if it isn’t there.',
      ],
      inputFormat: 'archive: an array of distinct integers, a rotation of an increasing array. target: an integer.',
      outputFormat: 'An integer index, or -1.',
      constraints: ['0 ≤ archive.length ≤ 100,000', 'Values and target are integers from -10^9 to 10^9; values are distinct.'],
      rules: ['Empty archive: -1.', 'The rotation may be by zero (already sorted).', 'Aim for O(log n).', 'Do not change archive.'],
      entry: 'searchRotated',
      params: [
        { name: 'archive', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { archive: [40, 50, 10, 20, 30], target: 20 }, output: 3, note: 'Found in the part after the rotation point.' },
        { inputs: { archive: [6, 7, 1, 2], target: 5 }, output: -1, note: '5 is not stored.' },
      ],
      tests: [
        { inputs: { archive: [], target: 3 }, output: -1, note: 'Empty archive' },
        { inputs: { archive: [8], target: 8 }, output: 0, note: 'One number' },
        { inputs: { archive: [1, 2, 3, 4], target: 4 }, output: 3, note: 'Not rotated' },
        { inputs: { archive: [3, 1], target: 1 }, output: 1, note: 'Two numbers, rotated' },
        { inputs: { archive: [5, 6, 7, 8, 1, 2, 3], target: 6 }, output: 1, note: 'In the first part' },
        { inputs: { archive: [2, 3, 4, 5, 6, 7, 1], target: 1 }, output: 6, note: 'The smallest is last' },
      ],
      starter: {
        javascript: `function searchRotated(archive, target) {
  let lo = 0;
  let hi = archive.length - 1;
  // At each mid, one half is in order. Decide whether target can be in it.
  return -1;
}
`,
      },
      hints: [
        'Split at mid: at least one of the halves lo..mid and mid..hi is sorted.',
        'archive[lo] <= archive[mid] means the left half is sorted.',
        'If target lies within the sorted half’s range, search there; otherwise search the other half.',
      ],
      solution: {
        explanation: [
          'lo..hi is the range that can still hold target. Comparing archive[lo] with archive[mid] tells which half is in order (the rotation point lies in the other half).',
          'If target is within the sorted half’s first and last values, the search continues there; otherwise it continues in the other half. Each step halves the range.',
        ],
        code: `function searchRotated(archive, target) {
  let lo = 0;
  let hi = archive.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (archive[mid] === target) return mid;
    if (archive[lo] <= archive[mid]) {
      if (archive[lo] <= target && target < archive[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (archive[mid] < target && target <= archive[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
`,
        complexity: {
          time: 'O(log n)',
          space: 'O(1)',
          assumptions: 'n is archive.length; values are distinct, so the sorted half is always identifiable.',
        },
      },
      visualization: {
        spec: 'archive is drawn as cells (shelves in the illustrated view) with lo, mid and hi as flags; slots outside lo..hi are dimmed as the search narrows, and each comparison is shown.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-29': {
    prerequisites: ['sorting', 'arrays-basics'],
    related: ['f75-26', 'f75-07'],
    content: {
      statement: [
        'You are holding playing cards with the numbers in the array cards. Sort them the way people sort a hand: take each card in turn and slide it left past every bigger card already sorted.',
        'Sort cards in place into increasing order with insertion sort, and return the same array.',
      ],
      inputFormat: 'cards: an array of integers.',
      outputFormat: 'The same array, sorted in non-decreasing order.',
      constraints: ['0 ≤ cards.length ≤ 1,000', 'Values are integers from -10^4 to 10^4.'],
      rules: [
        'Sort in place and return cards itself.',
        'Use insertion sort, not cards.sort(): the point is to see each insertion.',
        'Equal cards keep their order (insertion sort only moves a card past strictly bigger ones).',
      ],
      entry: 'insertionSort',
      params: [{ name: 'cards', kind: 'auto' }],
      examples: [
        { inputs: { cards: [7, 3, 5, 1] }, output: [1, 3, 5, 7], note: 'Each card slides left into place.' },
        { inputs: { cards: [2, 2, 1] }, output: [1, 2, 2], note: 'Duplicates stay together.' },
      ],
      tests: [
        { inputs: { cards: [] }, output: [], note: 'No cards' },
        { inputs: { cards: [9] }, output: [9], note: 'One card' },
        { inputs: { cards: [1, 2, 3] }, output: [1, 2, 3], note: 'Already sorted' },
        { inputs: { cards: [3, 2, 1] }, output: [1, 2, 3], note: 'Reversed' },
        { inputs: { cards: [-1, 10, -5, 0] }, output: [-5, -1, 0, 10], note: 'Negative cards' },
      ],
      starter: {
        javascript: `function insertionSort(cards) {
  for (let i = 1; i < cards.length; i++) {
    // Take cards[i] out, shift bigger sorted cards one slot right, and drop it into the gap.
  }
  return cards;
}
`,
      },
      hints: [
        'Before step i, cards[0..i-1] are already sorted.',
        'Remember card = cards[i]. Walk j left from i - 1 while cards[j] > card, copying cards[j] one slot right.',
        'Put card into the gap at j + 1.',
      ],
      solution: {
        explanation: [
          'The sorted part grows from the left. Step i takes card = cards[i] out of the line.',
          'Every sorted card bigger than it moves one slot right, opening a gap; card goes into the gap, and cards[0..i] is sorted. Equal cards are not passed, so their order stays.',
        ],
        code: `function insertionSort(cards) {
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    let j = i - 1;
    while (j >= 0 && cards[j] > card) {
      cards[j + 1] = cards[j];
      j--;
    }
    cards[j + 1] = card;
  }
  return cards;
}
`,
        complexity: {
          time: 'O(n²) worst case, O(n) if already sorted',
          space: 'O(1)',
          assumptions: 'n is cards.length; each shift moves one card one slot.',
        },
      },
      visualization: {
        spec: 'cards is drawn as cells (shelves in the illustrated view) with i over the card being inserted and j scanning left; every shift lights up the slot it wrote, and the final write drops the card into the gap.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-30': {
    prerequisites: ['binary-search-idea', 'greedy'],
    related: ['f75-26', 'f75-63'],
    content: {
      statement: [
        'Packages with the weights in the array weights must ship in that order, using one truck trip per day. Every day the truck takes the next packages in line until adding another would exceed its capacity.',
        'Find the smallest capacity that ships everything within days days.',
      ],
      inputFormat: 'weights: an array of positive integers. days: a positive integer.',
      outputFormat: 'An integer: the smallest capacity that works.',
      constraints: ['1 ≤ days ≤ weights.length ≤ 50,000', '1 ≤ weights[i] ≤ 500'],
      rules: [
        'Packages keep their order and can’t be split.',
        'The capacity must be at least the heaviest package.',
        'Finishing early (in fewer days) is fine.',
        'Aim for O(n log S), where S is the total weight: binary search over the capacity.',
      ],
      entry: 'shipWithinDays',
      params: [
        { name: 'weights', kind: 'auto' },
        { name: 'days', kind: 'auto' },
      ],
      examples: [
        { inputs: { weights: [4, 1, 3, 2, 5], days: 2 }, output: 8, note: '[4, 1, 3] then [2, 5]; 7 would need three days.' },
        { inputs: { weights: [10, 10], days: 1 }, output: 20, note: 'One day: everything at once.' },
      ],
      tests: [
        { inputs: { weights: [5], days: 1 }, output: 5, note: 'One package' },
        { inputs: { weights: [1, 1, 1, 1], days: 4 }, output: 1, note: 'One package a day' },
        { inputs: { weights: [1, 1, 1, 1], days: 1 }, output: 4, note: 'All in one day' },
        { inputs: { weights: [6, 6, 6], days: 2 }, output: 12, note: 'Equal packages' },
        { inputs: { weights: [2, 9, 3], days: 3 }, output: 9, note: 'The heaviest package decides' },
        { inputs: { weights: [1, 2, 3, 4, 5], days: 5 }, output: 5, note: 'As many days as packages' },
      ],
      starter: {
        javascript: `function shipWithinDays(weights, days) {
  // For a capacity, count the days needed. Binary search for the smallest capacity that fits in days.
  return 0;
}
`,
      },
      hints: [
        'For a fixed capacity, count the days greedily: keep loading until the next package doesn’t fit, then start a new day.',
        'A bigger capacity never needs more days, so the answers form a no…no yes…yes line.',
        'Binary search between the heaviest package and the total weight for the first capacity that needs at most days days.',
      ],
      solution: {
        explanation: [
          'daysNeeded(capacity) loads packages in order and starts a new day whenever the next one would overflow. Raising the capacity never increases that count.',
          'So the capacities that work are everything from some answer upward. lo..hi starts at the heaviest package and the total weight; mid that works pulls hi down to mid, mid that doesn’t pushes lo past it. lo ends at the smallest capacity that works.',
        ],
        code: `function shipWithinDays(weights, days) {
  const daysNeeded = (capacity) => {
    let count = 1;
    let load = 0;
    for (const w of weights) {
      if (load + w > capacity) {
        count++;
        load = 0;
      }
      load += w;
    }
    return count;
  };
  let lo = Math.max(...weights);
  let hi = weights.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (daysNeeded(mid) <= days) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
`,
        complexity: {
          time: 'O(n log S)',
          space: 'O(1)',
          assumptions: 'n is weights.length and S the total weight; each check is one pass over the packages.',
        },
      },
      visualization: {
        spec: 'lo, mid and hi are blocks that close in on the answer; each daysNeeded call is on the call stack, with weights drawn as cells, the package being loaded read, and load and count changing as days fill up.',
        renderers: ['array-cells', 'call-stack'],
      },
    },
  },

  'f75-31': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['f75-32', 'f75-34'],
    content: {
      statement: [
        'Practice the words used for trees on one binary tree, root. Count its nodes, count its leaves (nodes with no children), and find its depth (the number of nodes on the longest path from the root down to a leaf).',
        'Return [nodes, leaves, depth].',
      ],
      inputFormat: 'root: a binary tree, written in level order with null for missing children (e.g. [5, 3, 8, null, 4]).',
      outputFormat: 'An array of three integers: [node count, leaf count, depth].',
      constraints: ['0 ≤ number of nodes ≤ 1,000', 'Node values are integers from -1,000 to 1,000.'],
      rules: ['Empty tree: [0, 0, 0].', 'A tree with only a root has one node, one leaf and depth 1.', 'Do not change the tree.'],
      entry: 'treeFacts',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [5, 3, 8, null, 4] }, output: [4, 2, 3], note: 'Leaves 4 and 8; the longest path is 5 → 3 → 4.' },
        { inputs: { root: [1] }, output: [1, 1, 1], note: 'Just the root, which is also a leaf.' },
      ],
      tests: [
        { inputs: { root: [] }, output: [0, 0, 0], note: 'Empty tree' },
        { inputs: { root: [1, 2, null, 3] }, output: [3, 1, 3], note: 'A tree that leans left' },
        { inputs: { root: [1, 2, 3, 4, 5, 6, 7] }, output: [7, 4, 3], note: 'A full tree' },
        { inputs: { root: [1, null, 2, null, 3] }, output: [3, 1, 3], note: 'A tree that leans right' },
        { inputs: { root: [0, 0, 0] }, output: [3, 2, 2], note: 'Equal values' },
      ],
      starter: {
        javascript: `function treeFacts(root) {
  let nodes = 0;
  let leaves = 0;
  // Visit every node once: count it, check whether it is a leaf, and track how deep it is.
  return [nodes, leaves, 0];
}
`,
      },
      hints: [
        'One depth-first visit can collect all three facts.',
        'Pass the depth down: the root is at depth 1, its children at depth 2.',
        'A node is a leaf when both node.left and node.right are null. The depth is the largest depth any node reaches.',
      ],
      solution: {
        explanation: [
          'visit(node, depth) counts the node, counts it as a leaf when it has no children, and returns the deepest depth reached in its subtree (its own depth, or deeper through a child). null returns 0.',
          'Calling it on the root at depth 1 gives the tree’s depth, and the counters hold the node and leaf counts.',
        ],
        code: `function treeFacts(root) {
  let nodes = 0;
  let leaves = 0;
  const visit = (node, depth) => {
    if (node === null) return 0;
    nodes++;
    if (node.left === null && node.right === null) leaves++;
    return Math.max(depth, visit(node.left, depth + 1), visit(node.right, depth + 1));
  };
  const depth = visit(root, 1);
  return [nodes, leaves, depth];
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height (the recursion depth).' },
      },
      visualization: {
        spec: 'The tree is drawn with node as the current node and visited nodes checked; each finished visit shows the depth it returned under its node. The call stack shows the path of visits from the root.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'f75-32': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['f75-33', 'f75-31'],
    content: {
      statement: [
        'A family tree is stored as a binary tree, root, with no ordering between values. Decide whether any node holds the value target.',
        'Return true if some node’s value equals target, otherwise false.',
      ],
      inputFormat: 'root: a binary tree in level order with null for missing children. target: an integer.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 1,000', 'Values and target are integers from -10^4 to 10^4.'],
      rules: [
        'Empty tree: false.',
        'The tree is not a search tree: a smaller value can be anywhere, so every node may need checking.',
        'Stop as soon as target is found.',
        'Do not change the tree.',
      ],
      entry: 'containsValue',
      params: [
        { name: 'root', kind: 'tree' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { root: [4, 9, 2, null, 7], target: 7 }, output: true, note: '7 is under 9.' },
        { inputs: { root: [4, 9, 2], target: 5 }, output: false, note: 'No node holds 5.' },
      ],
      tests: [
        { inputs: { root: [], target: 1 }, output: false, note: 'Empty tree' },
        { inputs: { root: [3], target: 3 }, output: true, note: 'The root itself' },
        { inputs: { root: [1, 1, 1], target: 1 }, output: true, note: 'Every node matches' },
        { inputs: { root: [-2, 5, null, 8], target: 8 }, output: true, note: 'Deep on the left' },
        { inputs: { root: [1, 2, 3, 4, 5, 6, 7], target: 0 }, output: false, note: 'Not in a full tree' },
      ],
      starter: {
        javascript: `function containsValue(root, target) {
  // Check this node, then search its left and right subtrees.
  return false;
}
`,
      },
      hints: [
        'An empty tree contains nothing.',
        'If the root holds target, you are done. Otherwise target can only be in the left or the right subtree.',
        'Search the left subtree, and only if that fails, the right one.',
      ],
      solution: {
        explanation: [
          'An empty subtree can’t hold target. Otherwise the node itself is checked, and then the search continues into the left subtree and, only if that found nothing, the right one.',
          'The || stops at the first subtree that finds target, so no more nodes are visited after a match.',
        ],
        code: `function containsValue(root, target) {
  if (root === null) return false;
  if (root.val === target) return true;
  return containsValue(root.left, target) || containsValue(root.right, target);
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the height (the recursion depth).' },
      },
      visualization: {
        spec: 'The tree is drawn with root as the node being checked and visited nodes marked in visit order; each finished call shows true or false under its node, and the call stack shows the path being searched.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'f75-33': {
    prerequisites: ['trees-basics', 'binary-search-idea'],
    related: ['f75-32', 'f75-35'],
    content: {
      statement: [
        'A phone directory is stored as a binary search tree, root, with distinct numbers: every number in a node’s left subtree is smaller than the node’s, and every number in its right subtree is larger.',
        'Return true if target is in the tree, otherwise false, using the ordering to skip subtrees.',
      ],
      inputFormat: 'root: a binary search tree in level order with null for missing children. target: an integer.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are distinct integers from -10^5 to 10^5.'],
      rules: [
        'Empty tree: false.',
        'Use the ordering: at each node go left or right, never both. That visits at most one node per level.',
        'Do not change the tree.',
      ],
      entry: 'bstSearch',
      params: [
        { name: 'root', kind: 'tree' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { root: [20, 10, 30, 5, 15, null, 40], target: 15 }, output: true, note: '15 < 20 goes left, then 15 > 10 goes right.' },
        { inputs: { root: [20, 10, 30], target: 25 }, output: false, note: '25 would be left of 30, but that spot is empty.' },
      ],
      tests: [
        { inputs: { root: [], target: 4 }, output: false, note: 'Empty tree' },
        { inputs: { root: [7], target: 7 }, output: true, note: 'The root' },
        { inputs: { root: [7], target: 3 }, output: false, note: 'One node, missing' },
        { inputs: { root: [50, 30, 70, 20, 40, 60, 80], target: 80 }, output: true, note: 'The largest number' },
        { inputs: { root: [50, 30, 70, 20, 40, 60, 80], target: 45 }, output: false, note: 'Between two leaves' },
        { inputs: { root: [5, null, 9, null, 12], target: 12 }, output: true, note: 'A tree that leans right' },
      ],
      starter: {
        javascript: `function bstSearch(root, target) {
  let node = root;
  // Compare target with node.val: equal means found, smaller goes left, larger goes right.
  return false;
}
`,
      },
      hints: [
        'Compare target with the current node’s value.',
        'Smaller: target can only be in the left subtree. Larger: only in the right.',
        'Reaching null means the place target would be is empty.',
      ],
      solution: {
        explanation: [
          'node starts at the root. Equal means found; a smaller target can only be in the left subtree and a larger one only in the right, so the other subtree is skipped entirely.',
          'Falling off the tree (null) means target would have to be in an empty spot: it is not there.',
        ],
        code: `function bstSearch(root, target) {
  let node = root;
  while (node !== null) {
    if (target === node.val) return true;
    node = target < node.val ? node.left : node.right;
  }
  return false;
}
`,
        complexity: { time: 'O(h)', space: 'O(1)', assumptions: 'h is the tree’s height: O(log n) when balanced, O(n) in the worst case.' },
      },
      visualization: {
        spec: 'The tree is drawn with node as the current node; each comparison is shown in the explanation, and the nodes visited form a single path from the root, so the skipped subtrees stay unvisited.',
        renderers: ['binary-tree'],
      },
    },
  },

  'f75-35': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['f75-33', 'f75-31'],
    content: {
      statement: [
        'Someone built a binary tree, root, and claims it is a binary search tree: for every node, all values in its left subtree are smaller and all values in its right subtree are larger. Equal values are not allowed.',
        'Return true if the claim holds for every node, otherwise false.',
      ],
      inputFormat: 'root: a binary tree in level order with null for missing children.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are integers from -2^31 to 2^31 − 1.'],
      rules: [
        'Empty tree: true.',
        'Strict: a value equal to an ancestor’s on either side breaks the rule.',
        'Every value must respect every ancestor, not just its parent.',
        'Do not change the tree.',
      ],
      entry: 'isOrdered',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [10, 5, 15, null, null, 12, 20] }, output: true, note: 'Every node fits between its ancestors.' },
        { inputs: { root: [10, 5, 15, null, null, 6, 20] }, output: false, note: '6 is right of 10 but smaller than 10.' },
      ],
      tests: [
        { inputs: { root: [] }, output: true, note: 'Empty tree' },
        { inputs: { root: [1] }, output: true, note: 'One node' },
        { inputs: { root: [2, 2] }, output: false, note: 'An equal value on the left' },
        { inputs: { root: [3, 1, 5, 0, 2, 4, 6] }, output: true, note: 'A full search tree' },
        { inputs: { root: [5, 4, 6, null, null, 3, 7] }, output: false, note: 'A grandchild breaks the root’s range' },
        { inputs: { root: [1, null, 1] }, output: false, note: 'An equal value on the right' },
      ],
      starter: {
        javascript: `function isOrdered(root) {
  // Each node must lie strictly between a lower and an upper bound set by its ancestors.
  return true;
}
`,
      },
      hints: [
        'Checking each node only against its parent is not enough: a grandchild can break the root’s rule.',
        'Pass down the range a subtree must fit in. The root’s range is (−∞, +∞).',
        'Going left, the node’s value becomes the new upper bound; going right, the new lower bound.',
      ],
      solution: {
        explanation: [
          'check(node, low, high) asks whether every value in the subtree lies strictly between low and high. A node outside that range breaks the rule.',
          'Its left subtree must stay below its value (high becomes node.val), and its right subtree above it (low becomes node.val). Starting from (−∞, ∞) at the root checks every node against all its ancestors.',
        ],
        code: `function isOrdered(root) {
  const check = (node, low, high) => {
    if (node === null) return true;
    if (node.val <= low || node.val >= high) return false;
    return check(node.left, low, node.val) && check(node.right, node.val, high);
  };
  return check(root, -Infinity, Infinity);
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the height (the recursion depth).' },
      },
      visualization: {
        spec: 'The tree is drawn with node as the current node and visited nodes marked; low and high are blocks in each call, and the call stack shows the bounds narrowing on the way down.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'f75-42': {
    prerequisites: ['heaps', 'arrays-basics'],
    related: ['f75-41', 'f75-44'],
    content: {
      statement: [
        'A seismograph logs readings in the array readings. The report needs only the k largest readings.',
        'Return the k largest readings in decreasing order, keeping no more than k readings in memory at a time besides the input.',
      ],
      inputFormat: 'readings: an array of integers. k: an integer.',
      outputFormat: 'An array of k integers in non-increasing order.',
      constraints: ['0 ≤ k ≤ readings.length ≤ 100,000', 'Readings are integers from -10^9 to 10^9.'],
      rules: [
        'k = 0: return [].',
        'Duplicates count separately: if the largest reading appears twice, it can fill two places.',
        'Keep a min-heap of at most k readings: O(n log k), not sorting everything.',
        'Name the heap array so it contains "heap" to see it drawn as a tree.',
        'Do not change readings.',
      ],
      entry: 'largestK',
      params: [
        { name: 'readings', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        { inputs: { readings: [5, 1, 9, 3, 7], k: 2 }, output: [9, 7], note: 'The two largest, biggest first.' },
        { inputs: { readings: [4, 4, 1], k: 2 }, output: [4, 4], note: 'A repeated reading fills both places.' },
      ],
      tests: [
        { inputs: { readings: [], k: 0 }, output: [], note: 'No readings' },
        { inputs: { readings: [3], k: 1 }, output: [3], note: 'One reading' },
        { inputs: { readings: [1, 2, 3], k: 3 }, output: [3, 2, 1], note: 'k is everything' },
        { inputs: { readings: [-1, -5, -3], k: 1 }, output: [-1], note: 'All negative' },
        { inputs: { readings: [8, 6, 7, 5, 3, 0, 9], k: 3 }, output: [9, 8, 7], note: 'The heap keeps changing its smallest' },
        { inputs: { readings: [2, 2, 2], k: 0 }, output: [], note: 'k = 0' },
      ],
      starter: {
        javascript: `function largestK(readings, k) {
  const heap = []; // a min-heap of the k largest readings so far; heap[0] is the smallest of them
  // Push while there are fewer than k; after that, replace heap[0] when a bigger reading comes.
  return [];
}
`,
      },
      hints: [
        'You only need to remember k readings: the largest so far. The one at risk of being pushed out is the smallest of them.',
        'A min-heap keeps that smallest one at heap[0]. While the heap has fewer than k readings, push and sift up.',
        'Once it is full, a reading bigger than heap[0] replaces it and sifts down. At the end, pop everything (smallest first) and reverse.',
      ],
      solution: {
        explanation: [
          'heap is a min-heap of the k largest readings seen so far, so heap[0] is the weakest of them. A new reading joins while there is room; after that it only gets in if it beats heap[0], which it replaces before sifting down.',
          'At the end the heap holds exactly the k largest. Popping the minimum repeatedly gives them smallest first, so the list is reversed.',
        ],
        code: `function largestK(readings, k) {
  const heap = [];
  const swap = (a, b) => {
    [heap[a], heap[b]] = [heap[b], heap[a]];
  };
  const siftUp = (i) => {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent] <= heap[i]) return;
      swap(parent, i);
      i = parent;
    }
  };
  const siftDown = (i) => {
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
      if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
      if (smallest === i) return;
      swap(i, smallest);
      i = smallest;
    }
  };
  for (const reading of readings) {
    if (heap.length < k) {
      heap.push(reading);
      siftUp(heap.length - 1);
    } else if (k > 0 && reading > heap[0]) {
      heap[0] = reading;
      siftDown(0);
    }
  }
  const result = [];
  while (heap.length > 0) {
    result.push(heap[0]);
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      siftDown(0);
    }
  }
  return result.reverse();
}
`,
        complexity: { time: 'O(n log k)', space: 'O(k)', assumptions: 'n is readings.length; every heap operation is O(log k).' },
      },
      visualization: {
        spec: 'The heap is drawn as a tree and as cells, in sync, with i, parent, left, right and smallest on both; swaps move values along the tree edges. readings is drawn as cells with the reading being considered read.',
        renderers: ['heap-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'f75-43': {
    prerequisites: ['heaps', 'two-pointers'],
    related: ['f75-07', 'f75-42'],
    content: {
      statement: [
        'Several sensors each stream timestamps in increasing order. You have all the streams as the array streams, where streams[s] is one sensor’s sorted list.',
        'Return every timestamp from every stream in one increasing list, using a heap that holds the next unread timestamp of each stream.',
      ],
      inputFormat: 'streams: an array of arrays of integers; each inner array is sorted in non-decreasing order.',
      outputFormat: 'An array of all timestamps in non-decreasing order.',
      constraints: ['0 ≤ streams.length ≤ 1,000', 'Up to 10,000 timestamps in total', 'Timestamps are integers from -10^9 to 10^9.'],
      rules: [
        'No streams, or only empty ones: return [].',
        'Equal timestamps are all kept.',
        'Keep at most one entry per stream in the heap: O(N log k) for N timestamps and k streams.',
        'Do not change streams.',
      ],
      entry: 'mergeStreams',
      params: [{ name: 'streams', kind: 'auto' }],
      examples: [
        {
          inputs: {
            streams: [
              [1, 4, 7],
              [2, 5],
              [3, 6, 9],
            ],
          },
          output: [1, 2, 3, 4, 5, 6, 7, 9],
          note: 'Three streams take turns.',
        },
        { inputs: { streams: [[], [1]] }, output: [1], note: 'An empty stream adds nothing.' },
      ],
      tests: [
        { inputs: { streams: [] }, output: [], note: 'No streams' },
        { inputs: { streams: [[]] }, output: [], note: 'One empty stream' },
        { inputs: { streams: [[5, 5], [5]] }, output: [5, 5, 5], note: 'Equal timestamps' },
        { inputs: { streams: [[1], [0], [2]] }, output: [0, 1, 2], note: 'One timestamp each' },
        {
          inputs: {
            streams: [
              [-3, 10],
              [-4, -2, 11],
            ],
          },
          output: [-4, -3, -2, 10, 11],
          note: 'Negative timestamps',
        },
      ],
      starter: {
        javascript: `function mergeStreams(streams) {
  const heap = []; // entries [timestamp, stream, position]; the smallest timestamp on top
  const merged = [];
  // Put each stream's first timestamp in the heap. Then repeatedly take the smallest and add that stream's next one.
  return merged;
}
`,
      },
      hints: [
        'The next timestamp overall is the smallest among the streams’ next unread timestamps.',
        'Keep one entry per stream in a min-heap: [timestamp, stream, position].',
        'Pop the smallest, record it, and push the next timestamp from the same stream if it has one.',
      ],
      solution: {
        explanation: [
          'The heap holds one entry per stream that still has timestamps: its next unread value, which stream, and where. The top is the smallest of them, so it is the next timestamp overall.',
          'Popping it and pushing the following timestamp of the same stream keeps one entry per stream. Ties are broken by stream number so the order is always the same.',
        ],
        code: `function mergeStreams(streams) {
  const heap = [];
  const less = (a, b) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]);
  const swap = (a, b) => {
    [heap[a], heap[b]] = [heap[b], heap[a]];
  };
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!less(i, parent)) break;
      swap(i, parent);
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < heap.length && less(left, smallest)) smallest = left;
        if (right < heap.length && less(right, smallest)) smallest = right;
        if (smallest === i) break;
        swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  };
  for (let s = 0; s < streams.length; s++) {
    if (streams[s].length > 0) push([streams[s][0], s, 0]);
  }
  const merged = [];
  while (heap.length > 0) {
    const [value, s, position] = pop();
    merged.push(value);
    if (position + 1 < streams[s].length) push([streams[s][position + 1], s, position + 1]);
  }
  return merged;
}
`,
        complexity: {
          time: 'O(N log k)',
          space: 'O(k) besides the output',
          assumptions: 'N is the total number of timestamps and k the number of streams.',
        },
      },
      visualization: {
        spec: 'The heap of [timestamp, stream, position] entries is drawn as a tree and as cells; each pop and push moves entries along the tree. streams is drawn as a table with the timestamps read, and merged grows as cells.',
        renderers: ['heap-tree', 'grid', 'array-cells'],
      },
    },
  },

  'f75-44': {
    prerequisites: ['heaps'],
    related: ['f75-42', 'f75-43'],
    content: {
      statement: [
        'Readings arrive one at a time in the array values. After each one arrives, report the median of all readings so far: the middle value, or the average of the two middle values when the count is even.',
        'Return the list of medians, one per reading.',
      ],
      inputFormat: 'values: an array of integers.',
      outputFormat: 'An array of numbers, one per value (an average of two values may end in .5).',
      constraints: ['0 ≤ values.length ≤ 50,000', 'Values are integers from -10^5 to 10^5.'],
      rules: [
        'No values: return [].',
        'Even count: the average of the two middle values (it may not be an integer).',
        'Use two heaps, the lower half as a max-heap and the upper half as a min-heap: O(log n) per reading.',
        'Do not change values.',
      ],
      entry: 'runningMedian',
      params: [{ name: 'values', kind: 'auto' }],
      examples: [
        { inputs: { values: [5, 15, 1, 3] }, output: [5, 10, 5, 4], note: 'After 5 and 15 the median is their average, 10.' },
        { inputs: { values: [2, 2] }, output: [2, 2], note: 'Equal values.' },
      ],
      tests: [
        { inputs: { values: [] }, output: [], note: 'No readings' },
        { inputs: { values: [7] }, output: [7], note: 'One reading' },
        { inputs: { values: [1, 2, 3, 4, 5] }, output: [1, 1.5, 2, 2.5, 3], note: 'Rising readings' },
        { inputs: { values: [-1, -2, -3] }, output: [-1, -1.5, -2], note: 'Falling, negative readings' },
        { inputs: { values: [10, 0, 10, 0] }, output: [10, 5, 10, 5], note: 'Alternating readings' },
      ],
      starter: {
        javascript: `function runningMedian(values) {
  const lowHeap = []; // max-heap: the smaller half, largest on top
  const highHeap = []; // min-heap: the larger half, smallest on top
  const medians = [];
  // Put each value in the right half, rebalance so the halves differ by at most one, then read the median from the tops.
  return medians;
}
`,
      },
      hints: [
        'Split the readings into a lower half and an upper half. The median sits at the boundary between them.',
        'Keep the lower half in a max-heap and the upper half in a min-heap, so both boundary values are at the tops.',
        'After each insert, move one value across if the sizes differ by more than one (let the lower half keep the extra one).',
      ],
      solution: {
        explanation: [
          'lowHeap is a max-heap of the smaller half and highHeap a min-heap of the larger half, so their tops are the two values next to the middle. A new value goes low if it is at most lowHeap’s top, otherwise high.',
          'If one side gets too big, its top moves to the other side, keeping lowHeap equal in size or one larger. The median is then lowHeap’s top, or the average of both tops. push and pop take a comparison function so one pair of helpers serves both heaps.',
        ],
        code: `function runningMedian(values) {
  const lowHeap = [];
  const highHeap = [];
  const push = (heap, value, before) => {
    heap.push(value);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!before(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = (heap, before) => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let best = i;
        if (left < heap.length && before(heap[left], heap[best])) best = left;
        if (right < heap.length && before(heap[right], heap[best])) best = right;
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best], heap[i]];
        i = best;
      }
    }
    return top;
  };
  const larger = (a, b) => a > b;
  const smaller = (a, b) => a < b;
  const medians = [];
  for (const value of values) {
    if (lowHeap.length === 0 || value <= lowHeap[0]) push(lowHeap, value, larger);
    else push(highHeap, value, smaller);
    if (lowHeap.length > highHeap.length + 1) push(highHeap, pop(lowHeap, larger), smaller);
    else if (highHeap.length > lowHeap.length) push(lowHeap, pop(highHeap, smaller), larger);
    medians.push(lowHeap.length > highHeap.length ? lowHeap[0] : (lowHeap[0] + highHeap[0]) / 2);
  }
  return medians;
}
`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(n)',
          assumptions: 'n is values.length; each reading does a constant number of O(log n) heap operations.',
        },
      },
      visualization: {
        spec: 'lowHeap and highHeap are each drawn as a tree and cells; inserts rise, removals sink, and a rebalance moves one value from one heap to the other. medians grows as cells.',
        renderers: ['heap-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'f75-45': {
    prerequisites: ['heaps'],
    related: ['f75-41', 'f75-43'],
    content: {
      statement: [
        'A print shop has n workers, numbered 0 to n − 1, all free at time 0. Jobs are handled strictly in order; job j takes durations[j] minutes. Each job goes to the worker who becomes free the earliest; if several are free at the same time, the lowest-numbered one takes it. A job starts as soon as its worker is free.',
        'Return, for each job in order, [worker, start time].',
      ],
      inputFormat: 'n: a positive integer. durations: an array of positive integers.',
      outputFormat: 'An array of [worker, start] pairs, one per job.',
      constraints: ['1 ≤ n ≤ 10,000', '0 ≤ durations.length ≤ 100,000', '1 ≤ durations[j] ≤ 10^4'],
      rules: [
        'No jobs: return [].',
        'Ties on free time go to the smaller worker number.',
        'A worker who finishes at time t can start the next job at time t.',
        'Use a min-heap of [free time, worker]: O(m log n) for m jobs.',
      ],
      entry: 'assignJobs',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'durations', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { n: 2, durations: [3, 1, 2, 4] },
          output: [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 3],
          ],
          note: 'At time 3 both workers are free; worker 0 takes the last job.',
        },
        { inputs: { n: 3, durations: [5] }, output: [[0, 0]], note: 'One job: worker 0.' },
      ],
      tests: [
        { inputs: { n: 1, durations: [] }, output: [], note: 'No jobs' },
        {
          inputs: { n: 1, durations: [2, 2, 2] },
          output: [
            [0, 0],
            [0, 2],
            [0, 4],
          ],
          note: 'One worker does everything',
        },
        {
          inputs: { n: 3, durations: [1, 1, 1, 1] },
          output: [
            [0, 0],
            [1, 0],
            [2, 0],
            [0, 1],
          ],
          note: 'Everyone busy, then worker 0 again',
        },
        {
          inputs: { n: 2, durations: [5, 1, 1, 1] },
          output: [
            [0, 0],
            [1, 0],
            [1, 1],
            [1, 2],
          ],
          note: 'Worker 1 keeps getting free first',
        },
        {
          inputs: { n: 4, durations: [2, 2] },
          output: [
            [0, 0],
            [1, 0],
          ],
          note: 'More workers than jobs',
        },
      ],
      starter: {
        javascript: `function assignJobs(n, durations) {
  const heap = []; // entries [free time, worker]; the earliest (then lowest worker) on top
  const plan = [];
  // Start with every worker free at 0. For each job, take the top worker, record it, and put it back with its new free time.
  return plan;
}
`,
      },
      hints: [
        'Each job needs the worker with the smallest free time, breaking ties by worker number.',
        'Keep [free time, worker] entries in a min-heap ordered by free time, then worker.',
        'Pop the top for each job, record [worker, free time], and push it back with free time + duration.',
      ],
      solution: {
        explanation: [
          'The heap holds one entry per worker, [free time, worker], ordered by free time and then worker number, so the top is exactly the worker the rules choose.',
          'Each job pops that worker, starts at its free time, and pushes the worker back with the time it will be free again.',
        ],
        code: `function assignJobs(n, durations) {
  const heap = [];
  const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const swap = (a, b) => {
    [heap[a], heap[b]] = [heap[b], heap[a]];
  };
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!before(heap[i], heap[parent])) break;
      swap(i, parent);
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let first = i;
        if (left < heap.length && before(heap[left], heap[first])) first = left;
        if (right < heap.length && before(heap[right], heap[first])) first = right;
        if (first === i) break;
        swap(i, first);
        i = first;
      }
    }
    return top;
  };
  for (let w = 0; w < n; w++) push([0, w]);
  const plan = [];
  for (const duration of durations) {
    const [freeAt, worker] = pop();
    plan.push([worker, freeAt]);
    push([freeAt + duration, worker]);
  }
  return plan;
}
`,
        complexity: {
          time: 'O((n + m) log n)',
          space: 'O(n) besides the output',
          assumptions: 'n workers and m jobs; every heap operation is O(log n).',
        },
      },
      visualization: {
        spec: 'The heap of [free time, worker] entries is drawn as a tree and as cells: each job pops the top and pushes it back later in the order. plan grows as a table.',
        renderers: ['heap-tree', 'grid', 'call-stack'],
      },
    },
  },

  'f75-47': {
    prerequisites: ['matrices', 'tree-traversal-dfs', 'graphs-basics'],
    related: ['f75-46', 'f75-53'],
    content: {
      statement: [
        'A map is the grid grid of 1s (land) and 0s (water). Land cells that touch up, down, left or right belong to the same region; diagonal neighbours do not connect.',
        'Return the number of separate land regions. You may write into grid; the reference labels each region with its own number (2, 3, …) as it goes.',
      ],
      inputFormat: 'grid: an array of rows, each an array of 0s and 1s, all rows the same length.',
      outputFormat: 'An integer: the number of land regions.',
      constraints: ['0 ≤ rows, columns ≤ 50'],
      rules: [
        'Empty grid: 0.',
        'Only orthogonal neighbours connect; diagonals do not.',
        'You may change grid (for example to mark land you have already counted).',
      ],
      entry: 'countRegions',
      params: [{ name: 'grid', kind: 'auto' }],
      examples: [
        {
          inputs: {
            grid: [
              [1, 1, 0],
              [0, 1, 0],
              [0, 0, 1],
            ],
          },
          output: 2,
          note: 'The bottom-right cell only touches the others diagonally.',
        },
        {
          inputs: {
            grid: [
              [0, 0],
              [0, 0],
            ],
          },
          output: 0,
          note: 'All water.',
        },
      ],
      tests: [
        { inputs: { grid: [] }, output: 0, note: 'Empty map' },
        { inputs: { grid: [[1]] }, output: 1, note: 'One land cell' },
        { inputs: { grid: [[1, 0, 1, 0, 1]] }, output: 3, note: 'One row' },
        { inputs: { grid: [[1], [1], [0], [1]] }, output: 2, note: 'One column' },
        {
          inputs: {
            grid: [
              [1, 1],
              [1, 1],
            ],
          },
          output: 1,
          note: 'All land',
        },
        {
          inputs: {
            grid: [
              [1, 0],
              [0, 1],
            ],
          },
          output: 2,
          note: 'Diagonal cells are separate',
        },
      ],
      starter: {
        javascript: `function countRegions(grid) {
  let regions = 0;
  // For each land cell not yet counted: count a new region and mark every land cell connected to it.
  return regions;
}
`,
      },
      hints: [
        'Scan every cell. Unvisited land means a region you haven’t counted yet.',
        'When you find one, flood it: mark that cell and spread to its four neighbours that are still unmarked land.',
        'Writing a label (2, 3, …) into the cells you flood both marks them and shows which region each belongs to.',
      ],
      solution: {
        explanation: [
          'The scan visits cells row by row. A cell still holding 1 starts a new region: regions grows, and flood paints the whole region with its label.',
          'flood stops at the edge of the map, at water, and at cells already painted, so each land cell is painted once and every region is counted exactly once.',
        ],
        code: `function countRegions(grid) {
  let regions = 0;
  const flood = (r, c, label) => {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[r].length || grid[r][c] !== 1) return;
    grid[r][c] = label;
    flood(r + 1, c, label);
    flood(r - 1, c, label);
    flood(r, c + 1, label);
    flood(r, c - 1, label);
  };
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 1) {
        regions++;
        flood(r, c, regions + 1);
      }
    }
  }
  return regions;
}
`,
        complexity: {
          time: 'O(R × C)',
          space: 'O(R × C)',
          assumptions: 'R rows and C columns; the recursion can be as deep as one region’s size.',
        },
      },
      visualization: {
        spec: 'grid is drawn as a table with r and c marking the cell being visited; each painted cell lights up and keeps its region’s label. The call stack shows the flood spreading and backing up.',
        renderers: ['grid', 'call-stack'],
      },
    },
  },

  'f75-49': {
    prerequisites: ['graphs-basics', 'heaps'],
    related: ['f75-46', 'f75-50'],
    content: {
      statement: [
        'A project has n tasks numbered 0 to n − 1. Each entry [before, after] of deps says task before must be finished before task after can start.',
        'Return an order to do every task that respects all dependencies. When several tasks are ready at once, always take the smallest-numbered one. If the dependencies form a cycle, no order exists: return [].',
      ],
      inputFormat: 'n: an integer. deps: an array of [before, after] pairs.',
      outputFormat: 'An array of all n task numbers in the required order, or [].',
      constraints: ['1 ≤ n ≤ 2,000', '0 ≤ deps.length ≤ 10,000', '0 ≤ before, after < n, before ≠ after'],
      rules: [
        'Ready means every task it depends on is done.',
        'Ties: of all ready tasks, take the smallest number.',
        'A cycle anywhere means no order: return [].',
        'A dependency may be listed twice; it is still one requirement, and the task becomes ready when both entries are satisfied.',
        'Do not change deps.',
      ],
      entry: 'taskOrder',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'deps', kind: 'auto' },
      ],
      examples: [
        { inputs: { n: 3, deps: [[2, 0]] }, output: [1, 2, 0], note: 'Tasks 1 and 2 are ready first; 1 is smaller.' },
        {
          inputs: {
            n: 2,
            deps: [
              [0, 1],
              [1, 0],
            ],
          },
          output: [],
          note: 'Each task waits for the other: a cycle.',
        },
      ],
      tests: [
        { inputs: { n: 1, deps: [] }, output: [0], note: 'One task' },
        { inputs: { n: 3, deps: [] }, output: [0, 1, 2], note: 'No dependencies' },
        {
          inputs: {
            n: 3,
            deps: [
              [0, 1],
              [1, 2],
              [2, 0],
            ],
          },
          output: [],
          note: 'A three-task cycle',
        },
        {
          inputs: {
            n: 5,
            deps: [
              [3, 1],
              [4, 1],
              [1, 0],
            ],
          },
          output: [2, 3, 4, 1, 0],
          note: 'A task waiting for two others',
        },
        {
          inputs: {
            n: 4,
            deps: [
              [1, 0],
              [1, 0],
            ],
          },
          output: [1, 0, 2, 3],
          note: 'A dependency listed twice',
        },
      ],
      starter: {
        javascript: `function taskOrder(n, deps) {
  const graph = []; // graph[t]: the tasks waiting on t
  const indegree = []; // indegree[t]: how many of t's prerequisites are not done yet
  const order = [];
  // Build both, then repeatedly do the smallest ready task and release the tasks waiting on it.
  return order;
}
`,
      },
      hints: [
        'A task is ready when none of its prerequisites is left: count unfinished prerequisites per task (its indegree).',
        'Finishing a task lowers the count of every task that waits on it; any count that reaches 0 becomes ready.',
        'Keep ready tasks in a min-heap so the smallest is always next. If fewer than n tasks get done, there is a cycle.',
      ],
      solution: {
        explanation: [
          'graph[t] lists the tasks that wait on t, and indegree[t] counts t’s unfinished prerequisites. Tasks with indegree 0 start in readyHeap, a min-heap, so the smallest ready task is always on top.',
          'Each round does the top task and lowers the indegree of every task waiting on it; tasks reaching 0 join the heap. Tasks on a cycle never reach 0, so fewer than n get done and the answer is [].',
        ],
        code: `function taskOrder(n, deps) {
  const graph = [];
  const indegree = [];
  for (let t = 0; t < n; t++) {
    graph.push([]);
    indegree.push(0);
  }
  for (const [before, after] of deps) {
    graph[before].push(after);
    indegree[after]++;
  }
  const readyHeap = [];
  const push = (task) => {
    readyHeap.push(task);
    let i = readyHeap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (readyHeap[parent] <= readyHeap[i]) break;
      [readyHeap[parent], readyHeap[i]] = [readyHeap[i], readyHeap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = readyHeap[0];
    const last = readyHeap.pop();
    if (readyHeap.length > 0) {
      readyHeap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < readyHeap.length && readyHeap[left] < readyHeap[smallest]) smallest = left;
        if (right < readyHeap.length && readyHeap[right] < readyHeap[smallest]) smallest = right;
        if (smallest === i) break;
        [readyHeap[i], readyHeap[smallest]] = [readyHeap[smallest], readyHeap[i]];
        i = smallest;
      }
    }
    return top;
  };
  for (let t = 0; t < n; t++) {
    if (indegree[t] === 0) push(t);
  }
  const order = [];
  while (readyHeap.length > 0) {
    const task = pop();
    order.push(task);
    for (const next of graph[task]) {
      indegree[next]--;
      if (indegree[next] === 0) push(next);
    }
  }
  return order.length === n ? order : [];
}
`,
        complexity: {
          time: 'O((n + e) log n)',
          space: 'O(n + e)',
          assumptions: 'n tasks and e dependencies; each task enters the heap once.',
        },
      },
      visualization: {
        spec: 'graph is drawn with an arrow from each task to the tasks waiting on it; indegree is drawn as cells that count down as tasks finish, and readyHeap as a tree and cells holding the ready tasks. The neighbour being released lights up as a violet edge.',
        renderers: ['graph', 'heap-tree', 'array-cells'],
      },
    },
  },

  'f75-50': {
    prerequisites: ['graphs-basics', 'heaps'],
    related: ['f75-48', 'f75-49'],
    content: {
      statement: [
        'A delivery map has n towns numbered 0 to n − 1. Each entry [a, b, cost] of roads is a two-way road between a and b with a non-negative toll.',
        'Return, for every town, the cheapest total toll to reach it from source, or -1 if it can’t be reached.',
      ],
      inputFormat: 'n: an integer. roads: an array of [a, b, cost]. source: an integer from 0 to n − 1.',
      outputFormat: 'An array of n integers: the cheapest cost to each town, or -1.',
      constraints: ['1 ≤ n ≤ 10,000', '0 ≤ roads.length ≤ 50,000', '0 ≤ cost ≤ 10^4'],
      rules: [
        'The cost to source itself is 0.',
        'Unreachable towns: -1.',
        'Tolls are never negative; a toll of 0 is allowed.',
        'Several roads may join the same two towns; use the cheapest way.',
        'Use Dijkstra’s algorithm with a min-heap: O((n + r) log n).',
      ],
      entry: 'shortestDistances',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'roads', kind: 'auto' },
        { name: 'source', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 4,
            roads: [
              [0, 1, 4],
              [0, 2, 1],
              [2, 1, 2],
              [1, 3, 5],
            ],
            source: 0,
          },
          output: [0, 3, 1, 8],
          note: 'Going through town 2 makes town 1 cost 3 instead of 4.',
        },
        { inputs: { n: 3, roads: [[0, 1, 2]], source: 2 }, output: [-1, -1, 0], note: 'Town 2 has no roads.' },
      ],
      tests: [
        { inputs: { n: 1, roads: [], source: 0 }, output: [0], note: 'One town' },
        { inputs: { n: 2, roads: [[0, 1, 0]], source: 0 }, output: [0, 0], note: 'A free road' },
        {
          inputs: {
            n: 3,
            roads: [
              [0, 1, 5],
              [0, 1, 2],
              [1, 2, 1],
            ],
            source: 0,
          },
          output: [0, 2, 3],
          note: 'Two roads between the same towns',
        },
        {
          inputs: {
            n: 4,
            roads: [
              [0, 1, 1],
              [1, 2, 1],
              [2, 3, 1],
              [0, 3, 10],
            ],
            source: 3,
          },
          output: [3, 2, 1, 0],
          note: 'The long way round is cheaper',
        },
        {
          inputs: {
            n: 5,
            roads: [
              [0, 1, 3],
              [1, 2, 3],
              [3, 4, 1],
            ],
            source: 1,
          },
          output: [3, 0, 3, -1, -1],
          note: 'A separate part of the map',
        },
      ],
      starter: {
        javascript: `function shortestDistances(n, roads, source) {
  const graph = []; // graph[v]: [neighbour, toll] pairs
  const dist = []; // dist[v]: cheapest cost found so far
  const heap = []; // entries [cost, town], cheapest on top
  // Repeatedly settle the cheapest town in the heap and try its roads.
  return dist;
}
`,
      },
      hints: [
        'Start with dist[source] = 0 and every other town at Infinity.',
        'Keep [cost, town] entries in a min-heap. The cheapest entry popped is final for its town, because tolls are never negative.',
        'For each road from that town, if going through it is cheaper than dist[neighbour], update dist and push the new entry. Skip popped entries that are out of date.',
      ],
      solution: {
        explanation: [
          'dist holds the cheapest known cost to each town, Infinity until reached. The heap holds [cost, town] candidates; the cheapest one can’t be improved later, because every other path costs at least as much and tolls are never negative.',
          'Popping it relaxes each road: a cheaper cost to the neighbour updates dist and pushes a new entry. An entry whose cost is above dist[town] is out of date and skipped. Unreached towns are reported as -1.',
        ],
        code: `function shortestDistances(n, roads, source) {
  const graph = [];
  for (let v = 0; v < n; v++) graph.push([]);
  for (const [a, b, cost] of roads) {
    graph[a].push([b, cost]);
    graph[b].push([a, cost]);
  }
  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;
  const heap = [[0, source]];
  const before = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!before(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let first = i;
        if (left < heap.length && before(heap[left], heap[first])) first = left;
        if (right < heap.length && before(heap[right], heap[first])) first = right;
        if (first === i) break;
        [heap[i], heap[first]] = [heap[first], heap[i]];
        i = first;
      }
    }
    return top;
  };
  while (heap.length > 0) {
    const [d, u] = pop();
    if (d > dist[u]) continue;
    for (const [v, cost] of graph[u]) {
      if (d + cost < dist[v]) {
        dist[v] = d + cost;
        push([dist[v], v]);
      }
    }
  }
  return dist.map((d) => (d === Infinity ? -1 : d));
}
`,
        complexity: { time: 'O((n + r) log n)', space: 'O(n + r)', assumptions: 'n towns and r roads; each road can push one heap entry.' },
      },
      visualization: {
        spec: 'graph is drawn with tolls on the roads and each town’s dist next to it (∞ until reached); u and v are labels on the towns being settled and relaxed, and the road being read is a violet edge. The heap of [cost, town] entries is drawn as a tree and cells.',
        renderers: ['graph', 'heap-tree', 'array-cells'],
      },
    },
  },

  'f75-52': {
    prerequisites: ['union-find', 'graphs-basics'],
    related: ['f75-51', 'f75-54'],
    content: {
      statement: [
        'A network has n routers numbered 0 to n − 1, and cables are installed one at a time in the order given by edges, each [a, b] joining two different routers.',
        'Return the first cable that joins two routers that were already connected (and so creates a loop). If no cable does, return [].',
      ],
      inputFormat: 'n: an integer. edges: an array of [a, b] pairs.',
      outputFormat: 'The first such [a, b] as given in edges, or [].',
      constraints: ['1 ≤ n ≤ 100,000', '0 ≤ edges.length ≤ 100,000', '0 ≤ a, b < n and a ≠ b'],
      rules: [
        'Connected means joined by cables installed earlier, directly or through other routers.',
        'Return the cable as it appears in edges (same order of a and b).',
        'A cable listed twice: the second copy creates a loop.',
        'Use union-find: close to O(1) per cable.',
      ],
      entry: 'firstCycleEdge',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'edges', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 4,
            edges: [
              [0, 1],
              [1, 2],
              [2, 0],
              [2, 3],
            ],
          },
          output: [2, 0],
          note: '0 and 2 were already joined through 1.',
        },
        {
          inputs: {
            n: 3,
            edges: [
              [0, 1],
              [1, 2],
            ],
          },
          output: [],
          note: 'No cable closes a loop.',
        },
      ],
      tests: [
        {
          inputs: {
            n: 2,
            edges: [
              [0, 1],
              [1, 0],
            ],
          },
          output: [1, 0],
          note: 'The same cable twice',
        },
        { inputs: { n: 1, edges: [] }, output: [], note: 'No cables' },
        {
          inputs: {
            n: 5,
            edges: [
              [0, 1],
              [2, 3],
              [1, 2],
              [3, 0],
              [0, 4],
            ],
          },
          output: [3, 0],
          note: 'Two groups joined, then a loop',
        },
        {
          inputs: {
            n: 4,
            edges: [
              [0, 1],
              [2, 3],
              [1, 2],
            ],
          },
          output: [],
          note: 'Joining groups is not a loop',
        },
        {
          inputs: {
            n: 6,
            edges: [
              [4, 5],
              [0, 1],
              [5, 4],
            ],
          },
          output: [5, 4],
          note: 'Reversed duplicate',
        },
      ],
      starter: {
        javascript: `function firstCycleEdge(n, edges) {
  const parent = []; // parent[r] === r means r is the root of its group
  // Before adding each cable, check whether its two routers already share a root.
  return [];
}
`,
      },
      hints: [
        'A cable closes a loop exactly when its two routers are already in the same group.',
        'Track groups with union-find: find(x) follows parent to the group’s root.',
        'Same root: that cable is the answer. Otherwise join the two groups by pointing one root at the other.',
      ],
      solution: {
        explanation: [
          'Each router starts as its own root. find(x) follows parent links to the root, halving the path as it goes (each visited slot skips to its grandparent).',
          'For each cable, equal roots mean the routers were already connected, so this cable is the first to make a loop. Otherwise one root is hung under the other and the next cable is checked.',
        ],
        code: `function firstCycleEdge(n, edges) {
  const parent = [];
  for (let i = 0; i < n; i++) parent.push(i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return [a, b];
    parent[ra] = rb;
  }
  return [];
}
`,
        complexity: {
          time: 'O(n + e log n)',
          space: 'O(n)',
          assumptions: 'e is edges.length; path halving alone keeps each find within O(log n) amortized.',
        },
      },
      visualization: {
        spec: 'parent is drawn as a forest: each union re-points one root, and path halving re-points slots toward their root (the caption says which). edges is drawn as a table with the cable being added read.',
        renderers: ['union-find', 'array-cells', 'grid'],
      },
    },
  },

  'f75-53': {
    prerequisites: ['union-find', 'matrices'],
    related: ['f75-47', 'f75-51'],
    content: {
      statement: [
        'A map of rows × cols cells starts as all water. The cells in positions are turned into land one at a time, each given as [r, c]. Land cells touching up, down, left or right belong to the same region.',
        'After each addition, record how many land regions there are. Return the list of counts.',
      ],
      inputFormat: 'rows, cols: positive integers. positions: an array of [r, c] pairs inside the map.',
      outputFormat: 'An array with one count per position.',
      constraints: ['1 ≤ rows, cols ≤ 100', '0 ≤ positions.length ≤ 10,000'],
      rules: [
        'Turning a cell that is already land into land changes nothing; its count is repeated.',
        'Diagonal neighbours do not connect.',
        'Use union-find on cells (cell = r × cols + c): close to O(1) per addition.',
      ],
      entry: 'regionsAfterEach',
      params: [
        { name: 'rows', kind: 'auto' },
        { name: 'cols', kind: 'auto' },
        { name: 'positions', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            rows: 2,
            cols: 3,
            positions: [
              [0, 0],
              [0, 1],
              [1, 2],
              [1, 1],
            ],
          },
          output: [1, 1, 2, 1],
          note: 'The last cell joins the two regions into one.',
        },
        {
          inputs: {
            rows: 1,
            cols: 1,
            positions: [
              [0, 0],
              [0, 0],
            ],
          },
          output: [1, 1],
          note: 'Adding the same cell twice.',
        },
      ],
      tests: [
        { inputs: { rows: 3, cols: 3, positions: [] }, output: [], note: 'Nothing added' },
        {
          inputs: {
            rows: 1,
            cols: 3,
            positions: [
              [0, 0],
              [0, 2],
              [0, 1],
            ],
          },
          output: [1, 2, 1],
          note: 'The middle cell joins both ends',
        },
        {
          inputs: {
            rows: 2,
            cols: 2,
            positions: [
              [0, 0],
              [1, 1],
            ],
          },
          output: [1, 2],
          note: 'Diagonal cells stay separate',
        },
        {
          inputs: {
            rows: 2,
            cols: 2,
            positions: [
              [0, 0],
              [0, 1],
              [1, 0],
              [1, 1],
            ],
          },
          output: [1, 1, 1, 1],
          note: 'Filling a square',
        },
        {
          inputs: {
            rows: 3,
            cols: 3,
            positions: [
              [1, 1],
              [0, 1],
              [2, 1],
              [1, 0],
              [1, 2],
            ],
          },
          output: [1, 1, 1, 1, 1],
          note: 'A plus sign grown from the centre',
        },
      ],
      starter: {
        javascript: `function regionsAfterEach(rows, cols, positions) {
  const parent = []; // one slot per cell, cell = r * cols + c
  const counts = [];
  // A new land cell is a new region; then merge it with each land neighbour in a different group.
  return counts;
}
`,
      },
      hints: [
        'A new land cell starts as its own region, so the count goes up by one.',
        'Check its four neighbours. Each one that is land and in a different group merges with it, and the count goes down by one.',
        'Use union-find over cell numbers r × cols + c to tell whether two cells are already in the same group.',
      ],
      solution: {
        explanation: [
          'land marks which cells are land, and parent links cells into groups (every cell starts as its own root). A new land cell adds a region.',
          'For each land neighbour, find compares roots. Different roots mean two regions just touched: they are merged and the count drops by one. Equal roots were already one region. Re-adding land does nothing.',
        ],
        code: `function regionsAfterEach(rows, cols, positions) {
  const parent = [];
  for (let i = 0; i < rows * cols; i++) parent.push(i);
  const land = [];
  for (let r = 0; r < rows; r++) land.push(new Array(cols).fill(false));
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let regions = 0;
  const counts = [];
  for (const [r, c] of positions) {
    if (!land[r][c]) {
      land[r][c] = true;
      regions++;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || !land[nr][nc]) continue;
        const a = find(r * cols + c);
        const b = find(nr * cols + nc);
        if (a !== b) {
          parent[a] = b;
          regions--;
        }
      }
    }
    counts.push(regions);
  }
  return counts;
}
`,
        complexity: {
          time: 'O(R × C + p log(R × C))',
          space: 'O(R × C)',
          assumptions: 'R × C cells and p positions; path halving keeps each find within O(log(R × C)) amortized.',
        },
      },
      visualization: {
        spec: 'land is drawn as a table with r, c, nr and nc marking the cell and the neighbour being checked; parent is drawn as a forest of cell numbers, where each merge re-points one root. counts grows as cells.',
        renderers: ['grid', 'union-find', 'array-cells'],
      },
    },
  },

  'f75-54': {
    prerequisites: ['union-find', 'greedy', 'sorting'],
    related: ['f75-52', 'f75-50'],
    content: {
      statement: [
        'A campus has n buildings numbered 0 to n − 1. Each entry [a, b, cost] of cables is a cable that could be laid between buildings a and b. Every building can be reached from every other using all the cables.',
        'Choose cables so that every building is connected (directly or through others) for the smallest total cost. Return that cost.',
      ],
      inputFormat: 'n: an integer. cables: an array of [a, b, cost] triples.',
      outputFormat: 'An integer: the minimum total cost.',
      constraints: ['1 ≤ n ≤ 10,000', '0 ≤ cables.length ≤ 100,000', '0 ≤ cost ≤ 10^5', 'The cables connect all n buildings.'],
      rules: [
        'One building: cost 0.',
        'A cost of 0 is allowed; several cables may join the same two buildings.',
        'Use Kruskal’s algorithm: sort the cables by cost and keep each one that joins two different groups.',
        'Do not change cables (sort a copy).',
      ],
      entry: 'minimumCableCost',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'cables', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 4,
            cables: [
              [0, 1, 1],
              [1, 2, 4],
              [2, 3, 3],
              [0, 3, 2],
              [0, 2, 5],
            ],
          },
          output: 6,
          note: 'Cables of cost 1, 2 and 3 connect everything.',
        },
        {
          inputs: {
            n: 2,
            cables: [
              [0, 1, 7],
              [0, 1, 3],
            ],
          },
          output: 3,
          note: 'The cheaper of two parallel cables.',
        },
      ],
      tests: [
        { inputs: { n: 1, cables: [] }, output: 0, note: 'One building' },
        {
          inputs: {
            n: 3,
            cables: [
              [0, 1, 1],
              [1, 2, 1],
              [0, 2, 1],
            ],
          },
          output: 2,
          note: 'Equal costs: any two',
        },
        {
          inputs: {
            n: 3,
            cables: [
              [0, 1, 10],
              [1, 2, 0],
              [0, 2, 5],
            ],
          },
          output: 5,
          note: 'A free cable',
        },
        {
          inputs: {
            n: 5,
            cables: [
              [0, 1, 2],
              [1, 2, 2],
              [2, 3, 2],
              [3, 4, 2],
              [0, 4, 1],
            ],
          },
          output: 7,
          note: 'A ring: drop one expensive cable',
        },
      ],
      starter: {
        javascript: `function minimumCableCost(n, cables) {
  const edges = [...cables]; // sort this copy by cost
  const parent = []; // union-find over buildings
  let total = 0;
  // Take cables from cheapest to most expensive; keep one only if it joins two different groups.
  return total;
}
`,
      },
      hints: [
        'The cheapest cable that doesn’t create a loop is always safe to take.',
        'Sort a copy of the cables by cost and go through them in that order.',
        'Use union-find to tell whether a cable’s two buildings are already connected; if not, take it and join their groups. Stop after n − 1 cables.',
      ],
      solution: {
        explanation: [
          'edges is a copy of the cables sorted by cost. Going from cheapest to most expensive, a cable whose two buildings are already in the same group would only add a loop, so it is skipped.',
          'Any other cable is the cheapest way to join those two groups, so it is taken: its cost is added and the groups merge. n − 1 taken cables connect everything.',
        ],
        code: `function minimumCableCost(n, cables) {
  const edges = [...cables].sort((x, y) => x[2] - y[2]);
  const parent = [];
  for (let i = 0; i < n; i++) parent.push(i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let total = 0;
  let used = 0;
  for (const [a, b, cost] of edges) {
    if (used === n - 1) break;
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue;
    parent[ra] = rb;
    total += cost;
    used++;
  }
  return total;
}
`,
        complexity: {
          time: 'O(e log e)',
          space: 'O(n + e)',
          assumptions: 'e is cables.length; sorting dominates, and each find is O(log n) amortized with path halving.',
        },
      },
      visualization: {
        spec: 'The sorted edges are drawn as a graph with costs on the lines and as a table, with the cable being considered read; parent is drawn as a forest that merges as cables are taken, and total grows.',
        renderers: ['graph', 'union-find', 'grid'],
      },
    },
  },

  'f75-55': {
    prerequisites: ['union-find', 'hash-maps'],
    related: ['f75-51', 'f75-52'],
    content: {
      statement: [
        'A mailing list has duplicate profiles. Each profile is [name, email, email, …]. Two profiles belong to the same person when they share at least one email, directly or through a chain of profiles.',
        'Merge them. For each person return [name, …emails], where the name is taken from that person’s earliest profile and the emails are every email of the person, once each, in sorted (dictionary) order. List people in the order of their earliest profile.',
      ],
      inputFormat: 'profiles: an array of arrays; each starts with a name followed by one or more emails.',
      outputFormat: 'An array of merged profiles: [name, …sorted unique emails].',
      constraints: ['0 ≤ profiles.length ≤ 1,000', 'Each profile has 1 to 10 emails of up to 30 characters.'],
      rules: [
        'Same name alone does not merge profiles; only a shared email does.',
        'Different names can merge if they share an email; the earliest profile’s name wins.',
        'An email repeated within a profile appears once.',
        'Emails are sorted with plain string comparison.',
        'Do not change profiles.',
      ],
      entry: 'mergeProfiles',
      params: [{ name: 'profiles', kind: 'auto' }],
      examples: [
        {
          inputs: {
            profiles: [
              ['Ana', 'a@x.com', 'b@x.com'],
              ['Ben', 'c@x.com'],
              ['Ana', 'b@x.com', 'd@x.com'],
            ],
          },
          output: [
            ['Ana', 'a@x.com', 'b@x.com', 'd@x.com'],
            ['Ben', 'c@x.com'],
          ],
          note: 'The two Ana profiles share b@x.com.',
        },
        {
          inputs: {
            profiles: [
              ['Kim', 'k@x.com'],
              ['Kim', 'k2@x.com'],
            ],
          },
          output: [
            ['Kim', 'k@x.com'],
            ['Kim', 'k2@x.com'],
          ],
          note: 'Same name, no shared email: two people.',
        },
      ],
      tests: [
        { inputs: { profiles: [] }, output: [], note: 'No profiles' },
        { inputs: { profiles: [['Lee', 'l@x.com', 'l@x.com']] }, output: [['Lee', 'l@x.com']], note: 'An email repeated in one profile' },
        {
          inputs: {
            profiles: [
              ['A', '1@x'],
              ['B', '2@x'],
              ['C', '1@x', '2@x'],
            ],
          },
          output: [['A', '1@x', '2@x']],
          note: 'A chain through the third profile',
        },
        {
          inputs: {
            profiles: [
              ['Z', 'z@x'],
              ['Y', 'y@x'],
              ['X', 'x@x', 'z@x'],
            ],
          },
          output: [
            ['Z', 'x@x', 'z@x'],
            ['Y', 'y@x'],
          ],
          note: 'The earliest profile’s name and position win',
        },
      ],
      starter: {
        javascript: `function mergeProfiles(profiles) {
  const parent = []; // union-find over profile numbers
  const owner = new Map(); // email -> first profile that listed it
  // Join profiles that share an email, then collect each group's emails.
  return [];
}
`,
      },
      hints: [
        'Treat profiles as vertices and a shared email as a connection between them.',
        'Map each email to the first profile that listed it. When a later profile lists it too, union the two profiles.',
        'Union so the smaller profile number becomes the root: then a group’s root is its earliest profile, which gives both the name and the output order.',
      ],
      solution: {
        explanation: [
          'parent is union-find over profile numbers. owner remembers the first profile for each email; seeing that email again unions the two profiles, always hanging the larger root under the smaller, so each group’s root is its earliest profile.',
          'groups then collects every email under its root in a Set (removing repeats). Roots appear in increasing order, so the people come out in the order of their earliest profile, each with that profile’s name and sorted emails.',
        ],
        code: `function mergeProfiles(profiles) {
  const parent = [];
  for (let i = 0; i < profiles.length; i++) parent.push(i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const owner = new Map();
  for (let i = 0; i < profiles.length; i++) {
    for (let k = 1; k < profiles[i].length; k++) {
      const email = profiles[i][k];
      if (!owner.has(email)) {
        owner.set(email, i);
      } else {
        const a = find(i);
        const b = find(owner.get(email));
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      }
    }
  }
  const groups = new Map();
  for (let i = 0; i < profiles.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, new Set());
    for (let k = 1; k < profiles[i].length; k++) groups.get(root).add(profiles[i][k]);
  }
  const result = [];
  for (const [root, emails] of groups) result.push([profiles[root][0], ...[...emails].sort()]);
  return result;
}
`,
        complexity: {
          time: 'O(E log E)',
          space: 'O(E)',
          assumptions: 'E is the total number of emails; sorting each group dominates, and Map/Set operations take O(1) on average.',
        },
      },
      visualization: {
        spec: 'parent is drawn as a forest of profile numbers, each root being a group’s earliest profile; owner is a map from email to first profile, with lookups marked found or not found. profiles is drawn as a table with the email being read.',
        renderers: ['union-find', 'hash-map', 'grid'],
      },
      view: { mapColumns: ['email', 'first profile'] },
    },
  },

  'f75-37': {
    prerequisites: ['recursion-basics', 'backtracking'],
    related: ['f75-38', 'f75-40'],
    content: {
      statement: [
        'A gift box can hold any selection of the distinct items in items, from none of them to all of them.',
        'Return every possible selection. Make them the way a decision process does: for the first item, every selection that takes it comes before every selection that leaves it, and within each group the same rule applies to the next item.',
      ],
      inputFormat: 'items: an array of distinct integers.',
      outputFormat: 'An array of selections; each selection is an array of items in the order they appear in items.',
      constraints: ['0 ≤ items.length ≤ 6', 'Items are distinct integers from -100 to 100.'],
      rules: [
        'No items: the only selection is the empty one, so return [[]].',
        'Each selection keeps the items’ original order, and the selections follow the take-before-leave order above.',
        'Don’t change items.',
      ],
      entry: 'allSelections',
      params: [{ name: 'items', kind: 'auto' }],
      examples: [
        {
          inputs: { items: [1, 2, 3] },
          output: [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []],
          note: 'Every selection that takes 1 comes first, then those that leave it.',
        },
        { inputs: { items: [7] }, output: [[7], []], note: 'Take 7, or leave it.' },
      ],
      tests: [
        { inputs: { items: [] }, output: [[]], note: 'No items: one empty selection' },
        { inputs: { items: [5, -2] }, output: [[5, -2], [5], [-2], []], note: 'Two items, negative values' },
        {
          inputs: { items: [3, 1, 2] },
          output: [[3, 1, 2], [3, 1], [3, 2], [3], [1, 2], [1], [2], []],
          note: 'Unsorted items: the order follows items',
        },
        {
          inputs: { items: [4, 3, 2, 1] },
          output: [
            [4, 3, 2, 1],
            [4, 3, 2],
            [4, 3, 1],
            [4, 3],
            [4, 2, 1],
            [4, 2],
            [4, 1],
            [4],
            [3, 2, 1],
            [3, 2],
            [3, 1],
            [3],
            [2, 1],
            [2],
            [1],
            [],
          ],
          note: 'Four items keep their order inside each selection',
        },
      ],
      starter: {
        javascript: `function allSelections(items) {
  // For each item in turn, decide: take it, or leave it.
  return [];
}
`,
      },
      hints: [
        'Each item has two choices, take or leave, so n items give 2 × 2 × … = 2^n selections.',
        'decide(i, picked): picked holds the choices for items[0] to items[i - 1]. When i reaches the end, record a copy of picked.',
        'Take items[i] (push it), decide for i + 1, then undo (pop it) and decide for i + 1 again. The undo lets the “leave it” branch start from the same state.',
      ],
      solution: {
        explanation: [
          'decide(i, picked) makes the choices for items[i] onward, with picked holding what was taken so far. At the end of items, picked is one complete selection: a copy goes into out (a copy, because picked keeps changing).',
          'For items[i] it first takes it (push), explores everything after, then undoes that choice (pop) and explores everything after again without it. Taking first gives the required order. The calls form a decision tree with a left branch for “take” and a right branch for “leave”, and its 2^n leaves are the selections.',
        ],
        code: `function allSelections(items) {
  const out = [];
  const decide = (i, picked) => {
    if (i === items.length) {
      out.push([...picked]);
      return;
    }
    picked.push(items[i]);
    decide(i + 1, picked);
    picked.pop();
    decide(i + 1, picked);
  };
  decide(0, []);
  return out;
}
`,
        complexity: {
          time: 'O(n · 2^n)',
          space: 'O(n)',
          assumptions:
            'n is items.length; copying each of the 2^n selections takes up to n steps. The space counts the recursion and picked, not the output.',
        },
      },
      visualization: {
        spec: 'The call tree is the take/leave decision tree: each call shows i and the items picked so far, the left child takes items[i] and the right child leaves it. picked is drawn as cells that grow and shrink; out collects each finished selection.',
        renderers: ['call-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'f75-38': {
    prerequisites: ['recursion-basics', 'backtracking'],
    related: ['f75-37', 'f75-40'],
    content: {
      statement: [
        'A display shelf has one spot per token in tokens. Return every way to arrange all the tokens on the shelf.',
        'Make the arrangements in order of the choices: the first spot tries the tokens in the order tokens lists them, and so does every later spot among the tokens still free.',
      ],
      inputFormat: 'tokens: an array of distinct one-letter strings.',
      outputFormat: 'An array of arrangements; each arrangement is an array holding every token once.',
      constraints: ['0 ≤ tokens.length ≤ 4', 'Tokens are distinct lowercase letters.'],
      rules: [
        'No tokens: there is one arrangement, the empty one, so return [[]].',
        'Arrangements follow the choice order above, which is also dictionary order of the tokens’ positions in tokens.',
        'Don’t change tokens.',
      ],
      entry: 'allArrangements',
      params: [{ name: 'tokens', kind: 'auto' }],
      examples: [
        {
          inputs: { tokens: ['x', 'y', 'z'] },
          output: [
            ['x', 'y', 'z'],
            ['x', 'z', 'y'],
            ['y', 'x', 'z'],
            ['y', 'z', 'x'],
            ['z', 'x', 'y'],
            ['z', 'y', 'x'],
          ],
          note: 'x first, then y first, then z first.',
        },
        {
          inputs: { tokens: ['b', 'a'] },
          output: [
            ['b', 'a'],
            ['a', 'b'],
          ],
          note: 'The order follows tokens, not the alphabet.',
        },
      ],
      tests: [
        { inputs: { tokens: [] }, output: [[]], note: 'No tokens: one empty arrangement' },
        { inputs: { tokens: ['q'] }, output: [['q']], note: 'One token' },
        {
          inputs: { tokens: ['c', 'a', 'b'] },
          output: [
            ['c', 'a', 'b'],
            ['c', 'b', 'a'],
            ['a', 'c', 'b'],
            ['a', 'b', 'c'],
            ['b', 'c', 'a'],
            ['b', 'a', 'c'],
          ],
          note: 'The first spot tries c first, because tokens lists it first',
        },
        {
          inputs: { tokens: ['a', 'b', 'c', 'd'] },
          output: [
            ['a', 'b', 'c', 'd'],
            ['a', 'b', 'd', 'c'],
            ['a', 'c', 'b', 'd'],
            ['a', 'c', 'd', 'b'],
            ['a', 'd', 'b', 'c'],
            ['a', 'd', 'c', 'b'],
            ['b', 'a', 'c', 'd'],
            ['b', 'a', 'd', 'c'],
            ['b', 'c', 'a', 'd'],
            ['b', 'c', 'd', 'a'],
            ['b', 'd', 'a', 'c'],
            ['b', 'd', 'c', 'a'],
            ['c', 'a', 'b', 'd'],
            ['c', 'a', 'd', 'b'],
            ['c', 'b', 'a', 'd'],
            ['c', 'b', 'd', 'a'],
            ['c', 'd', 'a', 'b'],
            ['c', 'd', 'b', 'a'],
            ['d', 'a', 'b', 'c'],
            ['d', 'a', 'c', 'b'],
            ['d', 'b', 'a', 'c'],
            ['d', 'b', 'c', 'a'],
            ['d', 'c', 'a', 'b'],
            ['d', 'c', 'b', 'a'],
          ],
          note: 'Four tokens: 24 arrangements',
        },
      ],
      starter: {
        javascript: `function allArrangements(tokens) {
  // Fill the shelf one spot at a time with a token that is still free, then undo and try the next one.
  return [];
}
`,
      },
      hints: [
        'The first spot has n choices, the next n − 1, and so on: n! arrangements.',
        'place(arrangement): if every token is placed, record a copy. Otherwise try each token that is not used yet in the next spot.',
        'Mark the token used and push it, recurse, then pop it and unmark it, so the next choice starts from the same shelf.',
      ],
      solution: {
        explanation: [
          'place(arrangement) fills the next spot. When arrangement holds every token it is complete, and a copy goes into out.',
          'Otherwise it tries each token in tokens order that used doesn’t mark: mark it, push it, fill the remaining spots, then pop and unmark it. That undo is the backtracking step: the next token is tried on exactly the shelf the previous one found.',
        ],
        code: `function allArrangements(tokens) {
  const out = [];
  const used = tokens.map(() => false);
  const place = (arrangement) => {
    if (arrangement.length === tokens.length) {
      out.push([...arrangement]);
      return;
    }
    for (let k = 0; k < tokens.length; k++) {
      if (used[k]) continue;
      used[k] = true;
      arrangement.push(tokens[k]);
      place(arrangement);
      arrangement.pop();
      used[k] = false;
    }
  };
  place([]);
  return out;
}
`,
        complexity: {
          time: 'O(n · n!)',
          space: 'O(n)',
          assumptions:
            'n is tokens.length; each of the n! arrangements is copied in n steps. The space counts used, the arrangement and the recursion, not the output.',
        },
      },
      visualization: {
        spec: 'The call tree shows each partial arrangement, with one child per free token. arrangement and used are drawn as cells: a token is pushed and marked on the way down and popped and unmarked on the way back.',
        renderers: ['call-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'f75-40': {
    prerequisites: ['recursion-basics', 'backtracking', 'matrices'],
    related: ['f75-37', 'f75-39'],
    content: {
      statement: [
        'Place n towers on an n × n board so that no two share a row, a column or a diagonal: a tower threatens every cell in its row, its column and both of its diagonals. Some cells are cracked and can’t hold a tower; blocked lists them.',
        'Return every valid placement. A placement is written as cols, where cols[r] is the column of the tower in row r. List the placements in dictionary order of cols.',
      ],
      inputFormat: 'n: the board size. blocked: an array of [row, column] pairs, the cracked cells.',
      outputFormat: 'An array of placements; each placement is an array of n column numbers from 0 to n − 1.',
      constraints: ['1 ≤ n ≤ 4', '0 ≤ blocked.length ≤ n², with every pair inside the board and no pair listed twice.'],
      rules: [
        'Each row has exactly one tower, so a placement lists one column per row.',
        'A cracked cell can’t hold a tower, but towers still threaten across it.',
        'If no placement exists, return [].',
        'Dictionary order: compare cols arrays slot by slot from row 0.',
      ],
      entry: 'placeTowers',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'blocked', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { n: 4, blocked: [] },
          output: [
            [1, 3, 0, 2],
            [2, 0, 3, 1],
          ],
          note: 'Two placements; each is the other one mirrored.',
        },
        { inputs: { n: 4, blocked: [[0, 1]] }, output: [[2, 0, 3, 1]], note: 'The cracked cell rules out the first placement.' },
      ],
      tests: [
        { inputs: { n: 1, blocked: [] }, output: [[0]], note: 'One cell, one tower' },
        { inputs: { n: 1, blocked: [[0, 0]] }, output: [], note: 'The only cell is cracked' },
        { inputs: { n: 2, blocked: [] }, output: [], note: 'Two towers always threaten each other' },
        { inputs: { n: 3, blocked: [] }, output: [], note: 'A 3 × 3 board has no placement' },
        {
          inputs: {
            n: 4,
            blocked: [
              [1, 0],
              [2, 3],
            ],
          },
          output: [[1, 3, 0, 2]],
          note: 'Two cracked cells, one of them on a placement',
        },
        {
          inputs: {
            n: 4,
            blocked: [
              [0, 0],
              [0, 1],
              [0, 2],
              [0, 3],
            ],
          },
          output: [],
          note: 'A whole row cracked',
        },
      ],
      starter: {
        javascript: `function placeTowers(n, blocked) {
  // Fill the rows from the top: try each column that is not cracked or threatened, then undo.
  return [];
}
`,
      },
      hints: [
        'Every row needs exactly one tower, so decide row by row: which column does row r get?',
        'Column c is threatened for row r when an earlier tower uses column c or sits on a diagonal: cells on one diagonal share r + c, cells on the other share r − c.',
        'place(cols) tries each free column for the next row in increasing order, marks it, recurses, and unmarks it. Trying columns in increasing order gives dictionary order for free.',
      ],
      solution: {
        explanation: [
          'board marks cracked cells with x. place(placed) has towers in rows 0 to placed.length − 1; when every row has one, a copy of placed is a placement. Otherwise row r = placed.length tries columns 0 to n − 1 in order.',
          'The sets cols, downs and ups hold the columns and the two kinds of diagonals (r + c and r − c) that placed towers threaten, so checking a cell takes three lookups. A free cell gets a tower: it is added to the sets, to placed and to board, the rows below are filled, and then everything is removed again: the undo that lets the next column be tried. Threatened and cracked cells are never explored, which prunes the search.',
        ],
        code: `function placeTowers(n, blocked) {
  const out = [];
  const board = [];
  for (let r = 0; r < n; r++) {
    board.push([]);
    for (let c = 0; c < n; c++) board[r].push('.');
  }
  for (const [r, c] of blocked) board[r][c] = 'x';
  const cols = new Set();
  const downs = new Set();
  const ups = new Set();
  const place = (placed) => {
    const r = placed.length;
    if (r === n) {
      out.push([...placed]);
      return;
    }
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 'x' || cols.has(c) || downs.has(r + c) || ups.has(r - c)) continue;
      cols.add(c);
      downs.add(r + c);
      ups.add(r - c);
      placed.push(c);
      board[r][c] = 'T';
      place(placed);
      board[r][c] = '.';
      placed.pop();
      cols.delete(c);
      downs.delete(r + c);
      ups.delete(r - c);
    }
  };
  place([]);
  return out;
}
`,
        complexity: {
          time: 'O(n!)',
          space: 'O(n²)',
          assumptions:
            'A loose bound: row r has at most n − r free columns, and each check is three average-O(1) set lookups. The board takes n² cells; without it the space is O(n).',
        },
      },
      visualization: {
        spec: 'The call tree shows each partial placement, with one child per free column for the next row; threatened and cracked columns get no call. board is drawn as a grid with x for cracked cells and T for towers, added on the way down and removed on the way back; cols, downs and ups are sets of what the towers threaten.',
        renderers: ['call-tree', 'grid', 'hash-set', 'call-stack'],
      },
    },
  },

  'f75-39': {
    prerequisites: ['backtracking', 'matrices'],
    related: ['f75-47', 'f75-70'],
    content: {
      statement: [
        'A word-search puzzle is the grid board of single letters. A trail starts on any cell and moves up, down, left or right one cell at a time, never using the same cell twice in one trail.',
        'Return true if some trail spells word, otherwise false.',
      ],
      inputFormat: 'board: an array of rows of one-letter strings, all rows the same length. word: a string.',
      outputFormat: 'A boolean.',
      constraints: ['1 ≤ rows, columns ≤ 6', '1 ≤ word.length ≤ 15', 'Letters are lowercase a–z.'],
      rules: [
        'Only orthogonal moves; no diagonals.',
        'A cell can be used once per trail (it can be used again in a different trail).',
        'You may mark cells on board while exploring, but leave board as you found it.',
      ],
      entry: 'existsPath',
      params: [
        { name: 'board', kind: 'auto' },
        { name: 'word', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            board: [
              ['s', 'e', 'a'],
              ['t', 'a', 'r'],
            ],
            word: 'star',
          },
          output: true,
          note: 's → t → a → r, down then right twice.',
        },
        {
          inputs: {
            board: [
              ['s', 'e', 'a'],
              ['t', 'a', 'r'],
            ],
            word: 'tease',
          },
          output: false,
          note: 'No e sits next to t.',
        },
      ],
      tests: [
        { inputs: { board: [['a']], word: 'a' }, output: true, note: 'One cell' },
        { inputs: { board: [['a']], word: 'aa' }, output: false, note: 'A cell can’t be used twice' },
        {
          inputs: {
            board: [
              ['a', 'b'],
              ['c', 'd'],
            ],
            word: 'abdc',
          },
          output: true,
          note: 'Around the square',
        },
        {
          inputs: {
            board: [
              ['a', 'b'],
              ['c', 'd'],
            ],
            word: 'ad',
          },
          output: false,
          note: 'Diagonal moves don’t count',
        },
        {
          inputs: {
            board: [
              ['a', 'a'],
              ['a', 'a'],
            ],
            word: 'aaaaa',
          },
          output: false,
          note: 'Longer than the board',
        },
      ],
      starter: {
        javascript: `function existsPath(board, word) {
  // From each cell, try to match word letter by letter, marking cells in use and unmarking them on the way back.
  return false;
}
`,
      },
      hints: [
        'Try every cell as a starting point.',
        'walk(r, c, i) asks: can word[i..] be spelled starting at (r, c)? It fails off the board or on the wrong letter.',
        'Mark the cell before trying the four neighbours and restore it afterwards, so one trail never reuses it but other trails can.',
      ],
      solution: {
        explanation: [
          'walk(r, c, i) succeeds when all of word has been matched. Otherwise the cell must be on the board and hold word[i].',
          'The cell is marked with # so the rest of this trail can’t step on it, the four neighbours are tried for word[i + 1], and the letter is put back before returning: that undo is the backtracking step.',
        ],
        code: `function existsPath(board, word) {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const walk = (r, c, i) => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    const letter = board[r][c];
    board[r][c] = '#';
    const found = walk(r + 1, c, i + 1) || walk(r - 1, c, i + 1) || walk(r, c + 1, i + 1) || walk(r, c - 1, i + 1);
    board[r][c] = letter;
    return found;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (walk(r, c, 0)) return true;
    }
  }
  return false;
}
`,
        complexity: {
          time: 'O(R × C × 3^L)',
          space: 'O(L)',
          assumptions: 'R × C cells and L = word.length; after the first step each cell has at most three new neighbours to try.',
        },
      },
      visualization: {
        spec: 'board is drawn as a table with r and c marking the cell being tried; cells in the current trail show #, and they turn back into letters as the search backs up. word is drawn as characters with i over the letter being matched, and the call stack holds the trail.',
        renderers: ['grid', 'string-cells', 'call-stack'],
      },
    },
  },

  'f75-56': {
    prerequisites: ['dp-basics'],
    related: ['f75-36', 'f75-57'],
    content: {
      statement: [
        'You stand on the ground below a staircase whose steps are numbered 0 to n − 1, and the top is just past the last step. Landing on step i costs cost[i]. Each move climbs one or two steps, so from the ground you can land on step 0 or step 1, and the top can be reached from either of the last two steps.',
        'Return the smallest total cost to reach the top.',
      ],
      inputFormat: 'cost: an array of non-negative integers.',
      outputFormat: 'An integer: the cheapest total.',
      constraints: ['0 ≤ cost.length ≤ 10,000', '0 ≤ cost[i] ≤ 999'],
      rules: [
        'You pay for every step you land on; starting on the ground and reaching the top are free.',
        'No steps, or one step: you can jump straight to the top, so the answer is 0.',
        'Aim for O(n).',
        'Do not change cost.',
      ],
      entry: 'minStairCost',
      params: [{ name: 'cost', kind: 'auto' }],
      examples: [
        { inputs: { cost: [4, 9, 2, 7] }, output: 6, note: 'Land on steps 0 and 2: 4 + 2.' },
        { inputs: { cost: [3, 3, 3] }, output: 3, note: 'Land on step 1, then jump to the top.' },
      ],
      tests: [
        { inputs: { cost: [] }, output: 0, note: 'No steps' },
        { inputs: { cost: [5] }, output: 0, note: 'One step: jump over it' },
        { inputs: { cost: [1, 100] }, output: 1, note: 'Land on step 0, then two up' },
        { inputs: { cost: [0, 0, 0, 0] }, output: 0, note: 'Free steps' },
        { inputs: { cost: [10, 1, 1, 10, 1] }, output: 3, note: 'Skip both expensive steps' },
      ],
      starter: {
        javascript: `function minStairCost(cost) {
  const best = []; // best[i]: cheapest total that lands on step i
  // Step i is reached from step i - 1 or step i - 2 (or from the ground for steps 0 and 1).
  return 0;
}
`,
      },
      hints: [
        'The cheapest way to land on step i comes from the cheapest way to land on step i − 1 or step i − 2.',
        'best[i] = cost[i] + min(best[i − 1], best[i − 2]), where “before step 0” is the free ground.',
        'The top is reached from step n − 1 or n − 2: the answer is the smaller of those two totals.',
      ],
      solution: {
        explanation: [
          'best[i] is the cheapest total that ends by landing on step i. The ground counts as 0, so best[0] = cost[0] and best[1] = cost[1].',
          'Every later step adds its cost to the cheaper of the two steps below. The top is one or two steps above the last two steps, so the answer is the smaller of best[n − 1] and best[n − 2] (0 when there are fewer than two steps).',
        ],
        code: `function minStairCost(cost) {
  const n = cost.length;
  const best = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const fromBelow = i >= 1 ? best[i - 1] : 0;
    const fromTwoBelow = i >= 2 ? best[i - 2] : 0;
    best[i] = cost[i] + Math.min(fromBelow, fromTwoBelow);
  }
  if (n <= 1) return 0;
  return Math.min(best[n - 1], best[n - 2]);
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is cost.length; keeping only the last two totals would make it O(1).' },
      },
      visualization: {
        spec: 'cost and best are drawn as cells with i over the step being filled; each step reads best[i − 1], best[i − 2] and cost[i] and writes best[i], and the caption names those reads and the write.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-57': {
    prerequisites: ['dp-basics'],
    related: ['f75-56', 'f75-58'],
    content: {
      statement: [
        'A row of reward boxes has the values in rewards. You may open any boxes you like, except that you may never open two neighbouring boxes.',
        'Return the largest total reward you can collect.',
      ],
      inputFormat: 'rewards: an array of non-negative integers.',
      outputFormat: 'An integer: the largest total.',
      constraints: ['0 ≤ rewards.length ≤ 10,000', '0 ≤ rewards[i] ≤ 10,000'],
      rules: [
        'No boxes: 0.',
        'Neighbours are positions i and i + 1; boxes two apart may both be opened.',
        'Aim for O(n).',
        'Do not change rewards.',
      ],
      entry: 'maxReward',
      params: [{ name: 'rewards', kind: 'auto' }],
      examples: [
        { inputs: { rewards: [3, 10, 3, 1, 2] }, output: 12, note: 'Open the 10 and the 2.' },
        { inputs: { rewards: [4, 4] }, output: 4, note: 'Neighbours: only one can be opened.' },
      ],
      tests: [
        { inputs: { rewards: [] }, output: 0, note: 'No boxes' },
        { inputs: { rewards: [6] }, output: 6, note: 'One box' },
        { inputs: { rewards: [2, 1, 1, 2] }, output: 4, note: 'Both ends' },
        { inputs: { rewards: [5, 5, 5, 5, 5] }, output: 15, note: 'Every other box' },
        { inputs: { rewards: [0, 0, 9] }, output: 9, note: 'Zero rewards' },
      ],
      starter: {
        javascript: `function maxReward(rewards) {
  const dp = new Array(rewards.length + 1).fill(0); // dp[i]: best total from the first i boxes
  // Box i - 1 is either skipped (dp[i - 1]) or opened (dp[i - 2] + its reward).
  return 0;
}
`,
      },
      hints: [
        'Think about the last box: either you skip it, or you open it and must skip the one before.',
        'Let dp[i] be the best total using only the first i boxes.',
        'dp[i] = max(dp[i − 1], dp[i − 2] + rewards[i − 1]).',
      ],
      solution: {
        explanation: [
          'dp[i] is the best total from the first i boxes; dp[0] = 0. For box i − 1 there are two choices: skip it (dp[i − 1]) or open it, which rules out its left neighbour (dp[i − 2] + rewards[i − 1]).',
          'Taking the larger choice for every i gives dp[n], the best total for the whole row.',
        ],
        code: `function maxReward(rewards) {
  const dp = new Array(rewards.length + 1).fill(0);
  for (let i = 1; i <= rewards.length; i++) {
    const open = (i >= 2 ? dp[i - 2] : 0) + rewards[i - 1];
    dp[i] = Math.max(dp[i - 1], open);
  }
  return dp[rewards.length];
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is rewards.length.' },
      },
      visualization: {
        spec: 'rewards and dp are drawn as cells; each step reads dp[i − 1], dp[i − 2] and rewards[i − 1] and writes dp[i], and the caption names those reads and the write.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-58': {
    prerequisites: ['dp-basics'],
    related: ['f75-57', 'f75-59'],
    content: {
      statement: [
        'An arcade sells tokens in the face values listed in denominations, and you can use each face value as many times as you like.',
        'Return the fewest tokens whose values add up to exactly target, or -1 if no combination does.',
      ],
      inputFormat: 'denominations: an array of distinct positive integers. target: a non-negative integer.',
      outputFormat: 'An integer: the fewest tokens, or -1.',
      constraints: ['1 ≤ denominations.length ≤ 12', '1 ≤ denominations[i] ≤ 10,000', '0 ≤ target ≤ 10,000'],
      rules: [
        'target = 0: 0 tokens.',
        'Impossible totals: -1.',
        'Each face value can be used any number of times.',
        'Do not change denominations.',
      ],
      entry: 'fewestTokens',
      params: [
        { name: 'denominations', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { denominations: [1, 4, 6], target: 8 }, output: 2, note: '4 + 4 beats taking the 6 first.' },
        { inputs: { denominations: [5, 10], target: 3 }, output: -1, note: 'Every total is a multiple of 5.' },
      ],
      tests: [
        { inputs: { denominations: [3], target: 0 }, output: 0, note: 'Nothing to pay' },
        { inputs: { denominations: [2], target: 4 }, output: 2, note: 'One face value' },
        { inputs: { denominations: [7, 3], target: 13 }, output: 3, note: '7 + 3 + 3' },
        { inputs: { denominations: [1], target: 5 }, output: 5, note: 'Only ones' },
        { inputs: { denominations: [9, 6, 5, 1], target: 11 }, output: 2, note: 'Taking the biggest first would need 3' },
      ],
      starter: {
        javascript: `function fewestTokens(denominations, target) {
  const best = []; // best[t]: fewest tokens that make total t
  // Fill best for every total from 0 up to target.
  return -1;
}
`,
      },
      hints: [
        'Taking the biggest token first can be wrong: try 11 with 9, 6, 5, 1.',
        'Let best[t] be the fewest tokens for total t; best[0] = 0.',
        'For each total t and each face value d ≤ t, best[t] can be best[t − d] + 1. Totals that stay Infinity can’t be made.',
      ],
      solution: {
        explanation: [
          'best[t] is the fewest tokens that make exactly t, Infinity while no way is known; best[0] = 0.',
          'The last token used for t is some face value d, leaving t − d, which was solved earlier. So best[t] is the smallest best[t − d] + 1 over all d ≤ t. Infinity at target means it can’t be made.',
        ],
        code: `function fewestTokens(denominations, target) {
  const best = new Array(target + 1).fill(Infinity);
  best[0] = 0;
  for (let total = 1; total <= target; total++) {
    for (const d of denominations) {
      if (d <= total && best[total - d] + 1 < best[total]) best[total] = best[total - d] + 1;
    }
  }
  return best[target] === Infinity ? -1 : best[target];
}
`,
        complexity: { time: 'O(target × k)', space: 'O(target)', assumptions: 'k is denominations.length.' },
      },
      visualization: {
        spec: 'best is drawn as cells (∞ where no way is known yet) with total over the slot being filled; each improvement reads best[total − d] and writes best[total].',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-59': {
    prerequisites: ['dp-basics', 'strings-and-chars'],
    related: ['f75-60', 'f75-58'],
    content: {
      statement: [
        'Two versions of a message are the strings a and b. A shared subsequence is a sequence of characters that appears in both, in the same order, though not necessarily next to each other.',
        'Return the length of the longest shared subsequence.',
      ],
      inputFormat: 'a, b: strings.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ a.length, b.length ≤ 1,000', 'Lowercase letters only.'],
      rules: ['An empty string shares nothing: 0.', 'Characters must keep their order in both strings.', 'Aim for O(n × m).'],
      entry: 'lcsLength',
      params: [
        { name: 'a', kind: 'auto' },
        { name: 'b', kind: 'auto' },
      ],
      examples: [
        { inputs: { a: 'kitten', b: 'sitting' }, output: 4, note: '"ittn" appears in both in order.' },
        { inputs: { a: 'abc', b: 'xyz' }, output: 0, note: 'No shared letters.' },
      ],
      tests: [
        { inputs: { a: '', b: 'abc' }, output: 0, note: 'An empty string' },
        { inputs: { a: 'same', b: 'same' }, output: 4, note: 'Identical strings' },
        { inputs: { a: 'aaaa', b: 'aa' }, output: 2, note: 'Repeated letters' },
        { inputs: { a: 'train', b: 'rain' }, output: 4, note: 'One string inside the other' },
        { inputs: { a: 'abcd', b: 'dcba' }, output: 1, note: 'Reversed order' },
      ],
      starter: {
        javascript: `function lcsLength(a, b) {
  const table = []; // table[i][j]: answer for a's first i letters and b's first j letters
  // Fill the table row by row, comparing a[i - 1] with b[j - 1].
  return 0;
}
`,
      },
      hints: [
        'Solve it for every pair of prefixes: the first i letters of a and the first j letters of b.',
        'If a[i − 1] === b[j − 1], that letter can end the shared subsequence: table[i − 1][j − 1] + 1.',
        'Otherwise drop the last letter of one string: max(table[i − 1][j], table[i][j − 1]).',
      ],
      solution: {
        explanation: [
          'table[i][j] is the answer for the first i letters of a and the first j of b; row 0 and column 0 are 0 (an empty prefix).',
          'Matching last letters extend the best answer without them by one. Otherwise one of the two last letters is not used, so the cell takes the better of the cell above and the cell to the left. The bottom-right cell is the answer.',
        ],
        code: `function lcsLength(a, b) {
  const table = [];
  for (let i = 0; i <= a.length; i++) table.push(new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) table[i][j] = table[i - 1][j - 1] + 1;
      else table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}
`,
        complexity: { time: 'O(n × m)', space: 'O(n × m)', assumptions: 'n and m are the two lengths.' },
      },
      visualization: {
        spec: 'table is drawn as a grid with i and j marking the cell being filled; each step reads the neighbouring cells it depends on and writes one cell, and a and b are drawn as characters with the two letters being compared.',
        renderers: ['grid', 'string-cells'],
      },
    },
  },

  'f75-60': {
    prerequisites: ['dp-basics', 'strings-and-chars'],
    related: ['f75-59', 'f75-58'],
    content: {
      statement: [
        'A spell checker turns the word source into the word target one edit at a time. An edit inserts one character, deletes one character, or replaces one character with another.',
        'Return the fewest edits needed.',
      ],
      inputFormat: 'source, target: strings.',
      outputFormat: 'An integer: the edit distance.',
      constraints: ['0 ≤ source.length, target.length ≤ 500', 'Lowercase letters only.'],
      rules: ['Equal strings: 0.', 'From or to an empty string: one edit per character.', 'Every edit costs 1.', 'Aim for O(n × m).'],
      entry: 'editDistance',
      params: [
        { name: 'source', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { source: 'paint', target: 'print' }, output: 1, note: 'Replace a with r.' },
        { inputs: { source: 'abc', target: '' }, output: 3, note: 'Delete all three.' },
      ],
      tests: [
        { inputs: { source: '', target: '' }, output: 0, note: 'Both empty' },
        { inputs: { source: '', target: 'xy' }, output: 2, note: 'Insert everything' },
        { inputs: { source: 'same', target: 'same' }, output: 0, note: 'Already equal' },
        { inputs: { source: 'flaw', target: 'lawn' }, output: 2, note: 'Delete f, insert n' },
        { inputs: { source: 'kayak', target: 'yak' }, output: 2, note: 'Delete two letters' },
        { inputs: { source: 'cart', target: 'march' }, output: 3, note: 'Mixed edits' },
      ],
      starter: {
        javascript: `function editDistance(source, target) {
  const table = []; // table[i][j]: edits to turn source's first i letters into target's first j
  // Row 0 and column 0 are insertions and deletions; fill the rest from three neighbours.
  return 0;
}
`,
      },
      hints: [
        'Solve it for every pair of prefixes; table[i][j] turns source’s first i letters into target’s first j.',
        'table[i][0] = i (delete everything) and table[0][j] = j (insert everything).',
        'If the last letters match, table[i][j] = table[i − 1][j − 1]. Otherwise 1 + the smallest of replace (diagonal), delete (above) and insert (left).',
      ],
      solution: {
        explanation: [
          'table[i][j] is the fewest edits from the first i letters of source to the first j letters of target. The first column deletes everything and the first row inserts everything.',
          'Matching last letters cost nothing more than the diagonal cell. Otherwise the last edit was a replace (diagonal), a delete (above) or an insert (left), so the cell is 1 plus the smallest of the three. The bottom-right cell is the answer.',
        ],
        code: `function editDistance(source, target) {
  const table = [];
  for (let i = 0; i <= source.length; i++) {
    const row = new Array(target.length + 1).fill(0);
    row[0] = i;
    table.push(row);
  }
  for (let j = 0; j <= target.length; j++) table[0][j] = j;
  for (let i = 1; i <= source.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      if (source[i - 1] === target[j - 1]) table[i][j] = table[i - 1][j - 1];
      else table[i][j] = 1 + Math.min(table[i - 1][j - 1], table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[source.length][target.length];
}
`,
        complexity: { time: 'O(n × m)', space: 'O(n × m)', assumptions: 'n and m are the two lengths.' },
      },
      visualization: {
        spec: 'table is drawn as a grid with i and j marking the cell being filled; each step reads its three neighbours and writes one cell. source and target are drawn as characters with the two letters being compared. The edits themselves are not reconstructed.',
        renderers: ['grid', 'string-cells'],
      },
    },
  },

  'f75-61': {
    prerequisites: ['sorting', 'greedy'],
    related: ['f75-62', 'f75-63'],
    content: {
      statement: [
        'A meeting room’s reservations are given as intervals [start, end] in any order. Both ends are included, so [1, 3] and [3, 5] share time 3 and overlap.',
        'Combine every group of overlapping reservations into one interval and return the combined intervals sorted by start.',
      ],
      inputFormat: 'intervals: an array of [start, end] pairs with start ≤ end.',
      outputFormat: 'An array of non-overlapping [start, end] pairs, sorted by start.',
      constraints: ['0 ≤ intervals.length ≤ 10,000', '0 ≤ start ≤ end ≤ 10^6'],
      rules: [
        'No reservations: [].',
        'Touching intervals ([1, 3] and [3, 5]) overlap and combine; [1, 2] and [3, 4] do not.',
        'An interval inside another disappears into it.',
        'Do not change intervals (sort a copy).',
      ],
      entry: 'mergeBookings',
      params: [{ name: 'intervals', kind: 'auto' }],
      examples: [
        {
          inputs: {
            intervals: [
              [4, 6],
              [1, 3],
              [2, 5],
              [8, 9],
            ],
          },
          output: [
            [1, 6],
            [8, 9],
          ],
          note: '[1, 3], [2, 5] and [4, 6] chain together.',
        },
        {
          inputs: {
            intervals: [
              [1, 2],
              [2, 3],
            ],
          },
          output: [[1, 3]],
          note: 'They share time 2.',
        },
      ],
      tests: [
        { inputs: { intervals: [] }, output: [], note: 'No reservations' },
        { inputs: { intervals: [[5, 5]] }, output: [[5, 5]], note: 'One instant' },
        {
          inputs: {
            intervals: [
              [1, 10],
              [2, 3],
              [4, 5],
            ],
          },
          output: [[1, 10]],
          note: 'Intervals inside a big one',
        },
        {
          inputs: {
            intervals: [
              [1, 2],
              [3, 4],
            ],
          },
          output: [
            [1, 2],
            [3, 4],
          ],
          note: 'A gap between them',
        },
        {
          inputs: {
            intervals: [
              [6, 8],
              [1, 9],
            ],
          },
          output: [[1, 9]],
          note: 'Out of order',
        },
      ],
      starter: {
        javascript: `function mergeBookings(intervals) {
  const sorted = [...intervals]; // sort this copy by start
  const merged = [];
  // Walk in order of start; extend the last combined interval or start a new one.
  return merged;
}
`,
      },
      hints: [
        'Sorting by start puts every interval that could overlap the current group right after it.',
        'Keep the combined intervals in merged; only the last one can overlap the next interval.',
        'If the next start is at most the last end, extend the last end; otherwise start a new combined interval.',
      ],
      solution: {
        explanation: [
          'sorted is a copy ordered by start. Walking it, every new interval either overlaps the last combined interval (its start is at most that interval’s end) or begins after it.',
          'Overlaps extend the last end to the larger of the two ends; anything else starts a new combined interval. Because starts only grow, earlier combined intervals can never be touched again.',
        ],
        code: `function mergeBookings(intervals) {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is intervals.length; sorting dominates.' },
      },
      visualization: {
        spec: 'sorted and merged are drawn as tables of [start, end] rows; the interval being read lights up, and extending a combined interval lights up the end it wrote.',
        renderers: ['grid'],
      },
    },
  },

  'f75-62': {
    prerequisites: ['sorting', 'greedy'],
    related: ['f75-61', 'f75-64'],
    content: {
      statement: [
        'One room, many meeting requests. Each request is [start, end]: the meeting runs from start up to end, so a meeting may start at the exact time another ends.',
        'Return the largest number of requests that can be held in the room without any two overlapping.',
      ],
      inputFormat: 'meetings: an array of [start, end] pairs with start < end.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ meetings.length ≤ 100,000', '0 ≤ start < end ≤ 10^9'],
      rules: [
        'Back-to-back is fine: [1, 2] then [2, 3].',
        'Identical requests overlap; only one can be held.',
        'Aim for O(n log n) with a greedy choice.',
        'Do not change meetings (sort a copy).',
      ],
      entry: 'maxMeetings',
      params: [{ name: 'meetings', kind: 'auto' }],
      examples: [
        {
          inputs: {
            meetings: [
              [1, 3],
              [2, 5],
              [3, 6],
              [6, 8],
            ],
          },
          output: 3,
          note: '[1, 3], [3, 6] and [6, 8].',
        },
        {
          inputs: {
            meetings: [
              [0, 10],
              [1, 2],
              [2, 3],
            ],
          },
          output: 2,
          note: 'Two short meetings beat one long one.',
        },
      ],
      tests: [
        { inputs: { meetings: [] }, output: 0, note: 'No requests' },
        { inputs: { meetings: [[5, 6]] }, output: 1, note: 'One request' },
        {
          inputs: {
            meetings: [
              [1, 2],
              [1, 2],
              [1, 2],
            ],
          },
          output: 1,
          note: 'Identical requests',
        },
        {
          inputs: {
            meetings: [
              [1, 5],
              [2, 3],
              [3, 4],
              [4, 5],
            ],
          },
          output: 3,
          note: 'Short meetings inside a long one',
        },
        {
          inputs: {
            meetings: [
              [7, 9],
              [0, 1],
              [1, 7],
            ],
          },
          output: 3,
          note: 'Out of order, all back to back',
        },
      ],
      starter: {
        javascript: `function maxMeetings(meetings) {
  const byEnd = [...meetings]; // sort this copy by end time
  let count = 0;
  // Always take the meeting that ends first among those that still fit.
  return count;
}
`,
      },
      hints: [
        'Which meeting should go first? The one that frees the room the soonest.',
        'Sort a copy by end time.',
        'Take each meeting whose start is at or after the end of the last meeting taken.',
      ],
      solution: {
        explanation: [
          'byEnd is a copy sorted by end time. freeAt is when the room becomes free; a meeting starting at or after it fits and is taken.',
          'Taking the meeting that ends earliest never hurts: any best schedule can swap its first meeting for this one and still fit everything after it. Repeating the argument gives the greedy answer.',
        ],
        code: `function maxMeetings(meetings) {
  const byEnd = [...meetings].sort((x, y) => x[1] - y[1]);
  let count = 0;
  let freeAt = -Infinity;
  for (const [start, end] of byEnd) {
    if (start >= freeAt) {
      count++;
      freeAt = end;
    }
  }
  return count;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is meetings.length; sorting dominates.' },
      },
      visualization: {
        spec: 'byEnd is drawn as a table with the meeting being considered read; freeAt and count are blocks that change only when a meeting is accepted.',
        renderers: ['grid'],
      },
    },
  },

  'f75-63': {
    prerequisites: ['greedy', 'arrays-basics'],
    related: ['f75-64', 'f75-30'],
    content: {
      statement: [
        'Stepping stones are numbered 0 to n − 1. From stone i you can jump forward to any stone up to jumps[i] stones ahead (a 0 means you can’t move from there). You start on stone 0.',
        'Return true if you can reach the last stone, otherwise false.',
      ],
      inputFormat: 'jumps: an array of non-negative integers.',
      outputFormat: 'A boolean.',
      constraints: ['1 ≤ jumps.length ≤ 100,000', '0 ≤ jumps[i] ≤ 100,000'],
      rules: [
        'One stone: you are already on the last one, true.',
        'Jumps only go forward, by any amount from 1 up to jumps[i].',
        'Aim for O(n).',
      ],
      entry: 'canReachEnd',
      params: [{ name: 'jumps', kind: 'auto' }],
      examples: [
        { inputs: { jumps: [1, 2, 0, 1] }, output: true, note: '0 → 1 → 3.' },
        { inputs: { jumps: [2, 0, 0, 1] }, output: false, note: 'Stuck on stone 1 or 2.' },
      ],
      tests: [
        { inputs: { jumps: [0] }, output: true, note: 'Already there' },
        { inputs: { jumps: [1, 0] }, output: true, note: 'One jump' },
        { inputs: { jumps: [0, 1] }, output: false, note: 'Stuck at the start' },
        { inputs: { jumps: [3, 0, 0, 0, 1] }, output: false, note: 'Just short' },
        { inputs: { jumps: [4, 0, 0, 0, 0] }, output: true, note: 'One long jump' },
      ],
      starter: {
        javascript: `function canReachEnd(jumps) {
  let farthest = 0; // the farthest stone reachable so far
  // Walk the stones you can reach, extending farthest.
  return false;
}
`,
      },
      hints: [
        'You don’t need the route, only how far you can get.',
        'Keep farthest, the farthest stone reachable so far. From stone i you can reach i + jumps[i].',
        'If you get to a stone beyond farthest, there is a gap you can’t cross.',
      ],
      solution: {
        explanation: [
          'farthest is the farthest stone reachable using the stones before i. Every stone up to farthest is reachable, because shorter jumps are allowed.',
          'Walking forward, a stone beyond farthest can’t be reached, and neither can anything after it. Otherwise it extends farthest to i + jumps[i]. Getting through all stones means the last one is reachable.',
        ],
        code: `function canReachEnd(jumps) {
  let farthest = 0;
  for (let i = 0; i < jumps.length; i++) {
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + jumps[i]);
  }
  return true;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is jumps.length.' },
      },
      visualization: {
        spec: 'jumps is drawn as cells (shelves in the illustrated view) with i over the stone being checked; farthest is a block that grows as stones extend the reachable range.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'f75-64': {
    prerequisites: ['greedy', 'queues'],
    related: ['f75-63', 'f75-48'],
    content: {
      statement: [
        'Launch pads are numbered 0 to n − 1. From pad i a rocket can fly forward to any pad up to jumps[i] pads ahead. You start on pad 0.',
        'Return the fewest launches needed to reach the last pad, or -1 if it can’t be reached.',
      ],
      inputFormat: 'jumps: an array of non-negative integers.',
      outputFormat: 'An integer: the fewest launches, or -1.',
      constraints: ['1 ≤ jumps.length ≤ 100,000', '0 ≤ jumps[i] ≤ 100,000'],
      rules: [
        'One pad: 0 launches.',
        'Unreachable last pad: -1.',
        'Aim for O(n): think of the pads reachable with 1, 2, 3 … launches as layers.',
      ],
      entry: 'minJumps',
      params: [{ name: 'jumps', kind: 'auto' }],
      examples: [
        { inputs: { jumps: [1, 3, 0, 0, 2, 1] }, output: 3, note: '0 → 1 → 4 → 5.' },
        { inputs: { jumps: [1, 0, 2] }, output: -1, note: 'Pad 1 can’t launch.' },
      ],
      tests: [
        { inputs: { jumps: [0] }, output: 0, note: 'Already there' },
        { inputs: { jumps: [5, 0, 0] }, output: 1, note: 'One launch covers it' },
        { inputs: { jumps: [1, 1, 1, 1] }, output: 3, note: 'One pad at a time' },
        { inputs: { jumps: [2, 0, 1, 0] }, output: 2, note: 'Skip the dead pad' },
        { inputs: { jumps: [0, 1] }, output: -1, note: 'Stuck at the start' },
      ],
      starter: {
        javascript: `function minJumps(jumps) {
  let launches = 0;
  let layerEnd = 0; // last pad reachable with the launches so far
  let farthest = 0; // farthest pad reachable with one more launch
  // When i reaches layerEnd, a new launch is needed and the next layer ends at farthest.
  return -1;
}
`,
      },
      hints: [
        'Pads reachable with k launches form a contiguous range; the next range ends at the farthest pad any of them can reach.',
        'Walk the pads, tracking farthest. When you reach the end of the current range (layerEnd), count a launch and move layerEnd to farthest.',
        'If farthest doesn’t get past the current pad when a launch is needed, you are stuck: -1.',
      ],
      solution: {
        explanation: [
          'The pads reachable with launches launches end at layerEnd; farthest is how far one more launch from any of them reaches. This is a breadth-first search in which each layer is a range of pads.',
          'At the end of a layer a launch is counted and the next layer ends at farthest. If farthest has not moved past the current pad, no launch can make progress and the last pad is unreachable. The walk stops before the last pad, since no launch is needed from there.',
        ],
        code: `function minJumps(jumps) {
  let launches = 0;
  let layerEnd = 0;
  let farthest = 0;
  for (let i = 0; i < jumps.length - 1; i++) {
    farthest = Math.max(farthest, i + jumps[i]);
    if (i === layerEnd) {
      if (farthest <= i) return -1;
      launches++;
      layerEnd = farthest;
    }
  }
  return launches;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is jumps.length.' },
      },
      visualization: {
        spec: 'jumps is drawn as cells with i over the pad being read; layerEnd, farthest and launches are blocks, and launches changes only at the end of each layer.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-65': {
    prerequisites: ['greedy', 'prefix-sums'],
    related: ['f75-63', 'f75-11'],
    content: {
      statement: [
        'A delivery van drives a loop of stations 0, 1, …, n − 1 and back to 0. At station i it can take fuel[i] units, and driving on to the next station uses cost[i] units. The tank starts empty and has no limit.',
        'Return the station to start from to finish the whole loop, or -1 if no start works. If several work, return the smallest station number.',
      ],
      inputFormat: 'fuel, cost: arrays of the same length of non-negative integers.',
      outputFormat: 'An integer station number, or -1.',
      constraints: ['1 ≤ n ≤ 100,000', '0 ≤ fuel[i], cost[i] ≤ 10^4'],
      rules: [
        'The tank may reach exactly 0 between stations; it may never go below 0.',
        'Several working starts: the smallest number.',
        'Aim for O(n): one pass.',
      ],
      entry: 'startingStation',
      params: [
        { name: 'fuel', kind: 'auto' },
        { name: 'cost', kind: 'auto' },
      ],
      examples: [
        { inputs: { fuel: [2, 5, 1], cost: [3, 1, 2] }, output: 1, note: 'From station 1 the tank never runs dry.' },
        { inputs: { fuel: [1, 1], cost: [2, 2] }, output: -1, note: 'The loop needs more fuel than there is.' },
      ],
      tests: [
        { inputs: { fuel: [5], cost: [5] }, output: 0, note: 'One station, just enough' },
        { inputs: { fuel: [5], cost: [6] }, output: -1, note: 'One station, not enough' },
        { inputs: { fuel: [3, 3, 3], cost: [3, 3, 3] }, output: 0, note: 'Every start works: the smallest' },
        { inputs: { fuel: [1, 2, 3, 4], cost: [2, 2, 2, 2] }, output: 1, note: 'Start after the first shortfall' },
        { inputs: { fuel: [0, 0, 9], cost: [1, 1, 1] }, output: 2, note: 'Only the last station' },
        { inputs: { fuel: [4, 0, 0], cost: [1, 2, 2] }, output: -1, note: 'Total fuel too low' },
      ],
      starter: {
        javascript: `function startingStation(fuel, cost) {
  let total = 0; // fuel minus cost over the whole loop
  let tank = 0; // fuel in the tank since the current candidate start
  let start = 0;
  // When the tank drops below 0, no station so far can be the start: try the next one.
  return -1;
}
`,
      },
      hints: [
        'If the loop’s total fuel is less than its total cost, no start works.',
        'Drive from a candidate start. If the tank goes below 0 at station i, no station between the start and i can work either.',
        'So restart the candidate at i + 1 with an empty tank. With enough total fuel, the last candidate works.',
      ],
      solution: {
        explanation: [
          'gain = fuel[i] − cost[i] is what station i adds to the tank. total sums every gain; if it is negative the loop can’t be finished from anywhere.',
          'tank sums the gains since the current candidate start. When it goes negative at i, every start from the candidate to i would arrive at i with even less, so the next candidate is i + 1. If total is not negative, the last candidate completes the loop, and every earlier station failed, so it is the smallest that works.',
        ],
        code: `function startingStation(fuel, cost) {
  let total = 0;
  let tank = 0;
  let start = 0;
  for (let i = 0; i < fuel.length; i++) {
    const gain = fuel[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {
      start = i + 1;
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is the number of stations.' },
      },
      visualization: {
        spec: 'fuel and cost are drawn as cells with i over the station being passed; tank, total and start are blocks, and start jumps forward whenever the tank would go below 0.',
        renderers: ['array-cells'],
      },
    },
  },

  'f75-67': {
    prerequisites: ['tries', 'strings-and-chars'],
    related: ['f75-66', 'f75-68'],
    content: {
      statement: [
        'A phone’s contact list is the array contacts. As you type the name typed one letter at a time, the phone suggests up to three contacts that start with what you have typed so far, the first three in dictionary order.',
        'Return the suggestions after each letter: one list per letter of typed.',
      ],
      inputFormat: 'contacts: an array of lowercase names. typed: a lowercase string.',
      outputFormat: 'An array with one list per letter of typed; each list has at most three names in dictionary order.',
      constraints: ['0 ≤ contacts.length ≤ 1,000', '1 ≤ typed.length ≤ 20', 'Names have 1 to 20 lowercase letters.'],
      rules: [
        'A name equal to what was typed counts (it starts with itself).',
        'A name listed twice is suggested once.',
        'Fewer than three matches: list them all; none: [].',
        'Dictionary order is plain string order ("bell" before "bella").',
        'Use a trie so each prefix is found by walking letters, not by checking every contact.',
      ],
      entry: 'suggestions',
      params: [
        { name: 'contacts', kind: 'auto' },
        { name: 'typed', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { contacts: ['bob', 'bella', 'ben', 'bert', 'al'], typed: 'be' },
          output: [
            ['bella', 'ben', 'bert'],
            ['bella', 'ben', 'bert'],
          ],
          note: '"b" matches four names; bob is fourth in order.',
        },
        { inputs: { contacts: ['zed'], typed: 'za' }, output: [['zed'], []], note: 'Nothing starts with "za".' },
      ],
      tests: [
        { inputs: { contacts: [], typed: 'a' }, output: [[]], note: 'No contacts' },
        {
          inputs: { contacts: ['ann', 'ann'], typed: 'an' },
          output: [['ann'], ['ann']],
          note: 'A name listed twice',
        },
        {
          inputs: { contacts: ['cat', 'car', 'cart', 'care'], typed: 'car' },
          output: [
            ['car', 'care', 'cart'],
            ['car', 'care', 'cart'],
            ['car', 'care', 'cart'],
          ],
          note: 'A name that is the typed text itself',
        },
        {
          inputs: { contacts: ['dog', 'do', 'dot'], typed: 'dox' },
          output: [['do', 'dog', 'dot'], ['do', 'dog', 'dot'], []],
          note: 'A short name comes first',
        },
      ],
      starter: {
        javascript: `function suggestions(contacts, typed) {
  const root = { children: {}, end: false };
  const result = [];
  // Insert every contact, then follow typed one letter at a time and collect up to three names below that node.
  return result;
}
`,
      },
      hints: [
        'Put every contact in a trie. Walking the typed letters from the root reaches the node for the current prefix.',
        'Every contact with that prefix is below that node.',
        'Visit the node’s children in alphabetical order (depth first, the node itself before its children) and stop after three names: that gives the dictionary-order first three.',
      ],
      solution: {
        explanation: [
          'Each contact is inserted letter by letter; the node where it ends is marked end. After each typed letter, node moves to that letter’s child, or to null once a letter is missing.',
          'collect walks below node depth first, checking a node before its children and taking children in alphabetical order, which visits words in dictionary order. It stops once three are found.',
        ],
        code: `function suggestions(contacts, typed) {
  const root = { children: {}, end: false };
  for (const name of contacts) {
    let node = root;
    for (const ch of name) {
      if (!node.children[ch]) node.children[ch] = { children: {}, end: false };
      node = node.children[ch];
    }
    node.end = true;
  }
  const result = [];
  let node = root;
  let prefix = '';
  for (const ch of typed) {
    prefix += ch;
    node = node === null ? null : (node.children[ch] ?? null);
    const found = [];
    const collect = (at, word) => {
      if (found.length === 3) return;
      if (at.end) found.push(word);
      for (const letter of Object.keys(at.children).sort()) collect(at.children[letter], word + letter);
    };
    if (node !== null) collect(node, prefix);
    result.push(found);
  }
  return result;
}
`,
        complexity: {
          time: 'O(C + t × S)',
          space: 'O(C)',
          assumptions:
            'C is the total length of the contacts, t = typed.length, and S the size of the part of the trie searched for three names.',
        },
      },
      visualization: {
        spec: 'The contacts are drawn as a trie of letters with word ends marked "end"; node is a label on the node for the prefix typed so far, with the path from the root highlighted, and the recursive collect calls are on the call stack. found and result grow as cells.',
        renderers: ['trie', 'call-stack', 'array-cells'],
      },
    },
  },

  'f75-68': {
    prerequisites: ['tries', 'recursion-basics'],
    related: ['f75-66', 'f75-67'],
    content: {
      statement: [
        'Build a word list that answers pattern questions. You receive operations in order: ["add", word] adds a word, and ["find", pattern] asks whether some added word matches pattern, where a dot (.) matches any one letter and every other character must match exactly.',
        'Return an array with one entry per operation: null for "add" and true or false for "find".',
      ],
      inputFormat: 'ops: an array of ["add", word] and ["find", pattern].',
      outputFormat: 'An array of the same length as ops.',
      constraints: ['0 ≤ ops.length ≤ 10,000', 'Words and patterns have 1 to 15 characters: lowercase letters, and dots in patterns.'],
      rules: [
        'A dot matches exactly one letter, never zero or two.',
        'The whole word must match: "c.t" does not match "cats".',
        'Adding the same word twice changes nothing.',
        'Use a trie; at a dot, try every child.',
      ],
      entry: 'wildcardDictionary',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: {
            ops: [
              ['add', 'cat'],
              ['add', 'cot'],
              ['find', 'c.t'],
              ['find', '...'],
              ['find', 'c.'],
            ],
          },
          output: [null, null, true, true, false],
          note: '"c." is too short for any word.',
        },
        {
          inputs: {
            ops: [
              ['find', '.'],
              ['add', 'a'],
              ['find', '.'],
            ],
          },
          output: [false, null, true],
          note: 'Finds only see earlier adds.',
        },
      ],
      tests: [
        { inputs: { ops: [] }, output: [], note: 'No operations' },
        {
          inputs: {
            ops: [
              ['add', 'abc'],
              ['find', 'abc'],
              ['find', 'ab.'],
              ['find', 'a.c'],
              ['find', '.bc'],
            ],
          },
          output: [null, true, true, true, true],
          note: 'A dot in every position',
        },
        {
          inputs: {
            ops: [
              ['add', 'abc'],
              ['find', 'abd'],
              ['find', 'abcd'],
            ],
          },
          output: [null, false, false],
          note: 'A wrong letter and a longer pattern',
        },
        {
          inputs: {
            ops: [
              ['add', 'x'],
              ['add', 'xy'],
              ['find', 'x.'],
              ['find', '..'],
              ['find', '.'],
            ],
          },
          output: [null, null, true, true, true],
          note: 'Words of different lengths',
        },
        {
          inputs: {
            ops: [
              ['add', 'zz'],
              ['find', 'z'],
            ],
          },
          output: [null, false],
          note: 'A prefix is not a word',
        },
      ],
      starter: {
        javascript: `function wildcardDictionary(ops) {
  const root = { children: {}, end: false };
  const out = [];
  // "add" inserts into the trie; "find" walks it, trying every child where the pattern has a dot.
  return out;
}
`,
      },
      hints: [
        'Without dots, a find is the same walk as checking a word in a trie.',
        'At a dot you don’t know which letter to follow, so try every child.',
        'Write matches(node, pattern, i) recursively: at the end of the pattern the node must be a word end.',
      ],
      solution: {
        explanation: [
          'Words go into a trie as usual. matches(node, pattern, i) asks whether pattern[i..] spells a word below node: at the end of the pattern, node must be a word end.',
          'A letter follows its one child (or fails if it’s missing). A dot tries every child and succeeds if any of them leads to a match.',
        ],
        code: `function wildcardDictionary(ops) {
  const root = { children: {}, end: false };
  const matches = (node, pattern, i) => {
    if (i === pattern.length) return node.end;
    const ch = pattern[i];
    if (ch !== '.') {
      const next = node.children[ch];
      return next !== undefined && matches(next, pattern, i + 1);
    }
    for (const letter of Object.keys(node.children)) {
      if (matches(node.children[letter], pattern, i + 1)) return true;
    }
    return false;
  };
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
      out.push(matches(root, text, 0));
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(L) per add; O(26^d × L) per find in the worst case',
          space: 'O(total letters added)',
          assumptions: 'L is the word or pattern length and d the number of dots; without dots a find is O(L).',
        },
      },
      visualization: {
        spec: 'The words are drawn as a trie of letters with word ends marked; node is a label on the node each matches call is at, the branches being tried light up, and missing letters are reported. The call stack shows the search branching at dots and backing up.',
        renderers: ['trie', 'call-stack'],
      },
    },
  },

  'f75-69': {
    prerequisites: ['tries', 'strings-and-chars'],
    related: ['f75-66', 'f75-67'],
    content: {
      statement: [
        'An editor shortens words to their roots. roots is a list of root words. In sentence (words separated by single spaces), replace every word that starts with a root by the shortest root it starts with; leave other words alone.',
        'Return the new sentence.',
      ],
      inputFormat: 'roots: an array of lowercase words. sentence: lowercase words separated by single spaces.',
      outputFormat: 'A string: the sentence with words replaced.',
      constraints: ['0 ≤ roots.length ≤ 1,000', '0 ≤ sentence.length ≤ 10,000', 'Words and roots have 1 to 100 lowercase letters.'],
      rules: [
        'Several roots fit a word: use the shortest.',
        'A root longer than the word doesn’t fit it.',
        'A word equal to a root stays the same.',
        'Use a trie of roots and stop at the first root end while walking each word.',
      ],
      entry: 'replaceWithRoots',
      params: [
        { name: 'roots', kind: 'auto' },
        { name: 'sentence', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { roots: ['un', 'under', 're'], sentence: 'undo the redo understood' },
          output: 'un the re un',
          note: '"un" is shorter than "under".',
        },
        { inputs: { roots: ['sun'], sentence: 'sunny sundays are fun' }, output: 'sun sun are fun', note: 'Two words start with sun.' },
      ],
      tests: [
        { inputs: { roots: [], sentence: 'keep it' }, output: 'keep it', note: 'No roots' },
        { inputs: { roots: ['a'], sentence: 'a ab b' }, output: 'a a b', note: 'A one-letter root' },
        { inputs: { roots: ['long', 'lo'], sentence: 'longer' }, output: 'lo', note: 'The shorter root wins' },
        { inputs: { roots: ['tree'], sentence: 'tre' }, output: 'tre', note: 'A root longer than the word' },
        { inputs: { roots: ['x'], sentence: '' }, output: '', note: 'An empty sentence' },
      ],
      starter: {
        javascript: `function replaceWithRoots(roots, sentence) {
  const trie = { children: {}, end: false };
  // Insert the roots, then walk each word through the trie and stop at the first root end.
  return sentence;
}
`,
      },
      hints: [
        'Put the roots in a trie; a node marked end finishes a root.',
        'For each word, walk its letters from the trie’s root. The first end you pass is the shortest root that fits.',
        'If a letter is missing before any end, no root fits that word.',
      ],
      solution: {
        explanation: [
          'The roots go into a trie. Each word is walked letter by letter: the first node marked end is the shortest root that is a prefix of the word, so the word becomes that prefix.',
          'A missing letter means no root continues along this word, and the word stays as it is.',
        ],
        code: `function replaceWithRoots(roots, sentence) {
  const trie = { children: {}, end: false };
  for (const root of roots) {
    let node = trie;
    for (const ch of root) {
      if (!node.children[ch]) node.children[ch] = { children: {}, end: false };
      node = node.children[ch];
    }
    node.end = true;
  }
  const words = sentence.split(' ');
  for (let w = 0; w < words.length; w++) {
    let node = trie;
    let prefix = '';
    for (const ch of words[w]) {
      node = node.children[ch];
      if (node === undefined) break;
      prefix += ch;
      if (node.end) {
        words[w] = prefix;
        break;
      }
    }
  }
  return words.join(' ');
}
`,
        complexity: {
          time: 'O(R + S)',
          space: 'O(R)',
          assumptions: 'R is the total length of the roots and S the length of the sentence.',
        },
      },
      visualization: {
        spec: 'The roots are drawn as a trie with root ends marked; node is a label on the node reached while walking the current word, and a missing letter is reported. words is drawn as cells and each replaced word lights up.',
        renderers: ['trie', 'array-cells'],
      },
    },
  },

  'f75-70': {
    prerequisites: ['tries', 'backtracking'],
    related: ['f75-39', 'f75-67'],
    content: {
      statement: [
        'A letter board is the grid board. A word can be traced by starting on any cell and moving up, down, left or right, never using a cell twice in the same word.',
        'Return every word in words that can be traced on the board, each once, in dictionary order.',
      ],
      inputFormat: 'board: an array of rows of one-letter strings. words: an array of lowercase words.',
      outputFormat: 'An array of the traceable words, sorted, without repeats.',
      constraints: ['1 ≤ rows, columns ≤ 6', '0 ≤ words.length ≤ 1,000', 'Words have 1 to 10 lowercase letters.'],
      rules: [
        'Only orthogonal moves; a cell is used once per word.',
        'A word listed twice is reported once.',
        'Search all words at once with a trie: one walk over the board serves every word with the same beginning.',
        'Leave board as you found it.',
      ],
      entry: 'findWords',
      params: [
        { name: 'board', kind: 'auto' },
        { name: 'words', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            board: [
              ['c', 'a', 't'],
              ['o', 'r', 'd'],
            ],
            words: ['cat', 'car', 'cord', 'tad'],
          },
          output: ['car', 'cat', 'cord'],
          note: 'tad needs t next to a next to d, but a and d don’t touch.',
        },
        { inputs: { board: [['a']], words: ['a', 'aa'] }, output: ['a'], note: 'The single cell can’t be used twice.' },
      ],
      tests: [
        {
          inputs: {
            board: [
              ['a', 'b'],
              ['c', 'd'],
            ],
            words: [],
          },
          output: [],
          note: 'No words',
        },
        {
          inputs: {
            board: [
              ['a', 'b'],
              ['c', 'd'],
            ],
            words: ['abdc', 'acdb', 'ad'],
          },
          output: ['abdc', 'acdb'],
          note: 'Around the square both ways; no diagonals',
        },
        { inputs: { board: [['e', 'e']], words: ['ee', 'eee'] }, output: ['ee'], note: 'Only two cells' },
        {
          inputs: {
            board: [
              ['o', 'n'],
              ['n', 'o'],
            ],
            words: ['no', 'on', 'noon'],
          },
          output: ['no', 'on'],
          note: 'The two o’s don’t touch',
        },
        { inputs: { board: [['h', 'i']], words: ['hi', 'hi'] }, output: ['hi'], note: 'A word listed twice' },
      ],
      starter: {
        javascript: `function findWords(board, words) {
  const root = { children: {}, word: '' }; // a node's word is set where a listed word ends
  const found = [];
  // Insert the words, then from every cell walk the board and the trie together.
  return found;
}
`,
      },
      hints: [
        'Checking each word separately repeats the same walks for words with the same beginning.',
        'Put the words in a trie and explore the board from each cell, moving down the trie with each letter; stop as soon as the trie has no child for the cell’s letter.',
        'Store each word at the node where it ends. When you reach it, record the word and clear it so it isn’t recorded twice. Mark cells in use and restore them on the way back.',
      ],
      solution: {
        explanation: [
          'The words go into a trie whose end nodes store the word. explore(r, c, node) steps onto a cell only if node has a child for its letter, so the board walk stops as soon as no listed word continues that way.',
          'Reaching a node with a stored word records it and clears it, so it’s reported once. The cell is marked # while the four neighbours are explored, then restored. The found words are sorted at the end.',
        ],
        code: `function findWords(board, words) {
  const root = { children: {}, word: '' };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children[ch]) node.children[ch] = { children: {}, word: '' };
      node = node.children[ch];
    }
    node.word = w;
  }
  const found = [];
  const explore = (r, c, node) => {
    if (r < 0 || c < 0 || r >= board.length || c >= board[0].length) return;
    const letter = board[r][c];
    const next = node.children[letter];
    if (next === undefined) return;
    if (next.word !== '') {
      found.push(next.word);
      next.word = '';
    }
    board[r][c] = '#';
    explore(r + 1, c, next);
    explore(r - 1, c, next);
    explore(r, c + 1, next);
    explore(r, c - 1, next);
    board[r][c] = letter;
  };
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) explore(r, c, root);
  }
  return found.sort();
}
`,
        complexity: {
          time: 'O(R × C × 3^L)',
          space: 'O(W)',
          assumptions: 'R × C cells, L the longest word length and W the total letters in words; the trie usually stops walks far earlier.',
        },
      },
      visualization: {
        spec: 'board is drawn as a table with r and c marking the cell being explored and # on cells in the current path; the words are drawn as a trie whose followed branch lights up, and found grows as cells. The call stack shows the walk branching and backing up.',
        renderers: ['grid', 'trie', 'call-stack', 'array-cells'],
      },
    },
  },

  'f75-71': {
    prerequisites: ['bits', 'loops-and-indexes'],
    related: ['f75-72'],
    content: {
      statement: [
        'A sensor packs its alarm flags into one nonnegative integer, flags: each 1 bit in its binary form is a raised alarm.',
        'Return how many alarms are raised, that is, how many bits of flags are 1.',
      ],
      inputFormat: 'flags: a nonnegative integer.',
      outputFormat: 'An integer from 0 to 31.',
      constraints: ['0 ≤ flags ≤ 2^31 − 1'],
      rules: ['flags = 0 has no raised alarms.', 'Count bits, not decimal digits: 10 is 1010 in binary, so it has two.'],
      entry: 'raisedAlarms',
      params: [{ name: 'flags', kind: 'auto' }],
      examples: [
        { inputs: { flags: 11 }, output: 3, note: '11 is 1011 in binary: three 1 bits.' },
        { inputs: { flags: 128 }, output: 1, note: '128 is 10000000: one bit.' },
      ],
      tests: [
        { inputs: { flags: 0 }, output: 0, note: 'Nothing raised' },
        { inputs: { flags: 1 }, output: 1, note: 'Only bit 0' },
        { inputs: { flags: 255 }, output: 8, note: 'Eight bits in a row' },
        { inputs: { flags: 1025 }, output: 2, note: 'Two bits far apart' },
        { inputs: { flags: 43690 }, output: 8, note: 'Every other bit' },
        { inputs: { flags: 2147483647 }, output: 31, note: 'The largest flags: 31 bits' },
      ],
      starter: {
        javascript: `function raisedAlarms(flags) {
  // Count the 1 bits of flags.
  return 0;
}
`,
      },
      hints: [
        'flags & 1 is the lowest bit; flags >>> 1 shifts every bit one place right, so the next bit becomes the lowest.',
        'That takes one round per bit position. A faster trick: x & (x − 1) is x with its lowest 1 bit cleared.',
        'Clear the lowest 1 bit until nothing is left, counting the rounds.',
      ],
      solution: {
        explanation: [
          'Subtracting 1 from a number flips its lowest 1 bit to 0 and every 0 below it to 1. So rest & (rest − 1) keeps every bit above the lowest 1 and clears that 1 and everything below it.',
          'Each round therefore removes exactly one 1 bit, and the loop ends when rest is 0: the number of rounds is the number of 1 bits.',
        ],
        code: `function raisedAlarms(flags) {
  let count = 0;
  let rest = flags;
  while (rest !== 0) {
    rest &= rest - 1;
    count++;
  }
  return count;
}
`,
        complexity: {
          time: 'O(k)',
          space: 'O(1)',
          assumptions: 'k is the number of 1 bits, at most 31; a bit-by-bit loop would take O(31) rounds.',
        },
      },
      visualization: {
        spec: 'rest is drawn as a row of bits by place value; each round outlines the one bit that x & (x − 1) cleared, while count goes up by one.',
        renderers: ['bits'],
      },
    },
  },

  'f75-72': {
    prerequisites: ['bits', 'hash-sets'],
    related: ['f75-71', 'f75-02'],
    content: {
      statement: [
        'A door scanner logs badge ids. Every badge is scanned twice, once in and once out, except one badge that was scanned only once.',
        'Return the id of that badge.',
      ],
      inputFormat: 'ids: an array of integers in any order.',
      outputFormat: 'An integer: the id that appears once.',
      constraints: [
        '1 ≤ ids.length ≤ 3 × 10^4 and ids.length is odd',
        '-3 × 10^4 ≤ ids[i] ≤ 3 × 10^4',
        'Exactly one id appears once; every other id appears exactly twice.',
      ],
      rules: [
        'The two scans of a badge can be anywhere in the log, not necessarily next to each other.',
        'Ids can be 0 or negative.',
        'Aim for O(n) time and O(1) extra space; a set or map of counts works but uses O(n).',
      ],
      entry: 'loneBadge',
      params: [{ name: 'ids', kind: 'auto' }],
      examples: [
        { inputs: { ids: [4, 1, 2, 1, 2] }, output: 4, note: '1 and 2 each appear twice.' },
        { inputs: { ids: [7, 3, 7] }, output: 3, note: 'The pair need not be next to each other.' },
      ],
      tests: [
        { inputs: { ids: [9] }, output: 9, note: 'One scan only' },
        { inputs: { ids: [0, 5, 5] }, output: 0, note: 'The lone id is 0' },
        { inputs: { ids: [-3, 8, -3] }, output: 8, note: 'A negative pair' },
        { inputs: { ids: [-6, 2, 2] }, output: -6, note: 'A negative lone id' },
        { inputs: { ids: [100, 200, 300, 200, 100] }, output: 300, note: 'Pairs around the lone id' },
      ],
      starter: {
        javascript: `function loneBadge(ids) {
  // Find the id that appears once; every other id appears twice.
  return 0;
}
`,
      },
      hints: [
        'A set works: add an id the first time, remove it the second time, and the one left is the answer. That uses O(n) space.',
        'XOR (^) compares bits: a ^ a is 0, a ^ 0 is a, and the order doesn’t matter.',
        'XOR all the ids together: each pair cancels, and only the lone id is left.',
      ],
      solution: {
        explanation: [
          'acc ^ id flips the bits of acc where id has a 1. Flipping the same bits twice puts them back, so a ^ a = 0, and XOR can be applied in any order.',
          'XOR-ing every id into acc, starting from 0, cancels each pair whatever their positions, which leaves exactly the bits of the lone id. Negative ids work too: XOR works on their 32-bit two’s complement bits.',
        ],
        code: `function loneBadge(ids) {
  let acc = 0;
  for (const id of ids) {
    acc ^= id;
  }
  return acc;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is ids.length; each XOR is one operation on a 32-bit integer.' },
      },
      visualization: {
        spec: 'acc and id are drawn as rows of bits lined up by place value; each step outlines the bits of acc that id flipped, so a pair’s second scan visibly undoes its first.',
        renderers: ['bits', 'array-cells'],
      },
    },
  },

  'f75-73': {
    prerequisites: ['matrices'],
    related: ['f75-74', 'f75-47'],
    content: {
      statement: [
        'A square image is the n × n grid matrix of pixel values. Rotate it a quarter turn clockwise, in place: the top row becomes the right column.',
        'Change matrix itself and return it.',
      ],
      inputFormat: 'matrix: an array of n rows, each with n integers.',
      outputFormat: 'The same array, rotated 90° clockwise.',
      constraints: ['0 ≤ n ≤ 20', 'Pixel values are integers from -1,000 to 1,000.'],
      rules: [
        'Rotate in place: don’t build a second grid (O(1) extra space).',
        'Return matrix itself.',
        'An empty or 1 × 1 image stays the same.',
      ],
      entry: 'rotate',
      params: [{ name: 'matrix', kind: 'auto' }],
      examples: [
        {
          inputs: {
            matrix: [
              [1, 2],
              [3, 4],
            ],
          },
          output: [
            [3, 1],
            [4, 2],
          ],
          note: 'The left column (1, 3) becomes the top row, read upwards.',
        },
        {
          inputs: {
            matrix: [
              [1, 0, 0],
              [0, 2, 0],
              [0, 0, 3],
            ],
          },
          output: [
            [0, 0, 1],
            [0, 2, 0],
            [3, 0, 0],
          ],
          note: 'The diagonal turns into the other diagonal.',
        },
      ],
      tests: [
        { inputs: { matrix: [] }, output: [], note: 'Empty image' },
        { inputs: { matrix: [[7]] }, output: [[7]], note: 'One pixel' },
        {
          inputs: {
            matrix: [
              [9, 8, 7],
              [6, 5, 4],
              [3, 2, 1],
            ],
          },
          output: [
            [3, 6, 9],
            [2, 5, 8],
            [1, 4, 7],
          ],
          note: 'Three by three',
        },
        {
          inputs: {
            matrix: [
              [1, 2, 3, 4],
              [5, 6, 7, 8],
              [9, 10, 11, 12],
              [13, 14, 15, 16],
            ],
          },
          output: [
            [13, 9, 5, 1],
            [14, 10, 6, 2],
            [15, 11, 7, 3],
            [16, 12, 8, 4],
          ],
          note: 'Four by four',
        },
      ],
      starter: {
        javascript: `function rotate(matrix) {
  // Swap across the main diagonal, then reverse each row.
  return matrix;
}
`,
      },
      hints: [
        'Where does the pixel at row r, column c end up? At row c, column n − 1 − r.',
        'That move is two simpler ones: swap across the main diagonal (r, c) ↔ (c, r), then mirror each row left to right.',
        'In the swap, only visit c > r, or each pair is swapped twice and nothing changes.',
      ],
      solution: {
        explanation: [
          'Transposing swaps matrix[r][c] with matrix[c][r] for every pair above the main diagonal, turning rows into columns.',
          'Reversing each row then mirrors the image left to right. Together they send (r, c) to (c, n − 1 − r), a quarter turn clockwise, using only swaps inside matrix.',
        ],
        code: `function rotate(matrix) {
  const n = matrix.length;
  for (let r = 0; r < n; r++) {
    for (let c = r + 1; c < n; c++) {
      [matrix[r][c], matrix[c][r]] = [matrix[c][r], matrix[r][c]];
    }
  }
  for (const row of matrix) row.reverse();
  return matrix;
}
`,
        complexity: { time: 'O(n²)', space: 'O(1)', assumptions: 'n is the side length.' },
      },
      visualization: {
        spec: 'matrix is drawn as a grid with r and c marking the pair being swapped; each swap lights up the two cells it wrote, and each row reverse changes a whole row at once.',
        renderers: ['grid'],
      },
    },
  },

  'f75-74': {
    prerequisites: ['matrices', 'binary-search-idea'],
    related: ['f75-73', 'f75-26'],
    content: {
      statement: [
        'A seating chart is the grid grid: every row increases from left to right, and every column increases from top to bottom.',
        'Return true if target appears in the grid, otherwise false, without checking every cell.',
      ],
      inputFormat: 'grid: an array of rows of integers, all rows the same length. target: an integer.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ rows, columns ≤ 300', 'Values and target are integers from -10^9 to 10^9.'],
      rules: [
        'An empty grid (no rows, or empty rows) contains nothing.',
        'Values within a row or column may repeat only if the order still holds (non-decreasing).',
        'Aim for O(rows + columns).',
        'Do not change grid.',
      ],
      entry: 'searchGrid',
      params: [
        { name: 'grid', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            grid: [
              [1, 4, 7],
              [2, 5, 8],
              [3, 6, 9],
            ],
            target: 5,
          },
          output: true,
          note: 'From the top-right: 7 is too big, 4 too small, then 5.',
        },
        {
          inputs: {
            grid: [
              [1, 4, 7],
              [2, 5, 8],
              [3, 6, 9],
            ],
            target: 10,
          },
          output: false,
          note: 'Bigger than everything.',
        },
      ],
      tests: [
        { inputs: { grid: [], target: 1 }, output: false, note: 'No rows' },
        { inputs: { grid: [[]], target: 1 }, output: false, note: 'An empty row' },
        { inputs: { grid: [[5]], target: 5 }, output: true, note: 'One cell' },
        { inputs: { grid: [[1, 3, 5]], target: 4 }, output: false, note: 'One row, missing' },
        { inputs: { grid: [[1], [3], [5]], target: 5 }, output: true, note: 'One column' },
        {
          inputs: {
            grid: [
              [1, 2],
              [3, 4],
            ],
            target: 3,
          },
          output: true,
          note: 'Bottom-left corner',
        },
      ],
      starter: {
        javascript: `function searchGrid(grid, target) {
  // Start at the top-right corner: each comparison rules out a whole row or column.
  return false;
}
`,
      },
      hints: [
        'Start in a corner where one direction goes up and the other goes down: the top-right.',
        'If that value is bigger than target, the whole column below is bigger too: move left.',
        'If it is smaller, the whole row to the left is smaller too: move down.',
      ],
      solution: {
        explanation: [
          'r and c start at the top-right corner, the biggest value in its row and the smallest in its column.',
          'A value above target rules out its whole column (everything below is bigger), so c moves left; a value below target rules out its whole row (everything to the left is smaller), so r moves down. Each step removes a row or a column.',
        ],
        code: `function searchGrid(grid, target) {
  if (grid.length === 0) return false;
  let r = 0;
  let c = grid[0].length - 1;
  while (r < grid.length && c >= 0) {
    const value = grid[r][c];
    if (value === target) return true;
    if (value > target) c--;
    else r++;
  }
  return false;
}
`,
        complexity: { time: 'O(R + C)', space: 'O(1)', assumptions: 'R rows and C columns.' },
      },
      visualization: {
        spec: 'grid is drawn as a table with r and c marking the cell being compared; the comparison is shown, and the markers only ever move left or down.',
        renderers: ['grid'],
      },
    },
  },

  'f75-75': {
    prerequisites: ['hash-maps', 'linked-list-basics'],
    related: ['f75-17', 'f75-03'],
    content: {
      statement: [
        'Build a cache that holds at most capacity entries and, when full, throws out the entry used least recently. You receive operations in order: ["put", key, value] stores or updates a key, and ["get", key] returns its value (or -1 if absent). Both count as using that key.',
        'Return an array with one entry per operation: null for "put", and the value or -1 for "get". Every operation should take O(1) time on average.',
      ],
      inputFormat: 'capacity: a positive integer. ops: an array of ["put", key, value] and ["get", key].',
      outputFormat: 'An array of the same length as ops.',
      constraints: ['1 ≤ capacity ≤ 3,000', '0 ≤ ops.length ≤ 20,000', 'Keys and values are integers from 0 to 10^5.'],
      rules: [
        'A get of a missing key returns -1 and changes nothing.',
        'Putting an existing key updates its value and makes it the most recent; it never evicts anything.',
        'Putting a new key into a full cache first removes the least recently used key.',
        'Use a Map from key to a node in a doubly linked list ordered by recency, for O(1) operations.',
      ],
      entry: 'runCache',
      params: [
        { name: 'capacity', kind: 'auto' },
        { name: 'ops', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            capacity: 2,
            ops: [
              ['put', 1, 10],
              ['put', 2, 20],
              ['get', 1],
              ['put', 3, 30],
              ['get', 2],
              ['get', 3],
            ],
          },
          output: [null, null, 10, null, -1, 30],
          note: 'Reading 1 makes 2 the least recent, so 2 is evicted.',
        },
        {
          inputs: {
            capacity: 1,
            ops: [
              ['put', 5, 1],
              ['put', 5, 2],
              ['get', 5],
            ],
          },
          output: [null, null, 2],
          note: 'An update replaces the value.',
        },
      ],
      tests: [
        { inputs: { capacity: 1, ops: [] }, output: [], note: 'No operations' },
        { inputs: { capacity: 1, ops: [['get', 7]] }, output: [-1], note: 'A missing key' },
        {
          inputs: {
            capacity: 2,
            ops: [
              ['put', 1, 1],
              ['put', 2, 2],
              ['put', 3, 3],
              ['get', 1],
              ['get', 2],
              ['get', 3],
            ],
          },
          output: [null, null, null, -1, 2, 3],
          note: 'The oldest key is evicted',
        },
        {
          inputs: {
            capacity: 3,
            ops: [
              ['put', 1, 1],
              ['put', 2, 2],
              ['get', 1],
              ['put', 3, 3],
              ['put', 4, 4],
              ['get', 2],
              ['get', 1],
            ],
          },
          output: [null, null, 1, null, null, -1, 1],
          note: 'A get protects a key',
        },
        {
          inputs: {
            capacity: 2,
            ops: [
              ['put', 1, 1],
              ['put', 1, 5],
              ['put', 2, 2],
              ['put', 3, 3],
              ['get', 1],
            ],
          },
          output: [null, null, null, null, -1],
          note: 'An update makes a key recent, but later puts can still evict it',
        },
      ],
      starter: {
        javascript: `class Entry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

function runCache(capacity, ops) {
  const index = new Map(); // key -> its Entry
  const out = [];
  // Keep entries in a doubly linked list, most recent first; move an entry to the front whenever it is used.
  return out;
}
`,
      },
      hints: [
        'A Map finds a key’s entry in O(1). You also need, in O(1), the least recently used key and a way to mark a key as just used.',
        'Keep entries in a doubly linked list ordered by recency, with placeholder nodes at both ends so there are no edge cases.',
        'Using a key unlinks its entry and re-inserts it at the front. Evicting takes the entry just before the back placeholder and deletes its key from the Map.',
      ],
      solution: {
        explanation: [
          'index maps each key to its Entry. The entries form a doubly linked list between two placeholders, head and tail, with the most recently used right after head.',
          'A get or an update unlinks the entry and puts it back at the front. A new key in a full cache first removes tail.prev, the least recent entry, from both the list and the Map. Every step changes a fixed number of links, so each operation is O(1).',
        ],
        code: `class Entry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

function runCache(capacity, ops) {
  const head = new Entry(0, 0);
  const tail = new Entry(0, 0);
  head.next = tail;
  tail.prev = head;
  const index = new Map();
  const unlink = (entry) => {
    entry.prev.next = entry.next;
    entry.next.prev = entry.prev;
  };
  const addFront = (entry) => {
    entry.next = head.next;
    entry.prev = head;
    head.next.prev = entry;
    head.next = entry;
  };
  const out = [];
  for (const op of ops) {
    if (op[0] === 'get') {
      const entry = index.get(op[1]);
      if (entry === undefined) {
        out.push(-1);
      } else {
        unlink(entry);
        addFront(entry);
        out.push(entry.value);
      }
    } else {
      const key = op[1];
      const value = op[2];
      if (index.has(key)) {
        const entry = index.get(key);
        entry.value = value;
        unlink(entry);
        addFront(entry);
      } else {
        if (index.size === capacity) {
          const oldest = tail.prev;
          unlink(oldest);
          index.delete(oldest.key);
        }
        const entry = new Entry(key, value);
        index.set(key, entry);
        addFront(entry);
      }
      out.push(null);
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(1) per operation',
          space: 'O(capacity)',
          assumptions: 'Map operations take O(1) time on average; each list change touches a fixed number of links.',
        },
      },
      visualization: {
        spec: 'The entries are drawn as a linked list along next, from head to tail, with next arrows swinging as entries move to the front (prev is listed on each entry). index is drawn as a map from key to entry, with lookups marked found or not found.',
        renderers: ['linked-list', 'hash-map'],
      },
      view: { mapColumns: ['key', 'entry'] },
    },
  },
};
