# The course: Twenty Dinners, One Hill

SlopU course SLOP3969. One ghost kitchen at the foot of Slop Hill, one Saturday evening,
twenty dinner orders, up to five drones of two types, two charging pads, one shared narrow
corridor. Twelve weeks take a program that can find a route and turn it into a planner that
can schedule all twenty deliveries so that they can be flown together.

## 1. One continuous line

> Design and improve route planning and drone scheduling algorithms: start from one drone
> and one order, bring obstacles, the full round trip, payload, energy, order deadlines and
> shared resources into the model one at a time, and end with a plan for many drones and
> many orders that can be executed together.

Algorithm design is what students learn. Food delivery is the running case. Each new
constraint makes students re-examine state, cost, feasibility and what the algorithm can
still guarantee. The course does not introduce one technique per week, and it does not add
one interface per week.

The whole semester studies one instance: the kitchen at the foot of Slop Hill, one Saturday
evening 18:00–21:00, orders #01–#20. Every exercise is a sub-problem cut out of that
evening. Micro-examples may be worked on symbolic graphs, but each one points at a place on
the hill. There is no practice data unrelated to this evening.

**Course claim: a single shortest route does not make a delivery plan that can be executed
together.**

Every upgrade runs the same learning loop: state the assumption of the current method →
build an example where it fails → derive the change → implement the key part → test under
the same conditions → say what is still guaranteed.

### Home page pitch

> The first order has a shortest route, and it may not have the battery to come back: #07
> is on the hilltop, the ridge line is fastest, only the contour route returns. By the sixth
> order the deadline matters more than the distance. Five drones each find a good route and
> then wait at the same corridor and the same two charging pads — #13 lives on the far side
> of that corridor, and #20 is hotpot for four, which only the heavy drone can carry. For
> twelve weeks we study one kitchen's one evening, and turn a program that can find a route
> into a planner that can schedule twenty dinners. Every improvement has to answer: which
> assumption changed, why the code changed the way it did, and what the evidence is.

### Course facts

| Item | Value |
|---|---|
| Code | SLOP3969. Third-year level; the suffix 969 is allocated to this repository. |
| Audience | Undergraduates who have done introductory programming and data structures. |
| Prerequisites | Functions, loops, lists and dictionaries; queues, priority queues, basic graphs; coordinates, distances, sums. |
| Contact hours | 12 weeks; a one-hour lecture (Monday) and a two-hour tutorial (Wednesday) each week. Code and reports are finished outside class. |
| Output | A cumulative set of search, scheduling and space-time coordination modules, with arguments, tests, plans and experiment records. |
| Assessment | Tutorial attendance and lab participation: 20%; two individual assignments: 30% and 50%. |
| Tutorials | All twelve weeks count equally, with one attendance point and one participation point per week; they feed the assignments directly. |
| Viewpoint | A central planner and verifier. Not a pilot, not a city operator. |
| Language | The site is in English. |

### Staff

| Role | Person | Line |
|---|---|---|
| Convenor | Dr Ines Halvorsen-Tan (placeholder name) | "A planner saying 'no conflicts' does not count. The plan passes the validator first, then me." |
| Tutor | Kofi Marchetti (placeholder name) | Runs the workbench and the tutorials. "The reference answer does not open until your prediction is written down." |

## 2. The world

One map for twelve weeks. Micro-examples are sub-problems cut from the big task and may be
derived on small symbolic graphs; each one names the place on Slop Hill it corresponds to.

| Element | Scope |
|---|---|
| Space | About 2 km × 2 km, called Slop Hill. It is a real hill: about 120 m from the kitchen to the top. Fictional; no real residents or business. |
| Map | A finite directed graph with 3D coordinates, real polyline segments and named resources. Buildings decide which connections are legal. Edge time comes from length and drone speed; edge energy comes from length, payload and climb, dearer per metre of rise the steeper the edge, and uphill costs more than downhill of the same length. The hilltop house is reached by a short steep track or a long gentle spiral. |
| Depot | A ghost kitchen at the foot of the hill: delivery only, no dine-in, twenty dishes in one evening. Every task starts and ends there. |
| Orders | #01–#20, fixed and published in week 1, each with a ready time, a weight and a promised delivery time. Each stage uses a fixed subset: W1–W4 use #07 (the W1 block graph also has #03 and #05); A1 and W5–W6 use #01–#06; W7–W8 use #01–#09 plus #20; W9–W12 use all twenty. |
| One order per flight | A drone carries one order, delivers, returns. "Many orders" means repeated departures, not one flight to several houses. |
| Fleet | From one drone up to five. Two types: L (fast, small payload, small battery) and H (slow, large payload, large battery). |
| Charging | Two charging pads at the depot. Ground queue, fixed effective rate, first come first served, non-preemptive, released when full. |
| Information | Orders, ready times, fleet and map are public before planning. A ready time is the earliest a task can start. |
| Time and environment | Fixed, deterministic motion and energy model. No weather, no real flight control. |
| Delivery | The delivery point and service action come from the data. No free-form landing design. |

