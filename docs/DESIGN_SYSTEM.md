# Design system

How Drawgorithms looks and moves, and the rules every drawing follows. The app's own chrome still uses its teal accent; the pastel pink accent below is used by the gumdrop cast first, and moves to the rest of the app as a separate, reviewed step.

## Principles

- **Simple and clean.** A dark background, pastel pink as the accent, a soft pink glow on hover. Small touches only: sparkles when an answer is found.
- **Drawn from the real run.** Every picture comes from the learner's own execution trace (`docs/ARCHITECTURE.md`): renderers read the recorded steps, never the source code. Nothing is scripted per problem.
- **Never color alone.** Every state also has a word under it (now, compared, changed, written, found it, answer).
- **Readable.** Text is at least 4.5:1 against what is behind it, and shapes that carry meaning at least 3:1 (WCAG 1.4.3 and 1.4.11). `src/viz/illustrated/gumdrop.test.ts` checks the gumdrop colors; `docs/LAUNCH-READINESS.md` describes the full audit.
- **Calm motion.** Springs for movement (`GLIDE` in `src/viz/theme.ts`); `useGlide()` makes every change instant when the system asks for reduced motion, and CSS animations stop there too.
- **Keyboard first.** Drawings never add tab stops that do nothing; the board region scrolls with the keyboard.
- **Original characters only.** Our own cast, drawn in code (SVG and CSS). No trademarked characters (no Minions, Spider-Man, Pokémon, Disney and so on) and nothing that looks like them; no copied images.

## Colors

| Use                              | Color                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| Board                            | `navy-950` `#0b1322`                                                   |
| Cards (scenes, notebook, stats)  | `navy-900` `#0f1a2e`, `navy-850` `#13213a`                             |
| Main text                        | `navy-50` / `navy-100`                                                 |
| Secondary text                   | `navy-300` / `navy-400` (never `navy-500` for text: it fails contrast) |
| Accent, hover glow, pointer tags | pastel pink `#F4B6CC`                                                  |
| Being read or compared           | lavender `#C6B5F2`                                                     |
| Just written                     | butter `#F5D98C`                                                       |
| Answer, found                    | mint `#9EE3C8`                                                         |
| Sleeping zero                    | lilac `#DCD0E6`                                                        |
| Ink on pastel (pupils, tag text) | `#2A2033`                                                              |
| Leaf, cheeks                     | `#97C459`, `#ED93B1`                                                   |

Pastels are fills on the dark board, never text colors. State words use their lighter text versions (`GUM_WORD_COLOR`).

## The gumdrop cast

`src/viz/illustrated/gumdrop.ts` (rules) and `GumdropScene.tsx` (drawing). An array of numbers is a row of gumdrops:

- **Body:** a pastel bar with a rounded top, standing on a line. Width 46; height 28 to 104, scaled by the value's size against the largest in the row, so 1 next to 1,000 is still a character.
- **Face:** two white eyes with dark pupils, pink cheeks (on bodies tall enough for them), a small smile, and a tiny green leaf on top.
- **Zero:** flattened and asleep: closed eyes, no smile, lilac when nothing is happening to it.
- **Negative:** hangs below the line with its rounded end down, no leaf; its value is written under it.
- **States:** pink normally; lavender while read (“now”) or compared (“compared”); butter when written (“changed”); mint when part of the answer (“answer”).
- **Gaze:** the pupils look toward the nearest other slot read in the same step (the one it is compared with), or down at the notebook when the step looked a value up; otherwise straight ahead.
- **Index variables:** pink pill tags under the row that slide to the slot they hold; tags sharing a slot stack.
- **Celebration:** three ✦ sparkles rise and fade once over each answer gumdrop; with reduced motion they stay still.
- **Hover:** a soft pink glow.
- **When it is used:** arrays of up to 16 numbers, fully recorded (no hidden items), not grids. Anything else keeps the shelf or cell drawing.

## The notebook

`NotebookScene.tsx`. A map is a notebook with a pink margin line: one line per entry, in the order the code wrote them. The line the step just wrote says “written” (butter); a lookup that finds its key lights that line mint with “found it”; a lookup that misses says so below the lines.

## Stat cards

`src/viz/StatCards.tsx`. A problem can name its key variables (`view.statCards`, e.g. `target` and `complement` for Two Sum). In the Illustrated style they become big cards above the drawing, showing the value at each step (“–” before the variable exists) and a pink ring with “changed”, or a lavender one with “read”/“compared”.

## Turning it on for a problem

The cast is opt-in per problem while it is reviewed: `view: { scene: 'gumdrops', statCards: [...] }` in `src/problems/catalog.ts`. On today:

| Problem                       | Gumdrops | Notebook | Stat cards             |
| ----------------------------- | -------- | -------- | ---------------------- |
| Two Sum (built-in, `two-sum`) | yes      | yes      | `target`, `complement` |

Planned after review: Asteroid Passage (round rocks colored by direction, bursts on collisions, survivors stacking up), Products Without One, Balanced Shipment; then the pink accent across the app.

## Known limits

- The Python adapter traces lines, not individual reads, so in Python the gumdrops never show “now”, and the notebook never shows “written” or “found it”. Their values, the stat cards and the answer are drawn the same as in JavaScript.
- The Technical and Both styles keep their existing drawings; “Both” shows the gumdrops above the technical drawing of the same step.
