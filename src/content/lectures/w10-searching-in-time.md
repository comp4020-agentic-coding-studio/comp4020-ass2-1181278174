---
title: "Searching in time: leaving the next drone a way through"
description: "A* over (place, phase, time) under committed reservations; prioritised planning and what it does and does not guarantee."
week: 10
date: 2027-04-26
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w10-searching-in-time"
  - "lectures/w11-routes-changed"
---

Does the choice of which drone to plan first change what the others can find?

## What the lecture covers

The A* loop from week 3 searches moves and waits under given reservations. A state holds
place, task phase and time; the resource record keeps energy used. The static remaining
time, ignoring occupancy, is the lower bound. Drones are planned one by one in priority
order and each commits a full-task reservation. "The best route given the other
reservations" is not "the joint optimum for all drones", and a failure under one
priority does not prove the system has no solution.

## What you must be able to derive

Legal space-time actions, budget pruning and the full goal state. The guarantee range of
prioritised planning, stated in one sentence you can defend.

## Where it goes next

The real cost of these routes replaces week 7's independent estimate in week 11. 3D is the main view this week: scrub the timeline and watch existing reservations make the next drone wait or detour.
