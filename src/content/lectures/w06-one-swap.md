---
title: "Improving the order: why one swap is worth accepting"
description: "Plans as permutations, a swap neighbourhood, strict improvement, and what a local optimum does and does not mean."
week: 6
date: 2027-03-29
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w06-one-swap"
  - "lectures/w07-which-drone"
  - "lectures/w11-routes-changed"
---

Keep swapping pairs; is the final plan optimal?

## What the lecture covers

A single-drone plan is a permutation. Fix the swap neighbourhood and the acceptance
rule; evaluate every candidate from the same initial state. Strict improvement
terminates on a finite set; a local optimum depends on the neighbourhood. Six orders
have 720 permutations, so the exact optimum is available for comparison. It may be tied:
report one of the optima.

## What you must be able to derive

Enumerate all 6! = 720 permutations and compare with FIFO, earliest-deadline and swap
improvement. Compare objectives only between complete feasible plans under the same
model; never lower lateness by dropping an order.

## Where it goes next

The swap move stays; week 7 adds cross-drone migration and week 11 re-evaluates with
real trajectories. 3D is a side view this week.
