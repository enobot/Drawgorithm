// Interview 100: an exercise may be "available" only when its content is complete, its
// JavaScript reference passes every example and test in the interpreter, every expected
// output agrees with an independent computation, its starter code runs (and fails at least
// one case), and every drawing it needs is supported. python.test.ts checks the Python answers.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../engine/run';
import { problemById } from '../problems/catalog';
import { deepEqual } from '../problems/compare';
import { ALL_EXERCISES, collectionOf, COLLECTIONS, findExercise } from './collections';
import { LESSONS, SUPPORTED_RENDERERS } from './foundations';
import { INTERVIEW } from './interview';
import { isPracticeId } from './problems';
import type { Exercise, ExerciseCase } from './schema';

/* Independent answers, computed differently from each reference solution. */

const letterCounts = (s: string) => {
  const counts = new Array(26).fill(0);
  for (const ch of s) counts[ch.charCodeAt(0) - 97]++;
  return counts.join(',');
};

interface Tree {
  val: number;
  left: Tree | null;
  right: Tree | null;
}

/** Level-order list (null = missing child) to nodes, the way the app reads tree inputs. */
function buildTree(list: (number | null)[]): Tree | null {
  if (!list.length || list[0] === null) return null;
  const root: Tree = { val: list[0], left: null, right: null };
  const parents = [root];
  let i = 1;
  while (parents.length && i < list.length) {
    const p = parents.shift()!;
    for (const side of ['left', 'right'] as const) {
      if (i < list.length && list[i] !== null) {
        p[side] = { val: list[i] as number, left: null, right: null };
        parents.push(p[side]!);
      }
      i++;
    }
  }
  return root;
}

