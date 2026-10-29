// Python versions of the exercise answers: one file per exercise in ./python, named by its id
// (f75-01.py). Each follows its JavaScript reference step for step with the same names, so the
// explanation and the drawing read the same in both languages; where an explanation names
// JavaScript code, PYTHON_EXPLANATIONS has the Python wording, and PYTHON_HINTS does the same for
// hints. python.test.ts runs every answer on real CPython.
import type { LanguageId } from '../languages';
import type { Exercise } from './schema';

const FILES = import.meta.glob<string>('./python/*.py', { query: '?raw', import: 'default', eager: true });

/** Exercise id → Python answer. */
export const PYTHON_ANSWERS: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, code]) => [path.slice(path.lastIndexOf('/') + 1, -'.py'.length), code]),
);

/** The whole explanation, for answers whose JavaScript explanation names JavaScript code. */
export const PYTHON_EXPLANATIONS: Record<string, string[]> = {
  'f75-11': [
    'windowSum starts as the total of the first k readings, and best as that total.',
    'Each step moves the stretch to end at right and start at left = right − k + 1: it adds readings[right] and subtracts readings[left − 1], the hour that left the stretch. best keeps the largest total.',
  ],
  'f75-13': [
    'right adds one shipment at a time to total. Whenever total reaches target, the run left..right qualifies; its length is a candidate, and shipments leave from the left while the total stays at least target.',
    'Each index enters and leaves the run at most once, so the work is linear. best still at math.inf means no run qualified, which is reported as 0.',
  ],
  'f75-16': [
    'curr starts at head. While it points at a node, its value is recorded and curr moves to curr.next.',
    'When curr becomes None the chain has ended, and the recorded values are in chain order.',
  ],
  'f75-17': [
    'Three references do the work: prev (the reversed part so far), curr (the node being turned around) and nxt (the rest of the original list).',
    'Each step saves nxt, turns curr to point back at prev, then advances. No node is created; only next fields change.',
  ],
  'f75-18': [
    'slow and fast both start at head. Each round slow moves one node and fast two, so fast has always covered twice the distance.',
    'The loop stops when fast is None or on the last node; slow is then halfway, which for an even length is the second middle node.',
  ],
  'f75-25': [
    'dq holds indexes, and their readings strictly decrease from front to back. When reading i arrives, indexes at the back with a reading ≤ readings[i] are popped: reading i is at least as high and stays in every later stretch longer, so they can never be a peak again.',
    'After appending i, the front index is the highest reading among the indexes kept. If it has fallen out of the stretch that ends at i (it is ≤ i - k), popleft removes it. From i = k - 1 on, readings[dq[0]] is the peak of the stretch ending at i.',
  ],
  'f75-31': [
    'visit(node, depth) counts the node, counts it as a leaf when it has no children, and returns the deepest depth reached in its subtree (its own depth, or deeper through a child). None returns 0.',
    'Calling it on the root at depth 1 gives the tree’s depth, and the counters (nonlocal in visit) hold the node and leaf counts.',
  ],
  'f75-33': [
    'node starts at the root. Equal means found; a smaller target can only be in the left subtree and a larger one only in the right, so the other subtree is skipped entirely.',
    'Falling off the tree (None) means target would have to be in an empty spot: it is not there.',
  ],
  'f75-37': [
    'decide(i, picked) makes the choices for items[i] onward, with picked holding what was taken so far. At the end of items, picked is one complete selection: a copy goes into out (a copy, because picked keeps changing).',
    'For items[i] it first takes it (append), explores everything after, then undoes that choice (pop) and explores everything after again without it. Taking first gives the required order. The calls form a decision tree with a left branch for “take” and a right branch for “leave”, and its 2^n leaves are the selections.',
  ],
  'f75-38': [
    'place(arrangement) fills the next spot. When arrangement holds every token it is complete, and a copy goes into out.',
    'Otherwise it tries each token in tokens order that used doesn’t mark: mark it, append it, fill the remaining spots, then pop and unmark it. That undo is the backtracking step: the next token is tried on exactly the shelf the previous one found.',
  ],
  'f75-40': [
    'board marks cracked cells with x. place(placed) has towers in rows 0 to len(placed) − 1; when every row has one, a copy of placed is a placement. Otherwise row r = len(placed) tries columns 0 to n − 1 in order.',
    'The sets cols, downs and ups hold the columns and the two kinds of diagonals (r + c and r − c) that placed towers threaten, so checking a cell takes three lookups. A free cell gets a tower: it is added to the sets, to placed and to board, the rows below are filled, and then everything is removed again: the undo that lets the next column be tried. Threatened and cracked cells are never explored, which prunes the search.',
  ],
  'f75-50': [
    'dist holds the cheapest known cost to each town, math.inf until reached. The heap holds [cost, town] candidates; the cheapest one can’t be improved later, because every other path costs at least as much and tolls are never negative.',
    'Popping it relaxes each road: a cheaper cost to the neighbour updates dist and pushes a new entry. An entry whose cost is above dist[town] is out of date and skipped. Unreached towns are reported as -1.',
  ],
  'f75-55': [
    'parent is union-find over profile numbers. owner remembers the first profile for each email; seeing that email again unions the two profiles, always hanging the larger root under the smaller, so each group’s root is its earliest profile.',
    'groups then collects every email under its root in a set (removing repeats). Roots appear in increasing order, so the people come out in the order of their earliest profile, each with that profile’s name and sorted emails.',
  ],
  'f75-58': [
    'best[t] is the fewest tokens that make exactly t, math.inf while no way is known; best[0] = 0.',
    'The last token used for t is some face value d, leaving t − d, which was solved earlier. So best[t] is the smallest best[t − d] + 1 over all d ≤ t. math.inf at target means it can’t be made.',
  ],
  'f75-61': [
    'ordered is a copy sorted by start. Walking it, every new interval either overlaps the last combined interval (its start is at most that interval’s end) or begins after it.',
    'Overlaps extend the last end to the larger of the two ends; anything else starts a new combined interval. Because starts only grow, earlier combined intervals can never be touched again.',
  ],
  'f75-66': [
    'Each TrieNode holds children, one branch per letter, and end, which is True where an added word stops. The path from the root spells a prefix.',
    'Adding walks the word letter by letter, creating missing branches, and marks the last node. A query walks the same way and stops at the first missing branch: "starts" asks whether the walk finished, "has" also needs the end mark on the last node.',
  ],
  'f75-67': [
    'Each contact is inserted letter by letter; the node where it ends is marked end. After each typed letter, node moves to that letter’s child, or to None once a letter is missing.',
    'collect walks below node depth first, checking a node before its children and taking children in alphabetical order, which visits words in dictionary order. It stops once three are found.',
  ],
  'f75-72': [
    'acc ^ badge flips the bits of acc where badge has a 1. Flipping the same bits twice puts them back, so a ^ a = 0, and XOR can be applied in any order.',
    'XOR-ing every badge into acc, starting from 0, cancels each pair whatever their positions, which leaves exactly the bits of the lone id. Negative ids work too: Python’s ^ works on two’s complement bits, with as many leading 1 bits as a negative number needs.',
  ],
  'f75-75': [
    'index maps each key to its Entry. The entries form a doubly linked list between two placeholders, head and tail, with the most recently used right after head.',
    'A get or an update unlinks the entry and puts it back at the front. A new key in a full cache first removes tail.prev, the least recent entry, from both the list and the dict. Every step changes a fixed number of links, so each operation is O(1).',
  ],
};

