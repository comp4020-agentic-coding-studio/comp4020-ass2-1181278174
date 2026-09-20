# The engine contract

The teaching model the site computes with. Drone numbers, map coordinates and scenario inputs
come from the data files and are calibrated by reference runs before release; nothing here
invents a set of verified flight performance.

## 1. Space, state and units

The map is a finite directed graph. An edge carries its real polyline and its conflict
resource. All layers use one set of metric coordinates; a course entity is never identified by
a visual grid index. Axis conversion for models happens once, at the asset interface.

Slop Hill has elevation. Edge time is the cruise time, length over speed, or longer when the
rise over the drone's maximum climb rate exceeds it. Edge energy is cruise power (scaled by
payload) for the cruise time, climb power for any time the climb limit adds, and lift for the
rise — dearer per metre of rise the steeper the edge, by a factor (1 + gradeFactor × grade).
Descent adds nothing and refunds nothing, so an uphill edge always costs more than a downhill
edge of the same length, and a short steep route can be faster yet dearer than a long gentle
one. Time is the primary search cost; energy is a resource label. Both are computed in
`src/engine/graph.ts` from the map and the fleet, and planning, ledger, reservations and
replay read the same values.

Time is in integer ticks; every scenario publishes its tick length, and seconds are the
display unit. Non-integer physical durations are converted to ticks in the data generation
step in one fixed way; energy is charged on the duration actually executed. Every client and
the practice pack use the same tick, so a phone cannot change the answer by lowering
precision.

Energy accumulates in one integer unit (for example joules); the interface may show Wh with
1 Wh = 3600 J. Power formulas and conversions are defined in one place. No edge has negative
energy and there is no regenerative charging.

## 2. One task and its goal state

A task has loading, the take-off connection, the loaded outbound leg, customer service, the
unloaded return leg and landing. Loading and ground activity occupy the drone's time; flight,
service and in-air waiting consume energy by the given model. Service completion updates the
delivery event and the payload.

The route-planning goal is the earliest full return within budget on the current graph,
resources and time window. It reports delivery time and return time together. The optimum of
this sub-problem is never called the global optimum of the evening's total lateness.

The full goal state is "service done and back at the depot", not "first arrival at the
customer". Task phase is part of state identity; a loaded outbound and an unloaded return at
the same place are never merged. The full plan is checked before take-off; a failed candidate
never leaves half a reservation.

## 3. What each method guarantees

| Method | Conditions and limits that must be stated |
|---|---|
| Dijkstra | Graph and costs explicit and non-negative; correct relaxation and termination. Conclusions are about cost within the graph. |
| A* | h in the same unit as cost; goal lower bound, admissibility, and consistency or re-expansion handling matching the implementation. Over budget or cancelled is not success. |
| Resource-label search | A label holds place, task phase, time and energy used; static same-phase candidates use a sound dominance rule; faster is not the same as better. |
| Space-time A* | The state key separates at least place, task phase and absolute time; under one key keep the lower-energy label, or both when dominance cannot be shown. Static dominance is not applied across times. |
| Prioritised planning | Searches one drone at a time against committed reservations; may depend on the order; guarantees neither every joint solution nor joint optimality. |
| Scheduling local search | Accepts only strict improvement under an explicit neighbourhood and deterministic evaluation. A full scan without improvement proves a local optimum for that neighbourhood only; a budget stop proves nothing. |

Labels follow the resource-constrained shortest-path literature; heuristics and repeated
states follow the informed-search literature; space-time search and conflict assumptions
follow the MAPF and Cooperative A* papers listed in `course.md`. The implementation still needs
tests; a citation does not make it correct.

Time windows and expansion limits go into the result metadata. Result status is one of:
invalid input; found and verified; no solution in the fully searched domain; not found
within budget; cancelled; not verified. These are never collapsed into one red light.

## 4. Timetable and charging

For order j, r_j is the ready time and δ_j the soft deadline. For drone i, a_i is the time it
can load after the required ground activity and charging, and ℓ_i its loading time.

```text
loading starts      S_j = max(r_j, a_i)
take-off allowed    S_j + ℓ_i
plan the full task from there → delivery D_j, landing R_j, energy left E_j
if the drone has another task: after landing, turnaround, then the charging queue
charging yields a new a_i, then the next order at the head of the queue
```

Full battery before the first task; between tasks, charge to full under the fixed protocol;
no charging required after the last return. Ground waiting is not charged at hover power;
in-air waiting happens only at allowed points, occupies a resource and consumes energy.

Charging is first come first served by request time, ties by fixed drone id, non-preemptive,
released when full. A charging request enters the event queue after the real return and
turnaround; a drone planned earlier cannot jump ahead of one that landed earlier.

Parking spots and charging pads are different resources. Loading, flight and charging of one
drone never overlap illegally. Every occupancy, task and energy value comes from the same
event evaluator; students cannot type times by hand and skip the check.

## 5. Corridor reservations and full occupancy

Shared resources: named intersections, the two-way narrow corridor, service areas, the depot
merge point. Opposite-direction edges share one conflict resource; paths on genuinely
separate layers are independent only where the canonical data says so.