/** Level order with null for missing children, trailing nulls trimmed; mirrored reads right children first. */
function levelOrder(root: Tree | null, mirrored = false): (number | null)[] {
  const out: (number | null)[] = [];
  const queue: (Tree | null)[] = [root];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === null) {
      out.push(null);
      continue;
    }
    out.push(n.val);
    queue.push(mirrored ? n.right : n.left, mirrored ? n.left : n.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

const allNodes = (n: Tree | null): Tree[] => (n ? [n, ...allNodes(n.left), ...allNodes(n.right)] : []);
const height = (n: Tree | null): number => (n ? 1 + Math.max(height(n.left), height(n.right)) : 0);
const preorder = (n: Tree | null): string => (n ? `(${n.val} ${preorder(n.left)} ${preorder(n.right)})` : '#');

const ROMAN: [string, number][] = [
  ['CM', 900],
  ['M', 1000],
  ['CD', 400],
  ['D', 500],
  ['XC', 90],
  ['C', 100],
  ['XL', 40],
  ['L', 50],
  ['IX', 9],
  ['X', 10],
  ['IV', 4],
  ['V', 5],
  ['I', 1],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INDEPENDENT: Record<string, (x: Record<string, any>) => unknown> = {
  // Sorted letters compared.
  'i100-001': ({ first, second }) => [...first].sort().join('') === [...second].sort().join(''),
  // Every letter the note uses occurs at least as often in the magazine.
  'i100-002': ({ note, magazine }) =>
    [...new Set<string>(note)].every((ch) => [...note].filter((x) => x === ch).length <= [...magazine].filter((x) => x === ch).length),
  // The same pattern of first occurrences.
  'i100-003': ({ plain, coded }) => {
    const pattern = (s: string) => [...s].map((ch) => s.indexOf(ch)).join(',');
    return pattern(plain) === pattern(coded);
  },
  // Count every value; the one with more than half.
  'i100-004': ({ ballots }) => ballots.find((b: number) => ballots.filter((x: number) => x === b).length * 2 > ballots.length),
  // Longest matching token first, from the left.
  'i100-005': ({ numeral }) => {
    let total = 0;
    let rest: string = numeral;
    while (rest) {
      const [token, value] = ROMAN.find(([t]) => rest.startsWith(t))!;
      total += value;
      rest = rest.slice(token.length);
    }
    return total;
  },
  // Compare letter counts with the first word of every existing group.
  'i100-006': ({ words }) => {
    const groups: string[][] = [];
    for (const w of words) {
      const g = groups.find((x) => letterCounts(x[0]) === letterCounts(w));
      if (g) g.push(w);
      else groups.push([w]);
    }
    return groups;
  },
  // Sort the distinct items by count, then by value.
  'i100-007': ({ orders, k }) => {
    const items = [...new Set<number>(orders)];
    const count = (v: number) => orders.filter((x: number) => x === v).length;
    return items.sort((a, b) => count(b) - count(a) || a - b).slice(0, k);
  },
  // Sort the distinct values and scan for the longest step-by-one run.
  'i100-008': ({ badges }) => {
    const sorted = [...new Set<number>(badges)].sort((a, b) => a - b);
    let best = 0;
    let run = 0;
    sorted.forEach((v, i) => {
      run = i > 0 && v === sorted[i - 1] + 1 ? run + 1 : 1;
      best = Math.max(best, run);
    });
    return best;
  },
  // Collect every row, column and box and look for repeats in each.
  'i100-009': ({ board }) => {
    const units: string[][] = [];
    for (let i = 0; i < 9; i++) {
      units.push(board[i]);
      units.push(board.map((row: string[]) => row[i]));
      const box: string[] = [];
      for (let k = 0; k < 9; k++) box.push(board[Math.floor(i / 3) * 3 + Math.floor(k / 3)][(i % 3) * 3 + (k % 3)]);
      units.push(box);
    }
    return units.every((u) => {
      const digits = u.filter((d) => d !== '.');
      return new Set(digits).size === digits.length;
    });
  },
  // Shorten the first name until every name starts with it.
  'i100-010': ({ names }) => {
    if (names.length === 0) return '';
    let candidate: string = names[0];
    while (!names.every((n: string) => n.startsWith(candidate))) candidate = candidate.slice(0, -1);
    return candidate;
  },
  // Recursion: match or skip the first signpost.
  'i100-011': ({ clue, path }) => {
    const found = (c: string, p: string): boolean => !c || (!!p && (c[0] === p[0] ? found(c.slice(1), p.slice(1)) : found(c, p.slice(1))));
    return found(clue, path);
  },
  // Every three positions.
  'i100-012': ({ charges }) => {
    const keys = new Set<string>();
    for (let i = 0; i < charges.length; i++)
      for (let j = i + 1; j < charges.length; j++)
        for (let k = j + 1; k < charges.length; k++)
          if (charges[i] + charges[j] + charges[k] === 0)
            keys.add(JSON.stringify([charges[i], charges[j], charges[k]].sort((a, b) => a - b)));
    return [...keys].map((k) => JSON.parse(k)).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  },
  // Every pair of boards.
  'i100-013': ({ walls }) => {
    let best = 0;
    for (let i = 0; i < walls.length; i++)
      for (let j = i + 1; j < walls.length; j++) best = Math.max(best, Math.min(walls[i], walls[j]) * (j - i));
    return best;
  },
  // Every buy day and later sell day.
  'i100-014': ({ prices }) => {
    let best = 0;
    for (let i = 0; i < prices.length; i++) for (let j = i + 1; j < prices.length; j++) best = Math.max(best, prices[j] - prices[i]);
    return best;
  },
  // Every window: length minus its most common colour.
  'i100-015': ({ stripes, k }) => {
    let best = 0;
    for (let i = 0; i < stripes.length; i++)
      for (let j = i; j < stripes.length; j++) {
        const w = stripes.slice(i, j + 1);
        const most = Math.max(...[...w].map((ch) => [...w].filter((x) => x === ch).length));
        if (w.length - most <= k) best = Math.max(best, w.length);
      }
    return best;
  },
  // Every window of the right length, sorted and compared.
  'i100-016': ({ fragment, text }) => {
    const key = [...fragment].sort().join('');
    for (let i = 0; i + fragment.length <= text.length; i++)
      if ([...text.slice(i, i + fragment.length)].sort().join('') === key) return true;
    return false;
  },
  // Every substring, shortest first, then leftmost.
  'i100-017': ({ text, required }) => {
    if (!required) return '';
    const covers = (w: string) =>
      [...new Set<string>(required)].every((ch) => [...w].filter((x) => x === ch).length >= [...required].filter((x) => x === ch).length);
    for (let len = 1; len <= text.length; len++)
      for (let i = 0; i + len <= text.length; i++) if (covers(text.slice(i, i + len))) return text.slice(i, i + len);
    return '';
  },
  // Every start: cut the chain into words and compare as sorted lists.
  'i100-018': ({ text, words }) => {
    if (words.length === 0) return [];
    const size = words[0].length;
    const key = [...words].sort().join('|');
    const out: number[] = [];
    for (let i = 0; i + size * words.length <= text.length; i++) {
      const parts = Array.from({ length: words.length }, (_, k) => text.slice(i + k * size, i + (k + 1) * size));
      if (parts.sort().join('|') === key) out.push(i);
    }
    return out;
  },
  // A plain array, searched for the minimum every time.
  'i100-019': ({ ops }) => {
    const pile: number[] = [];
    return ops.map((op: [string, number?]) => {
      if (op[0] === 'push') pile.push(op[1]!);
      else if (pile.length && op[0] === 'pop') pile.pop();
      else if (pile.length && op[0] === 'top') return pile[pile.length - 1];
      else if (pile.length && op[0] === 'min') return Math.min(...pile);
      return null;
    });
  },
  // Read from the right: an operator's operands are the two expressions before it.
  'i100-020': ({ tokens }) => {
    let i = tokens.length - 1;
    const read = (): number => {
      const t = tokens[i--];
      if (!['+', '-', '*', '/'].includes(t)) return Number(t);
      const b = read();
      const a = read();
      return t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b);
    };
    return read();
  },
  // A car leads a group when it arrives strictly later than every car ahead of it (exact fractions).
  'i100-021': ({ target, position, speed }) => {
    const cars = position.map((p: number, i: number) => [p, speed[i]]).sort((a: number[], b: number[]) => b[0] - a[0]);
    let groups = 0;
    let slowest: number[] | null = null; // [distance, speed] of the latest arrival ahead
    for (const [p, s] of cars) {
      if (slowest === null || (target - p) * slowest[1] > slowest[0] * s) {
        groups++;
        slowest = [target - p, s];
      }
    }
    return groups;
  },
  // Every range of buildings.
  'i100-022': ({ heights }) => {
    let best = 0;
    for (let i = 0; i < heights.length; i++) {
      let low = Infinity;
      for (let j = i; j < heights.length; j++) {
        low = Math.min(low, heights[j]);
        best = Math.max(best, low * (j - i + 1));
      }
    }
    return best;
  },
  // Recursive descent over the expression without spaces.
  'i100-023': ({ expression }) => {
    const s = expression.replace(/ /g, '');
    let pos = 0;
    const term = (): number => {
      if (s[pos] === '-') {
        pos++;
        return -term();
      }
      if (s[pos] === '(') {
        pos++;
        const v = expr();
        pos++;
        return v;
      }
      const start = pos;
      while (pos < s.length && s[pos] >= '0' && s[pos] <= '9') pos++;
      return Number(s.slice(start, pos));
    };
    const expr = (): number => {
      let v = term();
      while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) v = s[pos++] === '+' ? v + term() : v - term();
      return v;
    };
    return expr();
  },
  'i100-024': ({ readings }) => Math.min(...readings),
  'i100-025': ({ heights }) => heights.indexOf(Math.max(...heights)),
  // Scan every earlier set of the key for the latest time not after the asked one.
  'i100-026': ({ ops }) => {
    const sets: [string, string, string, number][] = [];
    return ops.map((op: [string, string, string | number, number?]) => {
      if (op[0] === 'set') {
        sets.push(op as [string, string, string, number]);
        return null;
      }
      const fit = sets.filter((x) => x[1] === op[1] && x[3] <= (op[2] as number));
      return fit.length ? fit.reduce((a, b) => (b[3] > a[3] ? b : a))[2] : '';
    });
  },
  // Merge and take the middle.
  'i100-027': ({ a, b }) => {
    const all = [...a, ...b].sort((x, y) => x - y);
    const n = all.length;
    return n % 2 ? all[(n - 1) / 2] : (all[n / 2 - 1] + all[n / 2]) / 2;
  },
  'i100-028': ({ head, n }) => head.filter((_: number, i: number) => i !== head.length - n),
  // Alternately from the front and the back.
  'i100-029': ({ head }) => {
    const out: number[] = [];
    for (let i = 0, j = head.length - 1; i <= j; i++, j--) {
      out.push(head[i]);
      if (i !== j) out.push(head[j]);
    }
    return out;
  },
  // A deep copy is written out exactly like its original.
  'i100-030': ({ entries }) => entries,
  // Whole numbers with BigInt.
  'i100-031': ({ a, b }) => {
    const value = (digits: number[]) => BigInt([...digits].reverse().join(''));
    return [...(value(a) + value(b)).toString()].reverse().map(Number);
  },
  // The value that appears more than once.
  'i100-032': ({ tickets }) => tickets.find((t: number) => tickets.indexOf(t) !== tickets.lastIndexOf(t)),
  // Reverse each full chunk of the values.
  'i100-033': ({ head, k }) => {
    const out: number[] = [];
    for (let i = 0; i < head.length; i += k) {
      const chunk = head.slice(i, i + k);
      out.push(...(chunk.length === k ? chunk.reverse() : chunk));
    }
    return out;
  },
  // The mirror's level order is the tree read right child first.
  'i100-034': ({ root }) => levelOrder(buildTree(root), true),
  // A level-order listing determines the tree.
  'i100-035': ({ a, b }) => JSON.stringify(levelOrder(buildTree(a))) === JSON.stringify(levelOrder(buildTree(b))),
  // Symmetric means equal to its own mirror.
  'i100-036': ({ root }) => JSON.stringify(levelOrder(buildTree(root))) === JSON.stringify(levelOrder(buildTree(root), true)),
  // Two breadth-first searches over the tree as an undirected graph.
  'i100-037': ({ root }) => {
    const nodes = allNodes(buildTree(root));
    if (nodes.length === 0) return 0;
    const neighbours = new Map<Tree, Tree[]>(nodes.map((n) => [n, []]));
    for (const n of nodes)
      for (const c of [n.left, n.right])
        if (c) {
          neighbours.get(n)!.push(c);
          neighbours.get(c)!.push(n);
        }
    const farthest = (from: Tree): [Tree, number] => {
      const dist = new Map<Tree, number>([[from, 0]]);
      const queue = [from];
      let last: Tree = from;
      while (queue.length) {
        last = queue.shift()!;
        for (const m of neighbours.get(last)!)
          if (!dist.has(m)) {
            dist.set(m, dist.get(last)! + 1);
            queue.push(m);
          }
      }
      return [last, dist.get(last)!];
    };
    return farthest(farthest(nodes[0])[0])[1];
  },
  // The definition at every node, with heights recomputed each time.
  'i100-038': ({ root }) => allNodes(buildTree(root)).every((n) => Math.abs(height(n.left) - height(n.right)) <= 1),
  // Compare the branch's preorder text with every subtree's.
  'i100-039': ({ tree, branch }) => {
    const b = buildTree(branch);
    if (!b) return true;
    return allNodes(buildTree(tree)).some((n) => preorder(n) === preorder(b));
  },
  // Every root-to-leaf sum, with an explicit stack.
  'i100-040': ({ root, target }) => {
    const r = buildTree(root);
    const sums: number[] = [];
    const stack: [Tree, number][] = r ? [[r, r.val]] : [];
    while (stack.length) {
      const [n, s] = stack.pop()!;
      if (!n.left && !n.right) sums.push(s);
      for (const c of [n.left, n.right]) if (c) stack.push([c, s + c.val]);
    }
    return sums.includes(target);
  },
  // Write the level order directly from index ranges, breadth first.
  'i100-041': ({ values }) => {
    const out: (number | null)[] = [];
    const ranges: ([number, number] | null)[] = [[0, values.length - 1]];
    while (ranges.length) {
      const r = ranges.shift()!;
      if (r === null || r[0] > r[1]) {
        out.push(null);
        continue;
      }
      const mid = Math.floor((r[0] + r[1]) / 2);
      out.push(values[mid]);
      ranges.push(mid - 1 >= r[0] ? [r[0], mid - 1] : null, mid + 1 <= r[1] ? [mid + 1, r[1]] : null);
    }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  },
  // The last node shared by the two search paths from the root.
  'i100-042': ({ root, p, q }) => {
    const path = (v: number) => {
      const out: number[] = [];
      for (let n = buildTree(root); n; n = v < n.val ? n.left : v > n.val ? n.right : null) out.push(n.val);
      return out;
    };
    const a = path(p);
    const b = path(q);
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a[i - 1];
  },
  // Sort every value.
  'i100-043': ({ root, k }) => root.filter((v: number | null) => v !== null).sort((a: number, b: number) => a - b)[k - 1],
  // Split with slices and indexOf.
  'i100-044': ({ preorder, inorder }) => {
    const build = (pre: number[], ino: number[]): Tree | null => {
      if (!pre.length) return null;
      const i = ino.indexOf(pre[0]);
      return { val: pre[0], left: build(pre.slice(1, i + 1), ino.slice(0, i)), right: build(pre.slice(i + 1), ino.slice(i + 1)) };
    };
    return levelOrder(build(preorder, inorder));
  },
  // Collect values by depth with a depth-first walk, then reverse odd depths.
  'i100-045': ({ root }) => {
    const byDepth: number[][] = [];
    const walk = (n: Tree | null, d: number) => {
      if (!n) return;
      (byDepth[d] ??= []).push(n.val);
      walk(n.left, d + 1);
      walk(n.right, d + 1);
    };
    walk(buildTree(root), 0);
    return byDepth.map((level, d) => (d % 2 ? [...level].reverse() : level));
  },
  // Every pair of nodes (and every single node): the sum along the path between them.
  'i100-046': ({ root }) => {
    const nodes = allNodes(buildTree(root));
    const parent = new Map<Tree, Tree | null>();
    for (const n of nodes) for (const c of [n.left, n.right]) if (c) parent.set(c, n);
    const up = (n: Tree) => {
      const out = [n];
      for (let x = parent.get(n); x; x = parent.get(x)) out.push(x);
      return out;
    };
    let best = -Infinity;
    for (const a of nodes)
      for (const b of nodes) {
        const pa = up(a);
        const pb = up(b);
        const meet = pa.find((x) => pb.includes(x))!;
        const sum = [...pa.slice(0, pa.indexOf(meet) + 1), ...pb.slice(0, pb.indexOf(meet))].reduce((s, x) => s + x.val, 0);
        best = Math.max(best, sum);
      }
    return best;
  },
  // Preorder with an explicit stack; the round trip gives back the same tree.
  'i100-047': ({ root }) => {
    const tokens: string[] = [];
    const stack: (Tree | null)[] = [buildTree(root)];
    while (stack.length) {
      const n = stack.pop()!;
      if (!n) tokens.push('#');
      else {
        tokens.push(String(n.val));
        stack.push(n.right, n.left);
      }
    }
    // An empty tree nested in the result reads as null.
    return [tokens.join(','), root.length ? levelOrder(buildTree(root)) : null];
  },
  // Every string of 2n brackets, kept if balanced, sorted.
  'i100-048': ({ n }) => {
    const out: string[] = [];
    for (let mask = 0; mask < 1 << (2 * n); mask++) {
      let s = '';
      let depth = 0;
      let ok = true;
      for (let i = 2 * n - 1; i >= 0; i--) {
        const open = !((mask >> i) & 1);
        s += open ? '(' : ')';
        depth += open ? 1 : -1;
        if (depth < 0) ok = false;
      }
      if (ok && depth === 0) out.push(s);
    }
    return out.sort();
  },
  // How many of each value, tried for every count, then sorted.
  'i100-049': ({ values, target }) => {
    const out: number[][] = [];
    const go = (i: number, left: number, chosen: number[]) => {
      if (i === values.length) {
        if (left === 0) out.push([...chosen].sort((a, b) => a - b));
        return;
      }
      for (let c = 0; c * values[i] <= left; c++) go(i + 1, left - c * values[i], [...chosen, ...Array(c).fill(values[i])]);
    };
    go(0, target, []);
    const cmp = (a: number[], b: number[]) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
      return a.length - b.length;
    };
    return out.sort(cmp);
  },
  // Every bitmask, sorted and deduplicated.
  'i100-050': ({ stickers }) => {
    const keys = new Set<string>();
    for (let mask = 0; mask < 1 << stickers.length; mask++)
      keys.add(JSON.stringify(stickers.filter((_: number, i: number) => (mask >> i) & 1).sort((a: number, b: number) => a - b)));
    const cmp = (a: number[], b: number[]) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
      return a.length - b.length;
    };
    return [...keys].map((k) => JSON.parse(k) as number[]).sort(cmp);
  },
  // Every set of cut positions, kept when every piece is a palindrome, ordered by piece lengths.
  'i100-051': ({ text }) => {
    if (!text) return [[]];
    const ways: string[][] = [];
    for (let mask = 0; mask < 1 << (text.length - 1); mask++) {
      const pieces: string[] = [];
      let start = 0;
      for (let i = 1; i <= text.length; i++)
        if (i === text.length || (mask >> (i - 1)) & 1) {
          pieces.push(text.slice(start, i));
          start = i;
        }
      if (pieces.every((p) => p === [...p].reverse().join(''))) ways.push(pieces);
    }
    const lengths = (w: string[]) => w.map((p) => p.length);
    return ways.sort((a, b) => {
      const la = lengths(a);
      const lb = lengths(b);
      for (let i = 0; i < Math.min(la.length, lb.length); i++) if (la[i] !== lb[i]) return la[i] - lb[i];
      return la.length - lb.length;
    });
  },
  // The product of the keys' letters, built breadth first and sorted.
  'i100-052': ({ digits }) => {
    if (!digits) return [];
    const keys: Record<string, string> = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
    let words = [''];
    for (const d of digits) words = words.flatMap((w) => [...keys[d]].map((ch) => w + ch));
    return words.sort();
  },
  'i100-053': ({ x, n }) => x ** n,
  // Sort the scores so far after every arrival.
  'i100-054': ({ k, scores }) =>
    scores.map((_: number, i: number) => {
      const sorted = scores.slice(0, i + 1).sort((a: number, b: number) => b - a);
      return sorted.length >= k ? sorted[k - 1] : null;
    }),
  // Sort before every round.
  'i100-055': ({ stones }) => {
    const left = [...stones];
    while (left.length > 1) {
      left.sort((a, b) => b - a);
      const [a, b] = left.splice(0, 2);
      if (a !== b) left.push(a - b);
    }
    return left.length ? left[0] : 0;
  },
  // Sort every point.
  'i100-056': ({ points, k }) =>
    [...points]
      .sort((a: number[], b: number[]) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2) || a[0] - b[0] || a[1] - b[1])
      .slice(0, k),
  // Simulate minute by minute, always running the waiting type with the most jobs left.
  'i100-057': ({ tasks, gap }) => {
    const left = new Map<string, number>();
    for (const t of tasks) left.set(t, (left.get(t) ?? 0) + 1);
    const lastRun = new Map<string, number>();
    let done = 0;
    let minute = 0;
    while (done < tasks.length) {
      const ready = [...left.keys()].filter((t) => left.get(t)! > 0 && (!lastRun.has(t) || minute - lastRun.get(t)! > gap));
      if (ready.length) {
        const t = ready.reduce((a, b) => (left.get(b)! > left.get(a)! ? b : a));
        left.set(t, left.get(t)! - 1);
        lastRun.set(t, minute);
        done++;
      }
      minute++;
    }
    return minute;
  },
  // Scan every post, newest first.
  'i100-058': ({ ops }) => {
    const posts: [number, number][] = []; // [user, id] in posting order
    const follows = new Map<number, Set<number>>();
    return ops.map((op: [string, number, number?]) => {
      const [kind, user, other] = op;
      if (kind === 'post') posts.push([user, other!]);
      else if (kind === 'follow') {
        if (!follows.has(user)) follows.set(user, new Set());
        follows.get(user)!.add(other!);
      } else if (kind === 'unfollow') follows.get(user)?.delete(other!);
      else {
        const sees = (u: number) => u === user || !!follows.get(user)?.has(u);
        return posts
          .filter(([u]) => sees(u))
          .reverse()
          .slice(0, 10)
          .map(([, id]) => id);
      }
      return null;
    });
  },
  // Every order of at most k affordable projects.
  'i100-059': ({ k, capital, costs, profits }) => {
    let best = capital;
    const go = (left: number, cap: number, used: boolean[]) => {
      best = Math.max(best, cap);
      if (left === 0) return;
      costs.forEach((c: number, i: number) => {
        if (!used[i] && c <= cap) {
          used[i] = true;
          go(left - 1, cap + profits[i], used);
          used[i] = false;
        }
      });
    };
    go(
      k,
      capital,
      costs.map(() => false),
    );
    return best;
  },
  // A deep copy is written out exactly like its original.
  'i100-060': ({ graph }) => graph,
  // Scan the whole grid every minute until nothing changes.
  'i100-061': ({ grid }) => {
    let g: number[][] = grid.map((r: number[]) => [...r]);
    let minutes = 0;
    for (;;) {
      const next = g.map((row, r) =>
        row.map((v, c) =>
          v === 1 &&
          [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1],
          ].some(([a, b]) => g[a]?.[b] === 2)
            ? 2
            : v,
        ),
      );
      if (JSON.stringify(next) === JSON.stringify(g)) break;
      g = next;
      minutes++;
    }
    return g.some((row) => row.includes(1)) ? -1 : minutes;
  },
  // From every cell, follow the rain downhill and see which seas it reaches.
  'i100-062': ({ heights }) => {
    const rows = heights.length;
    const cols = heights[0].length;
    const reaches = (r0: number, c0: number) => {
      const seen = new Set([`${r0},${c0}`]);
      const todo = [[r0, c0]];
      let north = false;
      let south = false;
      while (todo.length) {
        const [r, c] = todo.pop()!;
        if (r === 0 || c === 0) north = true;
        if (r === rows - 1 || c === cols - 1) south = true;
        for (const [a, b] of [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ])
          if (a >= 0 && b >= 0 && a < rows && b < cols && !seen.has(`${a},${b}`) && heights[a][b] <= heights[r][c]) {
            seen.add(`${a},${b}`);
            todo.push([a, b]);
          }
      }
      return north && south;
    };
    const out: number[][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (reaches(r, c)) out.push([r, c]);
    return out;
  },
  // Flood each open region on its own and see whether it touches the edge.
  'i100-063': ({ board }) => {
    const rows = board.length;
    const cols = board[0].length;
    const out = board.map((r: string[]) => [...r]);
    const done = new Set<string>();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (board[r][c] !== 'O' || done.has(`${r},${c}`)) continue;
        const region = [[r, c]];
        done.add(`${r},${c}`);
        for (let i = 0; i < region.length; i++) {
          const [a, b] = region[i];
          for (const [x, y] of [
            [a - 1, b],
            [a + 1, b],
            [a, b - 1],
            [a, b + 1],
          ])
            if (board[x]?.[y] === 'O' && !done.has(`${x},${y}`)) {
              done.add(`${x},${y}`);
              region.push([x, y]);
            }
        }
        if (!region.some(([a, b]) => a === 0 || b === 0 || a === rows - 1 || b === cols - 1)) for (const [a, b] of region) out[a][b] = 'X';
      }
    return out;
  },
  // Try every order of the courses.
  'i100-064': ({ n, pairs }) => {
    const orders = (left: number[]): number[][] =>
      left.length ? left.flatMap((x) => orders(left.filter((y) => y !== x)).map((o) => [x, ...o])) : [[]];
    return orders(Array.from({ length: n }, (_, i) => i)).some((order) =>
      pairs.every(([course, needed]: number[]) => order.indexOf(needed) < order.indexOf(course)),
    );
  },
  // Every route with at most k stops.
  'i100-065': ({ flights, src, dst, k }) => {
    let best = Infinity;
    const go = (city: number, cost: number, flown: number, seen: Set<number>) => {
      if (city === dst) {
        best = Math.min(best, cost);
        return;
      }
      if (flown === k + 1) return;
      for (const [a, b, price] of flights) if (a === city && !seen.has(b)) go(b, cost + price, flown + 1, new Set([...seen, b]));
    };
    go(src, 0, 0, new Set([src]));
    return best === Infinity ? -1 : best;
  },
  // Breadth-first over every letter change at every position.
  'i100-066': ({ start, end, words }) => {
    const list = new Set<string>(words);
    if (!list.has(end)) return -1;
    let level = [start];
    const seen = new Set([start]);
    for (let steps = 0; level.length; steps++) {
      if (level.includes(end)) return steps;
      const next: string[] = [];
      for (const w of level)
        for (let i = 0; i < w.length; i++)
          for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
            const v = w.slice(0, i) + ch + w.slice(i + 1);
            if (list.has(v) && !seen.has(v)) {
              seen.add(v);
              next.push(v);
            }
          }
      level = next;
    }
    return -1;
  },
  // Every order of the tickets; the smallest complete trip.
  'i100-067': ({ tickets, start }) => {
    let best: string[] | null = null;
    const go = (path: string[], used: boolean[]) => {
      if (path.length === tickets.length + 1) {
        if (!best || path.join(' ') < best.join(' ')) best = [...path];
        return;
      }
      tickets.forEach(([a, b]: string[], i: number) => {
        if (!used[i] && a === path[path.length - 1]) {
          used[i] = true;
          go([...path, b], used);
          used[i] = false;
        }
      });
    };
    go(
      [start],
      tickets.map(() => false),
    );
    return best;
  },
  // Try every level from 0 up.
  'i100-068': ({ grid }) => {
    const n = grid.length;
    for (let level = 0; ; level++) {
      if (grid[0][0] > level) continue;
      const seen = new Set(['0,0']);
      const todo = [[0, 0]];
      while (todo.length) {
        const [r, c] = todo.pop()!;
        for (const [a, b] of [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ])
          if (a >= 0 && b >= 0 && a < n && b < n && !seen.has(`${a},${b}`) && grid[a][b] <= level) {
            seen.add(`${a},${b}`);
            todo.push([a, b]);
          }
      }
      if (seen.has(`${n - 1},${n - 1}`)) return level;
    }
  },
  // Every order of the letters, first in our alphabet first.
  'i100-069': ({ words }) => {
    const letters = [...new Set<string>(words.join(''))].sort();
    const orders = (left: string[]): string[][] =>
      left.length ? left.flatMap((x) => orders(left.filter((y) => y !== x)).map((o) => [x, ...o])) : [[]];
    for (const order of orders(letters)) {
      const rank = (w: string) => [...w].map((ch) => order.indexOf(ch));
      const before = (a: number[], b: number[]) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i];
        return a.length <= b.length;
      };
      if (words.every((w: string, i: number) => i === 0 || before(rank(words[i - 1]), rank(w)))) return order.join('');
    }
    return '';
  },
  // Every set of houses with no two neighbours on the circle.
  'i100-070': ({ donations }) => {
    const n = donations.length;
    if (n === 1) return donations[0];
    let best = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let ok = true;
      for (let i = 0; i < n; i++) if ((mask >> i) & 1 && (mask >> ((i + 1) % n)) & 1) ok = false;
      if (ok)
        best = Math.max(
          best,
          donations.reduce((s: number, d: number, i: number) => ((mask >> i) & 1 ? s + d : s), 0),
        );
    }
    return best;
  },
  // Every substring, longest first, then leftmost.
  'i100-071': ({ text }) => {
    for (let len = text.length; len > 0; len--)
      for (let i = 0; i + len <= text.length; i++) {
        const w = text.slice(i, i + len);
        if (w === [...w].reverse().join('')) return w;
      }
    return '';
  },
  // Every substring, checked.
  'i100-072': ({ text }) => {
    let count = 0;
    for (let i = 0; i < text.length; i++)
      for (let j = i + 1; j <= text.length; j++) {
        const w = text.slice(i, j);
        if (w === [...w].reverse().join('')) count++;
      }
    return count;
  },
  // Recursion over the first letter's reading.
  'i100-073': ({ digits }) => {
    const ways = (rest: string): number => {
      if (!rest) return 1;
      if (rest[0] === '0') return 0;
      let n = ways(rest.slice(1));
      if (rest.length >= 2 && Number(rest.slice(0, 2)) <= 26) n += ways(rest.slice(2));
      return n;
    };
    return ways(digits);
  },
  // Every run.
  'i100-074': ({ values }) => {
    let best = -Infinity;
    for (let i = 0; i < values.length; i++) {
      let product = 1;
      for (let j = i; j < values.length; j++) {
        product *= values[j];
        best = Math.max(best, product);
      }
    }
    return best;
  },
  // Recursion over the first word.
  'i100-075': ({ text, words }) => {
    const memo = new Map<string, boolean>();
    const can = (rest: string): boolean => {
      if (!rest) return true;
      if (!memo.has(rest))
        memo.set(
          rest,
          words.some((w: string) => rest.startsWith(w) && can(rest.slice(w.length))),
        );
      return memo.get(rest)!;
    };
    return can(text);
  },
  // The longest run ending at each value, comparing every earlier value.
  'i100-076': ({ values }) => {
    const best = values.map(() => 1);
    for (let i = 0; i < values.length; i++) for (let j = 0; j < i; j++) if (values[j] < values[i]) best[i] = Math.max(best[i], best[j] + 1);
    return Math.max(0, ...best);
  },
  // Every group of parcels.
  'i100-077': ({ weights }) => {
    const total = weights.reduce((a: number, b: number) => a + b, 0);
    for (let mask = 0; mask < 1 << weights.length; mask++)
      if (2 * weights.reduce((s: number, w: number, i: number) => ((mask >> i) & 1 ? s + w : s), 0) === total) return true;
    return false;
  },
  // Recursion: the next letter comes from a or from b.
  'i100-078': ({ a, b, text }) => {
    if (a.length + b.length !== text.length) return false;
    const go = (i: number, j: number): boolean =>
      i + j === text.length ||
      (i < a.length && a[i] === text[i + j] && go(i + 1, j)) ||
      (j < b.length && b[j] === text[i + j] && go(i, j + 1));
    return go(0, 0);
  },
  // Every path explored, without remembering anything.
  'i100-079': ({ grid }) => {
    const walk = (r: number, c: number): number =>
      1 +
      Math.max(
        0,
        ...[
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ]
          .filter(([a, b]) => grid[a]?.[b] !== undefined && grid[a][b] > grid[r][c])
          .map(([a, b]) => walk(a, b)),
      );
    return Math.max(...grid.flatMap((row: number[], r: number) => row.map((_, c) => walk(r, c))));
  },
  // Every set of kept positions.
  'i100-080': ({ source, target }) => {
    let count = 0;
    const go = (i: number, j: number) => {
      if (j === target.length) {
        count++;
        return;
      }
      for (let k = i; k < source.length; k++) if (source[k] === target[j]) go(k + 1, j + 1);
    };
    go(0, 0);
    return count;
  },
  // Every popping order.
  'i100-081': ({ balloons }) => {
    let best = 0;
    const go = (left: number[], coins: number) => {
      if (!left.length) {
        best = Math.max(best, coins);
        return;
      }
      left.forEach((v, i) => go([...left.slice(0, i), ...left.slice(i + 1)], coins + (left[i - 1] ?? 1) * v * (left[i + 1] ?? 1)));
    };
    go(balloons, 0);
    return best;
  },
  // The platform's own regular expressions (the pattern uses only letters, "." and "*").
  'i100-082': ({ text, pattern }) => new RegExp(`^(?:${pattern})$`).test(text),
  // Recursion over each day: hold, buy or sell.
  'i100-083': ({ k, prices }) => {
    const memo = new Map<string, number>();
    const go = (day: number, left: number, holding: boolean): number => {
      if (day === prices.length) return 0;
      const key = `${day},${left},${holding}`;
      if (!memo.has(key)) {
        let best = go(day + 1, left, holding);
        if (holding) best = Math.max(best, prices[day] + go(day + 1, left, false));
        else if (left > 0) best = Math.max(best, -prices[day] + go(day + 1, left - 1, true));
        memo.set(key, best);
      }
      return memo.get(key)!;
    };
    return go(0, k, false);
  },
  // Every run.
  'i100-084': ({ values }) => {
    let best = -Infinity;
    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      for (let j = i; j < values.length; j++) {
        sum += values[j];
        best = Math.max(best, sum);
      }
    }
    return best;
  },
  // Close a section after i when none of its letters appears later.
  'i100-085': ({ text }) => {
    const sizes: number[] = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const section = text.slice(start, i + 1);
      if ([...section].every((ch) => !text.slice(i + 1).includes(ch))) {
        sizes.push(section.length);
        start = i + 1;
      }
    }
    return sizes;
  },
  // Raise counts until no rule is broken.
  'i100-086': ({ ratings }) => {
    const treats = ratings.map(() => 1);
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < ratings.length; i++)
        for (const j of [i - 1, i + 1])
          if (j >= 0 && j < ratings.length && ratings[i] > ratings[j] && treats[i] <= treats[j]) {
            treats[i] = treats[j] + 1;
            changed = true;
          }
    }
    return treats.reduce((a: number, b: number) => a + b, 0);
  },
  // Every pair of meetings.
  'i100-087': ({ meetings }) =>
    meetings.every(([s1, e1]: number[], i: number) => meetings.every(([s2, e2]: number[], j: number) => i === j || e1 <= s2 || e2 <= s1)),
  // The most meetings running at any moment (ends before starts at the same time).
  'i100-088': ({ meetings }) => {
    const events = meetings.flatMap(([s, e]: number[]) => [
      [s, 1],
      [e, -1],
    ]);
    events.sort((a: number[], b: number[]) => a[0] - b[0] || a[1] - b[1]);
    let now = 0;
    let most = 0;
    for (const [, d] of events) {
      now += d;
      most = Math.max(most, now);
    }
    return most;
  },
  // Sort everything together and merge.
  'i100-089': ({ bookings, fresh }) => {
    const all = [...bookings.map((b: number[]) => [...b]), [...fresh]].sort((a, b) => a[0] - b[0]);
    const out: number[][] = [];
    for (const [s, e] of all) {
      if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
      else out.push([s, e]);
    }
    return out;
  },
  // Consecutive seats share seat − position.
  'i100-090': ({ seats }) => {
    const runs = new Map<number, number[]>();
    seats.forEach((s: number, i: number) => {
      if (!runs.has(s - i)) runs.set(s - i, []);
      runs.get(s - i)!.push(s);
    });
    return [...runs.values()].map((r) => (r.length === 1 ? String(r[0]) : `${r[0]}..${r[r.length - 1]}`));
  },
  // Every interval for every query.
  'i100-091': ({ intervals, queries }) =>
    queries.map((q: number) => {
      const lengths = intervals.filter(([a, b]: number[]) => a <= q && q <= b).map(([a, b]: number[]) => b - a + 1);
      return lengths.length ? Math.min(...lengths) : -1;
    }),
  // Pack the lines first, then size every gap.
  'i100-092': ({ words, width }) => {
    const packed: string[][] = [[]];
    for (const w of words) {
      const line = packed[packed.length - 1];
      if (line.length && [...line, w].join(' ').length > width) packed.push([w]);
      else line.push(w);
    }
    return packed.map((line, n) => {
      if (n === packed.length - 1 || line.length === 1) return line.join(' ').padEnd(width);
      const spaces = width - line.join('').length;
      const gaps = Array.from(
        { length: line.length - 1 },
        (_, g) => Math.floor(spaces / (line.length - 1)) + (g < spaces % (line.length - 1) ? 1 : 0),
      );
      return line.map((w, g) => w + ' '.repeat(gaps[g] ?? 0)).join('');
    });
  },
  'i100-093': ({ n }) => Array.from({ length: n + 1 }, (_, i) => [...i.toString(2)].filter((b) => b === '1').length),
  'i100-094': ({ n }) => parseInt([...n.toString(2).padStart(32, '0')].reverse().join(''), 2),
  // The total of 0..n minus the total of the badges.
  'i100-095': ({ badges }) => (badges.length * (badges.length + 1)) / 2 - badges.reduce((a: number, b: number) => a + b, 0),
  // Remember every number seen.
  'i100-096': ({ n }) => {
    const seen = new Set<number>();
    let x = n;
    while (x !== 1 && !seen.has(x)) {
      seen.add(x);
      x = [...String(x)].reduce((s, d) => s + Number(d) ** 2, 0);
    }
    return x === 1;
  },
  'i100-097': ({ digits }) => [...(BigInt(digits.join('')) + 1n).toString()].map(Number),
  // Take the top row, then turn what is left a quarter turn counterclockwise.
  'i100-098': ({ matrix }) => {
    let m: number[][] = matrix.map((r: number[]) => [...r]);
    const out: number[] = [];
    while (m.length) {
      out.push(...m.shift()!);
      if (!m.length) break;
      m = m[0].map((_, c) => m.map((row) => row[c])).reverse();
    }
    return out;
  },
  // Collect the rows and columns of the zeros first.
  'i100-099': ({ grid }) => {
    const rows = new Set<number>();
    const cols = new Set<number>();
    grid.forEach((row: number[], r: number) =>
      row.forEach((v, c) => {
        if (v === 0) {
          rows.add(r);
          cols.add(c);
        }
      }),
    );
    return grid.map((row: number[], r: number) => row.map((v, c) => (rows.has(r) || cols.has(c) ? 0 : v)));
  },
  // Every pair of points, counting the points on their line by cross products.
  'i100-100': ({ points }) => {
    if (points.length <= 2) return points.length;
    let best = 2;
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) {
        const [a, b] = [points[i], points[j]];
        best = Math.max(best, points.filter((p: number[]) => (b[0] - a[0]) * (p[1] - a[1]) === (b[1] - a[1]) * (p[0] - a[0])).length);
      }
    return best;
  },
};

