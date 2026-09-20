---
title: "Why did it return cost 5, not 4?"
description: "An admissible but inconsistent heuristic on a four-edge graph: predict, trace, find the bug, fix re-expansion, then compare h = 0 with a legal heuristic."
week: 3
date: 2027-03-10
teachers:
  - kofi-marchetti
spec:
  - "your fixed A* returns cost 4 on the four-edge graph, and the test fails on the unfixed one"
  - "you can state the heuristic's conditions and the implementation's conditions separately"
  - "your heuristic has a unit, and it is the unit of the cost"
---

## This week's question

The heuristic never overestimates; why can an implementation still return a worse route?

## Before the tutorial

Four edges: S→A 3, S→B 1, B→A 1, A→G 2, with h(S)=0, h(A)=0, h(B)=3, h(G)=0. Before
running anything: does h overestimate anywhere? If CLOSED is never reopened, which path
comes back?

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Predict, trace, locate the bug, fix re-expansion, then change the graph so the same bug
appears on a different structure. On the same graph compare h = 0 with a legal heuristic
on cost, expansions and time. Put your own h in strategy slot 1.

## Afterwards

A* reusing your week-2 loop, the counterexample and its regression test, the heuristic's
justification and a small comparison table. Use the labelled map and result tables to connect the calculation to the hill.
