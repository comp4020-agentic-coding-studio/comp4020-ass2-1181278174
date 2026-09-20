# Lab rebuild verification — 21 September 2026

The owner requested larger changes to match the original Lab design, then authorised
implementation without another approval pause. This record covers the local `codex/ass2`
branch. It does not claim that the hosted site has been updated.

## What was implemented

The Lab and tutorials now use `LabWorkspace.astro` and the structured `src/lab` adapter.
The semester page mounts one experiment and one scene, with three modes and saved weekly
inputs. Search, labels, timetable, assignment and space-time planning still use the shared
engine. The old Workbench modules remain for the existing static worked record and deck;
the twelve hidden Lab component instances were removed.

| Gate | Implemented and checked |
|---|---|
| W4 complete slice | Actual dominance/budget callbacks; complete kept/pruned paths; ridge/contour candidates; outbound, service and unloaded-return ledger; independent reserve check; linked map/trace/replay; baseline, archive and export. |
| Mode A | Building-intersection inspection, legal routes and task phases; goal-discovery bug; source=goal and unreachable cases; editable inconsistent-heuristic micrograph with the failed inequality. |
| Mode B | Editable six-order board; every pair swap with its decision; all 720 permutations; symbolic local/global gap; payload/range matrix; migrations; ten-order charging case plus two-drone/one-pad exercise. |
| Mode C | Actual corridor overlap/wait/detour; P@3 to G@8 waiting-state diagnostic; priority function and outbound/return search trace; bounded live feedback; full twenty-order replay and late-order predecessor/charging/reservation explanation. |
| Creation and records | Scenario forms and JSON copies; added orders at existing addresses; pad/drone/closure settings; requested take-offs and fixed route candidates including space-time waiting; versioned input, source/hash, actions, checks and notes; imported actions independently checked and inputs recomputed only on Run. |
| Course delivery | Shared home/tutorial/Lab workspace; five-stage worked record; assignment download links and computed A1/A2 examples; offline practice archive containing seven working strategy functions, two implementation skeletons, baseline tests and exercise tests. |

## Commands and outcomes

- `pnpm check`: zero type errors, warnings or hints; 142 tests in 13 files passed.
- `pnpm check:evidence`: passed with `GITHUB_REPOSITORY` set to the existing origin's
  repository name, so the Assignment 2 checks were enabled. The local package process
  did not discover origin on its first run. All four cited commits resolve; the updated
  agent-assisted `PROCESS.md` contains 484 whitespace-delimited words.
- Build integrations: 37 pages; no accessibility, base-path, broken-link or deck-structure
  violations. The four canonical file hashes and original calibration checks passed.
- `node scripts/check-lab-browser.mjs`: 55 interaction assertions passed, including
  custom-code syntax/type failures, the eight-second timeout, cancellation, import with
  tampered self-reported metrics, exporting notes and baseline, actual order migrations,
  the twenty-first order, scenario reset, trace selection, keyboard selection and replay.
- `node scripts/check-lab-pages.mjs`: all 37 pages at 1920×1080 and 390×844, with no
  document overflow or default runtime exception. Exactly seven desktop pages loaded
  WebGL; no phone page loaded it automatically. Five real Astro page navigations released
  their previous WebGL contexts. Forced WebGL failure kept the 2D map and result table.
- The extracted practice pack ran all five baseline tests successfully with Node 24.
  `search.exercise.mjs` is explicitly an unfinished student exercise, separate from those
  passing baseline checks and the site's regression suite.

The browser scripts expect the local preview at
`http://127.0.0.1:4173/comp4020-ass2-1181278174/`. They use separate temporary browser
profiles. `LAB_QA_CHROME`, `LAB_QA_LIBS` and `LAB_QA_OUTPUT` override the local browser,
library and output paths. The default output folders are `/tmp/comp4020-lab-acceptance`
and `/tmp/comp4020-lab-pages`; each contains machine-readable check records. These are
local QA artifacts, not deployed assets.

The final run of the committed scripts used `LAB_QA_OUTPUT` to write to
`/tmp/comp4020-lab-acceptance-final` and `/tmp/comp4020-lab-pages-final`. Both scripts
exited successfully. The former includes W4, W6, W9 and W12 screenshots at both sizes;
desktop W4 and phone W6 were inspected again after the final label and layout changes.

## Numbers reproduced from the engine

| Experiment | Observed result |
|---|---|
| W4, L, #07 | Chosen full trip 472 s and 80,443 J; usable budget 80,750 J. Time-only dominance loses the feasible route. Ignoring the budget is rejected independently. |
| W6 symbolic case | Swaps stop at lateness 48; exact enumeration reaches 46, final return 51. The canonical six-order case remains separately labelled and can have a zero gap. |
| W8 main case | Ten orders, original mixed fleet, two shared pads. Default completion assignment delivers 8/10 on time, lateness 761 s. |
| W9 corridor | A wants [107,132), B holds [87,112); waiting shifts A's crossing to [112,137), adding five seconds of hover. |
| W11, 120-candidate feedback | 13/20 becomes 17/20 on time; lateness falls from 9,402 to 615 s. The result is marked budget-limited, with one accepted change, not a proved local optimum. |
| W12 reference | Re-evaluated and independently checked: 20/20 on time; all returned at tick 8,579. |

## Failures that changed the implementation

The four new strategy-slot tests initially failed against the old engine: callbacks were
ignored, pruned events lacked a complete path, and goal discovery had no diagnostic mode.
They passed after those behaviours were implemented. Disabling the independent action
energy comparison made the tampering regression fail (`expected true to be false`);
restoring it made the suite pass. This establishes that the checker test detects the
intended failure, rather than trusting the planner's own green flag.

The first build caught interactive markers nested inside an SVG image role; the map is
now an interactive group with individually named controls. Browser acceptance then caught
duplicate initialisation, which made the first baseline appear stale and omitted it from
export. Initialisation is now idempotent across the normal load and Astro page-load event.
The exact-enumeration selector was added to input validation after checking every selector
value. No canonical number was changed to make a demonstration pass.

## Runtime and limits

A measured 120-candidate feedback calculation took about 427 ms on this machine; W4 took
about 9 ms and a complete reference calculation about 5–35 ms depending on cache state.
Experiments share a fresh worker path so long searches and user code can be terminated.
Custom code has an eight-second limit; other runs have a 45-second limit and explicit
expansion/candidate budgets. Search traces are capped and labelled as trace views, separate
from the complete flight action record.

The worker is created by an opaque-origin frame whose policy disallows connections and
external scripts. The network test first reached a local test server from the page, then
ran a custom function that tried the same fetch; the server request count stayed at one.
Loading a valid external script from that server was also blocked. A nonce protects the
worker response channel, and complete returned plans are checked again outside the realm
that executed custom code. This is a course strategy runner, not a general hosted IDE.

The 3D scene uses procedural geometry and real map coordinates. Heights are visually
exaggerated threefold and labelled in real metres. The late-order analysis reports observed
predecessors and blockers; it does not claim a globally optimal causal intervention.
The 7.6 MB build includes a lazily loaded Three.js scene chunk (about 143 KB gzipped);
the build's 500 KB uncompressed-chunk advisory remains visible. No hosted deployment,
push, merge or assessment submission was performed.
