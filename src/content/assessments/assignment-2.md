---
title: "Assignment 2: multi-drone cooperative delivery planner"
description: "All twenty orders, up to five drones of two types, two charging pads and one shared corridor. Reuses assignment 1. Released week 7, due week 12."
week: 12
release: 2027-04-05
due: 2027-05-14T17:00:00+10:00
weight: 50
marking:
  mode: weighted
  criteria:
    - name: Assignment, local improvement, objective definition
      weight: 25
    - name: Space-time search, resource constraints, correctness
      weight: 30
    - name: Route–schedule feedback and integrated validation
      weight: 25
    - name: Fair experiments, reproduction, personal explanation
      weight: 20
spec:
  - "every drone–order pair that cannot fly is excluded before any efficiency comparison"
  - "charging waits enter the evaluation as a shared resource, not as a constant per drone"
  - "two planning priorities are compared and every plan passes the independent validator"
  - "at least one recorded case where a route's wait or detour changed an assignment or an order"
  - "one designed order makes the reference method late or infeasible, and the analysis names the assumption it hits"
  - "the analysis is at most 1,600 English words, excluding code, references and tables"
related:
  - lectures/w07-which-drone
  - sessions/w12-twenty-dinners
  - assignment-1
---

Released Monday of week 7 (2027-04-05). Due Friday of week 12, 17:00 Australia/Sydney,
after the week 12 tutorial. It starts with assignment and completes coordination as weeks
8 to 11 teach it.

## The brief

> On the same map, up to five drones of two types and two charging pads deliver all twenty
> orders. Reuse assignment 1; add assignment, shared resources and space-time coordination;
> show that the two kinds of planning actually feed back into each other.

## What you do

1. Generate a feasible assignment and a per-drone order from full-task costs. Implement
   cross-drone migration and explain the feasibility filter.
2. Bring charging waits into the full evaluation. No constant added per drone.
3. Complete `myNeighbours` in the supplied state-search driver: retain node, phase and absolute time, filter full occupancy intervals, and account for wait energy. Use the provided full-flight planner for the canonical fleet experiment. Compare two
   priorities. Validate full round trips, in-air waiting energy and resource occupancy.
4. Compare three levels: initial assignment on independent costs; fixed assignment with
   coordination; improvement with real cost feedback. An independent plan that fails joint
   validation is diagnostic only; its shorter time is not an advantage.
5. Record at least one real feedback event: a route's wait or detour changed a cost, which
   changed an assignment or an order. Attach the results under fixed conditions and a
   failure explanation.
6. Design one new order — place, weight, promised time — that makes the reference method
   late or infeasible. Create it in the Lab’s scenario copy at an existing address, or in your own planner using the published scenario format. Recompute, validate and explain which assumption the result exposes. Keep the variant separate from the fixed twenty-order submission.

## What you submit

- Your completed `strategies.mjs`, tests and configuration, plus `student-a2.json` from `node run.mjs a2`. The record carries function sources, versions and input fingerprints.
- The twenty-order plan, with per-order and resource event records.
- The comparison tables for the three levels and the two priorities.
- The designed order and its validation, as a separate input file and checked output.
- A personal analysis of at most 1,600 English words. Formal evaluation uses the fixed cases
  and resources; there are no marks for code volume or rendering quality.

## How to justify the result

The four criteria below carry the weights shown. Constraints first, performance second: for
complete feasible plans the objective is total lateness, then the time every drone is back,
then total energy. A failure analysis may be submitted without a complete plan, but
feasibility is never faked.

Problems in assignment 1 may be fixed and carried forward. If you continue on the credited
reference searcher, this assignment marks the new work; an early error is not penalised
twice. Weeks 8, 10 and 11 give formative feedback on the resource plan, the smallest
cooperative case and the experiment design. That feedback does not add assignment marks;
attendance and lab participation count towards the separate tutorial component every week.

## Evidence for each criterion

| Criterion | Evidence to include | What the reader checks |
|---|---|---|
| Assignment and improvement | `myAssign`, `myMigrations`, the feasibility matrix and objective | Every order appears once; payload/range filtering comes before efficiency; migrations include insertion positions. |
| Space-time correctness | `myNeighbours`, phase and interval tests, two priorities and checked full-flight records | Touching intervals are legal, interior overlaps are rejected, waits use the right energy model, and the full task returns home. |
| Feedback and validation | `myImprove`, the three-level table and one accepted move with before/after events | The candidate is recomputed from the initial world; the explanation connects changed costs to the decision; search termination is stated. |
| Experiments and reproduction | Fixed-case outputs, separate designed-order files, commands and explanation | Comparisons keep the same model; the variant is labelled; limitations and reused code are acknowledged. |

The shared charging queue, geometry, full space-time flight planner and physical checker
are provided. Your local state-search exercise demonstrates the state and reservation
logic without requiring a second flight engine. Keep its symbolic times separate from
the canonical fleet's seconds and joules. For failure analysis, identify the violated
constraint and show how to reproduce it; an incomplete plan has no comparable objective.
