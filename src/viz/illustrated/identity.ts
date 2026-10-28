// Stable identities for the items of one array across a run, so a scene can show the
// same person leaving the front of a line instead of everyone changing places.
// Identities come only from what the trace recorded (items added or removed at an
// end, values overwritten in place). After an operation whose effect on positions
// isn't recorded item by item (sort, splice, ...), every item gets a fresh identity:
// the scene then shows a new arrangement rather than inventing movements.
import type { Step } from '../../trace/types';

export interface ItemTrack {
  /** One identity per item, in array order. */
  ids: string[];
  /** Identity → index of the step where the item joined the array. */
  joined: Map<string, number>;
}

const cache = new WeakMap<Step[], Map<number, (ItemTrack | null)[]>>();

/** Identities of the items of array `arrayId` at every step (null where the array doesn't exist). */
export function trackArrayItems(steps: Step[], arrayId: number): (ItemTrack | null)[] {
  let byArray = cache.get(steps);
  if (!byArray) cache.set(steps, (byArray = new Map()));
  const known = byArray.get(arrayId);
  if (known) return known;

  let next = 0;
  const fresh = (k: number, joined: Map<string, number>) => {
    const id = `i${next++}`;
    joined.set(id, k);
    return id;
  };
  const out: (ItemTrack | null)[] = [];
  let ids: string[] | null = null;
  let joined = new Map<string, number>();
  steps.forEach((step, k) => {
    const arr = step.heap[arrayId];
    if (!arr || arr.kind !== 'array') {
      ids = null;
      out.push(null);
      return;
    }
    if (ids === null) {
      joined = new Map();
      ids = arr.items.map(() => fresh(k, joined));
    } else {
      ids = [...ids];
      for (const e of step.effects) {
        if (!('objId' in e) || e.objId !== arrayId) continue;
        if (e.type === 'array-add') {
          const added = e.values.map(() => fresh(k, joined));
          ids = e.end === 'back' ? [...ids, ...added] : [...added, ...ids];
        } else if (e.type === 'array-remove') {
          ids = e.end === 'front' ? ids.slice(1) : ids.slice(0, -1);
        } else if (e.type === 'array-change') {
          // reverse moves items predictably and fill only rewrites values; anything else starts over.
          if (e.method === 'reverse') ids = [...ids].reverse();
          else if (e.method !== 'fill') ids = arr.items.map(() => fresh(k, joined));
        }
      }
    }
    // Anything the effects don't account for (a truncated snapshot, an unrecorded change) starts over.
    if (ids.length !== arr.items.length) ids = arr.items.map(() => fresh(k, joined));
    out.push({ ids, joined });
  });
  byArray.set(arrayId, out);
  return out;
}

/** Index of the most recent step, at or before `upTo`, where the code read a slot of the array, and which slot. */
export function lastRead(steps: Step[], arrayId: number, upTo: number): { step: number; index: number } | null {
  for (let k = Math.min(upTo, steps.length - 1); k >= 0; k--) {
    const reads = steps[k].effects.filter((e) => e.type === 'index-read' && e.objId === arrayId);
    if (reads.length) {
      const e = reads[reads.length - 1];
      return e.type === 'index-read' ? { step: k, index: e.index } : null;
    }
  }
  return null;
}
