---
title: "Three methods, one causal chain"
description: "Compare independent-cost assignment, fixed assignment with coordination, and assignment with cost feedback; trace one order through the chain."
week: 11
date: 2027-05-05
teachers:
  - kofi-marchetti
spec:
  - "your record shows route cost reaching the assignment decision, not two tables side by side"
  - "all three methods were run on the same inputs, priority and budget"
  - "you can name one input the result depends on that a joint optimum would not"
---

## This week's question

The drone that looked fastest at assignment time: is it still fastest under real
reservations?

## Before the tutorial

Pick one order from your week-8 plan. Predict whether its assigned drone will still be
the best choice once the corridor reservations from week 10 are in force, and what would
have to be true for the answer to change.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Compare three methods: assignment on independent costs; fixed assignment with route
coordination only; assignment with cost feedback allowed. Select bounded feedback and Run: the Lab evaluates fresh swaps and migrations up to your candidate budget. Inspect accepted and rejected candidates, then select a changed order to trace its preceding task, charging and corridor waits. A budget stop reports the best feasible plan found; it does not prove local optimality.

## Afterwards

A linked-improvement record, three same-condition comparisons and one failure analysis. Use the labelled map and result tables to connect the calculation to the hill.
