---
title: "Two pads, five drones, one queue"
description: "Schedule a two-drone, one-pad case by hand, run the five-drone, two-pad case, and locate where shared charging changes the answer."
week: 8
date: 2027-04-14
teachers:
  - kofi-marchetti
spec:
  - "you can trace a delay from one drone's charging to another drone's departure"
  - "queueing appears in your evaluation as a resource, not as a constant per drone"
  - "your capacity test fails when a third drone is charged at once"
---

## This week's question

Move one order to another drone; why does a third drone's plan change too?

## Before the tutorial

Two drones, one pad. Both land within a minute of each other. Predict who charges first,
when the second one can load, and what changes if the second drone had landed first.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

Schedule a two-drone, one-pad example by hand, then run the five-drone, two-pad case.
Apply the same migration move with shared charging switched off and on, and locate the
source of the difference.

## Afterwards

A hand-computed charging timetable, capacity tests, a cross-drone dependence note and
the first full A2 plan. Use the labelled map and result tables to connect the calculation to the hill.
