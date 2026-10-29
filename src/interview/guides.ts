// "How to Explain This in an Interview" guides for Foundations 75 exercises. Each one is
// written for its exercise: its statement, rules, examples, tests and reference answers
// (src/practice/exercises.ts, src/practice/python/). guides.test.ts checks every guide
// against that exercise, and python.test.ts checks the Python side on real CPython. An
// exercise without a guide here is "planned": the app says so and shows no guide for it.
import type { InterviewGuide, Passage, TestPassage, Words } from './schema';

const both = (javascript: string, python: string): Words => ({ javascript, python });

/* 4. Balanced Shipment: pair sum. */

const pairSumTest = (extra: string): TestPassage => ({
  cases: [
    { from: 'examples', index: 0, note: '9 + 2 = 11 finishes at index 2, before 4 + 7 (index 3).' },
    { from: 'tests', index: 1, note: 'One package cannot pair with itself' },
    { from: 'tests', index: 3, note: 'Several pairs: smallest j, then smallest i' },
    { from: 'tests', index: 6, note: 'Zero target with zeros apart' },
  ],
  say: [
    'Let me check a typical case first: [4, 9, 2, 7] with target 11 should give [1, 2]. Then a single package of 6 with target 12, which must return an empty array rather than pairing the package with itself, and [3, 3, 3] with target 6, where the tie rule picks [0, 1].',
    `I’d also try [0, 4, 0] with target 0, because position 0 is a valid answer and an easy one to treat as “not found”.${extra}`,
  ],
  why: 'Testing out loud shows you check your own work, and picking cases aimed at the tie rule and at self-pairing shows you know where this problem’s risks are.',
});