The constraints come from a real task; the numbers and safety margins are teaching settings.
The site states their units, definitions and role, and does not claim that any real drone or
real operation would work this way.

### Three running cases

| Order | Name | What it ties to |
|---|---|---|
| **#07** | Mapo tofu for the house on the hilltop | Far and urgent. The ridge route is fastest but burns the return energy; the contour route is slower and gets back. Distance, energy, deadline. |
| **#13** | The house across the corridor | Its shortest route has to pass the shared narrow corridor. Coordination and where to wait. |
| **#20** | Hotpot for four | Only type H can carry it. Drone–order matching and assignment. |

No case assumes a winning strategy. Results come from the model.

## 3. Five upgrades of one problem

| Stage | Weeks | The problem grows | Why the old method is not enough | What students gain |
|---|---|---|---|---|
| Find a route | W1–W3 | One drone, one order, obstacles, weighted graph | A straight line or a local greedy choice does not replace lowest-cost search | Graph modelling, Dijkstra, A*, correctness, counterexamples |
| Find an executable route | W4 | Payload, energy and the return leg | The fastest candidate may run out of battery; a single label drops feasible prefixes | Resource extension, labels, full-task checks |
| Order the tasks | W5–W6 | One drone, several orders with deadlines | Each order feasible on its own does not mean any order of them is on time | Timetable, objective, ordering rules, local search |
| Divide the work | W7–W8 | Several drones, two types, shared charging | Equal counts and independent clocks ignore real cost | Assignment, migration moves, events and queue dependence |
| Execute together | W9–W12 | Corridor occupancy and scheduling affect each other | Independent routes and independent costs do not prove joint feasibility | Space-time A*, reservations, priorities, cost feedback from routes to schedule |

Early simplifications are stated before they are used. When a later model requires a plan to
change, earlier correct work is not marked wrong in hindsight; results under different models
are labelled with their model and never compared as if they were the same conditions. The
site shows these five upgrades on one instance in a worked-example record (see `site.md`).

## 4. Learning outcomes

| # | After the course a student can… | Evidence |
|---|---|---|
| LO1 | Formalise a graph search problem, implement Dijkstra and A*, and explain the correctness conditions of the heuristic and of repeated-state handling. | Code, queue traces, a short argument, self-built counterexamples, regression tests. |
| LO2 | Bring payload, outbound leg, service, return leg and reserve into resource-constrained full-task planning. | Resource labels, a complete ledger, feasibility counterexamples, independent validation. |
| LO3 | Design single-drone ordering and multi-drone assignment with an explicit objective and local improvement. | Timetable recurrence, neighbourhoods, improvement traces, a small exact reference. |
| LO4 | Define shared-resource conflicts, plan in space-time, and feed route cost back into scheduling. | Reservation queries, space-time search, priority experiments, linked adjustment records. |
| LO5 | Evaluate algorithms under fixed conditions and separate proven properties from experimental observations from unverified generalisations. | Same-condition comparisons, failure analysis, reproducible files, personal explanation. |

Outcomes are stated as work a student can produce, not terms they have met. The design
follows constructive alignment and the principle of learning component skills before
practising their combination and the judgement of when they apply.

## 5. The twelve weeks

Fictional SlopU 2027 semester, `Australia/Sydney`. Dates are the Monday of each teaching
week; the tutorial is on the Wednesday.

| Week | Title | Problem so far | Core method |
|---|---|---|---|
| W1 · 2027-02-22 | Writing one order as a planning problem | one drone · one order | graph, state, action, legal edges, goal, cost |
| W2 · 2027-03-01 | Dijkstra: when to trust the current shortest path | one drone · one order | relaxation, priority queue, invariant, termination, path reconstruction |
| W3 · 2027-03-08 | A*: what the heuristic speeds up, and why it is still correct | one drone · one order | g+h, lower bounds, admissibility, consistency, re-expansion |
| W4 · 2027-03-15 | The shortest route may not bring the drone back | one drone · one order | resource extension, full-task labels, non-dominated candidates, constraint checks |
| W5 · 2027-03-22 | One drone, many orders: write "a good plan" as a formula first | one drone · many orders | timetable recurrence, objective, FIFO and earliest-deadline |
| W6 · 2027-03-29 | Improving the order: why one swap is worth accepting | one drone · many orders | solution representation, neighbourhood, local search, stopping, exact reference |
| W7 · 2027-04-05 | From ordering to assignment: which drone takes which order | many drones · many orders | feasibility matrix, earliest-completion greedy, cross-drone migration |
| W8 · 2027-04-12 | Before the battery is full: shared resources in the timetable | many drones · many orders | discrete events, capacity intervals, queue recurrence, dependence |
| W9 · 2027-04-19 | Same place, not the same search state | many drones · shared corridor | conflict definition, occupancy intervals, state (place, time), reservation table |
| W10 · 2027-04-26 | Searching in time: leaving the next drone a way through | many drones · shared corridor | space-time A*, resource labels, prioritised planning, search bounds |
| W11 · 2027-05-03 | The routes changed, so the assignment must be reconsidered | many drones · joint improvement | decomposed planning, full re-evaluation, local improvement, ablation |
| W12 · 2027-05-10 | Twenty dinners: deliver the algorithm, and state its limits | many drones · final verification | full experiment, unseen instances, ablation, evidence and limits |

