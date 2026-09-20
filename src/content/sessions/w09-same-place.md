---
title: "Clear the corridor"
description: "Mark the conflict between two independent trajectories, complete the reservation query, and show the spatial-visited bug at the waiting point."
week: 9
date: 2027-04-21
teachers:
  - kofi-marchetti
spec:
  - "you can give concrete evidence of \"same place, different future choices\""
  - "your overlap test uses half-open intervals and catches the [0,6) against [5,7) case"
  - "you can say which waits are legal and what each one costs"
---

## This week's task

**Model:** A heading to #13 and B returning; corridor capacity one. The live intervals use seconds after A takes off; the P@3 exercise is separate.

## Before you start · 15 minutes

Read W9 or its deck. Calculate the overlap of [87,112) and [107,132) before running.

## Trace the example · 25 minutes

Let A wait for B and check that A enters at 112. Compare arrival and hover energy; then try the detour using the arrangement selector.

## Implement and compare · 55 minutes

Complete the half-open interval query in myNeighbours. Switch to the symbolic waiting case and trace P@3→P@4→P@5→P@6→G@8. Show what a place-only visited key would discard.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Test [0,6) against [5,7) and against [6,8). Explain the waiting point, interval boundary and energy model.

**What to keep:** A2: conflict definition and reservation filtering. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Propose another reservation window and predict how long A waits before using it in the local exercise.
