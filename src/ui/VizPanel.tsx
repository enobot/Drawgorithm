import { displayedRun, shownLanguage, useStore, type ViewStyle, type VizTab } from '../state/store';
import { dialectOf } from '../viz/dialect';
import { DialectContext } from '../viz/dialectContext';
import { BuildView } from './BuildView';
import { RunView } from './RunView';

const STYLE_LABEL: Record<ViewStyle, string> = { illustrated: 'Illustrated', technical: 'Technical', both: 'Both' };
const STYLE_TITLE: Record<ViewStyle, string> = {
  illustrated: 'Scenes with people, shelves, ropes and gumdrops, drawn from the same run.',
  technical: 'Cells, nodes and arrows, with every value spelled out.',
  both: 'Each scene with its technical drawing underneath, at the same step.',
};

const TABS: { id: VizTab; label: string; hint: string }[] = [
  { id: 'build', label: 'Build', hint: 'The structure your top-level code creates, redrawn as you type.' },
  { id: 'run', label: 'Run', hint: 'What your code actually does, one step at a time.' },
];

export function VizPanel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const runStatus = useStore((s) => s.run.status);
  const pending = useStore((s) => s.live.result?.status === 'pending');
  const autoRun = useStore((s) => s.autoRun);
  const setAutoRun = useStore((s) => s.setAutoRun);
  const details = useStore((s) => s.showDetails);
  const setDetails = useStore((s) => s.setShowDetails);
  const viewStyle = useStore((s) => s.viewStyle);
  const setViewStyle = useStore((s) => s.setViewStyle);
  const active = TABS.find((t) => t.id === tab)!;
  // The Run tab writes values in the words of the run it shows, even after the editor switches language.
  const runDialect = useStore((s) => dialectOf(displayedRun(s)?.language ?? shownLanguage(s)));

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-navy-700 px-3 py-2">
        <div role="tablist" aria-label="Visualization mode" className="flex rounded-full bg-navy-950 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative rounded-full px-4 py-1 text-[13px] font-semibold transition-colors pointer-coarse:py-2.5 ${
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
        {/* Picture style: every choice shows the same run at the same step; only the drawing changes. */}
        <div role="group" aria-label="Picture style" className="flex rounded-full bg-navy-950 p-0.5">
          {(['illustrated', 'technical', 'both'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={viewStyle === s}
              onClick={() => setViewStyle(s)}
              title={STYLE_TITLE[s]}
              className={`rounded-full px-3.5 py-1 text-[13px] font-semibold transition-colors pointer-coarse:py-2.5 ${
                viewStyle === s ? 'bg-navy-700 text-navy-100' : 'text-navy-300 hover:text-navy-100'
              }`}
            >
              {STYLE_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="hidden text-[12.5px] text-navy-300 @min-[56rem]:block">{active.hint}</p>
        <div className="ml-auto flex items-center gap-4">
          <label
            className="flex items-center gap-1.5 text-[12.5px] text-navy-300 pointer-coarse:min-h-11"
            title={
              viewStyle === 'illustrated'
                ? 'Add indices, variable names and the collection state in code terms to the scenes.'
                : viewStyle === 'both'
                  ? 'Show indices, declaration kinds and null children, and add the code-terms overlay to the scenes.'
                  : 'Also show indices, declaration kinds and null children.'
            }
          >
            <input
              type="checkbox"
              checked={details}
              onChange={(e) => setDetails(e.target.checked)}
              className="accent-teal-400 pointer-coarse:size-5"
            />
            {viewStyle === 'illustrated' ? 'Technical overlay' : 'Show details'}
          </label>
          <label
            className="flex items-center gap-1.5 text-[12.5px] text-navy-300 pointer-coarse:min-h-11"
            title="After you pause typing, check the code and run it with the selected inputs. Runs of older code are cancelled."
          >
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="accent-teal-400 pointer-coarse:size-5"
            />
            Run as I type
          </label>
        </div>
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1">
        {tab === 'build' ? (
          <BuildView />
        ) : (
          <DialectContext.Provider value={runDialect}>
            <RunView />
          </DialectContext.Provider>
        )}
      </div>
    </div>
  );
}
