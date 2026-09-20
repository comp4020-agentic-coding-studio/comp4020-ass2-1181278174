---
title: "Catch an early stop"
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

## This week's task

**Model:** The symbolic S→G=10, S→A=1, A→G=1 example first; then the kitchen→#03 graph. No energy or reservations.

## Before you start · 15 minutes

Read W2. Predict OPEN after removing S and A; write the answer an early-stop implementation returns.

## Trace the example · 25 minutes

Try stopping at discovery, then restore the starting example. Step through the search table and identify when the better goal cost appears.

## Implement and compare · 55 minutes

Complete mySearch in the practice pack. Keep best costs, parent pointers and a priority queue; stop on the non-stale goal pop. Run the provided early-discovery test.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Add source=goal, unreachable, repeated-improvement and equal-cost tests. Report the returned path and cost; explain why discovery is too early.

**What to keep:** A1: Dijkstra implementation and its counterexample. Show the tutor your prediction, experiment and explanation for this week’s participation point; keep the record to develop your assignment.

## Optional extension

Switch to the canonical graph and trace one improved parent. Heuristic design is next week.