Every action lists the resources it occupies with start and end offsets; the whole interval
is validated, not the endpoints. Exclusive resources have capacity 1; the charging group has
capacity 2. Node crossing and required buffers are explicit rules, not zero-length hidden
occupancy. Consecutive occupancies of one resource by one drone are merged before comparison.

All resources use half-open intervals. Where a rule requires extra separation, the occupancy
is widened first and then tested for overlap; "did they collide in this frame" is never the
only check.

Planning may try reservations on a copy of the state and commit once the whole task succeeds;
any failure rolls back everything. Every resource record carries its task and drone identity
for undo and diagnosis.

## 6. How the two planners combine

The full evaluator takes: each drone's ordered task list, the planning priority, drone types,
rules and the case. It returns: the joint plan, resource records, per-order status, objective
values and failure reasons.

Evaluation advances by event time. When a task can take off, drones are planned in
deterministic priority order against committed reservations, each with a full round trip;
a return event triggers turnaround and the charging queue. Priority changes only the order
among schedulable tasks; a later task never overtakes an earlier unfinished task of the same
drone.

Local improvement re-evaluates every candidate from the same initial state. First change the
swap, the migration or the priority; then compute the real routes, waits, charging and
delivery results. Times, energy and reservations invalidated by the candidate change are never
reused.

The reference method supplies a complete runnable initial plan. The improver keeps the best
validated complete plan; one failed attempt does not overwrite it. The course does not require
incremental repair of arbitrary in-flight events; full recomputation both bounds the scope and
keeps experimental conditions easy to check.

## 7. Objective and reporting

Before release every formal case is generated by the teacher and independently validated to
have at least one complete feasible baseline, and the evaluation window is long enough to
contain it. Students schedule every order in the case; dropping a hard order is not allowed.

Validate payload, resources, energy, task completeness and forbidden areas first. Compare only
complete feasible plans:

```text
J = ( total lateness Σ max(0, D_j − δ_j),  all-returned time max R_j,  total energy )
```

Lexicographic: total lateness first, then all-returned time, then energy. The report also
lists on-time count, resource waits, expansions and compute time; an improvement in another
metric is never presented as an improvement in the primary one.

An incomplete plan or one with a violation gets no comparable J; it still lists every order,
the failures and the completed part, for diagnosis. Unfinished orders stay in the
twenty-order denominator. All runs share one evaluation cut-off; an unfinished evening never
gets an invented "all done" time.

W5's objective comparison may show other objectives side by side, marked as a learning
contrast; formal assignments use the objective above.

## 8. Canonical data

The map, the twenty orders, the fleet, the pads and the rules are one canonical file each;
their sha256 is pinned in `spec/`. Every weekly case is a subset or view of these files. The
parameter table is public on the policies page with a value, a range and a source for every
entry; any "course-set" parameter appears in the policies page's simulation-boundary section.

| Parameter | Value | Status |
|---|---|---|
| Area | 2 km × 2 km; a gaussian hill of 120 m with a 45 m knob at the top; the summit house at 165 m; the kitchen at the foot, 9 m | set |
| Route graph | 51 nodes, 148 directed edges; a jittered 7 × 7 street grid, thinned; a ridge between columns 2 and 3 on rows 2–4 with the corridor (298 m, resource `corridor`) as its only crossing; detour 1 607 m, 5.4× | set, `pnpm data` |
| Hilltop | A track of 173 m rising 43 m (grade 0.25) from the nearest street, and a spiral of 531 m rising 51 m (grade 0.10) from the next | set |
| Orders | #01–#20, numbered by ready time from 18:00:08 to 20:11; #07 at the summit, promised +25 min; #13 across the corridor (detour 508 m longer); #20 3.5 kg at s-6-5; others 0.3–1.4 kg | set |
| Type L | 12 m/s; climb 3.0 m/s; payload 1.5 kg; battery 95 kJ; cruise 120 W (+15 %/kg); climb power 300 W; lift 60 J/m; gradeFactor 20; hover 100 W | set, `pnpm calibrate` |
| Type H | 8 m/s; climb 2.0 m/s; payload 4 kg; battery 250 kJ; cruise 200 W (+8 %/kg); climb power 500 W; lift 90 J/m; gradeFactor 20; hover 220 W | set, `pnpm calibrate` |
| Fleet | A, B, C of type L; D, E of type H | set |
| Rules | Reserve 15 % of the battery; loading 60 s; service 45 s; turnaround 60 s; full charge in 1 200 s; tick 1 s; evening 18:00–21:00 (ticks 0–10 800); cut-off 21:30 (12 600) | set |
| Resources | corridor capacity 1; pads capacity 2 | set |
| Calibrated facts | A light drone can fly #01–#06. For #07 the light drone's fastest round trip (447 s, 84.7 kJ) is over its 80.75 kJ budget and a slower, cheaper one (472 s, 80.4 kJ) is chosen. Every order can be flown by some type; #20 only by H, on payload; H reaches all twenty; L is out of range for #14. | held by `spec/calibration.test.ts` |
| Design target | The normal batch has a complete feasible baseline and the reference method delivers at least N on time | to verify once the fleet planner exists; N then pinned |

If the data does not meet the design target, the data changes, not the promise.
