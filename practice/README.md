# SLOP3969 runnable practice pack

Use Node.js 24 or later. No package installation or network is needed.

1. Unzip this folder and run `node --test strategies.test.mjs`. Five working baseline checks should pass.
2. Run `node run.mjs 4` (or a week from 1 to 12). This writes a versioned `run-w4.json` record. Import it in the Lab, review its functions and press Run to recompute.
3. Edit `strategies.mjs`. The seven functions form five slot groups: heuristic; labels/budget; order/objective; assignment; priority. Their arguments are shown in the website's generated function bodies. Inputs are seconds and joules on the canonical map. The six-job counterexample has separately labelled symbolic units.
4. For the independent implementation exercises, complete `mySearch` and `myNeighbours`. Run `node --test search.exercise.mjs`: its three tests intentionally fail until those skeletons are implemented. Add unreachable, source=goal, reserve and interval-boundary tests of your own.

`mySearch(edges, source, goal, h)` returns `{status, cost, path}`. Edges carry `from`, `to`, `cost`. Keep best distances, parent pointers and a priority OPEN list; pop the goal and reopen a closed node when a better path reaches it.

`myNeighbours(state, edges, reservations)` returns successor states with `node`, `phase`, `tick`, `energy`. The small exercise permits a one-second zero-energy wait at P and uses half-open resource intervals. This symbolic exercise is separate from the full flight model, where airborne waits consume energy and the return leg is mandatory.

`engine.mjs` is the same reference engine used by the website, bundled locally so it runs offline. `scenario.json` contains the unchanged canonical map, rules, orders and fleet. The reference is for comparison: assignment submissions must explain the student's implementation and acknowledge reused code.

For A1, start with weeks 2–6, the six canonical orders and the published comparison objective. For A2, use weeks 7–12, check all twenty orders, compare priorities and preserve the full resource record. `sample-a1.json` and `sample-a2.json` are computed example records, not submission receipts. The site has no upload service.

Every record contains its input, case and engine version, non-cryptographic input/model fingerprints, strategy sources, complete result tables, and (for fleet cases) flight actions and independent checks. The browser imports input and recomputes; self-reported totals are never accepted as evidence. Custom code only runs after explicit review/Run. In this local Node exercise, code runs with the permissions of your own program.
