---
title: "Who gets the charging pad?"
description: "Two charging pads as a shared resource: discrete events, capacity intervals, the queue recurrence and how a change reaches a third drone."
week: 8
date: 2027-04-12
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w08-charging-pads"
  - "lectures/w09-same-place"
  - "lectures/w11-routes-changed"
---

An order moved from A to B can delay C even when C's queue is unchanged. Their batteries share a resource, so the drones no longer have independent clocks.

## What you will learn

- Calculate a first-come, first-served charging queue.
- Trace a pad delay into the next delivery.
- Check resource capacity and distinguish waiting from hovering.

**Model:** begin with two drones and one pad, then ten orders and five drones using two pads. Full trips and charging are active; corridor reservations arrive later. Charging mechanics are provided by the framework.

## A resource is a timeline

**FCFS** means first come, first served. At the kitchen, a charge request follows landing and turnaround. Order requests by request time, breaking ties by drone ID. Choose the earliest available pad, charge without interruption and release it when full.

```text
request = landing + turnaround
chargeStart = max(request, chosenPadRelease)
chargeEnd = chargeStart + chargeDuration
chosenPadRelease = chargeEnd
```

In the live model, duration depends on energy to replenish at the fixed effective rate. A full battery's charging time is not a constant delay to add after every flight.

## Trace one queue

In a symbolic example, pad 1 holds A on [0,10), pad 2 holds B on [0,20), and C requests at 5 for six seconds. C starts at 10, ends at 16 and waits five seconds on the ground. If A's earlier task makes it occupy pad 1 until 13, C now starts at 13 and its next availability shifts by three seconds.

| Event | Before change | After A changes |
|---|---:|---:|
| C requests | 5 | 5 |
| Earliest pad release | 10 | 13 |
| C finishes charging | 16 | 19 |

The interval [s,e) includes s and excludes e. A pad can be handed over at the same tick it is released. At every tick, occupancy must remain within capacity. One drone cannot load, fly and charge at the same time.

## Recompute before judging a move

Do not reserve pads in the order a planning loop happens to visit drones. Process their actual requests. Every proposed migration needs a new event schedule from the same initial conditions. Saving old pad waits would score a different plan.

Ground queueing costs time in this model. Waiting in the air costs time and hover energy. Keep those states distinct in the ledger and your explanation.

## Read and try

Use this queue note and W7's migration example. Hand-calculate the one-pad case, then inspect the main ten-order queue and move one order. The framework provides charging; your task is to use the shared evaluator and test the dependency. Comparing W7 with W8 is a model comparison, not proof that an algorithm became worse. The same interval representation is used for the corridor in W9.