const pairSum: InterviewGuide = {
  exerciseId: 'f75-04',
  understand: {
    say: [
      'Let me make sure I understand. We’re given the package weights and a target, and we need to return the positions [i, j] of two different packages whose weights add up to the target, with i smaller than j. If more than one pair works, the answer is the pair that finishes first: the smallest j, then the smallest i for that j. If no pair works, we return an empty array.',
    ],
    why: 'Restating the task catches a misreading before it turns into code, and this exercise has a precise tie rule that is easy to miss.',
  },
  clarify: {
    say: [
      'I see that a pair isn’t guaranteed, so I’ll return an empty array when none works. Two packages can weigh the same, but a package can’t pair with itself, and weights has to stay as given, so I won’t sort it in place.',
      'Two things the statement doesn’t say: will we call this once, or many times on the same weights with different targets? And can I assume the input is always an array of integers, so I don’t need to validate it?',
    ],
    why: 'Acknowledging what is already stated shows you read carefully, and asking only about what is open keeps the conversation useful. Many targets on the same weights would change the design: you would build the lookup table once and reuse it.',
    acknowledged: [
      'If no pair works, return [].',
      'A package cannot be paired with itself, but two different packages may weigh the same.',
      'Do not change weights.',
    ],
  },
  example: {
    case: { from: 'examples', index: 0, note: '9 + 2 = 11 finishes at index 2, before 4 + 7 (index 3).' },
    say: [
      'Let me think through a small example. For weights [4, 9, 2, 7] and target 11, I’d expect [1, 2], because 9 at position 1 and 2 at position 2 add up to 11. 4 and 7 make 11 too, but that pair only finishes at position 3, so the tie rule picks [1, 2].',
    ],
    why: 'A worked example confirms you and the interviewer agree on the output before any code exists, and this one exercises the tie rule.',
    moments: [
      {
        say: 'j = 0: weight 4 needs a partner of 11 − 4 = 7. Nothing is stored yet, so the lookup misses, and 4 is stored with position 0.',
        line: { javascript: 'if (firstIndex.has(partner))', python: 'if partner in firstIndex:' },
        vars: { j: 0, partner: 7 },
      },
      {
        say: 'j = 1: weight 9 needs a partner of 2. Only 4 has been seen, so it misses again, and 9 is stored with position 1.',
        line: { javascript: 'if (firstIndex.has(partner))', python: 'if partner in firstIndex:' },
        vars: { j: 1, partner: 2 },
      },
      {
        say: 'j = 2: weight 2 needs a partner of 9, and 9 was stored with position 1. The lookup finds it.',
        line: { javascript: 'if (firstIndex.has(partner))', python: 'if partner in firstIndex:' },
        vars: { j: 2, partner: 9 },
      },
      {
        say: 'It returns [1, 2] at once, without looking at the 7 at position 3.',
        line: { javascript: 'return [firstIndex.get(partner), j];', python: 'return [firstIndex[partner], j]' },
        vars: { j: 2 },
      },
    ],
  },
  variants: [
    {
      id: 'one-pass-table',
      name: both('a Map from weight to first position, in one pass', 'a dict from weight to first position, in one pass'),
      reference: true,
      match: { time: 'linear', space: 'linear', lookupTable: true, onePass: true },
      time: 'O(n)',
      space: 'O(n)',
      sections: {
        baseline: {
          say: [
            'The straightforward approach would be to check every pair: for each j, look at every i before it. It works because it tries every possible pair, in an order that respects the tie rule, but it takes O(n²) time because for each package it rereads all the packages before it.',
          ],
          why: 'A correct baseline shows you can solve the problem at all, and naming where its time goes tells you what an improvement has to remove.',
        },
        improve: {
          say: [
            'The repeated work here is searching the earlier packages again for every j, when all I need is one specific weight: the target minus the current weight. We could avoid that by remembering the packages we’ve already seen in a lookup table, so finding the partner becomes a single lookup.',
          ],
          why: 'Pointing at the exact repeated work makes the improvement sound reasoned rather than memorized.',
        },
        approach: {
          say: [
            both(
              'I’ll use a Map to keep track of the first position where each weight appeared. As I process each package, I’ll compute its partner, the target minus its weight, and look the partner up; if it’s there, I return the stored position and the current one. The important property we maintain is that the map only ever holds packages before the current one, each with the first position where it appeared.',
              'I’ll use a dict to keep track of the first position where each weight appeared. As I process each package, I’ll compute its partner, the target minus its weight, and look the partner up; if it’s there, I return the stored position and the current one. The important property we maintain is that the dict only ever holds packages before the current one, each with the first position where it appeared.',
            ),
          ],
          why: 'Saying the invariant out loud is what convinces an interviewer the approach is correct, not just familiar.',
          code: [
            { javascript: 'const firstIndex = new Map();', python: 'firstIndex = {}' },
            { javascript: 'const partner = target - weights[j];', python: 'partner = target - weights[j]' },
          ],
        },
        narrate: {
          say: [
            'I’m doing the lookup before I store the current package, because otherwise a package that weighs exactly half the target, like 6 with target 12, would find itself. And I only store a weight the first time I see it, because otherwise a later package of the same weight would replace the smaller i that the tie rule asks for.',
          ],
          why: 'Interviewers listen for why lines come in a particular order; that is where bugs hide.',
          code: [
            { javascript: 'if (firstIndex.has(partner)) {', python: 'if partner in firstIndex:' },
            { javascript: 'if (!firstIndex.has(weights[j])) {', python: 'if weights[j] not in firstIndex:' },
          ],
        },
        test: pairSumTest(''),
        complexity: {
          say: [
            'We process each package once, and each step does one subtraction, at most two lookups and at most one store, each constant time on average. That gives us O(n) time on average and O(n) additional space, since the table can end up holding every weight when no pair exists.',
          ],
          why: 'Deriving the bound from the loop you wrote, and saying “on average” because of hashing, is more convincing than quoting a label.',
        },
        wrapUp: {
          say: [
            'This satisfies the tie rule and never pairs a package with itself, under these assumptions: the input is an array of integers, and lookups in the table take constant time on average. One tradeoff is memory: I store up to n weights to avoid rescanning, and for a handful of packages the nested loops would be just as good.',
          ],
          why: 'A short summary with its assumptions and one honest tradeoff ends the explanation cleanly and invites the follow-up questions.',
        },
      },
    },
    {
      id: 'nested-loops',
      name: 'two nested loops over the pairs',
      reference: false,
      match: { time: 'quadratic', space: 'constant', lookupTable: false },
      time: 'O(n²)',
      space: 'O(1)',
      sections: {
        baseline: {
          say: [
            'The straightforward approach, and the one I’ve written, checks every pair: for each j, every i before it. It works because every possible pair gets tried, and trying them in this order finds the pair the tie rule wants first. It takes O(n²) time because each package is compared with all the ones before it.',
          ],
          why: 'Saying plainly that your solution is the baseline is fine: a correct answer you can explain is worth more than a clever one you can’t.',
        },
        improve: {
          say: [
            'The repeated work here is the inner loop: for each package I search the earlier ones again, when all I need is one weight, the target minus the current one. If speed matters, we could avoid that by remembering earlier weights and their positions in a lookup table, which would make it linear on average.',
          ],
          why: 'Even if you keep the simpler version, showing you can see the next step tells the interviewer you understand its cost.',
        },
        approach: {
          say: [
            'I’ll use two loops to keep track of which pair I’m checking. As I process each package j, I’ll check it against every earlier package i, and return [i, j] for the first pair that adds up to the target. The important property is the order: every pair that finishes at an earlier j has already been checked, so the first match has the smallest j, and the smallest i for it.',
          ],
          why: 'Explaining why the loop order gives the right pair turns a brute-force answer into a reasoned one.',
        },
        narrate: {
          say: [
            'I’m keeping j in the outer loop and i in the inner one, because the tie rule is about the smallest j first. And the inner loop stops before j, because otherwise a package could be paired with itself.',
          ],
          why: 'Loop bounds are where off-by-one mistakes live, so saying them out loud doubles as a check.',
        },
        test: pairSumTest(' And because this is quadratic, I’d mention how it would do on the largest input, 10,000 packages.'),
        complexity: {
          say: [
            'We process each package against every package before it, about n²/2 comparisons, and each comparison costs constant time. That gives us O(n²) time and O(1) additional space, since I only keep the two loop positions.',
          ],
          why: 'Counting the comparisons from your own loops is the derivation interviewers want to hear.',
        },
        wrapUp: {
          say: [
            'This satisfies the tie rule and never pairs a package with itself, under one assumption: the input is an array of integers. One tradeoff is time: with 10,000 packages and no pair, that’s almost 50 million comparisons, and a lookup table would trade O(n) memory for linear time on average.',
          ],
          why: 'Naming the tradeoff yourself shows you chose the simple version knowingly.',
        },
      },
    },
  ],
  requirements: [
    {
      check: 'input-unchanged',
      quote: 'Do not change weights.',
      explain:
        'Your code returns the right positions, but it changed weights while it ran. The rules say the array must stay as given, so the caller still has their own data. If you sorted it, sort a copy that keeps the original positions, or look partners up in a table instead.',
    },
  ],
  probe: {
    sizes: [6, 12, 24],
    ratio: 2,
    inputs: (n) => ({ weights: Array.from({ length: n }, (_, k) => k + 1), target: -1 }),
    unit: 'packages',
  },
};

