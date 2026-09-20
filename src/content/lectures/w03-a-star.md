---
title: "A*: a useful estimate"
description: "f = g + h, lower bounds with units, admissible versus consistent, and what re-expansion is for."
week: 3
date: 2027-03-08
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w03-a-star"
  - "lectures/w04-back-with-battery"
  - "lectures/w10-searching-in-time"
---

Dijkstra expands the cheapest route so far. A* also estimates what remains. The estimate can reduce work, but the implementation still has to propagate better routes.

## What you will learn

- Explain g, h and f using compatible units.
- Distinguish admissibility from consistency.
- Trace why a closed node sometimes needs reopening.

**Model:** the same non-negative graph as W2. The four-edge counterexample uses symbolic cost units; the canonical-map comparison uses seconds. Energy is still outside this model.

## Add an estimate, not a different destination

`g(v)` is the cost spent reaching v. `h(v)` estimates the remaining cost. A* removes the smallest `f(v)=g(v)+h(v)`. Setting h=0 recovers Dijkstra.

An **admissible** estimate never exceeds the true cheapest remaining cost. On this map, horizontal straight-line distance divided by the maximum speed is a candidate time lower bound: a legal route cannot be shorter than that distance or fly faster than that bound. Climbing and detours can only add time. The estimate is in seconds, so it can be added to g in seconds.

A **consistent** estimate also obeys h(u)≤c(u,v)+h(v) on every edge. This local condition prevents the estimated total cost from decreasing along a route. Check h(goal)=0 as well.

## An admissible estimate can still expose a bug

Use S→A=3, S→B=1, B→A=1 and A→G=2. Set h(B)=3 and the other estimates to zero. The true B→G cost is 3, so the estimate is admissible. It is inconsistent on B→A because 3>1+0.

| Removed node | g | f | What changes |
|---|---:|---:|---|
| S | 0 | 0 | A enters at f=3; B enters at f=4 |
| A | 3 | 3 | G enters at cost 5 |
| B | 1 | 4 | A can now be reached at cost 2 |
| A, reopened | 2 | 2 | Improve G to cost 4 |
| G | 4 | 4 | Return S→B→A→G |

If CLOSED means “never process this node again”, the last improvement is lost and the result costs 5. Reopening means putting A back in OPEN when its g improves; its descendants then receive that improvement. Admissibility does not repair an implementation that refuses this update.

## Make a fair comparison

Compare h=0 and a justified heuristic on the same graph and goal. Record returned cost, effective expansions and the reopening rule. A fast wrong answer is not an improvement. One smaller expansion count does not prove A* wins on every graph.

## Read and try

Read the admissibility and consistency sections of [Berkeley CS188: Informed Search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html). Predict the cost with reopening disabled, then enable it in the tutorial and locate the changed parent. Add the case to `mySearch` tests. W4 asks a related question: can two routes to the same node both be worth keeping?
