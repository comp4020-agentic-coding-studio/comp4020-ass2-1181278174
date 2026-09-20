---
title: "The conflict in the corridor"
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

## This week's question

Why can single-drone routes on the same map still not be flown together?

## Before the tutorial

A drone reaches P, the corridor's west waiting point, at second 3; P→G takes 2 seconds
and is reserved for [0,6). Before running: is (P,4) the same state as (P,3)? When can
the drone enter, and where does it wait?

## In the tutorial

Two hours, the same shape every week: 15 minutes of prediction and hand computation, 25
minutes deriving or tracing a small example, 55 minutes implementing and comparing, 25
minutes of tests and explanation.

Mark the conflict between two independent trajectories in the corridor (#13 and a drone
coming the other way). Complete the reservation query. Step through (P,3)→(P,4)→… at the
waiting point and show the spatial-visited bug. Fix by hand with waiting or a detour
first; do not reach for the full multi-drone algorithm yet.

## Afterwards

A conflict validation function, a reservation table, a state definition and a
deduplication counterexample. 3D is the main view this week: the conflict shown as a volume of air in the corridor.
