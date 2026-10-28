// Python versions of the exercise answers: one file per exercise in ./python, named by its id
// (f75-01.py). Each follows its JavaScript reference step for step with the same names, so the
// explanation and the drawing read the same in both languages; where an explanation names
// JavaScript code, PYTHON_EXPLANATIONS has the Python wording. python.test.ts runs every
// answer on real CPython.
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
