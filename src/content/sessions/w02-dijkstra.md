---
title: "Trace a Dijkstra that returns too early"
description: "Trace a wrong implementation, complete the search core, and test the four cases that catch it."
week: 2
date: 2027-03-03
teachers:
  - kofi-marchetti
spec:
  - "you can predict the settle order on a new small graph before running it"
  - "you can build a counterexample that exposes settle-on-discovery"
  - "you can build a counterexample that exposes stop-when-goal-generated"
---

## This week's question

Why does "the goal has been discovered" not mean "the lowest-cost route has been found"?

## Before the tutorial

Take the block graph from week 1. Predict, on paper, the order in which nodes are
settled from the kitchen. Then predict what a version that stops when the goal is first
generated would return.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Trace a wrong implementation that returns early, then complete the search core. Test
source equals goal, unreachable, repeated improvement and equal-cost paths. Count
effective expansions and queue operations; animation steps are not algorithm statistics.

## Afterwards

A runnable Dijkstra, parent-pointer reconstruction, four test classes and a short
correctness note.
