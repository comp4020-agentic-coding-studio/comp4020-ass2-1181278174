# Lab rebuild proposal — 20 September 2026

Status: implementation authorised by the owner and in progress. Completion is recorded
against the gates below, not inferred from the existence of a page or a control.
The owner has asked for larger changes that bring the Lab back to the original plan.
The current branch is `codex/ass2`. This proposal follows `course.md` §§1, 6, 7 and 9,
and the original `site.md` §§3–6. It proposes replacing the presentation decisions in
`improvement-plan.md` that deferred 3D and reduced the semester control to selecting
separate weekly demonstrations. The history of that earlier delivery remains intact.

## 1. The change the student should notice

The Lab becomes one continuing planning workspace. A student changes an algorithmic
decision, runs it, locates the consequence in the search trace or flight events, compares
it with a baseline, and saves the evidence. Moving through the semester reveals additional
parts of that same planner. Each week has a distinct task and dominant view.

For example, W4 opens with the kitchen, the summit, both candidate routes and their full-trip
costs visible. Selecting the fast-only rule shows the exact label it discards. Selecting
that label locates its prefix on the map; a task replay accounts for outbound, service and
return energy. Changing the dominance rule and running again changes the actual search.
The student can explain the failure from the evidence on this screen.

## 2. Where the current implementation differs

These findings are from source inspection, not a claim that all existing computation is
missing. The search, label, timetable, fleet and reservation engines are useful foundations.

| Original design | Current implementation | Required rebuild |
|---|---|---|
| One workbench, three modes, cumulative layers | `src/pages/lab/index.astro` creates twelve Workbench instances and changes which is hidden. | One workspace state, a case picker, three modes and stage-aware panels. Only the active experiment computes or renders a scene. |
| Inspectable 3D on seven named pages | Maps are responsive SVG; W4 has an elevation profile. No 3D scene or playback exists. | Add the shared procedural scene, selection and event playback, retaining SVG and tables as working alternatives. |
| Five strategy slots used by the engine | The heuristic has a composer and custom-code path. W4, ordering, assignment and priority mostly expose fixed switches. | Implement all five slot groups with presets, a rule composer, generated code and an editable function. |
| Hand-built plans and scenario variants | W5/W6 accept an order-ID sequence; W8 offers one predetermined migration. | Direct reorder, assignment, requested departure and candidate-route controls; editable scenario copies within the fixed world. |
| Distinct weekly reasoning activities | W2/W3 have a real search trace; W4 has label results, but W9 only switches three arrangements and W12 selects a static order report. | Add missing diagnostic traces, linked inspections and execution playback. Preserve the working search trace. |
| W6 runnable local/global counterexample | The canonical six-order calculation runs; its swaps already reach the optimum. The symbolic counterexample is teaching text. | Make the documented symbolic case runnable and editable, separately labelled from the canonical flight case. |
| W7/W8 progression on a small fleet case | W7 uses #01–#09 plus #20; W8 immediately evaluates all twenty. | Keep the ten-order main case through W8, add the hand-worked one-pad case, then offer the full evening as an extension. |
| W11 feedback search | `levels-case.ts` re-evaluates stored migration choices. The engine's `assign.ts` already has an improver. | Expose a bounded live improvement run with accepted and rejected candidates, cancellation and full re-evaluation. |
| Versioned, reproducible records and plan import | Export contains per-week settings, notes and a rendered text snapshot. There is no import or complete run archive. | Store structured inputs, versions, algorithms, events, validation and notes; import data, recompute and compare. |
| One full plan checker for every input path | `validate.ts` checks intervals, capacities and delivery accounting; geometry, payload and energy are computed elsewhere. | Add an independent full-plan checking entry point before imported or manually constructed trajectories can be called verified. |

## 3. Workspace and tutorial experience

The desktop Lab has a semester strip and case picker above three modes:

- **A · Search and full task (W1–W4):** graph/scene, OPEN or label inspector, strategy.
- **B · Orders and fleet (W5–W8):** order board, drone and pad timelines, candidate moves.
- **C · Shared space and feedback (W9–W12):** reservations, space-time trace, replay and
  consequences of assignment changes. Earlier search and schedule details remain available.

The centre presents the relevant decision: a route in W4, the timetable in W6, the shared
corridor in W9. The right-hand inspector follows the selected node, label, order or interval.
The bottom comparison area pins a baseline and marks changed values and events. It links
each important difference to its cause. A map is a secondary view when the timetable carries
the lesson better.

The semester slider changes the model and available layers, rather than instantiating a
fresh mini-app. It names the newly added constraint and keeps the learner's saved work.
Case subsets and model assumptions are explicit. Results from different assumptions are
labelled as a model comparison; the interface does not describe them as a better algorithm
under identical conditions. Later weeks remain directly accessible.

Tutorial pages open the same workspace with the week's case and primary action selected.
An immediate, computed demonstration satisfies the original result-first requirement.
The guided exercise then follows prediction → hand trace → strategy change → run → compare
→ explain/export. Reference explanations in this guided activity follow the prediction;
the demonstration and later weeks are never locked. This reconciles the two existing
requirements instead of hiding the whole page behind a form.

On a phone, show the decision, compact result, primary control, scene poster, then inspector
and details. Load 3D on request. Keep ordering, selection, stepping, comparison and export
usable with touch and keyboard, without requiring drag or camera manipulation.

## 4. The twelve weeks to build

| Week | Student action | Dominant view and evidence |
|---|---|---|
| W1 | Check a proposed connection through a building; choose three legal candidate routes and account for their edge costs. | Kitchen-block scene; highlighted blocked segment; route cost table and outbound/service/return state diagram. Proposed edges are diagnostics, not additions to the canonical graph. |
| W2 | Predict and step the next expansion; compare stop-on-discovery with stop-on-pop. | Graph, OPEN queue, parents and one relaxation at a time. The deliberately wrong search is diagnostic; source=goal, unreachable and improved-distance examples are available. |
| W3 | Compose or write `h`; toggle reopening; make a variant of the four-edge example. | The exact failed consistency inequality, reopened node, cost and expansion differences. Compare against Dijkstra on the same input. |
| W4 | Change `dominates` and `withinBudget`; inspect a lost feasible prefix; replay the complete task. | Two routes in 3D, paired time/energy labels, reasons for keeping or pruning, and outbound/service/return ledger. The labelled symbolic case and real #07 case both run. |
| W5 | Move six orders up/down; change ordering weights; calculate the next departure and delivery. | Editable order board and timetable; ready-time and availability dependencies; fixed course objective alongside clearly labelled alternative objectives. |
| W6 | Choose a swap; inspect all fifteen neighbours; run improvement and enumerate all 720 sequences. | Candidate moves, accepted/rejected reasons, objective trace and exact comparison. Run the symbolic counterexample as well as the unchanged canonical case. |
| W7 | Move an order between drones; change assignment cost; attempt #20 on a light drone. | Order-to-drone board, feasibility/cost matrix and per-drone finish times. Invalid payload assignment is explained and kept as a diagnostic. |
| W8 | Reorder or migrate an order and follow the charging consequences. | Two-drone/one-pad hand example, then the ten-order/two-pad case. Linked drone and pad lanes show who requested first, who occupied each pad and which later task moved. |
| W9 | Mark an overlap, try waiting or a detour, then compare node-only and place/phase/time deduplication. | Corridor scene and occupancy intervals; the runnable P,3 → P,6 → G,8 example exposes deleted wait states. Search expansion is distinct from flight playback. |
| W10 | Change the priority slot; step legal moves and waits around existing reservations. | Space-time trace and scene share a selected event. Waiting changes energy, delivery and return; failed full tasks leave no reservations. |
| W11 | Start from the same assignment, allow a swap or migration, and run a bounded feedback search. | Three-method comparison, real candidate evaluations, acceptance/rejection reasons and a dependency chain from assignment through routes/pads to lateness. |
| W12 | Replay a chosen run; select a late or unfinished order; import a run and reproduce it. | Twenty-order timeline, event controls, selected task in the scene, independent validation and cause chain. Choose the greedy or user run for failures; do not invent a failure in the on-time reference. |