3D is the main view in W1, W4, W9, W10 and W12. Other weeks use a 2D SVG minimap. The full
instance (twenty orders, the whole map) exists only in 3D; micro-examples are derived on
symbolic graphs and then located on the map.

### Week by week

Each week has: this week's question; the lecture; what must be derived or made clear; the
tutorial; the output and the mastery standard; how it connects forward; the 3D view.

#### W1 · Writing one order as a planning problem

**Question.** Why is "a line from the depot to the customer" not yet a problem definition?

**Lecture.** From one delivery task extract the start, the customer service point, the return
point and the task phases. Express allowed connections as a directed graph with 3D
coordinates; separate the shape of a path, a timed trajectory and a schedule. Define
non-negative edge costs and say that optimality is relative to the given graph and cost.
Use the provided model to check whole edges; students do not write a geometry library.

**Must derive.** Write G=(V,E), a path P, C(P)=Σc(e) and the legal edge set. Explain why
the outbound and return legs cannot simply be reversed without checking edge direction;
delivery complete and return to depot are different events.

**Tutorial.** On the ten-node sub-graph of the kitchen's block (kitchen, depot merge point,
six intersections, houses #03 and #05), list the available candidate routes; compute costs by hand,
then check them in the workbench. Find an edge whose endpoints are legal but whose segment
passes through a building, and explain why that proposed edge must be excluded. Draw the task state diagram including delivery
and return.

**Output and mastery.** A one-page problem definition, a hand-computed route table, a task
state diagram and one geometric counterexample. Can explain whether an object affects a
legal edge and which leg a task is missing, not just pick a start and an end.

**Connects to.** The graph, task identities and units shared by every later method. Mode A;
LO1. 3D: main view — which connections the buildings block.

#### W2 · Dijkstra: when to trust the current shortest path

**Question.** Why does "the goal has been discovered" not mean "the lowest-cost route has
been found"?

**Lecture.** Derive tentative distances, settled nodes and relaxation step by step. Under
non-negative costs, explain why popping the smallest tentative distance is correct. Discuss
stale queue entries, ties, unreachable nodes and parent-pointer updates.

**Must derive.** The correctness argument built on "an undiscovered shorter path must first
cross the frontier". Separate discovered, enqueued, effectively popped and settled; the stop
condition is the goal being popped after correct processing, not the goal being generated.

**Tutorial.** Trace a wrong implementation that returns early, then complete the search core.
Test source equals goal, unreachable, repeated improvement and equal-cost paths. Count
effective expansions and queue operations; animation steps are not algorithm statistics.

**Output and mastery.** A runnable Dijkstra, parent-pointer reconstruction, four test classes
and a short correctness note. Can predict the algorithm on a new small graph and can use a
counterexample to expose "settle on discovery" and "stop when the goal is generated".

**Connects to.** The same search loop takes a heuristic in W3 and searches space-time states in
W10. Mode A; LO1. 3D: side view.

#### W3 · A*: what the heuristic speeds up, and why it is still correct

**Question.** The heuristic never overestimates; why can an implementation still return a worse
route?

**Lecture.** Generalise from Dijkstra's accumulated cost to f=g+h. Explain heuristics as
lower bounds on remaining time, with units; separate admissible from consistent. Study an
admissible but inconsistent counterexample and what to do when a better path reaches an
already expanded node.

**Must derive.** Check h(goal)=0, h(v) ≤ true remaining cost, and h(u) ≤ c(u,v)+h(v). Use
straight-line distance divided by the speed upper bound as a candidate time lower bound and
check each model condition it depends on; never add metres to seconds.

**Tutorial.** The "why did it return cost 5, not 4?" experiment (`examples.md` §1, a four-edge
symbolic graph that isolates implementation behaviour): predict, trace, locate the bug, fix
re-expansion, build a variant. Then on the same graph compare h=0 with a legal heuristic on
cost, expansions and time; put your own h in strategy slot 1.

**Output and mastery.** A* reusing W2, the counterexample and regression test, the heuristic's
justification and a small comparison table. Can state both the heuristic's conditions and the
implementation's conditions; "A* is faster than Dijkstra" is not an answer.

**Connects to.** The heuristic and state-deduplication judgements return in resource labels and
space-time search. Mode A; LO1, LO5. 3D: side view.

