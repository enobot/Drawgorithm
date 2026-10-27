import type { Heap, LiveObjectInfo, Step } from '../trace/types';
import { isTreeObj, nodeValueLabel, type ObjectSnap } from '../viz/analysis';
import { referencePaths } from '../viz/paths';
import { useStore } from '../state/store';

interface Props {
  id: number;
  step: Step;
  heap: Heap;
  /** Build mode: where the node was created and changed. */
  info?: LiveObjectInfo;
  /** Run mode: traversal facts for this node. */
  visited?: boolean;
  returned?: string;
  onClose: () => void;
}

function LineButton({ line, text }: { line: number; text: string }) {
  const revealLine = useStore((s) => s.revealLine);
  return (
    <li>
      <button
        type="button"
        onClick={() => revealLine(line)}
        className="group flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-navy-800"
      >
        <span className="shrink-0 rounded bg-violet-400/20 px-1.5 font-mono text-[11px] font-semibold text-violet-200">line {line}</span>
        <span className="text-[13px] text-navy-200 group-hover:text-navy-100">{text}</span>
      </button>
    </li>
  );
}

/** What the selected node is, who points at it, and which lines of code made it so. */
export function NodeDetails({ id, step, heap, info, visited, returned, onClose }: Props) {
  const h = heap[id] as ObjectSnap | undefined;
  if (!h) return null;
  const paths = referencePaths(id, step.frames, heap);
  const isTree = isTreeObj(h);
  return (
    <aside aria-label="Selected node" className="rounded-xl border border-violet-400/50 bg-navy-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-navy-100">
          Node {nodeValueLabel(h, heap)} <span className="font-normal text-navy-400">({isTree ? 'TreeNode' : 'ListNode'})</span>
        </h3>
        <button type="button" onClick={onClose} className="icon-btn size-7" aria-label="Close node details">
          ✕
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-navy-400">Reached by</dt>
        <dd className="font-mono text-navy-100">{paths.length ? paths.join(', ') : 'nothing (detached)'}</dd>
        {visited !== undefined && (
          <>
            <dt className="text-navy-400">Traversal</dt>
            <dd className="text-navy-100">
              {visited ? 'visited' : 'not visited yet'}
              {returned !== undefined && `, its call returned ${returned}`}
            </dd>
          </>
        )}
      </dl>
      {info && (
        <ul className="mt-2 flex flex-col">
          {info.createdLine !== null && <LineButton line={info.createdLine} text={`Created: ${info.createdSource ?? ''}`} />}
          {info.attached
            .filter((a) => a.line !== info.createdLine)
            .map((a, i) => (
              <LineButton key={`a${i}`} line={a.line} text={a.text} />
            ))}
          {info.changes.map((c, i) => (
            <LineButton key={`c${i}`} line={c.line} text={c.text} />
          ))}
        </ul>
      )}
    </aside>
  );
}
