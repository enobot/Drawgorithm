// A graph drawn as vertices on a circle joined by edges, read from an adjacency list, an
// adjacency Map or object, an adjacency matrix, or an edge list. Traversal state comes from
// the recorded variables (visited, queue or stack, dist, prev) and the step's reads and writes;
// labels sit outside the circle, where no edge runs.
import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { boolWord, noneWord, type Dialect } from './dialect';
import { useDialect } from './dialectContext';
import { circleLayout, type GraphActivity, type GraphModel, type GraphOverlay } from './structures';
import { STATE, useGlide, type VisualState } from './theme';
import { tagsWidth } from './TreeView';
import { NameTag } from './Value';

const NODE = 44;
const R = NODE / 2;
/** Smallest distance between neighboring vertices on the circle. */
const GAP = 96;
const PAD = 24;
/** Label lines outside a vertex: name tags, then badges. */
const LINE = 20;
/** Past a vertex's edge to its label block: clear of the ✓ badge on the corner (4px beyond the outline). */
const LABEL_GAP = 18;

/** Width of a vertex: a circle, or a pill when its name is longer (names are never cut short). */
const vertexWidth = (label: string) => Math.max(NODE, label.length * 9 + 16);

/** Where a line toward (ux, uy) leaves a vertex of width w: on its outline, read as an ellipse. */
const outline = (w: number, ux: number, uy: number) => 1 / Math.hypot(ux / (w / 2), uy / R);

export interface GraphViewProps {
  model: GraphModel;
  overlay: GraphOverlay;
  activity: GraphActivity;
  /** Per vertex, what this step did to the traversal state ("joined queue", "dist = 2"). */
  changes: Map<string, string[]>;
  /** Vertex order for the whole run, so vertices keep their places; defaults to this step's order. */
  order?: string[];
}

interface Label {
  tags: { name: string; active: boolean }[];
  badges: { text: string; tone: 'frontier' | 'value' | 'change' }[];
}

/** Rough width of a label block, for sizing the drawing (pills are 11.5px bold). */
const badgeWidth = (text: string) => 14 + text.length * 6.6;

