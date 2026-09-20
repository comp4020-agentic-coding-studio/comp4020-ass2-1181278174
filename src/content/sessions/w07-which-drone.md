---
title: "Assign the hotpot"
description: "Assign #01–#09 and #20 across three drones, then two types; build an equal-counts, unequal-time counterexample."
week: 7
date: 2027-04-07
teachers:
  - kofi-marchetti
spec:
  - "infeasible drone–order pairs are excluded before any efficiency comparison"
  - "you can explain why one migration changes another drone's finish time"
  - "your matrix shows #20 as feasible for H and infeasible for L"
---

## This week's task

**Model:** #01–#09 and #20; A/B are L and D is H. Three drones, full trips, no shared charging or corridor reservations.

## Before you start · 15 minutes

Read W7. Explain why #20 cannot go to A even if A is idle, then predict whether equal task counts balance completion time.

## Trace the example · 25 minutes

Give the hotpot to a light drone and inspect the payload rejection. Restore the starting example before comparing efficiency.

## Implement and compare · 55 minutes

Complete myAssign: filter infeasible pairs, compare predicted completion and keep every order exactly once. Open the assignment board to try one migration and recompute both queues.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Keep the fleet fixed when comparing equal counts and predicted completion. Record one feasibility row and one justified assignment decision.

**What to keep:** A2: feasibility matrix, initial assignment and a migration. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Change the same three drones to all H and compare. An all-L fleet is an intentionally infeasible case; changing fleet size is a separate comparison.
