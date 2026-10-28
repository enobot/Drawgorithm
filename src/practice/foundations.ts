// Drawgorithm Foundations 75: an original practice collection for Drawgorithms.
// Every exercise is written for this app. It is not an official collection of any
// platform and makes no claim about which questions interviews use most.
// Exercises start "planned" (brief only) and become "available" only when their
// authored content, tests and visualization support exist and are verified.
import type { Difficulty, Exercise, Renderer, TopicId } from './schema';
import { AUTHORED } from './exercises';

export const COLLECTION_TITLE = 'Drawgorithm Foundations 75';

export const TOPICS: { id: TopicId; title: string }[] = [
  { id: 'arrays-hashing', title: 'Arrays and hashing' },
  { id: 'two-pointers', title: 'Two pointers and strings' },
  { id: 'sliding-window', title: 'Sliding windows and prefix sums' },
  { id: 'linked-lists', title: 'Linked lists' },
  { id: 'stacks-queues', title: 'Stacks, queues and deques' },
  { id: 'binary-search', title: 'Binary search and sorting' },
  { id: 'trees', title: 'Binary trees and binary search trees' },
  { id: 'recursion', title: 'Recursion and backtracking' },
  { id: 'heaps', title: 'Heaps and priority queues' },
  { id: 'graphs', title: 'Graphs, BFS and DFS' },
  { id: 'union-find', title: 'Union-find and connectivity' },
  { id: 'dp', title: 'Dynamic programming' },
  { id: 'greedy', title: 'Greedy algorithms and intervals' },
  { id: 'tries', title: 'Tries and string indexing' },
  { id: 'bits-matrices', title: 'Bits, matrices and combined patterns' },
];

/** Lessons exercises point to as prerequisites. None of them is written yet (the Learn area is planned). */
export const LESSONS: Record<string, string> = {
  'arrays-basics': 'Arrays: slots, indexes and length',
  'loops-and-indexes': 'Walking an array with a loop',
  'hash-sets': 'Sets: remembering what you have seen',
  'hash-maps': 'Maps: looking things up by key',
  'strings-and-chars': 'Strings and single characters',
  'two-pointers': 'Two pointers moving through one sequence',
  'sliding-window': 'Sliding windows',
  'prefix-sums': 'Prefix sums',
  'linked-list-basics': 'Linked lists: nodes and next references',
  stacks: 'Stacks: last in, first out',
  queues: 'Queues: first in, first out',
  'binary-search-idea': 'Binary search: halving what is left',
  sorting: 'Sorting by hand',
  'trees-basics': 'Binary trees: nodes, children and depth',
  'tree-traversal-bfs': 'Visiting a tree level by level',
  'tree-traversal-dfs': 'Visiting a tree depth first',
  'recursion-basics': 'Recursion: a smaller copy of the same task',
  memoization: 'Remembering answers you already computed',
  backtracking: 'Backtracking: try, undo, try again',
  heaps: 'Heaps: always knowing the smallest',
  'graphs-basics': 'Graphs: vertices, edges and neighbors',
  'union-find': 'Union-find: merging groups',
  'dp-basics': 'Dynamic programming: building answers from smaller ones',
  greedy: 'Greedy choices and why they work',
  tries: 'Tries: a tree of prefixes',
  bits: 'Bits and binary numbers',
  matrices: 'Grids and matrices',
};

/** Prerequisites for planned exercises, by topic (authored exercises list their own). */
const TOPIC_LESSONS: Record<TopicId, string[]> = {
  'arrays-hashing': ['arrays-basics', 'hash-maps'],
  'two-pointers': ['arrays-basics', 'two-pointers'],
  'sliding-window': ['arrays-basics', 'sliding-window', 'prefix-sums'],
  'linked-lists': ['linked-list-basics'],
  'stacks-queues': ['stacks', 'queues'],
  'binary-search': ['binary-search-idea', 'sorting'],
  trees: ['trees-basics', 'tree-traversal-dfs'],
  recursion: ['recursion-basics', 'backtracking'],
  heaps: ['heaps'],
  graphs: ['graphs-basics', 'queues'],
  'union-find': ['union-find', 'graphs-basics'],
  dp: ['recursion-basics', 'memoization', 'dp-basics'],
  greedy: ['sorting', 'greedy'],
  tries: ['tries', 'strings-and-chars'],
  'bits-matrices': ['bits', 'matrices'],
};

