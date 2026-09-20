---
title: "Neighbours, reservations, two priorities"
description: "Complete neighbour generation and reservation filtering, compare two priorities, and add a failed-reservation rollback test."
week: 10
date: 2027-04-28
teachers:
  - kofi-marchetti
spec:
  - "your search never reuses a reservation left behind by a failed attempt"
  - "you can explain the guarantee range of prioritised planning without the word optimal"
  - "added waiting changes energy, delivery and return time together in your results"
---

## This week's question

Does the choice of which drone to plan first change what the others can find?

## Before the tutorial

Two drones want the corridor in opposite directions at nearly the same time. Predict
what changes if drone B is planned before drone A: who waits, for how long, and whether
either can still meet its promised time.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

In the provided skeleton complete neighbour generation and reservation filtering.
Compare two priorities (strategy slot 5); check that added waiting changes energy,
delivery and return together. Add one failed-reservation rollback test.

## Afterwards

The key cooperative-search functions, results under two priorities, and notes on budget
and failure classes. The tutorial pairs the computed results with a labelled map; week 4 also includes the route elevation profile.