export function GraphView({ model, overlay, activity, changes, order }: GraphViewProps) {
  const glide = useGlide();
  const dialect = useDialect();
  const markerId = useId().replace(/:/g, '');
  // Places on the circle: every vertex of the run (when known), so none moves when others appear.
  const ring = [...new Set([...(order ?? []), ...model.nodes.map((n) => n.key)])];
  const widthOf = (key: string) => vertexWidth(model.nodes.find((n) => n.key === key)?.label ?? key);
  const { points } = circleLayout(ring.length, Math.max(GAP, ...ring.map((k) => vertexWidth(k) + 52)));
  const at = new Map(ring.map((k, i) => [k, { ...points[i], angle: Math.atan2(points[i].y, points[i].x) }]));

  const labels = new Map<string, Label>();
  for (const n of model.nodes) {
    const badges: Label['badges'] = [];
    for (const f of overlay.frontier.get(n.key) ?? []) badges.push({ text: `${f.name}[${f.pos}]`, tone: 'frontier' });
    for (const v of overlay.values) {
      const x = v.byNode.get(n.key);
      if (x) badges.push({ text: `${v.name} ${showValue(x, dialect)}`, tone: 'value' });
    }
    for (const c of changes.get(n.key) ?? []) badges.push({ text: c, tone: 'change' });
    labels.set(n.key, { tags: overlay.tags.get(n.key) ?? [], badges });
  }

  // Each label block sits outside the circle, in the direction of its vertex.
  const blockOf = (key: string) => {
    const p = at.get(key)!;
    const l = labels.get(key)!;
    const lines = (l.tags.length ? 1 : 0) + l.badges.length;
    const w = Math.max(l.tags.length ? tagsWidth(l.tags) : 0, ...l.badges.map((b) => badgeWidth(b.text)), 0);
    const h = lines * LINE;
    const single = ring.length === 1;
    const ux = single ? 0 : Math.cos(p.angle);
    const uy = single ? 1 : Math.sin(p.angle);
    // Anchor outside the vertex, clear of the ✓ on its lower-right corner; the block grows away from the circle.
    const dx = ux * (widthOf(key) / 2 + LABEL_GAP);
    const dy = uy * (R + LABEL_GAP);
    const hAlign: 'start' | 'end' | 'center' = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'center';
    const vAlign: 'top' | 'bottom' | 'middle' = uy > 0.35 ? 'top' : uy < -0.35 ? 'bottom' : 'middle';
    const left = p.x + dx - (hAlign === 'start' ? 0 : hAlign === 'end' ? w : w / 2);
    const top = p.y + dy - (vAlign === 'top' ? 0 : vAlign === 'bottom' ? h : h / 2);
    return { left, top, w, h, hAlign, vAlign, dx, dy, lines };
  };

  let minX = -R;
  let maxX = R;
  let minY = -R;
  let maxY = R;
  for (const k of ring) {
    const p = at.get(k)!;
    minX = Math.min(minX, p.x - widthOf(k) / 2);
    maxX = Math.max(maxX, p.x + widthOf(k) / 2);
    minY = Math.min(minY, p.y - R);
    maxY = Math.max(maxY, p.y + R);
  }
  for (const n of model.nodes) {
    const b = blockOf(n.key);
    if (!b.lines) continue;
    minX = Math.min(minX, b.left);
    maxX = Math.max(maxX, b.left + b.w);
    minY = Math.min(minY, b.top);
    maxY = Math.max(maxY, b.top + b.h);
  }
  // Self-loops bow outward past the vertex.
  if (model.edges.some((e) => e.from === e.to)) {
    minX -= 30;
    maxX += 30;
    minY -= 30;
    maxY += 30;
  }
  const ox = PAD - minX;
  const oy = PAD - minY;
  const width = maxX - minX + 2 * PAD;
  const height = maxY - minY + 2 * PAD;
  const X = (k: string) => at.get(k)!.x + ox;
  const Y = (k: string) => at.get(k)!.y + oy;

  const checked = (a: string, b: string, directed: boolean) =>
    activity.checked.some((c) => (c.from === a && c.to === b) || (!directed && c.from === b && c.to === a));
  const added = (a: string, b: string, directed: boolean) =>
    activity.added.some((c) => (c.from === a && c.to === b) || (!directed && c.from === b && c.to === a));
  const prevLinks = overlay.prev.flatMap((p) => [...p.links].map(([from, to]) => ({ name: p.name, from, to })));
  const isPrevEdge = (a: string, b: string) => prevLinks.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));

  const nodeState = (k: string): VisualState => {
    if (changes.has(k)) return 'changed';
    if (activity.opened.has(k)) return 'current';
    if (overlay.visited.has(k)) return 'visited';
    return 'idle';
  };

  const legend: string[] = [model.note];
  if (overlay.visited.size) legend.push(`✓ marks vertices in ${[...new Set(overlay.visited.values())].join(', ')}.`);
  if (overlay.frontier.size)
    legend.push(
      `${[...new Set([...overlay.frontier.values()].flat().map((f) => f.name))].map((n) => `${n}[k]`).join(', ')}: the vertex's place in that array (0 is the front).`,
    );
  if (prevLinks.length)
    legend.push(
      `Violet dashed arrows: ${[...new Set(prevLinks.map((l) => l.name))].join(', ')} links, from a vertex to the one recorded before it.`,
    );
  if (activity.checked.length) legend.push('Violet edges: the neighbor entries this step read.');
  if (activity.added.length) legend.push('Amber edges: added in this step.');
  if (overlay.values.some((v) => [...v.byNode.values()].some((x) => x.t === 'number' && !Number.isFinite(x.v)))) {
    legend.push(`∞ is ${dialect === 'python' ? 'inf' : 'Infinity'}, as the code stored it.`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative"
        style={{ width, height }}
        aria-label={`Graph with ${model.nodes.length} vertices and ${model.edges.length} edges`}
      >
        <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <defs>
            {[
              ['idle', '#7d91b5'],
              ['hot', '#fcd34d'],
              ['read', '#c4b5fd'],
            ].map(([k, c]) => (
              <marker
                key={k}
                id={`${markerId}-${k}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10z" fill={c} />
              </marker>
            ))}
          </defs>
          <AnimatePresence initial={false}>
            {model.edges.map((e) => {
              const hot = added(e.from, e.to, e.directed);
              const read = checked(e.from, e.to, e.directed);
              const stroke = hot ? '#fcd34d' : read ? '#c4b5fd' : isPrevEdge(e.from, e.to) ? '#8b7fd6' : '#5f7398';
              const kind = hot ? 'hot' : read ? 'read' : 'idle';
              if (e.from === e.to) {
                const p = at.get(e.from)!;
                const ux = Math.cos(p.angle) || 0;
                const uy = Math.sin(p.angle) || -1;
                const cx = X(e.from) + ux * (R + 12);
                const cy = Y(e.from) + uy * (R + 12);
                return (
                  <motion.circle
                    key={`${e.from}-${e.to}`}
                    cx={cx}
                    cy={cy}
                    r={13}
                    fill="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, stroke }}
                    exit={{ opacity: 0 }}
                    strokeWidth={2.5}
                  />
                );
              }
              const [x1, y1, x2, y2] = trim(X(e.from), Y(e.from), X(e.to), Y(e.to), e.directed, widthOf(e.from), widthOf(e.to));
              const t = 0.42;
              return (
                <motion.g
                  key={`${e.from}-${e.to}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={glide}
                >
                  <motion.path
                    initial={false}
                    animate={{ d: `M ${x1} ${y1} L ${x2} ${y2}`, stroke }}
                    transition={glide}
                    fill="none"
                    strokeWidth={hot || read ? 3.5 : 2.25}
                    strokeLinecap="round"
                    markerEnd={e.directed ? `url(#${markerId}-${kind})` : undefined}
                  />
                  {(e.weight !== undefined || e.count > 1) && (
                    // On a halo of board color, so the edge never runs through the number.
                    <text
                      x={X(e.from) + (X(e.to) - X(e.from)) * t}
                      y={Y(e.from) + (Y(e.to) - Y(e.from)) * t + 4}
                      textAnchor="middle"
                      className="fill-navy-100"
                      fontSize={12}
                      fontWeight={700}
                      stroke="#0b1322"
                      strokeWidth={5}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                    >
                      {[e.weight, e.count > 1 ? `×${e.count}` : undefined].filter(Boolean).join(' ')}
                    </text>
                  )}
                </motion.g>
              );
            })}
            {prevLinks.map((l) => {
              const [x1, y1, x2, y2] = trim(X(l.from), Y(l.from), X(l.to), Y(l.to), true, widthOf(l.from), widthOf(l.to));
              // Beside the edge, not on it, so both stay readable.
              const nx = -(y2 - y1);
              const ny = x2 - x1;
              const len = Math.hypot(nx, ny) || 1;
              const off = 7;
              return (
                <motion.path
                  key={`prev-${l.name}-${l.from}-${l.to}`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    d: `M ${x1 + (nx / len) * off} ${y1 + (ny / len) * off} L ${x2 + (nx / len) * off} ${y2 + (ny / len) * off}`,
                  }}
                  exit={{ opacity: 0 }}
                  transition={glide}
                  fill="none"
                  stroke="#c4b5fd"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  markerEnd={`url(#${markerId}-read)`}
                />
              );
            })}
          </AnimatePresence>
        </svg>
        <AnimatePresence initial={false}>
          {model.nodes.map((n) => {
            const state = nodeState(n.key);
            const style = STATE[state];
            const visited = overlay.visited.has(n.key);
            const l = labels.get(n.key)!;
            const b = blockOf(n.key);
            const w = widthOf(n.key);
            const describe = [
              `vertex ${n.label}`,
              l.tags.length ? `held by ${l.tags.map((t) => t.name).join(', ')}` : '',
              visited ? `in ${overlay.visited.get(n.key)}` : '',
              ...l.badges.map((x) => x.text),
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <motion.div
                key={n.key}
                className="absolute"
                style={{ left: 0, top: 0 }}
                initial={{ opacity: 0, scale: 0.5, x: X(n.key) - w / 2, y: Y(n.key) - R }}
                animate={{ opacity: 1, scale: 1, x: X(n.key) - w / 2, y: Y(n.key) - R }}
                exit={{ opacity: 0 }}
                transition={glide}
              >
                <div
                  title={describe}
                  aria-label={describe}
                  className={`relative flex items-center justify-center rounded-full font-bold text-navy-100 transition-shadow duration-300 ${style.fill} ${style.ring}`}
                  style={{ width: w, height: NODE }}
                >
                  <span className="whitespace-nowrap text-[15px]">{n.label}</span>
                  {visited && (
                    <span
                      aria-hidden
                      className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-teal-400 text-[10px] text-navy-950"
                    >
                      ✓
                    </span>
                  )}
                </div>
                {b.lines > 0 && (
                  // Positioned by its anchor and aligned by its real size, so the estimate above only sizes the drawing.
                  <div
                    className={`absolute flex flex-col gap-0.5 ${b.hAlign === 'start' ? 'items-start' : b.hAlign === 'end' ? 'items-end' : 'items-center'}`}
                    style={{
                      left: w / 2 + b.dx,
                      top: R + b.dy,
                      transform: `translate(${b.hAlign === 'start' ? '0' : b.hAlign === 'end' ? '-100%' : '-50%'}, ${
                        b.vAlign === 'top' ? '0' : b.vAlign === 'bottom' ? '-100%' : '-50%'
                      })`,
                    }}
                  >
                    {l.tags.length > 0 && (
                      <div className="flex gap-1 whitespace-nowrap">
                        {l.tags.map((t) => (
                          <NameTag key={t.name} name={t.name} faint={!t.active} solid />
                        ))}
                      </div>
                    )}
                    {l.badges.map((x) => (
                      <span
                        key={x.text}
                        className={`whitespace-nowrap rounded-full px-1.5 text-[11px] font-semibold leading-[18px] ${
                          x.tone === 'frontier'
                            ? 'bg-amber-300 text-navy-950'
                            : x.tone === 'change'
                              ? 'bg-amber-300/15 text-amber-200'
                              : 'bg-navy-800 text-navy-200'
                        }`}
                      >
                        {x.text}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex max-w-xl flex-col gap-1 text-[12.5px] text-navy-300">
        {legend.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
    </div>
  );
}

const showValue = (v: { t: string; v?: unknown }, dialect: Dialect) =>
  v.t === 'number'
    ? Number.isFinite(v.v as number)
      ? String(v.v)
      : (v.v as number) > 0
        ? '∞'
        : '-∞'
    : v.t === 'string'
      ? String(v.v)
      : v.t === 'boolean'
        ? boolWord(v.v as boolean, dialect)
        : v.t === 'null'
          ? noneWord(dialect)
          : v.t;

/** A straight edge between two vertex outlines; an arrow stops a little short so its head shows. */
function trim(x1: number, y1: number, x2: number, y2: number, arrow: boolean, w1: number, w2: number): [number, number, number, number] {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const start = outline(w1, ux, uy);
  const end = outline(w2, ux, uy) + (arrow ? 5 : 0);
  return [x1 + ux * start, y1 + uy * start, x2 - ux * end, y2 - uy * end];
}
