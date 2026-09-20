---
title: "The shortest route may not bring the drone back"
description: "Payload, energy and the return leg; time–energy labels, dominance, and why the fastest arrival is not enough."
week: 4
date: 2027-03-15
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w04-back-with-battery"
  - "lectures/w05-many-orders"
---

The fastest route runs out of battery; can we declare the order undeliverable?

## What the lecture covers

Time and energy accumulate along the outbound leg, the service and the return leg.
Payload filters first; after service the return leg is unloaded. Three questions that
look alike are not: is the edge legal, is this candidate feasible, is there another
route within the budget. Time–energy labels at the same node and task phase show why
keeping only the fastest arrival is wrong. Slop Hill is a hill: uphill edges cost more
than downhill ones, so the fastest way to the top may not come back.

## What you must be able to derive

In a static, non-negative, additive model, label A dominates B only if A's time and
energy used are both no larger and at least one is smaller. The full-task budget is
E_used ≤ E_start − E_reserve on the whole trip, not the outbound leg alone.

## Where it goes next

Scheduling in week 5 uses the full-task costs this week returns; later, waiting must
consume time and energy too. The tutorial pairs the computed results with a labelled map; week 4 also includes the route elevation profile.
