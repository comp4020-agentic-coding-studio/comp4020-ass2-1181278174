---
title: "The swaps stop; 720 permutations do not"
description: "Implement a swap improver, find where it stops, and prove with the enumerator that a better sequence exists."
week: 6
date: 2027-03-31
teachers:
  - kofi-marchetti
spec:
  - "your improver's stopping condition matches what your report claims"
  - "you can show a sequence the enumerator finds that your swaps did not"
  - "\"no further improvement\" is never written as \"optimal\" in your report"
---

## This week's question

Keep swapping pairs; is the final plan optimal?

## Before the tutorial

Start from the earliest-deadline sequence of the six orders. Predict whether best-
improvement pairwise swaps will reach the global optimum, and what you would need to see
to be sure either way.

## In the tutorial

Two hours, the same shape every week: 15 minutes of prediction and hand computation, 25
minutes deriving or tracing a small example, 55 minutes implementing and comparing, 25
minutes of tests and explanation.

Implement a swap improver that prints every accepted move with the objective before and
after. Find where it stops, check the final neighbourhood item by item, then prove with
the enumerator that a better sequence exists. Tidy your A1 search and scheduling code.

## Afterwards

The swap improver, a single-drone comparison report, a local-optimum counterexample and
a full A1 draft. 3D is a side view this week.