#### W4 · The shortest route may not bring the drone back

**Question.** The fastest route runs out of battery; can we declare the order undeliverable?

**Lecture.** Accumulate time and energy along outbound leg, service and return leg. Filter by
payload first; after service the return leg is unloaded. Separate "is the edge legal", "is
this candidate feasible" and "is there another route within the budget". Use time–energy
labels at the same node and task phase to explain why keeping only the fastest arrival is
wrong. Slop Hill is a hill: uphill edges cost more than downhill ones, so the fastest way to
the top may not come back.

**Must derive.** In a static, non-negative, additive model, label A dominates B only if A's
time and energy used are both no larger and at least one is smaller. The full-task budget is
E_used ≤ E_start − E_reserve, on the whole trip, not the outbound leg alone.

**Tutorial.** The case is the two routes to #07: ridge (fast, expensive) and contour (slow,
cheap) (`examples.md` §2). In the provided label-search skeleton complete the budget and
dominance checks (strategy slot 2); show with two mutually non-dominated prefixes why
single-label pruning is wrong, and confirm by enumeration. Connect to the site ledger and
watch loaded outbound, unloaded return and service consumption.

**Output and mastery.** The resource-extension/label-filter functions, two feasibility
counterexamples, a full-task record. Can tell "this candidate failed" from "no feasible
solution exists in the stated search range", and can state the assumptions under which the
label rule holds.

**Connects to.** Scheduling uses the full costs returned here; later waiting must consume time
and energy too. Mode A; LO1, LO2. 3D: main view — the two routes to #07 coloured by energy,
climbs visibly more expensive.

#### W5 · One drone, many orders: write "a good plan" as a formula first

**Question.** Same total distance; why different lateness?

**Lecture.** From full-task cost derive loading, departure, delivery, return and next
availability. Separate total lateness, number of late orders, all-returned time and sum of
delivery times; prove with a two-order case that these objectives are not equivalent.

**Must derive.** start = max(ready time, drone available time), then loading, flight and
service; next availability from actual return plus the fixed turnaround and charging.
Lateness is measured at delivery, not return. With tasks and routes fixed, swapping the order
does not change total flight distance.

**Tutorial.** The two-order example uses one near and one far order (the roles of #03 and #07,
`examples.md` §3A). Compute the first few of the six orders #01–#06 by hand, then implement
the timetable recurrence. Compare FIFO with earliest-deadline using the course's stated
primary objective (strategy slot 3); build a small "change the metric and the preferred plan
changes" counterexample.

**Output and mastery.** A single-drone timetable function, a per-order ledger, two baseline
results and an objective definition. Can check the program by hand; refuses to pass off an
improvement in another metric as an improvement in the primary one.

**Connects to.** The same evaluation function drives W6 ordering and W7 assignment. Mode B;
LO2, LO3. 3D: side view.

#### W6 · Improving the order: why one swap is worth accepting

**Question.** Keep swapping pairs; is the final plan optimal?

**Lecture.** Write a single-drone plan as a permutation. Fix the swap neighbourhood and the
acceptance rule; every candidate is re-evaluated from the same initial state. Explain why
strict improvement terminates on a finite set of permutations and why a local optimum depends
on the neighbourhood.

**Must derive.** Enumerate all 6! = 720 permutations of six orders and compare with FIFO,
earliest-deadline and swap improvement. Compare objectives only between complete feasible
plans under the same model; never lower lateness by dropping an order. The exact optimum may
be tied (`examples.md` §3B has two); report "one of the optima".

**Tutorial.** Implement a swap improver that prints every accepted move with the objective
before and after. Find a case where the local optimum is not the global one and prove it with
the enumerator; tidy the A1 search and scheduling code.

**Output and mastery.** The swap improver, a single-drone comparison report, a local-optimum
counterexample and a full A1 draft. Can state the neighbourhood, the stopping condition and
what is not guaranteed; "no further improvement" is not written as "optimal".

**Connects to.** The swap move stays; W7 adds cross-drone migration and W11 re-evaluates with
real trajectories. Mode B; LO3, LO5. 3D: side view.

#### W7 · From ordering to assignment: which drone takes which order

**Question.** Equal numbers of orders per drone; why is one still busy and one idle?

**Lecture.** Generalise one task sequence to one sequence per drone. Use the full-task
evaluator to build drone–order feasibility and cost; the same distance can carry different
payload and energy qualifications. Build an initial solution greedily, then extend the
single-drone swap to cross-drone migration.

**Must derive.** Compute each drone's next availability after a candidate assignment and the
change in the plan objective. Say that costs without corridor occupancy are independent
estimates, not proof of joint feasibility.

**Tutorial.** Three drones of one type on #01–#09 plus #20, then the same map with two types;
#20 fits only type H. Implement earliest-predicted-completion assignment (strategy slot 4)
and one cross-drone migration; build an "equal counts, unequal time" counterexample.

