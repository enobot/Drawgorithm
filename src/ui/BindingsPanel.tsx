import { useStore } from '../state/store';
import { PLAIN, type ArrayRole, type BindingSource, type NodeShape, type ObjectRole, type ResolvedBindings } from '../viz/bindings';

const SOURCE_LABEL: Record<BindingSource, string> = { convention: 'convention', code: 'from your code', user: 'your choice' };

const ARRAY_OPTIONS: { value: ArrayRole; label: string }[] = [
  { value: 'cells', label: 'Indexed cells' },
  { value: 'stack', label: 'Stack (top at the end)' },
  { value: 'queue', label: 'Queue (front at index 0)' },
  { value: 'deque', label: 'Deque (used at both ends)' },
  { value: 'heap', label: 'Heap (binary tree and cells)' },
  { value: 'union-find', label: 'Union-find (parent links)' },
  { value: 'graph', label: 'Graph: adjacency list' },
  { value: 'edge-list', label: 'Graph: edge list' },
];

const OBJECT_OPTIONS: { value: ObjectRole; label: string }[] = [
  { value: 'plain', label: 'Plain fields' },
  { value: 'graph', label: 'Graph (key → neighbors)' },
  { value: 'trie', label: 'Trie (letters → child nodes)' },
];

const KIND_OPTIONS: { value: NodeShape['kind']; label: string }[] = [
  { value: 'tree', label: 'Binary tree' },
  { value: 'list', label: 'Linked list' },
  { value: 'object', label: 'Plain object' },
];

/** A starting shape for a class the user re-binds, guessing fields by name and order. */
function shapeFor(kind: NodeShape['kind'], fields: string[], current?: NodeShape): NodeShape {
  if (kind === 'object') return { kind: 'object' };
  const value =
    (current && current.kind !== 'object' ? current.value : undefined) ?? fields.find((f) => /^(val|value|data|key)$/.test(f)) ?? fields[0];
  const rest = fields.filter((f) => f !== value);
  if (kind === 'list') return { kind: 'list', value, next: rest.find((f) => /next|nxt|link/.test(f)) ?? rest[0] ?? 'next' };
  return {
    kind: 'tree',
    value,
    left: rest.find((f) => /left|^l$/.test(f)) ?? rest[0] ?? 'left',
    right: rest.find((f) => /right|^r$/.test(f)) ?? rest[1] ?? 'right',
  };
}

