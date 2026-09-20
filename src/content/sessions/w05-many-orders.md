---
title: "Six orders by hand, then by recurrence"
description: "Compute the first orders by hand, implement the recurrence, and compare FIFO with earliest-deadline on the course's objective."
week: 5
date: 2027-03-24
teachers:
  - kofi-marchetti
spec:
  - "you can check the program's timetable by hand for the first three orders"
  - "you declare the objective before the run and explain the result against it"
  - "you can show a case where two objectives prefer different sequences"
---

## This week's question

Same total distance; why different lateness?

## Before the tutorial

Two orders, N (near) and F (far, promised early). Write your prediction: which sequence
has less total lateness, which has the smaller sum of delivery times, and does the all-
returned time separate them?

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Compute the first few of the six orders #01–#06 by hand, then implement the timetable
recurrence. Compare FIFO with earliest-deadline using the course's stated primary
objective (strategy slot 3). Build a small "change the metric and the preferred plan
changes" counterexample.

## Afterwards

A single-drone timetable function, a per-order ledger, two baseline results and an
objective definition. Use the labelled map and result tables to connect the calculation to the hill.