**Output and mastery.** Feasibility and cost matrices, a greedy initial solution, cross-drone
improvement records. Excludes infeasible pairs before discussing efficiency; can explain why
a local improvement affects other drones.

**Connects to.** A1's search, timetable and swap logic continue as the start of A2. Mode B;
LO2, LO3. 3D: side view — the two drone types are distinguishable.

#### W8 · Before the battery is full: shared resources in the timetable

**Question.** Move one order to another drone; why does a third drone's plan change too?

**Lecture.** Fix the charging protocol: ground queue, first come first served, released when
full, no charge-curve optimisation. Derive the resource timetable from charging start =
max(request time, release time) and show how a change in task order reaches other drones
through the queue.

**Must derive.** Charging occupancy never exceeds capacity; loading, flight and charging of one
drone do not overlap. With a fixed tie rule the whole event sequence is reproducible. Every
candidate plan is recomputed together with every affected resource.

**Tutorial.** Schedule a two-drone, one-pad example by hand, then run the five-drone, two-pad
case. Apply the same migration move with shared charging off and on, and locate the source of
the difference.

**Output and mastery.** A hand-computed charging timetable, capacity tests, a cross-drone
dependence note and the first full A2 plan. Can trace a delay dependence chain; queueing is
not written as a constant added per drone.

**Connects to.** The same occupancy-interval representation is used for the corridor in W9 and
for whole-system recomputation in W11. Mode B; LO2, LO3, LO4. 3D: side view — pad occupancy
visible.

#### W9 · Same place, not the same search state

**Question.** Why can single-drone routes on the same map still not be flown together?

**Lecture.** Define a conflict from the smallest two-drone example, then put time into the
state. Separate a spatial path from a timed trajectory; explain why `visited[node]` alone
deletes waiting states. Drone types occupy for different lengths of time; check whole
intervals, not animation samples.

**Must derive.** Half-open intervals [s, e) on one exclusive resource; overlap is
max(s1,s2) < min(e1,e2). Node-transition occupancy and safety buffers are declared by the
course; a half-open interval is not a real-world separation standard.

**Tutorial.** Mark the conflict between two independent trajectories in the corridor (#13 and a
drone coming the other way); complete the reservation query; step through
(P,3)→(P,4)→… at the corridor's west waiting point and show the spatial-visited bug
(`examples.md` §4). Fix by hand with waiting or a detour first; do not reach for the full
multi-drone algorithm yet.

**Output and mastery.** A conflict validation function, a reservation table, a state definition
and a deduplication counterexample. Can give concrete evidence of "same place, different
future choices" and say which waits are legal and what they cost.

**Connects to.** W2–W4's state, queue and resource judgements are unified in W10. Mode C; LO4.
3D: main view — the conflict shown as a volume of air in the corridor. The home page
experience and this week's deck use the same two-drone case.

#### W10 · Searching in time: leaving the next drone a way through

**Question.** Does the choice of which drone to plan first change what the others can find?

**Lecture.** Reuse A* to search moves and waits under given reservations. Each state holds
place, task phase and time; the resource record keeps energy used. Use the static remaining
time, ignoring occupancy, as the lower bound; plan drones one by one by priority and commit
full-task reservations.

**Must derive.** Legal space-time actions, budget pruning and the full goal state. Separate
"the best route given the other reservations" from "the joint optimum for all drones"; a
finite time window or a priority failure does not prove the system has no solution.

**Tutorial.** In the provided skeleton complete neighbour generation and reservation filtering.
Compare two priorities (strategy slot 5); check that added waiting changes energy, delivery
and return together. Add one failed-reservation rollback test.

**Output and mastery.** The key cooperative-search functions, results under two priorities,
budget and failure-class notes. Can explain the method's guarantee range; not every failure
is written as "undeliverable".

**Connects to.** The real cost from these routes replaces W7's independent estimate in W11.
Mode C; LO1, LO2, LO4. 3D: main view — scrub the timeline and watch existing reservations
make the next drone wait or detour.

#### W11 · The routes changed, so the assignment must be reconsidered

**Question.** The drone that looked fastest at assignment time — is it still fastest under real
reservations?

**Lecture.** Join assignment, routes, resources and the objective into one evaluation. Reuse
swap and cross-drone migration; every candidate regenerates the full plan from the same
initial state so old reservations and old costs cannot leak in. Fix a compute budget; accept
only complete, feasible candidates that improve the objective.

**Must derive.** The input of local improvement is the full plan; evaluation includes real
reservations and charging. A decomposed method may depend on the initial solution, the
priority and the budget; no claim of joint global optimality.

**Tutorial.** Compare three methods: assignment on independent costs; fixed assignment with
route coordination only; assignment with cost feedback allowed. Trace at least one order from
an assignment change to changed waiting, energy and lateness.

