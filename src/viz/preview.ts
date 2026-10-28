// Turns problem inputs (JSON) into heap snapshots so the problem panel can draw
// them with the same renderers as a run. This only draws the inputs; it runs no code.
import type { Heap, InputKind, ValueSnap } from '../trace/types';

/** `pos` links a linked list's last node back to the node at that index (-1: no cycle). */
export function previewHeap(value: unknown, kind: InputKind, pos = -1): { heap: Heap; root: ValueSnap } {
  const heap: Heap = {};
  let next = 1;
  const prim = (v: unknown): ValueSnap => {
    if (v === null) return { t: 'null' };
    if (typeof v === 'number') return { t: 'number', v };
    if (typeof v === 'string') return { t: 'string', v };
    if (typeof v === 'boolean') return { t: 'boolean', v };
    return { t: 'undefined' };
  };
  const plain = (v: unknown): ValueSnap => {
    if (Array.isArray(v)) {
      const id = next++;
      heap[id] = { kind: 'array', id, items: [], total: v.length };
      const items = v.slice(0, 200).map(plain);
      heap[id] = { kind: 'array', id, items, total: v.length };
      return { t: 'ref', id };
    }
    return prim(v);
  };
  if (kind === 'tree' && Array.isArray(value)) {
    if (!value.length || value[0] === null) return { heap, root: { t: 'null' } };
    const make = (v: unknown) => {
      const id = next++;
      heap[id] = {
        kind: 'object',
        id,
        className: 'TreeNode',
        entries: [
          ['val', prim(v)],
          ['left', { t: 'null' }],
          ['right', { t: 'null' }],
        ],
      };
      return id;
    };
    const rootId = make(value[0]);
    const queue = [rootId];
    let i = 1;
    while (queue.length && i < value.length) {
      const parent = queue.shift()!;
      for (const side of [1, 2]) {
        if (i >= value.length) break;
        const item = value[i++];
        if (item !== null && item !== undefined) {
          const child = make(item);
          const h = heap[parent];
          if (h.kind === 'object') h.entries[side] = [side === 1 ? 'left' : 'right', { t: 'ref', id: child }];
          queue.push(child);
        }
      }
    }
    return { heap, root: { t: 'ref', id: rootId } };
  }
  if (kind === 'list' && Array.isArray(value)) {
    let nextRef: ValueSnap = { t: 'null' };
    const ids: number[] = [];
    for (let k = value.length - 1; k >= 0; k--) {
      const id = next++;
      heap[id] = {
        kind: 'object',
        id,
        className: 'ListNode',
        entries: [
          ['val', prim(value[k])],
          ['next', nextRef],
        ],
      };
      ids.unshift(id);
      nextRef = { t: 'ref', id };
    }
    const last = heap[ids[ids.length - 1]];
    if (pos >= 0 && pos < ids.length && last?.kind === 'object') last.entries[1] = ['next', { t: 'ref', id: ids[pos] }];
    return { heap, root: nextRef };
  }
  return { heap, root: plain(value) };
}
