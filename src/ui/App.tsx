import { MotionConfig } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import { AccountButton, AuthDialog } from '../auth/AuthUI';
import { authClient } from '../auth/client';
import { connectAuth } from '../auth/store';
import { markSince } from '../diagnostics';
import { withoutDeepLink, type Pane } from '../state/deepLink';
import { canAutoRun } from '../state/live';
import { currentWork, displayedRun, shownCode, shownLanguage, useStore } from '../state/store';
import type { LiveResult } from '../trace/types';
import { dialectOf } from '../viz/dialect';
import { DialectContext } from '../viz/dialectContext';
import { EngineStopped, liveInWorker } from '../worker/client';
import { EditorPanel } from './EditorPanel';
import { ProblemPanel } from './ProblemPanel';
import { useMedia } from './useMedia';
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

/** When the code last changed, for the edit → drawing timings (see diagnostics.ts). */
let lastEditAt = 0;

/** Redraws Live Build shortly after typing stops; never sends overlapping requests. */
function useLiveBuild() {
  const code = useStore(shownCode);
  // Python's Live Build is a syntax check in the Python worker (it draws nothing yet).
  const language = useStore(shownLanguage);
  const problemId = useStore((s) => s.problemId);
  const setLive = useStore((s) => s.setLive);
  const busy = useRef(false);
  const queued = useRef<string | null>(null);

  useEffect(() => {
    lastEditAt = performance.now();
    const send = async (text: string) => {
      busy.current = true;
      try {
        const result = await liveInWorker(text, language);
        if (shownCode(useStore.getState()) === text) {
          setLive(result, text);
          markSince('edit-to-live', lastEditAt, result.status);
        }
      } catch (e) {
        // A stuck worker is terminated; say so instead of waiting forever. The last drawing stays.
        const failed = e instanceof EngineStopped && (e.reason === 'timeout' || e.reason === 'crashed');
        if (failed && shownCode(useStore.getState()) === text) {
          setLive(
            liveFailure(
              e.reason === 'timeout'
                ? 'Live Build stopped: the top-level code took too long. Press Run to execute it with the full limits.'
                : e.message,
            ),
            text,
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
  }, [code, problemId, setLive, language]);
}

/**
 * After a typing pause, once the code has been validated, run it with the selected inputs.
 * Changing inputs runs it again. Invalid code is never run; the previous drawing stays.
 */
function useAutoRun() {
  const autoRun = useStore((s) => s.autoRun);
  const live = useStore((s) => s.live);
  const code = useStore(shownCode);
  // A walkthrough replays the answer from its first step; an automatic run would jump to its end.
  const walking = useStore((s) => s.walkthrough?.problemId === s.problemId);
  const inputsKey = useStore((s) => {
    const w = currentWork(s);
    return JSON.stringify([w.inputs, w.expectedText, s.problemId]);
  });
  const startRun = useStore((s) => s.startRun);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!autoRun || walking || !canAutoRun(live, code)) return;
    const key = code + '\u0000' + inputsKey;
    if (last.current === key) return;
    const t = window.setTimeout(() => {
      last.current = key;
      const editedAt = lastEditAt;
      void startRun({ auto: true }).then(() => markSince('edit-to-run', editedAt, useStore.getState().run.status));
    }, 250);
    return () => window.clearTimeout(t);
  }, [autoRun, walking, live, code, inputsKey, startRun]);
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

type LayoutMode = 'wide' | 'medium' | 'narrow';

// Phones in landscape are wide but short: two side-by-side panels would leave each too
// little room, so they get the one-panel-at-a-time layout too.
const NARROW = '(max-width: 767.98px), (max-height: 519.98px) and (max-width: 1199.98px)';
const MEDIUM = '(max-width: 1199.98px)';

function useLayoutMode(): LayoutMode {
  const narrow = useMedia(NARROW);
  const medium = useMedia(MEDIUM);
  return narrow ? 'narrow' : medium ? 'medium' : 'wide';
}

/**
 * iOS Safari keeps the layout viewport when the on-screen keyboard opens, so the app
 * would extend under the keyboard. Size the app to the visible area instead.
 */
function useVisibleHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      // A shorter visual viewport at normal scale means a keyboard; a pinch zoom (scale > 1) is left alone.
      const keyboard = vv.scale <= 1.01 && vv.height < window.innerHeight - 1;
      if (!keyboard) {
        root.style.removeProperty('--app-height');
        return;
      }
      root.style.setProperty('--app-height', `${Math.round(vv.height)}px`);
      // Safari may scroll the page to reveal the caret; the app scrolls inside its panels instead.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);
}

/** Opening a demo link once is enough: drop its parameters so a reload keeps the visitor's own choices. */
function useConsumeDeepLink() {
  useEffect(() => {
    const rest = withoutDeepLink(window.location.search);
    if (rest !== window.location.search) window.history.replaceState(null, '', window.location.pathname + rest + window.location.hash);
  }, []);
}

function DesktopLayout({ tools }: { tools: HTMLElement | null }) {
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
      {/* Shown in the header row, next to the account button. */}
      {tools && createPortal(<PanelToggles collapsed={collapsed} onToggle={toggle} />, tools)}
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
    <div className="flex gap-1">
      {(['problem', 'code'] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onToggle(w)}
          aria-pressed={!collapsed[w]}
          className={`rounded-md border px-2 py-0.5 text-[12px] font-semibold ${
            collapsed[w] ? 'border-navy-600 text-navy-400 hover:text-navy-100' : 'border-navy-500 text-navy-200 hover:border-navy-300'
          }`}
        >
          {collapsed[w] ? 'Show' : 'Hide'} {w === 'problem' ? 'problem' : 'code'}
        </button>
      ))}
    </div>
  );
}

