---
title: "The two routes to #07"
description: "Ridge or contour: complete the budget and dominance checks, show what single-label pruning loses, confirm by enumeration."
week: 4
date: 2027-03-17
teachers:
  - kofi-marchetti
spec:
  - "you can tell \"this candidate failed\" from \"no feasible route exists in the stated search range\""
  - "your dominance rule keeps both labels at Q, and the fastest-only version reports no solution"
  - "you can state the assumptions under which the dominance rule holds"
---

## This week's question

The fastest route runs out of battery; can we declare the order undeliverable?

## Before the tutorial

Use the lecture’s symbolic version of #07: ridge S→A→Q gives label (4,7), contour
S→B→Q gives (6,3), and the return adds (2,2), written as (time, energy). Usable energy
is 8 teaching units; these are separate from the live map’s seconds and kJ. Before running: which route is faster, which is cheaper, and
does either dominate the other at Q?

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Implement the budget and dominance checks in your label-search module.
Run the wrong version that keeps only the fastest label per node first and explain what
it lost. Confirm by enumerating both routes. Connect to the ledger and watch loaded
outbound, unloaded return and service consumption.

## Afterwards

The resource-extension and label-filter functions, two feasibility counterexamples and a
full-task record. The tutorial pairs the computed results with a labelled map; week 4 also includes the route elevation profile.
