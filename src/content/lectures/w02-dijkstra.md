---
title: "Dijkstra: when to trust the current shortest path"
description: "Tentative distances, settled nodes and relaxation; why the goal being discovered is not the goal being found."
week: 2
date: 2027-03-01
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w02-dijkstra"
  - "lectures/w03-a-star"
  - "lectures/w10-searching-in-time"
---

Why does "the goal has been discovered" not mean "the lowest-cost route has been found"?

## What the lecture covers

Tentative distances, settled nodes and relaxation, derived step by step. Under non-
negative costs, popping the smallest tentative distance is correct, and the argument is
worth writing out. Stale queue entries, ties, unreachable nodes and parent-pointer
updates are where implementations differ.

## What you must be able to derive

The correctness argument built on "an undiscovered shorter path must first cross the
frontier". Separate discovered, enqueued, effectively popped and settled. The stop
condition is the goal being popped after correct processing, not the goal being
generated.

## Where it goes next

The same search loop takes a heuristic in week 3 and searches space-time states in week
10. Use the labelled map and result tables to connect the calculation to the hill.