The symbolic examples use their own stated units and the existing checked examples in
`docs/examples.md`. The original layout sketches contain illustrative numbers. Actual
Slop Hill totals, timings and heights come from the current canonical model. A zero gap
between swaps and enumeration is a legitimate result, and stays zero.

## 5. Map and playback

Restore the original seven-page scope: home, W1, W4, W9, W10, W12 and Lab share one scene
implementation. Other tutorials use the relevant SVG, graph or timeline. Use procedural
terrain, buildings, kitchen, pads and two distinguishable drone types first. Polished models
can be substituted later; no essential behaviour waits for Blender assets.

The scene has named landmarks and a fitted initial camera. It highlights only the current
decision: a building-crossing edge in W1; ridge, contour and return in W4; corridor occupancy
and waiting points in W9. Labels and direction markers identify routes without relying only
on colour. A plan view and an accessible address list give another way to select entities.

Playback is an inspection of a computed event record. Play/pause, previous/next event and
the time scrubber move the scene, timetable and inspector together. They never rerun the
planner on each frame. Search stepping uses a separate expansion cursor so an explored edge
is never mistaken for a flown edge. Reduced motion retains static selection and step controls.

## 6. What the learner can create

All editing operates on a local scenario copy or a candidate plan, leaving canonical source
files and their pinned hashes intact.

- **Hand plan:** select an order, choose a compatible drone, move it within a queue, request
  a departure time, or select a legal candidate route. The evaluator/checker establishes
  resulting times and feasibility; manually typed result totals are never trusted.
- **Scenario variant:** add an order at an existing address, with weight, ready and promised
  times; close an existing corridor for an interval; configure 1–3 pads and 1–5 drones of
  the existing types. Restore the canonical case at any time. No map-edge creation, weather,
  server or second map is introduced.
- **Micro-example variant:** edit a symbolic graph or six-job table in its separate case.
  Record that model explicitly and never silently substitute these numbers into the full map.
- **Strategy:** five slot groups, each with three meaningful presets, a composer, generated
  code, and an optional code editor. These are `h`; `dominates`/`withinBudget`;
  `orderKey`/`objective`; `assignCost`; and `priority`. The run records which function ran.
  Code errors and timeouts are visible; there is no fallback to a successful preset.

The course objective remains the formal assignment comparator. An alternative `objective`
slot is a labelled teaching comparison and cannot turn a different metric into a claimed
improvement under the course objective.

## 7. Computation and records needed underneath

Keep the tested engine and introduce an adapter that returns structured results, trace
events, task events, resource intervals, metrics and validation. Render these objects in
panels instead of building the entire interface as one HTML string. Give events stable
identities so an inspector can locate their node, drone, order and blocking resource.

Extend the engine's existing option types for real slot callbacks, retaining current
defaults. Expand trace output where it currently contains only the final result or accepted
moves. Reuse `src/engine/assign.ts`'s improver and add measurable evaluation/expansion budgets,
progress and cancellation. A custom function runs in a terminable Worker. Measure the other
computations and move them off the main thread when the documented 100 ms threshold is
exceeded. A Worker alone is not a security sandbox; verify the original no-network contract
separately before offering arbitrary code.

Add a full-plan checking facade with access to the world, task phases and paths. It must
recompute edge legality, payload changes, time, energy/reserve, deliveries, resource use and
completion from the candidate, using the existing interval checker as one part. Keep a
candidate's constraint status and completeness explicit. A partial or invalid plan has no
comparable formal objective, but its diagnostic can still be saved.

