---
title: "Same place, not the same search state"
description: "Defining a conflict, putting time into the state, half-open occupancy intervals, and why visited[node] deletes waiting."
week: 9
date: 2027-04-19
teachers:
  - ines-halvorsen-tan
slides: /decks/same-place/
related:
  - "sessions/w09-same-place"
  - "lectures/w10-searching-in-time"
---

Why can single-drone routes on the same map still not be flown together?

## What the lecture covers

A conflict is defined from the smallest two-drone case, then time goes into the state. A
spatial path and a timed trajectory are different objects; keying visited on the node
alone deletes the waiting states. Drone types occupy the corridor for different lengths
of time, so the whole interval is checked, never an animation sample. This week's deck
follows the same two-drone case the home page uses.

## What you must be able to derive

Half-open intervals [s, e) on one exclusive resource; overlap is max(s1,s2) <
min(e1,e2). Node-transition occupancy and safety buffers are course rules; a half-open
interval is not a real-world separation standard.

## Where it goes next

The state, queue and resource judgements of weeks 2 to 4 are unified into one search in
week 10. The tutorial pairs the computed results with a labelled map; week 4 also includes the route elevation profile.
