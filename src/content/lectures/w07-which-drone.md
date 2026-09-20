---
title: "Choose a capable drone"
description: "One sequence per drone, a feasibility matrix, earliest-completion greedy assignment and cross-drone migration."
week: 7
date: 2027-04-05
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w07-which-drone"
  - "lectures/w08-charging-pads"
---

One sequence becomes one sequence per drone. The first decision is whether a drone can complete an order at all; only then can speed influence the assignment.

## What you will learn

- Build a drone–order feasibility matrix.
- Make and explain an earliest-completion assignment.
- Re-evaluate a migration between drone queues.

**Model:** ten orders (#01–#09 and #20), three drones A/B (L) and D (H), full trips, no shared charging or corridor reservations. W8 explicitly expands the fleet and adds the shared queue.

## Feasibility comes first

A type L drone carries at most 1.5 kg and type H at most 4 kg. Hotpot #20 weighs 3.5 kg. Its L cells are excluded before an efficiency comparison. Passing the payload test is only the first check: the full outward/service/return energy must also fit.

| Order | A · L | B · L | D · H |
|---|---|---|---|
| #20 · 3.5 kg | Payload fails | Payload fails | Check complete trip |
| A light dinner | Check complete trip | Check complete trip | Check complete trip |

A **feasibility matrix** records these yes/no results and reasons. A cost matrix records predicted delivery times for feasible pairs. Do not encode “impossible” as a very fast arrival.

## An assignment decision by hand

Suppose an order is ready at 300 s and loading takes 60 s. A becomes available at 500 and needs another 100 seconds through delivery; D is available at 300 but needs 150 seconds. A predicts max(300,500)+60+100=660. D predicts max(300,300)+60+150=510. The slower drone delivers earlier because it is free sooner.

These teaching numbers illustrate the rule. The live matrix recomputes the canonical tasks. Equal order counts ignore trip duration, readiness and capability; earliest predicted completion uses these costs but remains a greedy choice.

## Moving an order changes two queues

A **migration** removes one order from a drone's queue and inserts it in another. Rebuild both affected timetables before comparing the course objective. Later, shared resources can propagate the change beyond these two drones.

For a controlled type comparison, keep three drone IDs and change the type mix only. An all-L fleet cannot deliver #20; it is an intentional feasibility diagnostic. Adding drones while changing their types answers a different question.

## Read and try

This matrix and decision are the required course note; reuse W5's recurrence. In the tutorial, move #20 to L, explain the rejection, then restore it to H. Implement `myAssign` and a migration candidate. A1's route and task checks stay in use. W8 asks why these independent availability estimates change when drones share pads.