A run includes case/configuration and hashes, model stage, engine/algorithm/slot versions,
input plan, parameters, search limits, structured outputs, check results and notes. A local
archive supports reopening, pinning and export. JSON import reads data and recomputes;
imported source text, if present in an archived record, is not executed automatically. URL
sharing restores supported settings; full records carry larger variants and private notes.
Changing inputs marks the previous result stale. An older computation cannot replace a new run.

## 8. Implementation sequence and completion gates

| Part | Concrete delivery | Gate before expanding |
|---|---|---|
| 1. Shared workspace and complete W4 slice | Workspace state, structured run adapter, linked selection, procedural scene, both W4 slots, complete-task ledger, replay, baseline comparison and record. | The seven W4 actions below work on desktop and phone with real engine outputs. |
| 2. Complete Mode A | W1 geometry inspection; W2 diagnostic stopping; W3 editable microcase and heuristic; W4 label traces and independent task checks. | A changed function changes the trace; wrong rules produce a genuine, labelled counterexample; correct defaults retain existing results. |
| 3. Complete Mode B | Order/assignment board, ordering and assignment slots, live symbolic W5/W6 cases, neighbour reasons, ten-order charging timelines. | A manual move recomputes downstream tasks and resource queues; 720 enumeration checks the displayed local result under the same model. |
| 4. Complete Mode C | W9 wait-state diagnostic, W10 priority and reservation traces, W11 bounded feedback, W12 full replay and failure tracing. | Each selected delay links to its actual predecessor or occupied resource; failure rolls back reservations; cancellation retains the previous valid plan. |
| 5. Creation, import and cumulative record | Scenario overlays, complete plan checking, import/export, run archive, five-stage worked-example record, runnable practice skeletons/tests. | An exported case/run can be imported and recomputed; changed self-reported metrics are ignored; all input paths use the same checks. |
| 6. Course integration and verification | Tutorial presets, A1/A2 case entry points and sample submissions, shared home/deck corridor example, seven-page 3D lifecycle, updated documentation. | All twelve weeks meet their activity contract; base-path links, keyboard use, reduced motion, both viewports and existing project/evidence checks pass. |

The first part is deliberately a complete W4 experience. It is the clearest place to verify
that the structure, map and algorithm interaction match the original intention before the
same design is extended through the remaining weeks. A new frame with the old W4 table
inside it does not meet this gate.

W4 acceptance:

1. Open directly and identify kitchen, #07, ridge, contour and the selected return route.
2. See the loaded outbound, service and unloaded return contributions and reserve requirement.
3. Switch to the fast-only diagnostic; select the discarded feasible label and locate its path.
4. Change the actual dominance/budget functions and reproduce the changed search trace.
5. Step or scrub the task, keeping scene, ledger and energy accounting synchronised.
6. Pin the baseline and inspect marked differences; changed assumptions are identified.
7. Continue from Tutorial to Lab, refresh, export and reopen without losing the experiment.

## 9. Verification and limits of this proposal

Implementation will retain the canonical-data, calibration, engine and course checks and add
behavioural checks for the new contracts. Browser acceptance covers actual controls and
cross-panel selection, not just the presence of twelve week titles. Inspect 1920×1080 and
390×844, keyboard alternatives, reduced motion, unavailable WebGL, repeated navigation,
stale results, code errors/cancellation, invalid imports and export/recompute consistency.
Run `pnpm check` and `pnpm check:evidence` at the relevant completion gates. Publishing is a
separate delivery step and is not part of this proposal.

This planning turn creates a design document and an illustrative, interactive interface
sketch. The sketch switches between W4, W6 and W9 and previews linked selection/strategy
states. It does not implement the production scene, connect to the project engine or claim
new experiment results. Its layouts and sample states are for reviewing the proposal.

Planning verification: the illustrative W4, W6 and W9 interactions were checked in a local
Chromium at desktop and phone viewport sizes, with light and dark appearances. All 51
interaction/layout assertions passed; screenshots were inspected and a route label was
moved clear of its line. The phone places comparison and the primary action before the
map. This was a check of the proposal sketch, not a new production-site test run.
`git diff --check` passed. Production source files were not modified in this planning turn.
