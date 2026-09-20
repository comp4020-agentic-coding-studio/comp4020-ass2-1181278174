---
title: "One order, a complete task"
description: "Why a line from the kitchen to the customer is not yet a problem definition: graph, state, legal edges, goal and cost."
week: 1
date: 2027-02-22
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w01-one-order"
---

A straight line to a customer is only a suggestion. Our first job is to say which connections the drone may use and what counts as finishing a delivery.

## What you will learn

- Read a directed graph and calculate a route's cost.
- Reject an illegal connection even when both endpoints are clear.
- Separate arriving at a house from completing a return trip.

**Model:** the kitchen block, one light drone, non-negative flight-time costs. Battery and service costs enter in W4. The graph is fixed; this week inspects proposed connections without editing the canonical map.

## From the street to a graph

A **node** is an allowed waypoint. A directed **edge** is an allowed move from one waypoint to another. If A→B exists, B→A does not automatically exist. The edge's shape may bend around a building; its endpoints alone do not describe the flight.

Write the graph as G=(V,E): V is the set of nodes and E the set of allowed directed edges. A path P is a sequence of connected edges. Its time is C(P)=Σc(e), the sum of their flight times. The shortest path is shortest within this graph and cost model.

## Work through a route

In this symbolic block example, K→J takes 4 seconds and J→H takes 7. The two-edge route costs 4+7=11 seconds. A proposed K→H segment would take 8 seconds, but it crosses a building. It cannot compete with the 11-second route because it is not a legal edge.

| Candidate | Cost | Can it be used? |
|---|---:|---|
| K→J→H | 11 s | Yes, if both directed edges exist |
| K→H through a building | 8 s | No: reject before comparing costs |
| H→J→K | Not yet known | Check the reverse edges separately |

The live block has ten nodes and two computed legal alternatives. Their actual edge costs come from the published map. Use those values for the tutorial; the small calculation above only explains the rule.

## What ends a task?

The complete task is load → fly out → service the customer → fly back → land. A **route** gives places; a **trajectory** also gives times; a **schedule** says which drone performs which task and when. Delivering the dinner ends the loaded phase, but the drone still needs to get home.

**Check yourself:** if the outward path is legal, what evidence is still missing for a complete task? Check the reverse direction, the service action and the return. W4 will add the energy evidence.

## Read and try

Read the graph representation and path-search introduction in [Modern Robotics: Graph Search](https://modernrobotics.northwestern.edu/nu-gm-book-resource/10-2-4-graph-search/). You do not need its robotics control material.

In this week's tutorial, inspect one rejected connection and add the costs of the available legal routes. Keep your task-phase diagram: next week the search algorithm will use your definition of a legal route.
