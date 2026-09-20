---
title: "Three drones, ten orders, one hotpot"
description: "Assign #01–#09 and #20 across three drones, then two types; build an equal-counts, unequal-time counterexample."
week: 7
date: 2027-04-07
teachers:
  - kofi-marchetti
spec:
  - "infeasible drone–order pairs are excluded before any efficiency comparison"
  - "you can explain why one migration changes another drone's finish time"
  - "your matrix shows #20 as feasible for H and infeasible for L"
---

## This week's question

Equal numbers of orders per drone; why is one still busy and one idle?

## Before the tutorial

Three drones: A and B are type L; D is type H. Orders #01–#09 and #20. Predict: if each drone takes the same
number of orders, will they finish at the same time? Which order can no L-type drone
take, and why?

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Start with the named three-drone mixed fleet. Keep its size fixed when testing another mix of types; #20 fits only type H. An all-light fleet is an infeasible diagnostic. Implement earliest-predicted-completion assignment (strategy slot 4) and
one cross-drone migration. Build an "equal counts, unequal time" counterexample.

## Afterwards

Feasibility and cost matrices, a greedy initial solution and cross-drone improvement
records.
