import { describe, expect, it } from 'vitest';
import { parseProblemText, splitAssignments, suggestStructures } from './pasted';

describe('reading pasted problem text', () => {
  const text = `Rotate List
Medium
Given the head of a linked list, rotate the list to the right by k places.

Example 1:
Input: head = [1,2,3,4,5], k = 2
Output: [4,5,1,2,3]

Example 2:
Input: head = [0,1,2], k = 4
Output: [2,0,1]

Constraints:
The number of nodes is in the range [0, 500].`;

  it('finds title, examples, inputs and expected outputs', () => {
    const p = parseProblemText(text);
    expect(p.title).toBe('Rotate List');
    expect(p.functionName).toBe('rotateList');
    expect(p.examples).toHaveLength(2);
    expect(p.examples[0].inputs.map((i) => [i.name, i.parsed.value])).toEqual([
      ['head', [1, 2, 3, 4, 5]],
      ['k', 2],
    ]);
    expect(p.examples[1].output?.value).toEqual([2, 0, 1]);
  });

  it('suggests a linked-list input kind only when both the text and the name agree', () => {
    expect(parseProblemText(text).kinds).toEqual({ head: 'list', k: 'auto' });
  });

  it('reads pos next to a linked list as the cycle position', () => {
    const cycle = parseProblemText(`Linked List Cycle
Given head, the head of a linked list, determine if the linked list has a cycle in it.

Example 1:
Input: head = [3,2,0,-4], pos = 1
Output: true`);
    expect(cycle.kinds).toEqual({ head: 'list', pos: 'pos' });
    // Without a linked list in the text, pos is an ordinary value.
    expect(parseProblemText('Example 1:\nInput: nums = [1,2], pos = 1\nOutput: 2').kinds).toEqual({ nums: 'auto', pos: 'auto' });
  });

  it('splits inputs with commas inside strings and brackets', () => {
    expect(splitAssignments('s = "a, b", grid = [[1,2],[3,4]], k = 1')).toEqual([
      { name: 's', raw: '"a, b"' },
      { name: 'grid', raw: '[[1,2],[3,4]]' },
      { name: 'k', raw: '1' },
    ]);
  });
});

describe('suggesting structures from a description', () => {
  it('quotes the words that led to each suggestion', () => {
    const s = suggestStructures('Given the root of a binary tree, return its level order traversal.');
    expect(s).toEqual([
      { structure: 'Binary tree', because: 'binary tree' },
      { structure: 'Queue', because: 'level order' },
    ]);
  });

  it('suggests nothing for text without clues', () => {
    expect(suggestStructures('Return the answer.')).toEqual([]);
  });
});
