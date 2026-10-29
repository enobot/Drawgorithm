# How to Explain This in an Interview

A learner may know how to write an efficient solution and still struggle to explain it. This optional, text-only guide sits at the end of a Foundations 75 exercise's practice panel. It shows what the learner could say, in what order, and why each part helps. It is closed until the learner opens it, and the coding workspace and the drawing stay the main workflow.

## Status

| Exercise               | Guide                           |
| ---------------------- | ------------------------------- |
| 4. Balanced Shipment   | complete (pair sum)             |
| 17. Turn the Chain     | complete (linked-list reversal) |
| 26. Find the Reading   | complete (binary search)        |
| The other 72 exercises | planned                         |
| Built-in examples      | no practice panel, so no guide  |

A planned exercise shows the guide's title, the words “Guide: planned”, a sentence saying it hasn't been written and checked yet, and links to the three that exist. It shows no generic wording. Per Tracy's instruction, these three are the first complete guides, and they are to be reviewed before guides are written for other problems. Drafts of earlier, longer coaching for asteroid collisions, level order and the staircase (an earlier version of this feature) are kept outside the repository for when that happens.

The second practice collection (Interview 100) is not in this branch. Guides are looked up by exercise id (`guideFor(id)`), so an exercise without an entry in `GUIDES` shows as planned.

## The ten sections

Every section has first-person wording labeled **You could say…**, so the learner can adapt it, and a short **Why this matters** note. Each follows Tracy's sentence pattern, with every blank filled for that exercise:

1. Understanding the problem: “Let me make sure I understand. We’re given …, and we need to return ….”
2. Clarifying requirements: rules the statement already gives are acknowledged (“I see that …”), and only questions it leaves open are asked.
3. Walking through an example: “For this input, I’d expect … because ….”
4. Describing a baseline: “The straightforward approach would be …. It works because …, but it takes … because ….”
5. Finding an improvement: “The repeated work here is …. We could avoid that by ….”
6. Explaining the chosen approach: “I’ll use … to keep track of …. As I process each …, I’ll …. The important property … is ….”
7. Narrating key code decisions: “I’m doing … before … because otherwise ….”
8. Testing the solution: “Let me check a typical case first, then … and ….”
9. Explaining complexity: “We process …, and each … costs …. That gives us … time and … additional space.”
10. Wrapping up: “This satisfies … under these assumptions: …. One tradeoff is ….”

## Two sources of guidance

**Before the learner writes code: the example approach.** It is labeled as written from the exercise's authored answer, not the learner's code, and starts hidden. **Show section N** reveals one section at a time, with keyboard focus moving to the new section's heading. **Show all ten sections** and **Hide the example approach** are there too. It links passages to the authored answer:

- Sections 6 and 7 list the lines they are about, with their line numbers in the answer for the editor's language.
- Section 3 has **Run my code on Example 1**, and **Show on the board** next to each moment of the example. That plays the authored answer as a walkthrough and stops the board at the step where the moment really happens; the guide then says which step (“Step 19 of 21 of the authored answer is on the board: …”). `findMoments` (`src/interview/moments.ts`) finds the step in the recorded run: the first step, after the previous moment's, that ran the moment's line with the moment's variable values. If the run doesn't finish, or the moment isn't there (for example after the example's inputs were edited), the guide says so.

The walkthrough is the existing one. The learner's code is never changed, the board and editor label the answer as not the learner's code, and **Back to my code** returns to it. The guide keeps the learner on the panel they were using; on phones, where the board is its own tab, it says “Open the Visual tab to see it.”

**After the learner writes code: Explain my code.** No outside service, model, SDK or API key is involved, so it doesn't read the code's text or guess its intent. It runs the code on every example and test (the same runs as Check all tests, on the same worker and limits) and on three larger inputs of the guide's choosing. Then it decides from what those runs recorded:

| Observation                         | Read from                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Pass or fail on every case          | the Check all tests comparison: input, expected and actual output                                                   |
| Time growth                         | the step counts at the three sizes: equal increases (log), increases scaling with n (linear) or with n² (quadratic) |
| Extra-space growth                  | the most values held at once in collections other than the inputs, plus nested calls, at the three sizes            |
| Lookup table                        | a Map, dict or plain object other than the inputs                                                                   |
| One pass                            | on the example, the table never held every item of the input                                                        |
| Recursion, and when list links turn | the deepest nesting of one function, and how many links had changed at the deepest call                             |
| Created nodes, stored nodes         | `create` steps of list nodes, and an array holding every node                                                       |
| Input changed                       | an input array's contents at the end of each run                                                                    |
| The line run most often             | step locations, with a **Show line N in the editor** button                                                         |

Then, in order:

1. If any case fails or errors, it offers no explanation. It lists each failing case's input with the expected and actual output, and suggests stepping through it on the board.
2. If every case passes but a stated rule is broken, it says which rule, quoting the exercise. The rules checked are O(log n) comparisons for binary search (the steps grew linearly), reusing the nodes for the reversal (new nodes were created), and leaving the input array unchanged.
3. If the observations match an authored variant, it shows sections 4 to 10 written for that approach: “Your code passes every test, and its runs match …”. It notes that sections 1 to 3 don't depend on the code, and asks the learner to check each sentence against their own lines.
4. Otherwise it says the runs match no approach the guide has wording for, shows only the observations, and suggests using the ten sections as an outline.

The measurements always come with it (“Steps for 6, 12, 24 packages: 71, 248, 926. They grew with the square of n”). It never calls code optimal. Results are dropped when the learner leaves the exercise, and a result that no longer matches the editor's code is marked out of date.

The authored variants:

| Exercise      | Variants                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Pair sum      | a one-pass lookup table (the reference; Map, dict or plain object), nested loops                                                                |
| Reversal      | three references in a loop (the reference), recursion turning links on the way back, recursion turning them on the way down, collect-and-relink |
| Binary search | a halving window in a loop (the reference), recursion on a range                                                                                |

What doesn't match, such as a lookup table filled before the scan, gets observations only.

## Schema

`src/interview/schema.ts`. A guide (`InterviewGuide`) has:

