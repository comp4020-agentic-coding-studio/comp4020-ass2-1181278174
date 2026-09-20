---
title: "Compare swaps with all 720"
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

## This week's task

**Model:** Editable symbolic jobs A–F first. The canonical #01–#06 case is a separate experiment with real flight costs.

## Before you start · 15 minutes

Read W6. Predict what a full scan of 15 pair swaps proves and what it cannot prove.

## Trace the example · 25 minutes

Inspect the starting swap result (48,55), then check all 720 sequences. The exact result is (46,51); explain the two-unit lateness gap.

## Implement and compare · 55 minutes

Complete mySwaps using your timetable and the declared comparator. Log every accepted move and stop only after a full scan finds no strict improvement.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Check the final neighbourhood and retain the exact benchmark. Repeat on the canonical case and report its zero gap without claiming swaps always find an optimum.

**What to keep:** A1: local search, exact comparison and the complete draft. Show the tutor your prediction, experiment and explanation for this week’s participation point; keep the record to develop your assignment.

## Optional extension

Edit a ready time in the six-job table and repeat the entire comparison from a fresh initial state.
