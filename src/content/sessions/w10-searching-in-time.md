---
title: "Change the planning priority"
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

## This week's task

**Model:** Two complete tasks with synchronised loading, fixed ready times, energy reserve and whole corridor intervals.

## Before you start · 15 minutes

Read W10. Predict who waits under A-first and B-first; do not assume either priority is better.

## Trace the example · 25 minutes

Plan B before A. Inspect both tasks and their resource intervals, then compare ground waiting with airborne waiting.

## Implement and compare · 55 minutes

Complete myNeighbours and use it in the supplied state-search driver. Test legal move/wait successors and blocked crossings. Use the full reference evaluator to check the fleet comparison separately.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Add a failed-reservation rollback test. Record priority, budget, delivery, return and energy. Explain why one priority failing does not establish joint impossibility.

**What to keep:** A2: space-time search, priorities and rollback evidence. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Change a requested departure while holding the priority fixed. Label the changed initial condition.
