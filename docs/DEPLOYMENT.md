# Deployment, performance and capacity

Status: prepared, not deployed. Nothing here has been published or changed on any live service.

## Architecture as built

- **A static site.** `npm run build` produces `dist/` (HTML, JavaScript, CSS, fonts). There is no
  application server, no API of our own and no database tables.
- **Code runs in the visitor's browser.** Each tab has two Web Workers: one for Run, one for
  Live Build. A new request replaces the unfinished one (that worker is terminated and
  replaced), so a tab never runs more than one Run and one Live Build at a time. Limits: Run
  6 s and Live Build 1.5 s of wall time; 2,000 recorded steps, 2,000,000 operations, 200
  nested calls, 3,000,000 recorded values, 1,000 lines of output, 100,000 array items and
  1,000,000 string characters per run.
- **Sign-in is Supabase Auth** (managed). The browser talks to `https://<project>.supabase.co/auth/v1`
  directly with the public (publishable) key; see `docs/ACCOUNTS.md`.

What follows from this: one person's expensive program uses only their own CPU, and the
server side does no work per run. Load balancing HTTP traffic would not add execution
capacity, because there is no execution tier to balance.

## Hosting

Any static host with a CDN fits: Netlify, Cloudflare Pages, Vercel, or object storage
behind a CDN. **Nginx or a load balancer is not needed**: a CDN already serves the files from
many locations, and there is no app server to spread load across. If you self-host on one
machine, a single Nginx serving `dist/` with the headers below is enough.

- Build command: `npm ci && npm run build`. Publish directory: `dist`.
- Environment variables (build time, public values only): `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`). Never a secret key.
- The app has one page; demo links use a query string (`/?example=two-sum`), so no rewrite rules are needed.

### Response headers (`public/_headers`)

Netlify and Cloudflare Pages read `public/_headers` (Vite copies it into `dist/`):

| Header                                                            | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`                                         | Scripts, workers and fonts only from this site; network requests only to this site and Supabase; no framing; no plugins. `style-src 'unsafe-inline'` is needed by the code editor, which adds style elements. `font-src data:` is needed because the build inlines very small font files. `script-src 'wasm-unsafe-eval'` lets the Python worker compile the WebAssembly CPython (Pyodide) served from this site; it does not allow `eval` of JavaScript. |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | Standard hardening; the app uses no camera, microphone, location or payments.                                                                                                                                                                                                                                                                                                                                                                             |
| `Cache-Control: no-cache` on `/` and `/index.html`                | A new deploy is picked up on the next visit.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Cache-Control: immutable` for a year on `/assets/*`              | Built files have content hashes in their names.                                                                                                                                                                                                                                                                                                                                                                                                           |

Validated locally: the production build was served with exactly these headers (a small Node
server applying `dist/_headers`). The app loaded, the editor and both workers ran, sign-in
initialised, and the browser console showed no policy violations once `data:` fonts were allowed
(the first attempt blocked an inlined font, which is how that rule was found).

Vercel reads `vercel.json`, which sends the same headers on the same paths; `src/headers.test.ts` fails if the two files ever differ.
For Nginx, add them with `add_header ... always;` in the `server` block and serve `dist/` with
`try_files $uri /index.html;`.

### Before going public (needs your decision; nothing has been changed)

- Supabase **Authentication → URL Configuration**: production Site URL and Redirect URLs.
- Supabase's built-in email sender is for testing only: set up custom SMTP.
- Supabase security advisor (checked read-only): **leaked password protection is disabled**.
  Enabling it rejects passwords known from breaches. See
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- A privacy policy and terms of use; consider Supabase's CAPTCHA for sign-up.

### Rollback

- Static hosts keep every deploy: roll back by publishing the previous one (Netlify: Deploys →
  pick one → Publish deploy; Cloudflare Pages: Deployments → Rollback; Vercel: Instant Rollback),
  or redeploy a known-good git commit. `index.html` is never cached, so visitors get the
  rolled-back version on their next page load; old and new hashed assets can coexist.
- Supabase settings are reverted in its dashboard. There are no database migrations yet.

## Performance budgets (provisional)

Assumptions: a mid-range laptop, practice-sized inputs (up to about 1,000 recorded steps), a
warm browser. Phones will be slower; these should be re-checked on real devices.

| Measure                                                      | Budget       |
| ------------------------------------------------------------ | ------------ |
| Edit → Live Build drawing (includes the 300 ms typing pause) | ≤ 600 ms p95 |
| Edit → finished run drawn (includes 550 ms of typing pauses) | ≤ 2 s p95    |
| Step change, render and commit                               | ≤ 50 ms p95  |
| Engine run (in the worker)                                   | ≤ 500 ms p95 |
| Copying a run's result from the worker to the page           | ≤ 200 ms p95 |