const available = INTERVIEW.filter((e) => e.status === 'available');

function runCase(e: Exercise, code: string, c: ExerciseCase) {
  const content = e.content!;
  return runProgram({
    code,
    mode: 'function',
    entry: content.entry,
    inputs: content.params.map((p) => ({ name: p.name, value: c.inputs[p.name], kind: p.kind })),
    resultKind: content.resultKind,
  });
}

describe('Interview 100 catalog', () => {
  it('has 100 exercises numbered 1 to 100 with unique ids', () => {
    expect(INTERVIEW.map((e) => e.number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(new Set(INTERVIEW.map((e) => e.id)).size).toBe(100);
  });

  it('has 25 Easy, 53 Medium and 22 Hard exercises', () => {
    const count = (d: string) => INTERVIEW.filter((e) => e.difficulty === d).length;
    expect([count('Easy'), count('Medium'), count('Hard')]).toEqual([25, 53, 22]);
  });

  it('has unique titles, different from every Foundations 75 title', () => {
    const titles = ALL_EXERCISES.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('marks an exercise available exactly when its content exists', () => {
    for (const e of INTERVIEW) expect(!!e.content, e.id).toBe(e.status === 'available');
  });

  it('gives every available exercise complete content', () => {
    for (const e of available) {
      const c = e.content!;
      expect(c.statement.length, e.id).toBeGreaterThan(0);
      expect(c.inputFormat && c.outputFormat, e.id).toBeTruthy();
      expect(c.constraints.length, e.id).toBeGreaterThan(0);
      expect(c.rules.length, e.id).toBeGreaterThan(0);
      expect(c.examples.length, e.id).toBeGreaterThanOrEqual(2);
      expect(c.tests.length, e.id).toBeGreaterThanOrEqual(4);
      expect(c.hints.length, e.id).toBeGreaterThanOrEqual(2);
      expect(c.solution.explanation.length && c.solution.code && c.solution.complexity.assumptions, e.id).toBeTruthy();
      expect(c.visualization.spec, e.id).toBeTruthy();
      expect(c.params.map((p) => p.name).sort(), e.id).toEqual(Object.keys(c.examples[0].inputs).sort());
    }
  });

  it('only marks exercises available when the board supports every drawing they need', () => {
    for (const e of available) {
      for (const r of e.content!.visualization.renderers) expect(SUPPORTED_RENDERERS, `${e.id} needs ${r}`).toContain(r);
    }
  });

  it('points only at real lessons and exercises', () => {
    for (const e of INTERVIEW) {
      for (const l of e.prerequisites) expect(LESSONS[l], `${e.id} → lesson ${l}`).toBeTruthy();
      for (const r of e.related) expect(findExercise(r), `${e.id} → ${r}`).toBeTruthy();
    }
  });

  it('has an independent check for every available exercise', () => {
    for (const e of available) expect(INDEPENDENT[e.id], e.id).toBeTypeOf('function');
  });

  it('opens available exercises as problems with only the visible examples, tagged with the collection', () => {
    for (const e of available) {
      const p = problemById(e.id)!;
      expect(p.starter).toBe(e.content!.starter.javascript);
      expect(p.cases).toHaveLength(e.content!.examples.length);
      expect(p.tags[0]).toBe('Interview 100');
    }
    for (const e of INTERVIEW.filter((x) => x.status === 'planned')) expect(problemById(e.id)).toBeUndefined();
  });
});

describe('practice collections', () => {
  it('give every exercise an id unique across collections, recognized as a practice id', () => {
    const ids = ALL_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(isPracticeId(id), id).toBe(true);
    expect(isPracticeId('lesson-heaps')).toBe(false);
  });

  it('find each exercise and its collection by id', () => {
    for (const c of COLLECTIONS) for (const e of c.exercises) expect(collectionOf(e.id)?.id).toBe(c.id);
    expect(findExercise('i100-001')?.title).toBe('Letter Swap Check');
    expect(findExercise('nope')).toBeUndefined();
  });
});

describe.each(available.map((e) => [e.id, e] as const))('%s', (_id, e) => {
  const content = e.content!;
  const cases = [...content.examples, ...content.tests];

  it('expected outputs agree with an independent computation', () => {
    for (const c of cases) expect(INDEPENDENT[e.id](c.inputs), c.note).toEqual(c.output);
  });

  it('reference solution passes every example and test in the interpreter', () => {
    for (const c of cases) {
      const run = runCase(e, content.solution.code, c);
      expect(run.status, `${c.note}: ${run.error?.message ?? ''}`).toBe('finished');
      expect(deepEqual(run.plainResult, c.output), `${c.note}: got ${JSON.stringify(run.plainResult)}`).toBe(true);
    }
  });

  it('starter code runs without errors', () => {
    const run = runCase(e, content.starter.javascript, content.examples[0]);
    expect(run.status, run.error?.message).toBe('finished');
  });

  it('the checker can tell: the unfinished starter fails at least one case', () => {
    const failing = cases.filter((c) => !deepEqual(runCase(e, content.starter.javascript, c).plainResult, c.output));
    expect(failing.length).toBeGreaterThan(0);
  });
});

describe('Interview 100 rules the outputs alone cannot show', () => {
  it('Majority Vote: the reference keeps no set, map or array of its own', () => {
    const e = findExercise('i100-004')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      // The only object any step can reach is the ballots input.
      expect(new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id)).size, x.note).toBe(1);
    }
  });

  it('Unbroken Badge Run: the reference does linear work, counting each run only from its start', () => {
    const e = findExercise('i100-008')!;
    const badges = Array.from({ length: 60 }, (_, i) => (i * 7) % 61);
    const run = runProgram({
      code: e.content!.solution.code,
      mode: 'function',
      entry: 'longestRun',
      inputs: [{ name: 'badges', value: badges, kind: 'auto' }],
      limits: { maxSteps: 20000 },
    });
    expect(run.status, run.error?.message).toBe('finished');
    // One step per value plus one per run extension: well under n² = 3,600 lookups.
    const extensions = run.steps.flatMap((s) => s.effects).filter((f) => f.type === 'assign' && f.name === 'length').length;
    expect(extensions).toBeLessThanOrEqual(badges.length);
  });

  it('Undoable Minimum: the reference does the same work per operation however tall the pile', () => {
    const e = findExercise('i100-019')!;
    const stepsPerOp = (n: number) => {
      const ops = [...Array.from({ length: n }, (_, i) => ['push', 100 - i]), ...Array.from({ length: n }, () => ['min'])];
      const run = runProgram({
        code: e.content!.solution.code,
        mode: 'function',
        entry: 'minStack',
        inputs: [{ name: 'ops', value: ops, kind: 'auto' }],
        limits: { maxSteps: 20000 },
      });
      expect(run.status, run.error?.message).toBe('finished');
      return run.steps.length / ops.length;
    };
    // Searching the pile for every min would make the work per operation grow with n.
    expect(stepsPerOp(40) / stepsPerOp(10)).toBeLessThan(1.15);
  });

  it('Chain Gap Removal and Fold the Chain: the references reuse the nodes (only a placeholder is created)', () => {
    for (const [id, allowed] of [
      ['i100-028', 1],
      ['i100-029', 0],
    ] as const) {
      const e = findExercise(id)!;
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const created = runCase(e, e.content!.solution.code, x)
          .steps.flatMap((s) => s.effects)
          .filter((f) => f.type === 'create' && f.className === 'ListNode');
        expect(created.length, `${id} ${x.note}`).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it('Shadow Copy: the copy is made of new cards', () => {
    const e = findExercise('i100-030')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      const last = run.steps[run.steps.length - 1];
      const cards = Object.values(last.heap).filter((h) => h.kind === 'object' && h.className === 'Card');
      // The originals and their copies are different objects: twice as many cards as entries.
      expect(cards.length, x.note).toBe(2 * (x.inputs.entries as unknown[]).length);
    }
  });

  it('Repeated Ticket: the reference keeps nothing of its own and never writes to tickets', () => {
    const e = findExercise('i100-032')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      expect(new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id)).size, x.note).toBe(1);
      expect(
        run.steps.flatMap((s) => s.effects).filter((f) => f.type === 'index-write'),
        x.note,
      ).toEqual([]);
    }
  });

  it('Flip in Groups and Mirror the Tree: the references create no nodes (Flip only its placeholder)', () => {
    for (const [id, cls, allowed] of [
      ['i100-033', 'ListNode', 1],
      ['i100-034', 'TreeNode', 0],
    ] as const) {
      const e = findExercise(id)!;
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const created = runCase(e, e.content!.solution.code, x)
          .steps.flatMap((s) => s.effects)
          .filter((f) => f.type === 'create' && f.className === cls);
        expect(created.length, `${id} ${x.note}`).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it('Tree to Text and Back: the rebuilt tree is made of new nodes, one per node', () => {
    const e = findExercise('i100-047')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const created = runCase(e, e.content!.solution.code, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'create' && f.className === 'TreeNode');
      expect(created.length, x.note).toBe((x.inputs.root as unknown[]).filter((v) => v !== null).length);
    }
  });

  it('Fast Power: the reference makes O(log n) calls', () => {
    const e = findExercise('i100-053')!;
    const run = runProgram({
      code: e.content!.solution.code,
      mode: 'function',
      entry: 'fastPower',
      inputs: [
        { name: 'x', value: 1, kind: 'auto' },
        { name: 'n', value: 1000, kind: 'auto' },
      ],
    });
    expect(run.status, run.error?.message).toBe('finished');
    // 1000 halves to 0 in 10 steps, plus the call for 0: 11 calls; one multiplication per call is O(log n).
    expect(run.steps.filter((s) => s.kind === 'enter').length).toBeLessThanOrEqual(Math.ceil(Math.log2(1000)) + 2);
  });

  it('Map Copy: the copy is made of new towns', () => {
    const e = findExercise('i100-060')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      const towns = Object.values(run.steps[run.steps.length - 1].heap).filter((h) => h.kind === 'object' && h.className === 'Vertex');
      expect(towns.length, x.note).toBe(2 * (x.inputs.graph as unknown[]).length);
    }
  });

  it('Steepest Climb: the reference solves each cell once (at most five calls per cell)', () => {
    const e = findExercise('i100-079')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      const calls = run.steps.filter((s) => s.kind === 'enter' && s.frames[s.frames.length - 1].name === 'longest').length;
      const cells = (x.inputs.grid as number[][]).flat().length;
      expect(calls, x.note).toBeLessThanOrEqual(5 * cells);
    }
  });

  it('Missing Badge and Happy Digits: the references keep no set, map or array of their own', () => {
    for (const [id, inputObjects] of [
      ['i100-095', 1],
      ['i100-096', 0],
    ] as const) {
      const e = findExercise(id)!;
      for (const x of [...e.content!.examples, ...e.content!.tests]) {
        const run = runCase(e, e.content!.solution.code, x);
        expect(new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id)).size, `${id} ${x.note}`).toBe(inputObjects);
      }
    }
  });

  it('Zero Spread: the reference creates no array (it marks the grid itself)', () => {
    const e = findExercise('i100-099')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const created = runCase(e, e.content!.solution.code, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'create');
      expect(created, x.note).toEqual([]);
    }
  });
});
