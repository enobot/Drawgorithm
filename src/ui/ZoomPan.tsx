import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MAX_ZOOM, MIN_ZOOM, clampZoom, useStore } from '../state/store';
import { useMedia } from './useMedia';

const STEP = 1.25;
const INTERACTIVE = 'button, a, input, select, textarea, summary, label, [role="button"], [contenteditable="true"]';

/**
 * The drawing board's viewport. Panning is ordinary scrolling (wheel, scrollbars, one
 * finger, or dragging empty board with the mouse), so it never fights page scrolling.
 * Zoom comes only from deliberate input: the buttons, Ctrl/⌘ + wheel (trackpad pinch)
 * and a two-finger pinch on touch screens.
 *
 * The controls float at the board's bottom-right corner, or in `controlsSlot` when the view
 * pins something over that corner (Run's playback bar on short screens).
 */
export function ZoomPan({ children, controlsSlot }: { children: ReactNode; controlsSlot?: HTMLElement | null }) {
  const zoom = useStore((s) => s.boardZoom);
  const setZoom = useStore((s) => s.setBoardZoom);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // Where to keep the drawing still while the zoom changes (a point in the scroller's view).
  const anchor = useRef<{ x: number; y: number; from: number } | null>(null);

  // The content lays out at the board's width (wider when zoomed out, so more fits),
  // and the wrapper reserves the scaled size so scrolling covers the whole drawing.
  const [baseWidth, setBaseWidth] = useState(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner) return;
    const measure = () => {
      const style = getComputedStyle(el);
      setBaseWidth(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      setBox({ width: inner.offsetWidth, height: inner.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const zoomTo = (next: number, at?: { x: number; y: number }) => {
    const el = scroller.current;
    if (!el) return;
    // Read the stored zoom: wheel and pinch events can arrive faster than renders.
    const from = anchor.current?.from ?? useStore.getState().boardZoom;
    const target = clampZoom(next);
    if (target === useStore.getState().boardZoom) return;
    anchor.current = { x: at?.x ?? el.clientWidth / 2, y: at?.y ?? el.clientHeight / 2, from };
    setZoom(target);
  };
  const zoomRef = useRef(zoomTo);
  useEffect(() => {
    zoomRef.current = zoomTo;
  });

  // Keep the anchored point under the cursor or fingers after a zoom.
  useLayoutEffect(() => {
    const el = scroller.current;
    const a = anchor.current;
    anchor.current = null;
    if (!el || !a || a.from === zoom) return;
    const ratio = zoom / a.from;
    el.scrollLeft = (el.scrollLeft + a.x) * ratio - a.x;
    el.scrollTop = (el.scrollTop + a.y) * ratio - a.y;
  }, [zoom]);

  // Ctrl/⌘ + wheel and touch pinch need non-passive listeners to keep the page itself from zooming.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const local = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      return { x: x - r.left, y: y - r.top };
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z = useStore.getState().boardZoom;
      // About 22% per mouse-wheel notch (deltaY 100); trackpad pinches send many small deltas.
      const pixels = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 33 : e.deltaY;
      zoomRef.current(z * Math.exp(-pixels * 0.002), local(e.clientX, e.clientY));
    };
    let pinch: { dist: number; zoom: number } | null = null;
    const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { dist: spread(e.touches), zoom: useStore.getState().boardZoom };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const mid = local((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
      zoomRef.current(pinch.zoom * (spread(e.touches) / pinch.dist), mid);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    // Safari's own pinch gesture would zoom the whole page.
    const onGesture = (e: Event) => e.preventDefault();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('gesturestart', onGesture);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('gesturestart', onGesture);
    };
  }, []);

  // Mouse: drag empty board to pan. Clicks on nodes, cells and buttons are left alone.
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (e: ReactPointerEvent) => {
    const el = scroller.current;
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const el = scroller.current;
    const d = drag.current;
    if (!el || !d) return;
    el.scrollLeft = d.left - (e.clientX - d.x);
    el.scrollTop = d.top - (e.clientY - d.y);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const coarse = useMedia('(pointer: coarse)');
  const [expanded, setExpanded] = useState(false);
  // Folded again a few seconds after the last zoom change.
  useEffect(() => {
    if (!expanded) return;
    const t = window.setTimeout(() => setExpanded(false), 4000);
    return () => window.clearTimeout(t);
  }, [expanded, zoom]);

  // Laid-out width: the board's width at 100% and above; wider when zoomed out so the drawing has room.
  const layoutWidth = baseWidth > 0 ? baseWidth / Math.min(zoom, 1) : undefined;
  const fit = () => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || !baseWidth) return;
    // The widest drawing (trees and lists scroll sideways inside the board) and the full height must fit.
    let widest = inner.scrollWidth;
    inner.querySelectorAll<HTMLElement>('.overflow-x-auto').forEach((x) => {
      widest = Math.max(widest, x.scrollWidth + (x.getBoundingClientRect().left - inner.getBoundingClientRect().left) / zoom);
    });
    const style = getComputedStyle(el);
    const height = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    zoomTo(Math.min(1, baseWidth / widest, height / inner.offsetHeight));
  };

  const showAll = !coarse || expanded;
  const pillClass =
    'flex items-center gap-0.5 rounded-full bg-navy-900/90 p-1 shadow-[0_0_0_1px_rgb(125_145_181/0.25),0_8px_20px_-10px_rgb(0_0_0/0.7)] backdrop-blur';
  // Touch screens zoom with a pinch, so the buttons fold into one small pill that covers less of the drawing.
  const controls = !showAll ? (
    <div className={pillClass}>
      <button
        type="button"
        className="zoom-btn w-auto min-w-14 px-2 text-[12px] tabular-nums"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        aria-label={`Zoom ${Math.round(zoom * 100)} percent. Show zoom buttons`}
      >
        {Math.round(zoom * 100)}%
      </button>
    </div>
  ) : (
    <div role="group" aria-label="Zoom" className={pillClass}>
      <button type="button" className="zoom-btn" onClick={() => zoomTo(zoom / STEP)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
        −
      </button>
      <button
        type="button"
        className="zoom-btn w-auto min-w-12 px-1.5 text-[12px] tabular-nums"
        onClick={() => zoomTo(1)}
        title="Back to actual size"
        aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className="zoom-btn" onClick={() => zoomTo(zoom * STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
        +
      </button>
      <button type="button" className="zoom-btn w-auto px-2 text-[12px]" onClick={fit} title="Fit the drawing in view">
        Fit
      </button>
    </div>
  );

  return (
    // A minimum height keeps the drawing usable on short screens (the view around it scrolls instead).
    <div className="relative min-h-[min(22rem,60dvh)] flex-1 short:min-h-40">
      <div
        ref={scroller}
        // Sideways overscroll is contained (no browser back-swipe while scrolling a wide tree);
        // vertical scroll hands over to the view around the board.
        className={`board-grid absolute inset-0 overflow-auto overscroll-x-contain px-4 pt-4 pb-16 ${dragging ? 'cursor-grabbing select-none' : ''}`}
        style={{ touchAction: 'pan-x pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div style={zoom === 1 ? undefined : { width: box.width * zoom, height: box.height * zoom }}>
          <div ref={content} style={zoom === 1 ? undefined : { width: layoutWidth, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
            {children}
          </div>
        </div>
      </div>
      {controlsSlot ? createPortal(controls, controlsSlot) : <div className="absolute bottom-3 right-3 z-10">{controls}</div>}
    </div>
  );
}
