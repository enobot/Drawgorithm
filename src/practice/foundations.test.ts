// Foundations 75: an exercise may be "available" only when its content is complete,
// its reference solution passes every example and test in the interpreter, every
// expected output agrees with an independent computation, its starter code runs,
// and every drawing it needs is supported. Planned exercises carry only a brief.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../engine/run';
import { deepEqual } from '../problems/compare';
import { problemById } from '../problems/catalog';
import { EngineStopped } from '../worker/client';
import { checkExercise } from './check';
import { practiceProblem } from './problems';
import { FOUNDATIONS, LESSONS, SUPPORTED_RENDERERS } from './foundations';
import type { Exercise, ExerciseCase } from './schema';
import { readCallTree } from '../viz/structures';

/** Heap id of a reference value (-1 for anything else). */
const refOf = (v: { t: string; id?: number }) => (v.t === 'ref' ? v.id! : -1);

/* Independent answers, computed differently from each reference solution. */

interface TreeNode {
  v: number;
  l: TreeNode | null;
  r: TreeNode | null;
}

/** Level-order list (null = missing child) to nodes, the way the app reads tree inputs. */
function buildTree(list: (number | null)[]): TreeNode | null {
  if (!list.length || list[0] === null) return null;
  const root: TreeNode = { v: list[0], l: null, r: null };
  const parents = [root];
  let i = 1;
  while (parents.length && i < list.length) {
    const p = parents.shift()!;
    for (const side of ['l', 'r'] as const) {
      if (i < list.length && list[i] !== null) {
        p[side] = { v: list[i] as number, l: null, r: null };
        parents.push(p[side]!);
      }
      i++;
    }
  }
  return root;
}

