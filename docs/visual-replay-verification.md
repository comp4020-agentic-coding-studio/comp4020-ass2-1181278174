# Visual models and replay acceptance — 21 September 2026

This completes Plan B in `course-review-and-next-plan.md`, locally on `codex/ass2`.
Blender supplies original reusable meshes; Three.js places them and reads the computed
flight record. No published-site update is claimed.

## Completed stages

| Stage | Commit | Result |
|---|---|---|
| B0: visual contract | `38c23b7` | Separate coordinates, asset anchors, 22 safe decorative house locations and terrain-following streets. |
| B1: original assets | `5276a3b` | Four house types, kitchen, towers, pad and L/H drones; generator, editable Blender source, GLB and manifest. |
| B2: map integration | `3cefa94` | Forty buildings, instanced static meshes, optional flight network, selected-order routes, W4 approach labels, procedural fallback. |
| B3: event animation | `8aa0544` | Ground/air states, heading, rotors, parcel removal, actual pad queues, charging energy and deterministic seeking. |
| B4: causes and controls | `68f2539` | Slow playback, first issue, next wait, optional follow, pause at issues, resource occupancy and late-task causes. |
| B5: acceptance | This acceptance commit | Browser regression script, viewport evidence, loading/disposal checks, measurements and this record. Play skips an opening idle gap by default; learners can turn that off or seek through it. |

Canonical map, fleet, orders, rules and pinned hashes are unchanged. Streets and added
houses do not participate in flight legality or scheduling. Existing obstacle footprints,
3× visual elevation, rendering resolution and simple lighting are retained. Model download
failure leaves procedural 3D; unavailable WebGL leaves the SVG, replay controls and tables.

## Reproduce the teaching path

1. Open W4, press **Play replay**, then **Follow selected order** in 3D. The clock jumps
   over idle time, then shows loading, the loaded outbound flight, service and the unloaded
   return. Pause or seek to inspect the phase, actual elevation and battery. The clock
   still uses seconds after 18:00; a search expansion remains a separate step.
2. Try the fastest-label rule. The lost route has no successful flight events. Candidate
   colours identify outbound approaches, while the selected unloaded return is dashed.
   Candidate time/energy figures still include the complete trip and service.
3. In W8 compare one pad, then **Next wait**. At 1071 s, B queues while A occupies the
   only pad on [589,1258). B's recorded wait is 187 s; it does not consume hover energy.
4. In W9 choose **Go to first issue**. Both reservations overlap on [107,112), and the
   corridor volume and text show the conflict. At 112 the overlap ends. **Let A wait for B**
   removes the overlap and records five seconds of hover energy. Default speed is 1×.
5. In W12 compare the greedy plan, then locate its first late order. Its selected trip,
   promise, delivery time, previous task, charging and recorded waits explain the outcome.
   **All orders** reveals the whole plan; it is not the default map clutter.

Follow is optional and disabled under reduced motion. Nothing auto-plays. Phone pages
start in 2D and load 3D only on request. The new controls remain available in SVG lessons
such as W8. A reservation conflict is not inferred from whether two rendered bodies touch.

## Checks and measurements

- `pnpm check`: 160 tests in 19 files; no type errors, warnings or hints. Build checks
  cover 37 pages, accessibility, base-path links, course references and the deck.
- Layout clearance and GLB anchor tests were demonstrated failing with targeted mutations.
  Four phase tests failed on the original replay before implementation. The curved-path
  regression exposed a 9.238 m line/replay height mismatch; both now interpolate by distance.
- `check-lab-pages.mjs`: 74 page/viewports, no overflow or unhandled exceptions; exactly
  seven desktop scenes, no automatic phone scene, five released contexts after Astro
  navigation, and readable unavailable-WebGL fallback.
- `check-lab-browser.mjs`: 55/55 prior interaction assertions, including custom code,
  import/export, independent checking, persistence, cancellation and keyboard selection.
- `check-course-browser.mjs`: 24 tutorial/viewports and 36 further course checks passed.
- `check-visual-replay.mjs`: 37/37 assertions; phase/parcel boundaries, resource interval boundaries, issue
  pauses, wait blockers, pad queues, late-order causes, focused routes, both viewports,
  reduced motion, blocked GLB and delayed-load navigation. The saved JSON records the count.
- The GLB is 37,312 bytes (4,763 bytes with gzip); editable source is 134,859 bytes.
  No texture downloads. W4 initially uses 53 draw calls and 15,728 triangles including
  terrain, routes and markers. Static buildings share meshes through instancing.
- A 30-frame follow-replay sample at each viewport had a 16.7 ms median and 16.7–16.8 ms 95th-percentile
  interval in local Chromium/SwiftShader. Local GLB fetch timing was around 2 ms. These
  small local samples are not guarantees for physical phones, network connections or GPUs.
- `pnpm check:evidence`: 10 commit citations resolve; PROCESS.md has 587 words. The
  checker skips its remote-derived reflection check because this checkout has no origin.

Use `pnpm build` and a preview at port 4173, base `/comp4020-ass2-1181278174/`, then
run the scripts above with Node. `LAB_QA_OUTPUT` selects the evidence directory;
`LAB_QA_CHROME` and `LAB_QA_LIBS` select Chromium and its runtime libraries.

## Evidence and limits

Selected screenshots and JSON reports are in
[`reviews/2026-09-21/visual-replay/`](reviews/2026-09-21/visual-replay/).
The source generator is `tools/models/build_assets.py`; the export contract is
`visual-model-contract.md`. Blender 5.2.2 LTS produced the models in a separate owned
scene; the original scene was preserved.

During acceptance, the agent fixed phone label clipping, a destination marker that
covered the drone, the curved-path height mismatch, and the long idle lead-in to W4.
The local commit/check ordering mistake and correction are recorded in `moments.md`.
No engine rules, grading weights, deadlines, teaching outcomes or claimed optima changed.

No push, deployment, publication or physical-device test was performed. The owner's
judgement is still needed for teaching quality and their own process reflection. The next
review is the local W4 and W9 interaction above; publication remains a separate action.
