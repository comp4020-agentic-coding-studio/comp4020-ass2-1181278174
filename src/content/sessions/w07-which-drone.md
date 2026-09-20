---
title: "Three drones, ten orders, one hotpot"
description: "Assign #01–#09 and #20 across three drones, then two types; build an equal-counts, unequal-time counterexample."
week: 7
date: 2027-04-07
spec:
  - "infeasible drone–order pairs are excluded before any efficiency comparison"
  - "you can explain why one migration changes another drone's finish time"
  - "your matrix shows #20 as feasible for H and infeasible for L"
---

## This week's question

Equal numbers of orders per drone; why is one still busy and one idle?

## Before the tutorial

Three drones of one type, orders #01–#09 and #20. Predict: if each drone takes the same
number of orders, will they finish at the same time? Which order can no L-type drone
take, and why?

## In the tutorial

Two hours, the same shape every week: 15 minutes of prediction and hand computation, 25
minutes deriving or tracing a small example, 55 minutes implementing and comparing, 25
minutes of tests and explanation.

Three drones of one type on #01–#09 plus #20, then the same map with two types; #20 fits
only type H. Implement earliest-predicted-completion assignment (strategy slot 4) and
one cross-drone migration. Build an "equal counts, unequal time" counterexample.

## Afterwards

Feasibility and cost matrices, a greedy initial solution and cross-drone improvement
records. 3D is a side view this week; the two drone types are distinguishable.
