---
title: "Order six dinners"
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

## This week's task

**Model:** #01–#06, one L drone, full static trips and turnaround. No shared charging queue. Compare lateness, then final return, then energy.

## Before you start · 15 minutes

Read W5 and compute both N/F sequences from the lecture. Name the objective before comparing them.

## Trace the example · 25 minutes

Compare FIFO with earliest deadline. Both canonical runs have zero lateness; locate the difference in the final-return time.

## Implement and compare · 55 minutes

Complete myTimetable using the supplied trip-cost function. Calculate the first three rows by hand, including ready time, loading, delivery, return and next availability.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Test readiness, turnaround and lateness measured at delivery. Submit the per-order table and two objective tuples with one sentence explaining the tie on lateness.

**What to keep:** A1: timetable recurrence and baseline comparison. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Open the order board, move an order and predict the later departures before running. Leave swap search and enumeration for W6.