/**
 * Drawings the board can make today, technical or illustrated. An exercise may be
 * available only if every renderer it needs is in this list.
 */
export const SUPPORTED_RENDERERS: Renderer[] = [
  'array-cells',
  'array-shelves',
  'string-cells',
  'hash-set',
  'hash-map',
  'linked-list',
  'linked-list-ropes',
  'stack',
  'queue-line',
  'binary-tree',
  'call-stack',
  'grid',
  'heap-tree',
  'graph',
  'trie',
  'deque',
  'union-find',
];

type Brief = [number, string, TopicId, Difficulty, string, string];

// prettier-ignore
const BRIEFS: Brief[] = [
  [1, 'Shelf Lookup', 'arrays-hashing', 'Easy', 'Find the first position of a requested item identifier in an array.', 'Highlight each inspected cell and stop at the first match.'],
  [2, 'Repeated Visitor', 'arrays-hashing', 'Easy', 'Determine whether a sequence contains any repeated identifier.', 'Array traversal alongside a growing set.'],
  [3, 'Stockroom Counts', 'arrays-hashing', 'Easy', 'Count the occurrences of every item code.', 'Frequency-map entries updating as items are processed.'],
  [4, 'Balanced Shipment', 'arrays-hashing', 'Medium', 'Return two distinct package indices whose weights equal a target.', 'Current weight, required complement, and lookup map.'],
  [5, 'Products Without One', 'arrays-hashing', 'Medium', 'For each position, compute the product of all other values without division.', 'Prefix products, suffix products, and combined output.'],
  [6, 'Mirror Message', 'two-pointers', 'Easy', 'Check whether a string is a palindrome under explicitly defined character rules.', 'Pointers moving inward and comparing characters.'],
  [7, 'Merge Delivery Logs', 'two-pointers', 'Easy', 'Merge two sorted timestamp arrays into one sorted result.', 'A pointer in each source and an output row.'],
  [8, 'Compact Sorted Readings', 'two-pointers', 'Easy', 'Remove duplicates in place from a sorted array and return the valid length.', 'Read/write pointers and the retained prefix.'],
  [9, 'Closest Weight Pair', 'two-pointers', 'Medium', 'In a sorted array, find two distinct positions whose sum is closest to a target.', 'Endpoint pointers, candidate sums, and best-so-far pair.'],
  [10, 'Catch the Rain', 'two-pointers', 'Hard', 'Calculate trapped water between nonnegative column heights.', 'Columns, boundary information, and accumulated water.'],
  [11, 'Best Observation Window', 'sliding-window', 'Easy', 'Find the largest sum of any contiguous window of a given valid size.', 'Window movement and outgoing/incoming contributions.'],
  [12, 'Quiet Frequency Band', 'sliding-window', 'Medium', 'Find the longest substring containing no repeated characters.', 'Expanding/shrinking window and membership state.'],
  [13, 'Smallest Supply Stretch', 'sliding-window', 'Medium', 'For positive quantities, find the shortest contiguous range reaching a target sum.', 'Moving boundaries and running total.'],
  [14, 'Range Ledger', 'sliding-window', 'Easy', 'Preprocess an array to answer inclusive range-sum queries.', 'Prefix totals and subtraction at query boundaries.'],
  [15, 'Exact Total Stretches', 'sliding-window', 'Medium', 'Count contiguous subarrays summing to a target, allowing negative values.', 'Running prefix sum and counts of previously seen sums.'],
  [16, 'Follow the Chain', 'linked-lists', 'Easy', "Return the values encountered from a singly linked list's head.", 'Current pointer following next links.'],
  [17, 'Turn the Chain', 'linked-lists', 'Easy', 'Reverse a singly linked list in place.', 'Previous/current/next pointers and rewired arrows.'],
  [18, 'Center Marker', 'linked-lists', 'Easy', "Find a linked list's middle node under a stated even-length policy.", 'Slow and fast pointers.'],
  [19, 'Looping Conveyor', 'linked-lists', 'Medium', 'Determine whether a linked list contains a cycle and locate its entry.', 'Pointer encounters and cycle-entry search.'],
  [20, 'Weave Two Chains', 'linked-lists', 'Easy', 'Merge two sorted linked lists by reusing their nodes.', 'Source heads, output tail, and changing connections.'],
  [21, 'Nested Symbols', 'stacks-queues', 'Easy', 'Validate properly nested bracket pairs.', 'Stack pushes and matching pops.'],
  [22, 'Undo Notebook', 'stacks-queues', 'Easy', 'Process append and undo commands, with each undo reversing one append.', 'Document state and action history stack.'],
  [23, 'Asteroid Passage', 'stacks-queues', 'Medium', 'Resolve a line of signed-size asteroids moving left or right at equal speed.', 'Actual collisions alongside a survivor stack.'],
  [24, 'Warmer Reading Ahead', 'stacks-queues', 'Medium', 'For each temperature, find how many positions until a strictly warmer one.', 'Unresolved indices in a monotonic stack.'],
  [25, 'Window Peak Tracker', 'stacks-queues', 'Hard', 'Return the maximum in every fixed-length window.', 'Active window and candidate indices in a monotonic deque.'],
  [26, 'Find the Reading', 'binary-search', 'Easy', 'Search a sorted array for a target value.', 'Low/high/mid markers and eliminated intervals.'],
  [27, 'First and Last Slot', 'binary-search', 'Medium', 'Find the first and last positions of a target in a sorted array.', 'Separate boundary searches.'],
  [28, 'Rotated Archive', 'binary-search', 'Medium', 'Search a sorted array rotated at an unknown position, assuming distinct values.', 'Identify the ordered half and narrow the search.'],
  [29, 'Sort the Cards', 'binary-search', 'Easy', 'Implement insertion sort and show each insertion.', 'Sorted prefix, selected card, and shifting values.'],
  [30, 'Minimum Shipping Capacity', 'binary-search', 'Medium', 'Find the smallest capacity that ships positive-weight packages in order within a given number of days.', 'Binary search over capacity and a day-by-day feasibility simulation.'],
  [31, 'Tree Vocabulary Explorer', 'trees', 'Easy', 'Compute node count, leaf count, and maximum depth for a binary tree.', 'Labeled structure and accumulated measurements.'],
  [32, 'Find in an Unordered Tree', 'trees', 'Easy', 'Search a general binary tree for a value without assuming BST ordering.', 'Traversal order and visited nodes.'],
  [33, 'Find in an Ordered Tree', 'trees', 'Easy', 'Search a BST with distinct keys.', 'Comparisons and excluded subtrees.'],
  [34, 'Level by Level', 'trees', 'Medium', 'Return binary-tree values grouped by depth.', 'Frontier queue and current level.'],
  [35, 'Check the Ordering', 'trees', 'Medium', 'Determine whether a binary tree satisfies strict BST ordering.', 'Allowable bounds passed down each branch.'],
  [36, 'Staircase Routes', 'recursion', 'Easy', 'Count ways to climb n steps using moves of one or two.', 'Recursive calls, base cases, and repeated subproblems.'],
  [37, 'Pick a Subset', 'recursion', 'Medium', 'Generate every subset of an array of distinct values.', 'Include/exclude decision tree.'],
  [38, 'Arrange the Tokens', 'recursion', 'Medium', 'Generate all permutations of distinct tokens.', 'Current arrangement, available choices, and undo operations.'],
  [39, 'Word Trail', 'recursion', 'Medium', 'Find whether a word can be formed through orthogonally adjacent grid cells without reusing a cell within one path.', 'Selected path, rejected moves, and backtracking.'],
  [40, 'Nonattacking Towers', 'recursion', 'Hard', 'Place n queen-like pieces on an n×n board so none share a row, column, or diagonal; return all valid placements.', 'Threatened cells and backtracking choices.'],
  [41, 'Priority Desk', 'heaps', 'Easy', 'Process insert and remove-min operations on a min-heap.', 'Synchronized heap tree and array.'],
  [42, 'Largest K Readings', 'heaps', 'Medium', 'Return the k largest values from an unsorted array.', 'Bounded heap and discarded candidates.'],
  [43, 'Merge Sorted Streams', 'heaps', 'Hard', 'Merge multiple sorted sequences.', 'Stream heads competing in a min-heap.'],
  [44, 'Running Middle', 'heaps', 'Hard', 'Report the median after each value arrives.', 'Lower/upper heaps and rebalancing.'],
  [45, 'Next Available Worker', 'heaps', 'Medium', 'Assign ordered jobs to the earliest available worker, breaking ties by worker ID, given job durations and identical initial availability.', 'Worker timeline and availability heap.'],
  [46, 'Find a Route', 'graphs', 'Easy', 'Determine whether two vertices are connected in an undirected graph.', 'Visited set and exploration frontier.'],
  [47, 'Count Land Regions', 'graphs', 'Medium', 'Count orthogonally connected land regions in a binary grid.', 'Discovery and coloring of each component.'],
  [48, 'Fewest Hops', 'graphs', 'Medium', 'Find the shortest path in an unweighted graph.', 'BFS layers and predecessor links.'],
  [49, 'Prerequisite Planner', 'graphs', 'Medium', 'Return a valid task order or detect a cycle in directed dependencies.', 'Indegrees, ready queue, and removed edges.'],
  [50, 'Cheapest Route', 'graphs', 'Medium', 'Find shortest distances from a source in a graph with nonnegative weights.', 'Dijkstra frontier, tentative distances, and relaxations.'],
  [51, 'Growing Communities', 'union-find', 'Medium', 'Process connections between people and answer connectivity queries.', 'Components and union-find parent links.'],
  [52, 'Extra Connection', 'union-find', 'Medium', 'Identify the edge that first creates a cycle while processing an undirected edge sequence.', 'Component checks before each union.'],
  [53, 'Region Counter Online', 'union-find', 'Hard', 'Turn water cells into land one at a time and report the region count.', 'New cells and neighboring component merges.'],
  [54, 'Minimum Cable Network', 'union-find', 'Medium', 'Find the minimum total cost connecting every vertex of a connected, weighted, undirected graph.', 'Sorted edges and Kruskal component merges.'],
  [55, 'Shared-Address Profiles', 'union-find', 'Medium', 'Merge profiles connected by shared email addresses under explicit identity and output-ordering rules.', 'Profile groups and shared-address connections.'],
  [56, 'Cheapest Stairway', 'dp', 'Easy', 'Find the minimum cost to reach the top using one- or two-step moves, with starting and payment rules stated explicitly.', 'State costs and predecessor choices.'],
  [57, 'Nonadjacent Rewards', 'dp', 'Medium', 'Choose nonadjacent array positions to maximize total reward.', 'Take/skip transitions.'],
  [58, 'Fewest Tokens', 'dp', 'Medium', 'Find the minimum number of reusable positive denominations forming a target.', 'Reachable totals and candidate transitions.'],
  [59, 'Shared Subsequence', 'dp', 'Medium', 'Find the length of the longest common subsequence of two strings.', 'DP grid, character comparisons, and dependencies.'],
  [60, 'Edit a Message', 'dp', 'Hard', 'Find the minimum number of insertions, deletions, and substitutions needed to transform one string into another.', 'Edit-distance grid and one optimal reconstruction.'],
  [61, 'Combine Reservations', 'greedy', 'Medium', 'Merge overlapping time intervals under a specified endpoint policy.', 'Sorted intervals and expanding merged ranges.'],
  [62, 'Maximum Meetings', 'greedy', 'Medium', 'Select the largest number of nonoverlapping meetings for one room.', 'Finish-time ordering and accepted/rejected intervals.'],
  [63, 'Reach the Finish', 'greedy', 'Medium', 'Determine whether the last array position is reachable using bounded forward jumps from each position.', 'Expanding reachable frontier.'],
  [64, 'Minimum Launches', 'greedy', 'Medium', 'Find the minimum jumps needed to reach the last position, or report that it is unreachable.', 'Jump layers and farthest reachable boundary.'],
  [65, 'Fuel Circuit', 'greedy', 'Medium', 'Find a starting station that completes a circular trip, or report none, given fuel supplied and fuel required for each leg.', 'Tank balance and candidate-start resets.'],
  [66, 'Prefix Dictionary', 'tries', 'Medium', 'Implement word insertion, exact lookup, and prefix lookup.', 'Character branches and terminal-word markers.'],
  [67, 'Contact Suggestions', 'tries', 'Medium', 'Return up to three lexicographically smallest matching contacts after each typed prefix.', 'Prefix traversal and suggested words.'],
  [68, 'Wildcard Dictionary', 'tries', 'Medium', 'Support exact letters and a single-character wildcard in word queries.', 'Branching search through trie nodes.'],
  [69, 'Shortest Root Replacement', 'tries', 'Medium', 'Replace each sentence word with its shortest dictionary prefix when one exists.', 'Trie traversal and early terminal matches.'],
  [70, 'Board Dictionary Hunt', 'tries', 'Hard', 'Find dictionary words in a letter grid using orthogonal moves without reusing cells within a word.', 'Board path synchronized with trie traversal.'],
  [71, 'Bit Counter', 'bits-matrices', 'Easy', 'Count set bits in a nonnegative fixed-width integer.', 'Binary representation and cleared bits.'],
  [72, 'Lone Identifier', 'bits-matrices', 'Easy', 'Find the identifier appearing once when every other identifier appears twice.', 'Aligned XOR accumulation.'],
  [73, 'Turn the Image', 'bits-matrices', 'Medium', 'Rotate a square matrix 90 degrees clockwise in place.', 'Cells moving through rotation cycles.'],
  [74, 'Search a Sorted Grid', 'bits-matrices', 'Medium', 'Find a target in a matrix whose rows and columns are ascending.', 'Comparisons eliminating a row or column.'],
  [75, 'Recently Used Cache', 'bits-matrices', 'Hard', 'Implement a fixed-capacity LRU cache with average O(1) get and put.', 'Synchronized hash lookup and doubly linked recency list.'],
];

export const exerciseId = (n: number) => `f75-${String(n).padStart(2, '0')}`;

/** All 75 exercises, in curriculum order. Authored ones carry their content and are available. */
export const FOUNDATIONS: Exercise[] = BRIEFS.map(([number, title, topic, difficulty, brief, visual]) => {
  const id = exerciseId(number);
  const authored = AUTHORED[id];
  const sameTopic = BRIEFS.filter((b) => b[2] === topic && b[0] !== number).map((b) => exerciseId(b[0]));
  return {
    id,
    number,
    title,
    topic,
    difficulty,
    brief,
    visual,
    status: authored ? 'available' : 'planned',
    prerequisites: authored?.prerequisites ?? TOPIC_LESSONS[topic],
    related: authored?.related ?? sameTopic.slice(0, 2),
    content: authored?.content,
  };
});

export function exerciseById(id: string): Exercise | undefined {
  return FOUNDATIONS.find((e) => e.id === id);
}
