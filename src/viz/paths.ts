import type { FrameSnap, Heap } from '../trace/types';
import { refId } from './analysis';

/** Every way to reach an object from a variable: `root.left.right`, `queue[0]`, ... */
export function referencePaths(id: number, frames: FrameSnap[], heap: Heap, max = 6): string[] {
  const out: string[] = [];
  frames.forEach((f, fi) => {
    const prefix = fi === frames.length - 1 || frames.length === 1 ? '' : `${f.label}: `;
    const queue: { obj: number; path: string; depth: number }[] = [];
    const seen = new Set<number>();
    for (const v of f.vars) {
      const r = refId(v.value);
      if (r === null) continue;
      if (r === id) out.push(prefix + v.name);
      queue.push({ obj: r, path: v.name, depth: 0 });
    }
    while (queue.length && out.length < max) {
      const { obj, path, depth } = queue.shift()!;
      if (seen.has(obj) || depth > 8) continue;
      seen.add(obj);
      const h = heap[obj];
      if (!h) continue;
      const children: [string, number | null][] =
        h.kind === 'object'
          ? h.entries.map(([k, v]) => [`${path}.${k}`, refId(v)])
          : h.kind === 'array'
            ? h.items.map((v, i) => [`${path}[${i}]`, refId(v)])
            : [];
      for (const [p, child] of children) {
        if (child === null) continue;
        if (child === id && !out.includes(prefix + p)) out.push(prefix + p);
        queue.push({ obj: child, path: p, depth: depth + 1 });
      }
    }
  });
  return out.slice(0, max);
}