/* 17. Turn the Chain: linked-list reversal. */

const reverseBaseline: Passage = {
  say: [
    both(
      'The straightforward approach would be to walk the list once, put every node in an array, then go through the array backwards and point each node at the one before it. It works because the array remembers the order while I relink, but it takes O(n) extra space because it keeps a reference to every node; the time is already O(n).',
      'The straightforward approach would be to walk the list once, put every node in a list, then go through that list backwards and point each node at the one before it. It works because the list remembers the order while I relink, but it takes O(n) extra space because it keeps a reference to every node; the time is already O(n).',
    ),
  ],
  why: 'Not every baseline is slow. Here the cost is memory, and saying so precisely sets up the right improvement.',
};

const reverseTest: TestPassage = {
  cases: [
    { from: 'examples', index: 0, note: '7 → 1 → 4 becomes 4 → 1 → 7.' },
    { from: 'tests', index: 0, note: 'Empty list' },
    { from: 'tests', index: 1, note: 'One node' },
    { from: 'examples', index: 1, note: 'Same values, but the two nodes swap places.' },
  ],
  say: [
    both(
      'Let me check a typical case first: 7 → 1 → 4 should come back as 4 → 1 → 7. Then the empty list, which should return null, and a single node, which should end up pointing at nothing. For [5, 5] the values read the same either way, so I’d watch the board to confirm the two nodes really swap.',
      'Let me check a typical case first: 7 → 1 → 4 should come back as 4 → 1 → 7. Then the empty list, which should return None, and a single node, which should end up pointing at nothing. For [5, 5] the values read the same either way, so I’d watch the board to confirm the two nodes really swap.',
    ),
  ],
  why: 'The shortest lists are where a reversal usually breaks, and a case whose values can’t show the difference reminds you to check the links themselves.',
};

const reverseWrapUp = (tradeoff: string): Passage => ({
  say: [
    `This satisfies the rule to reuse the existing nodes, under these assumptions: the list ends and has no cycle, and nothing else depends on its old order. ${tradeoff}`,
  ],
  why: 'Stating the assumptions you relied on, such as no cycle, shows you know exactly when your solution holds.',
});

