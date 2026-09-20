---
title: "A route that can return"
description: "Payload, energy and the return leg; time–energy labels, dominance, and why the fastest arrival is not enough."
week: 4
date: 2027-03-15
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w04-back-with-battery"
  - "lectures/w05-many-orders"
---

The hilltop dinner #07 is reachable by a fast ridge route. That does not tell us whether a light drone can deliver it and return with its required battery reserve.

## What you will learn

- Keep competing time–energy labels instead of only one arrival time.
- Check outbound, service and unloaded return as one task.
- Distinguish a failed candidate from a genuinely exhausted search domain.

**Model:** one order and one drone; fixed non-negative, additive time and energy costs. Payload, service and return reserve are active. There are no shared charging or corridor reservations yet.

## Two ways to reach the same point

A **label** records one way of reaching a point: time spent, energy used, task phase and a parent for reconstruction. Two labels can share a node without representing equally useful futures.

In the symbolic example, ridge reaches Q with (time 4, energy 7); contour reaches Q with (6,3). The return adds (2,2). Usable energy is 8 teaching units.

| Route | At Q | Complete trip | Within 8? |
|---|---|---|---|
| Ridge | (4,7) | (6,9) | No |
| Contour | (6,3) | (8,5) | Yes |

Ridge is faster; contour uses less energy. Neither **dominates** the other. A dominates B only when A is no worse in both quantities and strictly better in at least one. Compare labels at the same node and task phase under this static model. A scalar score such as time+energy can erase a route that is needed to meet the battery constraint.

```text
withinBudget(label) = label.energy <= startEnergy - reserve
A dominates B = A.time <= B.time and A.energy <= B.energy
                and at least one comparison is strict
```

## Apply the idea to #07

The live L drone starts with 95 kJ and must retain 15%, or 14.25 kJ. Its usable budget is therefore 80.75 kJ. The calibrated fast complete trip costs about 84.7 kJ; the feasible alternative costs 80.443 kJ and takes 472 seconds from take-off to landing. These are real-map totals, not the symbolic numbers above.

The ledger includes loaded outward flight, customer service and unloaded return. Arrival at the house is not the goal of the full task. The goal is returning to the kitchen after service with sufficient reserve.

If fastest-only pruning says no solution while the contour trip passes, the pruning rule lost a solution. It did not prove the order impossible. Later time-dependent reservations require a richer state; do not carry this static dominance rule into W10 without examining its assumptions.

## Read and try

Read only the resource labels and dominance concepts in [Boost's resource-constrained shortest-path documentation](https://www.boost.org/doc/libs/1_86_0/libs/graph/doc/r_c_shortest_paths.html); no Boost installation or C++ API work is required. In the tutorial, compare full labels with fastest-only pruning. Keep the full-task ledger: W5 uses its costs to schedule several orders.