- the three shared passages, `understand`, `clarify` (with `acknowledged`: the stated rules it acknowledges, in the exercise's words) and `example` (with its `case` and `moments`);
- `variants`, each with `match` (the observations that identify it), its `time` and `space`, and `sections` for 4 to 10; exactly one is the `reference`;
- `requirements`: stated rules checked from the runs (`logarithmic-time`, `reuse-nodes`, `input-unchanged`), each with the exercise's `quote` and an `explain` text;
- `probe`: three sizes, their ratio, and worst-case inputs of size n.

A passage has `say` (paragraphs), `why`, and, for the example approach only, `code`: fragments of the reference answer in each language. Learner-facing text is `Words`: a plain string, or `{ javascript, python }` when code names differ (Map and dict, null and None, `next` and `nxt`). The guide follows the editor's language. Cases are referred to by position with their own note (`{ from, index, note }`), and the guide shows the exercise's real inputs and outputs. The observation code is `src/interview/observe.ts`, and the UI is `src/ui/InterviewCoach.tsx`.

## What is verified

`src/interview/guides.test.ts`:

- Every one of the ten sections, in every variant and in both languages' wording, follows its pattern, has no blanks, is first person where the pattern is, and has a “Why this matters” note.
- Acknowledged rules and requirement quotes appear word for word in the exercise.
- Every case reference exists and its note matches.
- The reference variant's time and space are exactly the exercise's `solution.complexity`, and every variant's complexity section states its own bounds.
- Every code link exists in the JavaScript and the Python answer.
- Text read in one language never names code that only the other language has.
- Every moment is found, in order, in the reference's real run.
- The figures the wording states are measured or computed: n(n−1)/2 pair checks and almost 50 million for 10,000; at most ⌊log₂ n⌋ + 1 passes and 17 for 100,000; one link turned per node, no node created, and the 200-nested-call limit.

`src/interview/observe.test.ts` runs learner-style solutions through the same analysis the app uses, in the interpreter:

- **Pair sum:** the reference and a plain-object version get the lookup-table wording, and nested loops get the nested-loop wording, never the lookup-table one. A filled-first table gets observations only. The starter and a self-pairing bug get no explanation, only their failing cases. A version that changes `weights` is told it breaks the rule.
- **Reversal:** the reference, both recursive styles and collect-and-relink each get their own wording. Building new nodes is told it breaks the reuse rule, and the starter is reported by what it returned.
- **Binary search:** the reference and a recursive version get their own wording. A scan passes every test, is told it breaks the O(log n) rule, and gets no explanation. A `low < high` boundary bug is reported on the cases it fails.
- **Growth classification:** checked directly, and an interrupted analysis reports nothing.

`src/interview/python.test.ts` does the same on real CPython (Pyodide). Moments and code links are checked in the Python answers, each Python answer gets its example approach, and Python solutions get their own wording too: nested loops, recursion on the way back, new nodes, recursion on a range and a scan.

The UI flow was checked with the keyboard only in Chromium through Playwright, at 1440×900 and 375×812:

- **Example approach:** it opens hidden, sections reveal one at a time with focus on the new heading, Show all and Hide work, and the reference line links appear.
- **Board:** a moment's step on the board matches the guide's, focus stays put, and the note mentions the Visual tab only on phones.
- **Explain my code:** the starter gets its failing cases, nested loops get the nested-loop wording with measured quadratic growth, and the "Show line" button is reachable. At 1440×900 only, a scan for binary search is told it breaks O(log n), and the Python dict version gets the example approach's wording, naming the dict.
- **Accessibility and privacy:** text contrast is at least 4.5:1, every focused control shows a visible focus ring and is on screen, there's no horizontal overflow, no request leaves the dev server, and the planned state was also checked.

That script is a local check, not part of `npm test`. The one setup step that isn't keyboard is putting a sample solution in the editor through the app's saved state.

## Limits, said plainly

- Explain my code identifies an approach from what the runs show. It doesn't read the code, so its wording can't name the learner's own variables or lines, apart from the most-run line it measured. That's why it asks the learner to check each sentence against their code.
- A correct approach that isn't one of the authored variants gets observations only, never a forced explanation.
- Growth is measured on three small inputs within the app's run limits (2,000 steps, 200 nested calls). Very slow code can hit those limits on the largest input; the guide then says the run didn't finish instead of classifying it.
- Adaptive feedback that reads free-form text (the learner's own spoken or typed explanation) is not built, pending Tracy's decision. Voice is not needed and not built.

## Facts the wording relies on, and where they come from

- JavaScript `Map`: the specification only requires average access times that are sublinear in the number of entries, so “constant time on average” is an assumption about engines, which use hash tables. [MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) quotes the specification.
- Python dict lookups and stores are O(1) on average, and O(n) in the worst case when keys collide. [Python docs: Time complexity of operations on built-in types](https://docs.python.org/3/builtins/time-complexity.html), [Python FAQ: How are dictionaries implemented in CPython?](https://docs.python.org/3/faq/design.html#how-are-dictionaries-implemented-in-cpython)
- Python's recursion limit is read with `sys.getrecursionlimit()`; the guides don't state its default. [Python docs: sys.getrecursionlimit](https://docs.python.org/3/library/sys.html#sys.getrecursionlimit)
- This app's limits (2,000 recorded steps, 200 nested calls, in both languages) come from `src/engine/run.ts` and `src/engine/python/tracer.py`, and the tests check them.
- UI: React [`useId`](https://react.dev/reference/react/useId) for label ids, and the zustand store's [`subscribe`](https://zustand.docs.pmnd.rs/reference/apis/create), which fires on every state update, to place a moment once the walkthrough's run has finished. Accessibility targets are WCAG 2.2 AA ([W3C](https://www.w3.org/TR/WCAG22/)): 1.4.3 contrast, 2.1.1 keyboard, 2.4.3 focus order, 2.4.7 focus visible, 2.5.8 target size, 4.1.3 status messages.

## Adding a guide

1. Write it in `src/interview/guides.ts` from the exercise's own statement, cases and reference answers (JavaScript and Python), in new words. Add a variant only for an approach you can describe from observations alone.
2. Add the id to `WITH_GUIDES` in `guides.test.ts`, and add learner-style solutions for every variant, and for failing and rule-breaking code, to `observe.test.ts` and `python.test.ts`.
3. Run `npm test`. The guide is complete only when every check passes.
