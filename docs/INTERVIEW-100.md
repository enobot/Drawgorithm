# Drawgorithm Interview 100: sources and selection

Interview 100 is the second practice collection in Drawgorithms (after Foundations 75). Every exercise is an original story written for this app, with the same underlying structure as a problem that appears on widely used public interview-prep lists. The statements, examples, tests, hints and reference solutions are written for Drawgorithms; nothing is copied from the lists or from the platforms they link to. The classic names below are given only so the selection can be checked. Drawgorithms is not affiliated with or endorsed by LeetCode, NeetCode, the Tech Interview Handbook or any list named here; their names belong to their owners.

## What "popular" means here

The lists below are study plans that people curate and share. They show which problems are widely recommended for practice. They are not data on how often a company asks a question (that information isn't public), and this collection makes no claim about interview frequency.

## Sources (read 2026-10-28)

| Key | List                                                                                                                                      | Where it was read                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NC  | NeetCode 150 (150 problems by pattern)                                                                                                    | The list as reproduced in [mdmzfzl/NeetCode-Solutions](https://github.com/mdmzfzl/NeetCode-Solutions) (README)                                                                                                                                                                                                     |
| TI  | LeetCode Top Interview 150 study plan                                                                                                     | [leetcode.com/studyplan/top-interview-150](https://leetcode.com/studyplan/top-interview-150/) refused automated reading (HTTP 403), so the list was read from a third-party copy: [lets-code.co.in](https://www.lets-code.co.in/articles/leetcodetop150questions)                                                  |
| TIH | Tech Interview Handbook "best practice questions", the curated list by the author of the Blind 75 (core questions plus the optional ones) | [yangshun/tech-interview-handbook](https://github.com/yangshun/tech-interview-handbook/blob/main/apps/website/contents/best-practice-questions.md); the [Teamblind guide](https://www.teamblind.com/blog/the-blind-75-guide-the-ultimate-coding-interview-prep-resource/) (2025-05-05) describes the list's origin |

The original 2018 Blind 75 post was not read directly; only the author's handbook list above was.

## How the 100 were chosen

1. Start from every problem on the three lists.
2. Leave out every structure Foundations 75 already practices (for example two-sum lookups, sliding window maximum, rotated search, list reversal and cycles, level order, BST validation, subsets, permutations, word search, N-queens, islands, topological order, Dijkstra, union-find, coin change, LCS, edit distance, jump game, gas station, merging and scheduling intervals, tries, LRU cache).
3. Prefer problems on two or three lists; fill the rest from single-list problems so every pattern family is covered.
4. Leave out near-duplicates (e.g. Best Time to Buy and Sell Stock III, a special case of IV) and a few problems whose usual form needs a premium account or adds little beyond a chosen one.
5. Balance difficulty: 25 Easy, 53 Medium, 22 Hard (the collection's own labels).

## The 100 and the lists they come from

| #   | Exercise                  | Classic problem it mirrors                                                      | Lists                  |
| --- | ------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| 1   | Letter Swap Check         | Valid Anagram                                                                   | NC, TI, TIH            |
| 2   | Ransom Clippings          | Ransom Note                                                                     | TI                     |
| 3   | Code Word Match           | Isomorphic Strings                                                              | TI                     |
| 4   | Majority Vote             | Majority Element                                                                | TI                     |
| 5   | Roman Ledger              | Roman to Integer                                                                | TI                     |
| 6   | Anagram Shelves           | Group Anagrams                                                                  | NC, TI, TIH            |
| 7   | Most Requested Items      | Top K Frequent Elements                                                         | NC, TIH                |
| 8   | Unbroken Badge Run        | Longest Consecutive Sequence                                                    | NC, TI, TIH            |
| 9   | Puzzle Grid Audit         | Valid Sudoku                                                                    | NC, TI                 |
| 10  | Shared Opening            | Longest Common Prefix                                                           | TI                     |
| 11  | Hidden Sequence           | Is Subsequence                                                                  | TI                     |
| 12  | Triple Balance            | 3Sum                                                                            | NC, TI, TIH            |
| 13  | Widest Tank               | Container With Most Water                                                       | NC, TI, TIH            |
| 14  | Best Single Trade         | Best Time to Buy and Sell Stock                                                 | NC, TI, TIH            |
| 15  | Recolor Budget            | Longest Repeating Character Replacement                                         | NC, TIH                |
| 16  | Scrambled Fragment        | Permutation in String                                                           | NC                     |
| 17  | Smallest Covering Stretch | Minimum Window Substring                                                        | NC, TI, TIH            |
| 18  | Word-Chain Windows        | Substring with Concatenation of All Words                                       | TI                     |
| 19  | Undoable Minimum          | Min Stack                                                                       | NC, TI                 |
| 20  | Postfix Calculator        | Evaluate Reverse Polish Notation                                                | NC, TI                 |
| 21  | Convoy Groups             | Car Fleet                                                                       | NC                     |
| 22  | Skyline Billboard         | Largest Rectangle in Histogram                                                  | NC                     |
| 23  | Pocket Calculator         | Basic Calculator                                                                | TI                     |
| 24  | Rotation Low Point        | Find Minimum in Rotated Sorted Array                                            | NC, TI, TIH            |
| 25  | Peak Finder               | Find Peak Element (with exactly one peak, so the checker can expect one answer) | TI                     |
| 26  | Version Lookup            | Time Based Key-Value Store                                                      | NC                     |
| 27  | Combined Middle           | Median of Two Sorted Arrays                                                     | NC, TI                 |
| 28  | Chain Gap Removal         | Remove Nth Node From End of List                                                | NC, TI, TIH            |
| 29  | Fold the Chain            | Reorder List                                                                    | NC                     |
| 30  | Shadow Copy               | Copy List with Random Pointer                                                   | NC, TI                 |
| 31  | Digit Chains              | Add Two Numbers                                                                 | NC, TI                 |
| 32  | Repeated Ticket           | Find the Duplicate Number                                                       | NC                     |
| 33  | Flip in Groups            | Reverse Nodes in k-Group                                                        | NC, TI                 |
| 34  | Mirror the Tree           | Invert Binary Tree                                                              | NC, TI, TIH            |
| 35  | Twin Trees                | Same Tree                                                                       | NC, TI, TIH (optional) |
| 36  | Reflected Halves          | Symmetric Tree                                                                  | TI                     |
| 37  | Longest Branch Walk       | Diameter of Binary Tree                                                         | NC                     |
| 38  | Even Footing              | Balanced Binary Tree                                                            | NC                     |
| 39  | Branch Inside a Tree      | Subtree of Another Tree                                                         | NC, TIH                |
| 40  | Exact Route Total         | Path Sum                                                                        | TI                     |
| 41  | Balanced Index Tree       | Convert Sorted Array to Binary Search Tree                                      | TI                     |
| 42  | Shared Ancestor           | Lowest Common Ancestor of a Binary Search Tree                                  | NC, TIH                |
| 43  | K-th in Order             | Kth Smallest Element in a BST                                                   | NC, TI, TIH            |
| 44  | Rebuild from Two Walks    | Construct Binary Tree from Preorder and Inorder Traversal                       | NC, TI, TIH            |
| 45  | Back-and-Forth Levels     | Binary Tree Zigzag Level Order Traversal                                        | TI                     |
| 46  | Best Branch Path          | Binary Tree Maximum Path Sum                                                    | NC, TI, TIH            |
| 47  | Tree to Text and Back     | Serialize and Deserialize Binary Tree                                           | NC, TIH                |
| 48  | Bracket Builder           | Generate Parentheses                                                            | NC, TI                 |
| 49  | Reusable Coin Picks       | Combination Sum                                                                 | NC, TI, TIH            |
| 50  | Subsets with Repeats      | Subsets II                                                                      | NC                     |
| 51  | Mirror Cuts               | Palindrome Partitioning                                                         | NC                     |
| 52  | Keypad Spellings          | Letter Combinations of a Phone Number                                           | NC, TI                 |
| 53  | Fast Power                | Pow(x, n)                                                                       | NC, TI                 |
| 54  | Leaderboard Keeper        | Kth Largest Element in a Stream                                                 | NC                     |
| 55  | Stone Smasher             | Last Stone Weight                                                               | NC                     |
| 56  | Nearest Beacons           | K Closest Points to Origin                                                      | NC                     |
| 57  | Cooldown Scheduler        | Task Scheduler                                                                  | NC                     |
| 58  | Mini Feed                 | Design Twitter                                                                  | NC                     |
| 59  | Project Capital           | IPO                                                                             | TI                     |
| 60  | Map Copy                  | Clone Graph                                                                     | NC, TI, TIH            |
| 61  | Spreading Spoilage        | Rotting Oranges                                                                 | NC                     |
| 62  | Two-Ocean Runoff          | Pacific Atlantic Water Flow                                                     | NC, TIH                |
| 63  | Enclosed Territory        | Surrounded Regions                                                              | NC, TI                 |
| 64  | Class Loop Check          | Course Schedule                                                                 | NC, TI, TIH            |
| 65  | Budget Flights            | Cheapest Flights Within K Stops                                                 | NC                     |
| 66  | Word Steps                | Word Ladder                                                                     | NC, TI                 |
| 67  | Ticket Trail              | Reconstruct Itinerary                                                           | NC                     |
| 68  | Rising Tide Crossing      | Swim in Rising Water                                                            | NC                     |
| 69  | Unknown Alphabet          | Alien Dictionary                                                                | NC, TIH (optional)     |
| 70  | Circular Street Rewards   | House Robber II                                                                 | NC, TIH                |
| 71  | Longest Mirror Stretch    | Longest Palindromic Substring                                                   | NC, TI                 |
| 72  | Count the Mirrors         | Palindromic Substrings                                                          | NC, TIH                |
| 73  | Signal Decoding           | Decode Ways                                                                     | NC, TIH                |
| 74  | Best Product Streak       | Maximum Product Subarray                                                        | NC, TIH (optional)     |
| 75  | Dictionary Split          | Word Break                                                                      | NC, TI, TIH            |
| 76  | Rising Subsequence        | Longest Increasing Subsequence                                                  | NC, TI, TIH            |
| 77  | Even Split                | Partition Equal Subset Sum                                                      | NC                     |
| 78  | Woven Messages            | Interleaving String                                                             | NC, TI                 |
| 79  | Steepest Climb            | Longest Increasing Path in a Matrix                                             | NC                     |
| 80  | Hidden Copies             | Distinct Subsequences                                                           | NC                     |
| 81  | Balloon Burst Order       | Burst Balloons                                                                  | NC                     |
| 82  | Pattern Matcher           | Regular Expression Matching                                                     | NC                     |
| 83  | Limited Trades            | Best Time to Buy and Sell Stock IV                                              | TI                     |
| 84  | Best Streak Total         | Maximum Subarray                                                                | NC, TI, TIH            |
| 85  | Section Splitter          | Partition Labels                                                                | NC                     |
| 86  | Fair Treats               | Candy                                                                           | TI                     |
| 87  | Room Clash Check          | Meeting Rooms                                                                   | NC, TIH (optional)     |
| 88  | Rooms Needed              | Meeting Rooms II                                                                | NC, TIH (optional)     |
| 89  | Slot In a Booking         | Insert Interval                                                                 | NC, TI, TIH            |
| 90  | Range Summary             | Summary Ranges                                                                  | TI                     |
| 91  | Query Windows             | Minimum Interval to Include Each Query                                          | NC                     |
| 92  | Even Lines                | Text Justification                                                              | TI                     |
| 93  | Bit Tally Table           | Counting Bits                                                                   | NC                     |
| 94  | Mirror the Bits           | Reverse Bits                                                                    | NC, TI                 |
| 95  | Missing Badge             | Missing Number                                                                  | NC                     |
| 96  | Happy Digits              | Happy Number                                                                    | NC, TI                 |
| 97  | Counter Increment         | Plus One                                                                        | NC, TI                 |
| 98  | Spiral Readout            | Spiral Matrix                                                                   | NC, TI                 |
| 99  | Zero Spread               | Set Matrix Zeroes                                                               | NC, TI                 |
| 100 | Points in a Row           | Max Points on a Line                                                            | TI                     |

## Status

All 100 exercises are available. An exercise opens in the app only when its statement, rules, examples, tests, hints, JavaScript and Python answers and drawing are written and verified (`src/practice/interview.test.ts` and `src/practice/python.test.ts`); the Practice browser would list any other as planned.