The app records `drawgorithms:edit-to-live` and `drawgorithms:edit-to-run` as performance measures
(Performance panel in the browser's developer tools); while developing, a slower event is noted in
the console. Nothing is sent anywhere and no code is recorded (`src/diagnostics.ts`).

## Measurements (October 2026)

Environment: Intel Core i7-6800K (6 cores, 12 threads, 3.4 GHz), 16 GB RAM, Windows 10,
Node 25.8.0. Other builds and tests were running on the same machine at the same time,
so numbers are noisy; two runs are reported as ranges. Reproduce with
`PERF=1 npx vitest run src/engine/engine.perf.test.ts` (40 runs each after 5 warm-ups,
app default limits).

Engine (Node), p50 / p95 in ms. "Copy" is `structuredClone` of the run result, the same work
`postMessage` does between the worker and the page; part of it happens on the page's thread.

| Workload                               | Steps | Run p50 | Run p95   | Copy p50, before → after | Copy p95 after |
| -------------------------------------- | ----- | ------- | --------- | ------------------------ | -------------- |
| Two Sum, 100 numbers                   | 504   | 13–26   | 18–61     | 166 → 24–52              | 31–84          |
| Reverse a 200-node list                | 1,006 | 178–209 | 233–1,139 | 1,538 → 66–70            | 87–91          |
| Level order, 63-node tree              | 478   | 32–89   | 42–217    | 281 → 26–85              | 83–169         |
| LCS of two 12-letter strings           | 487   | 13–60   | 22–126    | 118 → 19–97              | 28–143         |
| Subsets of 4 (backtracking)            | 176   | 5–9     | 14–20     | 13 → 6–10                | 19–22          |
| Infinite loop (stops at 2,000 steps)   | 2,001 | 8–11    | 27–31     | 24 → 24–42               | 37–57          |
| Runaway recursion (stops at 200 calls) | 202   | 20–34   | 26–101    | 93 → 7–10                | 11–19          |
| 20,000-item array, 2,000 steps         | 2,001 | 31–32   | 43–47     | 597 → 149–170            | 198–241        |
| Live Build of the tree example         | –     | 0.3–0.4 | 0.5–1.9   | –                        | –              |

"Before" is the single measurement taken before snapshot sharing (see below); it was taken
under the same conditions.

Browser (an embedded Chromium window, production build served locally; the window was hidden
during these tests, which pauses animations and can slow timers, so paint and animation
smoothness were not measured):

| Measure                                | Result                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| Step change, list reversal (26 steps)  | p50 10 ms, p95 24 ms (development build: 68 / 130 ms)            |
| Step change, tree recursion (40 steps) | p50 13 ms, p95 22 ms, one 332 ms outlier                         |
| Edit → Live Build, cold page load      | 362–382 ms (three examples, one sample each)                     |
| Edit → run finished, cold page load    | 776 ms (Two Sum), 832 ms (list reversal), 1,036 ms (level order) |

Not measured: real phones, frame rates while animating, and API latency percentiles (there
is no API of ours; Supabase was deliberately not load-tested).

### What changed because of these measurements

- **Shared snapshots.** Every step used to record a fresh copy of every reachable object, so a
  run's result grew with steps × objects (26 MB for reversing a 200-node list), and copying it to
  the page took about 1.5 s. Steps now reuse the previous step's snapshot of anything whose
  contents are unchanged (compared value by value, so a change can't be missed), and the
  browser's structured copy stores each shared object once. The JSON size above is unchanged,
  because JSON writes shared objects out again; the copy the app actually makes is far smaller.
- **Long strings** are kept to their first 200 characters in each step (the true length is
  recorded and shown), and building a string over 1,000,000 characters stops with a clear
  message instead of crashing the worker.

### Remaining bottleneck

Each step still encodes every reachable object before comparing, so run time grows with
structure size × steps (about 200 ms for 1,000 steps over 200 nodes). This happens in the
worker, so the page stays responsive, but it delays the first drawing for large inputs.
Tracking changed objects precisely would remove it; that needs every mutation path to report
changes, and should come with its own tests.

## Capacity

Verified under the tested workload: per tab, at most one Run and one Live Build execute at
once; a newer request cancels and replaces the older one (covered by `src/state/store.test.ts`);
each run is bounded by the limits above. Execution cost therefore scales with each visitor's
own device, not with the number of visitors.

Not verified, and not load-tested: static hosting throughput (the CDN's) and Supabase Auth
limits (sign-ups and emails per hour depend on the plan; the built-in email sender is very
limited). Supabase was not load-tested because it is a third-party service.
