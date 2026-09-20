---
title: "Reopen a better route"
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

## This week's task

**Model:** S→A=3, S→B=1, B→A=1, A→G=2; h(B)=3, other h=0. Symbolic costs; no energy.

## Before you start · 15 minutes

Read W3. Predict the cost with reopening disabled. Check h(B) against the true B→G cost and against cost(B,A)+h(A).

## Trace the example · 25 minutes

Allow reopening and compare cost 5 with 4. Inspect the step where B reaches A more cheaply.

## Implement and compare · 55 minutes

Extend mySearch so a better g can reopen an expanded node. Keep the old counterexample as a regression test and compare h=0 on exactly the same graph.

The practice pack is linked under “My experiment record”. Browser presets demonstrate the teacher's framework; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Record the inconsistent edge, the changed parent and returned path. State the conditions on the heuristic separately from the conditions on the implementation.

**What to keep:** A1: A*, heuristic justification and regression tests. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Edit the micrograph in the advanced inputs to construct another admissible-but-inconsistent case. Then compare expansions on the canonical map.
