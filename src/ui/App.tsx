import { MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import { currentWork, displayedRun, useStore } from '../state/store';
import type { LiveResult } from '../trace/types';
import { EngineStopped, liveInWorker } from '../worker/client';
import { EditorPanel } from './EditorPanel';
import { ProblemPanel } from './ProblemPanel';
import { VizPanel } from './VizPanel';

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <path d="M16 9 9 21M16 9l7 12" stroke="#5eead4" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="9" r="4.5" fill="#2dd4bf" />
      <circle cx="9" cy="22" r="4" fill="#a78bfa" />
      <circle cx="23" cy="22" r="4" fill="#fbbf24" />
    </svg>
  );
}

function liveFailure(message: string): LiveResult {
  return {
    status: 'error',
    step: null,
    lines: [],
    objects: {},
    allNodeIds: [],
    pending: null,
    stoppedAt: null,
    error: { kind: 'limit', name: 'LimitError', message, loc: null },
    hints: { pointers: {}, indexed: [], queues: [], stacks: [], functions: [] },
    drawnThroughLine: 0,
  };
}

/** Redraws Live Build shortly after typing stops; never sends overlapping requests. */
function useLiveBuild() {
  const code = useStore((s) => currentWork(s).code);
  const problemId = useStore((s) => s.problemId);
  const setLive = useStore((s) => s.setLive);
  const busy = useRef(false);
  const queued = useRef<string | null>(null);

  useEffect(() => {
    const send = async (text: string) => {
      busy.current = true;
      try {
        const result = await liveInWorker(text);
        if (currentWork(useStore.getState()).code === text) setLive(result);
      } catch (e) {
        // A stuck worker is terminated; say so instead of waiting forever. The last drawing stays.
        if (e instanceof EngineStopped && e.reason !== 'stopped' && currentWork(useStore.getState()).code === text) {
          setLive(
            liveFailure(
              e.reason === 'timeout'
                ? 'Live Build stopped: the top-level code took too long. Press Run to execute it with the full limits.'
                : e.message,
            ),
          );
        }
      } finally {
        busy.current = false;
        const next = queued.current;
        queued.current = null;
        if (next !== null && next !== text) void send(next);
      }
    };
    const t = window.setTimeout(() => {
      if (busy.current) queued.current = code;
      else void send(code);
    }, 300);
    return () => window.clearTimeout(t);
  }, [code, problemId, setLive]);
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!el.closest('.monaco-editor');
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void s.startRun();
        return;
      }
      const shown = displayedRun(s);
      if (isTypingTarget(e.target) || s.tab !== 'run' || !shown) return;
      const total = shown.result.steps.length;
      if (e.key === 'ArrowRight') s.setStep(s.step + 1);
      else if (e.key === 'ArrowLeft') s.setStep(s.step - 1);
      else if (e.key === 'Home') s.setStep(0);
      else if (e.key === 'End') s.setStep(total - 1);
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        s.setPlaying(!s.playing);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

function DesktopLayout() {
  const problemRef = usePanelRef();
  const codeRef = usePanelRef();
  const [collapsed, setCollapsed] = useState({ problem: false, code: false });
  const layout = useDefaultLayout({ id: 'drawgorithms-panels', storage: localStorage });
  const toggle = (which: 'problem' | 'code') => {
    const ref = which === 'problem' ? problemRef : codeRef;
    if (ref.current?.isCollapsed()) ref.current.expand();
    else ref.current?.collapse();
  };
  return (
    <>
      <PanelToggles collapsed={collapsed} onToggle={toggle} />
      <Group
        orientation="horizontal"
        className="min-h-0 flex-1 px-3 pb-3"
        defaultLayout={layout.defaultLayout}
        onLayoutChanged={(l, meta) => {
          layout.onLayoutChanged(l, meta);
          setCollapsed({ problem: !!problemRef.current?.isCollapsed(), code: !!codeRef.current?.isCollapsed() });
        }}
      >
        <Panel
          id="problem"
          panelRef={problemRef}
          defaultSize="23"
          minSize="16"
          collapsible
          collapsedSize="0"
          className="panel overflow-hidden"
        >
          <ProblemPanel />
        </Panel>
        <Separator aria-label="Resize problem panel" />
        <Panel id="code" panelRef={codeRef} defaultSize="33" minSize="22" collapsible collapsedSize="0" className="panel overflow-hidden">
          <EditorPanel />
        </Panel>
        <Separator aria-label="Resize code panel" />
        <Panel id="visual" defaultSize="44" minSize="30" className="panel overflow-hidden">
          <VizPanel />
        </Panel>
      </Group>
    </>
  );
}

function PanelToggles({
  collapsed,
  onToggle,
}: {
  collapsed: { problem: boolean; code: boolean };
  onToggle: (w: 'problem' | 'code') => void;
}) {
  return (
    <div className="pointer-events-none absolute right-4 top-2.5 flex gap-1">
      {(['problem', 'code'] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onToggle(w)}
          aria-pressed={!collapsed[w]}
          className={`pointer-events-auto rounded-md border px-2 py-0.5 text-[12px] font-semibold ${
            collapsed[w] ? 'border-navy-600 text-navy-400 hover:text-navy-100' : 'border-navy-500 text-navy-200 hover:border-navy-300'
          }`}
        >
          {collapsed[w] ? 'Show' : 'Hide'} {w === 'problem' ? 'problem' : 'code'}
        </button>
      ))}
    </div>
  );
}

function MobileLayout() {
  const pane = useStore((s) => s.mobilePane);
  const setPane = useStore((s) => s.setMobilePane);
  const panes = [
    { id: 'problem', label: 'Problem' },
    { id: 'code', label: 'Code' },
    { id: 'visual', label: 'Visual' },
  ] as const;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2">
      <div role="tablist" aria-label="Panels" className="flex rounded-lg bg-navy-900 p-0.5">
        {panes.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pane === p.id}
            onClick={() => setPane(p.id)}
            className={`flex-1 rounded-md py-1.5 text-[13px] font-semibold ${pane === p.id ? 'bg-navy-700 text-navy-100' : 'text-navy-300'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="panel min-h-0 flex-1 overflow-hidden">
        {pane === 'problem' && <ProblemPanel />}
        {pane === 'code' && <EditorPanel />}
        {pane === 'visual' && <VizPanel />}
      </div>
    </div>
  );
}

export function App() {
  const desktop = useIsDesktop();
  const startRun = useStore((s) => s.startRun);
  useLiveBuild();
  useShortcuts();
  useEffect(() => {
    // Open with a working demo: the Run tab is ready as soon as the page loads.
    void startRun({ background: true });
  }, [startRun]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full flex-col">
        <header className="flex items-center gap-3 px-4 py-2.5">
          <Logo />
          <h1 className="text-[17px] font-extrabold tracking-tight text-navy-100">Drawgorithms</h1>
          <p className="hidden text-[13px] text-navy-400 sm:block">See what your JavaScript does, step by step.</p>
        </header>
        {desktop ? <DesktopLayout /> : <MobileLayout />}
      </div>
    </MotionConfig>
  );
}
