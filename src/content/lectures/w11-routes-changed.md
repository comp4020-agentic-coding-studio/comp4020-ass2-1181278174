---
title: "The routes changed, so the assignment must be reconsidered"
description: "Assignment, routes, resources and the objective as one evaluation; full re-evaluation of every candidate; what a decomposed method can claim."
week: 11
date: 2027-05-03
related:
  - "sessions/w11-routes-changed"
  - "lectures/w12-twenty-dinners"
---

The drone that looked fastest at assignment time: is it still fastest under real
reservations?

## What the lecture covers

Assignment, routes, resources and the objective join into one evaluation. Swap and
cross-drone migration are reused; every candidate regenerates the full plan from the
same initial state so that old reservations and old costs cannot leak in. A compute
budget is fixed; only complete, feasible candidates that improve the objective are
accepted. A decomposed method may depend on the initial solution, the priority and the
budget, and claims nothing about joint global optimality.

## What you must be able to derive

The input of local improvement is the full plan, and its evaluation includes real
reservations and charging. Say where the method's result depends on the order things
were done in.

## Where it goes next

All code goes into A2; no new mechanism after this week. 3D is a side view this week.