**Output and mastery.** A linked-improvement record, three same-condition comparisons and one
failure analysis. Shows that route cost actually reached the scheduling decision, not two
independent tables side by side.

**Connects to.** All code goes into A2; no new system after this week. Modes B+C; LO3, LO4,
LO5. 3D: side view.

#### W12 · Twenty dinners: deliver the algorithm, and state its limits

**Question.** Can someone else reproduce your conclusion from your plan and records, and say
which conditions it holds under?

**Lecture.** Review the path from spatial nodes to resource labels to space-time states, and
the dependence of ordering, assignment and coordination. Separate proven properties, results
supported by finite tests, and unverified generalisations.

**Must derive.** Re-check the objective, the order denominator, task completeness and every
constraint; use enumeration on small instances and report quality and compute cost on the
twenty-order scenario without unsupported optimality claims.

**Tutorial.** Run and audit the final plan; pick one late or unscheduled order and trace the
cause through events and search states. Reproduce one conclusion given by a peer or the
teacher; write the personal explanation.

**Output and mastery.** A2's code, plan, per-order and resource records, comparison tables and
explanation. Can say why the algorithm works, when it fails, and at which level the next
change belongs.

**Connects to.** Everything; no new mechanism this week. Modes A+B+C; LO1–LO5. 3D: main view —
the twenty-order replay, stopped at the chosen order's failure point.

## 6. Tutorials are not free play

Every two-hour tutorial has the same shape: 15 minutes prediction and hand computation, 25
minutes derivation or tracing a small example, 55 minutes implementation and comparison, 25
minutes tests and explanation. The lecture does not leave all derivation to students, and the
tutorial is not graded by the number of screenshots.

Every tutorial page provides: the week's question and goal; the inputs and current
assumptions; existing code and the part to complete; the steps; at least one counterexample;
the expected output format; the explanation question; how to check; the link to the
assignment. An example first, then a new problem with different numbers or structure, to test
transfer.

Every tutorial opens on its own with a valid case loaded. Students may continue with their own
results, but later material is never locked behind earlier weeks. Hints and reference answers
appear after the student has written a prediction; a reference answer never stands in for the
student's own record.

A "mistake" in an exercise is not a scripted event. A failure or a difference is shown only
when the program actually produced it; no week is required to show a set number of red items.

## 7. The cumulative modules and the strategy slots

| Module | Students implement | The teacher's framework provides |
|---|---|---|
| A: single-drone routing and resources | Dijkstra/A* relaxation, queue handling, parent pointers, heuristic; resource feasibility and label filtering; key tests. | Graph loading, priority-queue container, resource-label engine skeleton, geometry and energy rules, an independent small-instance checker. |
| B: delivery scheduling | Single-drone timetable recurrence, ordering rules, swap neighbourhood, greedy assignment, cross-drone migration. | Event-scheduling skeleton, fixed charging model, report and resource query interfaces, baselines and the enumeration tool. |
| C: reservations and coordination | Occupancy queries, space-time move/wait expansion, planning priority, and the improvement logic that takes real route costs. | Space-time label framework, full-task reserve/rollback interface, independent validator, compute-budget control, rendering and replay. |

Students do not write the simulator, the site, model loading, charging physics or a general
multi-drone optimal solver. Every key function has a real entry point and tests, not only a
signature.

The small, pure functions in the "students implement" column run on the site as **strategy
slots**; the loops, the label engine, event scheduling, the space-time framework and the
validator are the teacher's skeleton running in the browser. Each slot has three presets and
an editable text box; the function runs in the page and the result is labelled with the slot
version. Step-by-step expansion, improvement traces and feedback records show the student's
own function at work.

| Stage | Slot | Skeleton provides |
|---|---|---|
| S1, W1–W3 | `h(node, goal)` | Dijkstra/A* main loop, priority queue, parent pointers, re-expansion |
| S2, W4 | `dominates(a, b)`, `withinBudget(label)` | Label engine, phase switching, full-task ledger |
| S3, W5–W6 | `orderKey(order, state)`, `objective(plan)` | Timetable recurrence, swap neighbourhood enumeration, the 720-permutation reference |
| S4, W7–W8 | `assignCost(drone, order, state)` | Feasibility matrix, migration enumeration, event scheduling and the charging queue |
| S5, W9–W11 | `priority(tasks, state)` | Space-time expansion, reservation table, rollback, independent validator, full re-evaluation |

The downloadable practice pack is the fictional course's formal submission format: the same
JSON data, the same function signatures, the same tests. The site does not depend on it to
demonstrate anything. Assignments require code and explanation; choosing a preset or taking a
screenshot does not replace an implementation.

## 8. Assessment: weekly tutorials and two assignments

Dates and weeks in this section are authoritative. Both assignments are individual.
Tutorial attendance and lab participation are assessed every week as a separate component.

