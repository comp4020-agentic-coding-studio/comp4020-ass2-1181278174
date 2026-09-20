---
title: "The two routes to #07"
description: "Ridge or contour: complete the budget and dominance checks, show what single-label pruning loses, confirm by enumeration."
week: 4
date: 2027-03-17
spec:
  - "you can tell \"this candidate failed\" from \"no feasible route exists in the stated search range\""
  - "your dominance rule keeps both labels at Q, and the fastest-only version reports no solution"
  - "you can state the assumptions under which the dominance rule holds"
---

## This week's question

The fastest route runs out of battery; can we declare the order undeliverable?

## Before the tutorial

Two routes to #07: the ridge line, S→A→Q, and the contour route, S→B→Q; then Q→G back
down. Usable energy is 8. Before running: which route is faster, which is cheaper, and
does either dominate the other at Q?

## In the tutorial

Two hours, the same shape every week: 15 minutes of prediction and hand computation, 25
minutes deriving or tracing a small example, 55 minutes implementing and comparing, 25
minutes of tests and explanation.

In the label-search skeleton complete the budget and dominance checks (strategy slot 2).
Run the wrong version that keeps only the fastest label per node first and explain what
it lost. Confirm by enumerating both routes. Connect to the ledger and watch loaded
outbound, unloaded return and service consumption.

## Afterwards

The resource-extension and label-filter functions, two feasibility counterexamples and a
full-task record. 3D is the main view this week: the two routes to #07 coloured by energy, with the climb visibly more expensive.