// Each check receives that exercise's JSON inputs, whose shapes differ per exercise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const INDEPENDENT: Record<string, (x: Record<string, any>) => unknown> = {
  'f75-01': ({ shelf, wanted }) => shelf.indexOf(wanted),
  'f75-02': ({ log }) => new Set(log).size !== log.length,
  'f75-03': ({ codes }) => {
    const out: [string, number][] = [];
    for (const c of codes) {
      const pair = out.find((p) => p[0] === c);
      if (pair) pair[1]++;
      else out.push([c, 1]);
    }
    return out;
  },
  'f75-04': ({ weights, target }) => {
    for (let j = 0; j < weights.length; j++) for (let i = 0; i < j; i++) if (weights[i] + weights[j] === target) return [i, j];
    return [];
  },
  'f75-06': ({ message }) => {
    const s = message.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    return s === [...s].reverse().join('');
  },
  'f75-17': ({ head }) => [...head].reverse(),
  'f75-21': ({ text }) => {
    let s = text;
    let before;
    do {
      before = s;
      s = s.replace('()', '').replace('[]', '').replace('{}', '');
    } while (s !== before);
    return s === '';
  },
  // Every stretch rescanned from scratch.
  'f75-25': ({ readings, k }) =>
    readings.slice(0, readings.length - k + 1).map((_: number, i: number) => Math.max(...readings.slice(i, i + k))),
  'f75-26': ({ readings, target }) => readings.indexOf(target),
  // An unsorted list of waiting tickets; "next" removes one copy of the minimum.
  'f75-41': ({ ops }) => {
    const desk: number[] = [];
    const out: (number | null)[] = [];
    for (const op of ops) {
      if (op[0] === 'add') desk.push(op[1]);
      else if (!desk.length) out.push(null);
      else out.push(desk.splice(desk.indexOf(Math.min(...desk)), 1)[0]);
    }
    return out;
  },
  // Grow the set of reachable towns until no road adds one.
  'f75-46': ({ roads, start, goal }) => {
    const reached = new Set([start]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [a, b] of roads) {
        if (reached.has(a) !== reached.has(b)) {
          reached.add(a);
          reached.add(b);
          grew = true;
        }
      }
    }
    return reached.has(goal);
  },
  // Bellman-Ford style relaxation over the links, n rounds.
  'f75-48': ({ n, links, start, goal }) => {
    const d = Array.from({ length: n }, (_, i) => (i === start ? 0 : Infinity));
    for (let round = 0; round < n; round++) {
      for (const [a, b] of links) {
        d[b] = Math.min(d[b], d[a] + 1);
        d[a] = Math.min(d[a], d[b] + 1);
      }
    }
    return d[goal] === Infinity ? -1 : d[goal];
  },
  // For each ask, search the links made so far.
  'f75-51': ({ events }) => {
    const links: [number, number][] = [];
    const out: boolean[] = [];
    for (const [kind, a, b] of events) {
      if (kind === 'link') {
        links.push([a, b]);
        continue;
      }
      const seen = new Set([a]);
      const todo = [a];
      while (todo.length) {
        const x = todo.pop()!;
        for (const [p, q] of links) {
          for (const [from, to] of [
            [p, q],
            [q, p],
          ]) {
            if (from === x && !seen.has(to)) {
              seen.add(to);
              todo.push(to);
            }
          }
        }
      }
      out.push(seen.has(b));
    }
    return out;
  },
  // A plain list of words, checked with string methods.
  'f75-66': ({ ops }) => {
    const words: string[] = [];
    return ops.map(([kind, text]: [string, string]) => {
      if (kind === 'add') {
        words.push(text);
        return null;
      }
      return kind === 'has' ? words.includes(text) : words.some((w) => w.startsWith(text));
    });
  },
  'f75-34': ({ root }) => {
    const out: number[][] = [];
    const walk = (n: TreeNode | null, depth: number) => {
      if (!n) return;
      (out[depth] ??= []).push(n.v);
      walk(n.l, depth + 1);
      walk(n.r, depth + 1);
    };
    walk(buildTree(root), 0);
    return out;
  },
  'f75-36': ({ n }) => {
    let [a, b] = [1, 1];
    for (let k = 2; k <= n; k++) [a, b] = [b, a + b];
    return b;
  },
  // Multiply everything but one value, directly.
  'f75-05': ({ values }) =>
    values.map((_: number, i: number) => values.reduce((p: number, v: number, j: number) => (j === i ? p : p * v), 1)),
  // Concatenate and sort.
  'f75-07': ({ first, second }) => [...first, ...second].sort((a: number, b: number) => a - b),
  // Count distinct values.
  'f75-08': ({ readings }) => new Set(readings).size,
  // Every pair, same tie rule.
  'f75-09': ({ weights, target }) => {
    let best: number | null = null;
    for (let i = 0; i < weights.length; i++) {
      for (let j = i + 1; j < weights.length; j++) {
        const s = weights[i] + weights[j];
        if (
          best === null ||
          Math.abs(s - target) < Math.abs(best - target) ||
          (Math.abs(s - target) === Math.abs(best - target) && s < best)
        )
          best = s;
      }
    }
    return best;
  },
  // Per column: tallest to the left and right, scanned separately.
  'f75-10': ({ heights }) =>
    heights.reduce((sum: number, h: number, i: number) => {
      const level = Math.min(Math.max(...heights.slice(0, i + 1)), Math.max(...heights.slice(i)));
      return sum + level - h;
    }, 0),
  // Every window summed from scratch.
  'f75-11': ({ readings, k }) =>
    Math.max(
      ...readings
        .slice(0, readings.length - k + 1)
        .map((_: number, i: number) => readings.slice(i, i + k).reduce((a: number, b: number) => a + b, 0)),
    ),
  // Every substring tested with a Set.
  'f75-12': ({ signal }) => {
    let best = 0;
    for (let i = 0; i < signal.length; i++) {
      for (let j = i + 1; j <= signal.length; j++) {
        const part = signal.slice(i, j);
        if (new Set(part).size === part.length) best = Math.max(best, part.length);
      }
    }
    return best;
  },
  // Every run summed from scratch.
  'f75-13': ({ quantities, target }) => {
    let best = 0;
    for (let i = 0; i < quantities.length; i++) {
      let total = 0;
      for (let j = i; j < quantities.length; j++) {
        total += quantities[j];
        if (total >= target) {
          if (best === 0 || j - i + 1 < best) best = j - i + 1;
          break;
        }
      }
    }
    return best;
  },
  // Slice and add for every query.
  'f75-14': ({ values, queries }) =>
    queries.map(([lo, hi]: [number, number]) => values.slice(lo, hi + 1).reduce((a: number, b: number) => a + b, 0)),
  // Every subarray summed from scratch.
  'f75-15': ({ values, target }) => {
    let count = 0;
    for (let i = 0; i < values.length; i++) {
      let total = 0;
      for (let j = i; j < values.length; j++) {
        total += values[j];
        if (total === target) count++;
      }
    }
    return count;
  },
  // The list's values are its input, in order.
  'f75-16': ({ head }) => [...head],
  // Count, then take the second half.
  'f75-18': ({ head }) => head.slice(Math.floor(head.length / 2)),
  // Walk positions with a visited set; the first position seen twice starts the loop.
  'f75-19': ({ head, pos }) => {
    const seen = new Set<number>();
    for (let i = head.length ? 0 : -1; i !== -1; i = i === head.length - 1 ? pos : i + 1) {
      if (seen.has(i)) return i;
      seen.add(i);
    }
    return -1;
  },
  // Concatenate and sort.
  'f75-20': ({ a, b }) => [...a, ...b].sort((x: number, y: number) => x - y),
  // Keep every append as a piece; undo drops the last piece.
  'f75-22': ({ commands }) => {
    const pieces: string[] = [];
    for (const c of commands) {
      if (c[0] === 'append') pieces.push(c[1]);
      else pieces.splice(-1, 1);
    }
    return pieces.join('');
  },
  // Remove colliding neighbours (right-mover then left-mover) until none are left.
  'f75-23': ({ asteroids }) => {
    let line = [...asteroids];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i + 1 < line.length; i++) {
        const [l, r] = [line[i], line[i + 1]];
        if (l > 0 && r < 0) {
          line =
            Math.abs(l) === Math.abs(r)
              ? [...line.slice(0, i), ...line.slice(i + 2)]
              : Math.abs(l) > Math.abs(r)
                ? [...line.slice(0, i + 1), ...line.slice(i + 2)]
                : [...line.slice(0, i), ...line.slice(i + 1)];
          changed = true;
          break;
        }
      }
    }
    return line;
  },
  // Scan ahead from every day.
  'f75-24': ({ temps }) =>
    temps.map((t: number, i: number) => {
      const j = temps.findIndex((u: number, k: number) => k > i && u > t);
      return j === -1 ? 0 : j - i;
    }),
  'f75-27': ({ readings, target }) => (readings.includes(target) ? [readings.indexOf(target), readings.lastIndexOf(target)] : [-1, -1]),
  'f75-28': ({ archive, target }) => archive.indexOf(target),
  'f75-29': ({ cards }) => [...cards].sort((a: number, b: number) => a - b),
  // Try every capacity from the heaviest package up.
  'f75-30': ({ weights, days }) => {
    for (let cap = Math.max(...weights); ; cap++) {
      let used = 1;
      let load = 0;
      for (const w of weights) {
        if (load + w > cap) {
          used++;
          load = 0;
        }
        load += w;
      }
      if (used <= days) return cap;
    }
  },
  // Breadth-first over a separately built tree.
  'f75-31': ({ root }) => {
    const top = buildTree(root);
    if (!top) return [0, 0, 0];
    let nodes = 0;
    let leaves = 0;
    let depth = 0;
    let level: TreeNode[] = [top];
    while (level.length) {
      depth++;
      nodes += level.length;
      leaves += level.filter((n) => !n.l && !n.r).length;
      level = level.flatMap((n) => [n.l, n.r].filter((c): c is TreeNode => c !== null));
    }
    return [nodes, leaves, depth];
  },
  'f75-32': ({ root, target }) => root.includes(target),
  'f75-33': ({ root, target }) => root.includes(target),
  // In-order values must strictly increase.
  'f75-35': ({ root }) => {
    const order: number[] = [];
    const walk = (n: TreeNode | null) => {
      if (!n) return;
      walk(n.l);
      order.push(n.v);
      walk(n.r);
    };
    walk(buildTree(root));
    return order.every((v, i) => i === 0 || order[i - 1] < v);
  },
  // Sort descending and take k.
  'f75-42': ({ readings, k }) => [...readings].sort((a: number, b: number) => b - a).slice(0, k),
  // Flatten and sort.
  'f75-43': ({ streams }) => streams.flat().sort((a: number, b: number) => a - b),
  // Sort the prefix after every reading.
  'f75-44': ({ values }) =>
    values.map((_: number, i: number) => {
      const s = values.slice(0, i + 1).sort((a: number, b: number) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }),
  // Scan every worker's free time for each job.
  'f75-45': ({ n, durations }) => {
    const free = new Array(n).fill(0);
    return durations.map((d: number) => {
      let w = 0;
      for (let k = 1; k < n; k++) if (free[k] < free[w]) w = k;
      const start = free[w];
      free[w] += d;
      return [w, start];
    });
  },
  // Breadth-first search from every unvisited land cell, on a copy.
  'f75-47': ({ grid }) => {
    const seen = grid.map((row: number[]) => row.map(() => false));
    let count = 0;
    grid.forEach((row: number[], r: number) =>
      row.forEach((v: number, c: number) => {
        if (v !== 1 || seen[r][c]) return;
        count++;
        const todo = [[r, c]];
        seen[r][c] = true;
        while (todo.length) {
          const [y, x] = todo.shift()!;
          for (const [dy, dx] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const [ny, nx] = [y + dy, x + dx];
            if (grid[ny]?.[nx] === 1 && !seen[ny][nx]) {
              seen[ny][nx] = true;
              todo.push([ny, nx]);
            }
          }
        }
      }),
    );
    return count;
  },
  // Each round, scan for the smallest task whose prerequisites are all done.
  'f75-49': ({ n, deps }) => {
    const done = new Set<number>();
    const order: number[] = [];
    while (order.length < n) {
      let next = -1;
      for (let t = 0; t < n && next === -1; t++) {
        if (!done.has(t) && deps.every(([b, a]: [number, number]) => a !== t || done.has(b))) next = t;
      }
      if (next === -1) return [];
      done.add(next);
      order.push(next);
    }
    return order;
  },
  // Bellman-Ford: relax every road n times.
  'f75-50': ({ n, roads, source }) => {
    const d = Array.from({ length: n }, (_, i) => (i === source ? 0 : Infinity));
    for (let round = 0; round < n; round++) {
      for (const [a, b, w] of roads) {
        d[b] = Math.min(d[b], d[a] + w);
        d[a] = Math.min(d[a], d[b] + w);
      }
    }
    return d.map((x) => (x === Infinity ? -1 : x));
  },
  // Before each cable, search the cables so far for a path between its ends.
  'f75-52': ({ edges }) => {
    for (let k = 0; k < edges.length; k++) {
      const [a, b] = edges[k];
      const seen = new Set([a]);
      const todo = [a];
      while (todo.length) {
        const x = todo.pop();
        for (const [p, q] of edges.slice(0, k)) {
          for (const [from, to] of [
            [p, q],
            [q, p],
          ]) {
            if (from === x && !seen.has(to)) {
              seen.add(to);
              todo.push(to);
            }
          }
        }
      }
      if (seen.has(b)) return [a, b];
    }
    return [];
  },
  // Count regions from scratch after every addition.
  'f75-53': ({ rows, cols, positions }) => {
    const land = new Set<string>();
    return positions.map(([r, c]: [number, number]) => {
      land.add(`${r},${c}`);
      const seen = new Set<string>();
      let regions = 0;
      for (const cell of land) {
        if (seen.has(cell)) continue;
        regions++;
        const todo = [cell];
        seen.add(cell);
        while (todo.length) {
          const [y, x] = todo.pop()!.split(',').map(Number);
          for (const [ny, nx] of [
            [y + 1, x],
            [y - 1, x],
            [y, x + 1],
            [y, x - 1],
          ]) {
            const key = `${ny},${nx}`;
            if (ny >= 0 && nx >= 0 && ny < rows && nx < cols && land.has(key) && !seen.has(key)) {
              seen.add(key);
              todo.push(key);
            }
          }
        }
      }
      return regions;
    });
  },
  // Prim's algorithm, growing one tree from building 0.
  'f75-54': ({ n, cables }) => {
    const inTree = new Set([0]);
    let total = 0;
    while (inTree.size < n) {
      let best: number[] | null = null;
      for (const [a, b, w] of cables) {
        if (inTree.has(a) !== inTree.has(b) && (!best || w < best[2])) best = [a, b, w];
      }
      if (!best) return total;
      inTree.add(best[0]);
      inTree.add(best[1]);
      total += best[2];
    }
    return total;
  },
  // Connect profiles by shared emails with a breadth-first search.
  'f75-55': ({ profiles }) => {
    const seen = new Set<number>();
    const out: string[][] = [];
    profiles.forEach((_: string[], start: number) => {
      if (seen.has(start)) return;
      const group = [start];
      seen.add(start);
      for (let g = 0; g < group.length; g++) {
        const mine = new Set(profiles[group[g]].slice(1));
        profiles.forEach((p: string[], other: number) => {
          if (!seen.has(other) && p.slice(1).some((e) => mine.has(e))) {
            seen.add(other);
            group.push(other);
          }
        });
      }
      const emails = [...new Set(group.flatMap((i) => profiles[i].slice(1)))].sort();
      out.push([profiles[Math.min(...group)][0], ...emails]);
    });
    return out;
  },
  // Bitmasks from all ones down to zero, with items[0] on the highest bit: take-before-leave order.
  'f75-37': ({ items }) => {
    const n = items.length;
    const out: number[][] = [];
    for (let mask = (1 << n) - 1; mask >= 0; mask--) out.push(items.filter((_: number, i: number) => mask & (1 << (n - 1 - i))));
    return out;
  },
  // Positions in lexicographic order with the next-permutation step, starting from 0, 1, 2, ...
  'f75-38': ({ tokens }) => {
    const p = tokens.map((_: string, i: number) => i);
    const out: string[][] = [p.map((i: number) => tokens[i])];
    for (;;) {
      let i = p.length - 2;
      while (i >= 0 && p[i] > p[i + 1]) i--;
      if (i < 0) return out;
      let j = p.length - 1;
      while (p[j] < p[i]) j--;
      [p[i], p[j]] = [p[j], p[i]];
      p.splice(i + 1, p.length - i - 1, ...p.slice(i + 1).reverse());
      out.push(p.map((k: number) => tokens[k]));
    }
  },
  // Every one of the n^n column choices, counted up in base n (dictionary order), kept when no two share a column or diagonal and none is cracked.
  'f75-40': ({ n, blocked }) => {
    const cracked = new Set(blocked.map(([r, c]: number[]) => `${r},${c}`));
    const out: number[][] = [];
    for (let code = 0; code < n ** n; code++) {
      const cols = Array.from({ length: n }, (_, r) => Math.floor(code / n ** (n - 1 - r)) % n);
      const fits = cols.every((c, r) => !cracked.has(`${r},${c}`));
      const ok = cols.every((c, r) => cols.every((d, q) => q === r || (c !== d && Math.abs(c - d) !== Math.abs(r - q))));
      if (fits && ok) out.push(cols);
    }
    return out;
  },
  // Depth-first search with an explicit set of used cells (the board is never written).
  'f75-39': ({ board, word }) => {
    const used = new Set<string>();
    const from = (r: number, c: number, i: number): boolean => {
      if (board[r]?.[c] !== word[i] || used.has(`${r},${c}`)) return false;
      if (i === word.length - 1) return true;
      used.add(`${r},${c}`);
      const ok = [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ].some(([y, x]) => from(y, x, i + 1));
      used.delete(`${r},${c}`);
      return ok;
    };
    return board.some((row: string[], r: number) => row.some((_: string, c: number) => from(r, c, 0)));
  },
  // Try every way of climbing (1 or 2 steps at a time) from the ground to the top.
  'f75-56': ({ cost }) => {
    const n = cost.length;
    const go = (pos: number): number => (pos >= n ? 0 : cost[pos] + Math.min(go(pos + 1), go(pos + 2)));
    return Math.min(go(0), go(1));
  },
  // Every set of positions with no two neighbours.
  'f75-57': ({ rewards }) => {
    let best = 0;
    for (let mask = 0; mask < 1 << rewards.length; mask++) {
      if (mask & (mask >> 1)) continue;
      let sum = 0;
      rewards.forEach((r: number, i: number) => {
        if (mask & (1 << i)) sum += r;
      });
      best = Math.max(best, sum);
    }
    return best;
  },
  // Breadth-first search over totals: each layer is one more token.
  'f75-58': ({ denominations, target }) => {
    let layer = new Set([0]);
    const seen = new Set([0]);
    for (let tokens = 0; layer.size; tokens++) {
      if (layer.has(target)) return tokens;
      const next = new Set<number>();
      for (const t of layer) {
        for (const d of denominations) {
          if (t + d <= target && !seen.has(t + d)) {
            seen.add(t + d);
            next.add(t + d);
          }
        }
      }
      layer = next;
    }
    return -1;
  },
  // Memoized recursion from the front of both strings.
  'f75-59': ({ a, b }) => {
    const memo = new Map<string, number>();
    const go = (i: number, j: number): number => {
      if (i === a.length || j === b.length) return 0;
      const key = `${i},${j}`;
      if (!memo.has(key)) memo.set(key, a[i] === b[j] ? 1 + go(i + 1, j + 1) : Math.max(go(i + 1, j), go(i, j + 1)));
      return memo.get(key)!;
    };
    return go(0, 0);
  },
  // Memoized recursion from the front of both strings.
  'f75-60': ({ source, target }) => {
    const memo = new Map<string, number>();
    const go = (i: number, j: number): number => {
      if (i === source.length) return target.length - j;
      if (j === target.length) return source.length - i;
      const key = `${i},${j}`;
      if (!memo.has(key)) {
        memo.set(key, source[i] === target[j] ? go(i + 1, j + 1) : 1 + Math.min(go(i + 1, j + 1), go(i + 1, j), go(i, j + 1)));
      }
      return memo.get(key)!;
    };
    return go(0, 0);
  },
  // Mark covered half-steps on a timeline and read the covered runs back.
  'f75-61': ({ intervals }) => {
    const covered = new Set<number>();
    for (const [s, e] of intervals) for (let t = 2 * s; t <= 2 * e; t++) covered.add(t);
    const points = [...covered].sort((x, y) => x - y);
    const out: number[][] = [];
    for (const p of points) {
      const last = out[out.length - 1];
      if (last && p === last[1] * 2 + 1) last[1] = (p + 1) / 2;
      else if (last && p === last[1] * 2) continue;
      else if (p % 2 === 0) out.push([p / 2, p / 2]);
    }
    return out;
  },
  // Every subset of meetings, checked for overlaps.
  'f75-62': ({ meetings }) => {
    let best = 0;
    for (let mask = 0; mask < 1 << meetings.length; mask++) {
      const chosen = meetings.filter((_: number[], i: number) => mask & (1 << i)).sort((x: number[], y: number[]) => x[0] - y[0]);
      if (chosen.every((m: number[], i: number) => i === 0 || chosen[i - 1][1] <= m[0])) best = Math.max(best, chosen.length);
    }
    return best;
  },
  // Mark every reachable stone.
  'f75-63': ({ jumps }) => {
    const reach = jumps.map((_: number, i: number) => i === 0);
    jumps.forEach((j: number, i: number) => {
      if (!reach[i]) return;
      for (let k = 1; k <= j && i + k < jumps.length; k++) reach[i + k] = true;
    });
    return reach[jumps.length - 1];
  },
  // Breadth-first search over pads.
  'f75-64': ({ jumps }) => {
    const dist = jumps.map(() => -1);
    dist[0] = 0;
    const todo = [0];
    while (todo.length) {
      const i = todo.shift()!;
      for (let k = 1; k <= jumps[i] && i + k < jumps.length; k++) {
        if (dist[i + k] === -1) {
          dist[i + k] = dist[i] + 1;
          todo.push(i + k);
        }
      }
    }
    return dist[jumps.length - 1];
  },
  // Drive the loop from every start.
  'f75-65': ({ fuel, cost }) => {
    const n = fuel.length;
    for (let s = 0; s < n; s++) {
      let tank = 0;
      let ok = true;
      for (let k = 0; k < n && ok; k++) {
        const i = (s + k) % n;
        tank += fuel[i] - cost[i];
        if (tank < 0) ok = false;
      }
      if (ok) return s;
    }
    return -1;
  },
  // Filter, de-duplicate and sort for every prefix.
  'f75-67': ({ contacts, typed }) => {
    const names = [...new Set<string>(contacts)].sort();
    return [...typed].map((_: string, i: number) => names.filter((n) => n.startsWith(typed.slice(0, i + 1))).slice(0, 3));
  },
  // A regular expression per pattern (a dot already means any one character).
  'f75-68': ({ ops }) => {
    const words: string[] = [];
    return ops.map(([kind, text]: [string, string]) => {
      if (kind === 'add') {
        words.push(text);
        return null;
      }
      const re = new RegExp(`^${text}$`);
      return words.some((w) => re.test(w));
    });
  },
  // For each word, the shortest root it starts with.
  'f75-69': ({ roots, sentence }) =>
    sentence
      .split(' ')
      .map((w: string) => {
        const fits = roots.filter((r: string) => w.startsWith(r)).sort((a: string, b: string) => a.length - b.length);
        return fits.length ? fits[0] : w;
      })
      .join(' '),
  // Search for each word on its own, with an explicit set of used cells.
  'f75-70': ({ board, words }) => {
    const traceable = (word: string) => {
      const used = new Set<string>();
      const from = (r: number, c: number, i: number): boolean => {
        if (board[r]?.[c] !== word[i] || used.has(`${r},${c}`)) return false;
        if (i === word.length - 1) return true;
        used.add(`${r},${c}`);
        const ok = [
          [r + 1, c],
          [r - 1, c],
          [r, c + 1],
          [r, c - 1],
        ].some(([y, x]) => from(y, x, i + 1));
        used.delete(`${r},${c}`);
        return ok;
      };
      return board.some((row: string[], r: number) => row.some((_: string, c: number) => from(r, c, 0)));
    };
    return [...new Set<string>(words)].filter(traceable).sort();
  },
  // Read each new cell from where it comes from: new[r][c] = old[n - 1 - c][r].
  // The binary string's 1 digits.
  'f75-71': ({ flags }) => [...flags.toString(2)].filter((d) => d === '1').length,
  // Count every id; the one seen once.
  'f75-72': ({ ids }) => {
    const counts = new Map<number, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].find(([, k]) => k === 1)![0];
  },
  'f75-73': ({ matrix }) => matrix.map((row: number[], r: number) => row.map((_: number, c: number) => matrix[matrix.length - 1 - c][r])),
  'f75-74': ({ grid, target }) => grid.flat().includes(target),
  // Keys in an array ordered from least to most recently used.
  'f75-75': ({ capacity, ops }) => {
    const order: number[] = [];
    const values = new Map<number, number>();
    const touch = (k: number) => {
      order.splice(order.indexOf(k), 1);
      order.push(k);
    };
    return ops.map((op: number[] & string[]) => {
      const key = op[1] as unknown as number;
      if (op[0] === 'get') {
        if (!values.has(key)) return -1;
        touch(key);
        return values.get(key);
      }
      if (values.has(key)) {
        touch(key);
      } else {
        if (order.length === capacity) values.delete(order.shift()!);
        order.push(key);
      }
      values.set(key, op[2] as unknown as number);
      return null;
    });
  },
};

