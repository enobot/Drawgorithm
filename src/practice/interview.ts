// Drawgorithm Interview 100: a second original practice collection for Drawgorithms. Each
// exercise has the structure of a problem that appears on widely used public interview-prep
// lists (docs/INTERVIEW-100.md names the lists and the date they were read), told as a story
// written for this app. It makes no claim about how often any question is asked.
// Exercises start "planned" (brief only) and become "available" only when their authored
// content, tests, JavaScript and Python answers and visualization support are verified.
import type { Difficulty, Exercise, TopicId } from './schema';
import { TOPIC_LESSONS } from './foundations';
import { INTERVIEW_AUTHORED } from './interviewExercises';

export const INTERVIEW_TITLE = 'Drawgorithm Interview 100';

type Brief = [number, string, TopicId, Difficulty, string, string];

// prettier-ignore
const BRIEFS: Brief[] = [
  [1, 'Letter Swap Check', 'arrays-hashing', 'Easy', 'Decide whether two words use exactly the same letters, each the same number of times.', 'Letter counts going up for one word and down for the other.'],
  [2, 'Ransom Clippings', 'arrays-hashing', 'Easy', 'Decide whether a note can be spelled from a pile of cut-out letters, using each letter at most once.', 'A letter-supply map shrinking as the note is spelled.'],
  [3, 'Code Word Match', 'arrays-hashing', 'Easy', 'Decide whether the characters of one string can be renamed one-to-one to give another string.', 'Two pairing maps and the first conflict between them.'],
  [4, 'Majority Vote', 'arrays-hashing', 'Easy', 'Find the value that fills more than half of an array, using constant extra space.', 'A candidate and its count rising and falling as votes are read.'],
  [5, 'Roman Ledger', 'arrays-hashing', 'Easy', 'Convert a Roman numeral to an integer, including subtractive pairs such as IV and CM.', 'Each symbol’s value and whether it is added or subtracted.'],
  [6, 'Anagram Shelves', 'arrays-hashing', 'Medium', 'Group words that are rearrangements of each other.', 'Each word’s sorted key and the map of groups growing.'],
  [7, 'Most Requested Items', 'arrays-hashing', 'Medium', 'Return the k most frequent values, with ties broken by a stated rule.', 'A frequency map and buckets indexed by count.'],
  [8, 'Unbroken Badge Run', 'arrays-hashing', 'Medium', 'Find the length of the longest run of consecutive integers in an unsorted array in linear time.', 'Set lookups, with runs counted only from their first value.'],
  [9, 'Puzzle Grid Audit', 'arrays-hashing', 'Medium', 'Check a partly filled 9×9 puzzle grid for a repeated digit in any row, column or 3×3 box.', 'Grid cells with the row, column and box sets that catch repeats.'],
  [10, 'Shared Opening', 'two-pointers', 'Easy', 'Find the longest prefix that every word in a list starts with.', 'One column of characters compared across all words at a time.'],
  [11, 'Hidden Sequence', 'two-pointers', 'Easy', 'Decide whether one string’s characters appear in another string in order, not necessarily side by side.', 'One pointer per string, the short one advancing only on a match.'],
  [12, 'Triple Balance', 'two-pointers', 'Medium', 'Find every distinct triple of values that adds up to zero.', 'A fixed value plus two pointers closing in on a sorted array, skipping repeats.'],
  [13, 'Widest Tank', 'two-pointers', 'Medium', 'Pick two walls from a row of heights that hold the most water between them.', 'Two end pointers, the area between them, and the shorter wall moving in.'],
  [14, 'Best Single Trade', 'sliding-window', 'Easy', 'Find the largest profit from buying once and selling on a later day.', 'The lowest price so far and the best profit so far along the prices.'],
  [15, 'Recolor Budget', 'sliding-window', 'Medium', 'Find the longest stretch that can become one repeated letter by changing at most k letters.', 'A window, its letter counts and the most common letter inside it.'],
  [16, 'Scrambled Fragment', 'sliding-window', 'Medium', 'Decide whether some rearrangement of a short string appears as a contiguous part of a longer one.', 'A fixed-size window and two count tables compared as it slides.'],
  [17, 'Smallest Covering Stretch', 'sliding-window', 'Hard', 'Find the shortest contiguous part of a text that contains every required character, with repeats.', 'A window that grows until it covers everything, then shrinks from the left.'],
  [18, 'Word-Chain Windows', 'sliding-window', 'Hard', 'Find every position where all the given equal-length words, joined in some order, begin.', 'Word-sized steps, a window of word counts, and the starts found.'],
  [19, 'Undoable Minimum', 'stacks-queues', 'Medium', 'Build a stack that also reports its smallest value in constant time.', 'A value stack beside a stack of minimums so far.'],
  [20, 'Postfix Calculator', 'stacks-queues', 'Medium', 'Evaluate an arithmetic expression written in postfix (reverse Polish) order.', 'Operands pushed, and each operator popping two and pushing the result.'],
  [21, 'Convoy Groups', 'stacks-queues', 'Medium', 'Count the groups of cars that reach a destination when faster cars catch up and slow to the car ahead.', 'Cars sorted by position and a stack of arrival times.'],
  [22, 'Skyline Billboard', 'stacks-queues', 'Hard', 'Find the largest rectangle that fits under a row of bar heights.', 'A stack of rising bars and the rectangle each popped bar closes.'],
  [23, 'Pocket Calculator', 'stacks-queues', 'Hard', 'Evaluate an expression with +, −, parentheses and spaces without an eval function.', 'Running total, sign, and a stack saving both at each parenthesis.'],
  [24, 'Rotation Low Point', 'binary-search', 'Medium', 'Find the smallest value in a sorted array rotated at an unknown point.', 'lo, mid and hi, and the half that still holds the minimum.'],
  [25, 'Peak Finder', 'binary-search', 'Medium', 'Find a position whose value is larger than both neighbours, in logarithmic time.', 'mid compared with its right neighbour, and the uphill half kept.'],
  [26, 'Version Lookup', 'binary-search', 'Medium', 'Store values under keys with timestamps and return the latest value at or before a requested time.', 'A map of timestamp lists and a binary search inside one list.'],
  [27, 'Combined Middle', 'binary-search', 'Hard', 'Find the median of two sorted arrays in logarithmic time.', 'A cut through each array and the four values beside the cuts.'],
  [28, 'Chain Gap Removal', 'linked-lists', 'Medium', 'Remove the n-th node from the end of a linked list in one pass.', 'Two pointers n nodes apart walking to the end.'],
  [29, 'Fold the Chain', 'linked-lists', 'Medium', 'Reorder a list as first, last, second, second to last, … by relinking its nodes.', 'Middle found, second half reversed, then the halves woven.'],
  [30, 'Shadow Copy', 'linked-lists', 'Medium', 'Deep-copy a linked list whose nodes also point at another node of the list (or none).', 'Original and copied nodes, with a map pairing them.'],
  [31, 'Digit Chains', 'linked-lists', 'Medium', 'Add two numbers stored as linked lists of digits, lowest digit first.', 'Digit pairs, the carry, and the result list growing.'],
  [32, 'Repeated Ticket', 'linked-lists', 'Medium', 'Find the repeated number among n + 1 values from 1 to n without changing the array, in constant extra space.', 'Indexes followed as links, with fast and slow pointers meeting in a cycle.'],
  [33, 'Flip in Groups', 'linked-lists', 'Hard', 'Reverse a linked list k nodes at a time, leaving a shorter final group as it is.', 'Each group cut out, reversed and reattached.'],
  [34, 'Mirror the Tree', 'trees', 'Easy', 'Swap every node’s left and right children.', 'Children swapping, subtree by subtree.'],
  [35, 'Twin Trees', 'trees', 'Easy', 'Decide whether two binary trees have the same shape and values.', 'Matching nodes compared in both trees at once.'],
  [36, 'Reflected Halves', 'trees', 'Easy', 'Decide whether a binary tree is a mirror image of itself.', 'Outer and inner node pairs compared across the middle.'],
  [37, 'Longest Branch Walk', 'trees', 'Easy', 'Find the longest path between any two nodes of a binary tree, counted in edges.', 'Each node’s left and right heights and the best path through it.'],
  [38, 'Even Footing', 'trees', 'Easy', 'Decide whether every node’s two subtrees differ in height by at most one.', 'Heights returned upward and the first unbalanced node.'],
  [39, 'Branch Inside a Tree', 'trees', 'Easy', 'Decide whether one binary tree appears exactly as a subtree of another.', 'Candidate roots and the node-by-node comparison from each.'],
  [40, 'Exact Route Total', 'trees', 'Easy', 'Decide whether some root-to-leaf path adds up to a target.', 'The remaining total shrinking along each path.'],
  [41, 'Balanced Index Tree', 'trees', 'Easy', 'Build a height-balanced binary search tree from a sorted array.', 'The middle value chosen as each subtree’s root.'],
  [42, 'Shared Ancestor', 'trees', 'Medium', 'Find the lowest common ancestor of two values in a binary search tree.', 'The walk down until the two values split to different sides.'],
  [43, 'K-th in Order', 'trees', 'Medium', 'Find the k-th smallest value in a binary search tree.', 'An in-order walk counting nodes until k.'],
  [44, 'Rebuild from Two Walks', 'trees', 'Medium', 'Rebuild a binary tree from its preorder and inorder listings.', 'Each root taken from preorder and split in the inorder listing.'],
  [45, 'Back-and-Forth Levels', 'trees', 'Medium', 'List a tree’s values level by level, alternating left-to-right and right-to-left.', 'A level queue and each level’s direction.'],
  [46, 'Best Branch Path', 'trees', 'Hard', 'Find the largest sum of any path between two nodes of a binary tree.', 'Each node’s best downward gain and the best path through it.'],
  [47, 'Tree to Text and Back', 'trees', 'Hard', 'Turn a binary tree into a string and rebuild the same tree from it.', 'The preorder text with empty markers, and the tree rebuilt from it.'],
  [48, 'Bracket Builder', 'recursion', 'Medium', 'Generate every balanced string of n pairs of parentheses.', 'A decision tree of open and close choices with their counts.'],
  [49, 'Reusable Coin Picks', 'recursion', 'Medium', 'List every combination of reusable values that adds up to a target.', 'A decision tree cut off when the remaining total goes below zero.'],
  [50, 'Subsets with Repeats', 'recursion', 'Medium', 'List every distinct subset of values that may contain duplicates.', 'A decision tree that skips equal values at the same depth.'],
  [51, 'Mirror Cuts', 'recursion', 'Medium', 'Split a string into palindromic pieces in every possible way.', 'Cut positions tried, each kept only when its piece is a palindrome.'],
  [52, 'Keypad Spellings', 'recursion', 'Medium', 'List every letter combination a string of phone-keypad digits can spell.', 'One branch per letter for each digit.'],
  [53, 'Fast Power', 'recursion', 'Medium', 'Compute x to an integer power n, including negative n, with O(log n) multiplications.', 'Halving calls, and the squares coming back up.'],
  [54, 'Leaderboard Keeper', 'heaps', 'Easy', 'After each new score, report the k-th highest score so far.', 'A size-k min-heap whose top is the answer.'],
  [55, 'Stone Smasher', 'heaps', 'Easy', 'Repeatedly smash the two heaviest stones together and report what is left.', 'A max-heap losing two stones and gaining their difference.'],
  [56, 'Nearest Beacons', 'heaps', 'Medium', 'Return the k points closest to the origin.', 'A bounded max-heap of squared distances.'],
  [57, 'Cooldown Scheduler', 'heaps', 'Medium', 'Find the fewest time slots to run tasks when equal tasks need a cooldown between them.', 'Task counts, the most frequent task and the idle slots it forces.'],
  [58, 'Mini Feed', 'heaps', 'Medium', 'Support posting, following and fetching the ten most recent posts from followed users.', 'Each source’s newest post compared, ten times at most.'],
  [59, 'Project Capital', 'heaps', 'Hard', 'Choose at most k projects one after another to maximize final capital, each needing a minimum capital to start.', 'Projects sorted by cost and a max-heap of affordable profits.'],
  [60, 'Map Copy', 'graphs', 'Medium', 'Make a deep copy of a connected undirected graph.', 'Original vertices, their copies and the map between them.'],
  [61, 'Spreading Spoilage', 'graphs', 'Medium', 'Find how many minutes pass until every fresh cell spoils from its spoiled neighbours, or report that some never do.', 'Breadth-first rings spreading minute by minute from every spoiled cell.'],
  [62, 'Two-Ocean Runoff', 'graphs', 'Medium', 'Find every cell from which water can flow to both the top-left edges and the bottom-right edges.', 'Two searches climbing up from each pair of edges, and their overlap.'],
  [63, 'Enclosed Territory', 'graphs', 'Medium', 'Fill every region of open cells that does not touch the border.', 'Regions marked safe from the border, then the rest filled.'],
  [64, 'Class Loop Check', 'graphs', 'Medium', 'Decide whether every course can be finished given prerequisite pairs.', 'Depth-first search with unvisited, in-progress and finished vertices.'],
  [65, 'Budget Flights', 'graphs', 'Medium', 'Find the cheapest price from a source to a destination with at most k stops.', 'A price table relaxed one round of flights at a time.'],
  [66, 'Word Steps', 'graphs', 'Hard', 'Find the fewest one-letter changes that turn a start word into an end word through a word list.', 'Breadth-first layers of words and the patterns linking them.'],
  [67, 'Ticket Trail', 'graphs', 'Hard', 'Rebuild the trip that uses every ticket once, smallest in alphabetical order, from a given starting city.', 'Destinations taken in order and the route built backward.'],
  [68, 'Rising Tide Crossing', 'graphs', 'Hard', 'Find the earliest time a grid of heights can be crossed when water rises one unit per minute.', 'A binary search over the water level, with a flood fill checking each level.'],
  [69, 'Unknown Alphabet', 'graphs', 'Hard', 'Recover a letter order from a sorted list of words in an unknown alphabet, or report a contradiction.', 'A letter graph from neighbouring words, then a topological order.'],
  [70, 'Circular Street Rewards', 'dp', 'Medium', 'Collect the largest reward from houses on a circle without taking two neighbours.', 'Two straight runs: one without the first house, one without the last.'],
  [71, 'Longest Mirror Stretch', 'dp', 'Medium', 'Find the longest palindromic substring of a string.', 'Centers expanding outward while the two ends match.'],
  [72, 'Count the Mirrors', 'dp', 'Medium', 'Count the palindromic substrings of a string.', 'Every center expanding, each palindrome counted.'],
  [73, 'Signal Decoding', 'dp', 'Medium', 'Count the ways a digit string can be read as letters with A = 1 to Z = 26.', 'Ways for each prefix built from one- and two-digit endings.'],
  [74, 'Best Product Streak', 'dp', 'Medium', 'Find the largest product of a contiguous subarray.', 'Running largest and smallest products, trading places at negatives.'],
  [75, 'Dictionary Split', 'dp', 'Medium', 'Decide whether a string can be cut into words from a dictionary.', 'Reachable cut positions filled left to right.'],
  [76, 'Rising Subsequence', 'dp', 'Medium', 'Find the length of the longest strictly increasing subsequence.', 'A table of smallest tails, each update found by binary search.'],
  [77, 'Even Split', 'dp', 'Medium', 'Decide whether an array can be split into two parts with equal sums.', 'The set of reachable sums growing value by value.'],
  [78, 'Woven Messages', 'dp', 'Medium', 'Decide whether a string interleaves two others while keeping each one’s order.', 'A grid of prefix pairs and the cells that can be reached.'],
  [79, 'Steepest Climb', 'dp', 'Hard', 'Find the longest strictly increasing path in a grid moving up, down, left or right.', 'Remembered path lengths filled in by depth-first search.'],
  [80, 'Hidden Copies', 'dp', 'Hard', 'Count the distinct ways a target string appears as a subsequence of a source string.', 'Counts for every prefix of the target, updated as each source letter is read.'],
  [81, 'Balloon Burst Order', 'dp', 'Hard', 'Choose the order to burst balloons that earns the most coins.', 'An interval table filled by the last balloon burst in each range.'],
  [82, 'Pattern Matcher', 'dp', 'Hard', 'Match a whole text against a pattern with . and * wildcards.', 'A table of text and pattern prefixes, with * cells reading two directions.'],
  [83, 'Limited Trades', 'dp', 'Hard', 'Find the best profit from at most k buy-and-sell trades.', 'Holding and free states for each trade count, updated day by day.'],
  [84, 'Best Streak Total', 'greedy', 'Medium', 'Find the largest sum of a contiguous subarray.', 'A running sum restarted whenever it drops below zero.'],
  [85, 'Section Splitter', 'greedy', 'Medium', 'Split a string into as many parts as possible so that each letter appears in only one part.', 'Last positions, and the current part’s end stretching to cover them.'],
  [86, 'Fair Treats', 'greedy', 'Hard', 'Give children the fewest treats so that each gets at least one and anyone rated higher than a neighbour gets more.', 'A left-to-right pass and a right-to-left pass over the treat counts.'],
  [87, 'Room Clash Check', 'greedy', 'Easy', 'Decide whether one person can attend every meeting in a list.', 'Meetings sorted by start, each start compared with the previous end.'],
  [88, 'Rooms Needed', 'greedy', 'Medium', 'Find the fewest rooms that can host every meeting.', 'Sorted starts and ends, with the rooms in use rising and falling.'],
  [89, 'Slot In a Booking', 'greedy', 'Medium', 'Insert an interval into a sorted list of separate intervals, merging where needed.', 'Intervals before, merged with, and after the new one.'],
  [90, 'Range Summary', 'greedy', 'Easy', 'Summarize a sorted list of distinct integers as ranges of consecutive values.', 'Runs extending and closing.'],
  [91, 'Query Windows', 'greedy', 'Hard', 'For each query point, find the size of the smallest interval that contains it.', 'Sorted queries, intervals entering a min-heap by size, and expired ones removed.'],
  [92, 'Even Lines', 'greedy', 'Hard', 'Justify words into lines of a fixed width, spreading spaces as evenly as possible.', 'Words packed per line and the spaces divided between gaps.'],
  [93, 'Bit Tally Table', 'bits-matrices', 'Easy', 'For every number from 0 to n, count its 1 bits, reusing earlier answers.', 'Each count built from the count of i >> 1.'],
  [94, 'Mirror the Bits', 'bits-matrices', 'Easy', 'Reverse the bits of a 32-bit unsigned integer.', 'Bits leaving one end and entering the other.'],
  [95, 'Missing Badge', 'bits-matrices', 'Easy', 'Find the one number missing from 0 to n.', 'Indexes and values combined with XOR.'],
  [96, 'Happy Digits', 'bits-matrices', 'Easy', 'Decide whether repeatedly replacing a number with the sum of its digits’ squares reaches 1.', 'Fast and slow sequences of digit-square sums.'],
  [97, 'Counter Increment', 'bits-matrices', 'Easy', 'Add one to a number stored as an array of digits.', 'The carry moving left through the digits.'],
  [98, 'Spiral Readout', 'bits-matrices', 'Medium', 'Read a matrix in clockwise spiral order.', 'Four boundaries shrinking after each side is read.'],
  [99, 'Zero Spread', 'bits-matrices', 'Medium', 'Wherever a cell holds 0, set its whole row and column to 0, using constant extra space.', 'The first row and column used as markers, then cleared.'],
  [100, 'Points in a Row', 'bits-matrices', 'Hard', 'Find the largest number of points that lie on one straight line.', 'Slopes from each point counted in a map.'],
];

export const interviewId = (n: number) => `i100-${String(n).padStart(3, '0')}`;

/** All 100 exercises, by topic. Authored ones carry their content and are available. */
export const INTERVIEW: Exercise[] = BRIEFS.map(([number, title, topic, difficulty, brief, visual]) => {
  const id = interviewId(number);
  const authored = INTERVIEW_AUTHORED[id];
  const sameTopic = BRIEFS.filter((b) => b[2] === topic && b[0] !== number).map((b) => interviewId(b[0]));
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
