# The site

What the workbench does, how it is presented to the marker, what users may design, and where
3D goes. Pages, layers and slots here match `course.md`; the numbers come from `engine.md`.

## 1. What an experiment must show

Experiments are about how the algorithm changes when the problem grows, not about how many
controls the interface gains. Every activity has: a stated assumption, a prediction, a method
or code change, a real run, a counterexample or comparison, a conclusion with its range.

| Upgrade | Not enough | Must be visible |
|---|---|---|
| Obstacles and weighted graph | Drawing a detour curve | Node and edge definitions, relaxation, the queue, the lowest-cost guarantee |
| Heuristic | Comparing which animation is faster | Lower bound, repeated-state handling, correctness and work |
| Energy and return | A battery icon turning red | Accumulated resources, the full goal, label comparison, feasibility |
| Many orders | Dragging the order and reading an on-time rate | Timetable recurrence, objective, neighbourhood and acceptance rule |
| Many drones and charging | More models on screen | Assignment, capability filter, shared queue, dependence propagation |
| Corridor occupancy | Drones staggered in an animation | Space-time state, whole occupancy intervals, reservations, energy update |
| Linked improvement | Two independent result tables | Route cost actually changing assignment or order, then joint validation |

"It ran" is not "the student understands". Evidence of understanding includes hand
computation, a correctness explanation, tests and a new example with a different structure.

## 2. Pages

| Page | Content |
|---|---|
| Home | After the course claim, the small shared-corridor experience: depart independently, wait, detour; results from the same validator. Shares one case file, `cases/corridor-two-drones.json`, with the W9 tutorial and the deck. |
| Lecture | A static concept example next to the derivation: one figure, one question, the answer folded. No live experiment. |
| Tutorial | After the materials and the prediction question, the workbench opened to this week's layers with this week's case loaded; then comparison, explanation and export. |
| Lab | All modes and cases; continue personal experiments; returning to the tutorial keeps context. Holds the worked-example record. |
| Assignment 1 / 2 | Task, dates, deliverables and rubric, then one button "open the assignment case", the plan pre-check and result export; the practice pack linked as the submission format. |
| People | Convenor and tutor, one line each. |
| Resources and policies | Model rules, parameter table (value, range, source), references, practice-pack notes, simulation boundary, the static-site honesty note, AI and collaboration rules, accessibility. |

