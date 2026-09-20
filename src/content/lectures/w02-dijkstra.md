---
title: "Dijkstra: when to stop"
description: "Tentative distances, settled nodes and relaxation; why the goal being discovered is not the goal being found."
week: 2
date: 2027-03-01
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w02-dijkstra"
  - "lectures/w03-a-star"
  - "lectures/w10-searching-in-time"
---

Last week we defined legal routes. Now we need a method that can find the cheapest one without guessing which street looks promising.

## What you will learn

- Update tentative costs by relaxation.
- Explain why discovering the goal is too early to stop.
- Reconstruct a path and test boundary cases.

**Model:** a fixed directed graph with non-negative edge times. No battery or shared-resource constraint yet. A symbolic example comes first; the tutorial then offers kitchen → #03 on the canonical map.

## Tentative is not final

The **frontier**, also called OPEN, contains routes waiting to be considered. `best[v]` is the lowest cost found so far to node v. **Relaxing** an edge u→v means checking whether reaching v through u is cheaper than its current best route.

```text
candidate = best[u] + cost(u, v)
if candidate < best[v]:
    best[v] = candidate
    parent[v] = u
    put (v, candidate) into OPEN
```

A priority queue lets us remove the entry with the smallest cost. An old queue entry may remain after a better one is inserted; skip it if its cost exceeds `best[v]`.

## Why the first sight of G is misleading

Use S→G=10, S→A=1 and A→G=1. Costs are symbolic teaching units.

| Step | Entry removed | Change | OPEN after the step |
|---|---|---|---|
| Start | — | best[S]=0 | S:0 |
| 1 | S:0 | Discover G at 10 and A at 1 | A:1, G:10 |
| 2 | A:1 | Improve G from 10 to 2; parent[G]=A | G:2, G:10 |
| 3 | G:2 | Accept the goal | Stop |

Stopping at step 1 returns 10. Removing G's best entry returns 2. Following parents backwards gives G←A←S; reverse that list to report S→A→G.

## Why we can trust that removal

Suppose a cheaper route to the removed node still existed. It would have to cross from an already processed node to a frontier node. With non-negative edges, that frontier route would have a smaller cost and would have been removed first. This contradicts the queue choice. Negative edges break this argument.

Stop when the goal's non-stale entry is removed, not when the goal is first generated. An empty queue means no path in this graph. A search budget ending early means only that this run stopped searching.

## Read and try

Read the Dijkstra section of [Modern Robotics: Graph Search](https://modernrobotics.northwestern.edu/nu-gm-book-resource/10-2-4-graph-search/). In the tutorial, predict the table before enabling the wrong stop rule. Implement the same loop in `mySearch`; test source=goal, unreachable goal, an improved route and equal-cost alternatives. W3 keeps this loop and changes the queue priority.
