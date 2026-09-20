---
title: "From ordering to assignment: which drone takes which order"
description: "One sequence per drone, a feasibility matrix, earliest-completion greedy assignment and cross-drone migration."
week: 7
date: 2027-04-05
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w07-which-drone"
  - "lectures/w08-charging-pads"
---

Equal numbers of orders per drone; why is one still busy and one idle?

## What the lecture covers

One task sequence becomes one sequence per drone. The full-task evaluator gives
drone–order feasibility and cost; the same distance can carry different payload and
energy qualifications. Build an initial solution greedily by earliest predicted
completion, then extend the single-drone swap to a migration between drones. Costs
without corridor occupancy are independent estimates, not proof that the plans can be
flown together.

## What you must be able to derive

Compute each drone's next availability after a candidate assignment and the change in
the plan objective. Say clearly what an independent estimate does and does not promise.

## Where it goes next

A1's search, timetable and swap logic continue as the start of A2.
