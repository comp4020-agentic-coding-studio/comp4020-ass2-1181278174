---
title: "Audit the twenty dinners"
description: "From spatial nodes to resource labels to space-time states; proven properties, tested results and untested generalisations."
week: 12
date: 2027-05-10
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w12-twenty-dinners"
---

The final task is to make a result understandable and reproducible. A green check is useful, but another person should be able to explain how a dinner reached its customer and the drone got home.

## What you will learn

- Audit a complete run from inputs to event records.
- Trace a late or unexpected delivery to a cause.
- State the difference between a proof, an observation and an untested claim.

**Model:** the complete published evening, all twenty orders and shared resources. The initial view recomputes a stored reference assignment. No new planning mechanism is introduced this week.

## Read three separate results

First ask whether the plan is **valid**: every required order occurs once, each task returns, energy and payload fit, and resource constraints hold. Then ask about **quality**: how many dinners are on time and what is the objective? Finally ask about the **search**: was this a stored assignment, a completed neighbourhood scan or a budget stop?

The reference achieves 20/20 on time under the published model. The default greedy plan gives a useful comparison with late orders. Neither result alone proves joint global optimality or performance on a different evening.

## Trace one order backwards

Select an order and write its delivery equation: take-off + travel + service, including any recorded airborne wait. Compare delivery with the promised time. Then explain take-off from readiness, loading and the drone's previous availability.

| Evidence | Question it answers |
|---|---|
| Ready and promised times | When could the task start, and when was the dinner due? |
| Previous task's landing | Was the drone still away? |
| Turnaround and charging intervals | Was the drone ready to load again? |
| Corridor reservations | Which commitment blocked a proposed move? |
| Service and return ledger | Was the entire task accounted for? |

“Delivered late” is a symptom. “The previous task requested a pad after A, and that charging wait shifted the next loading time” is a causal explanation if the event record supports it. Do not assign blame to a resource simply because it exists on the map.

## Reproduce before generalising

Export inputs, strategy versions, budgets, results, checks and your explanation. Import the record into a fresh workspace and recompute it; imported totals are not trusted. Ask a peer to find the same delivery time and blocking event without your spoken help.

A proof uses stated assumptions and an argument, such as W2's non-negative-cost invariant. An observation is a measured result on a specified run. “This method will always meet every future promise” is untested. A deliberately designed additional order belongs in a separate scenario file and does not replace the fixed twenty-order result.

## Read and finish

Review your W6 exact comparison and W11 stopping reason. This audit note is the required reading. In the tutorial, compare greedy and reference plans, inspect #07, #13 or #20, and reproduce one conclusion. Finish A2's code, checked records and personal explanation; there is no new implementation task this week.
