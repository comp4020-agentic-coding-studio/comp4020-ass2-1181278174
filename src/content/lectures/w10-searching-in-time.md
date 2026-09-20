---
title: "Search around a reservation"
description: "A* over (place, phase, time) under committed reservations; prioritised planning and what it does and does not guarantee."
week: 10
date: 2027-04-26
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w10-searching-in-time"
  - "lectures/w11-routes-changed"
---

W9 repaired one conflict by hand. Now the W3 search loop must propose legal moves and waits while respecting another drone's committed plan.

## What you will learn

- Generate space-time successors with energy and task phase.
- Compare two planning priorities under the same conditions.
- Roll back a failed proposal without leaving reservations behind.

**Model:** two complete tasks on the canonical map. Both loads begin at the later order's ready time. Full return, energy reserve and corridor intervals are checked; priority is the experimental variable.

## What the state must remember

A state has place, phase and tick; labels also record energy used. “At the customer before service” and “at the customer after service” have different payloads and goals. Two arrivals at one place can have different available moves because a reservation ends between them.

```text
for each outgoing edge or permitted wait:
    determine end time, resource interval and energy
    reject an overlapping reservation
    reject an exceeded energy budget
    add the successor with its phase and parent
```

A wait at a kitchen ground point and a hover at a corridor entrance have different costs. The small practice exercise starts with a zero-energy symbolic wait so you can test state identity. It is not the full flight energy model.

## A lower bound and a complete goal

The cheapest static remaining time, ignoring occupied resources, can guide the search: reservations add restrictions rather than making a route faster. The goal is service completed and return to the kitchen within reserve, not merely reaching the customer.

At P@3 with the corridor occupied until 6, the legal wait successors are P@4, P@5 and P@6. Only then does a two-second crossing reach G@8. In the full task, those waits must also leave enough energy for service and return.

## Priority is a choice, not an optimality proof

Plan A, commit its complete reservations, then plan B against them. Reverse the priority and B's commitments may change A's waits or route. Both runs must use the same orders, departure constraints, energy rules and search budget.

A successful plan passes the checker against the commitments it used. Failure under one priority or one finite search horizon does not prove that no joint plan exists. On failure, remove the proposal's temporary reservations before trying another candidate; test that the reservation table is identical before and after the failed attempt.

## Read and try

Read the reservation-table and Cooperative A* idea in [Silver, Cooperative Pathfinding](https://ojs.aaai.org/index.php/AIIDE/article/view/18726); the full paper is optional. Reuse W3's queue reasoning and W4's task budget. Implement `myNeighbours`, compare priorities and attach a rollback test. W11 will use the resulting costs to reconsider the assignment itself.
