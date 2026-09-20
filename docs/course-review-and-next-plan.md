# Course review and next implementation plan

21 September 2026. Review of local branch `codex/ass2`, starting at `1328c4d`.
Status: proposal, not an implementation or a claim about the deployed site.

The owner asked for an evaluation of Lectures and Tutorials, curriculum continuity,
readability, difficulty and ease of testing, followed by a content plan and a plan for
richer Blender models and diagnostic flight animation. This document records both.

## 1. The assignment and the design judgement

The [Assignment 2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
weights process at 45%, the deployed artefact at 20%, and response to the brief at 35%.
It asks for one coherent niche course, twelve dated weeks, a lecture deck, assessment
totalling 100%, project checks and process evidence. Markers sample the site as a
prospective student for about ten minutes. The [marking environment](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
uses Chrome at 1920×1080 and 390×844 and normally evaluates the deployed site without
building the repository. The published due date is noon on 21 September 2026; any
extension is outside this review's knowledge.

The course premise is strong: the same kitchen and evening turn routing into scheduling
and coordination. Keep it. Keep the two assignments, the five conceptual stages, the
checked canonical data and the existing computational engine. The greatest remaining
weakness is the gap between the rich design documents and what a student can learn and
do from the pages alone. Another large feature pass would not close that gap.

The previous rebuild established real computation, state, replay and records. Its
automated acceptance did not establish adequate teaching materials or an intuitive
entry experience. This review explicitly checks those different questions.

Priorities are: resolve contradictions and evidence risks; complete the teaching path;
make a first experiment easy to understand; then enrich the scene and its explanations.
Visual work should support a judgement about an experiment, rather than consume the
time needed to make the course intelligible.

## 2. What was examined

- All twelve lecture and twelve tutorial content files; the generated checkpoints;
  both assignment pages; the W9 deck; home, policies, navigation and practice materials.
- `docs/course.md`, `docs/site.md`, the Lab redesign and delivery contracts; the Lab
  configuration, computation, rendering, replay and scene source.
- All twelve default experiments, plus W5 ordering alternatives and W11 methods,
  through the existing bundled reference engine.
- Eight local pages at both exact marking viewports: Lectures W3/W4 and Tutorials
  W1/W4/W6/W7/W9/W12. Four changed browser experiments: W4 fastest-only labels, W6
  enumeration, W9 waiting and W11 bounded feedback; also W11's available controls.
- The downloaded practice archive in a temporary directory. A sentinel error in
  `mySearch` did not affect `node run.mjs 2`, confirming the student search is not called.
- The evidence check: it reports that assignment reflections are not required and that
  all four PROCESS commit citations resolve. A preliminary sandboxed run skipped repo
  detection; the unrestricted read-only rerun completed that check.

The 16 browser page/viewport observations had no horizontal overflow or runtime
exceptions. This is a targeted content and usability review, not a new full regression,
keyboard, screen-reader or performance certification. The live GitHub Pages URL could
not be inspected through the web tool; parity with this local branch remains unverified.

Recorded browser observations: [JSON](reviews/2026-09-21/browser-review.json).
Entry and scene evidence: [W4 phone](reviews/2026-09-21/w4-phone-entry.png),
[W4 desktop](reviews/2026-09-21/w4-desktop-map.png).

## 3. Findings

### F1 — Lecture pages describe teaching more than they provide it

The lecture Markdown bodies contain approximately 138–200 whitespace-delimited words
each, excluding metadata and the separately rendered checkpoint. Each page does contain
a useful worked checkpoint with a folded answer; the problem is not a complete absence
of examples. The main body mostly says what will be covered and what students must
derive, without supplying the derivation, annotated pseudocode or intermediate steps.

For example, W3 introduces admissibility, consistency and reopening in a few sentences.
The checkpoint shows the right counterexample, but there is no sequence of OPEN states
that teaches the reasoning. W5 asks for a timetable recurrence without presenting all
terms as an accessible, worked recurrence. The original design explicitly promises
course notes and does not leave every derivation to the student.

Required readings are documented in `docs/course.md` but not linked from the lecture
content. The public site needs selected readings with a specific section and purpose,
and self-contained notes sufficient to perform the required lab.

### F2 — Tutorial instructions arrive too late in the page

`src/pages/sessions/[slug].astro` places the entire workspace before the tutorial body.
The workspace itself contains the map, inspector, tables, strategy editors and records.

Fresh W4 measurements on the 390×844 layout: result starts around y=1,564, Keep as
baseline around y=5,641, and the tutorial's “This week's question” around y=6,724.
W12 reaches about 10,137 pixels in total page height. On desktop, sampled tutorial
results also begin around or below the first 1,080-pixel viewport.

W4 exposes 59 non-collapsed workspace controls on the phone; W12 exposes 225. These
counts include controls further down the document and are not first-screen counts.
They nevertheless show how much interaction is presented at once. On W7/W12 the open
assignment board precedes the map, so reaching the visual explanation requires passing
many order controls. There is no dedicated one-action demonstration even though the
lesson metadata already defines a primary action.

Move a short task and a direct demonstration ahead of the full workspace. Keep the
baseline and changed result next to the main action. Preserve the complete Lab for
students who need its deeper tools.

### F3 — Some instructions and experiments contradict one another

| Place | Observed mismatch | Proposed correction |
|---|---|---|
| W1 | Tutorial says eight nodes and three routes. The default run reports ten nodes and two legal alternatives; the table caption still says three. | Prefer teaching the actual fixed subgraph and computed alternatives. State which rejected candidate illustrates the geometric error. Do not invent a third legal route or silently alter canonical edges. Update the design description with this explicit decision. |
| W1 | Students are told to “fix the graph”, but the site exposes inspection, not graph editing. | Say whether the correction is a paper/local-code exercise; in the browser, ask them to reject the proposed edge. |
| W2 | Preparation refers to the W1 block; default lab is the symbolic discovery counterexample. Guided steps mention #03 and a heuristic comparison. | Name the two phases: first the three-edge stop-condition example, then the canonical graph. Keep the main heuristic lesson in W3. |
| W6 | Selecting exact enumeration still appends “this proves only a local optimum”. The default swap run also enumerates all 720 immediately. | Separate selected-method result, swap benchmark and exact benchmark. State the guarantee for the selected result; make the exact comparison an intentional action. |
| W7 | Title and prose promise three drones; default config uses A–E, five drones. The one-type fleet is not specified clearly. | Provide a named three-drone mixed preset and, if needed, a three-heavy-drone comparison. Keep fleet size fixed when comparing types. An all-light fleet with #20 must be labelled infeasible. |
| W11 | Guided steps say “Choose reserved routes”; no option with that name exists. | Provide named independent / fixed assignment with coordination / feedback comparison actions using identical saved inputs. |
| W11 | Default independent and coordinated runs both return the same valid 13/20 result. The instruction presumes a resource violation and new waits. | Ask whether a difference exists. A tie is a valid result. Add a separately labelled reservation-pressure variant only if its actual computed effects support the lesson. |
| A1 entry | “Open the relevant Lab” links only to week 6, whose fresh default is the symbolic A–F example; A1 assesses canonical #01–#06. | Deep-link the complete assignment configuration, including `canonical-six`; verify a fresh browser lands on the six real orders. |
| W9 deck | A figure says the corridor takes two ticks, while B's example occupies it for six. | Specify “A takes two ticks; B's reservation is [0,6)” and explain that occupancy duration can differ. |

Source evidence: `src/lab/model.ts`, `src/lab/compute.ts`, `src/workbench/learning.ts`,
the weekly content, `src/pages/assessments/[slug].astro` and the deck.

### F4 — The practice pack only partly supports the assignment promises

Seven strategy callbacks are connected to the reference engine. Separate `mySearch`
and `myNeighbours` stubs have small tests, but `practice/run.mjs` passes only the seven
callbacks into the reference runner. A student's search and neighbour implementation
does not produce that runner's record. The temporary sentinel test confirmed this.

There are also no corresponding student implementation files for the promised timetable
recurrence, swap improver and migration/evaluation exercise. The bundled reference
engine is useful material, but its presence does not make those student tasks scaffolded.

Give the practice pack a clear student-program entry point, independent checker and
separate reference command. A deliberate defect in student search or recurrence must
be observed by the associated tests and student run; it must not produce a silently
substituted reference result. Browser preset exploration should remain immediately
usable without installing Node.

### F5 — The progression is sound, but the workload needs clearer boundaries

The major changes in state, cost and constraints are well ordered. W4 and W9–W11 are
the largest cognitive steps. The current material combines new notation, a new model,
implementation, debugging, a new counterexample and reporting within two hours, without
enough intermediate support.

Retain the third-year algorithmic depth. For each week explicitly identify a small
required implementation, teacher-provided framework, a verification task and optional
extension. W12 should audit and communicate existing work, not repeat the generic
instruction to implement another key change. Reuse one named search framework through
W2/W3/W4/W10 and one named evaluator through W5/W6/W7/W8/W11.

The current five-stage conceptual progression and three Lab modes are both useful,
but their relationship needs one visible explanation. A capability tick should mean
“introduced by this stage”, not claim that a student has completed or mastered it.

### F6 — Wording often assumes the reader already knows the vocabulary

Terms such as label, relaxation, dominance, FCFS, lexicographic objective, occupancy,
ablation and candidate budget need a short explanation at first use. The titles are
often long enough to consume much of the phone screen. Several generic sentences
repeat across weeks; ten content files repeat the W4 elevation-profile reminder,
including late-semester pages where it adds no useful connection.

Preserve the specific course voice: a dinner's promised time, an unloaded return, a
heavy hotpot, a waiting drone. Replace generic reminders with the actual consequence
that connects the current week to the next. Keep the published site in English.

Example: instead of “three same-condition comparisons”, say “Use the same orders,
drones and time limit for all three methods. Record what changed.” Define a label as
“one way of reaching this point, recording time spent and energy used” before naming
the dominance rule.

### F7 — The result display mixes validity, quality and search guarantees

W8's 8/10 on-time run is executable and correctly passes constraint checks. W11's
120-candidate feedback run improves 13/20 to 17/20, has no checker issues, and stops at
the budget; W12's stored assignment is recomputed to 20/20. These are different facts.

A large VERIFIED or BUDGET badge can imply “everything succeeded” or “the experiment
failed”. Show three separate statements: constraint validity; delivery quality;
search termination/guarantee. Explain times as both the evening clock and elapsed
seconds where useful, and display kJ with exact J available in the ledger.

W4's fastest-only run currently headlines NO-SOLUTION while explaining that the
correct search still finds a route. The primary message should identify a lost feasible
route under the selected pruning rule, with the precise search status below it.

W11's accepted migration needs a prominent explanation of changed assignment and
downstream waits; the raw candidate table should be optional evidence. Do not require
every method comparison to produce a conflict or a strict improvement.

### F8 — The scene provides coordinates better than explanations

Current Three.js code already renders terrain, simple buildings, graph connections,
routes, pads, two drone sizes, camera presets and moving drones. The replay has play,
pause, seek, event steps and speed control. This is a foundation to extend.

On the W4 overview, the active route occupies a small part of the scene and the ridge
versus contour distinction is weak. Road-like graph lines, route tubes and landmarks
compete without a clear visual hierarchy. Multi-order runs draw many routes at once;
the implementation caps these at 30 while the legend shows only six. The current
scene does not draw the interval conflict as an active volume or explain the blocking
drone in the scene. Pads remain static cylinders while the replay changes time.

`scene.time()` only updates drone position. Ground, loading, charging and service
states use the same visual height offset. Before its first event, the replay chooses
that future event; the status text can describe loading before loading has begun.
Drone direction, rotor state, parcel state and resource occupancy are not animated.
These are concrete targets for the next pass.

### F9 — Assessment explanation and process evidence need attention

The fictional course's assessment weights/dates and A1-to-A2 progression are clear.
The public rubric has weighted criterion names but few concrete indicators of partial
versus strong work. Downloads provide sample JSON, but the page does not show the
short, readable sample submission promised in the plan. Add a rendered plan excerpt,
comparison and explanation, and specify a package format for the fictional course.
An actual submission backend is not needed or promised.

For the real COMP4020 submission, `PROCESS.md` explicitly identifies itself as an
agent-assisted repository record. That transparency should remain. However, the
brief asks for the student's own narrative of course-design judgement. The current
file is largely a third-person account of implementation and checking. Passing its
commit-citation check does not resolve this mismatch. Supply an evidence outline and
questions for the owner to answer; do not invent their reflection or claim that an
agent-written account is the student's own judgement.

## 4. Plan A — course content and experiment access

### Stage A0: align the facts and the promises

1. Fix F3's W1/W2/W6/W7/W11 inconsistencies and A1's scenario link. Update named case
   metadata and content together, preserving canonical inputs and assessment weights.
2. Separate validity, delivery quality and search termination in the main result.
3. Remove stale repeated text; mark symbolic examples, their units and the mapping to
   the canonical world next to their inputs.
4. Audit each assignment requirement against a lecture, tutorial and runnable exercise.
   Record any unimplemented scaffold as a gap to complete in A3.
5. Prepare process evidence notes for the owner's narrative. Inspect the deployed
   artefact before submission; do not treat local tests as evidence of deployment.

Acceptance: the W1 numbers agree everywhere; exact W6 results state the finite-domain
guarantee; W7 shows the advertised fleet; W11 instructions match real controls and
allow a tie; A1 opens #01–#06 in a clean browser.

### Stage A1: make each Lecture a usable lesson

Use a consistent learning structure with a distinct worked example each week:

1. Today's delivery problem, what last week solved, and the new assumption.
2. Two or three outcomes, linked to the task students will perform.
3. Explain the new concept and notation in plain language.
4. One figure and one worked derivation/trace with intermediate values.
5. A short algorithm or recurrence, its assumptions, and one counterexample.
6. A brief check-yourself question with a folded explanation.
7. A specific reading section and a direct link to the matching tutorial experiment.

Do not inflate every page to a word quota. W2–W4 and W9–W11 need more derivation;
W12 needs a compact synthesis and a model audit. Define the objective once and link it
from subsequent weeks while restating the small part needed locally.

| Week | Main addition or simplification | Required student output |
|---|---|---|
| W1 | A labelled actual block graph, weighted edges and a load/out/service/back diagram; correct the route count. | A checked route-cost table and explanation of one illegal connection. |
| W2 | Trace S→G=10 versus S→A→G=2; show OPEN, improved parents and goal-on-pop. Move heuristic experimentation to W3. | Search implementation and four edge-case test classes. |
| W3 | Start with h=0 versus a useful lower bound; then explain the 5-versus-4 reopening counterexample with a real graph, not a linear node list. | Heuristic argument, corrected trace and regression test. |
| W4 | Derive two symbolic labels, then show the canonical full-trip energy ledger; explain the phase and static-model assumptions for dominance. | Both labels retained, complete task checked, one lost-route explanation. |
| W5 | Work the N/F objective example, then the first canonical timetable rows. Keep swaps/enumeration under the next-week extension. | FIFO/EDF comparison with the declared objective and recurrence. |
| W6 | Show the swap neighbourhood and accepted move; reveal enumeration as a comparison. Contrast symbolic nonzero gap with canonical zero gap. | Local-versus-exact comparison that names its domain and stopping rule. |
| W7 | Show a small feasibility matrix and one assignment decision; use named fleets with controlled comparisons. | One justified assignment and one migration. |
| W8 | Start with two drones/one pad, then ten orders/two pads. Show request, release, queue and next departure on one timeline. | Hand calculation and a checked delay dependency. |
| W9 | Start with the five-second corridor overlap, then introduce the symbolic wait-state counterexample. Align the deck's timing labels. | Half-open interval check and a corrected state key. |
| W10 | Reuse W3/W4 code with a clear move/wait skeleton; distinguish ground wait, hover and reserve. | Two priorities, neighbour/reservation tests and a rollback test. |
| W11 | Name and run three methods from the same initial assignment; explain an accepted change and any unchanged result. | A causal comparison, candidate budget and limited claim. |
| W12 | Audit existing work; compare the greedy and stored reference cases and inspect an actual late or unexpected order. | A reproducible export and a supported statement of limits. |

### Stage A2: two depths within a tutorial

The opening experience should suit a prospective student as well as an assessor:
short question → starting result → one named action → changed result and explanation.
Use labels such as “Try the fastest-only rule”, “Check all 720 orders” and “Let A wait”.
The action runs the real engine, preserves a baseline and presents the difference.

Below this, provide a guided two-hour tutorial. The existing 15/25/55/25-minute pattern
can remain as guidance: prediction; worked trace; a bounded implementation/comparison;
tests/explanation. Separate required tasks from extension tasks. Prediction is available
before the answer without locking the demonstration or later weeks.

Put code, scenario JSON, all traces and archive management behind explicit expansion
or “Open full Lab”. Collapse the fleet editor until the activity needs a migration.
The tutorial and full Lab must share the same input and run, not become two independent
implementations. Keep refresh, deep links, export and restoration consistent.

Acceptance targets, to measure rather than assert in advance:

- On 390×844, after the title/navigation, one scroll reaches the question, starting
  result and primary action. No scrolling through the full editor to find the task.
- A first-time reader can observe and explain the intended change in roughly a minute.
- Baseline and current values appear beside the action with their units and assumptions.
- Later weeks remain directly accessible, and the demo needs no code or download.
- A ten-minute sample through home, W3, W6, W9, A2 and the deck reads as one course.

### Stage A3: connect the student implementation and verification

Add distinct student entry points for search, timetable, swaps, assignment/migration
and reservation neighbours, with module-specific tests and one integrated student
runner. Keep the teacher's geometry, motion model, rendering and checker provided.
Document exactly which functions a week asks students to complete.

The student runner should record algorithm identity and outputs generated by those
functions. A separate reference runner supplies a comparison. A deliberate student
defect must fail the related exercise or independent validation; removing all student
logic must not still generate a successful student-labelled record.

Add readable assignment samples and criterion examples. Validate the pack after unzip
in a fresh directory, without repository dependencies or network access. Browser
demonstrations continue to be usable independently of this pack.

### Stage A4: accept and document the course revision

Add checks for factual/behavioural contracts, not arbitrary prose length. Verify
default cases against captions, deep-linked assignment input, method-specific result
guarantees and the student runner's actual callbacks. Run `pnpm check` and
`pnpm check:evidence`, then review both viewports, keyboard access, reduced motion,
state restoration and the selected marker journey. Have the owner supply their own
course-design account using the actual evidence. Commit completed decisions with their
verification; publication and final deployed checks remain a separate delivery step.

## 5. Plan B — richer models and animation that explains the experiment

### B0: define the visual and computational contract

Use Blender for reusable meshes and Three.js for the data-driven scene and replay.
Blender supports GLB/glTF export ([Blender formats](https://www.blender.org/features/pipeline/));
Three.js loads the scene and optional animation clips through
[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

The existing engine's actions, timestamps, energy and resource intervals remain the
source of truth. Do not pre-animate a successful delivery in Blender and present it as
the result of a changed algorithm. Presentation animation may rotate rotors or orient
the body, but may not alter the route, timing, checker or outcome.

Record units, axes, origin and named anchors before exporting. Apply the current 3×
visual elevation consistently; keep real elevations and energy calculations unchanged.
Ground roads and the allowed flight graph need separate styles and legends. A flight
edge is not automatically a physical road. The graph layer can be revealed when the
lesson needs it.

### B1: build a small reusable asset set

Proposed first batch: four low-poly house forms (small detached house, pitched-roof
house, terrace block and small apartment), the kitchen with a visible dispatch point,
charging-pad module, corridor towers, and clearly distinguishable L/H drones with
named body/rotor/parcel anchors. Keep materials simple and avoid large textures.

First replace the existing buildings at their canonical footprints. Add enough repeated
houses to read as a neighbourhood; an initial target is roughly 30–50 visible building
instances, subject to route visibility and performance checks. This is a presentation
target, not a change to the number of delivery addresses.

New decorative houses must not appear to block a legal flight. Place them outside
protected route, corridor, address and waiting-point clearances. Any newly meaningful
obstacle would require an explicit canonical-world change and recalibration; it is
outside this visual pass. Use existing height data for terrain and ground placement.

Generate road strips and junctions as simple meshes from a visual layout manifest,
conforming to the terrain. Make the ridge, contour approach, kitchen block and corridor
easy to recognise. This can remain procedural in Three.js; Blender is not required for
every road segment. Commit the Blender scripts, source files and asset manifest so the
meshes can be reproduced.

Suggested structure: `tools/models/` for Blender generation; `public/models/` for GLB;
a separate visual-layout manifest for decorative instances. Do not put visual-only
objects into the planner's canonical collision data.

### B2: integrate one complete W4 scene before expanding

Use named anchors to replace procedural meshes, retain the procedural fallback, and
frame #07 and both approaches prominently. Dim unrelated routes. Label ridge, contour,
outbound and return explicitly; do not rely on colour alone. Selecting a label or ledger
row locates the same path and event in 2D and 3D.

Then apply the shared scene to the existing seven designated views. W1 starts close
to the blocked edge, W9 starts at the corridor, and W12 starts with one selected order.
Full-map routes should be an optional overview, with a selected order's complete trip
visible by default. Keep the 2D lesson as capable as the 3D one.

### B3: extend the existing replay with event states

Use one replay clock for the scene, timeline, status and energy readout. Show explicit
idle/not-ready, loading, outbound, service, return, turnaround, pad queue and charging
states. Ground events should place the drone on the ground/pad; show airborne hovering
only when the event record says so. Orient the drone along each route segment and spin
rotors only in appropriate states. Show the parcel before service and remove it after
delivery, with no change to the engine's service timing.

Keep play/pause, seek and event stepping. Add slower speeds suitable for the two-drone
case and an option to skip idle time on the full-evening replay. At 120×, a five-second
conflict occupies only about 42 milliseconds of playback, so automatic real-time
viewing of the current speed is not enough to teach it. Offer “Go to first issue”,
“Next wait” and “Follow selected order”, plus an optional pause at a diagnostic event.
Camera follow must be optional and reduced-motion users keep static event selection.

### B4: make causes visible

| Teaching decision | Scene/timeline behaviour | Textual evidence |
|---|---|---|
| W1 illegal connection | Highlight the proposed segment and the actual crossed building. | Name the rejected connection and obstacle. |
| W4 energy failure | Show the chosen complete route and its outbound/service/return ledger; compare the feasible alternative. | Trip energy, usable budget, reserve and discarded label. An over-budget proposal stays visibly diagnostic. |
| W8 pad delay | Indicate pad occupants, queue order and the next release as replay time changes. | “C waits for A's charge to finish; next departure changes by …”, from recorded times. |
| W9 corridor overlap | Highlight the shared corridor volume and both reservations for the full overlap interval. | Drone IDs, resource and [107,112) overlap; waiting clears it. A resource conflict need not be a physical mesh collision. |
| W10 changed priority | Replay the same input with the other priority and emphasise ground versus airborne waits. | The blocker, waiting duration, energy and complete return check. |
| W11 feedback | Focus on the order that migrated and the changed resource use. | Before/after assignment, objective and event dependencies; no invented improvement. |
| W12 audit | Jump to a late or unexpected order; show its previous task, readiness, charging and reservations. | A cause chain rather than just a red drone or a late-count badge. |

Planner search expansions remain separate from elapsed flight time. Show search
decisions in their trace, not as positions flown by the drone. Diagnostics come from
the checker and actual scheduling events, not visual collision detection per frame.

### B5: visual acceptance and performance

Retain current rendering resolution and simple lighting. Target the original total
model budget of about 1.2 MB, using instanced/shared meshes and a small material set;
these are targets until measured. No high-resolution textures, traffic simulation,
weather, complex character rigs or camera cinematics are needed for this request.

Verify loading time, compressed asset size, draw calls and replay responsiveness on
the two marking viewports. Mobile loads 3D on request. Missing models leave working
procedural/2D views; dispose meshes, controls and assets on navigation. Check that
idle, service, return and charging states match the record at event boundaries, that
seeking forward/backward gives the same result, and that the rendered path agrees
with the canonical polyline and the checker.

The acceptance question is: can a reader identify the destination, current task phase,
whether the plan passes, and why it waits or fails? More houses alone do not satisfy it.

## 6. Recommended delivery order

1. A0 factual fixes and result meanings.
2. A1/A2 complete one W4 lesson and tutorial slice, then carry the structure through
   all twelve weeks while keeping their distinct activities.
3. A3 practice implementation and assignment samples; A4 course acceptance/evidence.
4. B0/B1/B2 the richer W4 scene as one bounded asset and integration pass.
5. B3/B4 event animation and causal diagnostics, followed by B5 verification.

If the published deadline is still the applicable one, prioritise A0, a usable teaching
and demonstration path, the owner's process account, and deployed verification. Do not
make completion of a large modelling pass a condition of a working submission.

This review changes documentation only. No lecture, tutorial, engine, canonical data,
assignment configuration or model has been modified as part of this planning task.