| Assessment | Weight | Released | Due | Teaching it needs |
|---|---:|---|---|---|
| Weekly tutorial attendance and lab participation | 20% | W1 | Every Wednesday, W1–W12 | Each week’s case |
| A1: single-drone routing and delivery plan | 30% | W3, Mon 2027-03-08 | W7, Fri 2027-04-09 17:00 | W1–W6 |
| A2: multi-drone cooperative delivery planner | 50% | W7, Mon 2027-04-05 | W12, Fri 2027-05-14 17:00 | W7–W11, reusing A1 |
| **Total** | **100%** | | | |

All times `Australia/Sydney`. A1's due date in W7 covers W1–W6 only; A2 starts with
assignment and completes coordination as it is taught. A2 is due after the W12 tutorial.

### Weekly tutorial attendance and lab participation

Every week earns up to two raw points: one for attendance, one for a prediction,
an experiment or comparison, and an explanation shown to the tutor. A failed experiment
can earn the participation point when its failure is explained. All twelve weeks count;
24 raw points scale to 20 percentage points of the course grade. Attendance and
participation are recorded separately, and each contributes half of this component.
For an approved absence or access need, the student agrees an equivalent activity and
check-in with the teaching team; the team confirms how credit applies. The website
does not award points or store attendance.

### A1: single-drone routing and delivery plan

**Task.** One drone, the six known orders #01–#06. Implement correct search, handle the full
round trip and energy, then produce a justified single-drone task order.

1. Implement Dijkstra and A* in the same search framework, justify the heuristic, and provide
   one counterexample that exposes a wrong implementation together with the test that fixes
   it.
2. Complete the budget and dominance checks in the resource-label skeleton; distinguish "the
   fastest candidate is out of budget" from "no feasible task was found". Every order includes
   service and the unloaded return.
3. Implement the timetable recurrence; compare FIFO, earliest-deadline and swap improvement;
   on the six-order instance check solution quality against all 720 permutations.
4. With task and parameters fixed, explain one improvement, one limitation and one failure,
   without changing the model or dropping an order.

**Deliverables.** Runnable code, configuration and tests; a structured six-order plan with
run results; search and scheduling comparison tables; a personal analysis of at most 1,200
English words (code, references and tables excluded). The analysis states assumptions,
correctness conditions, counterexamples and experimental conclusions; it is not a development
diary.

| A1 marking | Weight |
|---|---:|
| Search implementation, correctness conditions, counterexample | 35% |
| Full task and resource handling | 20% |
| Timetable, ordering and local improvement | 25% |
| Fair experiments, tests, personal explanation | 20% |
| **Total** | **100%** |

### A2: multi-drone cooperative delivery planner

**Task.** On the same map, up to five drones of two types and two charging pads deliver all
twenty orders. Reuse A1; add assignment, shared resources and space-time coordination; show
that the two kinds of planning actually feed back into each other.

1. Generate a feasible assignment and per-drone order from full-task costs; implement
   cross-drone migration and explain the feasibility filter.
2. Bring charging waits into the full evaluation; no constant added per drone.
3. Complete reservation filtering and the key space-time search extensions; compare two
   priorities; validate full round trips, in-air waiting energy and resource occupancy.
4. Compare three levels: initial assignment on independent costs; fixed assignment with
   coordination; improvement with real cost feedback. An independent plan that fails joint
   validation is diagnostic only; its shorter time is not a feasible advantage.
5. Record at least one real feedback event: route waiting or detour changed a cost, which
   changed an assignment or an order. Attach results under fixed conditions and a failure
   explanation.
6. Design one new order (place, weight, promised time) that makes the reference method late or
   infeasible; import it into the workbench, validate, and explain which assumption of the
   reference method it hits.

**Deliverables.** Code and tests; algorithm and configuration versions; the twenty-order plan;
per-order and resource event records; comparison tables; the designed order with its
validation; a personal analysis of at most 1,600 English words. Formal evaluation uses fixed
cases and resources; there are no marks for code volume or rendering quality.

| A2 marking | Weight |
|---|---:|
| Assignment, local improvement, objective definition | 25% |
| Space-time search, resource constraints, correctness | 30% |
| Route–schedule feedback and integrated validation | 25% |
| Fair experiments, reproduction, personal explanation | 20% |
| **Total** | **100%** |

W8, W10 and W11 check the resource plan, the smallest cooperative case and the experiment
design; this is formative assignment feedback, separate from the weekly tutorial mark. A1 problems may be fixed; a student who continues A2 on a
credited reference searcher is marked on the new work, not penalised twice for an early error.

### Shared marking principles

Formal results are checked for constraints first, then compared on performance. For complete
feasible plans the primary objective is total lateness, then the time all drones are back,
then total energy (`engine.md`). A failure analysis may be submitted without a complete plan,
but feasibility is never faked. Performance is not the only evidence: a correct argument and
a reliable diagnosis are marked in their own right.

