import { useStore, type VizTab } from '../state/store';
import { BuildView } from './BuildView';
import { RunView } from './RunView';

const TABS: { id: VizTab; label: string; hint: string }[] = [
  { id: 'build', label: 'Build', hint: 'The structure your top-level code creates, redrawn as you type.' },
  { id: 'run', label: 'Run', hint: 'What your code actually does, one step at a time.' },
];

export function VizPanel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const runStatus = useStore((s) => s.run.status);
  const pending = useStore((s) => s.live.result?.status === 'pending');
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-navy-700 px-3 py-2">
        <div role="tablist" aria-label="Visualization mode" className="flex rounded-lg bg-navy-950 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative rounded-md px-3.5 py-1 text-[13px] font-semibold transition-colors ${
                tab === t.id ? 'bg-navy-700 text-navy-100' : 'text-navy-300 hover:text-navy-100'
              }`}
            >
              {t.label}
              {t.id === 'build' && pending && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-300" aria-label="waiting for a line to finish" />
              )}
              {t.id === 'run' && runStatus === 'running' && (
                <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-teal-300" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-navy-300">{active.hint}</p>
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1">
        {tab === 'build' ? <BuildView /> : <RunView />}
      </div>
    </div>
  );
}
