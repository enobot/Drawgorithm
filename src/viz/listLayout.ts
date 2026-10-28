// Stable places for linked-list nodes. Each node keeps the row and column it got when
// it first appeared, so when code re-points `next` the arrows swing to their new
// targets while the nodes stay put (reversing a list flips arrows in place instead of
// reshuffling boxes). A new node goes right after the node that links to it, or just
// before the node it links to, or else starts a new row.
import type { Step } from '../trace/types';
import { buildListDiagram, variableRefs, type ListDiagram } from './analysis';
import type { ShapeOf } from './bindings';

export interface ListSlot {
  row: number;
  col: number;
}

/** Places for every list node across a sequence of states (one diagram per step, in order). */
export function listSlots(diagrams: ListDiagram[]): Map<number, ListSlot> {
  const slots = new Map<number, ListSlot>();
  const taken = new Set<string>();
  let rows = 0;
  const free = (row: number, col: number) => col >= 0 && !taken.has(`${row}:${col}`);
  const put = (id: number, row: number, col: number) => {
    slots.set(id, { row, col });
    taken.add(`${row}:${col}`);
    rows = Math.max(rows, row + 1);
  };
  for (const d of diagrams) {
    for (const chain of d.chains) {
      chain.ids.forEach((id, i) => {
        if (slots.has(id)) return;
        const prev = i > 0 ? slots.get(chain.ids[i - 1]) : undefined;
        if (prev && free(prev.row, prev.col + 1)) return put(id, prev.row, prev.col + 1);
        const j = chain.ids.findIndex((n, k) => k > i && slots.has(n));
        if (j > i) {
          const after = slots.get(chain.ids[j])!;
          if (free(after.row, after.col - (j - i))) return put(id, after.row, after.col - (j - i));
        }
        put(id, rows, prev ? prev.col + 1 : 0);
      });
    }
  }
  return slots;
}

/** Places for the list nodes of a whole run, or undefined when the run has no lists. */
export function listSlotsForSteps(steps: Step[], shapeOf: ShapeOf): Map<number, ListSlot> | undefined {
  const diagrams: ListDiagram[] = [];
  for (const step of steps) {
    const { order, referenced } = variableRefs(step.frames);
    const d = buildListDiagram(step.heap, order, referenced, shapeOf);
    if (d.chains.length) diagrams.push(d);
  }
  return diagrams.length ? listSlots(diagrams) : undefined;
}
