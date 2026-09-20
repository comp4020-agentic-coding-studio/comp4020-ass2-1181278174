---
title: "Trace the pad queue"
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

## This week's task

**Model:** The main case has ten orders, five drones and two pads. A separate #01–#04 case has A/B and one pad. Corridor reservations are not active.

## Before you start · 15 minutes

Read W8. Work the symbolic request-at-5 example and explain when the earliest pad becomes free.

## Trace the example · 25 minutes

Compare one pad with two in the main case. This changes resource capacity: inspect the queue rather than presenting it as an algorithm-only improvement.

## Implement and compare · 55 minutes

Select the two-drone case in the controls and compute its queue by hand. Return to the main case, save a baseline and use myMigrations with the provided shared evaluator. Inspect the next task after a charge.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Record request, charge start, charge end and the next departure. Add a capacity test and name the event that causes a delay to another drone.

**What to keep:** A2: shared-resource evaluation and the first checked fleet plan. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Keep capacity fixed and move a different order. A migration may leave some times unchanged; report the actual outcome.
