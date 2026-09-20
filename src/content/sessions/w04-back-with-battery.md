---
title: "Keep the route home"
description: "Ridge or contour: complete the budget and dominance checks, show what single-label pruning loses, confirm by enumeration."
week: 4
date: 2027-03-17
teachers:
  - kofi-marchetti
spec:
  - "you can tell \"this candidate failed\" from \"no feasible route exists in the stated search range\""
  - "your dominance rule keeps both labels at Q, and the fastest-only version reports no solution"
  - "you can state the assumptions under which the dominance rule holds"
---

## This week's task

**Model:** #07 on the canonical map, one L drone, loaded outward/service/unloaded return and a 15% reserve. The small label example uses separate teaching units.

## Before you start · 15 minutes

Read W4. Calculate 95−14.25=80.75 kJ usable energy. Predict whether the faster candidate can finish the complete trip.

## Trace the example · 25 minutes

Try keeping only the fastest label. Restore the starting example and explain why the slower label must survive. Inspect both complete candidates and the elevation profile.

## Implement and compare · 55 minutes

Complete dominates and withinBudget in strategies.mjs. Use the preset code as a contract, then test incomparable labels and the exact reserve boundary. Trace one retained prefix through service and return.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Export a baseline and changed record. Give full-trip seconds, energy and reserve; identify the lost feasible route. Do not call the order impossible because one rule pruned it.

**What to keep:** A1: resource labels, full-task checks and a failure explanation. Show the tutor your prediction, experiment and explanation for this week’s participation point; keep the record to develop your assignment.

## Optional extension

Switch to H and repeat. Compare algorithms within a fixed drone type; comparing L with H changes the model.