const recursiveImprove: Passage = {
  say: [
    'The repeated work here is the storage: the extra list of nodes only exists to remember the order. We could avoid that by letting recursion remember it, because each call waits while the rest of the list is handled.',
  ],
  why: 'Explaining what the call stack replaces makes the recursive version sound deliberate.',
};

const recursiveComplexity: Passage = {
  say: [
    'We process each node once, with one call per node, and each call does a constant amount of work besides its nested call. That gives us O(n) time and O(n) additional space, because all n calls are waiting on the call stack at the deepest point.',
  ],
  why: 'Counting the call stack as extra space is the detail interviewers check for in a recursive answer.',
};

const recursiveWrapUp = reverseWrapUp(
  'One tradeoff is the call stack: the tests are small, but the statement allows 5,000 nodes, which is far past this app’s limit of 200 nested calls and can reach a language’s own recursion limit. A loop with three references does the same in O(1) extra space.',
);

const reverseChain: InterviewGuide = {
  exerciseId: 'f75-17',
  understand: {
    say: [
      'Let me make sure I understand. We’re given the first node of a singly linked list, and we need to return the first node of the same list reversed: every next reference points the other way, and the old last node comes first. We do that by re-pointing the existing nodes, not by building new ones.',
    ],
    why: 'Saying “the same nodes” out loud matters here: the rule rules out the easiest wrong solution, copying the values into new nodes.',
  },
  clarify: {
    say: [
      both(
        'I see that I should reuse the existing nodes and only change their next references, and that an empty list returns null. Values can repeat, so I’ll reason about nodes, not values.',
        'I see that I should reuse the existing nodes and only change their next references, and that an empty list returns None. Values can repeat, so I’ll reason about nodes, not values.',
      ),
      'Two things that aren’t stated: can I assume the list ends, with no cycle? And does anything else still hold a reference into this list? After I reverse it, the old head is the tail, so anyone still holding it would see a single node.',
    ],
    why: 'A cycle would make the loop run forever, and shared references decide whether changing the list in place is safe for the caller, so both are worth a quick question.',
    acknowledged: [
      'Reuse the existing nodes: change next references; do not create new nodes.',
      'Empty list: return null (written []).',
      'Values may repeat; each node keeps its own value.',
    ],
  },
  example: {
    case: { from: 'examples', index: 0, note: '7 → 1 → 4 becomes 4 → 1 → 7.' },
    say: [
      'Let me think through a small example. For 7 → 1 → 4, I’d expect 4 → 1 → 7, because every arrow turns around: 1 points back at 7, 4 points back at 1, and 7, which was first, now points at nothing.',
    ],
    why: 'Tracing the arrows by hand shows exactly which link changes, and when, which is the whole problem.',
    moments: [
      {
        say: both(
          'First pass: curr is 7 and prev is null. next has already saved node 1, so 7 can point at null without losing the rest of the list.',
          'First pass: curr is 7 and prev is None. nxt has already saved node 1, so 7 can point at None without losing the rest of the list.',
        ),
        line: { javascript: 'curr.next = prev;', python: 'curr.next = prev' },
        vars: { curr: { node: 7 }, prev: null },
      },
      {
        say: both(
          'Second pass: node 1 turns to point at 7. The reversed part is now 1 → 7 → null.',
          'Second pass: node 1 turns to point at 7. The reversed part is now 1 → 7 → None.',
        ),
        line: { javascript: 'curr.next = prev;', python: 'curr.next = prev' },
        vars: { curr: { node: 1 }, prev: { node: 7 } },
      },
      {
        say: 'Third pass: node 4 turns to point at 1. Every link now runs the other way.',
        line: { javascript: 'curr.next = prev;', python: 'curr.next = prev' },
        vars: { curr: { node: 4 }, prev: { node: 1 } },
      },
      {
        say: 'curr has run off the end, so prev is the new head: node 4.',
        line: { javascript: 'return prev;', python: 'return prev' },
        vars: { prev: { node: 4 }, curr: null },
      },
    ],
  },
  variants: [
    {
      id: 'three-references',
      name: both('three references, prev, curr and next, in one loop', 'three references, prev, curr and nxt, in one loop'),
      reference: true,
      match: { time: 'linear', space: 'constant', recursion: false, nodeArray: false },
      time: 'O(n)',
      space: 'O(1)',
      sections: {
        baseline: reverseBaseline,
        improve: {
          say: [
            'The repeated work here is storage, not time: the extra list remembers every node, but turning one node around only needs the node before it and the node after it. We could avoid that by keeping just those neighbours as I walk.',
          ],
          why: 'Naming what each step really needs is how you find the smaller-memory version.',
        },
        approach: {
          say: [
            both(
              'I’ll use three references to keep track of where I am: prev is the reversed part so far, curr is the node I’m turning around, and next is the rest of the original list. As I process each node, I’ll save next, point curr back at prev, then move prev and curr one step forward. The important property we maintain is that prev is always the head of a correctly reversed list of the nodes I’ve visited.',
              'I’ll use three references to keep track of where I am: prev is the reversed part so far, curr is the node I’m turning around, and nxt is the rest of the original list. As I process each node, I’ll save nxt, point curr back at prev, then move prev and curr one step forward. The important property we maintain is that prev is always the head of a correctly reversed list of the nodes I’ve visited.',
            ),
          ],
          why: 'Naming each reference’s job, and the invariant that ties them together, lets the interviewer follow every pointer change.',
          code: [
            { javascript: 'let prev = null;', python: 'prev = None' },
            { javascript: 'curr.next = prev;', python: 'curr.next = prev' },
          ],
        },
        narrate: {
          say: [
            both(
              'I’m saving curr.next in next before I change curr.next, because otherwise the rest of the list would be lost the moment curr points backwards. And I return prev, not curr, because when the loop ends curr has run off the end, and prev is the last node I turned around.',
              'I’m saving curr.next in nxt before I change curr.next, because otherwise the rest of the list would be lost the moment curr points backwards. And I return prev, not curr, because when the loop ends curr has run off the end, and prev is the last node I turned around.',
            ),
          ],
          why: 'The order of these assignments is the classic place to lose a list; explaining it proves you didn’t get it right by luck.',
          code: [
            { javascript: 'const next = curr.next;', python: 'nxt = curr.next' },
            { javascript: 'return prev;', python: 'return prev' },
          ],
        },
        test: reverseTest,
        complexity: {
          say: [
            'We process each node once, and each step does four reference assignments, which cost constant time. That gives us O(n) time and O(1) additional space: three references, whatever the length.',
          ],
          why: 'Separating the input (the nodes) from the extra space you added is what makes “O(1) space” believable.',
        },
        wrapUp: reverseWrapUp(
          'One tradeoff is that it changes the caller’s list in place: if they still needed the original order, I’d have to copy it first, which costs O(n) memory.',
        ),
      },
    },
    {
      id: 'recursive-on-the-way-back',
      name: 'recursion that turns each link after the nested call returns',
      reference: false,
      match: { time: 'linear', space: 'linear', recursion: true, nodeArray: false, turns: 'back' },
      time: 'O(n)',
      space: 'O(n)',
      sections: {
        baseline: reverseBaseline,
        improve: recursiveImprove,
        approach: {
          say: [
            'I’ll use recursion to keep track of the order. As I process each node, I’ll first reverse everything after it and get back the new head; then, on the way back, I’ll point the next node back at this one and clear this node’s own link. The important property is that when a call returns, the part of the list from its node onward is fully reversed and ends at its node.',
          ],
          why: 'For recursion, the invariant is what each call returns; saying it is what makes the recursion convincing.',
        },
        narrate: {
          say: [
            'I’m turning the link only after the nested call returns, because otherwise I’d lose the way to the rest of the list before reaching it. And each node clears its own next, because otherwise the old first node would still point at the second one, and the two would point at each other.',
          ],
          why: 'Recursive pointer code is hard to follow silently; narrating what happens before and after the call is what makes it readable.',
        },
        test: reverseTest,
        complexity: recursiveComplexity,
        wrapUp: recursiveWrapUp,
      },
    },
    {
      id: 'recursive-on-the-way-down',
      name: 'recursion that turns each link before the nested call',
      reference: false,
      match: { time: 'linear', space: 'linear', recursion: true, nodeArray: false, turns: 'down' },
      time: 'O(n)',
      space: 'O(n)',
      sections: {
        baseline: reverseBaseline,
        improve: recursiveImprove,
        approach: {
          say: [
            'I’ll use recursion in place of a loop, with each call keeping track of the node to turn around and the reversed part so far. As I process each node, I’ll save the rest of the list, point the node back at the reversed part, and pass the rest on to the next call. The important property is that each call receives a correctly reversed list of every node before it, and the last call returns it.',
          ],
          why: 'Saying what each call receives and passes on makes it clear that this is the same idea as the loop, written as calls.',
        },
        narrate: {
          say: [
            'I’m saving the rest of the list before turning the current node around, because otherwise the nested call would have nothing to continue with. And the call with no node left returns the reversed part, because by then every node has been turned.',
          ],
          why: 'Explaining the base case and what it returns is the part of a recursive answer interviewers probe first.',
        },
        test: reverseTest,
        complexity: recursiveComplexity,
        wrapUp: recursiveWrapUp,
      },
    },
    {
      id: 'collect-and-relink',
      name: both('an array of the nodes, relinked from the end', 'a list of the nodes, relinked from the end'),
      reference: false,
      match: { time: 'linear', space: 'linear', recursion: false, nodeArray: true },
      time: 'O(n)',
      space: 'O(n)',
      sections: {
        baseline: {
          say: [
            both(
              'The straightforward approach, and the one I’ve written, walks the list once and stores every node in an array, then relinks them from the end. It works because the array remembers the original order while I change the links, and it takes O(n) extra space because it keeps every node; the time is O(n).',
              'The straightforward approach, and the one I’ve written, walks the list once and stores every node in a list, then relinks them from the end. It works because that list remembers the original order while I change the links, and it takes O(n) extra space because it keeps every node; the time is O(n).',
            ),
          ],
          why: 'Saying plainly that your solution is the baseline is fine; what matters is that you know its cost.',
        },
        improve: {
          say: [
            'The repeated work here is the storage: turning a node around only needs its neighbours, so keeping every node isn’t strictly necessary. If memory mattered, we could avoid that by keeping three references, the previous node, the current one and the next one, which needs only O(1) extra space.',
          ],
          why: 'Showing the next step, even if you keep your version, tells the interviewer you understand what it costs.',
        },
        approach: {
          say: [
            both(
              'I’ll use an array of the nodes to keep track of their original order. As I process each node from the end, I’ll point it at the one before it, and finally point the old first node at nothing. The important property is that the stored order never changes while I relink.',
              'I’ll use a list of the nodes to keep track of their original order. As I process each node from the end, I’ll point it at the one before it, and finally point the old first node at nothing. The important property is that the stored order never changes while I relink.',
            ),
          ],
          why: 'Explaining why the stored order stays reliable is what makes this version obviously correct.',
        },
        narrate: {
          say: [
            both(
              'I’m collecting every node before changing any link, because otherwise I’d lose the way to the rest of the list. And I set the old first node’s next to null at the end, because otherwise it would still point at the second node, and the two would point at each other.',
              'I’m collecting every node before changing any link, because otherwise I’d lose the way to the rest of the list. And I set the old first node’s next to None at the end, because otherwise it would still point at the second node, and the two would point at each other.',
            ),
          ],
          why: 'The last link is the easy one to forget; naming it shows you thought about where the list ends.',
        },
        test: reverseTest,
        complexity: {
          say: [
            'We process each node twice, once to collect it and once to relink it, each in constant time. That gives us O(n) time and O(n) additional space for the stored references.',
          ],
          why: 'Counting the stored references as extra space, separately from the nodes themselves, is the precise answer.',
        },
        wrapUp: reverseWrapUp(
          'One tradeoff is the extra O(n) memory, which three references would avoid; in return, this version is very hard to get wrong.',
        ),
      },
    },
  ],
  requirements: [
    {
      check: 'reuse-nodes',
      quote: 'Reuse the existing nodes: change next references; do not create new nodes.',
      explain:
        'Your code returns the right values, but it created new nodes instead of re-pointing the existing ones. The rules ask for the same nodes, and a caller holding one of them would notice the difference. Try turning the existing links around instead.',
    },
  ],
  probe: {
    sizes: [4, 8, 16],
    ratio: 2,
    inputs: (n) => ({ head: Array.from({ length: n }, (_, k) => k) }),
    unit: 'nodes',
  },
};