const PANE_LABEL: Record<Pane, string> = { problem: 'Problem', code: 'Code', visual: 'Visual' };

/** Tabs for switching panels on smaller screens. */
function PaneTabs({ panes, active, onSelect, label }: { panes: Pane[]; active: Pane; onSelect: (p: Pane) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-navy-950 p-1">
      {panes.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          id={`pane-tab-${p}`}
          aria-selected={active === p}
          aria-controls={`pane-${p}`}
          onClick={() => onSelect(p)}
          className={`min-h-9 flex-1 rounded-full px-4 text-[13.5px] font-semibold transition-colors pointer-coarse:min-h-11 ${
            active === p ? 'bg-navy-700 text-navy-50' : 'text-navy-300 hover:text-navy-100'
          }`}
        >
          {PANE_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

/**
 * One panel of a tabbed layout. Hidden panels stay mounted, so switching tabs keeps
 * the editor's cursor and undo history, scroll positions and half-typed inputs.
 */
function PaneSlot({ pane, visible, children }: { pane: Pane; visible: boolean; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`pane-${pane}`} aria-labelledby={`pane-tab-${pane}`} hidden={!visible} className="h-full min-h-0">
      {children}
    </div>
  );
}

/** Tablets and small laptop windows: the drawing beside a tabbed Problem/Code panel. */
function MediumLayout() {
  const pane = useStore((s) => s.mobilePane);
  const setPane = useStore((s) => s.setMobilePane);
  const side: Pane = pane === 'problem' ? 'problem' : 'code';
  const sideRef = usePanelRef();
  const [sideHidden, setSideHidden] = useState(false);
  const layout = useDefaultLayout({ id: 'drawgorithms-panels-medium', storage: localStorage });
  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-2">
        <div className={sideHidden ? 'invisible' : ''}>
          <PaneTabs panes={['problem', 'code']} active={side} onSelect={setPane} label="Left panel" />
        </div>
        <button
          type="button"
          className="btn-quiet ml-auto"
          aria-pressed={!sideHidden}
          onClick={() => (sideRef.current?.isCollapsed() ? sideRef.current.expand() : sideRef.current?.collapse())}
        >
          {sideHidden ? `Show ${PANE_LABEL[side].toLowerCase()}` : 'Widen drawing'}
        </button>
      </div>
      <Group
        orientation="horizontal"
        className="min-h-0 flex-1 px-3 pb-3"
        defaultLayout={layout.defaultLayout}
        onLayoutChanged={(l, meta) => {
          layout.onLayoutChanged(l, meta);
          setSideHidden(!!sideRef.current?.isCollapsed());
        }}
      >
        <Panel id="side" panelRef={sideRef} defaultSize="44" minSize="30" collapsible collapsedSize="0" className="panel overflow-hidden">
          <PaneSlot pane="problem" visible={side === 'problem'}>
            <ProblemPanel />
          </PaneSlot>
          <PaneSlot pane="code" visible={side === 'code'}>
            <EditorPanel />
          </PaneSlot>
        </Panel>
        <Separator aria-label="Resize the drawing" />
        <Panel id="visual" defaultSize="56" minSize="35" className="panel overflow-hidden">
          <VizPanel />
        </Panel>
      </Group>
    </>
  );
}

/** Phones: one panel at a time. */
function NarrowLayout() {
  const pane = useStore((s) => s.mobilePane);
  const setPane = useStore((s) => s.setMobilePane);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] short:pt-1.5">
      <PaneTabs panes={['problem', 'code', 'visual']} active={pane} onSelect={setPane} label="Panels" />
      <div className="panel min-h-0 flex-1 overflow-hidden">
        <PaneSlot pane="problem" visible={pane === 'problem'}>
          <ProblemPanel />
        </PaneSlot>
        <PaneSlot pane="code" visible={pane === 'code'}>
          <EditorPanel />
        </PaneSlot>
        <PaneSlot pane="visual" visible={pane === 'visual'}>
          <VizPanel />
        </PaneSlot>
      </div>
    </div>
  );
}

export function App() {
  const mode = useLayoutMode();
  const startRun = useStore((s) => s.startRun);
  useLiveBuild();
  useAutoRun();
  useShortcuts();
  useVisibleHeight();
  useConsumeDeepLink();
  useEffect(() => {
    // Open with a working demo. With auto-run on, the first validation starts the run instead.
    if (!useStore.getState().autoRun) void startRun({ background: true });
  }, [startRun]);
  // Sign-in is optional: without a Supabase project in .env.local it stays off and the app works the same.
  useEffect(() => connectAuth(authClient), []);
  const [tools, setTools] = useState<HTMLDivElement | null>(null);
  // Values are written in the words of the code on screen; the Run tab uses the language of the run it shows.
  const dialect = useStore((s) => dialectOf(shownLanguage(s)));

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell relative flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {/* Phones in landscape need every pixel of height for the panels, so the header steps aside. */}
        <header className="flex items-center gap-3 px-4 py-2 short:sr-only">
          <Logo />
          <h1 className="text-[17px] font-extrabold tracking-tight text-navy-100">Drawgorithms</h1>
          <p className="hidden text-[13px] text-navy-400 lg:block">See what your code does, step by step.</p>
          <div ref={setTools} className="ml-auto flex items-center" />
          <AccountButton />
        </header>
        <DialectContext.Provider value={dialect}>
          {mode === 'wide' ? <DesktopLayout tools={tools} /> : mode === 'medium' ? <MediumLayout /> : <NarrowLayout />}
        </DialectContext.Provider>
        <AuthDialog />
      </div>
    </MotionConfig>
  );
}