Peer discussion and external code are acknowledged; AI assistance does not replace the
personal explanation. Any claim about an algorithm's result is backed by code, inputs and run
records; generated report text is not an experiment.

## 9. Materials and site

One workbench with three modes: A single-drone search and tasks, B ordering and fleet, C
multi-drone space-time coordination. Modes are groups of layers; the semester slider in the
lab opens the layers week by week. The home page states the course claim with a small
shared-corridor experience; lectures place a static concept example next to the derivation;
tutorials load a case; both assignments reuse the same run, validate and export flow. The lab
holds a worked-example record that shows the five upgrades on one instance.

One full deck, "The same shortest path, and why they cannot fly it together", belongs to W9:
independent paths, conflict intervals, state (place, time), legal waiting, reservations, into
space-time search. Every figure and number in the deck comes from the same small case that
the home page and the W9 tutorial use.

Students always know which conditions are switched on. 3D explains position and consequence;
it does not replace formulas, tables, code and argument. The full instance, though, exists
only on the 3D map, and W1, W4, W9, W10 and W12 make their judgement while looking at it.
Details in `site.md`.

## 10. Readings and course notes

External material supplies theory and method; the delivery parameters, exercises, dates and
marking are this design. Only the named parts are required. Course notes are written and
published with their pages.

| Week | Minimum reading and its use |
|---|---|
| W1–W2 | S1 on graphs and search; course notes on the full round trip, edge direction and the Dijkstra invariant. |
| W3 | S2 on heuristics and repeated states; course notes with a hand-computable counterexample. |
| W4 | S3 for the problem definition, labels and dominance (no C++ API, no Boost install); course notes give this course's resource rules. |
| W5–W8 | Four course notes: timetable and objective, swap neighbourhood, assignment cost, events and shared charging; each with one hand-computable example and a test. |
| W9 | S5 on conflict assumptions and objectives; course notes state this course's resource rules. |
| W10 | S6 for the Cooperative A* idea, not the whole paper; back to S2. |
| W11–W12 | Course notes on full re-evaluation, fixed comparisons, evidence and limits; reuse earlier counterexamples. |

Design basis: component skills first, then their combination and the judgement of when they
apply (S7); every assignment tests only what has been taught and practised (S4). The
organisation of one persistent question with readings borrows from Calling Bullshit; the
continuous accumulation toward a final project borrows from How to Make (Almost) Anything
(S8, S9). Neither course's timetable or activities are copied.

- S1: [Modern Robotics — 10.2.4 Graph Search](https://modernrobotics.northwestern.edu/nu-gm-book-resource/10-2-4-graph-search/)
- S2: [UC Berkeley CS188 — Informed Search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html)
- S3: [Boost Graph Library — Resource-Constrained Shortest Paths (concept reading only)](https://www.boost.org/doc/libs/1_86_0/libs/graph/doc/r_c_shortest_paths.html)
- S4: [CMU Eberly Center — Align Assessments, Objectives, and Instructional Strategies](https://www.cmu.edu/teaching/assessment/basics/alignment.html)
- S5: [Stern et al., 2019 — Multi-Agent Pathfinding: Definitions, Variants, and Benchmarks](https://ojs.aaai.org/index.php/SOCS/article/view/18510)
- S6: [Silver, 2005 — Cooperative Pathfinding](https://ojs.aaai.org/index.php/AIIDE/article/view/18726)
- S7: [CMU Eberly Center — Learning Principles](https://www.cmu.edu/teaching/principles/learning.html)
- S8: [Calling Bullshit — Syllabus](https://callingbullshit.org/syllabus.html)
- S9: [How to Make (Almost) Anything — 2025](https://fab.cba.mit.edu/classes/863.25/)

## Teaching alignment

The W1 demonstration uses the existing
ten-node block and its two computed legal alternatives; the canonical graph is not
edited to manufacture another route. W7 begins with A and B (L) and D (H); W8
introduces the five-drone fleet with shared pads. Symbolic and canonical cases remain
separate. Exact enumeration is explicitly requested and reports its finite-domain
guarantee. The course revision adds worked lectures and guided tutorials before the
full workspace.

## Local implementation boundary — 21 September 2026

The slot table above describes the browser framework. The offline practice pack additionally
connects `mySearch`, `myTimetable`, `mySwaps`, `myAssign`, `myMigrations`, `myNeighbours`
and `myImprove` to an integrated student runner. These are explicit unfinished exercises;
the reference has its own executable entry point. A missing function cannot produce a new
student success record. The pack checks real paths, recurrence outputs, order completeness,
complete neighbourhood generation and claimed local optima against independent calculations.

The space-time student exercise uses a bounded supplied driver with phase, absolute time,
energy and full-interval checks. The full fleet flight planner, charging queue, geometry and
physical validator remain provided. A1 compares the student's canonical-six timetable with
actual flight actions; A2 records independent/coordinated/improved plans and two priorities.
Browser records and local implementation records have distinct, documented formats.