/* 26. Find the Reading: binary search. */

const searchBaseline: Passage = {
  say: [
    'The straightforward approach would be to scan from the left and return the position where I find target. It works because it checks every reading, but it takes O(n) time because it ignores the sorted order, and the statement asks for O(log n), so it can only be a starting point.',
  ],
  why: 'Mentioning the scan and why it isn’t enough shows you noticed the stated time requirement.',
};

const searchImprove: Passage = {
  say: [
    'The repeated work here is reading values that the order already rules out: once I see a reading smaller than target, everything before it is smaller too. We could avoid that by comparing with the middle of what’s left and throwing away the half that can’t hold target.',
  ],
  why: 'Tying the improvement to the sorted order explains why binary search applies, instead of just naming it.',
};

const searchTest: TestPassage = {
  cases: [
    { from: 'examples', index: 0, note: 'Found at index 4.' },
    { from: 'tests', index: 0, note: 'No readings' },
    { from: 'tests', index: 1, note: 'One reading, found' },
    { from: 'tests', index: 4, note: 'Last of two' },
    { from: 'examples', index: 1, note: '6 would sit between 5 and 8, but it is not there.' },
  ],
  say: [
    'Let me check a typical case first: 19 in [2, 5, 8, 12, 19, 23] should give 4. Then the edges, since that’s where binary searches break: an empty array, which returns -1 without reading anything; a single reading equal to target; and the last of two readings, where the search has to move past the first. Finally a missing target, 6, which should end with nothing left to search and -1.',
  ],
  why: 'Binary search bugs almost always sit at the boundaries, so choosing boundary cases shows you know where to look.',
};