function FieldSelect({
  label,
  value,
  fields,
  onChange,
}: {
  label: string;
  value: string;
  fields: string[];
  onChange: (f: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-[12px] text-navy-300">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-navy-600 bg-navy-900 px-1 py-0.5 font-mono text-[12px] text-navy-100"
      >
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}

function ShapeEditor({ className, shape, fields }: { className: string; shape: NodeShape | null; fields: string[] }) {
  const bindShape = useStore((s) => s.bindShape);
  const set = (next: NodeShape) => bindShape(className, next);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <select
        aria-label={`Draw ${className} as`}
        value={shape?.kind ?? ''}
        onChange={(e) => set(shapeFor(e.target.value as NodeShape['kind'], fields, shape ?? undefined))}
        className="rounded border border-navy-600 bg-navy-900 px-1.5 py-0.5 text-[12px] text-navy-100"
      >
        {!shape && <option value="">Choose…</option>}
        {KIND_OPTIONS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      {shape && shape.kind !== 'object' && (
        <FieldSelect label="value" value={shape.value} fields={fields} onChange={(f) => set({ ...shape, value: f })} />
      )}
      {shape?.kind === 'tree' && (
        <>
          <FieldSelect label="left" value={shape.left} fields={fields} onChange={(f) => set({ ...shape, left: f })} />
          <FieldSelect label="right" value={shape.right} fields={fields} onChange={(f) => set({ ...shape, right: f })} />
        </>
      )}
      {shape?.kind === 'list' && (
        <FieldSelect label="next" value={shape.next} fields={fields} onChange={(f) => set({ ...shape, next: f })} />
      )}
    </div>
  );
}

/**
 * Shows how the drawing reads the recorded state, why, and lets the user change it.
 * Ambiguous objects are not guessed: they are drawn plainly until the user chooses.
 */
export function BindingsPanel({ bindings }: { bindings: ResolvedBindings }) {
  const bindShape = useStore((s) => s.bindShape);
  const bindArray = useStore((s) => s.bindArray);
  const bindObject = useStore((s) => s.bindObject);
  const shown = bindings.shapes.filter((b) => b.shape.kind !== 'object' || b.source === 'user');
  const count = shown.length + bindings.ambiguous.length + bindings.arrays.length + bindings.objects.length;
  if (count === 0) return null;
  const needsChoice = bindings.ambiguous.length > 0;
  return (
    <details
      open={needsChoice || undefined}
      className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-[13px] ${needsChoice ? 'border-amber-400/60 bg-amber-400/10' : 'border-navy-600 bg-navy-850'}`}
    >
      <summary className="cursor-pointer select-none font-semibold text-navy-200">
        How this is drawn{needsChoice ? ': needs your choice' : ''}
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        {bindings.ambiguous.map((a) => (
          <div key={a.className} className="flex flex-col gap-1">
            <p className="text-amber-100">
              <span className="font-mono font-semibold">{a.className === PLAIN ? 'Plain objects' : a.className}</span>: {a.reason} It is
              drawn as a plain object until you choose.
            </p>
            <ShapeEditor className={a.className} shape={null} fields={a.fields} />
          </div>
        ))}
        {shown.map((b) => (
          <div key={b.className} className="flex flex-col gap-1">
            <p className="text-navy-200">
              <span className="font-mono font-semibold text-navy-100">{b.className === PLAIN ? 'Plain objects' : b.className}</span>{' '}
              <span className="text-navy-400">
                ({SOURCE_LABEL[b.source]}: {b.reason})
              </span>
              {b.source === 'user' && (
                <button
                  type="button"
                  className="ml-2 text-[12px] text-teal-300 hover:underline"
                  onClick={() => bindShape(b.className, null)}
                >
                  use automatic
                </button>
              )}
            </p>
            <ShapeEditor className={b.className} shape={b.shape} fields={b.fields} />
          </div>
        ))}
        {bindings.arrays.map((a) => (
          <div key={a.name} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-navy-100">{a.name}</span>
              <select
                aria-label={`Draw ${a.name} as`}
                value={a.role}
                onChange={(e) => bindArray(a.name, { role: e.target.value as ArrayRole })}
                className="rounded border border-navy-600 bg-navy-900 px-1.5 py-0.5 text-[12px] text-navy-100"
              >
                {ARRAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-navy-400">
                ({SOURCE_LABEL[a.roleSource]}: {a.roleReason})
              </span>
              {(a.roleSource === 'user' || a.pointerSource === 'user') && (
                <button type="button" className="text-[12px] text-teal-300 hover:underline" onClick={() => bindArray(a.name, null)}>
                  use automatic
                </button>
              )}
            </div>
            {a.candidates.length > 0 && (
              <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-navy-300">
                <legend className="sr-only">Index variables for {a.name}</legend>
                <span>index pointers:</span>
                {a.candidates.map((c) => (
                  <label key={c} className="flex items-center gap-1 font-mono">
                    <input
                      type="checkbox"
                      checked={a.pointers.includes(c)}
                      onChange={(e) =>
                        bindArray(a.name, { pointers: e.target.checked ? [...a.pointers, c] : a.pointers.filter((p) => p !== c) })
                      }
                      className="accent-teal-400"
                    />
                    {c}
                  </label>
                ))}
                <span className="text-navy-400">
                  ({a.pointerSource === 'user' ? 'your choice' : 'detected from indexing like nums[i]'})
                </span>
              </fieldset>
            )}
          </div>
        ))}
        {bindings.objects.map((o) => (
          <div key={o.name} className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-navy-100">{o.name}</span>
            <select
              aria-label={`Draw ${o.name} as`}
              value={o.role}
              onChange={(e) => bindObject(o.name, e.target.value as ObjectRole)}
              className="rounded border border-navy-600 bg-navy-900 px-1.5 py-0.5 text-[12px] text-navy-100"
            >
              {OBJECT_OPTIONS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                  {x.value !== 'plain' && !o.fits.includes(x.value) ? ' (data does not fit yet)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-navy-400">
              ({SOURCE_LABEL[o.source]}: {o.reason})
            </span>
            {o.source === 'user' && (
              <button type="button" className="text-[12px] text-teal-300 hover:underline" onClick={() => bindObject(o.name, null)}>
                use automatic
              </button>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