const available = FOUNDATIONS.filter((e) => e.status === 'available');

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

describe('Foundations 75 catalog', () => {
  it('has 75 exercises numbered 1 to 75 with unique ids', () => {
    expect(FOUNDATIONS.map((e) => e.number)).toEqual(Array.from({ length: 75 }, (_, i) => i + 1));
    expect(new Set(FOUNDATIONS.map((e) => e.id)).size).toBe(75);
  });

  it('marks an exercise available exactly when its content exists', () => {
    for (const e of FOUNDATIONS) expect(!!e.content, e.id).toBe(e.status === 'available');
    expect(available.length).toBeGreaterThan(0);
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
    const ids = new Set(FOUNDATIONS.map((e) => e.id));
    for (const e of FOUNDATIONS) {
      for (const l of e.prerequisites) expect(LESSONS[l], `${e.id} → lesson ${l}`).toBeTruthy();
      for (const r of e.related) expect(ids.has(r), `${e.id} → ${r}`).toBe(true);
    }
  });

  it('has an independent check for every available exercise', () => {
    for (const e of available) expect(INDEPENDENT[e.id], e.id).toBeTypeOf('function');
  });

  it('opens available exercises as problems with only the visible examples', () => {
    for (const e of available) {
      const p = problemById(e.id)!;
      expect(p.starter).toBe(e.content!.starter.javascript);
      expect(p.cases).toHaveLength(e.content!.examples.length);
    }
    // All 75 are available now, so the planned path is checked on a planned copy of one exercise.
    expect(practiceProblem({ ...FOUNDATIONS[0], status: 'planned', content: undefined })).toBeUndefined();
    for (const e of FOUNDATIONS.filter((x) => x.status === 'planned')) expect(problemById(e.id)).toBeUndefined();
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

describe('Check all tests', () => {
  const e = FOUNDATIONS.find((x) => x.id === 'f75-01')!;
  const run = (req: Parameters<typeof runProgram>[0]) => Promise.resolve(runProgram(req));

  const cases = e.content!.examples.length + e.content!.tests.length;
  /** A runner that counts calls and fails the first `fail` of them with the given error. */
  const failingFirst = (fail: number, error: () => Error) => {
    const calls = { n: 0 };
    const runner = (req: Parameters<typeof runProgram>[0]) => {
      calls.n++;
      return calls.n <= fail ? Promise.reject(error()) : Promise.resolve(runProgram(req));
    };
    return { calls, runner };
  };

  it('reports every case as passed for the reference solution', async () => {
    const results = (await checkExercise(e, e.content!.solution.code, run))!;
    expect(results).toHaveLength(cases);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('reports wrong answers as failed, with expected and actual', async () => {
    const results = (await checkExercise(e, e.content!.starter.javascript, run))!;
    const failed = results.find((r) => r.status === 'failed')!;
    expect(failed.message).toContain('Expected');
  });

  it('retries a case once when the worker itself died, with one result per case', async () => {
    const { calls, runner } = failingFirst(1, () => new EngineStopped('crashed', 'worker died', true));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(results).toHaveLength(cases);
    expect(results.every((r) => r.status === 'passed')).toBe(true);
    expect(calls.n).toBe(cases + 1);
  });

  it('never retries a failure the engine reported: the same code and input fail the same way', async () => {
    const { calls, runner } = failingFirst(Infinity, () => new EngineStopped('crashed', 'engine threw'));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(calls.n).toBe(cases);
    expect(results.every((r) => r.status === 'error' && r.message.includes('not retried'))).toBe(true);
  });

  it('stops after a worker dies twice on one case and marks the rest as not run', async () => {
    const { calls, runner } = failingFirst(Infinity, () => new EngineStopped('crashed', 'worker died', true));
    const results = (await checkExercise(e, e.content!.solution.code, runner))!;
    expect(calls.n).toBe(2);
    expect(results).toHaveLength(cases);
    expect(results[0].message).toContain('stopped twice');
    expect(results.slice(1).every((r) => r.status === 'error' && r.message.startsWith('Not run'))).toBe(true);
    expect(results.some((r) => r.message.includes('not in your code'))).toBe(false);
  });

  it('reports nothing once the check is cancelled, and runs no more cases', async () => {
    const controller = new AbortController();
    let calls = 0;
    const runner = (req: Parameters<typeof runProgram>[0]) => {
      calls++;
      if (calls === 2) controller.abort();
      return Promise.resolve(runProgram(req));
    };
    expect(await checkExercise(e, e.content!.solution.code, runner, controller.signal)).toBeNull();
    expect(calls).toBe(2);
  });

  it('reports nothing when a newer check supersedes it', async () => {
    const { runner } = failingFirst(1, () => new EngineStopped('superseded', 'replaced'));
    expect(await checkExercise(e, e.content!.solution.code, runner)).toBeNull();
  });

  it('reports an error in the learner’s code as an error, not a failure', async () => {
    const results = (await checkExercise(e, 'function findFirst(shelf, wanted) { return shelf.nope.length; }', run))!;
    expect(results.every((r) => r.status === 'error')).toBe(true);
  });
});

describe('exercise rules the outputs alone cannot show', () => {
  it('Turn the Chain: the reference reuses the existing nodes', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-17')!;
    const run = runCase(e, e.content!.solution.code, e.content!.examples[0]);
    const created = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'create');
    expect(created).toEqual([]);
  });

  it('Pick a Subset: the reference makes the whole take/leave decision tree', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-37')!;
    const tree = readCallTree(runCase(e, e.content!.solution.code, e.content!.examples[0]).steps);
    // Three items: 1 + 2 + 4 + 8 calls, every call before the end making exactly two.
    expect(tree.nodes.size).toBe(15);
    for (const n of tree.nodes.values()) expect([0, 2]).toContain(n.children.length);
  });

  it('Arrange the Tokens: the reference makes one call per partial arrangement', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-38')!;
    const tree = readCallTree(runCase(e, e.content!.solution.code, e.content!.examples[0]).steps);
    // Three tokens: 1 + 3 + 6 + 6 calls, and the 6 leaves are the arrangements.
    expect(tree.nodes.size).toBe(16);
    expect([...tree.nodes.values()].filter((n) => !n.children.length)).toHaveLength(6);
  });

  it('Nonattacking Towers: the reference never calls for a threatened or cracked placement', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-40')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const tree = readCallTree(runCase(e, e.content!.solution.code, x).steps);
      const cracked = new Set((x.inputs.blocked as number[][]).map(([r, c]) => `${r},${c}`));
      for (const n of tree.nodes.values()) {
        const cols = JSON.parse(n.args) as number[];
        cols.forEach((c, r) => {
          expect(cracked.has(`${r},${c}`)).toBe(false);
          cols.forEach((d, q) => q !== r && expect(c !== d && Math.abs(c - d) !== Math.abs(r - q)).toBe(true));
        });
      }
    }
  });

  it('Bit Counter: the reference takes one round per raised alarm', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-71')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const rounds = runCase(e, e.content!.solution.code, x)
        .steps.flatMap((s) => s.effects)
        .filter((f) => f.type === 'assign' && f.name === 'rest').length;
      expect(rounds).toBe(x.output);
    }
  });

  it('Lone Identifier: the reference keeps no set, map or array of its own', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-72')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      const ids = new Set(run.steps.flatMap((s) => Object.values(s.heap)).map((h) => h.id));
      // The only object any step can reach is the ids input.
      expect(ids.size).toBe(1);
    }
  });

  it('Looping Conveyor: the reference changes no next field and keeps no visited collection', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-19')!;
    for (const x of [...e.content!.examples, ...e.content!.tests]) {
      const run = runCase(e, e.content!.solution.code, x);
      expect(run.steps.flatMap((s) => s.effects).filter((f) => f.type === 'prop-write')).toEqual([]);
      // Every object any step can reach is one of the input's trays: no set, map or array.
      const others = run.steps.flatMap((s) => Object.values(s.heap)).filter((h) => h.kind !== 'object' || h.className !== 'ListNode');
      expect(others).toEqual([]);
    }
  });

  it('Find the Reading: the reference reads O(log n) slots', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-26')!;
    const readings = Array.from({ length: 64 }, (_, i) => i * 3);
    const run = runCase(e, e.content!.solution.code, { inputs: { readings, target: -1 }, output: -1, note: 'missing' });
    const reads = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'index-read').length;
    // Each loop pass reads readings[mid] at most twice; 64 slots need at most 7 passes.
    expect(reads).toBeLessThanOrEqual(14);
  });

  it('Priority Desk: the reference does O(log n) work per operation', () => {
    const c = FOUNDATIONS.find((x) => x.id === 'f75-41')!.content!;
    // n tickets, each more urgent than all before it (every add rises to the top), then n removals.
    const slotsTouched = (n: number) => {
      const ops = [...Array.from({ length: n }, (_, i) => ['add', 1000 - i]), ...Array.from({ length: n }, () => ['next'])];
      const run = runProgram({
        code: c.solution.code,
        mode: 'function',
        entry: c.entry,
        inputs: [{ name: 'ops', value: ops, kind: 'auto' }],
        limits: { maxSteps: 50000 },
      });
      expect(run.status, run.error?.message).toBe('finished');
      expect(run.plainResult).toEqual(Array.from({ length: n }, (_, i) => 1000 - n + 1 + i));
      const heapIds = new Set(
        run.steps.flatMap((s) => s.frames.flatMap((f) => f.vars.filter((v) => v.name === 'heap').map((v) => refOf(v.value)))),
      );
      const touched = run.steps
        .flatMap((s) => s.effects)
        .filter((x) => (x.type === 'index-read' || x.type === 'index-write') && heapIds.has(x.objId)).length;
      return touched / ops.length;
    };
    // From 15 to 63 tickets the heap grows from 4 to 6 levels: measured, the reference's work per operation
    // grows 1.93×, while scanning the whole desk on every removal grows it 3.49×.
    expect(slotsTouched(63) / slotsTouched(15)).toBeLessThan(2.7);
  });

  it('Window Peak Tracker: the reference reads O(n) readings, not O(n·k)', () => {
    const e = FOUNDATIONS.find((x) => x.id === 'f75-25')!;
    const readings = Array.from({ length: 60 }, (_, i) => (i * 37) % 23);
    const k = 20;
    const c = e.content!;
    const run = runProgram({
      code: c.solution.code,
      mode: 'function',
      entry: c.entry,
      inputs: [
        { name: 'readings', value: readings, kind: 'auto' },
        { name: 'k', value: k, kind: 'auto' },
      ],
      limits: { maxSteps: 20000 },
    });
    expect(run.status, run.error?.message).toBe('finished');
    // The first step is before the call, so look for the step where readings is bound.
    const readingsId = run.steps.flatMap((s) => s.frames.flatMap((f) => f.vars)).find((v) => v.name === 'readings')!.value as {
      id: number;
    };
    const reads = run.steps.flatMap((s) => s.effects).filter((x) => x.type === 'index-read' && x.objId === readingsId.id).length;
    // Each index is pushed and popped at most once, and each pop or stop costs two reads: about 5n in all.
    // Rescanning every stretch would read (n - k + 1) · k = 820 readings.
    expect(reads).toBeLessThanOrEqual(5 * readings.length);
  });
});
