---
title: "The swaps stop; 720 permutations do not"
description: "Implement a swap improver, find where it stops, and measure its exact gap against all 720 permutations."
week: 6
date: 2027-03-31
teachers:
  - kofi-marchetti
spec:
  - "your improver's stopping condition matches what your report claims"
  - "you report the measured gap, including zero, and distinguish the canonical case from the symbolic counterexample"
  - "\"no further improvement\" is never written as \"optimal\" in your report"
---

## This week's question

Keep swapping pairs; is the final plan optimal?

## Before the tutorial

Start from the earliest-deadline sequence of the six orders. Predict whether best-
improvement pairwise swaps will reach the global optimum, and what you would need to see
to be sure either way.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Implement a swap improver that prints every accepted move with the objective before and
after. Find where it stops, check the final neighbourhood item by item, then use the enumerator to measure the exact gap. On the canonical flight case the gap is zero. Use the lecture’s labelled symbolic example to demonstrate a local optimum that is not global. Tidy your A1 search and scheduling code.

## Afterwards

The swap improver, a single-drone comparison report, a local-optimum counterexample and
a full A1 draft. Use the labelled map and result tables to connect the calculation to the hill.