/** The whole hint list, for exercises whose hints name JavaScript code (Map, null, Math.floor, ===). */
export const PYTHON_HINTS: Record<string, string[]> = {
  'f75-02': [
    'As you walk through the log, you need to remember which badges you have already seen.',
    'A set answers "have I seen this before?" quickly with the in operator.',
    'Check before you add: if the badge is already in the set, you found a repeat.',
  ],
  'f75-03': [
    'Keep a running count for each code: a dict from code to count.',
    'A code that is not in counts yet has no entry: check code in counts (or use counts.get(code, 0)) and treat it as 0.',
    'Remember the order codes first appear in a separate list, then build the pairs from it at the end.',
  ],
  'f75-04': [
    'For a package of weight w, its partner must weigh target - w.',
    'Walk left to right and keep a dict from weight to the first index where you saw it.',
    'Check the dict before adding the current package, so it never pairs with itself, and only store a weight the first time you see it (that gives the smallest i).',
  ],
  'f75-06': [
    'Put one index at the start and one at the end, and move them toward each other.',
    'Skip characters that do not count. Compare the two counted characters after lowercasing them.',
    'Stop when the indexes meet or cross; any mismatch before that means False.',
  ],
  'f75-12': [
    'Keep a window signal[left..right] with no repeats, growing it one character at a time.',
    'When signal[right] already appears inside the window, the window must start after that earlier copy.',
    'A dict from character to the last index it was seen at tells you where that copy is in O(1).',
  ],
  'f75-13': [
    'Keep a run quantities[left..right] and its total.',
    'Extend the run with each new shipment. As long as the total is at least target, the run qualifies: record its length, then drop quantities[left] to try a shorter one.',
    'Start best at math.inf so any qualifying run beats it, and return 0 if it never changed.',
  ],
  'f75-15': [
    'Let running be the total of all values so far. A stretch ending here sums to target exactly when an earlier running total was running − target.',
    'Count how many times each running total has appeared in a dict.',
    'Start the dict with 0 seen once ({0: 1}): that stands for “before any value”, so stretches starting at day 0 are counted.',
  ],
  'f75-16': [
    'Keep a variable that points at the card you are on, starting with head.',
    'Record curr.val, then move with curr = curr.next.',
    'Stop when curr is None: that is past the last card.',
  ],
  'f75-17': [
    'Walk the list with a reference curr, keeping prev: the node just behind it (None at first).',
    'Before changing curr.next, save the rest of the list in another variable, or you lose it.',
    'Point curr.next at prev, then move prev and curr one step forward. When curr is None, prev is the new head.',
  ],
  'f75-19': [
    'Walking the belt and remembering every tray in a set finds the first repeat, at O(n) extra space.',
    'Move slow by one tray and fast by two. If the belt loops, fast catches up with slow inside the loop; if it ends, fast reaches None.',
    'From the meeting point, the loop’s start is exactly as far as it is from head. Walk one pointer from head and one from the meeting point, one step each, counting steps until they meet.',
  ],
  'f75-26': [
    'Compare target with the reading in the middle: the result tells you which half cannot contain target.',
    'Keep a window low..high of indexes that could still hold target, with mid = (low + high) // 2.',
    'Move low to mid + 1 or high to mid - 1; stop when low > high, which means target is not there.',
  ],
  'f75-31': [
    'One depth-first visit can collect all three facts.',
    'Pass the depth down: the root is at depth 1, its children at depth 2.',
    'A node is a leaf when both node.left and node.right are None. The depth is the largest depth any node reaches.',
  ],
  'f75-33': [
    'Compare target with the current node’s value.',
    'Smaller: target can only be in the left subtree. Larger: only in the right.',
    'Reaching None means the place target would be is empty.',
  ],
  'f75-36': [
    'Think about the last move: it lands on step n from step n - 1 or from step n - 2.',
    'So routes(n) = routes(n - 1) + routes(n - 2), with routes(0) = 1 and routes(1) = 1.',
    'Plain recursion solves the same smaller staircases again and again. Store each answer the first time (in a dict) and reuse it.',
  ],
  'f75-41': [
    'In a min-heap every slot is at most its children, so the most urgent ticket is always heap[0]. The parent of slot i is (i - 1) // 2.',
    'To add: append the ticket at the end, then swap it with its parent while it is smaller than the parent.',
    'To take the top: record heap[0], move the last ticket into slot 0 (pop it off the end first), then swap it with its smaller child while that child is smaller than it.',
  ],
  'f75-50': [
    'Start with dist[source] = 0 and every other town at math.inf.',
    'Keep [cost, town] entries in a min-heap. The cheapest entry popped is final for its town, because tolls are never negative.',
    'For each road from that town, if going through it is cheaper than dist[neighbour], update dist and push the new entry. Skip popped entries that are out of date.',
  ],
  'f75-55': [
    'Treat profiles as vertices and a shared email as a connection between them.',
    'Keep a dict from each email to the first profile that listed it. When a later profile lists it too, union the two profiles.',
    'Union so the smaller profile number becomes the root: then a group’s root is its earliest profile, which gives both the name and the output order.',
  ],
  'f75-58': [
    'Taking the biggest token first can be wrong: try 11 with 9, 6, 5, 1.',
    'Let best[t] be the fewest tokens for total t; best[0] = 0.',
    'For each total t and each face value d ≤ t, best[t] can be best[t − d] + 1. Totals that stay math.inf can’t be made.',
  ],
  'f75-59': [
    'Solve it for every pair of prefixes: the first i letters of a and the first j letters of b.',
    'If a[i − 1] == b[j − 1], that letter can end the shared subsequence: table[i − 1][j − 1] + 1.',
    'Otherwise drop the last letter of one string: max(table[i − 1][j], table[i][j − 1]).',
  ],
  'f75-66': [
    'Store words as paths of letters from a shared root: words with the same beginning share the same first branches.',
    'Each node is a TrieNode with children = {} and end = False. To add, follow (or create) node.children[ch] for every letter, then set end = True on the last node.',
    'To answer, follow the letters. If a branch is missing, the answer is False. Otherwise "starts" is True, and "has" is True only if the last node’s end is True.',
  ],
  'f75-71': [
    'flags & 1 is the lowest bit; flags >> 1 shifts every bit one place right, so the next bit becomes the lowest.',
    'That takes one round per bit position. A faster trick: x & (x − 1) is x with its lowest 1 bit cleared.',
    'Clear the lowest 1 bit until nothing is left, counting the rounds.',
  ],
  'f75-75': [
    'A dict finds a key’s entry in O(1). You also need, in O(1), the least recently used key and a way to mark a key as just used.',
    'Keep entries in a doubly linked list ordered by recency, with placeholder nodes at both ends so there are no edge cases.',
    'Using a key unlinks its entry and re-inserts it at the front. Evicting takes the entry just before the back placeholder and deletes its key from the dict.',
  ],
  'i100-007': [
    'First count how often each item was ordered.',
    'Then you need the items with the largest counts. Sorting every item by count works in O(n log n).',
    'For O(n): an item’s count is at most len(orders), so put each item in a bucket for its count and read the buckets from the largest count down.',
  ],
  'i100-016': [
    'Only runs of exactly len(fragment) characters can match.',
    'Slide a window of that length along text: each step adds one character on the right and drops one on the left.',
    'Keep counts of the letters the window still lacks. When nothing is missing, the window is a shuffle of fragment.',
  ],
  'i100-018': [
    'A chain has a fixed length: len(words) × the word length. Checking every start that way works, but repeats a lot of work.',
    'A chain is made of whole words, so read text in word-sized steps. Do that once for each starting offset from 0 to the word length − 1.',
    'Within one offset, keep a window of word counts like a sliding window: add the next word, drop words from the left while some word appears too often, and record the start when the window holds every word.',
  ],
  'i100-078': [
    'A prefix of text uses some first letters of a and some first letters of b.',
    'Let can[i][j] say whether the first i letters of a and the first j of b weave into the first i + j letters of text.',
    'can[i][j] is True if the last letter came from a (can[i − 1][j] and a’s letter matches) or from b (can[i][j − 1] and b’s letter matches).',
  ],
};

/** An exercise's hints in the words of `language`. */
export function hintsIn(e: Exercise, language: LanguageId): string[] {
  const hints = e.content?.hints ?? [];
  return (language === 'python' && PYTHON_HINTS[e.id]) || hints;
}

export interface Answer {
  code: string;
  language: LanguageId;
  explanation: string[];
}

/** An exercise's authored answer in `language`, or the JavaScript one when that language has none. */
export function answerIn(e: Exercise, language: LanguageId): Answer | undefined {
  const s = e.content?.solution;
  if (!s) return undefined;
  const python = language === 'python' ? PYTHON_ANSWERS[e.id] : undefined;
  if (python) return { code: python, language: 'python', explanation: PYTHON_EXPLANATIONS[e.id] ?? s.explanation };
  return { code: s.code, language: 'javascript', explanation: s.explanation };
}
