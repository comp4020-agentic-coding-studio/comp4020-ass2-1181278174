---
title: "Before the battery is full: shared resources in the timetable"
description: "Two charging pads as a shared resource: discrete events, capacity intervals, the queue recurrence and how a change reaches a third drone."
week: 8
date: 2027-04-12
related:
  - "sessions/w08-charging-pads"
  - "lectures/w09-same-place"
  - "lectures/w11-routes-changed"
---

Move one order to another drone; why does a third drone's plan change too?

## What the lecture covers

The charging protocol is fixed: ground queue, first come first served, released when
full, no optimisation of the charge curve. Charging start = max(request time, release
time) gives the resource timetable, and a change in one drone's task order reaches the
others through the queue. Occupancy never exceeds capacity; one drone's loading, flight
and charging never overlap; with a fixed tie rule the whole event sequence is
reproducible.

## What you must be able to derive

Show that charging occupancy stays within capacity at every tick, and that every
candidate plan is recomputed together with every affected resource.

## Where it goes next

The same occupancy-interval representation is used for the corridor in week 9 and for
whole-system recomputation in week 11. 3D is a side view this week; pad occupancy is visible.