const searchWrapUp = (tradeoff: string): Passage => ({
  say: [
    `This satisfies the O(log n) requirement under these assumptions: readings really is sorted from smallest to largest with distinct values, and computing the middle can’t overflow at these sizes. ${tradeoff}`,
  ],
  why: 'Binary search is only correct on sorted input, so naming that assumption is part of the answer, not a formality.',
});

const findReading: InterviewGuide = {
  exerciseId: 'f75-26',
  understand: {
    say: [
      'Let me make sure I understand. We’re given readings, sorted from smallest to largest with no repeats, and a target, and we need to return the position of target, or -1 if it isn’t there. It also has to use only O(log n) comparisons, so reading every value isn’t allowed.',
    ],
    why: 'The O(log n) requirement decides the whole approach, so it belongs in your restatement.',
  },
  clarify: {
    say: [
      'I see that the readings are sorted and distinct, so the position is unique, and that an empty array returns -1. I also won’t change readings.',
      'One thing that isn’t stated: will readings change between searches, or will we search the same array many times? If it changes often, keeping it sorted costs time on every change, and that might change the design. And I’ll assume computing the middle as (low + high) / 2 is safe here, since positions stay under 100,000.',
    ],
    why: 'The stated rules already answer the usual questions, so acknowledging them and asking about how the data is used next is the more useful conversation.',
    acknowledged: ['Values are distinct, so the index is unique.', 'Empty array: return -1.', 'Do not change readings.'],
  },
  example: {
    case: { from: 'examples', index: 0, note: 'Found at index 4.' },
    say: [
      'Let me think through a small example. For readings [2, 5, 8, 12, 19, 23] and target 19, I’d expect 4, because 19 is the fifth reading. Comparing with the middle first, 8, rules out everything up to it, and the next middle is 19 itself: two reads instead of five.',
    ],
    why: 'Counting the reads in the example makes the O(log n) claim concrete before you write any code.',
    moments: [
      {
        say: 'low and high start at the two ends: every position could still hold 19.',
        line: { javascript: 'while (low <= high) {', python: 'while low <= high:' },
        vars: { low: 0, high: 5 },
      },
      {
        say: 'The window is 0 to 5 and mid is 2. readings[2] is 8, smaller than 19, so 19 can only be to the right: low becomes 3.',
        line: { javascript: 'if (readings[mid] === target) return mid;', python: 'if readings[mid] == target:' },
        vars: { low: 0, high: 5, mid: 2 },
      },
      {
        say: 'Now the window is 3 to 5 and mid is 4. readings[4] is 19: found, after reading only two values.',
        line: { javascript: 'if (readings[mid] === target) return mid;', python: 'if readings[mid] == target:' },
        vars: { low: 3, high: 5, mid: 4 },
      },
    ],
  },
  variants: [
    {
      id: 'loop-window',
      name: 'a low..high window, halved in a loop',
      reference: true,
      match: { time: 'log', space: 'constant', recursion: false },
      time: 'O(log n)',
      space: 'O(1)',
      sections: {
        baseline: searchBaseline,
        improve: searchImprove,
        approach: {
          say: [
            'I’ll use two indexes, low and high, to keep track of the window of positions that could still hold target, both ends included. As I process each step, I’ll read the middle of the window and move low past it or high before it. The important property we maintain is that if target is in readings at all, its position is between low and high.',
          ],
          why: 'The invariant is what justifies throwing half the array away, so it is the heart of the explanation.',
          code: [
            { javascript: 'while (low <= high) {', python: 'while low <= high:' },
            { javascript: 'const mid = Math.floor((low + high) / 2);', python: 'mid = (low + high) // 2' },
          ],
        },
        narrate: {
          say: [
            'I’m checking whether the middle reading is target before moving either end, because otherwise the window would move past mid even when mid holds target. I loop while low <= high, not low < high, because otherwise a window of one position would never be checked, and [4] with target 4 would return -1. And I set low to mid + 1, not mid, because otherwise a window of two positions could stop shrinking and the loop would never end.',
          ],
          why: 'These choices are the classic binary search bugs; explaining them shows you know why your version is right.',
          code: [
            { javascript: 'if (readings[mid] === target) return mid;', python: 'if readings[mid] == target:' },
            { javascript: 'low = mid + 1;', python: 'low = mid + 1' },
            { javascript: 'high = mid - 1;', python: 'high = mid - 1' },
          ],
        },
        test: searchTest,
        complexity: {
          say: [
            'We process a window that at least halves on every pass, and each pass costs a constant number of comparisons. That gives us O(log n) time, at most 17 passes for 100,000 readings, and O(1) additional space for low, high and mid.',
          ],
          why: 'Turning the halving into a concrete pass count makes the logarithm tangible.',
        },
        wrapUp: searchWrapUp(
          'One tradeoff is that it depends entirely on the sorted order: if the data changed constantly, keeping it sorted could cost more than the searches save.',
        ),
      },
    },
    {
      id: 'recursive-range',
      name: 'a recursive search that halves the range',
      reference: false,
      match: { time: 'log', space: 'log', recursion: true },
      time: 'O(log n)',
      space: 'O(log n)',
      sections: {
        baseline: searchBaseline,
        improve: searchImprove,
        approach: {
          say: [
            'I’ll use recursion to keep track of the range that could still hold target. As I process each call, I’ll read the middle of its range and call the function again on the half that can still contain target. The important property is that if target is in readings at all, it’s inside the range the current call was given.',
          ],
          why: 'For recursion, saying what each call is responsible for is what makes it convincing.',
        },
        narrate: {
          say: [
            'I’m checking for an empty range first, before reading the middle, because otherwise the search for a missing target would never stop: an empty range returns -1. And I pass on only the range after mid or before mid, never mid itself, because otherwise a range could stop shrinking.',
          ],
          why: 'The base case and the shrinking range are exactly what an interviewer checks in a recursive search.',
        },
        test: searchTest,
        complexity: {
          say: [
            'We process a range that at least halves with every call, and each call does a constant number of comparisons. That gives us O(log n) time and O(log n) additional space, because the calls wait on each other: at most 17 nested calls for 100,000 readings.',
          ],
          why: 'Counting the waiting calls as space is the detail that separates a careful answer from a quick one.',
        },
        wrapUp: searchWrapUp(
          'One tradeoff is the call stack: it’s only logarithmic, so it’s fine here, but a loop does the same work in O(1) extra space.',
        ),
      },
    },
  ],
  requirements: [
    {
      check: 'logarithmic-time',
      quote: 'Use a method that needs only O(log n) comparisons.',
      explain:
        'Your code returns the right positions, but its steps grew in proportion to the number of readings: it reads them one by one. The statement asks for O(log n) comparisons, which means using the sorted order to rule out half of what’s left with every comparison.',
    },
    {
      check: 'input-unchanged',
      quote: 'Do not change readings.',
      explain: 'Your code returns the right positions, but it changed readings while it ran. The rules say the array must stay as given.',
    },
  ],
  probe: {
    sizes: [16, 64, 256],
    ratio: 4,
    inputs: (n) => ({ readings: Array.from({ length: n }, (_, k) => 2 * k), target: 2 * n + 1 }),
    unit: 'readings',
  },
};

/** Guides by exercise id. Every exercise not listed here has a planned guide. */
export const GUIDES: Record<string, InterviewGuide> = Object.fromEntries(
  [pairSum, reverseChain, findReading].map((g) => [g.exerciseId, g]),
);

export function guideFor(exerciseId: string): InterviewGuide | undefined {
  return GUIDES[exerciseId];
}

/** The authored example approach: the variant that describes the reference answer. */
export function referenceVariant(g: InterviewGuide) {
  return g.variants.find((v) => v.reference)!;
}
