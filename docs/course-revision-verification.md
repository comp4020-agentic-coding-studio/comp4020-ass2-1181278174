# Course revision acceptance — 21 September 2026

This implements Plan A in `course-review-and-next-plan.md`. The richer models and flight
animation in Plan B remain separate. Work is local on `codex/ass2`; no publication or
hosted-site verification is claimed.

## Completed steps

| Step | Commit | Result |
|---|---|---|
| Align the weekly promises | `1a80be0` | Actual route counts; three-drone W7; explicit exact enumeration; W11 coordination choice; canonical-six A1 entry; method-specific guarantees. |
| Turn outlines into lessons | `1bdd014` | Twelve worked lectures with model boundaries, definitions, derivations, figures, examples, checkpoints and tutorial links. |
| Guide the tutorial experiments | `23c5036` | Twelve bounded two-hour outlines; real one-click comparisons; result before full controls; adjacent baseline; expandable configuration and records; actual directed search graphs. |
| Connect the local implementation | `b6165b4` | Student search, recurrence, swaps, assignment, migrations, reservation neighbours and improvement actually execute; separate teacher entry; offline tests and checked records. |
| Make assessment evidence readable | This acceptance commit | Computed assignment examples, criterion-by-criterion evidence, reproduction steps, index guidance, process evidence outline and final browser acceptance. |

Canonical data and hashes, course configuration, collection schemas, branding, build hooks,
assessment weights and due dates remain unchanged. A2 explicitly bounds the student
space-time exercise; the full flight planner and shared charging evaluator are provided.
The local pack format and the browser import format are different and documented.

## Automated and browser checks

- `pnpm check`: 147 tests in 15 files; type checking has no errors, warnings or hints.
  Build checks cover 37 pages, all internal links, accessibility and the W9 deck.
- The practice integration test extracts the generated ZIP into a fresh temporary folder
  and runs 19 native Node checks without installation or network. All twelve reference
  week paths and A1/A2 commands run; unfinished student assignments exit with errors.
- `pnpm check:evidence`: passes; `PROCESS.md` has 545 whitespace-delimited words and
  eight resolvable commit citations. It remains an agent-assisted factual account, not
  a substitute for the owner's own reflection.
- `scripts/check-lab-pages.mjs`: all 37 pages at 1920×1080 and 390×844; no document
  overflow or unhandled exceptions. Five navigations release old WebGL contexts.
  Only the seven designated desktop pages load 3D; no phone page does so automatically.
  An unavailable WebGL context leaves the readable 2D/evidence alternative.
- `scripts/check-lab-browser.mjs`: 55/55 interaction checks. Includes real custom-code
  errors/timeouts, stale results, independent tamper rejection, import/export, baseline,
  notes, scenario changes, cancellation, keyboard selection and reduced motion.
- `scripts/check-course-browser.mjs`: 24 weekly tutorial/viewports plus 36 checks for
  lectures, assignment examples, directed graph, native Enter activation, restored
  input state and the canonical-six assignment link.

Run the browser scripts after `pnpm build`, with the preview at
`http://127.0.0.1:4173/comp4020-ass2-1181278174/`. `LAB_QA_OUTPUT` selects an evidence
folder; `LAB_QA_CHROME` and `LAB_QA_LIBS` override the browser/runtime locations.

The original W6 browser assertion failed because it still expected automatic exact
comparison during a swap run. It now requires “Not run” until exact enumeration is
selected; the existing exact-selector check still asserts the correct optimum. Native
Enter testing also required its character payload; a raw key event alone did not activate
the browser button. Restoring saved input deliberately marks the old result stale and
requires Run; the check does not pretend that restoration executes saved code.

## What was observed

W4's default result begins at page coordinate 887 on desktop and 1035 on phone, compared
with 1079 and 1564 in the initial review. Its default visible controls fell from 65/59 to
24/19. These measurements describe one example under the checked viewports, not a general
performance guarantee. The question and comparison no longer require finding the record
panel near the bottom. The graph figure uses real directed edges instead of a node list.

The published actions reproduce cost 10 versus 2 (W2), 5 versus 4 (W3), the lost feasible
label (W4), local objective (48,55) versus exact (46,51) on symbolic data (W6), the payload
failure (W7), five seconds of waiting (W9), and a 120-candidate stop at 17/20 (W11).
W8 and W10 do not promise that every input change improves the on-time count. The A2
worked example truthfully shows the independent/coordinated tie at 13/20 before feedback.

Eight final viewport checks passed after the font/scroll-hint adjustment. The final visual pass checks the graph labels on phone and the assessment comparison
at both widths. The assessment table scrolls within its labelled region on a narrow
screen, with a visible scrolling hint. Result validity, delivery quality and search
termination remain distinct.

## Limits and owner follow-up

The website is a teaching simulation with a supplied model. Passing tests does not prove
universal algorithm correctness, authorship or teaching effectiveness. The new practice
skeletons intentionally require student implementation; the working teacher reference is
clearly labelled. No student work or submission receipt is fabricated.

The owner should inspect the revised lessons and use `course-process-notes.md` to write
or revise their own process account. The deployed URL, final publication and richer
Blender/Three.js models and animation have not been changed or verified by this revision.

## Saved evidence

The JSON reports and selected final screenshots are in
[`reviews/2026-09-21/course-revision/`](reviews/2026-09-21/course-revision/).
The initial review screenshots remain alongside that folder for comparison.
