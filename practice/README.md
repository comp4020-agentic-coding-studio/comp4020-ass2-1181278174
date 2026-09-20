# SLOP3969 practice pack

Node.js 24 or later. Unzip into a fresh folder; no install, repository checkout or network is needed.

## Start here

```sh
node --test strategies.test.mjs wiring.test.mjs
node reference.mjs a1
node reference.mjs a2
```

The 19 provided checks should pass. The last two commands produce **TEACHER REFERENCE**
records. They demonstrate the format and are not your implementation or a submission.

Implement the functions in `strategies.mjs`, then run:

```sh
node run.mjs 2
node --test search.exercise.mjs
node --test scheduling.exercise.mjs
node run.mjs a1
node run.mjs a2
```

`run.mjs` calls your functions. An unfinished skeleton throws a named error and the
command exits unsuccessfully; it never substitutes a teacher answer or writes a new
successful record. The exercise tests intentionally fail until their functions are complete.
An older output file is not evidence of a new run: check the command's exit status.
Use the individual week command while learning, then the integrated assignment command.
W1 is a provided geometry inspection; W12 adds no new implementation beyond W11.

## What you write, and what is provided

| Weeks | Your entry point | Teacher framework |
|---|---|---|
| 2–3 | `mySearch(edges, source, goal, heuristic)` | Explicit edge lists, independent shortest-path comparison |
| 4 | `dominates(a,b)`, `withinBudget(label,budget)`, optional `h` | Label propagation, full flight ledger, physical checker |
| 5 | `myTimetable(sequence,cost,options)` | Cached full-trip costs, independent recurrence check |
| 6 | `mySwaps(sequence,score,limit)` | Checked scoring callback, all 720 permutations for comparison |
| 7 | `myAssign(world,matrix)` | Complete feasibility/cost matrix, flight evaluator |
| 8 | `myMigrations(assignment)` | Shared FCFS charging, complete candidate re-evaluation |
| 9–10 | `myNeighbours(state,edges,reservations,options)` | Bounded state-search driver, independent successor checks |
| 11 | `myImprove(assignment,context)`, `priority(tasks)` | Complete flight/reservation evaluation, independent validation |
| 12 | Integrate, reproduce and explain | Same fixed scenario and checker |

The browser exposes seven small strategy slots, whereas this local pack also requires the
larger search and scheduling implementations. `orderKey`, `objective` and `assignCost` are
browser slot examples: the local runner does not call them implicitly. Use them explicitly
in your own functions if wanted. Do not describe an unused function as part of an experiment.

`reference.mjs` contains explicitly credited teacher adapters and comparison algorithms.
`engine.mjs` supplies geometry, flight/service/return costs, shared charging, the full
space-time flight planner and the independent checker. You do **not** rebuild those systems.
The W9/W10 student state search is a small, separately labelled exercise; it is not secretly
used as the full fleet flight planner. Its ground wait at P costs zero; real airborne waits
in the provided flight model consume hover energy.

## Function contracts

- `mySearch`: edges have `from`, `to`, non-negative `cost`. Return `{status:'found',cost,path}`
  or `{status:'no-solution'}`. Pop the goal, relax improved distances and reopen when needed.
  The runner checks both the optimum cost and every directed edge in the returned path.
- `myTimetable`: sequence entries have `id`, `ready`, `promised`. `cost(job,start)` returns
  `{d,p,energy}` or `null`. Options include `availableFrom`, `loadingTicks`, `turnaroundTicks`
  and `requestedDepartures`. Return `{slots,infeasible,feasible,objective}`. Each slot has
  `id,start,depart,deliver,ret,available,late,energy`. A feasible objective has
  `lateness,allReturned,energy,lateCount,sumDelivery`; omit it if infeasible. Do not mutate
  the input. Timetable weeks assume no shared charging or corridor reservations.
- `mySwaps`: `score(sequence)` recomputes your timetable and checks it. Return
  `{sequence,status,checked,moves}`. Status is `local-optimum` only after a full scan with
  no strict improvement, otherwise `budget`. The runner checks a claimed local optimum.
- `myAssign`: return every drone ID mapped to its ordered array of order IDs. Each order
  occurs once. Matrix entries include `drone,order,feasible,reason,ticks,d,energy`.
  Exclude infeasible pairs and update the chosen drone's availability after every insertion.
- `myMigrations`: return `[{description,assignment}]`. Include pair swaps within a drone
  and insertion at every position of another drone. Make fresh arrays; preserve all orders.
- `myNeighbours`: states have `node,phase,tick,energy`. Edges have `from,to,ticks,energy,resource`
  and optional `phase,toPhase`. Filter full half-open occupancy intervals, match the input
  phase, advance time and energy, and apply the edge's phase transition. A one-tick wait is
  allowed only in `options.waitNodes`, with energy `options.waitEnergy`. The driver caps
  time at `options.horizon` and energy at `options.budget`. W10 includes service and return:
  P/out at tick 3 must wait until 6, reach G at 8, service until 9 and return P/back at 11.
- `myImprove`: context supplies `evaluate`, `neighbours`, `compare`, `limit` (120 evaluations,
  including the initial plan). Evaluation returns a checked objective or `undefined` for
  an invalid/incomplete candidate. Return `{assignment,status,candidatesEvaluated,moves}`;
  status is `budget`, `local-optimum` or `infeasible`. Recompute all candidates from the
  same initial world and retain the best complete feasible plan. Never score dropped orders.
- `priority`: given ready tasks, return their drone IDs exactly once. The runner also
  evaluates the reversed order on the final fixed assignment.

## Assignment records

`student-a1.json` contains actual search outputs, label checks, FIFO/deadline/student-swap
schedules for #01–#06, the checked single-drone flight plan, and a labelled teacher exact
comparison. `student-a2.json` contains the symbolic state exercise, initial assignment,
independent routes with a joint check, coordinated routes, student feedback, two priorities
and complete flight/resource records. It records called function sources and call counts;
these identify what ran, not who authored the code. Submit your edited module and tests too.

For a separate A2 variant, copy the `config` from a record, add an order at an existing
address under `scenario.addedOrders`, and run `node run.mjs a2 variant-config.json`.
Keep that output separate; the fixed submission still contains the canonical twenty orders.
Do not overwrite canonical data to make a result look better.

The local record uses `slop3969-student-run`. Read it alongside your source or regenerate it
with Node. It is **not** the browser import format: the browser cannot execute these full
Node modules. `sample-a1.json` and `sample-a2.json` use `slop3969-experiment`; import those
in the Lab and press Run to recompute the teacher example. Export browser comparisons
separately to support your analysis. The website has no submission/upload service.

A diagnostic record can support a failure explanation; it is not a feasible scored plan.
The command checks correctness for published exercises, not authorship or universal
correctness. Add your own unreachable, source=goal, reserve, recurrence, omitted-order,
phase, boundary and rollback tests. Acknowledge any reused teacher or external code.
