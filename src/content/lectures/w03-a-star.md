---
title: "A*: what the heuristic speeds up, and why it is still correct"
description: "f = g + h, lower bounds with units, admissible versus consistent, and what re-expansion is for."
week: 3
date: 2027-03-08
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w03-a-star"
  - "lectures/w04-back-with-battery"
  - "lectures/w10-searching-in-time"
---

The heuristic never overestimates; why can an implementation still return a worse route?

## What the lecture covers

From Dijkstra's accumulated cost to f = g + h. A heuristic is a lower bound on remaining
time, and it has units. Admissible is not the same as consistent; an admissible but
inconsistent heuristic, with a closed list that never reopens, returns the wrong answer,
and the lecture works through exactly that case.

## What you must be able to derive

Check h(goal)=0, h(v) ≤ true remaining cost, and h(u) ≤ c(u,v)+h(v). Use straight-line
distance divided by the speed upper bound as a candidate lower bound on time and check
each model condition it depends on. Never add metres to seconds.

## Where it goes next

The heuristic and the state-deduplication judgement come back in resource labels (week
4) and space-time search (week 10). Use the labelled map and result tables to connect the calculation to the hill.