Every week is reachable on its own. The site does not generate fake student archives. The lab
holds a **worked-example record**: computed by the reference implementation, one entry per
stage, each marked with its model upgrade ("this route was found under the W1–W3 model; under
the W4 model it exceeds the energy budget, see the W4 example"). Five markers on one screen.
It shows what each upgrade did to one instance; it is not anyone's grade and not a scripted
red light per week. File import is a local pre-check; the page never shows a "received by the
teacher" that no service backs.

## 3. One workbench, three modes

### Mode A — single-drone search and full task (W1–W4, A1)

**Controls.** Course graph and order; Dijkstra or A*; a legal heuristic; next expansion,
review the trace, run to the end, reset; resource labels and full-round-trip check; import
your own plan.

**Evidence shown.** Current state, OPEN candidates with g/h/f, parent pointers, expanded
states; label time and energy, why dominated or over budget; outbound, service, return and
remaining reserve.

**Tasks that must exist.** Predict the next node; explain one relaxation; fix a goal-test or
re-expansion bug; prove a heuristic applies; see why the fastest prefix does not stand for
every resource-feasible prefix.

**Slots.** 1 `h(node, goal)`; 2 `dominates(a, b)`, `withinBudget(label)`. Expansion and the
label table show the current slot function's results.

**3D.** W1 main view — which connections the buildings block on the block graph; W4 main view
— the two routes to #07 coloured by energy; W2, W3 side view.

A search step and a task-execution step are different things; nodes visited by the search
never become flown route. A deliberately wrong teaching implementation is labelled
"diagnostic" and never validates a formal plan.

### Mode B — ordering, assignment and resources (W5–W8, A1/A2)

**Controls.** FIFO, earliest-deadline, swap improvement; move up/down or swap by hand; switch
between single- and multi-drone cases; choose an assignment rule or migrate one order; see
why each local move was accepted or rejected.

**Evidence shown.** Per-order timetable, objective tuple, neighbourhood candidates and the
improvement trace, drone-type feasibility matrix; each drone's tasks and the two pads'
occupancy; jump from a waiting segment to the resource and task that block it.

**Slots.** 3 `orderKey(order, state)`, `objective(plan)`; 4 `assignCost(drone, order, state)`.
The improvement trace and the cost matrix come from the current slot functions.

**3D.** Side view — the two drone types distinguishable, pad occupancy visible.

The six-order instance runs the exact 720-permutation comparison; the twenty-order task shows
no invented global optimum. The charging rule is fixed; the study is how task arrangement
changes the queue, and a hand-dragged time block is not a legal schedule.

### Mode C — multi-drone space-time coordination (W9–W12, A2)

**Controls.** Conflicts between independent candidates; switch the planning priority; follow
(place, phase, time) moves and waits; compare fixed assignment with feedback improvement;
see the joint validation of each candidate.

**Evidence shown.** Conflicting resource ids, whole overlap intervals, the drones involved;
how an existing reservation blocks a move; actual delivery, return, energy and charging after
a wait or detour; assignment before and after the feedback change.

**Slots.** 5 `priority(tasks, state)`. The two-priority comparison is slot function against
preset.

**3D.** W9 main view — the conflict as a volume of air in the corridor; W10 main view — scrub
the timeline and watch reservations make the next drone wait or detour; W12 main view — the
twenty-order replay stopped at the chosen order's failure point; W11 side view.

A candidate that fails validation shows a diagnostic path and never plays as a successful
task. When a fixed priority finds nothing, the page states the search range and the budget;
it does not declare the joint problem unsolvable.

### Shared behaviour

A run stores the inputs, the current teaching assumptions, graph/rule/algorithm versions, the
method, parameters, slot code or preset name, results and the student's note. A run can be
pinned as the baseline before comparing; results under different assumptions are shown side
by side with the difference named, never as an improvement under the same conditions.

Changing a parameter or a slot marks the old result as stale; old and new requests are never
mixed. A result can be traced from a metric to the order, the resource and the event. Exported
explanations are the student's; numbers come from the run. Failed runs can be saved; a red
item never blocks saving.

Slot functions run as pure functions in a restricted scope in the page, with no DOM or network
access; syntax and runtime errors are shown, never silently replaced by a preset. Micro-graphs
and the six-order table are editable and importable (data only); the site recomputes under the
same rules so that students can build their own variants.

## 4. Presenting the workbench to the marker

This course will not run; the marker is the site's only real user. This section says how the
workbench appears to them.

**Who.** An ANU academic, reading in English, as a prospective student, for about ten minutes,
once at 1920×1080 and once at 390×844. They click buttons, resize the window and try a deep
link. They do not write code, download a pack, read a long rubric, run an enumeration or
spend five minutes learning an interface. Likely path: home → schedule → one or two weeks →
an assignment page → the deck → maybe the lab → people and policies at a glance.

The workbench's job in front of the marker is not to be used; it is to be seen working, within
a minute, on every page they open, and to look different each time. The marks are in three
things: it really computes (artefact); the twelve weeks progress rather than repeat
(response); every page describes the same course (response).

### Ten rules

| # | Rule | Reason |
|---|---|---|
| 1 | **Result first.** Every workbench instance loads with this week's case already run: the OPEN table full, the timeline drawn, the route lit in 3D. Never an empty form. | The marker will not press run and wait. |
| 2 | **One click changes it.** Each instance exposes one primary control whose click visibly changes the result. Everything else is under "more". | They click once. |
| 3 | **Mark the difference.** After the click, the before and after rows sit side by side; overturned cells are marked, new waits are marked. | Cause and effect without reading. |
| 4 | **A different shape every week.** The marker opens at most three weeks; the three must look different: graph and OPEN table; two labels and dominance; timetable and 720 permutations; reservation intervals and timeline; twenty-order replay. The same panel with new numbers is find-and-replace. | Direct evidence of niche and progression. |
| 5 | **One line says this week's decision.** Above each instance: *This week's decision: … What it breaks: …* | They read titles, not instructions. |
| 6 | **Static fallback.** The SSR HTML already holds the result table and a poster image of the 3D; JS enhances. axe passes; a screen reader gets the table. | Build gate; a blank canvas scores zero. |
| 7 | **Tables first on the phone.** At 390 the order is: one line, result table, primary button, "open 3D" poster, more. 3D does not load on its own. | 390 is checked. |
| 8 | **Prove it computes.** Under every result, one small line: *computed in your browser · 41 expansions · 3 ms · engine 1.0 · case #07-two-routes · a3f2…* | They will suspect a picture. |
| 9 | **The semester slider.** At the top of the lab, a W1→W12 slider; dragging it opens the layers one by one: route graph → search → labels → order table → fleet → pads → reservation table → space-time → feedback → replay. The semester in twenty seconds. | The strongest single piece of evidence against find-and-replace. |
| 10 | **Five upgrades on one screen.** The worked-example record has a five-card summary on the home page and the full version in the lab: what changed, what it broke, what survived, with a "see this week" button to the instance. | Twelve weeks seen as connected within ten minutes. |

### Home page (the first minute)

```text
1920
┌───────────────────────────────────────────────────────────┐
│ Twenty Dinners, One Hill                                  │
│ #07 is on the hilltop. #13 is across the corridor.        │
│ #20 is hotpot for four. One kitchen, one evening, 12 weeks│
├──────────────────────────┬────────────────────────────────┤
│ [3D: corridor between    │ Two shortest routes — can they │
│  two towers, drones A/B] │ fly together?                  │
│  orbit · reduced-motion  │ (·) both depart  ( ) B first   │
│  respected               │ ( ) A detours                  │
│                          │ timeline: corridor occupancy   │
│                          │  A [18:02–18:04) B [18:03–18:05)│
│                          │  CONFLICT 18:03–18:04 ✗         │
│                          │ deliver A 18:09 · B — · wait 0 │
│                          │ computed in your browser · 2 ms│
├──────────────────────────┴────────────────────────────────┤
│ Five upgrades, one instance                               │
│ [W4 m→Wh] [W5 one→many] [W8 pads] [W9 shared air] [W11 feedback]
│  each: what changed / what it broke / what survived · see it
├───────────────────────────────────────────────────────────┤
│ 12 weeks · Assessments 40/60 · Staff · Lab →              │
└───────────────────────────────────────────────────────────┘
```

The three radio buttons switch between three precomputed plans that the validator re-checks
live; the conflict interval is computed on the spot, and the page says so under the result.
At 390: title → one line → three buttons → conflict and wait table → 3D poster (loads on tap)
→ five cards stacked → the week list.

### Tutorial page template (the second and third minute)

```text
W4 · The shortest route may not bring the drone back
This week's decision: keep the fast route or the cheap one?
What it breaks: W3's "fastest = best".
┌────────────────────────────┬──────────────────────────────┐
│ [3D: two routes to #07,    │ label at Q      time  energy │
│  ridge (red) vs contour    │ via ridge         4     7    │
│  (green), energy-coloured] │ via contour       6     3    │
│                            │ neither dominates the other  │
│                            │ complete: ridge 6/9 ✗ budget 8│
│                            │           contour 8/5 ✓       │
│                            │ [ keep only fastest label ]  │
│                            │  → "no feasible route" ✗ wrong│
└────────────────────────────┴──────────────────────────────┘
▸ Predict first (for students)   ▸ Strategy slot: dominates() [preset ▾]
Materials · Comparison · Explain · Export
```

The primary control is the "keep only the fastest label" toggle: one click, the engine reports
no solution, the page marks it wrong and shows the contour route is feasible. The whole W4
argument in one click. The slot shows the marker a preset dropdown, not a code editor; the
editor is folded below. The prediction question is still there for students, folded; the
default state of the page is what it looks like after the prediction.

### Shape, primary control and what turns red, per week

| Week | Shape | Primary control | What it breaks |
|---|---|---|---|
| W1 | Block graph and three-route cost table | "check this edge" → through a building | legal endpoints ≠ legal edge |
| W2/W3 | Graph and OPEN table, step by step | preset h: 0 / straight-line ÷ v_max / re-expansion off | expansions 84→23; re-expansion off → cost 5 not 4 |
| W4 | Two labels and the complete-candidate table | keep only the fastest label | "no solution" is wrong |
| W5/W6 | Six-order timetable and one-click 720 permutations | FIFO / EDF / swap / enumerate | swaps stop at (48,55), optimum (46,51) |
| W7/W8 | Cost matrix and pad timeline | move #20 to another drone | the third drone's availability changes too |
| W9 | Reservation intervals and timeline (home page case) | `visited[node]` only | the wait is pruned away |
| W10 | Space-time replay with timeline scrub | swap the priority | the next drone's wait or detour |
| W11 | Three-method comparison table | allow cost feedback | one cell of W7's assignment changes hands |
| W12 | Twenty-order replay | click one late order | stops at the failure point and lists the cause chain |

The W5/W6 "run 720 permutations" is worth its own mention: one button, the page enumerates
all 720 sequences on the spot and shows the gap between the optimum and the local optimum.
Ten seconds, plain JS, and it looks like real work. The best value on the site.

**Lab.** The semester slider on top; below it the full workbench, case picker, the full
worked-example record, personal records (kept in this browser, and the page says so), export.
A marker drags the slider and leaves; students stay.

**Assignment pages.** Task, dates, weights, a four-row rubric, one button "open the assignment
case" (the lab pinned to that scenario), and a rendered sample submission: one page with the
six-order plan table, a comparison table and a paragraph. The marker sees that the assignment
is real and what a submission looks like.

**Deck (W9).** About 12 slides, the same two-drone case as the home page; figures are SVG or
screenshots, no interactive 3D inside a deck. A visible button on the W9 lecture page opens
it.

**Policies and people.** Policies: simulation boundary, parameter table, the "everything on a
static site is visible" note, AI policy, accessibility statement. People: two staff, one line
each, their own images. One glance is enough; missing them costs "is this a course".

### Live computation and precomputed plans

| Computed live (the engine must have it) | Precomputed, re-validated live (labelled) |
|---|---|
| Edge legality, cost sums | The home page's three arrangements |
| Dijkstra/A* step by step, with the re-expansion toggle | W10's two-priority space-time plans |
| Two-label dominance and budget check | W12's twenty-order reference plan |
| Timetable recurrence, swaps, 720 permutations | W11's three-method table, until the feedback loop is built |
| Occupancy-interval conflict check (the validator) | |
| Charging queue (small discrete-event simulation) | |

The label on the right column is *reference plan, re-validated live*. It is what
`engine.md` §7 requires (no invented performance) and it tells the marker before they notice.

### What the marker must never meet

A 404 (base path), a blank canvas, a button that does nothing, "coming soon", a Chinese string,
a loading spinner on a large model, WebGL dying after two page switches, horizontal scroll at
390, colour as the only state. Each is a one-time deduction in the most visible part of the
artefact mark.

**Process evidence.** These presentation decisions are material for `PROCESS.md`: why result
first, why plans are precomputed and validation live, why the semester slider, how the 720
enumeration went from teaching tool to demonstration. One commit each.

## 5. User freedom and input

No block programming, and code is not the only door. Three levels: hand-made plans, scenario
design, rule composition; the composer has an "edit as code" escape hatch. Everything a user
designs goes through the same engine and the same validator.

| Level | What the user designs | Input | Who |
|---|---|---|---|
| **1. Hand-made plan** | Order of tasks, which drone takes which order, departure times, one of k candidate routes | move up/down, list selection, time input; every drag has a keyboard path | The marker in five seconds; students to "schedule by hand first, then compare" |
| **2. Scenario design** | Add an order at an address (weight, ready time, promised time); close a corridor for a window; 1–3 pads; 1–5 drones of two types | click an address on the map (3D or SVG) plus number inputs or sliders; an address list on the phone | Students for A2 item 6; a marker may try it once |
| **3. Rule design** | The rule in each of the five strategy slots | the rule composer (dropdowns and weights) by default; "edit as code" folded | Students; the marker touches only the preset dropdown |

Level 1 is the cheapest and the most honest: a hand-made plan and an algorithm's plan pass the
same validator, and "your plan has a conflict" is the same sentence either way. Level 2 is
where "create" lives.

**The design space is a configuration of the fixed world, not a new world.** Orders go only
on existing address nodes (the graph does not change; no re-meshing); the map allows closing
an edge but not adding one; fleet and pads move within small ranges. The engine stays the same
and results stay comparable, and students can still build a scenario that makes the baseline
late.

### The rule composer

The heuristic slot, for example:

```text
h(node, goal) =  [ straight-line 3D ▾ ]  ÷  [ v_max ▾ ]  ×  [ 1.0 ]
                   straight-line 2D           v_cruise
                   zero
   on this graph:  admissible ✓   consistent ✗ (edge B→A: 3 > 1+0)
   run →  expansions 23  (h=0: 84)                      [ edit as code ▸ ]
```

Every slot is a template plus parameters that compose into a real function:

| Slot | Parts | Built-in trap |
|---|---|---|
| `h` | distance kind ÷ speed kind × factor | factor > 1 → the page marks "not admissible" and points at the overestimated node on the small graph |
| `dominates` | which fields count (time, energy); rule (all ≤ and at least one <); or a scalarisation α·time + β·energy | scalarisation collapses to a single label; the page shows which feasible prefix it lost |
| `orderKey` | weighted sum of fields (slack to deadline, distance, ready time) and direction | all weight on distance → lateness explodes |
| `assignCost` | predicted completion + w·wait; infeasible → ∞; toggles: count charging wait, count reservation wait | "count waits" off is W7's independent estimate |
| `priority` | sort field and tie-break field | one change is W10's two priorities |

Three gains: no eval (always valid, testable, deterministic); one click to use (the marker
picks a preset and sees expansions go 84→23); instant property checks — admissibility and
consistency can be checked exhaustively on the small graph, so a student knows at once whether
their heuristic is sound. The composed function is shown as generated code beside the composer
("this is the function you just built"); "edit as code" opens the text box pre-filled with it.

**The escape hatch: code.** The text box's JavaScript runs through `new Function` in a Worker.
The Worker is there to isolate the DOM and to terminate runaway loops (expansion cap plus
`worker.terminate()`), not for security. Syntax and runtime errors are shown, never replaced
by a preset; the result is labelled *custom · code hash*. The marker does not see this door
unless they open it; students must use it for A1 and A2.

**The line that holds.** Nothing a user designs bypasses the validator. Hand-made, composed,
typed or built, every plan passes one `validate(plan)`; anything that fails is labelled
"diagnostic".

**URL state and JSON.** Each instance's layers, case, preset and parameters are encoded in the
query string, so a student can hand in "the scenario I built that breaks the baseline" as a
link, and `PROCESS.md` and the deck can link to an exact state. JSON export and import read
data only, never code; an import is recomputed under the same rules. Together they are
sharing without a server.

## 6. Where 3D goes

**3D is not required by the brief.** The marker judges niche, coherence, twelve weeks, the
deck, assessment, `spec/`, evidence, deployment and both viewports. 3D earns marks only where
it carries a decision; otherwise it is load time, an axe risk, a WebGL lifecycle risk and a
phone risk. 3D is a design goal of this course, so it is built — in a way that can never block
anything else.

**WebGL on seven pages only:** home, W1, W4, W9, W10, W12 and the lab. Other weeks use a 2D
SVG minimap: fewer contexts, faster, no risk.

| Page | The judgement made in 3D | Without 3D |
|---|---|---|
| Home | Two drones meet in the corridor; their occupancy volumes overlap | Timeline only; the claim holds but is less visible |
| W1 | Which edge passes through a building | A 2D graph cannot show "through" |
| W4 | Ridge versus contour to #07, coloured by energy | A 2D graph cannot show the slope |
| W9 | The conflict is a volume of air in the corridor over a time span | Same as home |
| W10 | Scrub the timeline and see who waits | The timeline suffices; 3D makes it direct |
| W12 | The twenty-order replay stopped at the failure | Tables suffice; 3D closes the course |
| Lab | Click the map to place an order when designing a scenario | An address list |

W1, W4 and W9 are where 3D changes understanding (through, slope, volume); home, W10 and W12
are where it strengthens presentation.

### Assets, and what needs Blender

The whole scene can be built with zero Blender assets, entirely procedural in three.js:

| Thing | Procedural is enough | What Blender adds |
|---|---|---|
| Terrain | `PlaneGeometry` displaced by a height array, vertex colour by elevation | roads, a more natural slope |
| Buildings | instanced boxes, vertex colours | roofs, windows, a sense of a block |
| Kitchen, pads | boxes and cylinders | looks like a kitchen |
| The corridor's two towers | two tall boxes | same |
| Drones | body, four arms, four rotors: seven primitives | clearly better; L and H told apart at a glance |
| Parcel | a box | nothing |
| Waypoints, edges, routes, conflict volumes, energy colouring, timeline | must be procedural (they are data) | should not be modelled |

Blender scripts are the second pass, the polish: `tools/models/slop-hill.py` (terrain,
roads, building instances, kitchen, pads), `drone-l.py`, `drone-h.py` — hard-surface,
low-poly, vertex colours. The scripts are committed; they are process evidence.

| Asset | Content | Budget |
|---|---|---|
| `slop-hill.glb` | height-field terrain (about 120 m of rise), roads, about eight building types instanced, the kitchen, two pads, the towers either side of the corridor | ≤ 900 KB |
| `drone-l.glb`, `drone-h.glb` | two types, hard-surface quadcopters, distinguishable | ≤ 120 KB each |
| `parcel.glb` | the dinner box | ≤ 30 KB |
| Procedural | waypoints, edges, routes, OPEN/CLOSED colouring, conflict volumes, waiting points, energy colouring, timeline: generated in three.js | 0 |

Total ≤ 1.2 MB; a single model ≤ 1.5 MB; `dist` ≤ 30 MB; first-screen JS ≤ 250 KB gzipped.
Pipeline: `tools/models/<name>.py` (bpy) → `blender -b -P` → `gltf-transform optimize
--compress meshopt`. Hard-surface, procedural, arrays and booleans only; no organic modelling,
no painted textures, colour from vertices. No asset is added week by week.

### Build order

1. Build the 3D views on all seven pages with procedural primitives first. The decision views
   run with no asset file present.
2. The mount points (terrain, building group, kitchen, pads, both drone types) are named
   anchors from the start.
3. When there is time, produce the glb files with bpy and swap the meshes under the anchors;
   no other code changes.
4. If a glb fails to load, the procedural version stays silently and the page is unchanged.

### Conditions for 3D to earn marks rather than lose them

Poster fallback (in the SSR HTML); `<canvas role="img" aria-label>` plus the result table;
keyboard orbit buttons; `prefers-reduced-motion`; disposal on `astro:before-swap`; no
automatic load on the phone (tap the poster); total ≤ 1.2 MB. One missing and 3D is a
deduction.
