// Fully authored Interview 100 exercises. Each statement is an original story with the
// structure of a widely practiced interview problem (docs/INTERVIEW-100.md); statements,
// examples, tests, hints and reference solutions are written for Drawgorithms. Each one is
// checked by interview.test.ts (the JavaScript reference passes every case in the
// interpreter, every expected output is recomputed independently) and by python.test.ts
// (the Python answer in ./python passes every case on CPython).
import type { ExerciseContent } from './schema';

export interface InterviewAuthored {
  prerequisites: string[];
  related: string[];
  content: ExerciseContent;
}

// Puzzle grids for Puzzle Grid Audit, made for this collection: VALID is a partial grid that
// breaks no rule, and each broken copy adds one digit that repeats in exactly one place.
const VALID_GRID = [
  ['.', '.', '.', '4', '5', '.', '7', '8', '9'],
  ['4', '.', '6', '7', '.', '9', '.', '.', '.'],
  ['.', '8', '.', '.', '.', '.', '.', '.', '.'],
  ['2', '.', '.', '5', '.', '.', '.', '.', '1'],
  ['5', '6', '.', '.', '9', '1', '.', '.', '.'],
  ['.', '9', '.', '.', '.', '4', '.', '6', '7'],
  ['.', '4', '.', '.', '.', '.', '.', '.', '.'],
  ['.', '7', '.', '.', '1', '2', '.', '4', '.'],
  ['9', '.', '.', '3', '.', '.', '.', '.', '.'],
];
const withDigit = (r: number, c: number, d: string) => VALID_GRID.map((row, i) => row.map((x, j) => (i === r && j === c ? d : x)));
const FULL_GRID = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => String(((3 * (r % 3) + Math.floor(r / 3) + c) % 9) + 1)),
);
const EMPTY_GRID = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => '.'));

export const INTERVIEW_AUTHORED: Record<string, InterviewAuthored> = {
  'i100-001': {
    prerequisites: ['strings-and-chars', 'hash-maps'],
    related: ['i100-002', 'i100-006'],
    content: {
      statement: [
        'A word-game club checks answers in its tile game: a player wins a round by laying out exactly the tiles of the target word, in any order.',
        'Given the target word first and the player’s word second, return true if second uses exactly the same letters as first, each one the same number of times, and false otherwise.',
      ],
      inputFormat: 'first, second: strings of lowercase letters a–z.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ first.length, second.length ≤ 50,000', 'Only lowercase letters a–z appear.'],
      rules: [
        'Two empty words use the same letters: return true.',
        'Words of different lengths can never match.',
        'A word matches itself.',
        'Every letter must appear the same number of times in both words.',
      ],
      entry: 'isRearrangement',
      params: [
        { name: 'first', kind: 'auto' },
        { name: 'second', kind: 'auto' },
      ],
      examples: [
        { inputs: { first: 'listen', second: 'silent' }, output: true, note: 'The same six letters in another order.' },
        { inputs: { first: 'chart', second: 'march' }, output: false, note: 'march has an m where chart has a t.' },
      ],
      tests: [
        { inputs: { first: '', second: '' }, output: true, note: 'Two empty words' },
        { inputs: { first: 'a', second: 'ab' }, output: false, note: 'Different lengths' },
        { inputs: { first: 'aab', second: 'abb' }, output: false, note: 'Same letters, different counts' },
        { inputs: { first: 'dusty', second: 'study' }, output: true, note: 'A rearrangement' },
        { inputs: { first: 'abc', second: 'abc' }, output: true, note: 'The same word' },
        { inputs: { first: 'night', second: 'thing' }, output: true, note: 'Every letter moved' },
      ],
      starter: {
        javascript: `function isRearrangement(first, second) {
  // Return true if second uses exactly the letters of first, the same number of times each.
  return false;
}
`,
      },
      hints: [
        'Two words match when every letter appears the same number of times in both.',
        'Count the letters of first in a map, then use those counts up while reading second.',
        'If second needs a letter whose count is already 0, the words differ. Compare the lengths first, so no leftover letters can hide.',
      ],
      solution: {
        explanation: [
          'Different lengths can’t match. Otherwise counts records how many of each letter first has.',
          'Reading second uses the counts up one letter at a time. A letter with no count left means second has more of it than first; if that never happens, the equal lengths mean every count ended at 0.',
        ],
        code: `function isRearrangement(first, second) {
  if (first.length !== second.length) return false;
  const counts = new Map();
  for (const ch of first) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of second) {
    const left = counts.get(ch) ?? 0;
    if (left === 0) return false;
    counts.set(ch, left - 1);
  }
  return true;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(1)',
          assumptions: 'n is first.length; the map holds at most 26 letters, and its operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'Both words are drawn as character cells. The counts map shows each letter’s count going up while first is read and down while second is read.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['letter', 'count'] },
    },
  },

  'i100-002': {
    prerequisites: ['strings-and-chars', 'hash-maps'],
    related: ['i100-001', 'i100-003'],
    content: {
      statement: [
        'A theatre prop maker builds a mysterious note out of letters cut from an old magazine. Each cut-out letter can be glued into the note only once.',
        'Given the text of note and the letters available in magazine, return true if the note can be made from the magazine’s letters, and false otherwise.',
      ],
      inputFormat: 'note, magazine: strings of lowercase letters a–z.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ note.length, magazine.length ≤ 100,000', 'Only lowercase letters a–z appear.'],
      rules: [
        'An empty note can always be made: return true.',
        'Each magazine letter can be used at most once.',
        'The order of letters in the magazine does not matter.',
      ],
      entry: 'canClipNote',
      params: [
        { name: 'note', kind: 'auto' },
        { name: 'magazine', kind: 'auto' },
      ],
      examples: [
        { inputs: { note: 'stop', magazine: 'potsx' }, output: true, note: 'Every letter is there; x is left over.' },
        { inputs: { note: 'book', magazine: 'kobd' }, output: false, note: 'Only one o to cut out.' },
      ],
      tests: [
        { inputs: { note: '', magazine: 'abc' }, output: true, note: 'Empty note' },
        { inputs: { note: 'a', magazine: '' }, output: false, note: 'Empty magazine' },
        { inputs: { note: 'hello', magazine: 'lehol' }, output: true, note: 'Two l’s are needed and found' },
        { inputs: { note: 'cab', magazine: 'abd' }, output: false, note: 'No c' },
        { inputs: { note: 'zz', magazine: 'zaz' }, output: true, note: 'Extra letters are fine' },
        { inputs: { note: 'paper', magazine: 'aepprx' }, output: true, note: 'Magazine longer than the note' },
      ],
      starter: {
        javascript: `function canClipNote(note, magazine) {
  // Return true if note can be glued together from the letters of magazine.
  return false;
}
`,
      },
      hints: [
        'Only how many of each letter the magazine has matters.',
        'Count the magazine’s letters first, then spend them while spelling the note.',
        'A letter the note needs but the magazine has run out of means the note can’t be made.',
      ],
      solution: {
        explanation: [
          'supply counts every letter of the magazine. Spelling the note spends one of the right letter at a time.',
          'If a letter’s supply is 0 when the note needs it, the note can’t be made. Reaching the end of the note means every letter was available.',
        ],
        code: `function canClipNote(note, magazine) {
  const supply = new Map();
  for (const ch of magazine) supply.set(ch, (supply.get(ch) ?? 0) + 1);
  for (const ch of note) {
    const left = supply.get(ch) ?? 0;
    if (left === 0) return false;
    supply.set(ch, left - 1);
  }
  return true;
}
`,
        complexity: {
          time: 'O(m + n)',
          space: 'O(1)',
          assumptions: 'm is magazine.length and n is note.length; the map holds at most 26 letters.',
        },
      },
      visualization: {
        spec: 'The note and the magazine are drawn as character cells. The supply map shows each letter’s count, which shrinks as the note is spelled.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['letter', 'left'] },
    },
  },

  'i100-003': {
    prerequisites: ['strings-and-chars', 'hash-maps'],
    related: ['i100-001', 'i100-002'],
    content: {
      statement: [
        'Two pen pals write in a secret substitution code. Every letter of a message is always replaced by the same code letter, and two different letters are never replaced by the same code letter (a letter may stand for itself).',
        'Given a message plain and a string coded of the same length, return true if coded could be plain written in such a code, and false otherwise.',
      ],
      inputFormat: 'plain, coded: strings of lowercase letters a–z with the same length.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ plain.length = coded.length ≤ 50,000', 'Only lowercase letters a–z appear.'],
      rules: [
        'Two empty strings match: return true.',
        'One letter of plain must always become the same code letter.',
        'Two different letters of plain must never become the same code letter.',
        'A letter may stand for itself.',
      ],
      entry: 'couldBeCode',
      params: [
        { name: 'plain', kind: 'auto' },
        { name: 'coded', kind: 'auto' },
      ],
      examples: [
        { inputs: { plain: 'bell', coded: 'cuff' }, output: true, note: 'b→c, e→u, l→f.' },
        { inputs: { plain: 'noon', coded: 'moan' }, output: false, note: 'o would have to become both o and a.' },
      ],
      tests: [
        { inputs: { plain: '', coded: '' }, output: true, note: 'Empty strings' },
        { inputs: { plain: 'ab', coded: 'aa' }, output: false, note: 'a and b can’t both become a' },
        { inputs: { plain: 'abc', coded: 'xyz' }, output: true, note: 'All different' },
        { inputs: { plain: 'aba', coded: 'cdc' }, output: true, note: 'Repeats in the same places' },
        { inputs: { plain: 'badc', coded: 'baba' }, output: false, note: 'b and d would share a code letter' },
        { inputs: { plain: 'kayak', coded: 'level' }, output: true, note: 'k→l, a→e, y→v' },
      ],
      starter: {
        javascript: `function couldBeCode(plain, coded) {
  // Return true if coded could be plain written in a one-to-one letter code.
  return false;
}
`,
      },
      hints: [
        'Walk both strings together: each position pairs a plain letter with a code letter.',
        'Remember which code letter each plain letter became. A different one later breaks the code.',
        'That isn’t enough on its own (try "ab" and "aa"): also remember which plain letter each code letter stands for.',
      ],
      solution: {
        explanation: [
          'forward records which code letter each plain letter became, and backward which plain letter each code letter stands for.',
          'At each position both pairings must agree with what was recorded before. A conflict in forward means one letter became two code letters; a conflict in backward means two letters became one.',
        ],
        code: `function couldBeCode(plain, coded) {
  const forward = new Map();
  const backward = new Map();
  for (let i = 0; i < plain.length; i++) {
    const p = plain[i];
    const c = coded[i];
    if (forward.has(p) && forward.get(p) !== c) return false;
    if (backward.has(c) && backward.get(c) !== p) return false;
    forward.set(p, c);
    backward.set(c, p);
  }
  return true;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(1)',
          assumptions: 'n is plain.length; each map holds at most 26 letters.',
        },
      },
      visualization: {
        spec: 'Both strings are drawn as character cells with i over the pair being compared. The forward and backward maps show the pairings so far; the step that finds a conflict says which one.',
        renderers: ['string-cells', 'hash-map'],
      },
    },
  },

  'i100-004': {
    prerequisites: ['arrays-basics', 'loops-and-indexes'],
    related: ['i100-007', 'i100-095'],
    content: {
      statement: [
        'A town votes for its new mascot, and each ballot names a candidate by number. The organisers already know that one candidate received more than half of all the ballots.',
        'Find that candidate in one pass over ballots, keeping only a couple of numbers in memory: no set, map or extra array.',
      ],
      inputFormat: 'ballots: a non-empty array of integers in which one value appears more than ballots.length / 2 times.',
      outputFormat: 'An integer: the value that appears more than half the time.',
      constraints: ['1 ≤ ballots.length ≤ 50,000', 'Values are integers from -10^9 to 10^9.', 'A majority value always exists.'],
      rules: ['Use O(1) extra space: no set, map or array of your own.', 'Do not change ballots.'],
      entry: 'majorityVote',
      params: [{ name: 'ballots', kind: 'auto' }],
      examples: [
        { inputs: { ballots: [3, 1, 3, 3, 2] }, output: 3, note: '3 has three of the five ballots.' },
        { inputs: { ballots: [5, 5, 1, 1, 5, 1, 5] }, output: 5, note: '5 has four of seven.' },
      ],
      tests: [
        { inputs: { ballots: [7] }, output: 7, note: 'One ballot' },
        { inputs: { ballots: [2, 2, 1] }, output: 2, note: 'Majority first' },
        { inputs: { ballots: [1, 2, 1, 2, 1] }, output: 1, note: 'Alternating' },
        { inputs: { ballots: [-4, -4, -4, 0, 9] }, output: -4, note: 'Negative candidate numbers' },
        { inputs: { ballots: [6, 6, 6, 6] }, output: 6, note: 'Everyone agrees' },
        { inputs: { ballots: [1, 9, 9, 1, 9] }, output: 9, note: 'Majority last' },
      ],
      starter: {
        javascript: `function majorityVote(ballots) {
  // Return the value that appears more than half the time, using O(1) extra space.
  return ballots[0];
}
`,
      },
      hints: [
        'Pair each ballot for the winner with a ballot for someone else and cancel them out: the winner still has ballots left over.',
        'Keep a current candidate and a count. A ballot for the candidate adds one, any other ballot takes one away.',
        'When the count drops to 0, the next ballot becomes the new candidate.',
      ],
      solution: {
        explanation: [
          'count is how many ballots for candidate are still uncancelled. A ballot for someone else cancels one of them; at 0, the next ballot starts a new candidate.',
          'Every cancellation removes one winner ballot at most together with one other ballot, so the winner, with more than half, can’t be cancelled entirely: it is the candidate at the end.',
        ],
        code: `function majorityVote(ballots) {
  let candidate = ballots[0];
  let count = 0;
  for (const b of ballots) {
    if (count === 0) candidate = b;
    count += b === candidate ? 1 : -1;
  }
  return candidate;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is ballots.length.' },
      },
      visualization: {
        spec: 'The ballots are drawn as cells with the one being read marked. candidate and count are blocks next to them: count rises and falls, and candidate changes only when count was 0.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-005': {
    prerequisites: ['strings-and-chars', 'hash-maps'],
    related: ['i100-010', 'i100-097'],
    content: {
      statement: [
        'An antique shop’s ledger writes every price in Roman numerals. The symbols are I = 1, V = 5, X = 10, L = 50, C = 100, D = 500 and M = 1000, written from largest to smallest and added up.',
        'Six pairs are written the other way round to mean a subtraction: IV = 4, IX = 9, XL = 40, XC = 90, CD = 400 and CM = 900. Given one valid numeral, return its value.',
      ],
      inputFormat: 'numeral: a valid Roman numeral string using I, V, X, L, C, D and M.',
      outputFormat: 'An integer from 1 to 3999.',
      constraints: ['1 ≤ numeral.length ≤ 15', 'The numeral is valid and its value is from 1 to 3999.'],
      rules: [
        'A symbol followed by a larger one (one of the six pairs) is subtracted; every other symbol is added.',
        'Only uppercase symbols appear.',
      ],
      entry: 'romanToNumber',
      params: [{ name: 'numeral', kind: 'auto' }],
      examples: [
        { inputs: { numeral: 'XIV' }, output: 14, note: 'X = 10, IV = 4.' },
        { inputs: { numeral: 'MCDXLVIII' }, output: 1448, note: 'M + CD + XL + VIII.' },
      ],
      tests: [
        { inputs: { numeral: 'I' }, output: 1, note: 'The smallest value' },
        { inputs: { numeral: 'II' }, output: 2, note: 'Repeated symbols add up' },
        { inputs: { numeral: 'IX' }, output: 9, note: 'One subtractive pair' },
        { inputs: { numeral: 'LXXVII' }, output: 77, note: 'Only additions' },
        { inputs: { numeral: 'CDXLIV' }, output: 444, note: 'Three subtractive pairs' },
        { inputs: { numeral: 'MMMCMXCIX' }, output: 3999, note: 'The largest value' },
      ],
      starter: {
        javascript: `function romanToNumber(numeral) {
  // Return the value of the Roman numeral.
  return 0;
}
`,
      },
      hints: [
        'Look each symbol’s value up in a table.',
        'Usually you add a symbol’s value. When does a symbol get subtracted instead?',
        'Compare each symbol with the one after it: a smaller symbol before a larger one is subtracted.',
      ],
      solution: {
        explanation: [
          'value maps each symbol to its number. Reading left to right, each symbol is compared with the next one.',
          'A symbol smaller than the next is the first half of a subtractive pair, so it is subtracted; everything else is added. In IX, I is subtracted and X added: 10 − 1 = 9.',
        ],
        code: `function romanToNumber(numeral) {
  const value = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const v = value[numeral[i]];
    if (i + 1 < numeral.length && v < value[numeral[i + 1]]) total -= v;
    else total += v;
  }
  return total;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is numeral.length; the table has seven entries.' },
      },
      visualization: {
        spec: 'The numeral is drawn as character cells with i over the symbol being read. total changes by each symbol’s value, down for a subtracted symbol and up otherwise.',
        renderers: ['string-cells'],
      },
    },
  },

  'i100-006': {
    prerequisites: ['strings-and-chars', 'hash-maps', 'sorting'],
    related: ['i100-001', 'i100-007'],
    content: {
      statement: [
        'A library sorts its word cards onto shelves: two cards share a shelf when one word is a rearrangement of the other (the same letters, the same number of times).',
        'Given words, return the shelves as lists of words. Shelves come in the order their first word appears in words, and the words on a shelf keep their order from words.',
      ],
      inputFormat: 'words: an array of strings of lowercase letters a–z.',
      outputFormat: 'An array of arrays of strings: the groups, in order of first appearance.',
      constraints: ['0 ≤ words.length ≤ 10,000', '0 ≤ each word’s length ≤ 100', 'Only lowercase letters a–z appear.'],
      rules: [
        'Empty input: return [].',
        'Repeated words go on the same shelf, once per card.',
        'The empty word is a rearrangement only of itself.',
        'Order: shelves by first appearance; words on a shelf in input order.',
      ],
      entry: 'groupRearrangements',
      params: [{ name: 'words', kind: 'auto' }],
      examples: [
        {
          inputs: { words: ['lemon', 'pear', 'melon', 'plum', 'reap'] },
          output: [['lemon', 'melon'], ['pear', 'reap'], ['plum']],
          note: 'Three shelves, in the order lemon, pear and plum first appear.',
        },
        { inputs: { words: ['ab', 'ba', 'abc'] }, output: [['ab', 'ba'], ['abc']], note: 'Different lengths never share a shelf.' },
      ],
      tests: [
        { inputs: { words: [] }, output: [], note: 'No cards' },
        { inputs: { words: [''] }, output: [['']], note: 'One empty word' },
        { inputs: { words: ['', 'a', ''] }, output: [['', ''], ['a']], note: 'Empty words together' },
        { inputs: { words: ['abc', 'cab', 'bca', 'xyz'] }, output: [['abc', 'cab', 'bca'], ['xyz']], note: 'One big shelf' },
        { inputs: { words: ['aab', 'aba', 'abb'] }, output: [['aab', 'aba'], ['abb']], note: 'Letter counts matter' },
        { inputs: { words: ['see', 'see'] }, output: [['see', 'see']], note: 'Repeated card' },
      ],
      starter: {
        javascript: `function groupRearrangements(words) {
  // Return groups of words that are rearrangements of each other, in order of first appearance.
  return [];
}
`,
      },
      hints: [
        'Two words are rearrangements when they look the same after their letters are sorted.',
        'Use that sorted form as a key in a map from key to the list of words with it.',
        'A map remembers the order keys were first added, which is the shelf order you need.',
      ],
      solution: {
        explanation: [
          'Each word’s key is its letters in sorted order: rearrangements, and only they, get the same key.',
          'groups maps each key to its shelf. A new key starts a shelf; a known key adds the word to the end of its shelf. Reading the shelves in insertion order gives the required order.',
        ],
        code: `function groupRearrangements(words) {
  const groups = new Map(); // sorted letters → words
  for (const w of words) {
    const key = w.split('').sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  const shelves = [];
  for (const entry of groups) shelves.push(entry[1]);
  return shelves;
}
`,
        complexity: {
          time: 'O(n · k log k)',
          space: 'O(n · k)',
          assumptions: 'n is words.length and k the longest word’s length; map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The words are drawn as cells. The groups map shows each sorted key with its shelf of words, growing as words are read.',
        renderers: ['array-cells', 'hash-map'],
      },
      view: { mapColumns: ['key', 'words'] },
    },
  },

  'i100-007': {
    prerequisites: ['arrays-basics', 'hash-maps', 'sorting'],
    related: ['i100-006', 'i100-004'],
    content: {
      statement: [
        'A café records every order by the number of the item ordered. For its weekly specials board it wants the k items ordered most often.',
        'Given orders and k, return those k item numbers, most often ordered first. Items ordered equally often are listed with the smaller item number first.',
      ],
      inputFormat: 'orders: an array of integers. k: an integer.',
      outputFormat: 'An array of k integers.',
      constraints: ['1 ≤ orders.length ≤ 100,000', '1 ≤ k ≤ the number of distinct items', 'Item numbers are integers from -10^4 to 10^4.'],
      rules: [
        'Order: by how often an item was ordered, most first; ties by smaller item number.',
        'Each item appears at most once in the answer.',
        'Do not change orders.',
      ],
      entry: 'mostRequested',
      params: [
        { name: 'orders', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        { inputs: { orders: [4, 1, 4, 2, 1, 4], k: 2 }, output: [4, 1], note: '4 three times, 1 twice.' },
        { inputs: { orders: [7, 3, 3, 7, 9], k: 2 }, output: [3, 7], note: '3 and 7 tie; 3 is smaller.' },
      ],
      tests: [
        { inputs: { orders: [5], k: 1 }, output: [5], note: 'One order' },
        { inputs: { orders: [2, 2, 2, 1], k: 1 }, output: [2], note: 'A clear favourite' },
        { inputs: { orders: [1, 2, 3], k: 3 }, output: [1, 2, 3], note: 'All tied' },
        { inputs: { orders: [9, 8, 9, 8, 7], k: 2 }, output: [8, 9], note: 'Tie broken by item number' },
        { inputs: { orders: [-1, -1, 0], k: 2 }, output: [-1, 0], note: 'Negative item numbers' },
        { inputs: { orders: [6, 5, 5, 6, 6, 4, 4, 4, 4], k: 3 }, output: [4, 6, 5], note: 'Three different counts' },
      ],
      starter: {
        javascript: `function mostRequested(orders, k) {
  // Return the k most ordered items, most first; ties by smaller item number.
  return [];
}
`,
      },
      hints: [
        'First count how often each item was ordered.',
        'Then you need the items with the largest counts. Sorting every item by count works in O(n log n).',
        'For O(n): an item’s count is at most orders.length, so put each item in a bucket for its count and read the buckets from the largest count down.',
      ],
      solution: {
        explanation: [
          'counts holds how often each item was ordered. buckets[c] lists the items ordered exactly c times; no count is larger than orders.length.',
          'Reading the buckets from the largest count down gives the most ordered items first. Each bucket is sorted so that ties come out smallest item first, and the walk stops once k items are taken.',
        ],
        code: `function mostRequested(orders, k) {
  const counts = new Map();
  for (const item of orders) counts.set(item, (counts.get(item) ?? 0) + 1);
  const buckets = [];
  for (let c = 0; c <= orders.length; c++) buckets.push([]);
  for (const [item, count] of counts) buckets[count].push(item);
  const top = [];
  for (let c = orders.length; c > 0 && top.length < k; c--) {
    buckets[c].sort((a, b) => a - b);
    for (const item of buckets[c]) {
      if (top.length === k) break;
      top.push(item);
    }
  }
  return top;
}
`,
        complexity: {
          time: 'O(n + d log d)',
          space: 'O(n)',
          assumptions:
            'n is orders.length and d the number of distinct items (sorting the tied items in each bucket); map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The orders are drawn as cells, the counts map with each item’s count, and buckets as rows indexed by count. The answer fills from the highest bucket down.',
        renderers: ['array-cells', 'hash-map', 'grid'],
      },
      view: { mapColumns: ['item', 'count'] },
    },
  },

  'i100-008': {
    prerequisites: ['arrays-basics', 'hash-sets'],
    related: ['i100-004', 'i100-090'],
    content: {
      statement: [
        'Badges were handed out at a festival gate and the numbers were written down in no particular order, sometimes more than once.',
        'Return the length of the longest run of consecutive badge numbers (like 4, 5, 6, 7) found among them. Sorting takes O(n log n); find it in O(n) time on average.',
      ],
      inputFormat: 'badges: an array of integers.',
      outputFormat: 'An integer: the length of the longest run.',
      constraints: ['0 ≤ badges.length ≤ 100,000', 'Badge numbers are integers from -10^9 to 10^9.'],
      rules: [
        'Empty input: return 0.',
        'Repeated numbers count once.',
        'The run’s numbers can appear anywhere in badges, in any order.',
        'Do not change badges.',
      ],
      entry: 'longestRun',
      params: [{ name: 'badges', kind: 'auto' }],
      examples: [
        { inputs: { badges: [12, 40, 11, 9, 10, 41] }, output: 4, note: '9, 10, 11, 12.' },
        { inputs: { badges: [7, 3, 5, 24, 4, 6, 20, 21, 22, 23, 25, 3] }, output: 6, note: '20 to 25 beats 3 to 7.' },
      ],
      tests: [
        { inputs: { badges: [] }, output: 0, note: 'No badges' },
        { inputs: { badges: [5] }, output: 1, note: 'One badge' },
        { inputs: { badges: [1, 1, 1] }, output: 1, note: 'Repeats count once' },
        { inputs: { badges: [-2, -1, 0, 5] }, output: 3, note: 'Through zero' },
        { inputs: { badges: [10, 30, 20] }, output: 1, note: 'No neighbours' },
        { inputs: { badges: [9, 1, 4, 7, 3, 2, 8, 6, 5] }, output: 9, note: 'Every number from 1 to 9' },
      ],
      starter: {
        javascript: `function longestRun(badges) {
  // Return the length of the longest run of consecutive numbers.
  return 0;
}
`,
      },
      hints: [
        'Put every badge number in a set, so "is x there?" takes O(1) time.',
        'A run starts at a number x whose x − 1 is missing. From each start, count up while the next number is there.',
        'Counting only from starts means every number is counted once, so the whole search is O(n).',
      ],
      solution: {
        explanation: [
          'have is the set of badge numbers. A number b starts a run when b − 1 is not in the set; every other number belongs to a run that starts earlier.',
          'From each start, length grows while b + length is in the set. Because only starts are counted from, each number is looked at a constant number of times.',
        ],
        code: `function longestRun(badges) {
  const have = new Set(badges);
  let best = 0;
  for (const b of have) {
    if (have.has(b - 1)) continue; // not the start of a run
    let length = 1;
    while (have.has(b + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is badges.length; set operations take O(1) time on average.' },
      },
      visualization: {
        spec: 'The badges are drawn as cells and have as a set. Each lookup is marked found or not found; the walk up from a run’s start shows length growing.',
        renderers: ['array-cells', 'hash-set'],
      },
    },
  },

  'i100-009': {
    prerequisites: ['matrices', 'hash-sets'],
    related: ['i100-098', 'i100-099'],
    content: {
      statement: [
        'A puzzle magazine checks every half-finished 9×9 number grid before printing it. In a correct grid, no digit 1–9 appears twice in the same row, the same column, or the same 3×3 box (the grid is split into nine such boxes).',
        'Given board, where empty cells hold ".", return true if the filled cells break none of these rules. The puzzle does not have to be solvable.',
      ],
      inputFormat: 'board: 9 rows of 9 one-character strings, each "1" to "9" or ".".',
      outputFormat: 'A boolean.',
      constraints: ['board has exactly 9 rows and 9 columns.', 'Each cell is a digit "1"–"9" or ".".'],
      rules: [
        'Only filled cells are checked; empty cells are ignored.',
        'An empty grid breaks no rule: return true.',
        'Box b holds rows 3·⌊b/3⌋ to 3·⌊b/3⌋ + 2 and columns 3·(b mod 3) to 3·(b mod 3) + 2.',
        'Do not change board.',
      ],
      entry: 'gridIsValid',
      params: [{ name: 'board', kind: 'auto' }],
      examples: [
        { inputs: { board: VALID_GRID }, output: true, note: 'No digit repeats anywhere.' },
        { inputs: { board: withDigit(2, 2, '4') }, output: false, note: 'A second 4 in the top-left box.' },
      ],
      tests: [
        { inputs: { board: EMPTY_GRID }, output: true, note: 'Empty grid' },
        { inputs: { board: FULL_GRID }, output: true, note: 'A completely filled correct grid' },
        { inputs: { board: withDigit(2, 4, '8') }, output: false, note: 'Two 8s in row 2 (in different boxes)' },
        { inputs: { board: withDigit(8, 7, '6') }, output: false, note: 'Two 6s in column 7 (in different boxes)' },
        { inputs: { board: withDigit(0, 0, '1') }, output: true, note: 'Adding a digit that repeats nowhere' },
      ],
      starter: {
        javascript: `function gridIsValid(board) {
  // Return true if no digit repeats in a row, a column or a 3×3 box.
  return false;
}
`,
      },
      hints: [
        'Each filled cell belongs to one row, one column and one box. Which box? Use ⌊r/3⌋ and ⌊c/3⌋.',
        'Remember each fact you have seen, such as "row 2 has an 8", "column 7 has a 6" or "box 0 has a 4".',
        'One set of such facts is enough: a fact seen twice is a repeat.',
      ],
      solution: {
        explanation: [
          'Every filled cell states three facts: its digit is in row r, in column c and in box ⌊r/3⌋·3 + ⌊c/3⌋.',
          'seen holds every fact stated so far, written as a short string. A fact that is already in seen is a repeat, which breaks a rule.',
        ],
        code: `function gridIsValid(board) {
  const seen = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = board[r][c];
      if (d === '.') continue;
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const inRow = 'row ' + r + ': ' + d;
      const inCol = 'col ' + c + ': ' + d;
      const inBox = 'box ' + box + ': ' + d;
      if (seen.has(inRow) || seen.has(inCol) || seen.has(inBox)) return false;
      seen.add(inRow);
      seen.add(inCol);
      seen.add(inBox);
    }
  }
  return true;
}
`,
        complexity: { time: 'O(1)', space: 'O(1)', assumptions: 'The grid is always 9 × 9: at most 81 cells and 243 facts.' },
      },
      visualization: {
        spec: 'The board is drawn as a grid with r and c marking the cell being read. The seen set grows by three facts per filled cell; the fact that is found again is marked.',
        renderers: ['grid', 'hash-set'],
      },
    },
  },

  'i100-010': {
    prerequisites: ['strings-and-chars', 'loops-and-indexes'],
    related: ['i100-011', 'i100-005'],
    content: {
      statement: [
        'A photo archive names files by place and date, and a search page shows the beginning that every file in the results shares.',
        'Given names, return the longest prefix that every name starts with, or "" if they share none.',
      ],
      inputFormat: 'names: an array of strings.',
      outputFormat: 'A string.',
      constraints: ['0 ≤ names.length ≤ 200', '0 ≤ each name’s length ≤ 200', 'Names use lowercase letters, digits and "-".'],
      rules: ['No names: return "".', 'One name: the whole name is the shared prefix.', 'An empty name makes the shared prefix "".'],
      entry: 'sharedOpening',
      params: [{ name: 'names', kind: 'auto' }],
      examples: [
        { inputs: { names: ['oslo-2019', 'oslo-2021', 'oslo-2022'] }, output: 'oslo-20', note: 'They differ at the third digit.' },
        { inputs: { names: ['lima', 'rome'] }, output: '', note: 'Different from the first letter.' },
      ],
      tests: [
        { inputs: { names: [] }, output: '', note: 'No names' },
        { inputs: { names: ['solo'] }, output: 'solo', note: 'One name' },
        { inputs: { names: ['', 'a'] }, output: '', note: 'An empty name' },
        { inputs: { names: ['abc', 'abc'] }, output: 'abc', note: 'Identical names' },
        { inputs: { names: ['interview', 'internet', 'interval'] }, output: 'inter', note: 'Five shared letters' },
        { inputs: { names: ['ab', 'a'] }, output: 'a', note: 'A shorter name ends the prefix' },
      ],
      starter: {
        javascript: `function sharedOpening(names) {
  // Return the longest prefix every name starts with.
  return '';
}
`,
      },
      hints: [
        'The shared prefix can’t be longer than the first name.',
        'Check one position at a time: does every name have the same character at position i?',
        'Stop as soon as some name is too short or has a different character there.',
      ],
      solution: {
        explanation: [
          'The answer is a prefix of names[0]. Position i of it is checked in every name: each must be long enough and have the same character.',
          'The first position that fails ends the prefix; if none fails, the whole first name is shared.',
        ],
        code: `function sharedOpening(names) {
  if (names.length === 0) return '';
  let prefix = '';
  for (let i = 0; i < names[0].length; i++) {
    const ch = names[0][i];
    for (const name of names) {
      if (i >= name.length || name[i] !== ch) return prefix;
    }
    prefix += ch;
  }
  return prefix;
}
`,
        complexity: { time: 'O(n · m)', space: 'O(m)', assumptions: 'n is names.length and m the length of the shared prefix plus one.' },
      },
      visualization: {
        spec: 'The names are drawn as cells and the first name as characters with i over the position being checked. prefix grows by one character per position that every name shares.',
        renderers: ['array-cells', 'string-cells'],
      },
    },
  },

  'i100-011': {
    prerequisites: ['strings-and-chars', 'two-pointers'],
    related: ['i100-010', 'i100-016'],
    content: {
      statement: [
        'A treasure hunt hides its clue along a trail: the clue is solved if its letters can be found on the trail’s signposts in the same order. Signposts may be skipped, but the order can’t change and each signpost is used at most once.',
        'Given clue and the signposts as the string path, return true if clue appears in path in order, and false otherwise.',
      ],
      inputFormat: 'clue, path: strings of lowercase letters a–z.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ clue.length ≤ 100', '0 ≤ path.length ≤ 10,000', 'Only lowercase letters a–z appear.'],
      rules: [
        'An empty clue is always found: return true.',
        'Letters of clue must appear in path in the same order, not necessarily next to each other.',
        'Each signpost can match at most one letter of clue.',
      ],
      entry: 'appearsInOrder',
      params: [
        { name: 'clue', kind: 'auto' },
        { name: 'path', kind: 'auto' },
      ],
      examples: [
        { inputs: { clue: 'map', path: 'meadowpath' }, output: true, note: 'm, then a, then p, skipping the rest.' },
        { inputs: { clue: 'pam', path: 'meadowpath' }, output: false, note: 'No m comes after the p and the a.' },
      ],
      tests: [
        { inputs: { clue: '', path: 'abc' }, output: true, note: 'Empty clue' },
        { inputs: { clue: 'a', path: '' }, output: false, note: 'No signposts' },
        { inputs: { clue: '', path: '' }, output: true, note: 'Both empty' },
        { inputs: { clue: 'abc', path: 'abc' }, output: true, note: 'The whole path' },
        { inputs: { clue: 'bb', path: 'ab' }, output: false, note: 'Only one b to use' },
        { inputs: { clue: 'tea', path: 'theatre' }, output: true, note: 'Skipping h' },
      ],
      starter: {
        javascript: `function appearsInOrder(clue, path) {
  // Return true if the letters of clue appear in path in the same order.
  return false;
}
`,
      },
      hints: [
        'Walk along path once, keeping track of the next clue letter you still need.',
        'When the signpost matches the needed letter, move on to the next clue letter; otherwise keep walking.',
        'The clue is found when every one of its letters has been matched.',
      ],
      solution: {
        explanation: [
          'i is how many letters of clue have been matched so far, so clue[i] is the next one needed. j walks along path.',
          'A signpost equal to clue[i] matches it and i moves on; matching it at the earliest chance never hurts, because the remaining path only gets shorter. The clue is found when i reaches its length.',
        ],
        code: `function appearsInOrder(clue, path) {
  let i = 0;
  for (let j = 0; j < path.length && i < clue.length; j++) {
    if (path[j] === clue[i]) i++;
  }
  return i === clue.length;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is path.length.' },
      },
      visualization: {
        spec: 'clue and path are drawn as character cells, with i over the next needed clue letter and j over the signpost being read. i moves only when they match.',
        renderers: ['string-cells'],
      },
    },
  },

  'i100-012': {
    prerequisites: ['sorting', 'two-pointers'],
    related: ['i100-013', 'i100-011'],
    content: {
      statement: [
        'A lab mixes three samples at a time, and a mix is stable when the samples’ electric charges add up to exactly 0.',
        'Given the charges of the samples, return every distinct stable combination of three charges. Two mixes with the same three charge values count once, even if they use different samples.',
      ],
      inputFormat: 'charges: an array of integers.',
      outputFormat:
        'An array of triples [a, b, c] with a ≤ b ≤ c and a + b + c = 0, in increasing order (compared by a, then b, then c), each triple once.',
      constraints: ['0 ≤ charges.length ≤ 3,000', 'Charges are integers from -10^5 to 10^5.'],
      rules: [
        'Each triple uses three different samples (different positions), which may have equal charges.',
        'Each triple is listed once, with its values in increasing order.',
        'Triples are listed in increasing order.',
        'Fewer than three samples, or no stable mix: return [].',
      ],
      entry: 'zeroTriples',
      params: [{ name: 'charges', kind: 'auto' }],
      examples: [
        {
          inputs: { charges: [4, -3, -1, 0, -1, 1, 2] },
          output: [
            [-3, -1, 4],
            [-3, 1, 2],
            [-1, -1, 2],
            [-1, 0, 1],
          ],
          note: 'Four different stable mixes; -1, 0, 1 can be made two ways but is listed once.',
        },
        { inputs: { charges: [5, 1, 2] }, output: [], note: 'All positive: nothing adds up to 0.' },
      ],
      tests: [
        { inputs: { charges: [] }, output: [], note: 'No samples' },
        { inputs: { charges: [0, 0, 0, 0] }, output: [[0, 0, 0]], note: 'Four zeros, one mix' },
        { inputs: { charges: [-5, 2, 3, 3, 2] }, output: [[-5, 2, 3]], note: 'Repeated values, one mix' },
        {
          inputs: { charges: [-2, -2, 4, 1, 1, 0] },
          output: [
            [-2, -2, 4],
            [-2, 1, 1],
          ],
          note: 'Equal values in one mix',
        },
        { inputs: { charges: [7, -7, 0, 1] }, output: [[-7, 0, 7]], note: 'Opposites and zero' },
        { inputs: { charges: [1, -1] }, output: [], note: 'Only two samples' },
      ],
      starter: {
        javascript: `function zeroTriples(charges) {
  // Return every distinct [a, b, c] with a ≤ b ≤ c and a + b + c = 0, in increasing order.
  return [];
}
`,
      },
      hints: [
        'Trying every three samples is O(n³). Sorting the charges first helps a lot.',
        'Fix the smallest value of the triple, then look for two more values to its right that add up to its negative: that is a two-pointer search on a sorted array.',
        'Skip a fixed value that equals the one before it, and after a match move past equal values, so no triple is listed twice.',
      ],
      solution: {
        explanation: [
          'ordered is a sorted copy. For each position i, the triple’s smallest value is ordered[i], and lo and hi search the rest from both ends: a total below 0 needs a larger value (lo moves right), above 0 a smaller one (hi moves left).',
          'A total of 0 is a triple. Skipping an ordered[i] equal to the previous one, and moving lo past equal values after a match, lists each triple once; sorting makes them come out in increasing order.',
        ],
        code: `function zeroTriples(charges) {
  const ordered = [...charges].sort((a, b) => a - b);
  const triples = [];
  for (let i = 0; i < ordered.length - 2; i++) {
    if (i > 0 && ordered[i] === ordered[i - 1]) continue;
    let lo = i + 1;
    let hi = ordered.length - 1;
    while (lo < hi) {
      const total = ordered[i] + ordered[lo] + ordered[hi];
      if (total < 0) lo++;
      else if (total > 0) hi--;
      else {
        triples.push([ordered[i], ordered[lo], ordered[hi]]);
        lo++;
        hi--;
        while (lo < hi && ordered[lo] === ordered[lo - 1]) lo++;
      }
    }
  }
  return triples;
}
`,
        complexity: { time: 'O(n²)', space: 'O(n)', assumptions: 'n is charges.length; the sorted copy takes O(n) space.' },
      },
      visualization: {
        spec: 'The sorted charges are drawn as cells with i, lo and hi as flags. Each total is compared with 0 and moves one pointer; matches are added to the triples list.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'i100-013': {
    prerequisites: ['arrays-basics', 'two-pointers'],
    related: ['i100-012', 'i100-022'],
    content: {
      statement: [
        'A rain-barrel maker has a row of boards of different heights, one metre apart, and may keep any two of them as the walls of a tank. Water between two boards rises only as high as the shorter one.',
        'Given the board heights walls, return the most water two boards can hold: the shorter height times the distance between them.',
      ],
      inputFormat: 'walls: an array of non-negative integers.',
      outputFormat: 'An integer.',
      constraints: ['2 ≤ walls.length ≤ 100,000', '0 ≤ walls[i] ≤ 10,000'],
      rules: [
        'The water held by boards i < j is min(walls[i], walls[j]) × (j − i).',
        'Boards in between don’t block the water.',
        'Do not change walls.',
      ],
      entry: 'widestTank',
      params: [{ name: 'walls', kind: 'auto' }],
      examples: [
        { inputs: { walls: [3, 1, 6, 2, 5, 4] }, output: 15, note: 'Boards 0 and 5: min(3, 4) × 5 = 15.' },
        { inputs: { walls: [2, 2] }, output: 2, note: 'Two boards, one metre apart.' },
      ],
      tests: [
        { inputs: { walls: [1, 1] }, output: 1, note: 'The smallest tank' },
        { inputs: { walls: [5, 1, 1, 1, 5] }, output: 20, note: 'Tall boards at both ends' },
        { inputs: { walls: [1, 2, 3, 4, 5] }, output: 6, note: 'Rising heights' },
        { inputs: { walls: [9, 1, 8] }, output: 16, note: 'Shorter of the two ends' },
        { inputs: { walls: [0, 4, 0] }, output: 0, note: 'Zero-height boards hold nothing' },
        { inputs: { walls: [4, 3, 2, 1, 4] }, output: 16, note: 'Equal ends' },
      ],
      starter: {
        javascript: `function widestTank(walls) {
  // Return the most water two boards can hold.
  return 0;
}
`,
      },
      hints: [
        'Trying every pair is O(n²). Start with the widest pair, the two end boards.',
        'Moving the taller board inward can’t help: the width shrinks and the shorter board still limits the height.',
        'So always move the shorter board inward, and keep the best tank seen.',
      ],
      solution: {
        explanation: [
          'left and right start at the two ends, the widest possible tank. Its water is the shorter height times the distance.',
          'Every other tank using the shorter board is narrower and no taller, so that board can be dropped: the pointer at the shorter board moves inward. best keeps the largest tank seen.',
        ],
        code: `function widestTank(walls) {
  let left = 0;
  let right = walls.length - 1;
  let best = 0;
  while (left < right) {
    const water = Math.min(walls[left], walls[right]) * (right - left);
    best = Math.max(best, water);
    if (walls[left] < walls[right]) left++;
    else right--;
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is walls.length.' },
      },
      visualization: {
        spec: 'The heights are drawn as cells (shelves in the illustrated view) with left and right as flags. Each step shows the tank between them, and the shorter side moves in.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'i100-014': {
    prerequisites: ['arrays-basics', 'loops-and-indexes'],
    related: ['i100-083', 'i100-084'],
    content: {
      statement: [
        'A stamp collector tracked the price of one rare stamp every day. They may buy it on one day and sell it on a later day.',
        'Given prices, return the largest profit possible from one such trade, or 0 if no trade makes money.',
      ],
      inputFormat: 'prices: an array of non-negative integers, one per day.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ prices.length ≤ 100,000', '0 ≤ prices[i] ≤ 10,000'],
      rules: [
        'Selling must happen on a later day than buying.',
        'No trade at all is allowed: the answer is never below 0.',
        'Fewer than two days: return 0.',
      ],
      entry: 'bestTrade',
      params: [{ name: 'prices', kind: 'auto' }],
      examples: [
        { inputs: { prices: [9, 4, 6, 3, 8, 5] }, output: 5, note: 'Buy at 3, sell at 8.' },
        { inputs: { prices: [8, 6, 4, 2] }, output: 0, note: 'The price only falls.' },
      ],
      tests: [
        { inputs: { prices: [5] }, output: 0, note: 'One day' },
        { inputs: { prices: [] }, output: 0, note: 'No days' },
        { inputs: { prices: [1, 2] }, output: 1, note: 'Two days' },
        { inputs: { prices: [3, 3, 3] }, output: 0, note: 'Flat prices' },
        { inputs: { prices: [2, 9, 1, 5] }, output: 7, note: 'The best buy is not the lowest price' },
        { inputs: { prices: [10, 12, 4, 7, 11] }, output: 7, note: 'A later low wins' },
      ],
      starter: {
        javascript: `function bestTrade(prices) {
  // Return the largest profit from one buy followed by one later sell.
  return 0;
}
`,
      },
      hints: [
        'For each day, the best sale on that day buys at the lowest price before it.',
        'Keep the lowest price seen so far as you walk the days.',
        'The answer is the largest (price − lowest so far) over all days.',
      ],
      solution: {
        explanation: [
          'lowest is the cheapest price on any day so far, and best the largest profit found so far.',
          'Selling on the current day earns at most the price minus lowest, since lowest came on an earlier day (or the same day, earning 0). Taking the largest of those over all days is the best trade.',
        ],
        code: `function bestTrade(prices) {
  let lowest = Infinity;
  let best = 0;
  for (const p of prices) {
    lowest = Math.min(lowest, p);
    best = Math.max(best, p - lowest);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is prices.length.' },
      },
      visualization: {
        spec: 'The prices are drawn as cells with the current day marked. lowest and best are blocks that change as each day is read.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-015': {
    prerequisites: ['sliding-window', 'hash-maps'],
    related: ['i100-016', 'i100-017'],
    content: {
      statement: [
        'A painter has a fence of coloured planks, written as a string of capital letters (one letter per colour). There is enough paint to repaint at most k planks, each in any colour.',
        'Return the length of the longest run of neighbouring planks that can all end up the same colour.',
      ],
      inputFormat: 'stripes: a string of uppercase letters A–Z. k: a non-negative integer.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ stripes.length ≤ 100,000', '0 ≤ k ≤ stripes.length'],
      rules: ['Empty fence: return 0.', 'Repainting is optional: with k = 0, the answer is the longest run that is already one colour.'],
      entry: 'longestRecolor',
      params: [
        { name: 'stripes', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        { inputs: { stripes: 'RGRBBR', k: 1 }, output: 3, note: 'Repaint the G in RGR (or the R in BBR).' },
        { inputs: { stripes: 'GGBG', k: 0 }, output: 2, note: 'No paint: the longest same-colour run is GG.' },
      ],
      tests: [
        { inputs: { stripes: '', k: 2 }, output: 0, note: 'No planks' },
        { inputs: { stripes: 'A', k: 0 }, output: 1, note: 'One plank' },
        { inputs: { stripes: 'XYXY', k: 2 }, output: 4, note: 'Repaint both Ys' },
        { inputs: { stripes: 'ABCDE', k: 1 }, output: 2, note: 'All different' },
        { inputs: { stripes: 'AAAA', k: 2 }, output: 4, note: 'Paint left over' },
        { inputs: { stripes: 'RRGGGRB', k: 2 }, output: 5, note: 'Repaint the two Rs in RRGGG' },
      ],
      starter: {
        javascript: `function longestRecolor(stripes, k) {
  // Return the longest run that can be made one colour by repainting at most k planks.
  return 0;
}
`,
      },
      hints: [
        'A run can be made one colour with (its length − the count of its most common colour) repaints.',
        'Grow a window from the left to the right, counting colours inside it, and shrink it from the left when it needs more than k repaints.',
        'You only need the most common count ever seen: a window can only beat the best length if its most common colour beats that count.',
      ],
      solution: {
        explanation: [
          'The window stripes[left..right] grows one plank at a time, and counts holds each colour’s count inside it. most is the largest count any colour has reached in a window so far.',
          'A window needs length − most repaints. While that is more than k, the window gives up its leftmost plank. most never goes down: a smaller value could not make a longer valid window than one already seen, so best is still right.',
        ],
        code: `function longestRecolor(stripes, k) {
  const counts = new Map();
  let left = 0;
  let most = 0;
  let best = 0;
  for (let right = 0; right < stripes.length; right++) {
    const ch = stripes[right];
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    most = Math.max(most, counts.get(ch));
    while (right - left + 1 - most > k) {
      counts.set(stripes[left], counts.get(stripes[left]) - 1);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is stripes.length; the map holds at most 26 colours.' },
      },
      visualization: {
        spec: 'The planks are drawn as character cells with left and right as flags around the window. The counts map shows the colours inside the window.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['colour', 'count'] },
    },
  },

  'i100-016': {
    prerequisites: ['sliding-window', 'hash-maps'],
    related: ['i100-015', 'i100-001'],
    content: {
      statement: [
        'A message filter blocks a word even when its letters are shuffled. It has to decide whether a message contains the blocked word with its letters in any order, as a run of neighbouring characters.',
        'Given the blocked word fragment and the message text, return true if some run of text of the same length as fragment uses exactly its letters, and false otherwise.',
      ],
      inputFormat: 'fragment, text: strings of lowercase letters a–z.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ fragment.length ≤ 10,000', '0 ≤ text.length ≤ 10,000', 'Only lowercase letters a–z appear.'],
      rules: [
        'An empty fragment is always found: return true.',
        'The letters must sit next to each other in text, in any order.',
        'Letter counts must match exactly.',
      ],
      entry: 'containsScramble',
      params: [
        { name: 'fragment', kind: 'auto' },
        { name: 'text', kind: 'auto' },
      ],
      examples: [
        { inputs: { fragment: 'tea', text: 'aneatone' }, output: true, note: '"eat" is tea shuffled.' },
        { inputs: { fragment: 'tea', text: 'teeth' }, output: false, note: 'No run of three has t, e and a.' },
      ],
      tests: [
        { inputs: { fragment: '', text: 'abc' }, output: true, note: 'Empty fragment' },
        { inputs: { fragment: 'ab', text: '' }, output: false, note: 'Empty text' },
        { inputs: { fragment: 'abc', text: 'cba' }, output: true, note: 'The whole text' },
        { inputs: { fragment: 'aab', text: 'abab' }, output: true, note: '"aba" has two a’s and a b' },
        { inputs: { fragment: 'xy', text: 'xzy' }, output: false, note: 'The letters are not next to each other' },
        { inputs: { fragment: 'ab', text: 'b' }, output: false, note: 'Text shorter than the fragment' },
      ],
      starter: {
        javascript: `function containsScramble(fragment, text) {
  // Return true if some run of text is fragment with its letters shuffled.
  return false;
}
`,
      },
      hints: [
        'Only runs of exactly fragment.length characters can match.',
        'Slide a window of that length along text: each step adds one character on the right and drops one on the left.',
        'Keep counts of the letters the window still lacks. When nothing is missing, the window is a shuffle of fragment.',
      ],
      solution: {
        explanation: [
          'need starts as fragment’s letter counts and missing as its length. Adding a character to the window uses up one of its count (missing drops only if that letter was still needed); dropping a character gives it back.',
          'The window always covers the last fragment.length characters. When missing reaches 0, the window holds every needed letter, and since it has exactly that many characters, nothing else: it is a shuffle.',
        ],
        code: `function containsScramble(fragment, text) {
  const need = new Map();
  for (const ch of fragment) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = fragment.length;
  for (let right = 0; right < text.length; right++) {
    const ch = text[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--;
      need.set(ch, need.get(ch) - 1);
    }
    const left = right - fragment.length;
    if (left >= 0 && need.has(text[left])) {
      need.set(text[left], need.get(text[left]) + 1);
      if (need.get(text[left]) > 0) missing++;
    }
    if (missing === 0) return true;
  }
  return fragment.length === 0;
}
`,
        complexity: {
          time: 'O(n + m)',
          space: 'O(1)',
          assumptions: 'n is text.length and m fragment.length; the map holds at most 26 letters.',
        },
      },
      visualization: {
        spec: 'text is drawn as character cells with right marking the newest character of the window. The need map shows each letter’s count, which drops below 0 when the window has extra.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['letter', 'still needed'] },
    },
  },

  'i100-017': {
    prerequisites: ['sliding-window', 'hash-maps'],
    related: ['i100-016', 'i100-018'],
    content: {
      statement: [
        'A crossword setter wants the shortest stretch of a long text that contains every letter of a word list, counting repeats (two a’s needed means two a’s in the stretch).',
        'Given text and required, return the shortest run of neighbouring characters of text that contains every character of required as many times as required has it. If several are equally short, return the leftmost; if none exists, return "".',
      ],
      inputFormat: 'text, required: strings of lowercase letters a–z.',
      outputFormat: 'A string: a substring of text, or "".',
      constraints: ['0 ≤ text.length ≤ 100,000', '0 ≤ required.length ≤ 100,000'],
      rules: [
        'Repeated letters in required must appear that many times in the answer.',
        'Ties: the leftmost of the shortest runs.',
        'No run covers required, or required is empty: return "".',
      ],
      entry: 'smallestCover',
      params: [
        { name: 'text', kind: 'auto' },
        { name: 'required', kind: 'auto' },
      ],
      examples: [
        { inputs: { text: 'xaybzcab', required: 'abc' }, output: 'cab', note: 'The only run of three with a, b and c.' },
        { inputs: { text: 'aa', required: 'aaa' }, output: '', note: 'Three a’s are needed but text has two.' },
      ],
      tests: [
        { inputs: { text: 'abc', required: '' }, output: '', note: 'Nothing required' },
        { inputs: { text: '', required: 'a' }, output: '', note: 'Empty text' },
        { inputs: { text: 'a', required: 'a' }, output: 'a', note: 'The whole text' },
        { inputs: { text: 'baab', required: 'ab' }, output: 'ba', note: 'Two shortest runs: the leftmost wins' },
        { inputs: { text: 'qwbxayqcz', required: 'abc' }, output: 'bxayqc', note: 'Letters far apart' },
        { inputs: { text: 'mmnmnn', required: 'mnn' }, output: 'nmn', note: 'A repeated required letter' },
      ],
      starter: {
        javascript: `function smallestCover(text, required) {
  // Return the shortest (leftmost) run of text that contains every character of required.
  return '';
}
`,
      },
      hints: [
        'Grow a window to the right until it covers everything, then shrink it from the left while it still does.',
        'Keep a count of what the window still needs, like the shuffled-word filter, and how many characters are missing in total.',
        'Every time the window covers everything, it is a candidate: remember the shortest one.',
      ],
      solution: {
        explanation: [
          'need counts what the window still lacks of each required letter (negative means extra), and missing is how many required characters are still not covered. right grows the window one character at a time.',
          'While missing is 0, the window covers required: it is a candidate, and left moves right to look for a shorter one, giving its character back. Each index enters and leaves once, so the scan is linear. Keeping only strictly shorter candidates keeps the leftmost of equal length.',
        ],
        code: `function smallestCover(text, required) {
  if (required.length === 0) return '';
  const need = new Map();
  for (const ch of required) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = required.length;
  let left = 0;
  let bestStart = 0;
  let bestLength = Infinity;
  for (let right = 0; right < text.length; right++) {
    const ch = text[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--;
      need.set(ch, need.get(ch) - 1);
    }
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestLength = right - left + 1;
        bestStart = left;
      }
      const out = text[left];
      if (need.has(out)) {
        need.set(out, need.get(out) + 1);
        if (need.get(out) > 0) missing++;
      }
      left++;
    }
  }
  return bestLength === Infinity ? '' : text.slice(bestStart, bestStart + bestLength);
}
`,
        complexity: {
          time: 'O(n + m)',
          space: 'O(1)',
          assumptions: 'n is text.length and m required.length; the map holds at most 26 letters.',
        },
      },
      visualization: {
        spec: 'text is drawn as character cells with left and right as flags around the window; the need map shows what the window still lacks. The best start and length so far are blocks.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['letter', 'still needed'] },
    },
  },

  'i100-018': {
    prerequisites: ['sliding-window', 'hash-maps'],
    related: ['i100-017', 'i100-006'],
    content: {
      statement: [
        'A word-chain puzzle gives a long strip of letters and a set of short words that all have the same length. A chain is the words written one after another, each exactly once, in any order.',
        'Given text and words, return every index of text where a chain begins, in increasing order.',
      ],
      inputFormat: 'text: a string of lowercase letters. words: an array of strings, all of the same non-zero length.',
      outputFormat: 'An array of integers in increasing order.',
      constraints: ['0 ≤ text.length ≤ 10,000', '0 ≤ words.length ≤ 5,000', '1 ≤ each word’s length ≤ 30, the same for every word'],
      rules: [
        'Each word is used exactly once per chain; a word listed twice must appear twice.',
        'Chains may overlap: every start counts.',
        'No words: return [].',
      ],
      entry: 'chainStarts',
      params: [
        { name: 'text', kind: 'auto' },
        { name: 'words', kind: 'auto' },
      ],
      examples: [
        { inputs: { text: 'catdogdogcatcow', words: ['dog', 'cat'] }, output: [0, 6], note: '"catdog" at 0 and "dogcat" at 6.' },
        { inputs: { text: 'aabbaabb', words: ['ab', 'ba'] }, output: [1, 3], note: 'Chains can start at odd positions too.' },
      ],
      tests: [
        { inputs: { text: 'aaaaaa', words: ['aa', 'aa'] }, output: [0, 1, 2], note: 'A repeated word, overlapping chains' },
        { inputs: { text: 'xyzxyz', words: ['xyz'] }, output: [0, 3], note: 'One word' },
        { inputs: { text: 'abcd', words: [] }, output: [], note: 'No words' },
        { inputs: { text: 'ab', words: ['abc'] }, output: [], note: 'Text shorter than a chain' },
        { inputs: { text: 'redtanredtan', words: ['red', 'tan'] }, output: [0, 3, 6], note: 'Three overlapping chains' },
      ],
      starter: {
        javascript: `function chainStarts(text, words) {
  // Return every index where all the words, each once in some order, begin.
  return [];
}
`,
      },
      hints: [
        'A chain has a fixed length: words.length × the word length. Checking every start that way works, but repeats a lot of work.',
        'A chain is made of whole words, so read text in word-sized steps. Do that once for each starting offset from 0 to the word length − 1.',
        'Within one offset, keep a window of word counts like a sliding window: add the next word, drop words from the left while some word appears too often, and record the start when the window holds every word.',
      ],
      solution: {
        explanation: [
          'need counts each word. For each offset, right reads text one word at a time; seen counts the words in the window that starts at left, and used is how many words it holds. A word that isn’t needed breaks every chain through it, so the window restarts after it.',
          'If the new word appears more often than needed, words leave from the left until it doesn’t. When used equals words.length, the window is a chain: its start is recorded and its first word leaves so the search can continue. The starts from all offsets are sorted at the end.',
        ],
        code: `function chainStarts(text, words) {
  if (words.length === 0) return [];
  const size = words[0].length;
  const need = new Map();
  for (const w of words) need.set(w, (need.get(w) ?? 0) + 1);
  const starts = [];
  for (let offset = 0; offset < size; offset++) {
    let seen = new Map();
    let used = 0;
    let left = offset;
    for (let right = offset; right + size <= text.length; right += size) {
      const word = text.slice(right, right + size);
      if (!need.has(word)) {
        seen = new Map();
        used = 0;
        left = right + size;
        continue;
      }
      seen.set(word, (seen.get(word) ?? 0) + 1);
      used++;
      while (seen.get(word) > need.get(word)) {
        const first = text.slice(left, left + size);
        seen.set(first, seen.get(first) - 1);
        used--;
        left += size;
      }
      if (used === words.length) {
        starts.push(left);
        const first = text.slice(left, left + size);
        seen.set(first, seen.get(first) - 1);
        used--;
        left += size;
      }
    }
  }
  return starts.sort((a, b) => a - b);
}
`,
        complexity: {
          time: 'O(n · L)',
          space: 'O(m · L)',
          assumptions:
            'n is text.length, L the word length and m words.length; each word is cut out once per step, and map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'text is drawn as character cells with left and right marking the window, which moves one word at a time. The need and seen maps show the word counts.',
        renderers: ['string-cells', 'hash-map', 'array-cells'],
      },
    },
  },

  'i100-019': {
    prerequisites: ['stacks'],
    related: ['i100-020', 'i100-054'],
    content: {
      statement: [
        'A hotel’s luggage room stacks suitcases on one pile: a new case goes on top, and only the top case can be taken off. The porter also needs to say, at any moment and without searching the pile, how light the lightest case on it is.',
        'Process ops in order. ["push", w] puts a case weighing w on top, ["pop"] takes the top case off, ["top"] reports the top case’s weight, and ["min"] reports the lightest weight on the pile. Return one entry per operation: null for push and pop, and the reported weight for top and min.',
      ],
      inputFormat: 'ops: an array of operations, each ["push", w], ["pop"], ["top"] or ["min"], with w an integer.',
      outputFormat: 'An array with one entry per operation.',
      constraints: ['1 ≤ ops.length ≤ 30,000', 'Weights are integers from -2^31 to 2^31 − 1.'],
      rules: [
        'pop, top and min on an empty pile do nothing and report null.',
        'Every operation must take O(1) time: min can’t search the pile.',
        'Equal weights count separately: popping one of two equal lightest cases leaves the other.',
      ],
      entry: 'minStack',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: { ops: [['push', 5], ['push', 2], ['push', 8], ['min'], ['pop'], ['min'], ['pop'], ['min']] },
          output: [null, null, null, 2, null, 2, null, 5],
          note: 'The lightest is 2 until the 2 itself is taken off.',
        },
        {
          inputs: { ops: [['push', 7], ['pop'], ['push', 9], ['min']] },
          output: [null, null, null, 9],
          note: 'An emptied pile starts over.',
        },
      ],
      tests: [
        { inputs: { ops: [['min'], ['pop'], ['top']] }, output: [null, null, null], note: 'Empty pile' },
        { inputs: { ops: [['push', 3], ['push', 3], ['pop'], ['min']] }, output: [null, null, null, 3], note: 'Equal weights' },
        { inputs: { ops: [['push', -1], ['push', 4], ['top'], ['min']] }, output: [null, null, 4, -1], note: 'top and min differ' },
        {
          inputs: { ops: [['push', 6], ['push', 4], ['push', 9], ['push', 1], ['min'], ['pop'], ['pop'], ['min'], ['top']] },
          output: [null, null, null, null, 1, null, null, 4, 4],
          note: 'The minimum goes back to an earlier one',
        },
      ],
      starter: {
        javascript: `function minStack(ops) {
  // Return null for push and pop, and the weight for top and min.
  return ops.map(() => null);
}
`,
      },
      hints: [
        'Searching the pile for the lightest case is O(n) per question. What can you remember instead?',
        'When a case goes on, the lightest weight is either the new case or the lightest weight under it.',
        'Keep a second pile alongside the first: for every case, the lightest weight from it down. It goes on and comes off together with the case.',
      ],
      solution: {
        explanation: [
          'stack holds the weights, and mins[i] is the lightest weight among stack[0..i]. A new case’s entry is the smaller of its weight and the entry below.',
          'Taking a case off removes its entry from both piles, so the top of mins is always the lightest weight on the pile: every operation is O(1).',
        ],
        code: `function minStack(ops) {
  const stack = [];
  const mins = [];
  const out = [];
  for (const op of ops) {
    if (op[0] === 'push') {
      stack.push(op[1]);
      mins.push(mins.length === 0 ? op[1] : Math.min(op[1], mins[mins.length - 1]));
      out.push(null);
    } else if (stack.length === 0) {
      out.push(null);
    } else if (op[0] === 'pop') {
      stack.pop();
      mins.pop();
      out.push(null);
    } else if (op[0] === 'top') {
      out.push(stack[stack.length - 1]);
    } else {
      out.push(mins[mins.length - 1]);
    }
  }
  return out;
}
`,
        complexity: { time: 'O(1) per operation', space: 'O(n)', assumptions: 'n is the largest number of cases on the pile.' },
      },
      visualization: {
        spec: 'stack and mins are drawn as two stacks side by side, growing and shrinking together; the answers fill the out array.',
        renderers: ['stack', 'array-cells'],
      },
    },
  },

  'i100-020': {
    prerequisites: ['stacks'],
    related: ['i100-019', 'i100-023'],
    content: {
      statement: [
        'An old engineering calculator takes numbers first and the operation after them: "3 4 +" means 3 + 4, and "3 4 + 2 *" means (3 + 4) × 2. This is postfix order; it needs no parentheses.',
        'Given the expression as a list of tokens, return its value. Tokens are integers or one of +, −, * and /, and division keeps only the integer part of the result, rounding toward zero.',
      ],
      inputFormat: 'tokens: an array of strings, each an integer (possibly negative) or one of "+", "-", "*", "/".',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ tokens.length ≤ 10,000', 'The expression is valid, never divides by zero, and every result fits in 32 bits.'],
      rules: [
        'An operator applies to the two values before it: "a b −" is a − b and "a b /" is a / b.',
        'Division rounds toward zero: 7 / −2 is −3 and −9 / 4 is −2 (not rounded down).',
        'A single number is its own value.',
      ],
      entry: 'evalPostfix',
      params: [{ name: 'tokens', kind: 'auto' }],
      examples: [
        { inputs: { tokens: ['3', '4', '+', '2', '*'] }, output: 14, note: '(3 + 4) × 2.' },
        { inputs: { tokens: ['20', '3', '-', '4', '/'] }, output: 4, note: '(20 − 3) / 4 = 4.25, which rounds toward zero to 4.' },
      ],
      tests: [
        { inputs: { tokens: ['9'] }, output: 9, note: 'One number' },
        { inputs: { tokens: ['2', '3', '*', '4', '+'] }, output: 10, note: '2 × 3 + 4' },
        { inputs: { tokens: ['7', '-2', '/'] }, output: -3, note: 'Negative division rounds toward zero' },
        { inputs: { tokens: ['6', '10', '-'] }, output: -4, note: 'Order matters: 6 − 10' },
        { inputs: { tokens: ['1', '2', '+', '3', '4', '+', '*'] }, output: 21, note: '(1 + 2) × (3 + 4)' },
        { inputs: { tokens: ['-9', '4', '/'] }, output: -2, note: 'Toward zero, not down' },
      ],
      starter: {
        javascript: `function evalPostfix(tokens) {
  // Return the value of the postfix expression.
  return 0;
}
`,
      },
      hints: [
        'Read the tokens left to right and keep the numbers you have seen on a stack.',
        'An operator takes the two most recent numbers off the stack, combines them, and puts the result back.',
        'The second number taken off is the left operand. For division, round toward zero; in Python, // rounds down instead, so use int(a / b).',
      ],
      solution: {
        explanation: [
          'stack holds the values not used yet. A number is pushed. An operator pops b (the right operand) and then a (the left one) and pushes a combined with b.',
          'Each operator’s operands are exactly the two values just before it, which is what the stack’s top two are. At the end the stack holds the expression’s value.',
        ],
        code: `function evalPostfix(tokens) {
  const stack = [];
  for (const t of tokens) {
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      const b = stack.pop();
      const a = stack.pop();
      if (t === '+') stack.push(a + b);
      else if (t === '-') stack.push(a - b);
      else if (t === '*') stack.push(a * b);
      else stack.push(Math.trunc(a / b));
    } else {
      stack.push(Number(t));
    }
  }
  return stack[0];
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is tokens.length.' },
      },
      visualization: {
        spec: 'The tokens are drawn as cells and the values as a stack: numbers go on, and each operator takes two off and puts their result back.',
        renderers: ['stack', 'array-cells'],
      },
    },
  },

  'i100-021': {
    prerequisites: ['stacks', 'sorting'],
    related: ['i100-022', 'i100-019'],
    content: {
      statement: [
        'Cars drive along a one-lane road toward a town target kilometres from the start. Car i starts at position[i] and drives at speed[i] kilometres per hour. A car can never pass the one in front: when it catches up, it slows down and the two drive on together as one group.',
        'Return how many groups arrive at the town. A car that catches up exactly at the town arrives with that group.',
      ],
      inputFormat:
        'target: a positive integer. position, speed: arrays of the same length; positions are distinct integers from 0 to target − 1, speeds positive integers.',
      outputFormat: 'An integer: the number of groups that arrive.',
      constraints: ['0 ≤ position.length ≤ 100,000', '0 < target ≤ 10^6', 'All positions are different.'],
      rules: [
        'No cars: return 0.',
        'A group drives at the speed of its slowest (front) car.',
        'Catching up exactly at the town counts as arriving together.',
      ],
      entry: 'convoyCount',
      params: [
        { name: 'target', kind: 'auto' },
        { name: 'position', kind: 'auto' },
        { name: 'speed', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { target: 20, position: [2, 12, 8, 16], speed: [3, 2, 4, 1] },
          output: 2,
          note: 'The cars at 16, 12 and 8 all need 4 hours or less on their own, so they reach the car at 16 and arrive with it after 4 hours; the car at 2 needs 6 hours.',
        },
        { inputs: { target: 10, position: [0], speed: [5] }, output: 1, note: 'One car is one group.' },
      ],
      tests: [
        { inputs: { target: 10, position: [], speed: [] }, output: 0, note: 'No cars' },
        { inputs: { target: 10, position: [3, 5, 7], speed: [1, 1, 1] }, output: 3, note: 'Same speed: nobody catches up' },
        { inputs: { target: 10, position: [6, 2], speed: [1, 8] }, output: 1, note: 'A fast car behind catches up' },
        {
          inputs: { target: 30, position: [0, 10, 20], speed: [3, 2, 1] },
          output: 1,
          note: 'Everyone reaches the town at the same moment',
        },
        { inputs: { target: 12, position: [4, 8], speed: [2, 1] }, output: 1, note: 'Catching up exactly at the town' },
      ],
      starter: {
        javascript: `function convoyCount(target, position, speed) {
  // Return how many groups of cars arrive at the town.
  return 0;
}
`,
      },
      hints: [
        'Think about the cars from the front (closest to the town) to the back.',
        'Work out how long each car would take on its own. A car behind that would arrive no later than the group in front of it joins that group.',
        'Keep the arrival times of the groups formed so far; only a car that would arrive strictly later starts a new group.',
      ],
      solution: {
        explanation: [
          'cars are sorted from the front of the road to the back. Each car’s time is how long it would need alone: (target − position) / speed.',
          'fleets holds the arrival time of each group, the last one being the group just ahead. A car whose time is no more than that catches up before (or at) the town and joins it; a car that would arrive later can never catch up, so it starts a new group.',
        ],
        code: `function convoyCount(target, position, speed) {
  const cars = position.map((p, i) => [p, speed[i]]).sort((a, b) => b[0] - a[0]);
  const fleets = [];
  for (const [p, s] of cars) {
    const time = (target - p) / s;
    if (fleets.length === 0 || time > fleets[fleets.length - 1]) fleets.push(time);
  }
  return fleets.length;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is position.length; sorting dominates.' },
      },
      visualization: {
        spec: 'The cars are drawn as rows of [position, speed], sorted from the front; fleets is a stack of arrival times that grows only when a car can’t catch up.',
        renderers: ['grid', 'stack'],
      },
    },
  },

  'i100-022': {
    prerequisites: ['monotonic-stack', 'stacks'],
    related: ['i100-021', 'i100-013'],
    content: {
      statement: [
        'An advertising company wants to hang the largest possible rectangular billboard on a row of buildings. The buildings stand side by side, each 1 unit wide, with the heights given; the billboard must fit within the buildings it covers.',
        'Return the largest area a billboard can have: its width is the number of neighbouring buildings it spans, and its height can be at most the lowest of them.',
      ],
      inputFormat: 'heights: an array of non-negative integers.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ heights.length ≤ 100,000', '0 ≤ heights[i] ≤ 10,000'],
      rules: ['No buildings: return 0.', 'The billboard spans one or more neighbouring buildings.', 'Do not change heights.'],
      entry: 'largestBillboard',
      params: [{ name: 'heights', kind: 'auto' }],
      examples: [
        { inputs: { heights: [3, 1, 4, 4, 2, 5] }, output: 8, note: 'Height 4 over the two 4s, or height 2 over the last four buildings.' },
        { inputs: { heights: [2, 2, 2] }, output: 6, note: 'The whole row.' },
      ],
      tests: [
        { inputs: { heights: [] }, output: 0, note: 'No buildings' },
        { inputs: { heights: [4] }, output: 4, note: 'One building' },
        { inputs: { heights: [1, 2, 3, 4] }, output: 6, note: 'Rising heights' },
        { inputs: { heights: [5, 4, 1, 2] }, output: 8, note: 'Height 4 over the first two' },
        { inputs: { heights: [0, 0] }, output: 0, note: 'Nothing to hang on' },
        { inputs: { heights: [6, 2, 5, 4, 5, 1, 6] }, output: 12, note: 'Height 4 over three buildings' },
      ],
      starter: {
        javascript: `function largestBillboard(heights) {
  // Return the largest rectangle that fits under the buildings.
  return 0;
}
`,
      },
      hints: [
        'The best billboard has the height of some building: the lowest one it covers. For each building, how far could a billboard of its height reach left and right?',
        'It reaches until a lower building on each side. Finding those for every building one by one is O(n²).',
        'Keep a stack of buildings with increasing heights. When a lower building arrives, every taller building on the stack has found its right edge, and the building below it on the stack is its left edge.',
      ],
      solution: {
        explanation: [
          'stack holds indexes of buildings with increasing heights that have not found a lower building to their right yet. A pretend building of height 0 at the end makes every building find one.',
          'When building i is no taller than the top of the stack, that top building can’t reach past i, and the building below it on the stack is the first lower one to its left. So its billboard spans between them: heights[top] × (i − left − 1). Each index is pushed and popped once.',
        ],
        code: `function largestBillboard(heights) {
  const stack = []; // indexes with increasing heights
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop();
      const left = stack.length === 0 ? -1 : stack[stack.length - 1];
      best = Math.max(best, heights[top] * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is heights.length; each index is pushed and popped once.' },
      },
      visualization: {
        spec: 'The heights are drawn as cells with i marked; the stack holds indexes of rising buildings. Each pop shows the billboard that building can carry.',
        renderers: ['array-cells', 'stack'],
      },
    },
  },

  'i100-023': {
    prerequisites: ['stacks', 'strings-and-chars'],
    related: ['i100-020', 'i100-019'],
    content: {
      statement: [
        'A pocket calculator app gets a typed expression with whole numbers, + and −, parentheses and spaces, such as "7 - (2 + 3)". It has to work the value out itself, without handing the text to a built-in evaluator.',
        'Return the value of expression. A − sign can also stand at the very start or right after "(" to negate what follows, as in "-(4 - 10)".',
      ],
      inputFormat: 'expression: a string of digits, "+", "-", "(", ")" and spaces.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ expression.length ≤ 300,000', 'The expression is valid; every intermediate value fits in 32 bits.'],
      rules: [
        'Operators of the same level work left to right: 10 − 2 − 3 is 5.',
        'A − at the start or after "(" negates the number or parentheses that follow it.',
        'Spaces can appear anywhere between tokens.',
        'Do not use a built-in evaluator (eval, Function or similar).',
      ],
      entry: 'calculate',
      params: [{ name: 'expression', kind: 'auto' }],
      examples: [
        { inputs: { expression: '7 - (2 + 3)' }, output: 2, note: '7 − 5.' },
        { inputs: { expression: '-(4 - 10) + 1' }, output: 7, note: '−(−6) + 1.' },
      ],
      tests: [
        { inputs: { expression: '42' }, output: 42, note: 'A number on its own' },
        { inputs: { expression: ' 1 + 1 ' }, output: 2, note: 'Spaces around everything' },
        { inputs: { expression: '10 - 2 - 3' }, output: 5, note: 'Left to right' },
        { inputs: { expression: '-(-(5))' }, output: 5, note: 'Nested negation' },
        { inputs: { expression: '(12 - (3 + 4)) + 20' }, output: 25, note: 'Nested parentheses' },
        { inputs: { expression: '8-(3-(2-1))' }, output: 6, note: 'Signs flip inside parentheses' },
      ],
      starter: {
        javascript: `function calculate(expression) {
  // Return the value of the expression, without eval.
  return 0;
}
`,
      },
      hints: [
        'Without parentheses, keep a running total and the sign of the next number.',
        'A number can have several digits: build it digit by digit before adding it.',
        'At "(", save the total so far and the sign in front of the parentheses on a stack and start a fresh total; at ")", combine the inner total with what you saved.',
      ],
      solution: {
        explanation: [
          'total is the value of the current level so far, and sign (+1 or −1) applies to the next number. Digits are read into one whole number n, which is added as sign × n.',
          'At "(", the outer total and the sign in front of the parentheses are pushed, and the inside starts from 0. At ")", the inside’s total is combined with them: before + sign × total. The stack makes nesting work at any depth.',
        ],
        code: `function calculate(expression) {
  const stack = []; // [total, sign] saved at each "("
  let total = 0;
  let sign = 1;
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (ch >= '0' && ch <= '9') {
      let n = 0;
      while (i < expression.length && expression[i] >= '0' && expression[i] <= '9') {
        n = n * 10 + (expression.charCodeAt(i) - 48);
        i++;
      }
      total += sign * n;
      continue;
    }
    if (ch === '+') sign = 1;
    else if (ch === '-') sign = -1;
    else if (ch === '(') {
      stack.push([total, sign]);
      total = 0;
      sign = 1;
    } else if (ch === ')') {
      const [before, outer] = stack.pop();
      total = before + outer * total;
    }
    i++;
  }
  return total;
}
`,
        complexity: { time: 'O(n)', space: 'O(d)', assumptions: 'n is expression.length and d the deepest nesting of parentheses.' },
      },
      visualization: {
        spec: 'The expression is drawn as character cells with i over the character being read. total and sign are blocks, and the stack holds the [total, sign] pairs saved at each "(".',
        renderers: ['string-cells', 'stack'],
      },
    },
  },

  'i100-024': {
    prerequisites: ['binary-search-idea'],
    related: ['i100-025', 'i100-027'],
    content: {
      statement: [
        'A weather station logs readings that only ever rise, in a ring buffer. The buffer was read starting at an unknown position, so the list rises, then drops once to its smallest reading, and rises again: like [15, 18, 22, 3, 7, 11].',
        'Given the readings (all different), return the smallest one in O(log n) time.',
      ],
      inputFormat: 'readings: a non-empty array of distinct integers, sorted increasing and then rotated by some amount (possibly 0).',
      outputFormat: 'An integer: the smallest reading.',
      constraints: ['1 ≤ readings.length ≤ 5,000', 'All readings are different.'],
      rules: ['The list may not be rotated at all.', 'Use O(log n) time: a scan of every reading is too slow.', 'Do not change readings.'],
      entry: 'rotationLow',
      params: [{ name: 'readings', kind: 'auto' }],
      examples: [
        { inputs: { readings: [15, 18, 22, 3, 7, 11] }, output: 3, note: 'The drop is between 22 and 3.' },
        { inputs: { readings: [2, 9] }, output: 2, note: 'Not rotated.' },
      ],
      tests: [
        { inputs: { readings: [5] }, output: 5, note: 'One reading' },
        { inputs: { readings: [9, 2] }, output: 2, note: 'Rotated by one' },
        { inputs: { readings: [1, 2, 3, 4] }, output: 1, note: 'Not rotated' },
        { inputs: { readings: [30, 40, 50, 10, 20] }, output: 10, note: 'Drop in the middle' },
        { inputs: { readings: [6, 7, 8, 9, 1] }, output: 1, note: 'The smallest is last' },
      ],
      starter: {
        javascript: `function rotationLow(readings) {
  // Return the smallest reading in O(log n) time.
  return readings[0];
}
`,
      },
      hints: [
        'Compare the middle reading with the last one.',
        'If the middle reading is larger than the last, the drop (and the smallest reading) is to the right of the middle.',
        'Otherwise the part from the middle to the end rises, so the smallest is the middle or to its left.',
      ],
      solution: {
        explanation: [
          'lo..hi always contains the smallest reading. If readings[mid] > readings[hi], the list drops somewhere after mid, so the smallest is right of mid.',
          'Otherwise mid..hi rises with no drop, so the smallest is at mid or before it: hi moves to mid. The range halves each time until lo = hi.',
        ],
        code: `function rotationLow(readings) {
  let lo = 0;
  let hi = readings.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (readings[mid] > readings[hi]) lo = mid + 1;
    else hi = mid;
  }
  return readings[lo];
}
`,
        complexity: { time: 'O(log n)', space: 'O(1)', assumptions: 'n is readings.length.' },
      },
      visualization: {
        spec: 'The readings are drawn as cells (shelves in the illustrated view) with lo, mid and hi as flags; the half that can’t hold the minimum is dimmed after each comparison.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'i100-025': {
    prerequisites: ['binary-search-idea'],
    related: ['i100-024', 'i100-027'],
    content: {
      statement: [
        'A hiking app stores a trail’s heights in walking order. Along this trail the path only climbs until the summit and only descends after it (the summit may also be the first or the last point).',
        'Return the index of the summit, using O(log n) time.',
      ],
      inputFormat: 'heights: a non-empty array of integers that strictly increases and then strictly decreases (either part may be empty).',
      outputFormat: 'An integer: the index of the largest height.',
      constraints: ['1 ≤ heights.length ≤ 100,000', 'Neighbouring heights are never equal.'],
      rules: ['There is exactly one summit.', 'Use O(log n) time.', 'Do not change heights.'],
      entry: 'peakIndex',
      params: [{ name: 'heights', kind: 'auto' }],
      examples: [
        { inputs: { heights: [1, 4, 8, 6, 2] }, output: 2, note: 'Up to 8, then down.' },
        { inputs: { heights: [10, 7, 3] }, output: 0, note: 'Downhill from the start.' },
      ],
      tests: [
        { inputs: { heights: [5] }, output: 0, note: 'One point' },
        { inputs: { heights: [1, 2] }, output: 1, note: 'Uphill to the end' },
        { inputs: { heights: [2, 1] }, output: 0, note: 'Downhill only' },
        { inputs: { heights: [1, 3, 5, 7, 9, 4] }, output: 4, note: 'Summit near the end' },
        { inputs: { heights: [0, 9, 8, 7, 6, 5, 4] }, output: 1, note: 'Summit near the start' },
      ],
      starter: {
        javascript: `function peakIndex(heights) {
  // Return the index of the summit in O(log n) time.
  return 0;
}
`,
      },
      hints: [
        'Look at the middle point and the point right after it.',
        'If the next point is higher, you are still climbing: the summit is to the right.',
        'If it is lower, you are past the summit or on it: the summit is at the middle or to its left.',
      ],
      solution: {
        explanation: [
          'lo..hi always contains the summit. Comparing heights[mid] with heights[mid + 1] tells which side of the summit mid is on.',
          'A higher next point means mid is on the way up, so the summit is right of mid. Otherwise mid is on the way down or is the summit, so hi moves to mid. The range halves until one index is left.',
        ],
        code: `function peakIndex(heights) {
  let lo = 0;
  let hi = heights.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (heights[mid] < heights[mid + 1]) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
`,
        complexity: { time: 'O(log n)', space: 'O(1)', assumptions: 'n is heights.length.' },
      },
      visualization: {
        spec: 'The heights are drawn as cells (shelves in the illustrated view) with lo, mid and hi as flags; each comparison of mid with its right neighbour dims the side that can’t hold the summit.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'i100-026': {
    prerequisites: ['hash-maps', 'binary-search-idea'],
    related: ['i100-024', 'i100-058'],
    content: {
      statement: [
        'A smart-home hub records every setting change with a timestamp, such as "lamp" set to "on" at time 4. Later, it is asked what a device was set to at some moment.',
        'Process ops in order. ["set", key, value, time] records that key took value at time; ["get", key, time] asks for the value key had at time: the value of its latest record at or before that time, or "" if there is none. Return null for each set and the answer for each get.',
      ],
      inputFormat:
        'ops: an array of ["set", key, value, time] and ["get", key, time] operations; keys and values are strings, times positive integers.',
      outputFormat: 'An array with one entry per operation.',
      constraints: [
        '1 ≤ ops.length ≤ 200,000',
        'For each key, set operations come with strictly increasing times.',
        'Times are integers from 1 to 10^7.',
      ],
      rules: [
        'get returns the value of the latest record with time ≤ the asked time.',
        'A key with no record at or before the time gives "".',
        'Each key has its own history.',
      ],
      entry: 'versionStore',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: {
            ops: [
              ['set', 'lamp', 'off', 1],
              ['set', 'lamp', 'on', 4],
              ['get', 'lamp', 3],
              ['get', 'lamp', 4],
              ['get', 'lamp', 9],
              ['get', 'fan', 5],
            ],
          },
          output: [null, null, 'off', 'on', 'on', ''],
          note: 'At 3 the lamp was still off; fan was never set.',
        },
        {
          inputs: {
            ops: [
              ['set', 'door', 'shut', 5],
              ['get', 'door', 4],
              ['get', 'door', 5],
            ],
          },
          output: [null, '', 'shut'],
          note: 'Before its first record, a key has no value.',
        },
      ],
      tests: [
        { inputs: { ops: [['get', 'door', 1]] }, output: [''], note: 'Nothing recorded yet' },
        {
          inputs: {
            ops: [
              ['set', 'a', 'x', 1],
              ['set', 'b', 'y', 2],
              ['set', 'a', 'z', 3],
              ['get', 'a', 2],
              ['get', 'b', 2],
              ['get', 'a', 3],
            ],
          },
          output: [null, null, null, 'x', 'y', 'z'],
          note: 'Keys keep separate histories',
        },
        {
          inputs: {
            ops: [
              ['set', 'k', '1', 2],
              ['set', 'k', '2', 4],
              ['set', 'k', '3', 6],
              ['set', 'k', '4', 8],
              ['get', 'k', 7],
              ['get', 'k', 1],
              ['get', 'k', 100],
            ],
          },
          output: [null, null, null, null, '3', '', '4'],
          note: 'Between records, before the first, after the last',
        },
        {
          inputs: {
            ops: [
              ['set', 'heat', 'low', 10],
              ['get', 'heat', 10],
              ['set', 'heat', 'high', 20],
              ['get', 'heat', 15],
            ],
          },
          output: [null, 'low', null, 'low'],
          note: 'Reading and writing interleaved',
        },
      ],
      starter: {
        javascript: `function versionStore(ops) {
  // Return null for each set and the value at the asked time for each get.
  return ops.map(() => null);
}
`,
      },
      hints: [
        'Keep each key’s records in a map from key to a list of [time, value] pairs.',
        'Records for one key arrive in increasing time, so its list stays sorted.',
        'A get is a binary search in that list for the last time that is not after the asked time.',
      ],
      solution: {
        explanation: [
          'history maps each key to its records as [time, value] pairs. Because sets for a key come in increasing time, appending keeps each list sorted.',
          'A get binary-searches the key’s list for the first record later than the asked time (lo ends there); the record before it is the latest one at or before the time. lo = 0 means there is none.',
        ],
        code: `function versionStore(ops) {
  const history = new Map(); // key → [time, value] pairs in increasing time
  const out = [];
  for (const op of ops) {
    if (op[0] === 'set') {
      if (!history.has(op[1])) history.set(op[1], []);
      history.get(op[1]).push([op[3], op[2]]);
      out.push(null);
    } else {
      const list = history.get(op[1]) ?? [];
      let lo = 0;
      let hi = list.length; // lo ends at the first record later than the time
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (list[mid][0] <= op[2]) lo = mid + 1;
        else hi = mid;
      }
      out.push(lo === 0 ? '' : list[lo - 1][1]);
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(log r) per get, O(1) per set',
          space: 'O(r)',
          assumptions: 'r is the number of set operations; map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The history map shows each key with its list of [time, value] records; during a get, lo, mid and hi move over that list. The answers fill out.',
        renderers: ['hash-map', 'array-cells'],
      },
      view: { mapColumns: ['key', 'records'] },
    },
  },

  'i100-027': {
    prerequisites: ['binary-search-idea', 'sorting'],
    related: ['i100-024', 'i100-025'],
    content: {
      statement: [
        'Two judges each scored some performances and sorted their scores from lowest to highest. The festival’s result is the median of all the scores together: the middle score, or the average of the two middle scores when there is an even number of them.',
        'Given the two sorted lists a and b, return the median of all their scores in O(log(m + n)) time, without merging them.',
      ],
      inputFormat: 'a, b: arrays of integers, each sorted in increasing order, not both empty.',
      outputFormat: 'A number: the median (it can end in .5).',
      constraints: ['0 ≤ a.length, b.length ≤ 1,000', '1 ≤ a.length + b.length ≤ 2,000', 'Scores are integers from -10^6 to 10^6.'],
      rules: [
        'Odd total: the middle score. Even total: the average of the two middle scores.',
        'Either list may be empty, and scores may repeat.',
        'Use O(log(m + n)) time: merging the lists is O(m + n).',
      ],
      entry: 'combinedMedian',
      params: [
        { name: 'a', kind: 'auto' },
        { name: 'b', kind: 'auto' },
      ],
      examples: [
        { inputs: { a: [1, 4, 9], b: [2, 3] }, output: 3, note: 'All together: 1 2 3 4 9.' },
        { inputs: { a: [5, 8], b: [1, 2, 10, 12] }, output: 6.5, note: '1 2 5 8 10 12: the average of 5 and 8.' },
      ],
      tests: [
        { inputs: { a: [], b: [7] }, output: 7, note: 'One empty list' },
        { inputs: { a: [], b: [1, 2] }, output: 1.5, note: 'Even total from one list' },
        { inputs: { a: [1, 1], b: [1, 1] }, output: 1, note: 'All equal' },
        { inputs: { a: [3], b: [1, 2, 4, 5] }, output: 3, note: 'The middle comes from the short list' },
        { inputs: { a: [-5, -1], b: [0, 6] }, output: -0.5, note: 'Negative median' },
        { inputs: { a: [2, 4, 6, 8], b: [1] }, output: 4, note: 'The short list is all low' },
      ],
      starter: {
        javascript: `function combinedMedian(a, b) {
  // Return the median of all the scores in a and b together.
  return 0;
}
`,
      },
      hints: [
        'The median splits all the scores into a lower half and an upper half. Take i scores from a and the rest of the lower half from b.',
        'A split is right when the largest score on the left of each cut is no bigger than the smallest score on the right of the other cut.',
        'Binary-search i in the shorter list: if a’s left side is too big, take fewer from a; if b’s left side is too big, take more.',
      ],
      solution: {
        explanation: [
          'The lower half has half = ⌊(m + n + 1) / 2⌋ scores: i of them from a (the shorter list) and j = half − i from b. Beside the cuts are aLeft, aRight, bLeft and bRight, with −∞ and ∞ standing in past the ends.',
          'The split is right when aLeft ≤ bRight and bLeft ≤ aRight: then the lower half’s largest score is the median (odd total), or it is averaged with the upper half’s smallest (even total). If aLeft is too big, i is too large; otherwise it is too small. Binary search over i takes O(log min(m, n)) steps.',
        ],
        code: `function combinedMedian(a, b) {
  if (a.length > b.length) return combinedMedian(b, a);
  const total = a.length + b.length;
  const half = Math.floor((total + 1) / 2);
  let lo = 0;
  let hi = a.length;
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2); // scores taken from a
    const j = half - i; // scores taken from b
    const aLeft = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < a.length ? a[i] : Infinity;
    const bLeft = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < b.length ? b[j] : Infinity;
    if (aLeft <= bRight && bLeft <= aRight) {
      const leftMax = Math.max(aLeft, bLeft);
      if (total % 2 === 1) return leftMax;
      return (leftMax + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1;
    else lo = i + 1;
  }
  return 0;
}
`,
        complexity: { time: 'O(log min(m, n))', space: 'O(1)', assumptions: 'm and n are the lists’ lengths.' },
      },
      visualization: {
        spec: 'Both lists are drawn as cells with i and j marking the cuts; the four values beside the cuts decide which way the search moves.',
        renderers: ['array-cells', 'call-stack'],
      },
    },
  },

  'i100-028': {
    prerequisites: ['linked-list-basics', 'fast-slow-pointers'],
    related: ['i100-029', 'i100-033'],
    content: {
      statement: [
        'A train’s carriages are linked in a chain from the engine back. The conductor has to uncouple the carriage that is n places from the back, walking the train only once.',
        'Given the head of the linked list and n, remove the n-th node from the end and return the head of the list.',
      ],
      inputFormat: 'head: a linked list of integers. n: an integer from 1 to the list’s length.',
      outputFormat: 'The list after the removal.',
      constraints: ['1 ≤ list length ≤ 30', '1 ≤ n ≤ list length'],
      rules: [
        'n = 1 is the last node; n = the length is the head.',
        'Walk the list only once.',
        'Reuse the existing nodes: only one next reference changes.',
      ],
      entry: 'removeFromEnd',
      params: [
        { name: 'head', kind: 'list' },
        { name: 'n', kind: 'auto' },
      ],
      resultKind: 'list',
      examples: [
        { inputs: { head: [4, 8, 15, 16, 23], n: 2 }, output: [4, 8, 15, 23], note: '16 is second from the back.' },
        { inputs: { head: [9], n: 1 }, output: [], note: 'Removing the only node leaves an empty list.' },
      ],
      tests: [
        { inputs: { head: [1, 2], n: 2 }, output: [2], note: 'Remove the head' },
        { inputs: { head: [1, 2], n: 1 }, output: [1], note: 'Remove the tail' },
        { inputs: { head: [5, 6, 7], n: 3 }, output: [6, 7], note: 'n is the whole length' },
        { inputs: { head: [3, 1, 4, 1, 5], n: 1 }, output: [3, 1, 4, 1], note: 'Last node' },
      ],
      starter: {
        javascript: `function removeFromEnd(head, n) {
  // Remove the n-th node from the end and return the head.
  return head;
}
`,
      },
      hints: [
        'Counting the length first takes two walks. Can two pointers do it in one?',
        'Send one pointer n steps ahead, then move both until the front one reaches the end: the back one is then just before the node to remove.',
        'A placeholder node before the head makes removing the head itself work the same way.',
      ],
      solution: {
        explanation: [
          'dummy is a placeholder whose next is head. fast first moves n + 1 steps from dummy, so it is n + 1 nodes ahead of slow.',
          'Both move together until fast falls off the end. slow is then just before the n-th node from the end, and slow.next skips over it. Returning dummy.next works even when the head was removed.',
        ],
        code: `function removeFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy;
  let slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;
  while (fast !== null) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;
  return dummy.next;
}
`,
        complexity: { time: 'O(L)', space: 'O(1)', assumptions: 'L is the list’s length.' },
      },
      visualization: {
        spec: 'The list is drawn as nodes with next arrows (ropes in the illustrated view); fast and slow are flags n + 1 nodes apart. The skipped node’s incoming arrow swings past it.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'i100-029': {
    prerequisites: ['linked-list-basics', 'fast-slow-pointers'],
    related: ['i100-028', 'i100-033'],
    content: {
      statement: [
        'A tailor has a linked list of fabric swatches and wants to fold it: first swatch, last swatch, second swatch, second to last, and so on, until they meet in the middle.',
        'Given the head of the list, reorder it in that order by relinking its nodes, and return the head.',
      ],
      inputFormat: 'head: a linked list of integers.',
      outputFormat: 'The reordered list.',
      constraints: ['0 ≤ list length ≤ 50,000'],
      rules: [
        'Empty or one-node list: return it unchanged.',
        'Reuse the existing nodes; don’t change any val.',
        'Odd length: the middle node ends the list.',
      ],
      entry: 'foldChain',
      params: [{ name: 'head', kind: 'list' }],
      resultKind: 'list',
      examples: [
        { inputs: { head: [10, 20, 30, 40, 50] }, output: [10, 50, 20, 40, 30], note: 'Ends inward, 30 last.' },
        { inputs: { head: [7, 8, 9, 6] }, output: [7, 6, 8, 9], note: 'Even length.' },
      ],
      tests: [
        { inputs: { head: [] }, output: [], note: 'Empty list' },
        { inputs: { head: [1] }, output: [1], note: 'One node' },
        { inputs: { head: [1, 2] }, output: [1, 2], note: 'Two nodes stay' },
        { inputs: { head: [3, 1, 2] }, output: [3, 2, 1], note: 'Three nodes' },
        { inputs: { head: [1, 2, 3, 4, 5, 6, 7, 8] }, output: [1, 8, 2, 7, 3, 6, 4, 5], note: 'Eight nodes' },
      ],
      starter: {
        javascript: `function foldChain(head) {
  // Reorder the list as first, last, second, second to last, … and return the head.
  return head;
}
`,
      },
      hints: [
        'The order takes the back half in reverse. Which list skills give you the back half reversed?',
        'Find the middle with slow and fast pointers, cut the list there, and reverse the second half.',
        'Then weave: one node from the front half, one from the reversed back half, and so on.',
      ],
      solution: {
        explanation: [
          'slow stops at the end of the front half (the middle node for odd lengths). The back half after it is cut off and reversed with prev, curr and nxt, as in reversing a list.',
          'Then first walks the front half and second the reversed back half; each round links first → second → the old first.next. The back half is never longer than the front, so the weave ends when second runs out.',
        ],
        code: `function foldChain(head) {
  if (head === null) return head;
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  let prev = null;
  let curr = slow.next;
  slow.next = null;
  while (curr !== null) {
    const nxt = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nxt;
  }
  let first = head;
  let second = prev;
  while (second !== null) {
    const nextFirst = first.next;
    const nextSecond = second.next;
    first.next = second;
    second.next = nextFirst;
    first = nextFirst;
    second = nextSecond;
  }
  return head;
}
`,
        complexity: { time: 'O(L)', space: 'O(1)', assumptions: 'L is the list’s length.' },
      },
      visualization: {
        spec: 'The list is drawn as nodes with next arrows (ropes in the illustrated view): slow and fast find the middle, the back half’s arrows turn around, and the weave swings arrows between the halves.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'i100-030': {
    prerequisites: ['linked-list-basics', 'hash-maps'],
    related: ['i100-028', 'i100-060'],
    content: {
      statement: [
        'A scavenger-hunt app stores a route as a chain of clue cards. Each card points to the next card, and may also point to one other card anywhere on the route (a "see also" link), or to none.',
        'The route arrives as a list of [value, see-also index] pairs, where the index is the position of the linked card or null. Build the route, make a deep copy of it (new cards with the same values and the same next and see-also links, pointing only at new cards), and return the copy written in the same format.',
      ],
      inputFormat: 'entries: an array of [value, index or null] pairs; index is the position of the see-also card.',
      outputFormat: 'An array of [value, index or null] pairs describing the copy.',
      constraints: ['0 ≤ entries.length ≤ 1,000', 'Every index is null or from 0 to entries.length − 1.'],
      rules: [
        'The copy must be made of new cards: no card of the copy may be a card of the original.',
        'A see-also link may point at its own card, or at an earlier or later card.',
        'Empty route: return [].',
      ],
      entry: 'shadowCopy',
      params: [{ name: 'entries', kind: 'auto' }],
      examples: [
        {
          inputs: {
            entries: [
              [3, null],
              [7, 0],
              [5, 2],
            ],
          },
          output: [
            [3, null],
            [7, 0],
            [5, 2],
          ],
          note: '7 links back to 3, and 5 links to itself.',
        },
        { inputs: { entries: [] }, output: [], note: 'No cards.' },
      ],
      tests: [
        { inputs: { entries: [[1, null]] }, output: [[1, null]], note: 'One card, no link' },
        {
          inputs: {
            entries: [
              [4, 1],
              [4, 0],
            ],
          },
          output: [
            [4, 1],
            [4, 0],
          ],
          note: 'Equal values, crossed links',
        },
        {
          inputs: {
            entries: [
              [9, 2],
              [8, null],
              [7, 0],
            ],
          },
          output: [
            [9, 2],
            [8, null],
            [7, 0],
          ],
          note: 'Links forward and back',
        },
        { inputs: { entries: [[1, 0]] }, output: [[1, 0]], note: 'A card linking to itself' },
      ],
      starter: {
        javascript: `class Card {
  constructor(val) {
    this.val = val;
    this.next = null;
    this.random = null;
  }
}

function shadowCopy(entries) {
  // Build the route from entries, deep-copy it, and return the copy as [value, index] pairs.
  return [];
}
`,
      },
      hints: [
        'Copying the next links is easy; the see-also links can point at cards that haven’t been copied yet.',
        'Make every copy first, and remember which copy belongs to which original card in a map.',
        'Then a second walk sets each copy’s next and see-also links to the copies of the original’s targets.',
      ],
      solution: {
        explanation: [
          'The route is built from entries first: one Card per pair, linked by next, with random set from the index. Then copyOf maps every original card to a new card with the same value.',
          'A second walk gives each copy the links of its original, translated through copyOf, so the copy only points at copies. Finally the copy is written out in the same [value, index] format, using a map from copied card to position.',
        ],
        code: `class Card {
  constructor(val) {
    this.val = val;
    this.next = null;
    this.random = null;
  }
}

function shadowCopy(entries) {
  // The original route, built from [value, see-also index] pairs.
  const originals = entries.map((e) => new Card(e[0]));
  for (let i = 0; i < originals.length; i++) {
    originals[i].next = i + 1 < originals.length ? originals[i + 1] : null;
    originals[i].random = entries[i][1] === null ? null : originals[entries[i][1]];
  }
  const head = originals.length > 0 ? originals[0] : null;

  // One new card per original, then the same links between the copies.
  const copyOf = new Map();
  for (let card = head; card !== null; card = card.next) copyOf.set(card, new Card(card.val));
  for (let card = head; card !== null; card = card.next) {
    const copy = copyOf.get(card);
    copy.next = card.next === null ? null : copyOf.get(card.next);
    copy.random = card.random === null ? null : copyOf.get(card.random);
  }
  const copyHead = head === null ? null : copyOf.get(head);

  // The copy, written in the same format.
  const position = new Map();
  let index = 0;
  for (let card = copyHead; card !== null; card = card.next) position.set(card, index++);
  const out = [];
  for (let card = copyHead; card !== null; card = card.next) {
    out.push([card.val, card.random === null ? null : position.get(card.random)]);
  }
  return out;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is entries.length; map operations take O(1) time on average.' },
      },
      visualization: {
        spec: 'The original cards and their copies are drawn as linked nodes; copyOf pairs each original with its copy, and the copies’ next and random arrows are filled in on the second walk.',
        renderers: ['linked-list', 'hash-map'],
      },
    },
  },

  'i100-031': {
    prerequisites: ['linked-list-basics'],
    related: ['i100-028', 'i100-097'],
    content: {
      statement: [
        'A ticket machine stores large numbers as linked lists of digits, ones digit first: 237 is stored as 7 → 3 → 2.',
        'Given two such numbers a and b, return their sum stored the same way, as a new list.',
      ],
      inputFormat:
        'a, b: non-empty linked lists of digits 0–9, ones digit first, with no extra zeros at the end (except the number 0 itself).',
      outputFormat: 'The sum as a linked list of digits, ones digit first.',
      constraints: ['1 ≤ each list’s length ≤ 100', 'Each node holds one digit from 0 to 9.'],
      rules: [
        'Digits are added column by column with a carry, as on paper.',
        'A carry left over at the end adds one more digit.',
        'Don’t change a or b.',
      ],
      entry: 'addDigitChains',
      params: [
        { name: 'a', kind: 'list' },
        { name: 'b', kind: 'list' },
      ],
      resultKind: 'list',
      examples: [
        { inputs: { a: [7, 3, 2], b: [6, 9] }, output: [3, 3, 3], note: '237 + 96 = 333.' },
        { inputs: { a: [9, 9], b: [1] }, output: [0, 0, 1], note: '99 + 1 = 100: the carry adds a digit.' },
      ],
      tests: [
        { inputs: { a: [0], b: [0] }, output: [0], note: '0 + 0' },
        { inputs: { a: [5], b: [5] }, output: [0, 1], note: 'One carry' },
        { inputs: { a: [1, 8], b: [0] }, output: [1, 8], note: 'Adding 0' },
        { inputs: { a: [9, 9, 9, 9], b: [9, 9] }, output: [8, 9, 0, 0, 1], note: 'A long carry chain' },
        { inputs: { a: [4, 0, 1], b: [6, 9, 8] }, output: [0, 0, 0, 1], note: '104 + 896 = 1000' },
      ],
      starter: {
        javascript: `function addDigitChains(a, b) {
  // Return a + b as a new list of digits, ones digit first.
  return null;
}
`,
      },
      hints: [
        'The lists already start at the ones digit, which is where addition on paper starts too.',
        'Walk both lists together, adding the two digits and the carry; a list that has ended counts as 0.',
        'Each column gives the digit total % 10 and the carry ⌊total / 10⌋. Keep going while either list or the carry remains.',
      ],
      solution: {
        explanation: [
          'a and b walk the two numbers from the ones digit up. Each column’s total is both digits (0 past the end of a list) plus carry; total % 10 is the new digit and ⌊total / 10⌋ the next carry.',
          'The new digits are linked after a placeholder node, dummy, so the first one needs no special case. The loop runs while either number has digits or a carry is left, which adds the extra digit at the end.',
        ],
        code: `function addDigitChains(a, b) {
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0;
  while (a !== null || b !== null || carry > 0) {
    const total = (a !== null ? a.val : 0) + (b !== null ? b.val : 0) + carry;
    carry = Math.floor(total / 10);
    tail.next = new ListNode(total % 10);
    tail = tail.next;
    if (a !== null) a = a.next;
    if (b !== null) b = b.next;
  }
  return dummy.next;
}
`,
        complexity: {
          time: 'O(m + n)',
          space: 'O(m + n)',
          assumptions: 'm and n are the lists’ lengths; the result has at most max(m, n) + 1 digits.',
        },
      },
      visualization: {
        spec: 'Both numbers are drawn as linked nodes with a and b as flags moving together; the result list grows behind dummy, and carry is a block.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'i100-032': {
    prerequisites: ['fast-slow-pointers', 'arrays-basics'],
    related: ['i100-004', 'i100-095'],
    content: {
      statement: [
        'A raffle printed n + 1 tickets but only had the numbers 1 to n, so at least one number was printed more than once (and only one number repeats).',
        'Given the tickets, return the repeated number without changing the array and using only O(1) extra memory.',
      ],
      inputFormat: 'tickets: an array of n + 1 integers, each from 1 to n.',
      outputFormat: 'An integer: the repeated number.',
      constraints: ['2 ≤ tickets.length ≤ 100,000', 'Exactly one number appears more than once (it may appear many times).'],
      rules: ['Don’t change tickets.', 'Use O(1) extra memory: no set, map or copy.', 'Do better than checking every pair (O(n²)).'],
      entry: 'repeatedTicket',
      params: [{ name: 'tickets', kind: 'auto' }],
      examples: [
        { inputs: { tickets: [2, 4, 1, 3, 4] }, output: 4, note: '4 is printed twice.' },
        { inputs: { tickets: [5, 1, 3, 5, 2, 4] }, output: 5, note: 'n = 5 with six tickets.' },
      ],
      tests: [
        { inputs: { tickets: [1, 1] }, output: 1, note: 'The smallest raffle' },
        { inputs: { tickets: [2, 2, 2] }, output: 2, note: 'Printed three times' },
        { inputs: { tickets: [4, 3, 1, 4, 2] }, output: 4, note: 'Repeat at the start' },
        { inputs: { tickets: [1, 5, 2, 3, 5, 4] }, output: 5, note: 'Repeat in the middle' },
        { inputs: { tickets: [6, 2, 4, 1, 3, 5, 6] }, output: 6, note: 'Repeat at both ends' },
        { inputs: { tickets: [2, 1, 2] }, output: 2, note: 'Small raffle' },
      ],
      starter: {
        javascript: `function repeatedTicket(tickets) {
  // Return the repeated number, without changing tickets and with O(1) extra memory.
  return 0;
}
`,
      },
      hints: [
        'Read each value as a pointer: from index i, go to index tickets[i]. Every value is a valid index from 1 to n.',
        'Starting at index 0 and following the pointers must eventually loop, and the loop is entered at the repeated number, since two indexes point to it.',
        'That is the looping-conveyor problem: a slow and a fast walker meet in the loop, then two walkers at the same speed meet at its entry.',
      ],
      solution: {
        explanation: [
          'Following i → tickets[i] from index 0 never ends (there is always a next index), so it runs into a loop. The repeated number is where the path joins the loop: two different indexes lead to it.',
          'slow moves one link and fast two until they meet inside the loop. Then slow restarts from the beginning and both move one link at a time; by the same argument as for a looping list, they meet at the loop’s entry, the repeated number.',
        ],
        code: `function repeatedTicket(tickets) {
  let slow = tickets[0];
  let fast = tickets[0];
  do {
    slow = tickets[slow];
    fast = tickets[tickets[fast]];
  } while (slow !== fast);
  slow = tickets[0];
  while (slow !== fast) {
    slow = tickets[slow];
    fast = tickets[fast];
  }
  return slow;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n + 1 is tickets.length.' },
      },
      visualization: {
        spec: 'The tickets are drawn as cells, with slow and fast as values used as indexes into them; fast jumps two links for every one of slow until they meet, then both walk one link at a time.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-033': {
    prerequisites: ['linked-list-basics'],
    related: ['i100-029', 'i100-028'],
    content: {
      statement: [
        'A bead maker threads beads onto a string in order and wants a pattern: every group of k beads, counted from the start, is turned around. A final group with fewer than k beads stays as it is.',
        'Given the head of the linked list and k, reverse the nodes k at a time by relinking them, and return the new head.',
      ],
      inputFormat: 'head: a linked list of integers. k: a positive integer.',
      outputFormat: 'The relinked list.',
      constraints: ['0 ≤ list length ≤ 5,000', '1 ≤ k ≤ 5,000'],
      rules: [
        'Groups are counted from the head.',
        'A last group shorter than k keeps its order.',
        'Reuse the existing nodes: only next references change.',
      ],
      entry: 'flipInGroups',
      params: [
        { name: 'head', kind: 'list' },
        { name: 'k', kind: 'auto' },
      ],
      resultKind: 'list',
      examples: [
        { inputs: { head: [1, 2, 3, 4, 5, 6, 7], k: 3 }, output: [3, 2, 1, 6, 5, 4, 7], note: 'Two full groups; 7 stays.' },
        { inputs: { head: [10, 20, 30, 40], k: 2 }, output: [20, 10, 40, 30], note: 'Pairs swap.' },
      ],
      tests: [
        { inputs: { head: [], k: 2 }, output: [], note: 'Empty list' },
        { inputs: { head: [5], k: 1 }, output: [5], note: 'Groups of one change nothing' },
        { inputs: { head: [1, 2, 3], k: 3 }, output: [3, 2, 1], note: 'One full group' },
        { inputs: { head: [1, 2], k: 3 }, output: [1, 2], note: 'No full group' },
        { inputs: { head: [9, 8, 7, 6, 5], k: 2 }, output: [8, 9, 6, 7, 5], note: 'One bead left over' },
      ],
      starter: {
        javascript: `function flipInGroups(head, k) {
  // Reverse every full group of k nodes and return the new head.
  return head;
}
`,
      },
      hints: [
        'Handle one group at a time: first check that k more nodes exist.',
        'Reverse a group like a whole list, but point its first node at whatever comes after the group.',
        'A placeholder before the head means every group has a node before it, so the first group needs no special case.',
      ],
      solution: {
        explanation: [
          'groupPrev is the node just before the next group (dummy at first). kth walks k nodes ahead; if the list ends first, the rest is a short group and stays.',
          'The group is reversed with prev starting at groupNext, so its old first node ends up pointing past the group. groupPrev then points at kth, the group’s new first node, and the old first node, now last, becomes groupPrev for the next group.',
        ],
        code: `function flipInGroups(head, k) {
  const dummy = new ListNode(0, head);
  let groupPrev = dummy;
  while (true) {
    let kth = groupPrev;
    for (let i = 0; i < k && kth !== null; i++) kth = kth.next;
    if (kth === null) break;
    const groupNext = kth.next;
    let prev = groupNext;
    let curr = groupPrev.next;
    while (curr !== groupNext) {
      const nxt = curr.next;
      curr.next = prev;
      prev = curr;
      curr = nxt;
    }
    const first = groupPrev.next;
    groupPrev.next = kth;
    groupPrev = first;
  }
  return dummy.next;
}
`,
        complexity: {
          time: 'O(L)',
          space: 'O(1)',
          assumptions: 'L is the list’s length; each node is visited a constant number of times.',
        },
      },
      visualization: {
        spec: 'The list is drawn as nodes with next arrows (ropes in the illustrated view); groupPrev, kth, prev and curr are flags, and each group’s arrows turn around before the group is reattached.',
        renderers: ['linked-list', 'linked-list-ropes'],
      },
    },
  },

  'i100-034': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-036', 'i100-035'],
    content: {
      statement: [
        'A garden designer drew an orchard’s layout as a binary tree and now needs the same layout mirrored for the other side of the path: every node’s left and right branches swap places.',
        'Given root, mirror the tree in place and return its root.',
      ],
      inputFormat: 'root: a binary tree in level order (null for a missing child).',
      outputFormat: 'The mirrored tree in level order.',
      constraints: ['0 ≤ number of nodes ≤ 100', 'Values are integers from -100 to 100.'],
      rules: ['Empty tree: return it as it is.', 'Every node’s two children swap, all the way down.', 'Reuse the existing nodes.'],
      entry: 'mirrorTree',
      params: [{ name: 'root', kind: 'tree' }],
      resultKind: 'tree',
      examples: [
        { inputs: { root: [6, 3, 9, 1, null, 7, 10] }, output: [6, 9, 3, 10, 7, null, 1], note: 'Every level reads right to left.' },
        { inputs: { root: [2, null, 5] }, output: [2, 5], note: 'A right child becomes a left child.' },
      ],
      tests: [
        { inputs: { root: [] }, output: [], note: 'Empty tree' },
        { inputs: { root: [1] }, output: [1], note: 'One node' },
        { inputs: { root: [1, 2] }, output: [1, null, 2], note: 'Left becomes right' },
        { inputs: { root: [3, 1, 4, null, 2] }, output: [3, 4, 1, null, null, 2], note: 'Grandchildren swap too' },
        {
          inputs: { root: [8, 4, null, 2, null, 1] },
          output: [8, null, 4, null, 2, null, 1],
          note: 'A left-leaning chain becomes right-leaning',
        },
      ],
      starter: {
        javascript: `function mirrorTree(root) {
  // Swap every node's children and return the root.
  return root;
}
`,
      },
      hints: [
        'A mirrored tree is the root with its mirrored right subtree on the left and its mirrored left subtree on the right.',
        'That is a recursion: mirror both subtrees, then swap them.',
        'Save one subtree before you overwrite it.',
      ],
      solution: {
        explanation: [
          'An empty tree mirrors to itself. Otherwise the left subtree is mirrored and saved, the mirrored right subtree becomes the new left, and the saved one becomes the new right.',
          'Every node is visited once, and only its two child references change.',
        ],
        code: `function mirrorTree(root) {
  if (root === null) return null;
  const left = mirrorTree(root.left);
  root.left = mirrorTree(root.right);
  root.right = left;
  return root;
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(h)',
          assumptions: 'n is the number of nodes and h the tree’s height (the depth of the recursion).',
        },
      },
      visualization: {
        spec: 'The tree is drawn with the node being mirrored highlighted; its children swap once both subtrees are done. The call stack shows the path down the tree.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-035': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-036', 'i100-039'],
    content: {
      statement: [
        'Two backups of a company’s org chart were saved as binary trees. Before deleting one, the admin wants to know whether they are identical: the same shape, with the same value at every position.',
        'Given the roots a and b, return true if the trees are identical, and false otherwise.',
      ],
      inputFormat: 'a, b: binary trees in level order (null for a missing child).',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes in each tree ≤ 100', 'Values are integers from -10^4 to 10^4.'],
      rules: ['Two empty trees are identical.', 'Same values in a different shape are not identical.', 'Don’t change either tree.'],
      entry: 'sameTree',
      params: [
        { name: 'a', kind: 'tree' },
        { name: 'b', kind: 'tree' },
      ],
      examples: [
        { inputs: { a: [4, 2, 7], b: [4, 2, 7] }, output: true, note: 'The same values in the same places.' },
        { inputs: { a: [7, null, 3, 1], b: [7, 3, null, null, 1] }, output: false, note: 'The same values on different sides.' },
      ],
      tests: [
        { inputs: { a: [], b: [] }, output: true, note: 'Both empty' },
        { inputs: { a: [1], b: [] }, output: false, note: 'One empty' },
        { inputs: { a: [3, 1, 2], b: [3, 2, 1] }, output: false, note: 'Children swapped' },
        { inputs: { a: [5, 4, 8, 1], b: [5, 4, 8, 1] }, output: true, note: 'Deeper identical trees' },
        { inputs: { a: [1, 1], b: [1, null, 1] }, output: false, note: 'Same values, different shape' },
      ],
      starter: {
        javascript: `function sameTree(a, b) {
  // Return true if the trees have the same shape and values.
  return false;
}
`,
      },
      hints: [
        'Compare the roots first: both empty, one empty, or both present with values to compare.',
        'If the roots match, the trees are identical exactly when the two left subtrees are and the two right subtrees are.',
        'Stop at the first difference.',
      ],
      solution: {
        explanation: [
          'If either tree is empty, they are identical only if both are. Otherwise the root values must match.',
          'Then the left subtrees are compared and, only if they match, the right subtrees. The && stops at the first difference.',
        ],
        code: `function sameTree(a, b) {
  if (a === null || b === null) return a === b;
  return a.val === b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the smaller tree’s node count and h its height.' },
      },
      visualization: {
        spec: 'Both trees are drawn with the pair of nodes being compared highlighted. The call stack shows each pair still waiting for its subtrees.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-036': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-034', 'i100-035'],
    content: {
      statement: [
        'A paper-cutting artist folds a design down the middle before cutting. A design drawn as a binary tree survives the fold only if its left half is the mirror image of its right half.',
        'Given root, return true if the tree is symmetric around its centre, and false otherwise.',
      ],
      inputFormat: 'root: a binary tree in level order (null for a missing child).',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 1,000', 'Values are integers from -100 to 100.'],
      rules: [
        'An empty tree and a single node are symmetric.',
        'Mirror positions must have equal values and matching shapes.',
        'Don’t change the tree.',
      ],
      entry: 'isMirrorImage',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [9, 4, 4, null, 6, 6] }, output: true, note: 'The 6s sit on the inner sides of each 4.' },
        { inputs: { root: [9, 4, 4, 6, null, 6] }, output: false, note: 'Both 6s are left children, not mirror images.' },
      ],
      tests: [
        { inputs: { root: [] }, output: true, note: 'Empty tree' },
        { inputs: { root: [7] }, output: true, note: 'One node' },
        { inputs: { root: [2, 3, 4] }, output: false, note: 'Different values' },
        { inputs: { root: [1, 2, 2, 2, null, 2] }, output: false, note: 'Equal values, wrong shape' },
        { inputs: { root: [4, 6, 6, 8, null, null, 8] }, output: true, note: 'Outer grandchildren match' },
      ],
      starter: {
        javascript: `function isMirrorImage(root) {
  // Return true if the tree is a mirror image of itself.
  return false;
}
`,
      },
      hints: [
        'Compare the left subtree with the right subtree, mirrored.',
        'Two subtrees mirror each other when their roots match, the first one’s left mirrors the second one’s right, and its right mirrors the other’s left.',
        'Write a helper that takes two nodes at mirror positions.',
      ],
      solution: {
        explanation: [
          'mirrored(a, b) asks whether subtree a is the mirror image of subtree b: both empty, or equal values with a.left mirroring b.right (the outer pair) and a.right mirroring b.left (the inner pair).',
          'The whole tree is symmetric when its two subtrees mirror each other.',
        ],
        code: `function isMirrorImage(root) {
  const mirrored = (a, b) => {
    if (a === null || b === null) return a === b;
    return a.val === b.val && mirrored(a.left, b.right) && mirrored(a.right, b.left);
  };
  return root === null || mirrored(root.left, root.right);
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with the two nodes being compared (one on each side) highlighted; the call stack holds the pairs still to check.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-037': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-038', 'i100-046'],
    content: {
      statement: [
        'A hedge maze is laid out as a binary tree of junctions. Visitors ask for the longest walk between any two junctions along the paths, never walking a path twice.',
        'Given root, return the number of paths (edges) on the longest route between any two nodes. The route doesn’t have to pass through the root.',
      ],
      inputFormat: 'root: a binary tree in level order (null for a missing child).',
      outputFormat: 'An integer: the number of edges on the longest route.',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are integers.'],
      rules: ['An empty tree or a single node has a longest route of 0.', 'Length is counted in edges, not nodes.'],
      entry: 'longestWalk',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [1, 2, 3, 4, 5, null, null, 6] }, output: 4, note: '6 → 4 → 2 → 1 → 3.' },
        { inputs: { root: [8, 7] }, output: 1, note: 'One edge.' },
      ],
      tests: [
        { inputs: { root: [] }, output: 0, note: 'Empty tree' },
        { inputs: { root: [5] }, output: 0, note: 'One node' },
        { inputs: { root: [1, null, 2, null, 3, null, 4] }, output: 3, note: 'A chain' },
        { inputs: { root: [1, 2, 3, 4, 5, 6, 7] }, output: 4, note: 'Leaf to leaf across the root' },
        { inputs: { root: [1, 2, null, 3, 4, 5, null, null, 6] }, output: 4, note: 'The longest route avoids the root' },
      ],
      starter: {
        javascript: `function longestWalk(root) {
  // Return the number of edges on the longest route between two nodes.
  return 0;
}
`,
      },
      hints: [
        'Every route has a highest node. The longest route through a node goes down its deepest left branch and its deepest right branch.',
        'So for every node you need the heights of its two subtrees.',
        'Compute heights recursively, and while doing it, keep the best left height + right height seen.',
      ],
      solution: {
        explanation: [
          'height(node) returns the number of nodes on the longest downward path from node (0 for empty). The longest route whose highest node is this one has left + right edges.',
          'best keeps the largest such sum over all nodes while the heights are computed, so one walk of the tree finds it.',
        ],
        code: `function longestWalk(root) {
  let best = 0;
  const height = (node) => {
    if (node === null) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
  };
  height(root);
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with returned heights next to finished nodes; best is a block that grows when a node’s two heights add up to more.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-038': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-037', 'i100-041'],
    content: {
      statement: [
        'A mobile sculptor balances hanging arms like a binary tree. The sculpture is steady when, at every joint, the two sides hanging below differ in height by at most one level.',
        'Given root, return true if every node’s left and right subtrees differ in height by at most 1, and false otherwise.',
      ],
      inputFormat: 'root: a binary tree in level order (null for a missing child).',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 5,000'],
      rules: [
        'An empty tree is balanced.',
        'Every node must pass, not just the root.',
        'Aim for O(n): don’t recompute heights over and over.',
      ],
      entry: 'evenFooting',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [8, 4, 12, null, 6, 10] }, output: true, note: 'No joint is off by more than one.' },
        { inputs: { root: [5, 3, null, 2, 4] }, output: false, note: 'The root has two levels on the left and none on the right.' },
      ],
      tests: [
        { inputs: { root: [] }, output: true, note: 'Empty tree' },
        { inputs: { root: [1] }, output: true, note: 'One node' },
        { inputs: { root: [1, 2, null, 3] }, output: false, note: 'A chain of three' },
        { inputs: { root: [1, 2, 3, 4, null, null, null, 5] }, output: false, note: 'Unbalanced deeper down' },
        { inputs: { root: [2, 1, 3, null, null, null, 4] }, output: true, note: 'Off by exactly one' },
      ],
      starter: {
        javascript: `function evenFooting(root) {
  // Return true if every node's subtrees differ in height by at most 1.
  return false;
}
`,
      },
      hints: [
        'A node is balanced when both subtrees are balanced and their heights differ by at most 1.',
        'Computing the height separately at every node repeats work. Return the height and the balance answer from one recursion.',
        'Use a special height, like −1, to mean "unbalanced", and pass it straight up.',
      ],
      solution: {
        explanation: [
          'check(node) returns the subtree’s height, or −1 if any node in it is unbalanced. An empty subtree has height 0.',
          'A −1 from either child is passed straight up, and so is a node whose children’s heights differ by more than 1. Each node is checked once.',
        ],
        code: `function evenFooting(root) {
  // The height of a balanced subtree, or -1 as soon as one is unbalanced.
  const check = (node) => {
    if (node === null) return 0;
    const left = check(node.left);
    if (left === -1) return -1;
    const right = check(node.right);
    if (right === -1) return -1;
    if (Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  };
  return check(root) !== -1;
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with heights returned next to finished nodes; the first −1 marks the unbalanced node and travels up the call stack.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-039': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-035', 'i100-036'],
    content: {
      statement: [
        'A plant nursery records each tree’s branching as a binary tree. A buyer has a cutting shaped like the binary tree branch and asks whether it could have been cut from tree: whether branch appears in tree exactly, as one node together with everything below it.',
        'Return true if some node of tree, with all its descendants, is identical to branch, and false otherwise.',
      ],
      inputFormat: 'tree, branch: binary trees in level order (null for a missing child).',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ nodes in tree ≤ 2,000', '0 ≤ nodes in branch ≤ 1,000'],
      rules: [
        'The match must include all of the node’s descendants: a matching top part is not enough.',
        'An empty branch is found in any tree; a non-empty branch is never found in an empty tree.',
        'Don’t change either tree.',
      ],
      entry: 'containsBranch',
      params: [
        { name: 'tree', kind: 'tree' },
        { name: 'branch', kind: 'tree' },
      ],
      examples: [
        { inputs: { tree: [6, 4, 9, null, null, 2, 5], branch: [9, 2, 5] }, output: true, note: 'The right subtree matches exactly.' },
        {
          inputs: { tree: [6, 4, 9, null, null, 2, 5, 1], branch: [9, 2, 5] },
          output: false,
          note: 'The 9 there has an extra node under 2.',
        },
      ],
      tests: [
        { inputs: { tree: [1], branch: [1] }, output: true, note: 'The whole tree' },
        { inputs: { tree: [1, 2], branch: [2] }, output: true, note: 'A leaf' },
        { inputs: { tree: [3, 3, 3], branch: [3, 3] }, output: false, note: 'Equal values, but no node has only a left child' },
        { inputs: { tree: [7, 8], branch: [] }, output: true, note: 'Empty branch' },
        { inputs: { tree: [], branch: [1] }, output: false, note: 'Empty tree' },
      ],
      starter: {
        javascript: `function containsBranch(tree, branch) {
  // Return true if branch appears in tree as a node with all its descendants.
  return false;
}
`,
      },
      hints: [
        'Write a helper that checks whether two trees are identical.',
        'branch is found if the whole tree is identical to it, or if it is found in the left subtree or in the right subtree.',
        'Mind the empty cases: an empty branch is everywhere, an empty tree holds nothing.',
      ],
      solution: {
        explanation: [
          'same(a, b) compares two trees node by node, as for twin trees. branch is found at tree’s root if same(tree, branch).',
          'Otherwise the search continues in the left subtree and then the right one. Each node of tree can start one comparison, so the time is O(m · n) in the worst case.',
        ],
        code: `function containsBranch(tree, branch) {
  const same = (a, b) => {
    if (a === null || b === null) return a === b;
    return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
  };
  if (branch === null) return true;
  if (tree === null) return false;
  return same(tree, branch) || containsBranch(tree.left, branch) || containsBranch(tree.right, branch);
}
`,
        complexity: { time: 'O(m · n)', space: 'O(h)', assumptions: 'm and n are the trees’ node counts and h the larger height.' },
      },
      visualization: {
        spec: 'Both trees are drawn; the candidate root in tree and the pair of nodes being compared are highlighted, and the call stack shows the search and the comparison.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-040': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-046', 'i100-037'],
    content: {
      statement: [
        'A hiking map is a binary tree of trail points, each marked with the climb (positive) or descent (negative) to reach it. A walker wants a route from the trailhead (the root) down to an end point (a leaf) with a total change of exactly target.',
        'Given root and target, return true if some root-to-leaf path’s values add up to target, and false otherwise.',
      ],
      inputFormat: 'root: a binary tree of integers in level order. target: an integer.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ number of nodes ≤ 5,000', 'Values and target are integers from -1,000 to 1,000.'],
      rules: [
        'The path must start at the root and end at a leaf (a node with no children).',
        'An empty tree has no path: return false, even for target 0.',
        'Values may be negative.',
      ],
      entry: 'routeTotal',
      params: [
        { name: 'root', kind: 'tree' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { root: [6, 2, 9, 1, null, null, 4], target: 9 }, output: true, note: '6 + 2 + 1.' },
        { inputs: { root: [6, 2, 9, 1, null, null, 4], target: 19 }, output: true, note: '6 + 9 + 4.' },
      ],
      tests: [
        { inputs: { root: [], target: 0 }, output: false, note: 'Empty tree' },
        { inputs: { root: [5], target: 5 }, output: true, note: 'The root is a leaf' },
        { inputs: { root: [1, 2], target: 1 }, output: false, note: 'The root alone is not a leaf here' },
        { inputs: { root: [-2, null, -3], target: -5 }, output: true, note: 'Negative values' },
        { inputs: { root: [3, 1, 1, null, 2], target: 6 }, output: true, note: 'The deeper path' },
        { inputs: { root: [6, 2, 9, 1, null, null, 4], target: 8 }, output: false, note: '6 + 2 is not a full path' },
      ],
      starter: {
        javascript: `function routeTotal(root, target) {
  // Return true if some root-to-leaf path adds up to target.
  return false;
}
`,
      },
      hints: [
        'Going down one node, the rest of the path has to add up to target minus that node’s value.',
        'At a leaf, the remaining total must be exactly 0.',
        'Try the left subtree with the remaining total, then the right one.',
      ],
      solution: {
        explanation: [
          'rest is what the path still has to add up to after the current node. At a leaf, the path is complete, so rest must be 0.',
          'Otherwise the path continues into either child with the smaller rest. An empty subtree is not a path, which also makes an empty tree return false.',
        ],
        code: `function routeTotal(root, target) {
  if (root === null) return false;
  const rest = target - root.val;
  if (root.left === null && root.right === null) return rest === 0;
  return routeTotal(root.left, rest) || routeTotal(root.right, rest);
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with the path being followed highlighted; each call on the stack shows the remaining total for its node.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-041': {
    prerequisites: ['trees-basics', 'divide-and-conquer'],
    related: ['i100-043', 'i100-044'],
    content: {
      statement: [
        'A library catalogue keeps its sorted call numbers in a binary search tree, and lookups are fastest when the tree is as short as possible.',
        'Given the call numbers sorted in increasing order, build a height-balanced binary search tree from them and return its root. Take the middle value as each subtree’s root; with an even number of values, take the left one of the two middle values.',
      ],
      inputFormat: 'values: an array of distinct integers in increasing order.',
      outputFormat: 'The tree in level order.',
      constraints: ['0 ≤ values.length ≤ 10,000', 'Values are distinct and sorted.'],
      rules: [
        'Each subtree’s root is the middle value of its range; for an even count, the left middle one.',
        'Every node’s left subtree holds smaller values and its right subtree larger ones.',
        'Empty input: return an empty tree.',
      ],
      entry: 'balancedIndexTree',
      params: [{ name: 'values', kind: 'auto' }],
      resultKind: 'tree',
      examples: [
        {
          inputs: { values: [1, 3, 5, 7, 9] },
          output: [5, 1, 7, null, 3, null, 9],
          note: '5 is the middle; 1 and 7 are the middles of each side.',
        },
        { inputs: { values: [2, 4, 6, 8] }, output: [4, 2, 6, null, null, null, 8], note: 'Even count: the left middle, 4, is the root.' },
      ],
      tests: [
        { inputs: { values: [] }, output: [], note: 'No values' },
        { inputs: { values: [5] }, output: [5], note: 'One value' },
        { inputs: { values: [1, 2] }, output: [1, null, 2], note: 'Left middle of two' },
        { inputs: { values: [-3, 0, 4] }, output: [0, -3, 4], note: 'Three values' },
        { inputs: { values: [10, 20, 30, 40, 50, 60, 70] }, output: [40, 20, 60, 10, 30, 50, 70], note: 'A perfect tree' },
      ],
      starter: {
        javascript: `function balancedIndexTree(values) {
  // Build a balanced search tree from the sorted values and return its root.
  return null;
}
`,
      },
      hints: [
        'Which value should be the root so both sides have about the same number of values?',
        'The middle value: everything to its left goes in the left subtree, everything to its right in the right one.',
        'Build each side the same way, recursively, on the range of indexes lo..hi.',
      ],
      solution: {
        explanation: [
          'build(lo, hi) makes the tree for values[lo..hi]. Its root is the middle value at ⌊(lo + hi) / 2⌋ (the left middle for an even count), the left subtree is built from lo..mid − 1 and the right from mid + 1..hi.',
          'Because the values are sorted, every left value is smaller and every right value larger, and splitting at the middle keeps the two sides’ sizes within one, so the tree is height-balanced.',
        ],
        code: `function balancedIndexTree(values) {
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi) / 2);
    return new TreeNode(values[mid], build(lo, mid - 1), build(mid + 1, hi));
  };
  return build(0, values.length - 1);
}
`,
        complexity: {
          time: 'O(n)',
          space: 'O(log n)',
          assumptions: 'n is values.length; the recursion is O(log n) deep, not counting the tree itself.',
        },
      },
      visualization: {
        spec: 'The values are drawn as cells with lo, mid and hi marking each call’s range; the call tree shows the splits, and the finished tree is drawn from the result.',
        renderers: ['array-cells', 'call-tree', 'call-stack'],
      },
    },
  },

  'i100-042': {
    prerequisites: ['trees-basics', 'binary-search-idea'],
    related: ['i100-043', 'i100-041'],
    content: {
      statement: [
        'A company directory is stored as a binary search tree of employee ids. Two employees, with ids p and q, want to know their lowest shared manager: the deepest node that has both of them in its subtree (a node counts as being in its own subtree).',
        'Given root, p and q (both in the tree), return the value of their lowest common ancestor.',
      ],
      inputFormat: 'root: a binary search tree of distinct integers in level order. p, q: integers in the tree.',
      outputFormat: 'An integer: the lowest common ancestor’s value.',
      constraints: ['2 ≤ number of nodes ≤ 100,000', 'All values are distinct; p and q are in the tree (they may be equal).'],
      rules: [
        'A node is its own ancestor: if p is above q, the answer is p.',
        'Use the search-tree order: there is no need to visit every node.',
        'Don’t change the tree.',
      ],
      entry: 'sharedAncestor',
      params: [
        { name: 'root', kind: 'tree' },
        { name: 'p', kind: 'auto' },
        { name: 'q', kind: 'auto' },
      ],
      examples: [
        { inputs: { root: [20, 10, 30, 5, 15, 25, 35], p: 5, q: 15 }, output: 10, note: 'Both are under 10, on different sides.' },
        { inputs: { root: [20, 10, 30, 5, 15, 25, 35], p: 15, q: 25 }, output: 20, note: 'They split at the root.' },
      ],
      tests: [
        { inputs: { root: [20, 10, 30, 5, 15], p: 10, q: 5 }, output: 10, note: 'One is the other’s ancestor' },
        { inputs: { root: [7], p: 7, q: 7 }, output: 7, note: 'The same node' },
        { inputs: { root: [8, 3, 12, 1, 6, null, 14, null, null, 4], p: 4, q: 1 }, output: 3, note: 'Deeper in the tree' },
        { inputs: { root: [8, 3, 12, 1, 6, null, 14, null, null, 4], p: 6, q: 14 }, output: 8, note: 'Opposite sides of the root' },
      ],
      starter: {
        javascript: `function sharedAncestor(root, p, q) {
  // Return the value of the lowest node with both p and q in its subtree.
  return root.val;
}
`,
      },
      hints: [
        'Start at the root. If both values are smaller than the node, where are they both?',
        'Both smaller: go left. Both larger: go right.',
        'Otherwise they are on different sides (or one is this node), so this node is the answer.',
      ],
      solution: {
        explanation: [
          'In a search tree, values smaller than a node are in its left subtree and larger ones in its right. While p and q are both smaller (or both larger), their shared ancestors are all on that side, so node moves there.',
          'The first node where they are not on the same side, or where one of them is the node itself, contains both and no child of it does: it is the lowest common ancestor.',
        ],
        code: `function sharedAncestor(root, p, q) {
  let node = root;
  while (node !== null) {
    if (p < node.val && q < node.val) node = node.left;
    else if (p > node.val && q > node.val) node = node.right;
    else return node.val;
  }
  return null;
}
`,
        complexity: { time: 'O(h)', space: 'O(1)', assumptions: 'h is the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with node as a flag walking down from the root; it stops where p and q split.',
        renderers: ['binary-tree'],
      },
    },
  },

  'i100-043': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs', 'stacks'],
    related: ['i100-042', 'i100-041'],
    content: {
      statement: [
        'A tournament keeps its scores in a binary search tree. The organisers want the k-th lowest score without copying all the scores out.',
        'Given root and k, return the k-th smallest value in the tree (k = 1 is the smallest).',
      ],
      inputFormat: 'root: a binary search tree of distinct integers in level order. k: an integer from 1 to the number of nodes.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ k ≤ number of nodes ≤ 10,000', 'Values are distinct.'],
      rules: ['k counts from 1.', 'Stop as soon as the k-th value is found.', 'Don’t change the tree.'],
      entry: 'kthInOrder',
      params: [
        { name: 'root', kind: 'tree' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        { inputs: { root: [20, 10, 30, 5, 15], k: 2 }, output: 10, note: 'In order: 5, 10, 15, 20, 30.' },
        { inputs: { root: [6, 2, 8, 1, 4, 7, 9], k: 4 }, output: 6, note: 'The fourth of seven is the root.' },
      ],
      tests: [
        { inputs: { root: [4], k: 1 }, output: 4, note: 'One node' },
        { inputs: { root: [20, 10, 30, 5, 15], k: 5 }, output: 30, note: 'The largest' },
        { inputs: { root: [6, 2, 8, 1, 4, 7, 9], k: 7 }, output: 9, note: 'The last in order' },
        { inputs: { root: [3, 1, null, null, 2], k: 2 }, output: 2, note: 'A right child of a left child' },
        { inputs: { root: [6, 2, 8, 1, 4, 7, 9], k: 1 }, output: 1, note: 'The smallest' },
      ],
      starter: {
        javascript: `function kthInOrder(root, k) {
  // Return the k-th smallest value.
  return root.val;
}
`,
      },
      hints: [
        'An in-order walk (left subtree, node, right subtree) visits a search tree’s values from smallest to largest.',
        'Count the nodes as you visit them and stop at the k-th.',
        'With an explicit stack you can stop the walk the moment you find it: go left as far as possible, then visit, then turn right.',
      ],
      solution: {
        explanation: [
          'The in-order walk is done with stack: node goes left as far as possible, pushing each node; the top of the stack is then the next smallest value.',
          'Each visited node counts one; the k-th visit is the answer. After a visit the walk continues in that node’s right subtree.',
        ],
        code: `function kthInOrder(root, k) {
  const stack = [];
  let node = root;
  let count = 0;
  while (node !== null || stack.length > 0) {
    while (node !== null) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    count++;
    if (count === k) return node.val;
    node = node.right;
  }
  return null;
}
`,
        complexity: { time: 'O(h + k)', space: 'O(h)', assumptions: 'h is the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with node as a flag; the stack holds the nodes waiting to be visited, and count rises with each visit.',
        renderers: ['binary-tree', 'stack'],
      },
    },
  },

  'i100-044': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs', 'hash-maps'],
    related: ['i100-047', 'i100-041'],
    content: {
      statement: [
        'An archive kept two listings of a family tree drawn as a binary tree with distinct values: one in preorder (each node before its subtrees, left before right) and one in inorder (left subtree, node, right subtree). The tree itself was lost.',
        'Given preorder and inorder, rebuild the tree and return its root.',
      ],
      inputFormat: 'preorder, inorder: arrays of the same distinct integers.',
      outputFormat: 'The tree in level order.',
      constraints: ['0 ≤ preorder.length = inorder.length ≤ 3,000', 'Values are distinct.', 'The listings come from one binary tree.'],
      rules: ['Empty listings: return an empty tree.', 'Distinct values make the tree unique.'],
      entry: 'rebuildTree',
      params: [
        { name: 'preorder', kind: 'auto' },
        { name: 'inorder', kind: 'auto' },
      ],
      resultKind: 'tree',
      examples: [
        {
          inputs: { preorder: [8, 4, 2, 6, 12, 10], inorder: [2, 4, 6, 8, 10, 12] },
          output: [8, 4, 12, 2, 6, 10],
          note: '8 is the root; 2, 4, 6 are on its left.',
        },
        { inputs: { preorder: [5, 7], inorder: [7, 5] }, output: [5, 7], note: '7 comes before 5 in inorder, so it is the left child.' },
      ],
      tests: [
        { inputs: { preorder: [], inorder: [] }, output: [], note: 'Empty tree' },
        { inputs: { preorder: [1], inorder: [1] }, output: [1], note: 'One node' },
        { inputs: { preorder: [1, 2, 3], inorder: [1, 2, 3] }, output: [1, null, 2, null, 3], note: 'A right-leaning chain' },
        { inputs: { preorder: [1, 2, 3], inorder: [3, 2, 1] }, output: [1, 2, null, 3], note: 'A left-leaning chain' },
        { inputs: { preorder: [7, 3, 1, 5, 9], inorder: [1, 3, 5, 7, 9] }, output: [7, 3, 9, 1, 5], note: 'Two subtrees' },
      ],
      starter: {
        javascript: `function rebuildTree(preorder, inorder) {
  // Rebuild the tree from its preorder and inorder listings and return the root.
  return null;
}
`,
      },
      hints: [
        'The first value in preorder is the root.',
        'In inorder, everything before the root is its left subtree and everything after it is the right subtree, which tells you how many values each side has.',
        'Recurse on each side. A map from value to inorder position finds the root’s position in O(1).',
      ],
      solution: {
        explanation: [
          'nextIndex walks through preorder, which lists every subtree’s root before its descendants, left subtree first. build(lo, hi) makes the subtree whose values are inorder[lo..hi].',
          'Its root is preorder[nextIndex]; position finds it in inorder, splitting lo..hi into the left part (built first, as preorder lists it first) and the right part. Each value is placed once.',
        ],
        code: `function rebuildTree(preorder, inorder) {
  const position = new Map();
  inorder.forEach((v, i) => position.set(v, i));
  let nextIndex = 0;
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const value = preorder[nextIndex++];
    const node = new TreeNode(value);
    const mid = position.get(value);
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is the number of values; map operations take O(1) time on average.' },
      },
      visualization: {
        spec: 'Both listings are drawn as cells; nextIndex moves through preorder and lo..hi marks the inorder range of the subtree being built. The call tree shows the splits.',
        renderers: ['array-cells', 'hash-map', 'call-tree', 'call-stack'],
      },
    },
  },

  'i100-045': {
    prerequisites: ['tree-traversal-bfs', 'queues'],
    related: ['i100-043', 'i100-044'],
    content: {
      statement: [
        'A sightseeing tram tours a park laid out as a binary tree, level by level. To save time it drives back and forth: the root, then the next level from right to left, the one after from left to right, and so on.',
        'Given root, return the values level by level in that zigzag order.',
      ],
      inputFormat: 'root: a binary tree in level order (null for a missing child).',
      outputFormat: 'An array of levels, each an array of values.',
      constraints: ['0 ≤ number of nodes ≤ 2,000'],
      rules: ['The first level (the root) is read left to right, and the direction flips every level.', 'Empty tree: return [].'],
      entry: 'zigzagLevels',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [1, 2, 3, 4, 5, 6, 7] }, output: [[1], [3, 2], [4, 5, 6, 7]], note: 'Right to left on the second level.' },
        { inputs: { root: [6, 3, 9, 1, 4, 7, 10, 0] }, output: [[6], [9, 3], [1, 4, 7, 10], [0]], note: 'Four levels.' },
      ],
      tests: [
        { inputs: { root: [] }, output: [], note: 'Empty tree' },
        { inputs: { root: [4] }, output: [[4]], note: 'One node' },
        { inputs: { root: [8, null, 9, null, 10] }, output: [[8], [9], [10]], note: 'One node per level' },
        { inputs: { root: [1, 2, 3, null, 4, null, 5] }, output: [[1], [3, 2], [4, 5]], note: 'Gaps between nodes' },
      ],
      starter: {
        javascript: `function zigzagLevels(root) {
  // Return the levels, alternating left-to-right and right-to-left.
  return [];
}
`,
      },
      hints: [
        'First get the levels in normal order with a queue, one level per round.',
        'Then reverse every second level.',
        'Or fill each level from the back when going right to left.',
      ],
      solution: {
        explanation: [
          'The queue holds one level at a time, read left to right; its children form the next level.',
          'Each level’s values go into level; on every second level it is reversed before being added, which gives the back-and-forth order.',
        ],
        code: `function zigzagLevels(root) {
  const levels = [];
  if (root === null) return levels;
  let queue = [root];
  let leftToRight = true;
  while (queue.length > 0) {
    const level = [];
    const nextLevel = [];
    for (const node of queue) {
      level.push(node.val);
      if (node.left !== null) nextLevel.push(node.left);
      if (node.right !== null) nextLevel.push(node.right);
    }
    if (!leftToRight) level.reverse();
    levels.push(level);
    leftToRight = !leftToRight;
    queue = nextLevel;
  }
  return levels;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is the number of nodes.' },
      },
      visualization: {
        spec: 'The tree is drawn with the current level’s nodes marked; queue and nextLevel hold this level and the next one, and each finished level is added to levels.',
        renderers: ['binary-tree', 'queue-line', 'array-cells'],
      },
    },
  },

  'i100-046': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs'],
    related: ['i100-037', 'i100-040'],
    content: {
      statement: [
        'A delivery drone flies between hubs connected like a binary tree; each hub pays (positive) or costs (negative) a fee. A route can start and end at any hubs, follows the links without visiting a hub twice, and must include at least one hub.',
        'Given root, return the largest total of the values on any such route.',
      ],
      inputFormat: 'root: a non-empty binary tree of integers in level order.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ number of nodes ≤ 30,000', 'Values are integers from -1,000 to 1,000.'],
      rules: [
        'A route is a path between two nodes (possibly the same node), following parent–child links.',
        'It doesn’t have to pass through the root.',
        'It has at least one node, so the answer can be negative.',
      ],
      entry: 'bestRoute',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        { inputs: { root: [2, -1, 3] }, output: 5, note: '2 + 3, skipping the −1.' },
        { inputs: { root: [-5, 4, 6, null, null, -2, 7] }, output: 13, note: '6 + 7, below the root.' },
      ],
      tests: [
        { inputs: { root: [-3] }, output: -3, note: 'One negative node' },
        { inputs: { root: [1, 4, 3] }, output: 8, note: 'Through the root' },
        { inputs: { root: [-2, -1] }, output: -1, note: 'All negative: the best single node' },
        { inputs: { root: [5, -8, 6, 2, 1, null, null, 9] }, output: 14, note: 'Across a negative node' },
        { inputs: { root: [-1, -2, -3] }, output: -1, note: 'Only the root' },
      ],
      starter: {
        javascript: `function bestRoute(root) {
  // Return the largest sum of any path between two nodes.
  return 0;
}
`,
      },
      hints: [
        'Every route has a highest node, where it can turn: it comes up one side and goes down the other.',
        'For each node, work out the best downward gain from it: the node plus the better of its children’s gains, or nothing from a child whose gain is negative.',
        'The best route turning at a node is its value plus both children’s (non-negative) gains. Keep the largest over all nodes.',
      ],
      solution: {
        explanation: [
          'gain(node) is the best total of a path that starts at node and goes down; a child whose gain is negative is left out (counted as 0).',
          'The best route whose highest node is this one takes the node plus both children’s gains. best keeps the largest of those over every node, starting below any possible answer so all-negative trees work.',
        ],
        code: `function bestRoute(root) {
  let best = -Infinity;
  const gain = (node) => {
    if (node === null) return 0;
    const left = Math.max(gain(node.left), 0);
    const right = Math.max(gain(node.right), 0);
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
  };
  gain(root);
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(h)', assumptions: 'n is the number of nodes and h the tree’s height.' },
      },
      visualization: {
        spec: 'The tree is drawn with each node’s returned gain next to it once finished; best is a block that grows when a route through a node beats it.',
        renderers: ['binary-tree', 'call-stack'],
      },
    },
  },

  'i100-047': {
    prerequisites: ['trees-basics', 'tree-traversal-dfs', 'strings-and-chars'],
    related: ['i100-044', 'i100-035'],
    content: {
      statement: [
        'A plant database sends tree diagrams between servers as plain text. Write both directions: turn a binary tree into text, and turn that text back into the same tree.',
        'Use this format: list the tree in preorder (node, then its left subtree, then its right subtree), writing each value as a number and each missing child as "#", separated by commas. Given root, return [text, rebuilt], where text is the tree in this format and rebuilt is the tree you rebuild from text alone.',
      ],
      inputFormat: 'root: a binary tree of integers in level order.',
      outputFormat: '[text, rebuilt]: the text, and the rebuilt tree in level order (null when the tree is empty).',
      constraints: ['0 ≤ number of nodes ≤ 10,000', 'Values are integers from -1,000 to 1,000.'],
      rules: [
        'The text lists every node and every missing child in preorder: an empty tree is "#".',
        'The rebuilt tree must be made from the text only, with new nodes.',
        'Negative values keep their minus sign.',
      ],
      entry: 'roundTrip',
      params: [{ name: 'root', kind: 'tree' }],
      examples: [
        {
          inputs: { root: [1, 2, 3, null, null, 4] },
          output: ['1,2,#,#,3,4,#,#,#', [1, 2, 3, null, null, 4]],
          note: '2 has no children; 3 has only a left child.',
        },
        { inputs: { root: [] }, output: ['#', null], note: 'An empty tree: the text is "#" and nothing is rebuilt.' },
      ],
      tests: [
        { inputs: { root: [7] }, output: ['7,#,#', [7]], note: 'One node' },
        { inputs: { root: [5, null, 6] }, output: ['5,#,6,#,#', [5, null, 6]], note: 'Only a right child' },
        { inputs: { root: [-1, 0, 1] }, output: ['-1,0,#,#,1,#,#', [-1, 0, 1]], note: 'Negative and zero values' },
        { inputs: { root: [10, 20, null, 30] }, output: ['10,20,30,#,#,#,#', [10, 20, null, 30]], note: 'A left chain' },
      ],
      starter: {
        javascript: `function roundTrip(root) {
  // Return [the tree as text in the stated format, the tree rebuilt from that text].
  return ['', null];
}
`,
      },
      hints: [
        'Writing: a preorder walk writes the node’s value, then the left subtree, then the right one, and "#" for an empty subtree.',
        'Reading: split the text at the commas. The first token is the root; the left subtree’s tokens come next, then the right subtree’s.',
        'Read with one shared position that every recursive call moves forward: "#" means an empty subtree.',
      ],
      solution: {
        explanation: [
          'toText writes preorder with "#" for every missing child, so the text records the shape exactly. The parts are joined with commas.',
          'fromText splits the text into tokens and reads them with one shared position: a "#" is an empty subtree; a number makes a new node whose left subtree is read next and then its right one. That is exactly the order the text was written in.',
        ],
        code: `function roundTrip(root) {
  const parts = [];
  const toText = (node) => {
    if (node === null) {
      parts.push('#');
      return;
    }
    parts.push(String(node.val));
    toText(node.left);
    toText(node.right);
  };
  toText(root);
  const text = parts.join(',');

  const tokens = text.split(',');
  let pos = 0;
  const fromText = () => {
    const token = tokens[pos++];
    if (token === '#') return null;
    const node = new TreeNode(Number(token));
    node.left = fromText();
    node.right = fromText();
    return node;
  };
  return [text, fromText()];
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is the number of nodes; the text has 2n + 1 tokens.' },
      },
      visualization: {
        spec: 'The tree is drawn while parts grows during the walk; then tokens is drawn as cells with pos moving along it, and the rebuilt tree grows node by node.',
        renderers: ['binary-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-048': {
    prerequisites: ['backtracking', 'recursion-basics'],
    related: ['i100-052', 'i100-049'],
    content: {
      statement: [
        'A puzzle app shows every way to arrange n pairs of brackets so that they are balanced: every "(" is closed by a later ")", and no ")" closes something that wasn’t opened.',
        'Given n, return every balanced string of n pairs, in alphabetical order (where "(" comes before ")").',
      ],
      inputFormat: 'n: a non-negative integer.',
      outputFormat: 'An array of strings in alphabetical order.',
      constraints: ['0 ≤ n ≤ 8'],
      rules: ['n = 0 has one arrangement: the empty string.', 'Each string has length 2n.', 'Order: "(" sorts before ")".'],
      entry: 'balancedBrackets',
      params: [{ name: 'n', kind: 'auto' }],
      examples: [
        { inputs: { n: 2 }, output: ['(())', '()()'], note: 'Two arrangements of two pairs.' },
        { inputs: { n: 1 }, output: ['()'], note: 'One pair.' },
      ],
      tests: [
        { inputs: { n: 0 }, output: [''], note: 'No pairs: just the empty string' },
        { inputs: { n: 3 }, output: ['((()))', '(()())', '(())()', '()(())', '()()()'], note: 'Three pairs' },
        {
          inputs: { n: 4 },
          output: [
            '(((())))',
            '((()()))',
            '((())())',
            '((()))()',
            '(()(()))',
            '(()()())',
            '(()())()',
            '(())(())',
            '(())()()',
            '()((()))',
            '()(()())',
            '()(())()',
            '()()(())',
            '()()()()',
          ],
          note: 'Fourteen arrangements',
        },
        {
          inputs: { n: 5 },
          output: [
            '((((()))))',
            '(((()())))',
            '(((())()))',
            '(((()))())',
            '(((())))()',
            '((()(())))',
            '((()()()))',
            '((()())())',
            '((()()))()',
            '((())(()))',
            '((())()())',
            '((())())()',
            '((()))(())',
            '((()))()()',
            '(()((())))',
            '(()(()()))',
            '(()(())())',
            '(()(()))()',
            '(()()(()))',
            '(()()()())',
            '(()()())()',
            '(()())(())',
            '(()())()()',
            '(())((()))',
            '(())(()())',
            '(())(())()',
            '(())()(())',
            '(())()()()',
            '()(((())))',
            '()((()()))',
            '()((())())',
            '()((()))()',
            '()(()(()))',
            '()(()()())',
            '()(()())()',
            '()(())(())',
            '()(())()()',
            '()()((()))',
            '()()(()())',
            '()()(())()',
            '()()()(())',
            '()()()()()',
          ],
          note: 'Forty-two arrangements',
        },
      ],
      starter: {
        javascript: `function balancedBrackets(n) {
  // Return every balanced string of n pairs, in alphabetical order.
  return [];
}
`,
      },
      hints: [
        'Build the string one character at a time and only add a character that can still lead to a balanced string.',
        'You can add "(" while fewer than n have been opened, and ")" while fewer have been closed than opened.',
        'Trying "(" before ")" at every step produces the strings in alphabetical order.',
      ],
      solution: {
        explanation: [
          'build(text, opened, closed) extends a prefix that can still be completed. "(" is allowed while opened < n; ")" while closed < opened, so it always closes something.',
          'A prefix of length 2n is a balanced string and is recorded. Trying "(" first at every choice visits the strings in alphabetical order, and no dead end is ever explored.',
        ],
        code: `function balancedBrackets(n) {
  const out = [];
  const build = (text, opened, closed) => {
    if (text.length === 2 * n) {
      out.push(text);
      return;
    }
    if (opened < n) build(text + '(', opened + 1, closed);
    if (closed < opened) build(text + ')', opened, closed + 1);
  };
  build('', 0, 0);
  return out;
}
`,
        complexity: {
          time: 'O(4^n / √n)',
          space: 'O(n)',
          assumptions:
            'The number of balanced strings grows like 4^n / n^1.5 (the Catalan numbers), and each one takes O(n) to build; space is the recursion depth.',
        },
      },
      visualization: {
        spec: 'The call tree is the decision tree of "(" and ")" choices, each box showing the prefix so far; out fills with finished strings.',
        renderers: ['call-tree', 'call-stack', 'array-cells'],
      },
    },
  },

  'i100-049': {
    prerequisites: ['backtracking', 'sorting'],
    related: ['i100-050', 'i100-048'],
    content: {
      statement: [
        'A vending machine accepts tokens of a few face values, and it has unlimited tokens of each. Customers ask for every way to pay an exact amount.',
        'Given the distinct face values and target, return every combination of face values that adds up to target. Each combination lists its values in increasing order (repeats allowed), and the combinations are in increasing order compared value by value.',
      ],
      inputFormat: 'values: an array of distinct positive integers. target: a positive integer.',
      outputFormat: 'An array of combinations, each an array of integers.',
      constraints: ['1 ≤ values.length ≤ 30', '1 ≤ values[i] ≤ 200', '1 ≤ target ≤ 500'],
      rules: [
        'A value can be used any number of times.',
        'Combinations differ by how many of each value they use, not by order: [2, 5] and [5, 2] are the same.',
        'No way to pay: return [].',
      ],
      entry: 'payExactly',
      params: [
        { name: 'values', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { values: [3, 4, 5], target: 8 },
          output: [
            [3, 5],
            [4, 4],
          ],
          note: '3 + 5 or 4 + 4.',
        },
        { inputs: { values: [2, 5], target: 3 }, output: [], note: 'No way to make 3.' },
      ],
      tests: [
        { inputs: { values: [4], target: 8 }, output: [[4, 4]], note: 'One value, twice' },
        { inputs: { values: [1], target: 3 }, output: [[1, 1, 1]], note: 'Ones only' },
        {
          inputs: { values: [7, 3, 2], target: 9 },
          output: [
            [2, 2, 2, 3],
            [2, 7],
            [3, 3, 3],
          ],
          note: 'Values not given in order',
        },
        {
          inputs: { values: [5, 10], target: 15 },
          output: [
            [5, 5, 5],
            [5, 10],
          ],
          note: 'Two ways',
        },
        { inputs: { values: [6, 9], target: 1 }, output: [], note: 'Every value is too big' },
      ],
      starter: {
        javascript: `function payExactly(values, target) {
  // Return every combination (increasing values) that adds up to target, in increasing order.
  return [];
}
`,
      },
      hints: [
        'Sort the values. Build a combination from small to large values, so each combination is made only once.',
        'At each step, choose a value at or after the last one you chose (the same one again is allowed), and subtract it from what is left.',
        'Stop a branch when what is left reaches 0 (record it) or a value is bigger than what is left (and so are all later ones).',
      ],
      solution: {
        explanation: [
          'ordered holds the values in increasing order. pick(start, left, chosen) chooses the next value from position start on: choosing ordered[i] again later is allowed, so the next call starts at i.',
          'Starting at i, never earlier, means every combination is built in increasing order exactly once, and trying smaller values first lists them in increasing order. A value larger than left ends the loop, since every later value is larger too.',
        ],
        code: `function payExactly(values, target) {
  const ordered = [...values].sort((a, b) => a - b);
  const out = [];
  const pick = (start, left, chosen) => {
    if (left === 0) {
      out.push([...chosen]);
      return;
    }
    for (let i = start; i < ordered.length; i++) {
      if (ordered[i] > left) break;
      chosen.push(ordered[i]);
      pick(i, left - ordered[i], chosen);
      chosen.pop();
    }
  };
  pick(0, target, []);
  return out;
}
`,
        complexity: {
          time: 'O(n^(t/m + 1))',
          space: 'O(t/m)',
          assumptions: 'n is values.length, t the target and m the smallest value; t/m bounds the depth of a combination.',
        },
      },
      visualization: {
        spec: 'The call tree is the decision tree; each box shows where the choice starts, what is left and the values chosen. chosen grows and shrinks as the search backtracks.',
        renderers: ['call-tree', 'call-stack', 'array-cells'],
      },
    },
  },

  'i100-050': {
    prerequisites: ['backtracking', 'sorting'],
    related: ['i100-049', 'i100-048'],
    content: {
      statement: [
        'A sticker collector has a bag of stickers, some of them identical. They want to see every different set of stickers they could pick out of the bag (including none at all), without listing the same set twice.',
        'Given the sticker numbers, return every distinct subset. Each subset lists its numbers in increasing order, and the subsets are listed in increasing order compared number by number, a shorter subset before any subset that extends it.',
      ],
      inputFormat: 'stickers: an array of integers that may repeat.',
      outputFormat: 'An array of subsets, each an array of integers.',
      constraints: ['0 ≤ stickers.length ≤ 10', 'Numbers are integers from -10 to 10.'],
      rules: [
        'Identical stickers are interchangeable: picking either of two equal stickers gives the same set.',
        'The empty set is always included.',
        'Each subset is in increasing order, and so is the list of subsets.',
      ],
      entry: 'distinctSets',
      params: [{ name: 'stickers', kind: 'auto' }],
      examples: [
        { inputs: { stickers: [3, 1, 3] }, output: [[], [1], [1, 3], [1, 3, 3], [3], [3, 3]], note: 'Six different sets.' },
        { inputs: { stickers: [5] }, output: [[], [5]], note: 'Take it or not.' },
      ],
      tests: [
        { inputs: { stickers: [] }, output: [[]], note: 'Empty bag: only the empty set' },
        { inputs: { stickers: [2, 2, 2] }, output: [[], [2], [2, 2], [2, 2, 2]], note: 'All identical' },
        { inputs: { stickers: [1, 2, 3] }, output: [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]], note: 'All different' },
        {
          inputs: { stickers: [4, 4, 1, 1] },
          output: [[], [1], [1, 1], [1, 1, 4], [1, 1, 4, 4], [1, 4], [1, 4, 4], [4], [4, 4]],
          note: 'Two pairs',
        },
      ],
      starter: {
        javascript: `function distinctSets(stickers) {
  // Return every distinct subset, each and all in increasing order.
  return [[]];
}
`,
      },
      hints: [
        'Sort first, so equal stickers sit next to each other.',
        'Build subsets by choosing the next sticker from some position on; every partial choice is itself a subset to record.',
        'At one level of the choice, skip a sticker equal to the one just tried: it would build the same sets again.',
      ],
      solution: {
        explanation: [
          'ordered puts equal numbers side by side. choose(start, chosen) records chosen (every partial choice is a subset) and then tries each next number from position start on.',
          'Within one call, a number equal to the previous one tried there is skipped: choosing it would only rebuild the same subsets. Taking numbers left to right, and recording before going deeper, lists the subsets in the required order.',
        ],
        code: `function distinctSets(stickers) {
  const ordered = [...stickers].sort((a, b) => a - b);
  const out = [];
  const choose = (start, chosen) => {
    out.push([...chosen]);
    for (let i = start; i < ordered.length; i++) {
      if (i > start && ordered[i] === ordered[i - 1]) continue;
      chosen.push(ordered[i]);
      choose(i + 1, chosen);
      chosen.pop();
    }
  };
  choose(0, []);
  return out;
}
`,
        complexity: {
          time: 'O(n · 2^n)',
          space: 'O(n)',
          assumptions: 'n is stickers.length; there are at most 2^n subsets, each copied in O(n).',
        },
      },
      visualization: {
        spec: 'The call tree has one box per recorded subset; skipped equal numbers make no call. chosen grows and shrinks as the search backtracks.',
        renderers: ['call-tree', 'call-stack', 'array-cells'],
      },
    },
  },

  'i100-051': {
    prerequisites: ['backtracking', 'strings-and-chars'],
    related: ['i100-071', 'i100-072'],
    content: {
      statement: [
        'A poet cuts a word into pieces for a word-art poster, and wants every piece to read the same forwards and backwards (a palindrome), like "n | oo | n".',
        'Given text, return every way to cut it into palindromic pieces. Ways are listed by the length of their first piece, shortest first, then by the second piece, and so on.',
      ],
      inputFormat: 'text: a string of lowercase letters a–z.',
      outputFormat: 'An array of ways, each an array of pieces in order.',
      constraints: ['0 ≤ text.length ≤ 16'],
      rules: [
        'Every piece is a non-empty palindrome, and the pieces in order spell text.',
        'A single letter is always a palindrome.',
        'Empty text has one way: no pieces.',
      ],
      entry: 'mirrorCuts',
      params: [{ name: 'text', kind: 'auto' }],
      examples: [
        { inputs: { text: 'noon' }, output: [['n', 'o', 'o', 'n'], ['n', 'oo', 'n'], ['noon']], note: 'Three ways.' },
        {
          inputs: { text: 'xyy' },
          output: [
            ['x', 'y', 'y'],
            ['x', 'yy'],
          ],
          note: '"xy" and "xyy" are not palindromes.',
        },
      ],
      tests: [
        { inputs: { text: '' }, output: [[]], note: 'Empty text' },
        { inputs: { text: 'q' }, output: [['q']], note: 'One letter' },
        { inputs: { text: 'abc' }, output: [['a', 'b', 'c']], note: 'Only single letters' },
        {
          inputs: { text: 'level' },
          output: [['l', 'e', 'v', 'e', 'l'], ['l', 'eve', 'l'], ['level']],
          note: 'A palindrome inside a palindrome',
        },
        { inputs: { text: 'abba' }, output: [['a', 'b', 'b', 'a'], ['a', 'bb', 'a'], ['abba']], note: 'Even-length palindromes' },
      ],
      starter: {
        javascript: `function mirrorCuts(text) {
  // Return every way to cut text into palindromes.
  return [];
}
`,
      },
      hints: [
        'Choose the first piece: it must be a palindrome. Then cut the rest the same way.',
        'Try first pieces from the shortest to the longest, and keep only palindromes.',
        'Record the pieces when the whole text is used, and undo the last piece before trying a longer one.',
      ],
      solution: {
        explanation: [
          'cut(start, pieces) cuts text[start..] given the pieces chosen before start. Every end from start onward gives a candidate piece text[start..end]; isMirror keeps only palindromes.',
          'A palindrome piece is added, the rest is cut recursively, and the piece is removed again (the backtracking step). Trying shorter pieces first gives the required order; reaching the end records a copy of pieces.',
        ],
        code: `function mirrorCuts(text) {
  const out = [];
  const isMirror = (lo, hi) => {
    while (lo < hi) {
      if (text[lo] !== text[hi]) return false;
      lo++;
      hi--;
    }
    return true;
  };
  const cut = (start, pieces) => {
    if (start === text.length) {
      out.push([...pieces]);
      return;
    }
    for (let end = start; end < text.length; end++) {
      if (!isMirror(start, end)) continue;
      pieces.push(text.slice(start, end + 1));
      cut(end + 1, pieces);
      pieces.pop();
    }
  };
  cut(0, []);
  return out;
}
`,
        complexity: {
          time: 'O(n · 2^n)',
          space: 'O(n)',
          assumptions: 'n is text.length; there are at most 2^(n−1) ways, each checked and copied in O(n).',
        },
      },
      visualization: {
        spec: 'text is drawn as character cells; the call tree is the decision tree of cuts, and pieces grows and shrinks as the search backtracks.',
        renderers: ['call-tree', 'call-stack', 'string-cells'],
      },
    },
  },

  'i100-052': {
    prerequisites: ['backtracking', 'hash-maps'],
    related: ['i100-048', 'i100-051'],
    content: {
      statement: [
        'Old phone keypads put letters on the digit keys: 2 = abc, 3 = def, 4 = ghi, 5 = jkl, 6 = mno, 7 = pqrs, 8 = tuv, 9 = wxyz. A vanity-number site shows every word a number could spell.',
        'Given a string of digits from 2 to 9, return every letter combination it can spell, in alphabetical order.',
      ],
      inputFormat: 'digits: a string of digits 2–9.',
      outputFormat: 'An array of strings in alphabetical order.',
      constraints: ['0 ≤ digits.length ≤ 4'],
      rules: ['Each digit becomes exactly one of its letters.', 'No digits: return [].', 'Order: alphabetical.'],
      entry: 'keypadSpellings',
      params: [{ name: 'digits', kind: 'auto' }],
      examples: [
        {
          inputs: { digits: '47' },
          output: ['gp', 'gq', 'gr', 'gs', 'hp', 'hq', 'hr', 'hs', 'ip', 'iq', 'ir', 'is'],
          note: '3 × 4 combinations.',
        },
        { inputs: { digits: '9' }, output: ['w', 'x', 'y', 'z'], note: 'One digit, four letters.' },
      ],
      tests: [
        { inputs: { digits: '' }, output: [], note: 'No digits' },
        { inputs: { digits: '22' }, output: ['aa', 'ab', 'ac', 'ba', 'bb', 'bc', 'ca', 'cb', 'cc'], note: 'The same digit twice' },
        {
          inputs: { digits: '78' },
          output: ['pt', 'pu', 'pv', 'qt', 'qu', 'qv', 'rt', 'ru', 'rv', 'st', 'su', 'sv'],
          note: 'A four-letter key first',
        },
        {
          inputs: { digits: '586' },
          output: [
            'jtm',
            'jtn',
            'jto',
            'jum',
            'jun',
            'juo',
            'jvm',
            'jvn',
            'jvo',
            'ktm',
            'ktn',
            'kto',
            'kum',
            'kun',
            'kuo',
            'kvm',
            'kvn',
            'kvo',
            'ltm',
            'ltn',
            'lto',
            'lum',
            'lun',
            'luo',
            'lvm',
            'lvn',
            'lvo',
          ],
          note: 'Three digits',
        },
      ],
      starter: {
        javascript: `function keypadSpellings(digits) {
  // Return every letter combination the digits can spell, in alphabetical order.
  return [];
}
`,
      },
      hints: [
        'Keep a table from each digit to its letters.',
        'Build a word one digit at a time: for the next digit, try each of its letters and continue with the following digit.',
        'Letters are tried in alphabetical order, so the finished words come out in alphabetical order.',
      ],
      solution: {
        explanation: [
          'letters maps each digit to the letters on its key. spell(i, text) has already chosen letters for digits[0..i − 1].',
          'It tries each letter of digits[i] in order and continues with digit i + 1; when every digit has a letter, text is a finished combination. Empty input returns [] by the rules.',
        ],
        code: `function keypadSpellings(digits) {
  const letters = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
  const out = [];
  if (digits.length === 0) return out;
  const spell = (i, text) => {
    if (i === digits.length) {
      out.push(text);
      return;
    }
    for (const ch of letters[digits[i]]) spell(i + 1, text + ch);
  };
  spell(0, '');
  return out;
}
`,
        complexity: {
          time: 'O(4^n · n)',
          space: 'O(n)',
          assumptions: 'n is digits.length; a key has at most 4 letters, and each word takes O(n) to build.',
        },
      },
      visualization: {
        spec: 'The call tree has one level per digit and one branch per letter; out fills with finished words.',
        renderers: ['call-tree', 'call-stack', 'array-cells'],
      },
    },
  },

  'i100-053': {
    prerequisites: ['recursion-basics', 'divide-and-conquer'],
    related: ['i100-048', 'i100-096'],
    content: {
      statement: [
        'A finance app compounds a growth factor x over n periods: x multiplied by itself n times, or for a negative n, divided n times. Multiplying one period at a time is too slow for large n.',
        'Given x and an integer n, return x to the power n using O(log |n|) multiplications.',
      ],
      inputFormat: 'x: a number. n: an integer.',
      outputFormat: 'A number.',
      constraints: ['-100 < x < 100', '-2^31 ≤ n ≤ 2^31 − 1', 'x is not 0 when n is negative.'],
      rules: [
        'x^0 is 1.',
        'x^(−n) is 1 / x^n.',
        'Use O(log |n|) multiplications: no loop of n multiplications, and no built-in power function.',
      ],
      entry: 'fastPower',
      params: [
        { name: 'x', kind: 'auto' },
        { name: 'n', kind: 'auto' },
      ],
      examples: [
        { inputs: { x: 2, n: 9 }, output: 512, note: '2^9.' },
        { inputs: { x: 4, n: -2 }, output: 0.0625, note: '1 / 16.' },
      ],
      tests: [
        { inputs: { x: 1.5, n: 3 }, output: 3.375, note: 'A fraction cubed' },
        { inputs: { x: 2, n: 0 }, output: 1, note: 'Power 0' },
        { inputs: { x: -2, n: 5 }, output: -32, note: 'A negative base, odd power' },
        { inputs: { x: 0.5, n: -3 }, output: 8, note: 'A negative power of a fraction' },
        { inputs: { x: -1, n: -7 }, output: -1, note: 'Negative base and power' },
        { inputs: { x: 10, n: 1 }, output: 10, note: 'Power 1' },
      ],
      starter: {
        javascript: `function fastPower(x, n) {
  // Return x to the power n with O(log |n|) multiplications.
  return 1;
}
`,
      },
      hints: [
        'x^n = (x^(n/2))² when n is even, so half the work gives the whole answer with one more multiplication.',
        'For odd n, multiply by one more x: x^n = (x^⌊n/2⌋)² × x.',
        'A negative power is the reciprocal of the positive one.',
      ],
      solution: {
        explanation: [
          'A negative n is turned around: x^n = 1 / x^(−n). x^0 is 1.',
          'Otherwise half = x^⌊n/2⌋ is computed once and squared, with one extra x for odd n. Each call halves n, so there are O(log n) calls and at most two multiplications each.',
        ],
        code: `function fastPower(x, n) {
  if (n < 0) return 1 / fastPower(x, -n);
  if (n === 0) return 1;
  const half = fastPower(x, Math.floor(n / 2));
  return n % 2 === 0 ? half * half : half * half * x;
}
`,
        complexity: {
          time: 'O(log |n|)',
          space: 'O(log |n|)',
          assumptions: 'Each multiplication is one operation; the recursion is O(log |n|) deep.',
        },
      },
      visualization: {
        spec: 'The call stack shows n halving on the way down; each call’s result, half squared (and times x for odd n), is shown on the way back up.',
        renderers: ['call-stack'],
      },
    },
  },

  'i100-054': {
    prerequisites: ['heaps'],
    related: ['i100-055', 'i100-056'],
    content: {
      statement: [
        'An arcade leaderboard shows a "beat this" score: the k-th highest score so far. Scores arrive one at a time, and the display updates after each.',
        'Given k and the scores in arrival order, return the k-th highest score after each arrival, or null while fewer than k scores have arrived.',
      ],
      inputFormat: 'k: a positive integer. scores: an array of integers.',
      outputFormat: 'An array with one entry per score.',
      constraints: ['1 ≤ k ≤ 10,000', '0 ≤ scores.length ≤ 10,000'],
      rules: ['Equal scores count separately.', 'Fewer than k scores so far: null.', 'Each update should take O(log k) time.'],
      entry: 'kthHighest',
      params: [
        { name: 'k', kind: 'auto' },
        { name: 'scores', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { k: 3, scores: [40, 10, 50, 20, 60, 30] },
          output: [null, null, 10, 20, 40, 40],
          note: 'After 60 the top three are 60, 50, 40.',
        },
        { inputs: { k: 1, scores: [5, 3, 8] }, output: [5, 5, 8], note: 'k = 1 is the best score so far.' },
      ],
      tests: [
        { inputs: { k: 2, scores: [] }, output: [], note: 'No scores' },
        { inputs: { k: 2, scores: [7] }, output: [null], note: 'Fewer than k' },
        { inputs: { k: 2, scores: [4, 4, 4] }, output: [null, 4, 4], note: 'Equal scores' },
        { inputs: { k: 3, scores: [-1, -5, -3, 0] }, output: [null, null, -5, -3], note: 'Negative scores' },
      ],
      starter: {
        javascript: `function kthHighest(k, scores) {
  // After each score, return the k-th highest so far (or null).
  return scores.map(() => null);
}
`,
      },
      hints: [
        'Only the k highest scores so far can ever matter.',
        'Keep those k scores in a min-heap: its top is the smallest of them, which is exactly the k-th highest.',
        'A new score enters only if the heap isn’t full yet or the score beats the top, which it then replaces.',
      ],
      solution: {
        explanation: [
          'heap is a min-heap of the k highest scores so far, so heap[0] is the k-th highest. While it has fewer than k scores, each new one is added.',
          'Once it is full, a new score that beats heap[0] replaces it and sifts down; a lower score can’t be among the k highest and is ignored. Each update walks one path of the heap: O(log k).',
        ],
        code: `function kthHighest(k, scores) {
  const heap = []; // min-heap of the k highest scores so far
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
  const out = [];
  for (const score of scores) {
    if (heap.length < k) {
      heap.push(score);
      siftUp(heap.length - 1);
    } else if (score > heap[0]) {
      heap[0] = score;
      siftDown(0);
    }
    out.push(heap.length === k ? heap[0] : null);
  }
  return out;
}
`,
        complexity: { time: 'O(n log k)', space: 'O(k)', assumptions: 'n is scores.length.' },
      },
      visualization: {
        spec: 'The heap is drawn as a tree and as cells at once, with swaps gliding between parent and child; the answers fill out.',
        renderers: ['heap-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-055': {
    prerequisites: ['heaps'],
    related: ['i100-054', 'i100-059'],
    content: {
      statement: [
        'A rock-crushing game takes the two heaviest stones and smashes them together. Equal stones both turn to dust; otherwise the heavier one survives, lighter by the other’s weight. This repeats until at most one stone is left.',
        'Given the stones’ weights, return the weight of the last stone, or 0 if none is left.',
      ],
      inputFormat: 'stones: an array of positive integers.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ stones.length ≤ 30', '1 ≤ stones[i] ≤ 1,000'],
      rules: ['Always smash the two heaviest stones.', 'No stones left: return 0.'],
      entry: 'lastStone',
      params: [{ name: 'stones', kind: 'auto' }],
      examples: [
        { inputs: { stones: [6, 3, 9, 2] }, output: 2, note: '9 and 6 leave 3; the two 3s vanish; 2 is left.' },
        { inputs: { stones: [3, 3] }, output: 0, note: 'Equal stones both vanish.' },
      ],
      tests: [
        { inputs: { stones: [5] }, output: 5, note: 'One stone' },
        { inputs: { stones: [] }, output: 0, note: 'No stones' },
        { inputs: { stones: [10, 4, 4, 1] }, output: 1, note: 'Several rounds' },
        { inputs: { stones: [8, 8, 8] }, output: 8, note: 'One of three equals is left' },
        { inputs: { stones: [1, 3, 5, 7] }, output: 0, note: 'Everything vanishes' },
      ],
      starter: {
        javascript: `function lastStone(stones) {
  // Return the weight of the last stone, or 0.
  return 0;
}
`,
      },
      hints: [
        'You need the two heaviest stones over and over, while new stones keep being added.',
        'A max-heap gives the heaviest stone in O(log n) and takes a new one in O(log n).',
        'Pop two, push their difference if it isn’t 0, and repeat while two stones remain.',
      ],
      solution: {
        explanation: [
          'heap is a max-heap: every parent is at least as heavy as its children, so heap[0] is the heaviest stone. push sifts a new stone up; pop takes the top and sifts the last stone down from the top.',
          'Each round pops the two heaviest and pushes back their difference if it isn’t 0. When at most one stone is left, it is the answer.',
        ],
        code: `function lastStone(stones) {
  const heap = []; // max-heap
  const push = (x) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent] >= heap[i]) break;
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
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let largest = i;
        if (left < heap.length && heap[left] > heap[largest]) largest = left;
        if (right < heap.length && heap[right] > heap[largest]) largest = right;
        if (largest === i) break;
        [heap[i], heap[largest]] = [heap[largest], heap[i]];
        i = largest;
      }
    }
    return top;
  };
  for (const s of stones) push(s);
  while (heap.length > 1) {
    const a = pop();
    const b = pop();
    if (a !== b) push(a - b);
  }
  return heap.length === 0 ? 0 : heap[0];
}
`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(n)',
          assumptions: 'n is stones.length; each round is O(log n) and removes at least one stone.',
        },
      },
      visualization: {
        spec: 'The heap is drawn as a tree and as cells at once; each round pops the two heaviest and may push their difference.',
        renderers: ['heap-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-056': {
    prerequisites: ['heaps', 'sorting'],
    related: ['i100-054', 'i100-055'],
    content: {
      statement: [
        'A lighthouse keeper logs the map positions of rescue beacons. When a boat signals from the harbour, at the origin (0, 0), the keeper needs the k nearest beacons.',
        'Given the points and k, return the k points closest to the origin, nearest first. Points at the same distance are ordered by x, then by y.',
      ],
      inputFormat: 'points: an array of [x, y] integer pairs. k: an integer from 1 to points.length.',
      outputFormat: 'An array of k points.',
      constraints: ['1 ≤ k ≤ points.length ≤ 10,000', '-10^4 ≤ x, y ≤ 10^4'],
      rules: [
        'Distance is the straight-line distance; comparing x² + y² is enough.',
        'Order: nearest first; ties by smaller x, then smaller y.',
        'Keep at most k points at a time: O(n log k).',
      ],
      entry: 'nearestBeacons',
      params: [
        { name: 'points', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            points: [
              [3, 4],
              [-1, 1],
              [0, 2],
              [2, -2],
              [1, 0],
            ],
            k: 2,
          },
          output: [
            [1, 0],
            [-1, 1],
          ],
          note: 'Squared distances 1 and 2.',
        },
        {
          inputs: {
            points: [
              [5, 5],
              [-5, -5],
            ],
            k: 1,
          },
          output: [[-5, -5]],
          note: 'Equally far: smaller x first.',
        },
      ],
      tests: [
        { inputs: { points: [[0, 0]], k: 1 }, output: [[0, 0]], note: 'One point' },
        {
          inputs: {
            points: [
              [1, 1],
              [-1, -1],
              [1, -1],
            ],
            k: 2,
          },
          output: [
            [-1, -1],
            [1, -1],
          ],
          note: 'All tied',
        },
        {
          inputs: {
            points: [
              [2, 0],
              [0, 2],
              [-2, 0],
              [0, -2],
            ],
            k: 3,
          },
          output: [
            [-2, 0],
            [0, -2],
            [0, 2],
          ],
          note: 'Ties by x, then y',
        },
        {
          inputs: {
            points: [
              [7, 1],
              [1, 7],
              [3, 3],
            ],
            k: 3,
          },
          output: [
            [3, 3],
            [1, 7],
            [7, 1],
          ],
          note: 'All points, sorted',
        },
      ],
      starter: {
        javascript: `function nearestBeacons(points, k) {
  // Return the k points nearest the origin, nearest first.
  return [];
}
`,
      },
      hints: [
        'Sorting all the points works in O(n log n), but you only need k of them.',
        'Keep the best k seen so far in a max-heap ordered by the answer’s order: its top is the worst of them.',
        'A new point that beats the top replaces it. At the end, sort the k points kept.',
      ],
      solution: {
        explanation: [
          'after(a, b) is positive when a comes after b in the answer: farther, or equally far with a larger x, then y. heap is a max-heap by that order, holding the best k points so far, with the worst of them on top.',
          'A new point fills the heap while it has room; once full, a point that comes before the top replaces it and sifts down. Every point costs O(log k), and the k kept points are finally sorted with the same order.',
        ],
        code: `function nearestBeacons(points, k) {
  const dist = (p) => p[0] * p[0] + p[1] * p[1];
  const after = (a, b) => dist(a) - dist(b) || a[0] - b[0] || a[1] - b[1];
  const heap = []; // the best k so far, the one that comes last on top
  const swap = (a, b) => {
    [heap[a], heap[b]] = [heap[b], heap[a]];
  };
  const siftUp = (i) => {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (after(heap[i], heap[parent]) <= 0) return;
      swap(i, parent);
      i = parent;
    }
  };
  const siftDown = (i) => {
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let last = i;
      if (left < heap.length && after(heap[left], heap[last]) > 0) last = left;
      if (right < heap.length && after(heap[right], heap[last]) > 0) last = right;
      if (last === i) return;
      swap(i, last);
      i = last;
    }
  };
  for (const p of points) {
    if (heap.length < k) {
      heap.push(p);
      siftUp(heap.length - 1);
    } else if (after(p, heap[0]) < 0) {
      heap[0] = p;
      siftDown(0);
    }
  }
  return [...heap].sort(after);
}
`,
        complexity: { time: 'O(n log k)', space: 'O(k)', assumptions: 'n is points.length; the final sort of k points is O(k log k).' },
      },
      visualization: {
        spec: 'The heap of kept points is drawn as a tree and as cells at once; a closer point replaces the top and sifts down.',
        renderers: ['heap-tree', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-057': {
    prerequisites: ['hash-maps', 'greedy'],
    related: ['i100-058', 'i100-085'],
    content: {
      statement: [
        'A print shop’s machine runs one job per minute. Jobs of the same type need a cool-down: after a job of one type, at least gap minutes must pass before the next job of that type can start. The machine may sit idle, and jobs can run in any order.',
        'Given the job types tasks (single capital letters) and gap, return the fewest minutes needed to finish every job.',
      ],
      inputFormat: 'tasks: an array of single uppercase letters. gap: a non-negative integer.',
      outputFormat: 'An integer: the fewest minutes.',
      constraints: ['1 ≤ tasks.length ≤ 10,000', '0 ≤ gap ≤ 100'],
      rules: [
        'Two jobs of the same type must start at least gap + 1 minutes apart.',
        'Idle minutes count toward the total.',
        'gap = 0: no waiting is ever needed.',
      ],
      entry: 'fewestSlots',
      params: [
        { name: 'tasks', kind: 'auto' },
        { name: 'gap', kind: 'auto' },
      ],
      examples: [
        { inputs: { tasks: ['A', 'A', 'B'], gap: 2 }, output: 4, note: 'A B idle A.' },
        { inputs: { tasks: ['C', 'C', 'C', 'D'], gap: 1 }, output: 5, note: 'C D C idle C.' },
      ],
      tests: [
        { inputs: { tasks: ['X', 'Y', 'Z'], gap: 3 }, output: 3, note: 'All different: no waiting' },
        { inputs: { tasks: ['E', 'E', 'F', 'F'], gap: 0 }, output: 4, note: 'No cool-down' },
        { inputs: { tasks: ['G', 'G', 'G', 'H', 'H', 'H', 'I'], gap: 2 }, output: 8, note: 'Two types tie for most' },
        { inputs: { tasks: ['J', 'K', 'J', 'K', 'L', 'M', 'N', 'O'], gap: 1 }, output: 8, note: 'Enough other jobs to fill every wait' },
        { inputs: { tasks: ['P'], gap: 5 }, output: 1, note: 'One job' },
      ],
      starter: {
        javascript: `function fewestSlots(tasks, gap) {
  // Return the fewest minutes to run every job with the cool-down.
  return tasks.length;
}
`,
      },
      hints: [
        'The most common type decides the shape: its jobs must be spread out gap + 1 minutes apart.',
        'If that type has m jobs, they make m − 1 full blocks of gap + 1 minutes, then the last job (and any other type with m jobs) runs at the end.',
        'Other jobs fill the gaps in the blocks. If there are more jobs than gaps, no idle time is needed at all: the answer is just the number of jobs.',
      ],
      solution: {
        explanation: [
          'counts holds how many jobs each type has; most is the largest count and tied the number of types that have it. The most common type’s jobs need (most − 1) blocks of gap + 1 minutes between them, and the tied types each add one minute in the last block: (most − 1) × (gap + 1) + tied.',
          'Every other job fits into the blocks’ free minutes. If the jobs outnumber those minutes, the blocks just get longer and the machine is never idle, so the answer is tasks.length. The answer is the larger of the two.',
        ],
        code: `function fewestSlots(tasks, gap) {
  const counts = new Map();
  for (const t of tasks) counts.set(t, (counts.get(t) ?? 0) + 1);
  let most = 0;
  for (const c of counts.values()) most = Math.max(most, c);
  let tied = 0;
  for (const c of counts.values()) if (c === most) tied++;
  return Math.max(tasks.length, (most - 1) * (gap + 1) + tied);
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is tasks.length; there are at most 26 types.' },
      },
      visualization: {
        spec: 'The tasks are drawn as cells and counts as a map of each type’s jobs; most and tied are blocks that decide the answer.',
        renderers: ['array-cells', 'hash-map'],
      },
      view: { mapColumns: ['type', 'jobs'] },
    },
  },

  'i100-058': {
    prerequisites: ['hash-maps', 'hash-sets'],
    related: ['i100-057', 'i100-026'],
    content: {
      statement: [
        'A small social app lets users post, follow and unfollow each other. A user’s feed shows the 10 most recent posts made by the user or by anyone they follow, newest first.',
        'Process ops in order: ["post", user, postId], ["follow", a, b] (a starts following b), ["unfollow", a, b], and ["feed", user]. Return null for each post, follow and unfollow, and the list of post ids for each feed.',
      ],
      inputFormat: 'ops: an array of operations; users and post ids are integers.',
      outputFormat: 'An array with one entry per operation.',
      constraints: ['1 ≤ ops.length ≤ 3,000', 'Post ids are unique.'],
      rules: [
        'A feed lists at most 10 posts, the most recent first.',
        'A user always sees their own posts; following yourself changes nothing.',
        'Unfollowing someone you don’t follow changes nothing.',
      ],
      entry: 'miniFeed',
      params: [{ name: 'ops', kind: 'auto' }],
      examples: [
        {
          inputs: {
            ops: [
              ['post', 1, 101],
              ['post', 2, 201],
              ['feed', 1],
              ['follow', 1, 2],
              ['feed', 1],
              ['unfollow', 1, 2],
              ['feed', 1],
            ],
          },
          output: [null, null, [101], null, [201, 101], null, [101]],
          note: 'User 2’s post shows only while 1 follows 2.',
        },
        {
          inputs: {
            ops: [
              ['follow', 1, 2],
              ['post', 2, 5],
              ['post', 3, 6],
              ['post', 2, 7],
              ['feed', 1],
              ['feed', 2],
            ],
          },
          output: [null, null, null, null, [7, 5], [7, 5]],
          note: 'User 3 isn’t followed; user 2 sees their own posts.',
        },
      ],
      tests: [
        { inputs: { ops: [['feed', 4]] }, output: [[]], note: 'Nobody posted yet' },
        {
          inputs: {
            ops: [
              ['follow', 1, 1],
              ['post', 1, 9],
              ['feed', 1],
            ],
          },
          output: [null, null, [9]],
          note: 'Following yourself',
        },
        {
          inputs: { ops: [...Array.from({ length: 12 }, (_, i) => ['post', 1, i]), ['feed', 1]] },
          output: [...Array.from({ length: 12 }, () => null), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]],
          note: 'Only the 10 newest',
        },
        {
          inputs: {
            ops: [
              ['follow', 5, 6],
              ['follow', 5, 7],
              ['post', 6, 1],
              ['post', 7, 2],
              ['post', 5, 3],
              ['post', 6, 4],
              ['unfollow', 5, 7],
              ['feed', 5],
            ],
          },
          output: [null, null, null, null, null, null, null, [4, 3, 1]],
          note: 'Several sources, one unfollowed',
        },
      ],
      starter: {
        javascript: `function miniFeed(ops) {
  // Return null for post, follow and unfollow, and the 10 newest visible post ids for feed.
  return ops.map(() => null);
}
`,
      },
      hints: [
        'Keep each user’s posts in a list, oldest first, stamped with a global counter so posts by different users can be compared.',
        'Keep each user’s follows in a set.',
        'For a feed, every source’s newest post is at the end of its list: repeatedly take the newest of those, up to 10 times.',
      ],
      solution: {
        explanation: [
          'posts maps each user to their [time, id] pairs in posting order, with time from one counter, and follows maps each user to the set of users they follow (never themselves).',
          'A feed merges the lists of the user and everyone they follow from the newest end: cursor marks each source’s next post, and each round takes the newest of those. Ten rounds at most, each comparing one post per source.',
        ],
        code: `function miniFeed(ops) {
  const posts = new Map(); // user → [time, id] pairs in posting order
  const follows = new Map(); // user → users they follow
  let time = 0;
  const out = [];
  for (const op of ops) {
    const [kind, user] = op;
    if (kind === 'post') {
      if (!posts.has(user)) posts.set(user, []);
      posts.get(user).push([time++, op[2]]);
      out.push(null);
    } else if (kind === 'follow' || kind === 'unfollow') {
      if (!follows.has(user)) follows.set(user, new Set());
      if (kind === 'follow' && op[2] !== user) follows.get(user).add(op[2]);
      if (kind === 'unfollow') follows.get(user).delete(op[2]);
      out.push(null);
    } else {
      const sources = [user, ...(follows.get(user) ?? [])].filter((u) => posts.has(u));
      const cursor = sources.map((u) => posts.get(u).length - 1);
      const feed = [];
      while (feed.length < 10) {
        let pick = -1;
        for (let s = 0; s < sources.length; s++) {
          if (cursor[s] < 0) continue;
          if (pick === -1 || posts.get(sources[s])[cursor[s]][0] > posts.get(sources[pick])[cursor[pick]][0]) pick = s;
        }
        if (pick === -1) break;
        feed.push(posts.get(sources[pick])[cursor[pick]][1]);
        cursor[pick]--;
      }
      out.push(feed);
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(1) per post, follow or unfollow; O(10 · f) per feed',
          space: 'O(p + e)',
          assumptions:
            'f is the number of users a user follows, p the number of posts and e the number of follows; map and set operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The posts and follows maps grow as operations arrive; during a feed, cursor marks each source’s next post and feed fills newest first.',
        renderers: ['hash-map', 'hash-set', 'array-cells'],
      },
    },
  },

  'i100-059': {
    prerequisites: ['heaps', 'greedy', 'sorting'],
    related: ['i100-055', 'i100-086'],
    content: {
      statement: [
        'A start-up studio can take on at most k projects, one after another. Each project needs a minimum amount of capital before it can start and adds a profit to the capital when finished (the cost isn’t spent, it is only a requirement).',
        'Given k, the starting capital, and each project’s costs[i] and profits[i], return the largest capital the studio can end with.',
      ],
      inputFormat: 'k, capital: non-negative integers. costs, profits: arrays of non-negative integers of the same length.',
      outputFormat: 'An integer: the final capital.',
      constraints: ['0 ≤ k ≤ 100,000', '0 ≤ costs.length ≤ 100,000', '0 ≤ costs[i], profits[i] ≤ 10^4'],
      rules: [
        'A project can start only if the current capital is at least its cost.',
        'Each project can be done at most once.',
        'Fewer than k projects may be done if none is affordable.',
      ],
      entry: 'finalCapital',
      params: [
        { name: 'k', kind: 'auto' },
        { name: 'capital', kind: 'auto' },
        { name: 'costs', kind: 'auto' },
        { name: 'profits', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { k: 2, capital: 1, costs: [0, 2, 3, 1], profits: [2, 5, 10, 3] },
          output: 14,
          note: 'Profit 3 first (cost 1), then 10 becomes affordable.',
        },
        { inputs: { k: 3, capital: 0, costs: [1, 2], profits: [5, 5] }, output: 0, note: 'Nothing is affordable.' },
      ],
      tests: [
        { inputs: { k: 1, capital: 5, costs: [0], profits: [0] }, output: 5, note: 'A project with no profit' },
        { inputs: { k: 3, capital: 0, costs: [0, 0, 0], profits: [4, 1, 2] }, output: 7, note: 'Everything affordable' },
        { inputs: { k: 2, capital: 2, costs: [3, 2, 8], profits: [1, 6, 4] }, output: 12, note: 'The biggest affordable profit each time' },
        {
          inputs: { k: 4, capital: 1, costs: [1, 1, 2, 15], profits: [1, 2, 3, 100] },
          output: 7,
          note: 'The big project stays out of reach',
        },
      ],
      starter: {
        javascript: `function finalCapital(k, capital, costs, profits) {
  // Return the largest capital after at most k projects.
  return capital;
}
`,
      },
      hints: [
        'At each step, which affordable project should you do? Capital only grows, so taking the largest profit never hurts.',
        'As capital grows, more projects become affordable. Sort the projects by cost and add them as they become affordable.',
        'Keep the affordable projects’ profits in a max-heap and pop the largest each step.',
      ],
      solution: {
        explanation: [
          'projects is sorted by cost, and unlocked counts the projects the capital has covered so far. Before each step, every newly covered project has its profit pushed onto heap, a max-heap.',
          'The step takes the largest profit: doing it can only make more projects affordable later, so no other choice ends better. If the heap is empty, nothing is affordable and the studio stops early.',
        ],
        code: `function finalCapital(k, capital, costs, profits) {
  const projects = costs.map((c, i) => [c, profits[i]]).sort((a, b) => a[0] - b[0]);
  const heap = []; // max-heap of affordable profits
  const push = (x) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent] >= heap[i]) break;
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
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let largest = i;
        if (left < heap.length && heap[left] > heap[largest]) largest = left;
        if (right < heap.length && heap[right] > heap[largest]) largest = right;
        if (largest === i) break;
        [heap[i], heap[largest]] = [heap[largest], heap[i]];
        i = largest;
      }
    }
    return top;
  };
  let unlocked = 0;
  for (let done = 0; done < k; done++) {
    while (unlocked < projects.length && projects[unlocked][0] <= capital) push(projects[unlocked++][1]);
    if (heap.length === 0) break;
    capital += pop();
  }
  return capital;
}
`,
        complexity: {
          time: 'O(n log n)',
          space: 'O(n)',
          assumptions: 'n is costs.length; each project is pushed and popped at most once.',
        },
      },
      visualization: {
        spec: 'The projects are drawn as rows of [cost, profit] in cost order; the heap of affordable profits is drawn as a tree and as cells, and capital grows with each pop.',
        renderers: ['heap-tree', 'grid', 'call-stack'],
      },
    },
  },

  'i100-060': {
    prerequisites: ['graphs-basics', 'hash-maps', 'queues'],
    related: ['i100-030', 'i100-064'],
    content: {
      statement: [
        'A map app stores towns as Vertex objects, each with a list of neighbouring towns. To edit a copy safely, it needs a deep copy: new Vertex objects with the same connections, pointing only at each other.',
        'The towns arrive as neighbour lists: graph[i] lists the towns next to town i. Build the Vertex objects, copy the map starting from town 0 (every town can be reached from it), and return the copy written as neighbour lists in the same order.',
      ],
      inputFormat: 'graph: an array of arrays; graph[i] lists the neighbours of town i (roads go both ways).',
      outputFormat: 'An array of arrays: the copy’s neighbour lists.',
      constraints: ['0 ≤ graph.length ≤ 100', 'The map is connected and has no road from a town to itself.'],
      rules: [
        'The copy must be made of new Vertex objects only.',
        'Each copied neighbour list keeps the original order.',
        'No towns: return [].',
      ],
      entry: 'copyMap',
      params: [{ name: 'graph', kind: 'auto' }],
      examples: [
        {
          inputs: {
            graph: [
              [1, 2],
              [0, 2],
              [0, 1],
            ],
          },
          output: [
            [1, 2],
            [0, 2],
            [0, 1],
          ],
          note: 'Three towns in a triangle.',
        },
        { inputs: { graph: [] }, output: [], note: 'No towns.' },
      ],
      tests: [
        { inputs: { graph: [[]] }, output: [[]], note: 'One town, no roads' },
        { inputs: { graph: [[1], [0]] }, output: [[1], [0]], note: 'Two towns' },
        { inputs: { graph: [[1], [0, 2], [1, 3], [2]] }, output: [[1], [0, 2], [1, 3], [2]], note: 'A line of four' },
        { inputs: { graph: [[3, 1], [0], [3], [2, 0]] }, output: [[3, 1], [0], [3], [2, 0]], note: 'Neighbours in any order' },
      ],
      starter: {
        javascript: `class Vertex {
  constructor(id) {
    this.id = id;
    this.neighbors = [];
  }
}

function copyMap(graph) {
  // Build the towns, deep-copy them from town 0, and return the copy's neighbour lists.
  return [];
}
`,
      },
      hints: [
        'Copying a town means copying its neighbours too, but neighbours lead back to towns already copied.',
        'Keep a map from each original town to its copy, so each town is copied once.',
        'A breadth-first walk from town 0 copies each town when it is first reached and fills in the copies’ neighbour lists.',
      ],
      solution: {
        explanation: [
          'The original towns are built from graph first. copyOf maps each original Vertex to its copy; town 0 is copied first and goes in the queue.',
          'Each town taken from the queue walks its neighbours: a neighbour seen for the first time is copied and queued, and either way its copy is added to this town’s copy’s list. The map makes every town copied exactly once, and the lists keep their order.',
        ],
        code: `class Vertex {
  constructor(id) {
    this.id = id;
    this.neighbors = [];
  }
}

function copyMap(graph) {
  // The original towns, built from the neighbour lists.
  const originals = graph.map((_, i) => new Vertex(i));
  graph.forEach((list, i) => {
    for (const j of list) originals[i].neighbors.push(originals[j]);
  });
  if (originals.length === 0) return [];

  // Breadth-first copy: each town is copied when first reached.
  const copyOf = new Map([[originals[0], new Vertex(0)]]);
  const queue = [originals[0]];
  while (queue.length > 0) {
    const v = queue.shift();
    for (const w of v.neighbors) {
      if (!copyOf.has(w)) {
        copyOf.set(w, new Vertex(w.id));
        queue.push(w);
      }
      copyOf.get(v).neighbors.push(copyOf.get(w));
    }
  }

  // The copy, written as neighbour lists.
  return originals.map((v) => copyOf.get(v).neighbors.map((w) => w.id));
}
`,
        complexity: {
          time: 'O(V + E)',
          space: 'O(V)',
          assumptions: 'V is the number of towns and E the number of roads; map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The map is drawn as a graph from graph; the original and copied Vertex objects, the copyOf map and the queue show the copy growing town by town.',
        renderers: ['graph', 'hash-map', 'queue-line'],
      },
    },
  },

  'i100-061': {
    prerequisites: ['matrices', 'queues', 'graphs-basics'],
    related: ['i100-062', 'i100-063'],
    content: {
      statement: [
        'A fruit warehouse stores crates on a grid: 0 is an empty spot, 1 a fresh crate and 2 a spoiled one. Every minute, each fresh crate directly above, below, left or right of a spoiled crate spoils too.',
        'Return how many minutes pass until no fresh crate is left, or -1 if some fresh crate never spoils.',
      ],
      inputFormat: 'grid: a non-empty grid of 0, 1 and 2.',
      outputFormat: 'An integer: the minutes, or -1.',
      constraints: ['1 ≤ rows, columns ≤ 10'],
      rules: [
        'Spoiling spreads only up, down, left and right.',
        'No fresh crates at the start: return 0.',
        'A fresh crate that no spoiled crate can reach makes the answer -1.',
      ],
      entry: 'minutesToSpoil',
      params: [{ name: 'grid', kind: 'auto' }],
      examples: [
        {
          inputs: {
            grid: [
              [2, 1, 0],
              [1, 1, 1],
              [0, 0, 1],
            ],
          },
          output: 4,
          note: 'The bottom-right crate spoils in minute 4.',
        },
        { inputs: { grid: [[1, 0, 2]] }, output: -1, note: 'The empty spot keeps the fresh crate safe.' },
      ],
      tests: [
        { inputs: { grid: [[0, 0]] }, output: 0, note: 'No crates at all' },
        {
          inputs: {
            grid: [
              [2, 2],
              [2, 2],
            ],
          },
          output: 0,
          note: 'Already all spoiled',
        },
        { inputs: { grid: [[1]] }, output: -1, note: 'Nothing spoiled to start it' },
        { inputs: { grid: [[2, 1, 1, 1, 1]] }, output: 4, note: 'A row, one crate per minute' },
        {
          inputs: {
            grid: [
              [1, 1, 1],
              [1, 2, 1],
              [1, 1, 1],
            ],
          },
          output: 2,
          note: 'Spreading out from the centre',
        },
      ],
      starter: {
        javascript: `function minutesToSpoil(grid) {
  // Return the minutes until no fresh crate is left, or -1.
  return 0;
}
`,
      },
      hints: [
        'Every spoiled crate spreads at the same time, so start from all of them at once.',
        'A breadth-first search in rounds: each round is one minute and spoils the fresh neighbours of the crates spoiled in the round before.',
        'Count the fresh crates first. When rounds stop with some still fresh, they can’t be reached.',
      ],
      solution: {
        explanation: [
          'queue starts with every spoiled crate, and fresh counts the fresh ones. Each round is one minute: every crate in queue spoils its fresh neighbours, which become the next round’s queue.',
          'Rounds continue while something is spreading and fresh crates remain. If fresh reaches 0, the number of rounds is the answer; otherwise some crate can never be reached.',
        ],
        code: `function minutesToSpoil(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  let minutes = 0;
  while (queue.length > 0 && fresh > 0) {
    const spreading = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== 1) continue;
        grid[nr][nc] = 2;
        fresh--;
        spreading.push([nr, nc]);
      }
    }
    queue = spreading;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}
`,
        complexity: {
          time: 'O(r · c)',
          space: 'O(r · c)',
          assumptions: 'r and c are the grid’s rows and columns; each crate spoils once.',
        },
      },
      visualization: {
        spec: 'The grid is drawn with each minute’s newly spoiled crates marked; queue holds the crates that spread next, and minutes and fresh are blocks.',
        renderers: ['grid', 'queue-line'],
      },
    },
  },

  'i100-062': {
    prerequisites: ['matrices', 'graphs-basics', 'hash-sets'],
    related: ['i100-061', 'i100-063'],
    content: {
      statement: [
        'An island is mapped as a grid of land heights. Its top and left edges face the North Sea, and its bottom and right edges face the South Sea. Rain flows from a cell to a neighbouring cell (up, down, left or right) whose height is the same or lower, and from an edge cell into the sea it faces.',
        'Return every cell from which rain can reach both seas, as [row, column] pairs in row-major order.',
      ],
      inputFormat: 'heights: a non-empty grid of non-negative integers.',
      outputFormat: 'An array of [row, column] pairs, ordered by row, then column.',
      constraints: ['1 ≤ rows, columns ≤ 20', '0 ≤ heights[r][c] ≤ 10^5'],
      rules: [
        'Water can move to an equal or lower neighbour, never higher.',
        'A corner cell touches both seas.',
        'Order: by row, then by column.',
      ],
      entry: 'bothSeas',
      params: [{ name: 'heights', kind: 'auto' }],
      examples: [
        {
          inputs: {
            heights: [
              [1, 2, 3],
              [2, 5, 2],
              [3, 1, 1],
            ],
          },
          output: [
            [0, 2],
            [1, 1],
            [2, 0],
          ],
          note: 'The two corners and the peak in the middle.',
        },
        {
          inputs: {
            heights: [
              [4, 4],
              [4, 4],
            ],
          },
          output: [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
          ],
          note: 'Flat land drains everywhere.',
        },
      ],
      tests: [
        { inputs: { heights: [[7]] }, output: [[0, 0]], note: 'One cell touches both seas' },
        {
          inputs: { heights: [[1, 9, 1]] },
          output: [
            [0, 0],
            [0, 1],
            [0, 2],
          ],
          note: 'One row: every cell touches both',
        },
        {
          inputs: {
            heights: [
              [3, 3, 3],
              [3, 1, 3],
              [3, 3, 3],
            ],
          },
          output: [
            [0, 0],
            [0, 1],
            [0, 2],
            [1, 0],
            [1, 2],
            [2, 0],
            [2, 1],
            [2, 2],
          ],
          note: 'A pit in the middle',
        },
        {
          inputs: {
            heights: [
              [2, 1],
              [1, 2],
            ],
          },
          output: [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
          ],
          note: 'Every cell is on an edge facing both',
        },
      ],
      starter: {
        javascript: `function bothSeas(heights) {
  // Return every [row, column] from which rain reaches both seas, in row-major order.
  return [];
}
`,
      },
      hints: [
        'Following the rain from every cell repeats a lot of work. Work backwards from the seas instead.',
        'From the North Sea’s edge cells, climb to neighbours at the same height or higher: those cells drain into the North Sea. Do the same from the South Sea.',
        'The answer is the cells reached by both climbs.',
      ],
      solution: {
        explanation: [
          'climb(starts) marks every cell from which rain reaches a sea: it starts from that sea’s edge cells and moves to neighbours at least as high, the reverse of the rain’s path. reached holds each cell as r · cols + c.',
          'One climb from the North Sea’s edges and one from the South Sea’s find the two sets; the cells in both, listed row by row, are the answer. Each climb visits every cell at most once.',
        ],
        code: `function bothSeas(heights) {
  const rows = heights.length;
  const cols = heights[0].length;
  const climb = (starts) => {
    const reached = new Set(starts.map(([r, c]) => r * cols + c));
    const stack = [...starts];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (reached.has(nr * cols + nc) || heights[nr][nc] < heights[r][c]) continue;
        reached.add(nr * cols + nc);
        stack.push([nr, nc]);
      }
    }
    return reached;
  };
  const north = [];
  const south = [];
  for (let r = 0; r < rows; r++) {
    north.push([r, 0]);
    south.push([r, cols - 1]);
  }
  for (let c = 0; c < cols; c++) {
    north.push([0, c]);
    south.push([rows - 1, c]);
  }
  const toNorth = climb(north);
  const toSouth = climb(south);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (toNorth.has(r * cols + c) && toSouth.has(r * cols + c)) out.push([r, c]);
    }
  }
  return out;
}
`,
        complexity: {
          time: 'O(r · c)',
          space: 'O(r · c)',
          assumptions: 'r and c are the grid’s rows and columns; set operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The heights are drawn as a grid; each climb’s stack and its reached set grow from one sea’s edges, and the answer lists the cells in both.',
        renderers: ['grid', 'hash-set', 'stack'],
      },
    },
  },

  'i100-063': {
    prerequisites: ['matrices', 'graphs-basics'],
    related: ['i100-062', 'i100-061'],
    content: {
      statement: [
        'A board game marks territory on a grid: "X" cells are walls and "O" cells are open. An open region (open cells joined up, down, left or right) that doesn’t touch the edge of the board is captured: all its cells become walls.',
        'Given board, return it after every enclosed open region is captured. Regions touching the edge stay open.',
      ],
      inputFormat: 'board: a non-empty grid of "X" and "O".',
      outputFormat: 'The board after capturing.',
      constraints: ['1 ≤ rows, columns ≤ 20'],
      rules: [
        'Regions connect only up, down, left and right, not diagonally.',
        'An open cell on the edge, and every open cell joined to it, stays open.',
        'Change board in place and return it.',
      ],
      entry: 'captureEnclosed',
      params: [{ name: 'board', kind: 'auto' }],
      examples: [
        {
          inputs: {
            board: [
              ['X', 'X', 'X', 'X', 'X'],
              ['X', 'O', 'X', 'O', 'X'],
              ['X', 'O', 'X', 'X', 'O'],
              ['X', 'X', 'X', 'X', 'X'],
            ],
          },
          output: [
            ['X', 'X', 'X', 'X', 'X'],
            ['X', 'X', 'X', 'X', 'X'],
            ['X', 'X', 'X', 'X', 'O'],
            ['X', 'X', 'X', 'X', 'X'],
          ],
          note: 'Two enclosed regions are captured; the O on the right edge stays.',
        },
        {
          inputs: {
            board: [
              ['X', 'X', 'X'],
              ['X', 'O', 'X'],
              ['X', 'X', 'X'],
            ],
          },
          output: [
            ['X', 'X', 'X'],
            ['X', 'X', 'X'],
            ['X', 'X', 'X'],
          ],
          note: 'One enclosed cell.',
        },
      ],
      tests: [
        { inputs: { board: [['O']] }, output: [['O']], note: 'An edge cell' },
        {
          inputs: {
            board: [
              ['X', 'O', 'X'],
              ['O', 'O', 'O'],
              ['X', 'O', 'X'],
            ],
          },
          output: [
            ['X', 'O', 'X'],
            ['O', 'O', 'O'],
            ['X', 'O', 'X'],
          ],
          note: 'A cross touching every edge',
        },
        { inputs: { board: [['O', 'X', 'O', 'X', 'O']] }, output: [['O', 'X', 'O', 'X', 'O']], note: 'One row: everything is on the edge' },
        {
          inputs: {
            board: [
              ['X', 'X', 'X', 'X', 'X'],
              ['X', 'O', 'O', 'O', 'X'],
              ['X', 'O', 'X', 'O', 'X'],
              ['X', 'X', 'X', 'O', 'X'],
            ],
          },
          output: [
            ['X', 'X', 'X', 'X', 'X'],
            ['X', 'O', 'O', 'O', 'X'],
            ['X', 'O', 'X', 'O', 'X'],
            ['X', 'X', 'X', 'O', 'X'],
          ],
          note: 'Joined to the bottom edge, so it stays',
        },
      ],
      starter: {
        javascript: `function captureEnclosed(board) {
  // Turn every open region that doesn't touch the edge into walls, and return board.
  return board;
}
`,
      },
      hints: [
        'It is easier to find the regions that are safe than the ones that are captured.',
        'Start from every open cell on the edge and mark everything joined to it as safe.',
        'Then every open cell that isn’t marked is enclosed: make it a wall, and turn the marks back into "O".',
      ],
      solution: {
        explanation: [
          'Every open edge cell starts a search (with a stack) that marks its whole region "S" for safe. A region with no edge cell is never marked.',
          'A final pass turns every remaining "O" into "X" (enclosed) and every "S" back into "O". Each cell is marked at most once.',
        ],
        code: `function captureEnclosed(board) {
  const rows = board.length;
  const cols = board[0].length;
  const stack = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const onEdge = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      if (onEdge && board[r][c] === 'O') {
        board[r][c] = 'S';
        stack.push([r, c]);
      }
    }
  }
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || board[nr][nc] !== 'O') continue;
      board[nr][nc] = 'S';
      stack.push([nr, nc]);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'O') board[r][c] = 'X';
      else if (board[r][c] === 'S') board[r][c] = 'O';
    }
  }
  return board;
}
`,
        complexity: { time: 'O(r · c)', space: 'O(r · c)', assumptions: 'r and c are the board’s rows and columns.' },
      },
      visualization: {
        spec: 'The board is drawn as a grid; safe cells turn "S" as the stack spreads from the edges, then the last pass flips the enclosed cells.',
        renderers: ['grid', 'stack'],
      },
    },
  },

  'i100-064': {
    prerequisites: ['graphs-basics', 'topological-sort', 'recursion-basics'],
    related: ['i100-069', 'i100-065'],
    content: {
      statement: [
        'A college lists its courses as numbers from 0 to n − 1, and each prerequisite pair [course, needed] says that needed must be passed before course. A student wants to know whether it is possible to finish every course at all.',
        'Return true if some order takes every course after all of its prerequisites, and false if the prerequisites go round in a loop.',
      ],
      inputFormat: 'n: a non-negative integer. pairs: an array of [course, needed] pairs of course numbers.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ n ≤ 2,000', '0 ≤ pairs.length ≤ 5,000'],
      rules: [
        'A course that needs itself can never be taken.',
        'Courses with no prerequisites can be taken any time.',
        'No courses: return true.',
      ],
      entry: 'canFinish',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'pairs', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 3,
            pairs: [
              [1, 0],
              [2, 1],
            ],
          },
          output: true,
          note: '0, then 1, then 2.',
        },
        {
          inputs: {
            n: 2,
            pairs: [
              [0, 1],
              [1, 0],
            ],
          },
          output: false,
          note: 'Each needs the other.',
        },
      ],
      tests: [
        { inputs: { n: 0, pairs: [] }, output: true, note: 'No courses' },
        { inputs: { n: 1, pairs: [] }, output: true, note: 'No prerequisites' },
        {
          inputs: {
            n: 4,
            pairs: [
              [1, 0],
              [2, 1],
              [3, 2],
              [1, 3],
            ],
          },
          output: false,
          note: 'A loop of three behind a start',
        },
        {
          inputs: {
            n: 4,
            pairs: [
              [1, 0],
              [2, 0],
              [3, 1],
              [3, 2],
            ],
          },
          output: true,
          note: 'Two paths meet, no loop',
        },
        { inputs: { n: 3, pairs: [[0, 0]] }, output: false, note: 'A course needing itself' },
      ],
      starter: {
        javascript: `function canFinish(n, pairs) {
  // Return true if every course can be taken after its prerequisites.
  return true;
}
`,
      },
      hints: [
        'Draw the courses as a graph with an arrow from each needed course to the course that needs it. Finishing is possible exactly when the graph has no cycle.',
        'A depth-first search finds a cycle when it reaches a course it is still in the middle of exploring.',
        'Give each course a state: not visited, in progress, or done. Reaching an in-progress course means a loop.',
      ],
      solution: {
        explanation: [
          'unlocks[c] lists the courses that need c. visit(c) marks c in progress (1), visits everything it unlocks, and marks it done (2).',
          'Reaching a course that is still in progress means the path came back to itself: a loop. A done course was already fully explored with no loop, so it is skipped. If no visit finds a loop, an order exists.',
        ],
        code: `function canFinish(n, pairs) {
  const unlocks = [];
  for (let c = 0; c < n; c++) unlocks.push([]);
  for (const [course, needed] of pairs) unlocks[needed].push(course);
  const state = new Array(n).fill(0); // 0 not visited, 1 in progress, 2 done
  const visit = (c) => {
    if (state[c] === 1) return false;
    if (state[c] === 2) return true;
    state[c] = 1;
    for (const nextCourse of unlocks[c]) {
      if (!visit(nextCourse)) return false;
    }
    state[c] = 2;
    return true;
  };
  for (let c = 0; c < n; c++) {
    if (!visit(c)) return false;
  }
  return true;
}
`,
        complexity: {
          time: 'O(n + p)',
          space: 'O(n + p)',
          assumptions: 'n is the number of courses and p of pairs; the recursion is at most n deep.',
        },
      },
      visualization: {
        spec: 'The courses are drawn as a graph from unlocks; state marks each course not visited, in progress or done, and the call stack is the path being explored.',
        renderers: ['graph', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-065': {
    prerequisites: ['graphs-basics', 'shortest-paths'],
    related: ['i100-064', 'i100-068'],
    content: {
      statement: [
        'A travel site sells one-way flights between n cities, given as [from, to, price]. A traveller wants the cheapest way from city src to city dst, but will change planes at most k times (at most k cities in between).',
        'Return the cheapest total price, or -1 if no such trip exists.',
      ],
      inputFormat:
        'n: the number of cities (0 to n − 1). flights: an array of [from, to, price]. src, dst: cities. k: a non-negative integer.',
      outputFormat: 'An integer: the cheapest price, or -1.',
      constraints: ['1 ≤ n ≤ 100', '0 ≤ flights.length ≤ n · (n − 1) / 2', '1 ≤ price ≤ 10^4', '0 ≤ k < n'],
      rules: ['At most k stops means at most k + 1 flights.', 'src = dst costs 0.', 'No trip within the limit: return -1.'],
      entry: 'cheapestWithStops',
      params: [
        { name: 'n', kind: 'auto' },
        { name: 'flights', kind: 'auto' },
        { name: 'src', kind: 'auto' },
        { name: 'dst', kind: 'auto' },
        { name: 'k', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            n: 4,
            flights: [
              [0, 1, 100],
              [1, 3, 100],
              [0, 2, 50],
              [2, 1, 30],
              [1, 2, 10],
              [2, 3, 300],
            ],
            src: 0,
            dst: 3,
            k: 1,
          },
          output: 200,
          note: 'With one stop: 0 → 1 → 3.',
        },
        {
          inputs: {
            n: 4,
            flights: [
              [0, 1, 100],
              [1, 3, 100],
              [0, 2, 50],
              [2, 1, 30],
              [2, 3, 300],
            ],
            src: 0,
            dst: 3,
            k: 2,
          },
          output: 180,
          note: 'Two stops allow 0 → 2 → 1 → 3.',
        },
      ],
      tests: [
        { inputs: { n: 3, flights: [[0, 1, 5]], src: 0, dst: 2, k: 1 }, output: -1, note: 'No route' },
        { inputs: { n: 2, flights: [[0, 1, 7]], src: 0, dst: 1, k: 0 }, output: 7, note: 'A direct flight' },
        {
          inputs: {
            n: 3,
            flights: [
              [0, 1, 1],
              [1, 2, 1],
              [0, 2, 5],
            ],
            src: 0,
            dst: 2,
            k: 0,
          },
          output: 5,
          note: 'No stop allowed',
        },
        {
          inputs: {
            n: 3,
            flights: [
              [0, 1, 1],
              [1, 2, 1],
              [0, 2, 5],
            ],
            src: 0,
            dst: 2,
            k: 1,
          },
          output: 2,
          note: 'One stop is cheaper',
        },
        { inputs: { n: 1, flights: [], src: 0, dst: 0, k: 0 }, output: 0, note: 'Already there' },
      ],
      starter: {
        javascript: `function cheapestWithStops(n, flights, src, dst, k) {
  // Return the cheapest price with at most k stops, or -1.
  return -1;
}
`,
      },
      hints: [
        'Dijkstra finds the cheapest route, but it may use too many flights. Limit the number of flights instead.',
        'Keep the cheapest known price to each city using at most r flights, and improve it one round of flights at a time.',
        'Each round must read the prices from the round before (a copy), so one round can’t chain two flights.',
      ],
      solution: {
        explanation: [
          'price[c] is the cheapest known cost to reach c with the flights allowed so far: 0 for src and infinity elsewhere. Each of the k + 1 rounds allows one more flight.',
          'A round reads the previous prices and writes into a copy, updated: a flight a → b can lower updated[b] to price[a] + its price. Reading the previous round keeps every route within the round’s number of flights.',
        ],
        code: `function cheapestWithStops(n, flights, src, dst, k) {
  let price = new Array(n).fill(Infinity);
  price[src] = 0;
  for (let round = 0; round <= k; round++) {
    const updated = [...price];
    for (const [a, b, cost] of flights) {
      if (price[a] + cost < updated[b]) updated[b] = price[a] + cost;
    }
    price = updated;
  }
  return price[dst] === Infinity ? -1 : price[dst];
}
`,
        complexity: { time: 'O(k · f)', space: 'O(n)', assumptions: 'f is flights.length.' },
      },
      visualization: {
        spec: 'The cities are drawn as a graph from flights; price is drawn as cells, copied into updated at the start of every round and lowered as flights are tried.',
        renderers: ['graph', 'array-cells'],
      },
    },
  },

  'i100-066': {
    prerequisites: ['graphs-basics', 'queues', 'strings-and-chars'],
    related: ['i100-064', 'i100-069'],
    content: {
      statement: [
        'A word-puzzle game turns a start word into an end word one letter at a time. Every word along the way (after the start) must be in the game’s word list, and each step changes exactly one letter in place.',
        'Return the fewest steps from start to end, or -1 if it can’t be done.',
      ],
      inputFormat: 'start, end: lowercase words of the same length. words: an array of lowercase words of that length.',
      outputFormat: 'An integer: the fewest steps, or -1.',
      constraints: ['1 ≤ word length ≤ 10', '1 ≤ words.length ≤ 5,000'],
      rules: [
        'One step changes exactly one letter, keeping the others in place.',
        'end must be in words; start need not be.',
        'start equal to end: 0 steps.',
      ],
      entry: 'wordSteps',
      params: [
        { name: 'start', kind: 'auto' },
        { name: 'end', kind: 'auto' },
        { name: 'words', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { start: 'cold', end: 'warm', words: ['cord', 'card', 'ward', 'warm', 'corm', 'worm', 'word'] },
          output: 4,
          note: 'cold → cord → word → worm → warm.',
        },
        { inputs: { start: 'lead', end: 'gold', words: ['load', 'goad', 'gold', 'lean'] }, output: 3, note: 'lead → load → goad → gold.' },
      ],
      tests: [
        { inputs: { start: 'abc', end: 'abc', words: ['abc'] }, output: 0, note: 'Already there' },
        { inputs: { start: 'cat', end: 'dog', words: ['cot', 'cog'] }, output: -1, note: 'end is not in the list' },
        { inputs: { start: 'hit', end: 'hat', words: ['hat'] }, output: 1, note: 'One step' },
        { inputs: { start: 'pin', end: 'sun', words: ['pun', 'sin', 'sun', 'pan'] }, output: 2, note: 'Two routes of the same length' },
      ],
      starter: {
        javascript: `function wordSteps(start, end, words) {
  // Return the fewest one-letter steps from start to end, or -1.
  return -1;
}
`,
      },
      hints: [
        'Think of the words as a graph: two words are joined when they differ in exactly one position.',
        'The fewest steps is a shortest path in an unweighted graph: breadth-first search.',
        'Mark words as used when they join the queue, so each word is reached once, by its shortest route.',
      ],
      solution: {
        explanation: [
          'oneApart(a, b) counts the positions where two words differ and checks it is exactly one. The queue holds [word, steps] pairs, starting with [start, 0]; used marks every word that has joined the queue.',
          'Breadth-first order takes words in order of steps, so the first time end comes out of the queue, its steps are the fewest. Every unused word one letter away joins with one more step.',
        ],
        code: `function wordSteps(start, end, words) {
  if (!words.includes(end)) return -1;
  const oneApart = (a, b) => {
    let differ = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
    return differ === 1;
  };
  const used = new Set([start]);
  const queue = [[start, 0]];
  while (queue.length > 0) {
    const [word, steps] = queue.shift();
    if (word === end) return steps;
    for (const w of words) {
      if (!used.has(w) && oneApart(word, w)) {
        used.add(w);
        queue.push([w, steps + 1]);
      }
    }
  }
  return -1;
}
`,
        complexity: {
          time: 'O(n² · L)',
          space: 'O(n)',
          assumptions: 'n is words.length and L the word length; each word is compared with every other at most once.',
        },
      },
      visualization: {
        spec: 'words is drawn as cells; the queue holds [word, steps] pairs in breadth-first order, and used grows as words are reached.',
        renderers: ['array-cells', 'queue-line', 'hash-set'],
      },
    },
  },

  'i100-067': {
    prerequisites: ['graphs-basics', 'stacks', 'sorting'],
    related: ['i100-066', 'i100-069'],
    content: {
      statement: [
        'A traveller kept every plane ticket from a trip, as [from, to] pairs, but lost track of the order. The trip started in start and used every ticket exactly once.',
        'Return the trip as the list of airports visited, in order. If several trips use all the tickets, return the one that comes first alphabetically (comparing airport by airport).',
      ],
      inputFormat: 'tickets: an array of [from, to] airport codes. start: an airport code.',
      outputFormat: 'An array of airport codes, starting with start.',
      constraints: ['0 ≤ tickets.length ≤ 300', 'Some trip from start uses every ticket exactly once.'],
      rules: [
        'Every ticket is used exactly once.',
        'Ties: the trip that is first alphabetically.',
        'No tickets: the trip is just [start].',
      ],
      entry: 'ticketTrail',
      params: [
        { name: 'tickets', kind: 'auto' },
        { name: 'start', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            tickets: [
              ['YUL', 'LIS'],
              ['LIS', 'ROM'],
              ['ROM', 'YUL'],
              ['YUL', 'OSL'],
            ],
            start: 'YUL',
          },
          output: ['YUL', 'LIS', 'ROM', 'YUL', 'OSL'],
          note: 'Going to OSL first would strand the other tickets.',
        },
        {
          inputs: {
            tickets: [
              ['K', 'N'],
              ['K', 'M'],
              ['M', 'K'],
            ],
            start: 'K',
          },
          output: ['K', 'M', 'K', 'N'],
          note: 'M comes before N.',
        },
      ],
      tests: [
        { inputs: { tickets: [['A', 'B']], start: 'A' }, output: ['A', 'B'], note: 'One ticket' },
        { inputs: { tickets: [], start: 'Q' }, output: ['Q'], note: 'No tickets' },
        {
          inputs: {
            tickets: [
              ['X', 'Y'],
              ['Y', 'X'],
              ['X', 'Z'],
              ['Z', 'X'],
            ],
            start: 'X',
          },
          output: ['X', 'Y', 'X', 'Z', 'X'],
          note: 'Two loops from X',
        },
        {
          inputs: {
            tickets: [
              ['P', 'R'],
              ['P', 'Q'],
              ['Q', 'P'],
            ],
            start: 'P',
          },
          output: ['P', 'Q', 'P', 'R'],
          note: 'The smaller choice leads back',
        },
      ],
      starter: {
        javascript: `function ticketTrail(tickets, start) {
  // Return the trip that uses every ticket once, first alphabetically.
  return [start];
}
`,
      },
      hints: [
        'Always taking the alphabetically smallest ticket can strand you at a dead end with tickets left over.',
        'Walk greedily anyway, but when you get stuck, that airport must be the end of what is left: put it at the end of the trip and step back.',
        'Keep the current walk on a stack; an airport with no tickets left is popped and added to the trip, which is built backwards.',
      ],
      solution: {
        explanation: [
          'targets maps each airport to its outgoing tickets, sorted so the alphabetically smallest is taken first (popped from the end). The stack is the walk so far.',
          'While the top airport still has tickets, the walk takes the smallest one. An airport with none left can only come at the end of what remains, so it is popped onto route. Reversing route gives the trip; detours that got stuck are spliced in at the right place.',
        ],
        code: `function ticketTrail(tickets, start) {
  const targets = new Map(); // airport → destinations, the smallest last
  for (const [from, to] of tickets) {
    if (!targets.has(from)) targets.set(from, []);
    targets.get(from).push(to);
  }
  for (const dests of targets.values()) dests.sort().reverse();
  const route = [];
  const stack = [start];
  while (stack.length > 0) {
    const airport = stack[stack.length - 1];
    const dests = targets.get(airport);
    if (dests !== undefined && dests.length > 0) stack.push(dests.pop());
    else route.push(stack.pop());
  }
  return route.reverse();
}
`,
        complexity: { time: 'O(t log t)', space: 'O(t)', assumptions: 't is tickets.length; sorting the destinations dominates.' },
      },
      visualization: {
        spec: 'The targets map shows each airport’s remaining tickets; the stack is the current walk, and route grows from the end of the trip backwards.',
        renderers: ['hash-map', 'stack', 'array-cells'],
      },
    },
  },

  'i100-068': {
    prerequisites: ['binary-search-idea', 'graphs-basics', 'matrices'],
    related: ['i100-065', 'i100-061'],
    content: {
      statement: [
        'A tidal pool is a square grid of rocks with distinct heights. At minute t the water level is t, and a swimmer can move up, down, left or right between rocks that are both at or below the water, instantly.',
        'Starting on the top-left rock, return the earliest minute at which the swimmer can reach the bottom-right rock.',
      ],
      inputFormat: 'grid: an n × n grid of distinct integers from 0 to n² − 1.',
      outputFormat: 'An integer: the earliest minute.',
      constraints: ['1 ≤ n ≤ 30', 'The heights are a rearrangement of 0 to n² − 1.'],
      rules: [
        'The swimmer can stand on a rock only when the water is at least its height.',
        'Moving takes no time.',
        'Both the start and the end rock count.',
      ],
      entry: 'risingTide',
      params: [{ name: 'grid', kind: 'auto' }],
      examples: [
        {
          inputs: {
            grid: [
              [0, 2, 5],
              [1, 4, 3],
              [6, 7, 8],
            ],
          },
          output: 8,
          note: 'The end rock itself is 8.',
        },
        {
          inputs: {
            grid: [
              [0, 8, 7],
              [1, 5, 6],
              [2, 3, 4],
            ],
          },
          output: 4,
          note: 'Down the left side, then along the bottom.',
        },
      ],
      tests: [
        { inputs: { grid: [[0]] }, output: 0, note: 'Start and end are the same rock' },
        {
          inputs: {
            grid: [
              [0, 1],
              [2, 3],
            ],
          },
          output: 3,
          note: 'Wait for the end rock',
        },
        {
          inputs: {
            grid: [
              [3, 1],
              [2, 0],
            ],
          },
          output: 3,
          note: 'Wait for the start rock',
        },
        {
          inputs: {
            grid: [
              [0, 4, 3, 2],
              [9, 8, 7, 1],
              [10, 11, 12, 5],
              [15, 14, 13, 6],
            ],
          },
          output: 6,
          note: 'A path around the edge',
        },
      ],
      starter: {
        javascript: `function risingTide(grid) {
  // Return the earliest minute the bottom-right rock can be reached.
  return 0;
}
`,
      },
      hints: [
        'If the swimmer can cross at level t, they can cross at any higher level too. That makes the answer something you can binary-search.',
        'For one level t, a flood fill from the top-left over rocks at most t tells whether the bottom-right is reached.',
        'Search t between 0 and n² − 1 for the smallest level that works.',
      ],
      solution: {
        explanation: [
          'canCross(level) flood-fills from the top-left rock over neighbours no higher than level, and reports whether the bottom-right rock was reached. A level that works keeps working when it rises.',
          'So lo..hi brackets the smallest working level: a mid that works pulls hi down to it, and one that doesn’t pushes lo past it. That takes O(log n²) flood fills of O(n²) each.',
        ],
        code: `function risingTide(grid) {
  const n = grid.length;
  const canCross = (level) => {
    if (grid[0][0] > level) return false;
    const seen = new Set([0]);
    const stack = [[0, 0]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      if (r === n - 1 && c === n - 1) return true;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        if (seen.has(nr * n + nc) || grid[nr][nc] > level) continue;
        seen.add(nr * n + nc);
        stack.push([nr, nc]);
      }
    }
    return false;
  };
  let lo = 0;
  let hi = n * n - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (canCross(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
`,
        complexity: {
          time: 'O(n² log n)',
          space: 'O(n²)',
          assumptions: 'n is the grid’s side; each flood fill visits every rock at most once.',
        },
      },
      visualization: {
        spec: 'The grid is drawn with each flood fill’s reached rocks; lo, mid and hi are blocks narrowing the water level, and the call stack shows each canCross check.',
        renderers: ['grid', 'hash-set', 'call-stack'],
      },
    },
  },

  'i100-069': {
    prerequisites: ['topological-sort', 'graphs-basics', 'strings-and-chars'],
    related: ['i100-064', 'i100-067'],
    content: {
      statement: [
        'Explorers found a dictionary in an unknown alphabet that uses lowercase letters. Its words are sorted by that alphabet, the same way an ordinary dictionary is sorted by ours: by the first letter where two words differ, and a shorter word before a longer word it begins.',
        'Return an order of every letter in the words that is consistent with the dictionary. If several orders work, return the one first in our alphabet; if no order works, return "".',
      ],
      inputFormat: 'words: a non-empty array of lowercase words.',
      outputFormat: 'A string of distinct letters, or "".',
      constraints: ['1 ≤ words.length ≤ 100', '1 ≤ each word’s length ≤ 100'],
      rules: [
        'Only the first differing letter of two neighbouring words tells you anything.',
        'A word followed by a shorter word it begins (like "abc" then "ab") can’t be sorted: return "".',
        'Every letter that appears must be in the answer; ties go to the letter first in our alphabet.',
      ],
      entry: 'alienOrder',
      params: [{ name: 'words', kind: 'auto' }],
      examples: [
        { inputs: { words: ['bca', 'ba', 'ac', 'ab'] }, output: 'cba', note: 'c before a, b before a, c before b.' },
        { inputs: { words: ['zx', 'zy', 'yz'] }, output: 'xzy', note: 'x and z both come before y.' },
      ],
      tests: [
        { inputs: { words: ['abc', 'ab'] }, output: '', note: 'A longer word before its own beginning' },
        { inputs: { words: ['q'] }, output: 'q', note: 'One word' },
        { inputs: { words: ['ab', 'ba', 'ab'] }, output: '', note: 'a before b and b before a' },
        { inputs: { words: ['cab', 'cac', 'acb', 'bc'] }, output: '', note: 'A three-letter loop' },
      ],
      starter: {
        javascript: `function alienOrder(words) {
  // Return the letter order consistent with the sorted words, or "".
  return '';
}
`,
      },
      hints: [
        'Compare each word with the next one. The first position where they differ says one letter comes before the other.',
        'Those facts form a graph of letters. A letter order is a topological order of that graph.',
        'Repeatedly take the smallest letter (in our alphabet) that nothing still points to. If letters are left over, there is a loop.',
      ],
      solution: {
        explanation: [
          'Neighbouring words are compared up to their first differing letter, which gives an edge before → after; if there is none and the first word is longer, the dictionary is contradictory. after holds each letter’s edges and waiting how many letters must come before it.',
          'Each round takes the smallest letter with nothing waiting, adds it to the order and lowers the waiting count of the letters after it. If some letters are never taken, they wait on each other in a loop, so the answer is "".',
        ],
        code: `function alienOrder(words) {
  const after = new Map();
  const waiting = new Map();
  for (const w of words) {
    for (const ch of w) {
      if (!after.has(ch)) {
        after.set(ch, new Set());
        waiting.set(ch, 0);
      }
    }
  }
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    let j = 0;
    while (j < a.length && j < b.length && a[j] === b[j]) j++;
    if (j === a.length || j === b.length) {
      if (a.length > b.length) return '';
      continue;
    }
    if (!after.get(a[j]).has(b[j])) {
      after.get(a[j]).add(b[j]);
      waiting.set(b[j], waiting.get(b[j]) + 1);
    }
  }
  let order = '';
  while (order.length < after.size) {
    const ready = [...waiting.keys()].filter((ch) => waiting.get(ch) === 0).sort();
    if (ready.length === 0) return '';
    const ch = ready[0];
    order += ch;
    waiting.set(ch, -1);
    for (const later of after.get(ch)) waiting.set(later, waiting.get(later) - 1);
  }
  return order;
}
`,
        complexity: {
          time: 'O(C + u²)',
          space: 'O(u²)',
          assumptions: 'C is the total length of the words and u the number of distinct letters (at most 26).',
        },
      },
      visualization: {
        spec: 'The words are drawn as cells; after maps each letter to the letters it must precede, waiting counts what each letter still waits for, and order grows one letter at a time.',
        renderers: ['array-cells', 'hash-map', 'hash-set'],
      },
    },
  },

  'i100-070': {
    prerequisites: ['dp-basics'],
    related: ['i100-074', 'i100-077'],
    content: {
      statement: [
        'Volunteers collect donations from houses on a circular street, so the last house is next to the first. Neighbours talk, so they never visit two neighbouring houses.',
        'Given each house’s donation, return the largest total they can collect.',
      ],
      inputFormat: 'donations: a non-empty array of non-negative integers, in order around the street.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ donations.length ≤ 100', '0 ≤ donations[i] ≤ 1,000'],
      rules: [
        'No two neighbouring houses, and the first and last houses are neighbours.',
        'With one house, take it.',
        'Houses can be skipped.',
      ],
      entry: 'circleDonations',
      params: [{ name: 'donations', kind: 'auto' }],
      examples: [
        { inputs: { donations: [4, 1, 2, 7, 5] }, output: 11, note: '4 + 7: the first and last houses can’t both be visited.' },
        { inputs: { donations: [6, 3, 6] }, output: 6, note: 'The two 6s are neighbours on the circle.' },
      ],
      tests: [
        { inputs: { donations: [9] }, output: 9, note: 'One house' },
        { inputs: { donations: [2, 3] }, output: 3, note: 'Two neighbours' },
        { inputs: { donations: [1, 8, 1, 8] }, output: 16, note: 'Every other house' },
        { inputs: { donations: [5, 5, 5, 5, 5] }, output: 10, note: 'Odd circle: only two of five' },
        { inputs: { donations: [3, 10, 3, 1, 2] }, output: 12, note: '10 + 2' },
      ],
      starter: {
        javascript: `function circleDonations(donations) {
  // Return the largest total without visiting two neighbouring houses.
  return 0;
}
`,
      },
      hints: [
        'On a straight street, the best total up to each house is the better of skipping it or taking it plus the best two houses back.',
        'On the circle, the first and last houses can’t both be taken. So either the first is left out or the last is.',
        'Solve the straight street twice, without the first house and without the last one, and take the better.',
      ],
      solution: {
        explanation: [
          'line(first, last) solves the straight street from house first to house last: prev and best are the best totals up to two houses back and one house back, and each house either is skipped (best) or taken (prev + it).',
          'On the circle, a choice can’t include both the first and the last house, so it fits one of the straight streets 1..n − 1 or 0..n − 2. The answer is the better of the two; one house is taken on its own.',
        ],
        code: `function circleDonations(donations) {
  const n = donations.length;
  if (n === 1) return donations[0];
  const line = (first, last) => {
    let prev = 0;
    let best = 0;
    for (let i = first; i <= last; i++) {
      const take = prev + donations[i];
      prev = best;
      best = Math.max(best, take);
    }
    return best;
  };
  return Math.max(line(1, n - 1), line(0, n - 2));
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is donations.length.' },
      },
      visualization: {
        spec: 'The donations are drawn as cells with i moving along each straight street; prev and best are blocks updated house by house, and the call stack shows the two runs.',
        renderers: ['array-cells', 'call-stack'],
      },
    },
  },

  'i100-071': {
    prerequisites: ['strings-and-chars', 'two-pointers'],
    related: ['i100-072', 'i100-051'],
    content: {
      statement: [
        'A sign painter looks for the longest stretch of a slogan that reads the same forwards and backwards, to paint it in a different colour.',
        'Given text, return its longest palindromic substring (a run of neighbouring characters that is a palindrome). If several are equally long, return the leftmost.',
      ],
      inputFormat: 'text: a string of lowercase letters a–z.',
      outputFormat: 'A string: a substring of text.',
      constraints: ['0 ≤ text.length ≤ 1,000'],
      rules: ['A single letter is a palindrome.', 'Ties: the leftmost of the longest.', 'Empty text: return "".'],
      entry: 'longestMirror',
      params: [{ name: 'text', kind: 'auto' }],
      examples: [
        { inputs: { text: 'racecars' }, output: 'racecar', note: 'Seven letters around the e.' },
        { inputs: { text: 'xabbay' }, output: 'abba', note: 'An even-length palindrome.' },
      ],
      tests: [
        { inputs: { text: '' }, output: '', note: 'Empty text' },
        { inputs: { text: 'q' }, output: 'q', note: 'One letter' },
        { inputs: { text: 'abcd' }, output: 'a', note: 'Only single letters: the leftmost' },
        { inputs: { text: 'aaaa' }, output: 'aaaa', note: 'All the same' },
        { inputs: { text: 'noonabcdcba' }, output: 'abcdcba', note: 'A longer one later' },
      ],
      starter: {
        javascript: `function longestMirror(text) {
  // Return the longest palindromic substring (the leftmost on ties).
  return '';
}
`,
      },
      hints: [
        'A palindrome mirrors around its centre, which is either one letter (odd length) or the gap between two letters (even length).',
        'From each centre, expand outwards while the two ends match.',
        'There are 2n − 1 centres, and each expansion is at most O(n): O(n²) in all, with no extra memory.',
      ],
      solution: {
        explanation: [
          'expand(lo, hi) grows a palindrome from a centre: while both ends exist and match, it steps outwards. When it stops, text[lo + 1..hi − 1] is the longest palindrome with that centre.',
          'Every letter is tried as an odd centre and every gap as an even centre, from left to right. Only a strictly longer palindrome replaces the best, so the leftmost of equal length is kept.',
        ],
        code: `function longestMirror(text) {
  let bestStart = 0;
  let bestLength = 0;
  const expand = (lo, hi) => {
    while (lo >= 0 && hi < text.length && text[lo] === text[hi]) {
      lo--;
      hi++;
    }
    if (hi - lo - 1 > bestLength) {
      bestLength = hi - lo - 1;
      bestStart = lo + 1;
    }
  };
  for (let center = 0; center < text.length; center++) {
    expand(center, center);
    expand(center, center + 1);
  }
  return text.slice(bestStart, bestStart + bestLength);
}
`,
        complexity: { time: 'O(n²)', space: 'O(1)', assumptions: 'n is text.length.' },
      },
      visualization: {
        spec: 'text is drawn as character cells with lo and hi spreading outwards from each centre; bestStart and bestLength are blocks.',
        renderers: ['string-cells', 'call-stack'],
      },
    },
  },

  'i100-072': {
    prerequisites: ['strings-and-chars', 'two-pointers'],
    related: ['i100-071', 'i100-051'],
    content: {
      statement: [
        'A word-game app scores a word by how many palindromes hide inside it: every run of neighbouring letters that reads the same both ways counts once per position.',
        'Given text, return how many of its substrings are palindromes. Substrings at different positions count separately, even if they are the same letters.',
      ],
      inputFormat: 'text: a string of lowercase letters a–z.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ text.length ≤ 1,000'],
      rules: ['Every single letter counts.', 'Equal substrings at different positions count separately.', 'Empty text: return 0.'],
      entry: 'countMirrors',
      params: [{ name: 'text', kind: 'auto' }],
      examples: [
        { inputs: { text: 'aba' }, output: 4, note: 'a, b, a and aba.' },
        { inputs: { text: 'zz' }, output: 3, note: 'z, z and zz.' },
      ],
      tests: [
        { inputs: { text: '' }, output: 0, note: 'Empty text' },
        { inputs: { text: 'xyz' }, output: 3, note: 'Only single letters' },
        { inputs: { text: 'aaaa' }, output: 10, note: 'Every substring' },
        { inputs: { text: 'level' }, output: 7, note: 'eve and level as well as the letters' },
      ],
      starter: {
        javascript: `function countMirrors(text) {
  // Return how many substrings of text are palindromes.
  return 0;
}
`,
      },
      hints: [
        'Every palindrome has a centre: a letter or the gap between two letters.',
        'Expanding from a centre, every step that still matches is one more palindrome.',
        'Count while expanding from each of the 2n − 1 centres.',
      ],
      solution: {
        explanation: [
          'expand(lo, hi) starts from a centre and steps outwards while the ends match. Every successful step is one palindrome: the substring between lo and hi.',
          'Each palindrome has exactly one centre, so expanding from every letter and every gap counts each one exactly once.',
        ],
        code: `function countMirrors(text) {
  let count = 0;
  const expand = (lo, hi) => {
    while (lo >= 0 && hi < text.length && text[lo] === text[hi]) {
      count++;
      lo--;
      hi++;
    }
  };
  for (let center = 0; center < text.length; center++) {
    expand(center, center);
    expand(center, center + 1);
  }
  return count;
}
`,
        complexity: { time: 'O(n²)', space: 'O(1)', assumptions: 'n is text.length.' },
      },
      visualization: {
        spec: 'text is drawn as character cells with lo and hi spreading from each centre; count rises with every palindrome found.',
        renderers: ['string-cells', 'call-stack'],
      },
    },
  },

  'i100-073': {
    prerequisites: ['dp-basics', 'strings-and-chars'],
    related: ['i100-075', 'i100-080'],
    content: {
      statement: [
        'A secret club writes messages as digits, with A = 1, B = 2, …, Z = 26, and no separators. "12" could be AB or L.',
        'Given a digit string, return how many different letter messages it could be. A 0 can only appear as the second digit of 10 or 20.',
      ],
      inputFormat: 'digits: a non-empty string of digits 0–9.',
      outputFormat: 'An integer: the number of readings.',
      constraints: ['1 ≤ digits.length ≤ 100', 'The answer fits in 32 bits.'],
      rules: [
        'Each letter is one digit 1–9 or two digits 10–26.',
        'A reading may not start a letter with 0: "06" is not 6.',
        'No valid reading: return 0.',
      ],
      entry: 'decodeWays',
      params: [{ name: 'digits', kind: 'auto' }],
      examples: [
        { inputs: { digits: '1212' }, output: 5, note: 'ABAB, ABL, AUB, LAB, LL.' },
        { inputs: { digits: '907' }, output: 0, note: 'The 0 can’t be read.' },
      ],
      tests: [
        { inputs: { digits: '2611' }, output: 4, note: 'BFAA, BFK, ZAA, ZK' },
        { inputs: { digits: '0' }, output: 0, note: 'A lone 0' },
        { inputs: { digits: '10' }, output: 1, note: 'Only J' },
        { inputs: { digits: '27' }, output: 1, note: '27 is too big for one letter' },
        { inputs: { digits: '11106' }, output: 2, note: 'The 0 forces the 10' },
        { inputs: { digits: '2020' }, output: 1, note: 'TT only' },
      ],
      starter: {
        javascript: `function decodeWays(digits) {
  // Return how many letter messages the digits could be.
  return 0;
}
`,
      },
      hints: [
        'The last letter of a reading is either the last digit or the last two digits.',
        'So the number of readings of the first i digits is the readings of the first i − 1 (if the last digit isn’t 0) plus the readings of the first i − 2 (if the last two make 10–26).',
        'Only the two previous counts are needed.',
      ],
      solution: {
        explanation: [
          'oneBack and twoBack are the numbers of readings of the prefixes one and two digits shorter; the empty prefix has one reading. The first digit alone can be read only if it isn’t 0.',
          'For each longer prefix, the last digit can be its own letter (not 0), adding oneBack, and the last two digits can be one letter (10 to 26), adding twoBack.',
        ],
        code: `function decodeWays(digits) {
  let twoBack = 1;
  let oneBack = digits[0] === '0' ? 0 : 1;
  for (let i = 2; i <= digits.length; i++) {
    let ways = 0;
    if (digits[i - 1] !== '0') ways += oneBack;
    const pair = Number(digits.slice(i - 2, i));
    if (pair >= 10 && pair <= 26) ways += twoBack;
    twoBack = oneBack;
    oneBack = ways;
  }
  return oneBack;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is digits.length.' },
      },
      visualization: {
        spec: 'The digits are drawn as character cells with i over the prefix’s last digit; twoBack, oneBack and ways are blocks shifting along.',
        renderers: ['string-cells'],
      },
    },
  },

  'i100-074': {
    prerequisites: ['dp-basics', 'arrays-basics'],
    related: ['i100-084', 'i100-070'],
    content: {
      statement: [
        'A trader multiplies daily growth factors (some of them negative after a bad day) and wants the run of consecutive days with the largest product.',
        'Given values, return the largest product of a contiguous non-empty subarray.',
      ],
      inputFormat: 'values: a non-empty array of integers.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ values.length ≤ 20,000', '-10 ≤ values[i] ≤ 10', 'Every product fits in 32 bits.'],
      rules: ['The run has at least one value.', 'Two negatives make a positive.', 'A 0 resets any product through it.'],
      entry: 'bestProductStreak',
      params: [{ name: 'values', kind: 'auto' }],
      examples: [
        { inputs: { values: [3, -2, 4, -1] }, output: 24, note: 'All four: the two negatives cancel.' },
        { inputs: { values: [-1, 0, -7, -1] }, output: 7, note: '−7 × −1, after the 0.' },
      ],
      tests: [
        { inputs: { values: [5] }, output: 5, note: 'One value' },
        { inputs: { values: [-2] }, output: -2, note: 'One negative value' },
        { inputs: { values: [2, -5, -2, -4, 3] }, output: 24, note: 'Skipping one negative' },
        { inputs: { values: [0, 0] }, output: 0, note: 'Only zeros' },
        { inputs: { values: [-1, -3, -10, 0, 60] }, output: 60, note: 'The best run is after the 0' },
      ],
      starter: {
        javascript: `function bestProductStreak(values) {
  // Return the largest product of a contiguous run.
  return values[0];
}
`,
      },
      hints: [
        'With sums, you keep the best run ending here. With products, a negative value can turn the smallest product into the largest.',
        'So keep both the largest and the smallest product of a run ending at each position.',
        'A run ending at v is v alone, or the previous largest × v, or the previous smallest × v.',
      ],
      solution: {
        explanation: [
          'high and low are the largest and smallest products of a run ending at the current value. A new value v can start a run on its own or extend either of them; a negative v swaps which one becomes the largest.',
          'best keeps the largest high seen. A 0 makes both high and low 0 or the next value alone, which restarts every run.',
        ],
        code: `function bestProductStreak(values) {
  let high = values[0];
  let low = values[0];
  let best = values[0];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const candidates = [v, high * v, low * v];
    high = Math.max(...candidates);
    low = Math.min(...candidates);
    best = Math.max(best, high);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is values.length.' },
      },
      visualization: {
        spec: 'The values are drawn as cells with i marked; high, low and best are blocks that change with each value.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-075': {
    prerequisites: ['dp-basics', 'hash-sets', 'strings-and-chars'],
    related: ['i100-073', 'i100-078'],
    content: {
      statement: [
        'A text message lost its spaces. To check it, a phone tries to cut it back into words from its dictionary; a dictionary word may be used any number of times.',
        'Given text and the dictionary words, return true if text can be cut into a sequence of dictionary words, and false otherwise.',
      ],
      inputFormat: 'text: a string of lowercase letters. words: an array of distinct lowercase words.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ text.length ≤ 300', '0 ≤ words.length ≤ 1,000', '1 ≤ each word’s length ≤ 20'],
      rules: ['Every letter of text belongs to exactly one word.', 'A word may be used more than once.', 'Empty text: return true.'],
      entry: 'dictionarySplit',
      params: [
        { name: 'text', kind: 'auto' },
        { name: 'words', kind: 'auto' },
      ],
      examples: [
        { inputs: { text: 'sunflower', words: ['sun', 'flower', 'flow'] }, output: true, note: 'sun + flower.' },
        { inputs: { text: 'seashell', words: ['sea', 'shel', 'she'] }, output: false, note: 'The last l is left over.' },
      ],
      tests: [
        { inputs: { text: '', words: ['a'] }, output: true, note: 'Empty text' },
        { inputs: { text: 'aaaa', words: ['a', 'aa'] }, output: true, note: 'Words used again' },
        { inputs: { text: 'moonlight', words: ['moon', 'light', 'lig', 'ht'] }, output: true, note: 'Two ways to cut' },
        { inputs: { text: 'abc', words: [] }, output: false, note: 'Empty dictionary' },
      ],
      starter: {
        javascript: `function dictionarySplit(text, words) {
  // Return true if text can be cut into dictionary words.
  return false;
}
`,
      },
      hints: [
        'The last word of a split ends at the end of text and starts somewhere earlier: everything before it must split too.',
        'So work out, for every position, whether the text up to it can be split.',
        'Position end can be reached if some earlier reachable position start has text[start..end − 1] in the dictionary. Use a set for the lookups.',
      ],
      solution: {
        explanation: [
          'canCut[i] says whether the first i letters split into words; canCut[0] is true (nothing to split). known is the dictionary as a set.',
          'For each end, it is enough to find one start with canCut[start] true and text[start..end − 1] a word. canCut[text.length] is the answer.',
        ],
        code: `function dictionarySplit(text, words) {
  const known = new Set(words);
  const canCut = new Array(text.length + 1).fill(false);
  canCut[0] = true;
  for (let end = 1; end <= text.length; end++) {
    for (let start = 0; start < end; start++) {
      if (canCut[start] && known.has(text.slice(start, end))) {
        canCut[end] = true;
        break;
      }
    }
  }
  return canCut[text.length];
}
`,
        complexity: {
          time: 'O(n³)',
          space: 'O(n + w)',
          assumptions: 'n is text.length and w the dictionary’s size; slicing a candidate word is O(n), set lookups O(1) on average.',
        },
      },
      visualization: {
        spec: 'text is drawn as character cells with start and end marking the candidate word; canCut fills in as cells, and known is a set.',
        renderers: ['string-cells', 'array-cells', 'hash-set'],
      },
    },
  },

  'i100-076': {
    prerequisites: ['dp-basics', 'binary-search-idea'],
    related: ['i100-079', 'i100-074'],
    content: {
      statement: [
        'A climber logs a score for every training session and wants the longest series of sessions, not necessarily one after another but in their original order, in which every score beats the one before.',
        'Given values, return the length of the longest strictly increasing subsequence.',
      ],
      inputFormat: 'values: an array of integers.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ values.length ≤ 2,500', 'Values are integers from -10^4 to 10^4.'],
      rules: [
        'Strictly increasing: equal values don’t continue a sequence.',
        'Values may be skipped, but the order can’t change.',
        'Empty input: return 0.',
      ],
      entry: 'risingLength',
      params: [{ name: 'values', kind: 'auto' }],
      examples: [
        { inputs: { values: [3, 1, 4, 1, 5, 9, 2, 6] }, output: 4, note: 'For example 3, 4, 5, 9.' },
        { inputs: { values: [5, 4, 3] }, output: 1, note: 'Only falling values.' },
      ],
      tests: [
        { inputs: { values: [] }, output: 0, note: 'No values' },
        { inputs: { values: [7] }, output: 1, note: 'One value' },
        { inputs: { values: [1, 2, 2, 3] }, output: 3, note: 'Equal values count once' },
        { inputs: { values: [2, 5, 3, 7, 11, 8, 10, 13, 6] }, output: 6, note: '2, 3, 7, 8, 10, 13' },
      ],
      starter: {
        javascript: `function risingLength(values) {
  // Return the length of the longest strictly increasing subsequence.
  return 0;
}
`,
      },
      hints: [
        'Comparing every pair gives an O(n²) solution: the longest sequence ending at each value.',
        'For O(n log n), keep for every length the smallest value a sequence of that length can end with. Those smallest endings increase with the length.',
        'Each new value either extends the longest sequence or replaces the first ending that is not smaller than it, found by binary search.',
      ],
      solution: {
        explanation: [
          'tails[k] is the smallest value that ends an increasing sequence of length k + 1 seen so far; tails is always increasing. A smaller ending is better: more values can follow it.',
          'For each value v, binary search finds the first ending at least v. If there is none, v extends the longest sequence; otherwise v replaces that ending (a sequence of the same length now ends lower). The answer is the number of lengths, tails.length.',
        ],
        code: `function risingLength(values) {
  const tails = [];
  for (const v of values) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tails[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = v;
  }
  return tails.length;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is values.length.' },
      },
      visualization: {
        spec: 'The values are drawn as cells; tails is drawn as cells too, with lo, mid and hi marking the binary search for where each value goes.',
        renderers: ['array-cells', 'array-shelves'],
      },
    },
  },

  'i100-077': {
    prerequisites: ['dp-basics', 'hash-sets'],
    related: ['i100-076', 'i100-070'],
    content: {
      statement: [
        'Two friends split a pile of parcels to carry, and want exactly equal weight each.',
        'Given the parcels’ weights, return true if they can be split into two groups with the same total weight, and false otherwise.',
      ],
      inputFormat: 'weights: a non-empty array of positive integers.',
      outputFormat: 'A boolean.',
      constraints: ['1 ≤ weights.length ≤ 200', '1 ≤ weights[i] ≤ 100'],
      rules: ['Every parcel goes to one of the two friends.', 'An odd total can never split evenly.'],
      entry: 'evenSplit',
      params: [{ name: 'weights', kind: 'auto' }],
      examples: [
        { inputs: { weights: [3, 1, 5, 9, 2] }, output: true, note: '9 + 1 and 3 + 5 + 2: 10 each.' },
        { inputs: { weights: [2, 3] }, output: false, note: 'An odd total.' },
      ],
      tests: [
        { inputs: { weights: [4, 4] }, output: true, note: 'Two equal parcels' },
        { inputs: { weights: [1] }, output: false, note: 'One parcel' },
        { inputs: { weights: [1, 2, 3, 4, 5, 6, 7] }, output: true, note: 'Total 28: 14 each' },
        { inputs: { weights: [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }, output: true, note: 'One heavy parcel against ten light ones' },
        { inputs: { weights: [6, 1, 1] }, output: false, note: 'Even total, but no split' },
      ],
      starter: {
        javascript: `function evenSplit(weights) {
  // Return true if the weights split into two groups with equal totals.
  return false;
}
`,
      },
      hints: [
        'Each friend must carry exactly half the total. An odd total is impossible.',
        'So the question is whether some group of parcels adds up to exactly half.',
        'Keep the set of totals reachable with the parcels seen so far; each new parcel adds itself to every reachable total.',
      ],
      solution: {
        explanation: [
          'half is half the total; an odd total can’t be halved. reachable holds every total some group of the parcels seen so far adds up to, starting with 0 (the empty group).',
          'Each parcel creates grown: everything reachable before, plus each of those totals with the parcel added (totals above half are useless and skipped). The answer is whether half becomes reachable.',
        ],
        code: `function evenSplit(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;
  const half = total / 2;
  let reachable = new Set([0]);
  for (const w of weights) {
    const grown = new Set(reachable);
    for (const s of reachable) if (s + w <= half) grown.add(s + w);
    reachable = grown;
    if (reachable.has(half)) return true;
  }
  return reachable.has(half);
}
`,
        complexity: {
          time: 'O(n · S)',
          space: 'O(S)',
          assumptions: 'n is weights.length and S half the total; at most S + 1 totals are kept.',
        },
      },
      visualization: {
        spec: 'The weights are drawn as cells; reachable is a set of totals that grows with each parcel until it holds half.',
        renderers: ['array-cells', 'hash-set'],
      },
    },
  },

  'i100-078': {
    prerequisites: ['dp-2d', 'strings-and-chars'],
    related: ['i100-075', 'i100-080'],
    content: {
      statement: [
        'Two people typed into the same chat box at the same time, and their letters got interleaved. Each person’s letters stayed in their own order.',
        'Given the two messages a and b and the mixed text, return true if text can be formed by interleaving a and b, keeping each one’s order, and false otherwise.',
      ],
      inputFormat: 'a, b, text: strings of lowercase letters.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ a.length, b.length ≤ 100', '0 ≤ text.length ≤ 200'],
      rules: [
        'Every letter of a and b is used exactly once.',
        'Each message keeps its own order.',
        'The lengths must add up: otherwise return false.',
      ],
      entry: 'wovenMessages',
      params: [
        { name: 'a', kind: 'auto' },
        { name: 'b', kind: 'auto' },
        { name: 'text', kind: 'auto' },
      ],
      examples: [
        { inputs: { a: 'dog', b: 'cat', text: 'dcoagt' }, output: true, note: 'd c o a g t.' },
        { inputs: { a: 'dog', b: 'cat', text: 'dgocat' }, output: false, note: 'g comes before o.' },
      ],
      tests: [
        { inputs: { a: '', b: '', text: '' }, output: true, note: 'All empty' },
        { inputs: { a: 'a', b: '', text: 'a' }, output: true, note: 'One message empty' },
        { inputs: { a: 'ab', b: 'ab', text: 'abab' }, output: true, note: 'Equal messages' },
        { inputs: { a: 'xy', b: 'yx', text: 'xyyx' }, output: true, note: 'Several ways' },
        { inputs: { a: 'aa', b: 'ab', text: 'abaa' }, output: true, note: 'Choosing the right a matters' },
        { inputs: { a: 'ab', b: 'c', text: 'abcd' }, output: false, note: 'Lengths don’t add up' },
      ],
      starter: {
        javascript: `function wovenMessages(a, b, text) {
  // Return true if text interleaves a and b, keeping each one's order.
  return false;
}
`,
      },
      hints: [
        'A prefix of text uses some first letters of a and some first letters of b.',
        'Let can[i][j] say whether the first i letters of a and the first j of b weave into the first i + j letters of text.',
        'can[i][j] is true if the last letter came from a (can[i − 1][j] and a’s letter matches) or from b (can[i][j − 1] and b’s letter matches).',
      ],
      solution: {
        explanation: [
          'can[i][j] records whether a[0..i − 1] and b[0..j − 1] weave into text[0..i + j − 1]; can[0][0] is true.',
          'The last letter of that prefix of text came from a or from b. It came from a if can[i − 1][j] and a[i − 1] equals it, or from b likewise. The bottom-right cell is the answer.',
        ],
        code: `function wovenMessages(a, b, text) {
  if (a.length + b.length !== text.length) return false;
  const can = [];
  for (let i = 0; i <= a.length; i++) can.push(new Array(b.length + 1).fill(false));
  can[0][0] = true;
  for (let i = 0; i <= a.length; i++) {
    for (let j = 0; j <= b.length; j++) {
      if (i > 0 && can[i - 1][j] && a[i - 1] === text[i + j - 1]) can[i][j] = true;
      if (j > 0 && can[i][j - 1] && b[j - 1] === text[i + j - 1]) can[i][j] = true;
    }
  }
  return can[a.length][b.length];
}
`,
        complexity: { time: 'O(m · n)', space: 'O(m · n)', assumptions: 'm and n are a.length and b.length.' },
      },
      visualization: {
        spec: 'The can table is drawn as a grid with i and j marking the cell being filled; each true cell came from the one above or the one to the left.',
        renderers: ['grid', 'string-cells'],
      },
    },
  },

  'i100-079': {
    prerequisites: ['memoization', 'matrices', 'graphs-basics'],
    related: ['i100-076', 'i100-068'],
    content: {
      statement: [
        'A trail designer wants the longest hiking route on a height map that always goes strictly uphill. Hikers step up, down, left or right (never diagonally), and every step must climb.',
        'Given grid, return the number of cells on the longest strictly increasing path.',
      ],
      inputFormat: 'grid: a non-empty grid of integers.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ rows, columns ≤ 200', '0 ≤ grid[r][c] ≤ 2^31 − 1'],
      rules: [
        'Every step goes to a strictly higher neighbour.',
        'A single cell is a path of length 1.',
        'Moves are up, down, left and right only.',
      ],
      entry: 'steepestClimb',
      params: [{ name: 'grid', kind: 'auto' }],
      examples: [
        {
          inputs: {
            grid: [
              [1, 2, 3],
              [6, 5, 4],
              [7, 8, 9],
            ],
          },
          output: 9,
          note: 'A snake through every cell.',
        },
        {
          inputs: {
            grid: [
              [5, 5],
              [5, 5],
            ],
          },
          output: 1,
          note: 'Flat: no step climbs.',
        },
      ],
      tests: [
        { inputs: { grid: [[1]] }, output: 1, note: 'One cell' },
        {
          inputs: {
            grid: [
              [3, 1],
              [4, 2],
            ],
          },
          output: 3,
          note: '1 → 2 → 4',
        },
        {
          inputs: {
            grid: [
              [1, 2],
              [2, 1],
            ],
          },
          output: 2,
          note: 'Equal heights don’t continue',
        },
        {
          inputs: {
            grid: [
              [9, 8, 7],
              [2, 1, 6],
              [3, 4, 5],
            ],
          },
          output: 9,
          note: 'A spiral up from the centre',
        },
      ],
      starter: {
        javascript: `function steepestClimb(grid) {
  // Return the number of cells on the longest strictly increasing path.
  return 1;
}
`,
      },
      hints: [
        'The longest path starting at a cell is 1 plus the longest path starting at its best higher neighbour.',
        'That recursion has no cycles, because every step climbs.',
        'Remember each cell’s answer the first time you compute it, so every cell is solved once.',
      ],
      solution: {
        explanation: [
          'longest(r, c) is the most cells on a climbing path starting at (r, c): 1, or 1 plus the longest path from a strictly higher neighbour. Paths only go up, so the recursion always ends.',
          'memo stores each cell’s answer the first time it is computed (keyed r · cols + c), so every cell is solved once and every later visit is a lookup. The answer is the best start over all cells.',
        ],
        code: `function steepestClimb(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const memo = new Map();
  const longest = (r, c) => {
    const key = r * cols + c;
    if (memo.has(key)) return memo.get(key);
    let best = 1;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] > grid[r][c]) best = Math.max(best, 1 + longest(nr, nc));
    }
    memo.set(key, best);
    return best;
  };
  let answer = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) answer = Math.max(answer, longest(r, c));
  }
  return answer;
}
`,
        complexity: {
          time: 'O(r · c)',
          space: 'O(r · c)',
          assumptions: 'r and c are the grid’s rows and columns; each cell is solved once and checks four neighbours.',
        },
      },
      visualization: {
        spec: 'The grid is drawn with the cell being solved marked; memo fills with each cell’s answer, and the call tree shows which calls were answered from memo.',
        renderers: ['grid', 'hash-map', 'call-tree', 'call-stack'],
      },
    },
  },

  'i100-080': {
    prerequisites: ['dp-2d', 'strings-and-chars'],
    related: ['i100-078', 'i100-073'],
    content: {
      statement: [
        'A puzzle hides a word in a longer string of letters: you may cross out letters but not reorder them. The puzzle’s score is how many different ways there are to cross out letters so that exactly the hidden word remains.',
        'Given source and target, return the number of ways target appears as a subsequence of source. Two ways differ if they keep a different set of positions.',
      ],
      inputFormat: 'source, target: strings of lowercase letters.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ source.length ≤ 1,000', '0 ≤ target.length ≤ 1,000', 'The answer fits in 32 bits.'],
      rules: [
        'Letters keep their order.',
        'An empty target appears exactly once (cross out everything).',
        'Ways are counted by the positions kept.',
      ],
      entry: 'hiddenCopies',
      params: [
        { name: 'source', kind: 'auto' },
        { name: 'target', kind: 'auto' },
      ],
      examples: [
        { inputs: { source: 'banana', target: 'ana' }, output: 4, note: 'Four ways to keep a, n, a in order.' },
        { inputs: { source: 'aabb', target: 'ab' }, output: 4, note: 'Either a with either b.' },
      ],
      tests: [
        { inputs: { source: 'abc', target: '' }, output: 1, note: 'Empty target' },
        { inputs: { source: '', target: 'a' }, output: 0, note: 'Empty source' },
        { inputs: { source: 'abc', target: 'abc' }, output: 1, note: 'Keep everything' },
        { inputs: { source: 'xyxyx', target: 'xy' }, output: 3, note: 'Pairs of x before y' },
        { inputs: { source: 'cccc', target: 'cc' }, output: 6, note: 'Any two of four' },
      ],
      starter: {
        javascript: `function hiddenCopies(source, target) {
  // Return how many ways target appears as a subsequence of source.
  return 0;
}
`,
      },
      hints: [
        'Read source one letter at a time and track, for every prefix of target, how many ways it can already be formed.',
        'A source letter equal to target[j − 1] can finish a copy of target’s first j letters, in as many ways as there are copies of the first j − 1.',
        'Update the counts from the longest prefix down, so the same source letter isn’t used twice.',
      ],
      solution: {
        explanation: [
          'ways[j] counts the ways to form target’s first j letters from the source letters read so far; ways[0] = 1 (the empty prefix, one way).',
          'Each source letter ch can extend every copy of target[0..j − 2] into one of target[0..j − 1] when target[j − 1] is ch, adding ways[j − 1] to ways[j]. Going from j = target.length down keeps each letter from being counted twice in one step.',
        ],
        code: `function hiddenCopies(source, target) {
  const ways = new Array(target.length + 1).fill(0);
  ways[0] = 1;
  for (const ch of source) {
    for (let j = target.length; j >= 1; j--) {
      if (target[j - 1] === ch) ways[j] += ways[j - 1];
    }
  }
  return ways[target.length];
}
`,
        complexity: { time: 'O(m · n)', space: 'O(n)', assumptions: 'm is source.length and n target.length.' },
      },
      visualization: {
        spec: 'source and target are drawn as character cells; ways is drawn as cells too, updated from the back each time a source letter is read.',
        renderers: ['string-cells', 'array-cells'],
      },
    },
  },

  'i100-081': {
    prerequisites: ['dp-2d', 'divide-and-conquer'],
    related: ['i100-082', 'i100-077'],
    content: {
      statement: [
        'A carnival game has a row of numbered balloons. Popping a balloon earns its number times the numbers of its current left and right neighbours (a missing neighbour counts as 1), and then the row closes up.',
        'Given the numbers, return the most coins you can earn by popping every balloon in the best order.',
      ],
      inputFormat: 'balloons: an array of non-negative integers, left to right.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ balloons.length ≤ 300', '0 ≤ balloons[i] ≤ 100'],
      rules: [
        'Neighbours are the balloons next to it at the moment it is popped.',
        'Past either end of the row, the neighbour counts as 1.',
        'Every balloon is popped exactly once.',
      ],
      entry: 'burstOrder',
      params: [{ name: 'balloons', kind: 'auto' }],
      examples: [
        { inputs: { balloons: [2, 4, 3] }, output: 33, note: 'Pop 4 (2 × 4 × 3 = 24), then 2 (1 × 2 × 3 = 6), then 3 (3).' },
        { inputs: { balloons: [5] }, output: 5, note: '1 × 5 × 1.' },
      ],
      tests: [
        { inputs: { balloons: [] }, output: 0, note: 'No balloons' },
        { inputs: { balloons: [1, 1, 1] }, output: 3, note: 'All ones' },
        { inputs: { balloons: [7, 1] }, output: 14, note: 'Pop 1 first: 7 × 1, then 7' },
        { inputs: { balloons: [3, 6, 2, 4] }, output: 136, note: 'Four balloons' },
      ],
      starter: {
        javascript: `function burstOrder(balloons) {
  // Return the most coins from popping every balloon in the best order.
  return 0;
}
`,
      },
      hints: [
        'Choosing the first balloon to pop splits nothing cleanly: its neighbours change afterwards.',
        'Choose the last balloon to pop in a stretch instead. When it goes, everything else in the stretch is gone, so its neighbours are the stretch’s two borders.',
        'Let best[i][j] be the most coins from popping everything strictly between positions i and j, with 1s added at both ends. Fill it for short stretches first.',
      ],
      solution: {
        explanation: [
          'vals is the row with a 1 added at each end. best[i][j] is the most coins from popping every balloon strictly between i and j, while i and j are still there.',
          'If last is the final balloon popped between i and j, it earns vals[i] × vals[last] × vals[j], and the two sides were cleared independently before: best[i][last] + best[last][j]. Trying every last, for stretches from short to long, fills the table; the answer is best[0][n − 1].',
        ],
        code: `function burstOrder(balloons) {
  const vals = [1, ...balloons, 1];
  const n = vals.length;
  const best = [];
  for (let i = 0; i < n; i++) best.push(new Array(n).fill(0));
  for (let gap = 2; gap < n; gap++) {
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      for (let last = i + 1; last < j; last++) {
        const coins = best[i][last] + vals[i] * vals[last] * vals[j] + best[last][j];
        if (coins > best[i][j]) best[i][j] = coins;
      }
    }
  }
  return best[0][n - 1];
}
`,
        complexity: { time: 'O(n³)', space: 'O(n²)', assumptions: 'n is balloons.length.' },
      },
      visualization: {
        spec: 'The best table is drawn as a grid filled diagonal by diagonal; i, j and last mark the stretch and the balloon popped last in it.',
        renderers: ['grid', 'array-cells'],
      },
    },
  },

  'i100-082': {
    prerequisites: ['dp-2d', 'strings-and-chars'],
    related: ['i100-081', 'i100-078'],
    content: {
      statement: [
        'A search box supports a tiny pattern language: a letter matches itself, "." matches any one letter, and a letter or "." followed by "*" matches zero or more of it.',
        'Given text and pattern, return true if the pattern matches the whole text (not just part of it), and false otherwise.',
      ],
      inputFormat: 'text: lowercase letters. pattern: lowercase letters, "." and "*".',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ text.length ≤ 20', '0 ≤ pattern.length ≤ 20', 'Every "*" follows a letter or "."'],
      rules: ['The match must cover the whole text.', '"x*" can match nothing at all.', 'An empty pattern matches only empty text.'],
      entry: 'patternMatches',
      params: [
        { name: 'text', kind: 'auto' },
        { name: 'pattern', kind: 'auto' },
      ],
      examples: [
        { inputs: { text: 'moon', pattern: 'mo*n' }, output: true, note: 'o* takes both o’s.' },
        { inputs: { text: 'dog', pattern: 'd.' }, output: false, note: 'The pattern is one letter short.' },
      ],
      tests: [
        { inputs: { text: 'mn', pattern: 'mo*n' }, output: true, note: 'o* takes nothing' },
        { inputs: { text: 'cat', pattern: 'c.t' }, output: true, note: 'A dot' },
        { inputs: { text: 'cat', pattern: 'c.*' }, output: true, note: 'Dot star takes the rest' },
        { inputs: { text: '', pattern: 'x*' }, output: true, note: 'Empty text, starred pattern' },
        { inputs: { text: 'x', pattern: '' }, output: false, note: 'Empty pattern' },
        { inputs: { text: 'abcd', pattern: '.*e' }, output: false, note: 'No e at the end' },
        { inputs: { text: 'ab', pattern: 'a*b*c*' }, output: true, note: 'Several stars, one unused' },
      ],
      starter: {
        javascript: `function patternMatches(text, pattern) {
  // Return true if pattern matches all of text.
  return false;
}
`,
      },
      hints: [
        'Think about whether text from position i matches pattern from position j.',
        'If pattern[j + 1] is "*", either skip "pattern[j]*" entirely, or, if text[i] matches pattern[j], use it for one letter and stay on the same pattern position.',
        'Otherwise text[i] must match pattern[j] and both move on. Fill a table from the ends backwards.',
      ],
      solution: {
        explanation: [
          'can[i][j] says whether text[i..] matches pattern[j..]; both being empty is true. first says whether text[i] exists and matches pattern[j] (equal or ".").',
          'With a star after pattern[j], the pair matches nothing (can[i][j + 2]) or one more letter (first and can[i + 1][j]). Without one, the letter must match and both move on. Filling from the back means every cell it reads is ready.',
        ],
        code: `function patternMatches(text, pattern) {
  const can = [];
  for (let i = 0; i <= text.length; i++) can.push(new Array(pattern.length + 1).fill(false));
  can[text.length][pattern.length] = true;
  for (let i = text.length; i >= 0; i--) {
    for (let j = pattern.length - 1; j >= 0; j--) {
      const first = i < text.length && (pattern[j] === text[i] || pattern[j] === '.');
      if (j + 1 < pattern.length && pattern[j + 1] === '*') {
        can[i][j] = can[i][j + 2] || (first && can[i + 1][j]);
      } else {
        can[i][j] = first && can[i + 1][j + 1];
      }
    }
  }
  return can[0][0];
}
`,
        complexity: { time: 'O(m · n)', space: 'O(m · n)', assumptions: 'm is text.length and n pattern.length.' },
      },
      visualization: {
        spec: 'The can table is drawn as a grid filled from the bottom-right corner; i and j mark the cell, and text and pattern are drawn as character cells.',
        renderers: ['grid', 'string-cells'],
      },
    },
  },

  'i100-083': {
    prerequisites: ['dp-basics', 'greedy'],
    related: ['i100-014', 'i100-084'],
    content: {
      statement: [
        'A collector may make at most k trades in a rare stamp: each trade buys it on one day and sells it on a later day, and they can hold only one stamp at a time (sell before buying again).',
        'Given k and the daily prices, return the largest total profit.',
      ],
      inputFormat: 'k: a non-negative integer. prices: an array of non-negative integers.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ k ≤ 100', '0 ≤ prices.length ≤ 1,000', '0 ≤ prices[i] ≤ 1,000'],
      rules: ['At most k trades; fewer is fine.', 'A trade must sell before the next one buys.', 'No profitable trade: return 0.'],
      entry: 'limitedTrades',
      params: [
        { name: 'k', kind: 'auto' },
        { name: 'prices', kind: 'auto' },
      ],
      examples: [
        { inputs: { k: 2, prices: [3, 8, 2, 7, 1, 4] }, output: 10, note: '3 → 8 and 2 → 7.' },
        { inputs: { k: 1, prices: [3, 8, 2, 7, 1, 4] }, output: 5, note: 'Only the best single trade.' },
      ],
      tests: [
        { inputs: { k: 3, prices: [5, 4, 3, 2] }, output: 0, note: 'Prices only fall' },
        { inputs: { k: 0, prices: [1, 9] }, output: 0, note: 'No trades allowed' },
        { inputs: { k: 2, prices: [] }, output: 0, note: 'No days' },
        { inputs: { k: 1, prices: [2, 2, 2] }, output: 0, note: 'Flat prices' },
        { inputs: { k: 3, prices: [1, 5, 2, 6, 3, 7] }, output: 12, note: 'Three trades of 4' },
      ],
      starter: {
        javascript: `function limitedTrades(k, prices) {
  // Return the largest profit from at most k trades.
  return 0;
}
`,
      },
      hints: [
        'Each day, you are either holding a stamp or not, and you have used some number of trades.',
        'Track, for every trade number t, the best balance while holding the stamp of trade t, and the best balance after finishing t trades.',
        'Buying on a day moves from "finished t − 1" to "holding t"; selling moves from "holding t" to "finished t".',
      ],
      solution: {
        explanation: [
          'holding[t] is the best balance so far while holding the stamp bought in trade t (it starts impossible, −∞), and free[t] the best balance after completing t trades (0 to start).',
          'Each day, buying for trade t is free[t − 1] − price and selling is holding[t] + price; each keeps the better of its old value and the new one. free[k] is the best after at most k trades, since free values never fall.',
        ],
        code: `function limitedTrades(k, prices) {
  const holding = new Array(k + 1).fill(-Infinity);
  const free = new Array(k + 1).fill(0);
  for (const p of prices) {
    for (let t = 1; t <= k; t++) {
      holding[t] = Math.max(holding[t], free[t - 1] - p);
      free[t] = Math.max(free[t], holding[t] + p);
    }
  }
  return free[k];
}
`,
        complexity: { time: 'O(n · k)', space: 'O(k)', assumptions: 'n is prices.length.' },
      },
      visualization: {
        spec: 'The prices are drawn as cells with the current day marked; holding and free are drawn as cells, one per trade, updated every day.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-084': {
    prerequisites: ['dp-basics', 'greedy'],
    related: ['i100-074', 'i100-083'],
    content: {
      statement: [
        'A shop records its daily profit or loss. The owner wants the run of consecutive days with the largest total.',
        'Given values, return the largest sum of a contiguous non-empty subarray.',
      ],
      inputFormat: 'values: a non-empty array of integers.',
      outputFormat: 'An integer.',
      constraints: ['1 ≤ values.length ≤ 100,000', '-10^4 ≤ values[i] ≤ 10^4'],
      rules: ['The run has at least one day.', 'All-negative values: the answer is the largest single value.'],
      entry: 'bestStreakTotal',
      params: [{ name: 'values', kind: 'auto' }],
      examples: [
        { inputs: { values: [4, -6, 3, 5, -1, 2] }, output: 9, note: '3 + 5 − 1 + 2.' },
        { inputs: { values: [-5, -2, -9] }, output: -2, note: 'The best single day.' },
      ],
      tests: [
        { inputs: { values: [7] }, output: 7, note: 'One day' },
        { inputs: { values: [1, 2, 3] }, output: 6, note: 'Every day' },
        { inputs: { values: [-1, 4, -1, 4, -10, 6] }, output: 7, note: '4 − 1 + 4 beats 6' },
        { inputs: { values: [0, -1, 0] }, output: 0, note: 'Zeros' },
      ],
      starter: {
        javascript: `function bestStreakTotal(values) {
  // Return the largest sum of a contiguous run.
  return values[0];
}
`,
      },
      hints: [
        'Think about the best run that ends on each day.',
        'It is either the day alone, or the best run ending the day before plus this day.',
        'A run ending yesterday with a negative total only drags today down: start over instead.',
      ],
      solution: {
        explanation: [
          'current is the best total of a run ending on the current day: the day alone, or yesterday’s current plus the day, whichever is larger. A negative current is dropped this way.',
          'best keeps the largest current seen. Each day is looked at once.',
        ],
        code: `function bestStreakTotal(values) {
  let current = values[0];
  let best = values[0];
  for (let i = 1; i < values.length; i++) {
    current = Math.max(values[i], current + values[i]);
    best = Math.max(best, current);
  }
  return best;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is values.length.' },
      },
      visualization: {
        spec: 'The values are drawn as cells with i marked; current and best are blocks, and current restarts when continuing would make it smaller.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-085': {
    prerequisites: ['greedy', 'hash-maps', 'strings-and-chars'],
    related: ['i100-089', 'i100-090'],
    content: {
      statement: [
        'A librarian splits a shelf of labelled books into as many sections as possible, keeping their order, so that every label is found in only one section.',
        'Given the labels as the string text, return the sizes of the sections, left to right.',
      ],
      inputFormat: 'text: a string of lowercase letters.',
      outputFormat: 'An array of positive integers that add up to text.length.',
      constraints: ['0 ≤ text.length ≤ 500'],
      rules: ['Every letter appears in only one section.', 'Make as many sections as possible.', 'Empty text: return [].'],
      entry: 'sectionSizes',
      params: [{ name: 'text', kind: 'auto' }],
      examples: [
        { inputs: { text: 'zxyzxw' }, output: [5, 1], note: 'z and x reach to position 4; w stands alone.' },
        { inputs: { text: 'aabbaacc' }, output: [6, 2], note: 'The a’s hold the first six together.' },
      ],
      tests: [
        { inputs: { text: '' }, output: [], note: 'Empty text' },
        { inputs: { text: 'a' }, output: [1], note: 'One letter' },
        { inputs: { text: 'abcdef' }, output: [1, 1, 1, 1, 1, 1], note: 'All different' },
        { inputs: { text: 'abcab' }, output: [5], note: 'One section' },
        { inputs: { text: 'xyzzy' }, output: [1, 4], note: 'x alone, then the rest' },
      ],
      starter: {
        javascript: `function sectionSizes(text) {
  // Return the sizes of the most sections in which each letter appears in only one.
  return [];
}
`,
      },
      hints: [
        'A section that contains a letter must reach at least to that letter’s last appearance.',
        'Record every letter’s last position first.',
        'Walk the text, stretching the current section’s end to the last position of each letter you pass; when you reach the end, close the section.',
      ],
      solution: {
        explanation: [
          'last maps each letter to its last position. The current section starts at start and must reach at least end: the furthest last position of any letter in it so far.',
          'When the walk reaches end, no letter in the section appears later, so the section can close there, as early as possible, which makes the most sections.',
        ],
        code: `function sectionSizes(text) {
  const last = new Map();
  for (let i = 0; i < text.length; i++) last.set(text[i], i);
  const sizes = [];
  let start = 0;
  let end = 0;
  for (let i = 0; i < text.length; i++) {
    end = Math.max(end, last.get(text[i]));
    if (i === end) {
      sizes.push(end - start + 1);
      start = i + 1;
    }
  }
  return sizes;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is text.length; the map holds at most 26 letters.' },
      },
      visualization: {
        spec: 'text is drawn as character cells with start, i and end as flags; the last map shows each letter’s last position, and sizes grows as sections close.',
        renderers: ['string-cells', 'hash-map'],
      },
      view: { mapColumns: ['letter', 'last'] },
    },
  },

  'i100-086': {
    prerequisites: ['greedy', 'arrays-basics'],
    related: ['i100-085', 'i100-059'],
    content: {
      statement: [
        'A teacher hands out treats to children standing in a line, each with a behaviour rating. Every child gets at least one treat, and a child rated higher than a neighbour must get more treats than that neighbour.',
        'Given the ratings in line order, return the fewest treats in total.',
      ],
      inputFormat: 'ratings: an array of non-negative integers.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ ratings.length ≤ 20,000', '0 ≤ ratings[i] ≤ 20,000'],
      rules: [
        'Every child gets at least 1 treat.',
        'Higher than a neighbour means more treats than that neighbour.',
        'Equal neighbours may get any numbers.',
      ],
      entry: 'fairTreats',
      params: [{ name: 'ratings', kind: 'auto' }],
      examples: [
        { inputs: { ratings: [3, 1, 4, 4, 2] }, output: 8, note: '2, 1, 2, 2, 1.' },
        { inputs: { ratings: [1, 3, 2, 2, 1] }, output: 7, note: '1, 2, 1, 2, 1.' },
      ],
      tests: [
        { inputs: { ratings: [5] }, output: 1, note: 'One child' },
        { inputs: { ratings: [] }, output: 0, note: 'No children' },
        { inputs: { ratings: [1, 2, 3] }, output: 6, note: 'Rising' },
        { inputs: { ratings: [3, 2, 1] }, output: 6, note: 'Falling' },
        { inputs: { ratings: [2, 2, 2] }, output: 3, note: 'All equal' },
      ],
      starter: {
        javascript: `function fairTreats(ratings) {
  // Return the fewest treats so that higher-rated children get more than their neighbours.
  return ratings.length;
}
`,
      },
      hints: [
        'Handle the two directions separately.',
        'Left to right: a child rated higher than the one on the left needs one more than that child.',
        'Right to left: a child rated higher than the one on the right needs more than that child too, so take the larger of the two requirements.',
      ],
      solution: {
        explanation: [
          'treats starts at 1 each. The left-to-right pass gives every child rated higher than the left neighbour one more than that neighbour, which satisfies every left-hand rule with as few treats as possible.',
          'The right-to-left pass does the same for the right-hand rule but keeps the larger number, so the left-hand rule still holds. Each child ends with the smallest number both rules allow.',
        ],
        code: `function fairTreats(ratings) {
  const treats = new Array(ratings.length).fill(1);
  for (let i = 1; i < ratings.length; i++) {
    if (ratings[i] > ratings[i - 1]) treats[i] = treats[i - 1] + 1;
  }
  for (let i = ratings.length - 2; i >= 0; i--) {
    if (ratings[i] > ratings[i + 1]) treats[i] = Math.max(treats[i], treats[i + 1] + 1);
  }
  return treats.reduce((a, b) => a + b, 0);
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is ratings.length.' },
      },
      visualization: {
        spec: 'ratings and treats are drawn as cells with i moving left to right, then right to left; each raised treat count is marked.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-087': {
    prerequisites: ['intervals', 'sorting'],
    related: ['i100-088', 'i100-089'],
    content: {
      statement: [
        'A busy manager has a list of meetings as [start, end] times. A meeting ending at 10 and one starting at 10 don’t clash.',
        'Return true if the manager can attend every meeting (no two overlap), and false otherwise.',
      ],
      inputFormat: 'meetings: an array of [start, end] pairs with start < end.',
      outputFormat: 'A boolean.',
      constraints: ['0 ≤ meetings.length ≤ 10,000', '0 ≤ start < end ≤ 10^6'],
      rules: [
        'Meetings are given in any order.',
        'Touching meetings (one ends when the next starts) are fine.',
        'No meetings: return true.',
      ],
      entry: 'canAttendAll',
      params: [{ name: 'meetings', kind: 'auto' }],
      examples: [
        {
          inputs: {
            meetings: [
              [9, 10],
              [13, 15],
              [10, 12],
            ],
          },
          output: true,
          note: '9–10, 10–12, 13–15 in order.',
        },
        {
          inputs: {
            meetings: [
              [8, 11],
              [10, 12],
            ],
          },
          output: false,
          note: 'They overlap from 10 to 11.',
        },
      ],
      tests: [
        { inputs: { meetings: [] }, output: true, note: 'No meetings' },
        { inputs: { meetings: [[1, 2]] }, output: true, note: 'One meeting' },
        {
          inputs: {
            meetings: [
              [5, 7],
              [7, 9],
            ],
          },
          output: true,
          note: 'Touching',
        },
        {
          inputs: {
            meetings: [
              [1, 10],
              [2, 3],
              [11, 12],
            ],
          },
          output: false,
          note: 'One meeting inside another',
        },
      ],
      starter: {
        javascript: `function canAttendAll(meetings) {
  // Return true if no two meetings overlap.
  return true;
}
`,
      },
      hints: [
        'Overlaps are easy to spot once the meetings are in time order.',
        'Sort by start time.',
        'Then each meeting must start no earlier than the previous one ends.',
      ],
      solution: {
        explanation: [
          'ordered is a copy sorted by start time. If any two meetings overlap, then some meeting overlaps the one just before it in this order.',
          'So it is enough to check that each meeting starts at or after the previous one’s end.',
        ],
        code: `function canAttendAll(meetings) {
  const ordered = [...meetings].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i][0] < ordered[i - 1][1]) return false;
  }
  return true;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is meetings.length; sorting dominates.' },
      },
      visualization: {
        spec: 'The sorted meetings are drawn as rows of [start, end]; each start is compared with the previous end.',
        renderers: ['grid'],
      },
    },
  },

  'i100-088': {
    prerequisites: ['intervals', 'sorting', 'two-pointers'],
    related: ['i100-087', 'i100-091'],
    content: {
      statement: [
        'An office books meetings into rooms. Two meetings can share a room only if they don’t overlap (a meeting ending at 10 frees the room for one starting at 10).',
        'Given the meetings as [start, end] pairs, return the fewest rooms needed to host them all.',
      ],
      inputFormat: 'meetings: an array of [start, end] pairs with start < end.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ meetings.length ≤ 10,000', '0 ≤ start < end ≤ 10^6'],
      rules: ['A room hosts one meeting at a time.', 'A meeting that ends frees its room at once.', 'No meetings: 0 rooms.'],
      entry: 'roomsNeeded',
      params: [{ name: 'meetings', kind: 'auto' }],
      examples: [
        {
          inputs: {
            meetings: [
              [9, 10],
              [9, 12],
              [11, 13],
              [12, 14],
            ],
          },
          output: 2,
          note: 'Never more than two at once.',
        },
        {
          inputs: {
            meetings: [
              [1, 10],
              [2, 9],
              [3, 8],
              [4, 7],
            ],
          },
          output: 4,
          note: 'All four overlap at time 5.',
        },
      ],
      tests: [
        { inputs: { meetings: [] }, output: 0, note: 'No meetings' },
        { inputs: { meetings: [[3, 4]] }, output: 1, note: 'One meeting' },
        {
          inputs: {
            meetings: [
              [1, 5],
              [5, 9],
            ],
          },
          output: 1,
          note: 'Back to back',
        },
        {
          inputs: {
            meetings: [
              [1, 4],
              [2, 5],
              [6, 8],
              [7, 9],
              [4, 6],
            ],
          },
          output: 2,
          note: 'Rooms reused',
        },
      ],
      starter: {
        javascript: `function roomsNeeded(meetings) {
  // Return the fewest rooms that host every meeting.
  return 0;
}
`,
      },
      hints: [
        'Only the moments when meetings start and end matter.',
        'Sort the start times and the end times separately.',
        'Walk the starts in order: if the earliest end not yet used has already come, that room is free again; otherwise a new room is needed.',
      ],
      solution: {
        explanation: [
          'starts and ends are the times sorted separately. e points at the earliest end not yet matched to a later start.',
          'Each start either reuses the room of the meeting that ended at ends[e] (if that end is at or before it) or needs a new room. Which meeting ended doesn’t matter, only how many have.',
        ],
        code: `function roomsNeeded(meetings) {
  const starts = meetings.map((m) => m[0]).sort((a, b) => a - b);
  const ends = meetings.map((m) => m[1]).sort((a, b) => a - b);
  let rooms = 0;
  let e = 0;
  for (const s of starts) {
    if (s >= ends[e]) e++;
    else rooms++;
  }
  return rooms;
}
`,
        complexity: { time: 'O(n log n)', space: 'O(n)', assumptions: 'n is meetings.length; sorting dominates.' },
      },
      visualization: {
        spec: 'starts and ends are drawn as sorted cells with a flag on the current start and e on the earliest unused end; rooms is a block that grows only when no room is free.',
        renderers: ['array-cells', 'grid'],
      },
    },
  },

  'i100-089': {
    prerequisites: ['intervals'],
    related: ['i100-087', 'i100-090'],
    content: {
      statement: [
        'A booking calendar keeps its bookings as [start, end] intervals, sorted by start and not touching or overlapping each other. A new booking arrives.',
        'Insert fresh into bookings, merging it with every booking it overlaps or touches, and return the new list, still sorted and separate.',
      ],
      inputFormat: 'bookings: a sorted array of separate [start, end] pairs. fresh: a [start, end] pair.',
      outputFormat: 'A sorted array of separate [start, end] pairs.',
      constraints: ['0 ≤ bookings.length ≤ 10,000', 'start ≤ end in every pair'],
      rules: ['Touching intervals ([1, 3] and [3, 5]) merge.', 'The result stays sorted.', 'Don’t change bookings; build a new list.'],
      entry: 'insertBooking',
      params: [
        { name: 'bookings', kind: 'auto' },
        { name: 'fresh', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            bookings: [
              [1, 2],
              [4, 6],
              [9, 12],
            ],
            fresh: [5, 10],
          },
          output: [
            [1, 2],
            [4, 12],
          ],
          note: '[5, 10] joins [4, 6] and [9, 12].',
        },
        {
          inputs: { bookings: [[3, 5]], fresh: [7, 8] },
          output: [
            [3, 5],
            [7, 8],
          ],
          note: 'No overlap: added after.',
        },
      ],
      tests: [
        { inputs: { bookings: [], fresh: [2, 4] }, output: [[2, 4]], note: 'Empty calendar' },
        {
          inputs: { bookings: [[5, 7]], fresh: [1, 3] },
          output: [
            [1, 3],
            [5, 7],
          ],
          note: 'Goes first',
        },
        {
          inputs: {
            bookings: [
              [1, 3],
              [7, 9],
            ],
            fresh: [3, 7],
          },
          output: [[1, 9]],
          note: 'Touching on both sides',
        },
        {
          inputs: {
            bookings: [
              [1, 2],
              [3, 4],
              [5, 6],
            ],
            fresh: [0, 10],
          },
          output: [[0, 10]],
          note: 'Swallows everything',
        },
      ],
      starter: {
        javascript: `function insertBooking(bookings, fresh) {
  // Return the bookings with fresh inserted and merged.
  return bookings;
}
`,
      },
      hints: [
        'The bookings fall into three groups: entirely before fresh, overlapping or touching it, and entirely after it.',
        'Copy the first group as it is.',
        'Merge the middle group into fresh by stretching its start and end, add it, then copy the rest.',
      ],
      solution: {
        explanation: [
          'Bookings that end before fresh starts can’t touch it and are copied first. Then every booking that starts no later than fresh’s end overlaps or touches it: start and end stretch to cover each one.',
          'The merged booking is added, and every remaining booking starts after it, so it is copied as it is. One pass, in order.',
        ],
        code: `function insertBooking(bookings, fresh) {
  const out = [];
  let [start, end] = fresh;
  let i = 0;
  while (i < bookings.length && bookings[i][1] < start) out.push(bookings[i++]);
  while (i < bookings.length && bookings[i][0] <= end) {
    start = Math.min(start, bookings[i][0]);
    end = Math.max(end, bookings[i][1]);
    i++;
  }
  out.push([start, end]);
  while (i < bookings.length) out.push(bookings[i++]);
  return out;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is bookings.length.' },
      },
      visualization: {
        spec: 'The bookings are drawn as rows of [start, end] with i marking the one being read; start and end are blocks that stretch while bookings merge.',
        renderers: ['grid', 'array-cells'],
      },
    },
  },

  'i100-090': {
    prerequisites: ['arrays-basics', 'loops-and-indexes'],
    related: ['i100-008', 'i100-089'],
    content: {
      statement: [
        'A seating chart lists the occupied seat numbers in increasing order. To print it compactly, each run of consecutive seats is written as "first..last", and a seat on its own as just its number.',
        'Given the seats, return the list of ranges in order.',
      ],
      inputFormat: 'seats: an array of distinct integers in increasing order.',
      outputFormat: 'An array of strings like "1..3" or "7".',
      constraints: ['0 ≤ seats.length ≤ 20', '-2^31 ≤ seats[i] ≤ 2^31 − 1'],
      rules: [
        'A run of two or more consecutive numbers is written "first..last".',
        'A single number is written on its own.',
        'Empty input: return [].',
      ],
      entry: 'seatRanges',
      params: [{ name: 'seats', kind: 'auto' }],
      examples: [
        { inputs: { seats: [1, 2, 3, 7, 9, 10] }, output: ['1..3', '7', '9..10'], note: 'Three runs.' },
        { inputs: { seats: [0, 2, 4] }, output: ['0', '2', '4'], note: 'No two consecutive.' },
      ],
      tests: [
        { inputs: { seats: [] }, output: [], note: 'No seats' },
        { inputs: { seats: [5] }, output: ['5'], note: 'One seat' },
        { inputs: { seats: [-3, -2, -1, 1] }, output: ['-3..-1', '1'], note: 'Negative numbers' },
        { inputs: { seats: [8, 9] }, output: ['8..9'], note: 'A run of two' },
      ],
      starter: {
        javascript: `function seatRanges(seats) {
  // Return the runs of consecutive seats as "first..last" or a single number.
  return [];
}
`,
      },
      hints: [
        'A run continues while the next seat is exactly one more than the current one.',
        'Remember where the current run started, and close it when the next seat breaks it (or the list ends).',
        'Write the run as one number if it started and ended on the same seat.',
      ],
      solution: {
        explanation: [
          'i marks the start of a run and j moves on while seats[j + 1] is seats[j] + 1. Then seats[i..j] is one run.',
          'A run of one seat is written as its number, a longer one as "first..last"; the next run starts at j + 1.',
        ],
        code: `function seatRanges(seats) {
  const out = [];
  let i = 0;
  while (i < seats.length) {
    let j = i;
    while (j + 1 < seats.length && seats[j + 1] === seats[j] + 1) j++;
    out.push(i === j ? String(seats[i]) : seats[i] + '..' + seats[j]);
    i = j + 1;
  }
  return out;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is seats.length, not counting the output.' },
      },
      visualization: {
        spec: 'The seats are drawn as cells with i and j marking the current run; out grows by one string per run.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-091': {
    prerequisites: ['heaps', 'intervals', 'sorting'],
    related: ['i100-088', 'i100-089'],
    content: {
      statement: [
        'A park has shaded stretches along its main path, given as inclusive [start, end] ranges of path markers. Visitors standing at a marker ask for the shortest shaded stretch that covers their marker.',
        'Given the stretches and the query markers, return for each query the length (end − start + 1) of the shortest stretch containing it, or -1 if none does. Answers follow the order of the queries.',
      ],
      inputFormat: 'intervals: an array of [start, end] pairs with start ≤ end. queries: an array of integers.',
      outputFormat: 'An array of integers, one per query.',
      constraints: ['0 ≤ intervals.length, queries.length ≤ 100,000', '0 ≤ start ≤ end ≤ 10^7'],
      rules: ['A stretch contains q when start ≤ q ≤ end.', 'Length counts both ends: [4, 5] has length 2.', 'No stretch contains q: -1.'],
      entry: 'queryWindows',
      params: [
        { name: 'intervals', kind: 'auto' },
        { name: 'queries', kind: 'auto' },
      ],
      examples: [
        {
          inputs: {
            intervals: [
              [2, 6],
              [4, 5],
              [1, 9],
              [7, 8],
            ],
            queries: [5, 7, 10, 1],
          },
          output: [2, 2, -1, 9],
          note: '5 is in [4, 5]; 7 in [7, 8]; nothing reaches 10.',
        },
        { inputs: { intervals: [[3, 3]], queries: [3, 4] }, output: [1, -1], note: 'A stretch of one marker.' },
      ],
      tests: [
        { inputs: { intervals: [], queries: [1] }, output: [-1], note: 'No stretches' },
        {
          inputs: {
            intervals: [
              [1, 4],
              [2, 3],
            ],
            queries: [],
          },
          output: [],
          note: 'No queries',
        },
        {
          inputs: {
            intervals: [
              [0, 10],
              [5, 5],
              [6, 9],
            ],
            queries: [5, 6, 0, 10],
          },
          output: [1, 4, 11, 11],
          note: 'Queries out of order',
        },
        {
          inputs: {
            intervals: [
              [1, 2],
              [1, 2],
            ],
            queries: [2],
          },
          output: [2],
          note: 'Duplicate stretches',
        },
      ],
      starter: {
        javascript: `function queryWindows(intervals, queries) {
  // For each query, return the length of the shortest interval containing it, or -1.
  return queries.map(() => -1);
}
`,
      },
      hints: [
        'Checking every interval for every query is O(n · q). Answer the queries from smallest to largest instead.',
        'As the query grows, add every interval that has started to a min-heap ordered by length.',
        'Before answering, remove intervals from the top that ended before the query. The top is then the answer.',
      ],
      solution: {
        explanation: [
          'byStart holds the intervals by start and order the query positions by value. For each query, every interval that has started (start ≤ q) is pushed onto heap as [length, end], shortest first.',
          'Intervals on top that ended before q can’t contain it or any later query, so they are popped for good. The top is then the shortest interval containing q. Answers go back to the query’s original position.',
        ],
        code: `function queryWindows(intervals, queries) {
  const byStart = [...intervals].sort((a, b) => a[0] - b[0]);
  const order = queries.map((_, i) => i).sort((a, b) => queries[a] - queries[b]);
  const heap = []; // [length, end], the shortest on top
  const before = (a, b) => a[0] - b[0] || a[1] - b[1];
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (before(heap[i], heap[parent]) >= 0) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = () => {
    const last = heap.pop();
    if (heap.length === 0) return;
    heap[0] = last;
    let i = 0;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let first = i;
      if (left < heap.length && before(heap[left], heap[first]) < 0) first = left;
      if (right < heap.length && before(heap[right], heap[first]) < 0) first = right;
      if (first === i) break;
      [heap[i], heap[first]] = [heap[first], heap[i]];
      i = first;
    }
  };
  const answers = new Array(queries.length).fill(-1);
  let added = 0;
  for (const qi of order) {
    const q = queries[qi];
    while (added < byStart.length && byStart[added][0] <= q) {
      const [lo, hi] = byStart[added++];
      push([hi - lo + 1, hi]);
    }
    while (heap.length > 0 && heap[0][1] < q) pop();
    if (heap.length > 0) answers[qi] = heap[0][0];
  }
  return answers;
}
`,
        complexity: {
          time: 'O((n + q) log n + q log q)',
          space: 'O(n + q)',
          assumptions: 'n is intervals.length and q queries.length; each interval is pushed and popped at most once.',
        },
      },
      visualization: {
        spec: 'The intervals are drawn as rows sorted by start; the heap of [length, end] entries is drawn as a tree and as cells, losing expired entries before each answer.',
        renderers: ['heap-tree', 'grid', 'array-cells', 'call-stack'],
      },
    },
  },

  'i100-092': {
    prerequisites: ['strings-and-chars', 'greedy'],
    related: ['i100-090', 'i100-085'],
    content: {
      statement: [
        'A newspaper prints columns exactly width characters wide. Words are packed onto each line greedily (as many as fit with one space between them), and then the spaces are spread so the line fills the width exactly: as evenly as possible, with the extra spaces going to the leftmost gaps.',
        'The last line, and any line with a single word, is written with single spaces and padded with spaces on the right. Given words and width, return the lines.',
      ],
      inputFormat: 'words: an array of non-empty words without spaces. width: a positive integer at least as long as every word.',
      outputFormat: 'An array of strings, each exactly width characters long.',
      constraints: ['1 ≤ words.length ≤ 300', '1 ≤ each word’s length ≤ width ≤ 100'],
      rules: [
        'Pack each line with as many words as fit, separated by at least one space.',
        'Middle lines are fully justified; uneven spaces go to the leftmost gaps.',
        'The last line and single-word lines are left-justified and padded on the right.',
      ],
      entry: 'evenLines',
      params: [
        { name: 'words', kind: 'auto' },
        { name: 'width', kind: 'auto' },
      ],
      examples: [
        {
          inputs: { words: ['the', 'quick', 'brown', 'fox', 'jumps'], width: 12 },
          output: ['the    quick', 'brown    fox', 'jumps       '],
          note: 'Two full lines, then a padded last line.',
        },
        {
          inputs: { words: ['one', 'two', 'three', 'four', 'five', 'six'], width: 10 },
          output: ['one    two', 'three four', 'five six  '],
          note: 'The last line keeps single spaces.',
        },
      ],
      tests: [
        { inputs: { words: ['a'], width: 3 }, output: ['a  '], note: 'One short word' },
        { inputs: { words: ['hello', 'world'], width: 5 }, output: ['hello', 'world'], note: 'One word per line, exactly full' },
        {
          inputs: { words: ['go', 'to', 'the', 'park', 'now'], width: 9 },
          output: ['go to the', 'park now '],
          note: 'A line that fits exactly',
        },
        { inputs: { words: ['ab', 'cd', 'ef'], width: 7 }, output: ['ab   cd', 'ef     '], note: 'All the extra space in one gap' },
      ],
      starter: {
        javascript: `function evenLines(words, width) {
  // Return the justified lines, each exactly width characters.
  return [];
}
`,
      },
      hints: [
        'First decide which words go on each line: keep adding words while the letters plus one space per gap fit.',
        'For a middle line, the spaces to share are width minus the letters. Divide them among the gaps; the first (spaces mod gaps) gaps get one extra.',
        'The last line, and a line with one word, are joined with single spaces and padded on the right.',
      ],
      solution: {
        explanation: [
          'For each line, j moves past every word that still fits: length counts the letters, and j − i words need j − i − 1 spaces at least. gaps is the number of gaps on the line.',
          'A middle line with gaps shares width − length spaces: every gap gets ⌊spaces / gaps⌋ and the first spaces mod gaps gaps get one more. The last line or a single word is joined with single spaces and padded with spaces to the width.',
        ],
        code: `function evenLines(words, width) {
  const lines = [];
  let i = 0;
  while (i < words.length) {
    let j = i;
    let length = 0;
    while (j < words.length && length + words[j].length + (j - i) <= width) {
      length += words[j].length;
      j++;
    }
    const gaps = j - i - 1;
    let line = '';
    if (j === words.length || gaps === 0) {
      line = words.slice(i, j).join(' ');
      line += ' '.repeat(width - line.length);
    } else {
      const spaces = width - length;
      for (let k = i; k < j; k++) {
        line += words[k];
        if (k < j - 1) line += ' '.repeat(Math.floor(spaces / gaps) + (k - i < spaces % gaps ? 1 : 0));
      }
    }
    lines.push(line);
    i = j;
  }
  return lines;
}
`,
        complexity: { time: 'O(n · w)', space: 'O(n · w)', assumptions: 'n is words.length and w the width; every line is built once.' },
      },
      visualization: {
        spec: 'The words are drawn as cells with i and j marking the words on the current line; length, gaps and spaces are blocks, and lines grows by one finished line at a time.',
        renderers: ['array-cells', 'string-cells'],
      },
    },
  },

  'i100-093': {
    prerequisites: ['bits', 'dp-basics'],
    related: ['i100-094', 'i100-095'],
    content: {
      statement: [
        'A display driver needs, for every number from 0 to n, how many of its bits are 1, to precompute brightness levels.',
        'Given n, return an array whose entry i is the number of 1 bits in i, computing each entry from an earlier one instead of counting from scratch.',
      ],
      inputFormat: 'n: a non-negative integer.',
      outputFormat: 'An array of n + 1 integers.',
      constraints: ['0 ≤ n ≤ 100,000'],
      rules: ['Entry i counts the 1 bits of i in binary.', 'Aim for O(n): one step per entry.'],
      entry: 'bitTally',
      params: [{ name: 'n', kind: 'auto' }],
      examples: [
        { inputs: { n: 5 }, output: [0, 1, 1, 2, 1, 2], note: '0, 1, 10, 11, 100, 101 in binary.' },
        { inputs: { n: 8 }, output: [0, 1, 1, 2, 1, 2, 2, 3, 1], note: '7 is 111; 8 is 1000.' },
      ],
      tests: [
        { inputs: { n: 0 }, output: [0], note: 'Only 0' },
        { inputs: { n: 1 }, output: [0, 1], note: '0 and 1' },
        { inputs: { n: 3 }, output: [0, 1, 1, 2], note: 'Up to 11' },
        { inputs: { n: 16 }, output: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1], note: 'A power of two resets to 1' },
      ],
      starter: {
        javascript: `function bitTally(n) {
  // Return the number of 1 bits of every number from 0 to n.
  return [];
}
`,
      },
      hints: [
        'Shifting i one place right (i >> 1, which halves it) drops exactly its lowest bit.',
        'So i has the same 1 bits as i >> 1, plus one if its lowest bit (i & 1) is 1.',
        'i >> 1 is smaller than i, so its count is already in the array.',
      ],
      solution: {
        explanation: [
          'i >> 1 is i without its lowest bit, and i & 1 is that bit. So counts[i] = counts[i >> 1] + (i & 1).',
          'Every i >> 1 is smaller than i, so filling the array from 0 upwards always finds the earlier entry ready: one step per number.',
        ],
        code: `function bitTally(n) {
  const counts = [0];
  for (let i = 1; i <= n; i++) counts.push(counts[i >> 1] + (i & 1));
  return counts;
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is the input; the output has n + 1 entries.' },
      },
      visualization: {
        spec: 'i is drawn as a row of bits next to i >> 1; counts is drawn as cells, each new entry reading the one at i >> 1.',
        renderers: ['bits', 'array-cells'],
      },
    },
  },

  'i100-094': {
    prerequisites: ['bits'],
    related: ['i100-093', 'i100-095'],
    content: {
      statement: [
        'A sensor sends 32-bit readings with the bits in the wrong order: the lowest bit arrives first, so every reading has its bits mirrored.',
        'Given a 32-bit unsigned integer n, return the number whose 32 bits are n’s bits in reverse order.',
      ],
      inputFormat: 'n: an integer from 0 to 2^32 − 1.',
      outputFormat: 'An integer from 0 to 2^32 − 1.',
      constraints: ['0 ≤ n ≤ 4,294,967,295'],
      rules: ['Exactly 32 bits are reversed, including leading zeros.', 'The result is unsigned (never negative).'],
      entry: 'mirrorBits',
      params: [{ name: 'n', kind: 'auto' }],
      examples: [
        { inputs: { n: 13 }, output: 2952790016, note: '1101 at the bottom becomes 1011 at the top.' },
        { inputs: { n: 1 }, output: 2147483648, note: 'The lowest bit becomes the highest.' },
      ],
      tests: [
        { inputs: { n: 0 }, output: 0, note: 'All zeros' },
        { inputs: { n: 2147483648 }, output: 1, note: 'The highest bit becomes the lowest' },
        { inputs: { n: 4294967295 }, output: 4294967295, note: 'All ones' },
        { inputs: { n: 6 }, output: 1610612736, note: '110 → 011 followed by 29 zeros' },
        { inputs: { n: 305419896 }, output: 510274632, note: 'A mixed pattern' },
      ],
      starter: {
        javascript: `function mirrorBits(n) {
  // Return n's 32 bits in reverse order.
  return 0;
}
`,
      },
      hints: [
        'Take n’s bits from the lowest up, and build the result from the highest down.',
        'Each round: result = result × 2 + (n’s lowest bit), then drop n’s lowest bit.',
        'Do exactly 32 rounds, so leading zeros are reversed too.',
      ],
      solution: {
        explanation: [
          'rest & 1 is rest’s lowest bit. Each of the 32 rounds appends it to result (doubling result first) and drops it from rest by halving.',
          'The first bit taken, n’s lowest, has been doubled 31 times by the end, so it lands in the highest place. Doubling with × 2 keeps the result unsigned.',
        ],
        code: `function mirrorBits(n) {
  let result = 0;
  let rest = n;
  for (let i = 0; i < 32; i++) {
    result = result * 2 + (rest & 1);
    rest = Math.floor(rest / 2);
  }
  return result;
}
`,
        complexity: { time: 'O(1)', space: 'O(1)', assumptions: 'Always 32 rounds.' },
      },
      visualization: {
        spec: 'rest and result are drawn as rows of bits: rest loses its lowest bit each round while result gains it at the bottom.',
        renderers: ['bits'],
      },
    },
  },

  'i100-095': {
    prerequisites: ['bits', 'arrays-basics'],
    related: ['i100-093', 'i100-004'],
    content: {
      statement: [
        'A conference printed badges numbered 0 to n and handed out all but one of them. The numbers of the n badges handed out are listed in no particular order.',
        'Return the missing number, using O(1) extra memory.',
      ],
      inputFormat: 'badges: an array of n distinct integers from 0 to n.',
      outputFormat: 'An integer: the one number from 0 to n not in badges.',
      constraints: ['1 ≤ badges.length ≤ 10,000'],
      rules: ['Exactly one number from 0 to n is missing.', 'Use O(1) extra memory: no set or sorted copy.'],
      entry: 'missingBadge',
      params: [{ name: 'badges', kind: 'auto' }],
      examples: [
        { inputs: { badges: [4, 2, 0, 1] }, output: 3, note: '0 to 4 without 3.' },
        { inputs: { badges: [1] }, output: 0, note: '0 is missing.' },
      ],
      tests: [
        { inputs: { badges: [0] }, output: 1, note: 'The top number is missing' },
        { inputs: { badges: [5, 3, 1, 0, 2] }, output: 4, note: 'Five badges' },
        { inputs: { badges: [2, 0] }, output: 1, note: 'The middle number' },
        { inputs: { badges: [1, 2, 3, 4, 5, 6] }, output: 0, note: 'Zero missing from a longer list' },
      ],
      starter: {
        javascript: `function missingBadge(badges) {
  // Return the missing number from 0 to n.
  return 0;
}
`,
      },
      hints: [
        'XOR-ing a number with itself gives 0, and XOR can be done in any order.',
        'XOR together every number from 0 to n and every badge: each number that appears in both cancels out.',
        'What is left is the number that appears only once: the missing one.',
      ],
      solution: {
        explanation: [
          'acc starts as n, and each round XORs in the index i (covering 0 to n − 1) and badges[i]. So every number from 0 to n goes in once, and every badge once more.',
          'Each number that is in badges goes in twice and cancels out (x ^ x = 0); the missing number goes in only once and is what remains.',
        ],
        code: `function missingBadge(badges) {
  let acc = badges.length;
  for (let i = 0; i < badges.length; i++) acc ^= i ^ badges[i];
  return acc;
}
`,
        complexity: { time: 'O(n)', space: 'O(1)', assumptions: 'n is badges.length.' },
      },
      visualization: {
        spec: 'The badges are drawn as cells with i marked; acc is drawn as a row of bits that flips with every XOR.',
        renderers: ['bits', 'array-cells'],
      },
    },
  },

  'i100-096': {
    prerequisites: ['fast-slow-pointers', 'loops-and-indexes'],
    related: ['i100-032', 'i100-097'],
    content: {
      statement: [
        'A number game replaces a number with the sum of the squares of its digits, again and again. A number is "happy" if this eventually reaches 1; otherwise it loops forever without reaching 1.',
        'Given a positive integer n, return true if it is happy, and false otherwise, without keeping a list of the numbers already seen.',
      ],
      inputFormat: 'n: a positive integer.',
      outputFormat: 'A boolean.',
      constraints: ['1 ≤ n ≤ 2^31 − 1'],
      rules: ['1 is happy.', 'Use O(1) extra memory: detect the loop without a set.'],
      entry: 'happyDigits',
      params: [{ name: 'n', kind: 'auto' }],
      examples: [
        { inputs: { n: 7 }, output: true, note: '7 → 49 → 97 → 130 → 10 → 1.' },
        { inputs: { n: 4 }, output: false, note: '4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 …' },
      ],
      tests: [
        { inputs: { n: 1 }, output: true, note: 'Already 1' },
        { inputs: { n: 100 }, output: true, note: '1 + 0 + 0' },
        { inputs: { n: 23 }, output: true, note: '13 → 10 → 1' },
        { inputs: { n: 20 }, output: false, note: 'Joins the loop at once' },
      ],
      starter: {
        javascript: `function happyDigits(n) {
  // Return true if repeated digit-square sums reach 1.
  return false;
}
`,
      },
      hints: [
        'The sequence either reaches 1 (and stays there) or repeats a number and loops.',
        'Detecting a loop without remembering the numbers is the slow-and-fast walker trick from linked lists.',
        'Move slow one step and fast two steps at a time; they meet in a loop, or fast reaches 1.',
      ],
      solution: {
        explanation: [
          'squareDigits(x) adds up the squares of x’s digits, the next number in the sequence. slow moves one step and fast two steps at a time.',
          'If the sequence reaches 1, fast gets there first. If it loops without 1, fast laps slow inside the loop and they meet. Only two numbers are kept.',
        ],
        code: `function happyDigits(n) {
  const squareDigits = (x) => {
    let total = 0;
    while (x > 0) {
      const d = x % 10;
      total += d * d;
      x = Math.floor(x / 10);
    }
    return total;
  };
  let slow = n;
  let fast = squareDigits(n);
  while (fast !== 1 && slow !== fast) {
    slow = squareDigits(slow);
    fast = squareDigits(squareDigits(fast));
  }
  return fast === 1;
}
`,
        complexity: { time: 'O(log n)', space: 'O(1)', assumptions: 'After one step every number is at most 810, so the loop is short.' },
      },
      visualization: {
        spec: 'slow and fast are blocks stepping through the sequence; the call stack shows each squareDigits computation.',
        renderers: ['call-stack'],
      },
    },
  },

  'i100-097': {
    prerequisites: ['arrays-basics', 'loops-and-indexes'],
    related: ['i100-031', 'i100-096'],
    content: {
      statement: [
        'A mechanical counter shows a number as a row of digit wheels, most significant first. Pressing the button adds one, rolling 9s over to 0 and carrying to the next wheel; a new wheel is added if every wheel rolls over.',
        'Given the digits, return the digits after adding one.',
      ],
      inputFormat: 'digits: a non-empty array of digits 0–9, most significant first, with no leading zeros (except the number 0 itself).',
      outputFormat: 'An array of digits.',
      constraints: ['1 ≤ digits.length ≤ 100'],
      rules: ['Carry like on paper: 9 + 1 rolls over to 0.', 'All 9s gain a new leading 1.', 'Don’t change digits; return a new array.'],
      entry: 'incrementCounter',
      params: [{ name: 'digits', kind: 'auto' }],
      examples: [
        { inputs: { digits: [2, 4, 9] }, output: [2, 5, 0], note: '249 + 1 = 250.' },
        { inputs: { digits: [9, 9] }, output: [1, 0, 0], note: 'A new wheel.' },
      ],
      tests: [
        { inputs: { digits: [0] }, output: [1], note: 'Zero' },
        { inputs: { digits: [5] }, output: [6], note: 'No carry' },
        { inputs: { digits: [1, 0, 9, 9] }, output: [1, 1, 0, 0], note: 'Two carries' },
        { inputs: { digits: [7, 0, 0] }, output: [7, 0, 1], note: 'Only the last digit changes' },
      ],
      starter: {
        javascript: `function incrementCounter(digits) {
  // Return the digits of the number plus one.
  return digits;
}
`,
      },
      hints: [
        'Start from the last digit, as on paper.',
        'A digit below 9 just goes up by one, and you are done.',
        'A 9 becomes 0 and the carry moves left. If it falls off the front, add a 1 there.',
      ],
      solution: {
        explanation: [
          'out is a copy. Walking from the last digit, a digit below 9 is increased and the result is complete. A 9 rolls over to 0 and the carry moves left.',
          'If every digit was 9, they are all 0 now and a 1 goes in front.',
        ],
        code: `function incrementCounter(digits) {
  const out = [...digits];
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] < 9) {
      out[i]++;
      return out;
    }
    out[i] = 0;
  }
  return [1, ...out];
}
`,
        complexity: { time: 'O(n)', space: 'O(n)', assumptions: 'n is digits.length; the copy is the output.' },
      },
      visualization: {
        spec: 'The digits are drawn as cells with i moving left while the carry continues; each rolled-over 9 is marked.',
        renderers: ['array-cells'],
      },
    },
  },

  'i100-098': {
    prerequisites: ['matrices', 'loops-and-indexes'],
    related: ['i100-099', 'i100-009'],
    content: {
      statement: [
        'A seed-planting robot moves over a grid of plots in a clockwise spiral: along the top row, down the right column, back along the bottom row, up the left column, and inwards again.',
        'Given matrix, return its values in the order the robot visits them.',
      ],
      inputFormat: 'matrix: a non-empty grid of integers (every row the same length).',
      outputFormat: 'An array of every value in spiral order.',
      constraints: ['1 ≤ rows, columns ≤ 10'],
      rules: ['Every cell is visited exactly once.', 'Start at the top-left cell, moving right.'],
      entry: 'spiralReadout',
      params: [{ name: 'matrix', kind: 'auto' }],
      examples: [
        {
          inputs: {
            matrix: [
              [1, 2],
              [3, 4],
              [5, 6],
            ],
          },
          output: [1, 2, 4, 6, 5, 3],
          note: 'Right, down, left, up.',
        },
        {
          inputs: {
            matrix: [
              [2, 4, 6],
              [8, 10, 12],
            ],
          },
          output: [2, 4, 6, 12, 10, 8],
          note: 'A wide grid.',
        },
      ],
      tests: [
        { inputs: { matrix: [[7, 8, 9]] }, output: [7, 8, 9], note: 'One row' },
        { inputs: { matrix: [[1], [2], [3]] }, output: [1, 2, 3], note: 'One column' },
        { inputs: { matrix: [[5]] }, output: [5], note: 'One cell' },
        {
          inputs: {
            matrix: [
              [1, 2, 3, 4],
              [12, 13, 14, 5],
              [11, 16, 15, 6],
              [10, 9, 8, 7],
            ],
          },
          output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          note: 'A grid whose spiral reads 1 to 16',
        },
      ],
      starter: {
        javascript: `function spiralReadout(matrix) {
  // Return the values in clockwise spiral order.
  return [];
}
`,
      },
      hints: [
        'Keep four boundaries: top, bottom, left and right.',
        'Read the top row from left to right, then move top down; read the right column, then move right in; and so on.',
        'Check the boundaries before reading the bottom row and the left column: in a thin grid they may already have been read.',
      ],
      solution: {
        explanation: [
          'top, bottom, left and right mark the ring that hasn’t been read yet. Each loop reads the ring’s top row, right column, bottom row (backwards) and left column (upwards), moving each boundary inwards after its side is read.',
          'The bottom row and left column are read only if the ring still has them; otherwise a single remaining row or column would be read twice.',
        ],
        code: `function spiralReadout(matrix) {
  const out = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}
`,
        complexity: { time: 'O(r · c)', space: 'O(1)', assumptions: 'r and c are the grid’s rows and columns, not counting the output.' },
      },
      visualization: {
        spec: 'The matrix is drawn as a grid with the boundaries closing in; out grows by one value per cell visited.',
        renderers: ['grid', 'array-cells'],
      },
    },
  },

  'i100-099': {
    prerequisites: ['matrices'],
    related: ['i100-098', 'i100-009'],
    content: {
      statement: [
        'A greenhouse tracks its plant beds on a grid. A 0 marks a sick plant, and an infection spreads along its whole row and its whole column, so all of those beds must be cleared (set to 0).',
        'Given grid, set the entire row and column of every original 0 to 0, in place and with O(1) extra memory, and return grid.',
      ],
      inputFormat: 'grid: a non-empty grid of integers.',
      outputFormat: 'The grid after clearing.',
      constraints: ['1 ≤ rows, columns ≤ 200'],
      rules: [
        'Only the original zeros spread: zeros created while clearing don’t spread further.',
        'Change grid in place and return it.',
        'Use O(1) extra memory: no list of rows and columns to clear.',
      ],
      entry: 'zeroSpread',
      params: [{ name: 'grid', kind: 'auto' }],
      examples: [
        {
          inputs: {
            grid: [
              [5, 0, 7],
              [2, 3, 4],
              [6, 8, 9],
            ],
          },
          output: [
            [0, 0, 0],
            [2, 0, 4],
            [6, 0, 9],
          ],
          note: 'Row 0 and column 1.',
        },
        {
          inputs: {
            grid: [
              [4, 5],
              [6, 0],
              [7, 8],
            ],
          },
          output: [
            [4, 0],
            [0, 0],
            [7, 0],
          ],
          note: 'Row 1 and column 1.',
        },
      ],
      tests: [
        { inputs: { grid: [[3]] }, output: [[3]], note: 'No zeros' },
        { inputs: { grid: [[0]] }, output: [[0]], note: 'Just a zero' },
        {
          inputs: {
            grid: [
              [0, 1],
              [1, 1],
            ],
          },
          output: [
            [0, 0],
            [0, 1],
          ],
          note: 'A zero in the corner',
        },
        {
          inputs: {
            grid: [
              [1, 2, 3],
              [4, 5, 6],
            ],
          },
          output: [
            [1, 2, 3],
            [4, 5, 6],
          ],
          note: 'Nothing to clear',
        },
        {
          inputs: {
            grid: [
              [1, 1, 0],
              [1, 1, 1],
              [0, 1, 1],
            ],
          },
          output: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ],
          note: 'Two zeros on the edges',
        },
      ],
      starter: {
        javascript: `function zeroSpread(grid) {
  // Clear the row and column of every original 0, in place, and return grid.
  return grid;
}
`,
      },
      hints: [
        'You need to remember which rows and columns to clear, but you may not use extra lists.',
        'Use the grid’s own first row and first column as those lists: mark row r by setting grid[r][0] to 0, column c by grid[0][c].',
        'The first row and column hold marks now, so first remember (in two flags) whether they themselves had a 0.',
      ],
      solution: {
        explanation: [
          'Two flags record whether the first row and the first column contain a 0. Then every 0 in the rest of the grid marks its row in column 0 and its column in row 0.',
          'A second pass clears every cell (outside the first row and column) whose row or column is marked. Last, the first row and column are cleared if their flags say so; doing them last keeps the marks intact while they are needed.',
        ],
        code: `function zeroSpread(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let firstRowZero = false;
  let firstColZero = false;
  for (let c = 0; c < cols; c++) if (grid[0][c] === 0) firstRowZero = true;
  for (let r = 0; r < rows; r++) if (grid[r][0] === 0) firstColZero = true;
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (grid[r][c] === 0) {
        grid[r][0] = 0;
        grid[0][c] = 0;
      }
    }
  }
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (grid[r][0] === 0 || grid[0][c] === 0) grid[r][c] = 0;
    }
  }
  if (firstRowZero) for (let c = 0; c < cols; c++) grid[0][c] = 0;
  if (firstColZero) for (let r = 0; r < rows; r++) grid[r][0] = 0;
  return grid;
}
`,
        complexity: { time: 'O(r · c)', space: 'O(1)', assumptions: 'r and c are the grid’s rows and columns.' },
      },
      visualization: {
        spec: 'The grid is drawn with r and c marking the cell being read; marks appear in the first row and column, then whole rows and columns turn 0.',
        renderers: ['grid'],
      },
    },
  },

  'i100-100': {
    prerequisites: ['hash-maps', 'matrices'],
    related: ['i100-099', 'i100-008'],
    content: {
      statement: [
        'An astronomer plots stars on a grid and looks for the straightest constellation: the most stars lying on one straight line.',
        'Given the distinct points, return the largest number of them on a single straight line.',
      ],
      inputFormat: 'points: an array of distinct [x, y] integer pairs.',
      outputFormat: 'An integer.',
      constraints: ['0 ≤ points.length ≤ 300', '-10^4 ≤ x, y ≤ 10^4', 'All points are different.'],
      rules: [
        'Any two points are on a line; fewer than three points: return their number.',
        'Lines can be vertical, horizontal or slanted.',
      ],
      entry: 'pointsInRow',
      params: [{ name: 'points', kind: 'auto' }],
      examples: [
        {
          inputs: {
            points: [
              [0, 0],
              [1, 2],
              [2, 4],
              [3, 1],
              [5, 0],
            ],
          },
          output: 3,
          note: '(0, 0), (1, 2) and (2, 4).',
        },
        {
          inputs: {
            points: [
              [0, 0],
              [0, 5],
              [0, -2],
              [1, 1],
            ],
          },
          output: 3,
          note: 'A vertical line.',
        },
      ],
      tests: [
        { inputs: { points: [] }, output: 0, note: 'No points' },
        { inputs: { points: [[4, 4]] }, output: 1, note: 'One point' },
        {
          inputs: {
            points: [
              [1, 1],
              [2, 3],
            ],
          },
          output: 2,
          note: 'Two points',
        },
        {
          inputs: {
            points: [
              [1, 0],
              [2, -1],
              [3, -2],
              [0, 1],
              [5, 5],
              [6, 6],
            ],
          },
          output: 4,
          note: 'A falling line',
        },
        {
          inputs: {
            points: [
              [2, 3],
              [4, 6],
              [6, 9],
              [8, 12],
              [1, 1],
            ],
          },
          output: 4,
          note: 'A slope of 3/2',
        },
      ],
      starter: {
        javascript: `function pointsInRow(points) {
  // Return the most points on one straight line.
  return 0;
}
`,
      },
      hints: [
        'Fix one point. Every other point on a line through it has the same direction (slope) from it.',
        'Represent a direction exactly as a reduced fraction dy/dx (divide by the gcd and fix the sign), not as a floating-point number.',
        'Count directions in a map for each fixed point; the most common direction plus the point itself is a line.',
      ],
      solution: {
        explanation: [
          'For each point i, every later point j gives a direction (dx, dy), reduced by their greatest common divisor and given a fixed sign so opposite directions match. Points with the same direction from i lie on one line through i.',
          'slopes counts each direction for this i; the count plus 1 (point i itself) is a line. Exact fractions avoid floating-point rounding, and vertical lines get dx = 0 like any other direction.',
        ],
        code: `function pointsInRow(points) {
  if (points.length <= 2) return points.length;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let best = 1;
  for (let i = 0; i < points.length; i++) {
    const slopes = new Map();
    for (let j = i + 1; j < points.length; j++) {
      let dx = points[j][0] - points[i][0];
      let dy = points[j][1] - points[i][1];
      const g = gcd(Math.abs(dx), Math.abs(dy));
      dx /= g;
      dy /= g;
      if (dx < 0 || (dx === 0 && dy < 0)) {
        dx = -dx;
        dy = -dy;
      }
      const key = dx + '/' + dy;
      slopes.set(key, (slopes.get(key) ?? 0) + 1);
      best = Math.max(best, slopes.get(key) + 1);
    }
  }
  return best;
}
`,
        complexity: {
          time: 'O(n² log C)',
          space: 'O(n)',
          assumptions:
            'n is points.length and C the largest coordinate difference (for the gcd); map operations take O(1) time on average.',
        },
      },
      visualization: {
        spec: 'The points are drawn as rows of [x, y] with i and j marked; slopes is a map of reduced directions and their counts.',
        renderers: ['grid', 'hash-map', 'call-stack'],
      },
    },
  },
};
