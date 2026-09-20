---
title: "Writing one order as a planning problem"
description: "Why a line from the kitchen to the customer is not yet a problem definition: graph, state, legal edges, goal and cost."
week: 1
date: 2027-02-22
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w01-one-order"
---

Why is "a line from the depot to the customer" not yet a problem definition?

## What the lecture covers

From one delivery task we extract the start, the customer service point, the return
point and the task phases. Allowed connections become a directed graph with 3D
coordinates; the shape of a path, a timed trajectory and a schedule are three different
things. Edge costs are non-negative, and optimality is only ever relative to the given
graph and cost. Whole edges are checked by the provided model; nobody writes a geometry
library.

## What you must be able to derive

Write G=(V,E), a path P, C(P)=Σc(e) and the legal edge set. Explain why the outbound and
return legs cannot simply be reversed without checking edge direction, and why delivery
complete and return to depot are different events.

## Where it goes next

The graph, the task identities and the units are shared by every later method. The tutorial pairs the computed results with a labelled map; week 4 also includes the route elevation profile.
