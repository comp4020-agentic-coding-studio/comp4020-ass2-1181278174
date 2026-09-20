---
title: "Assignment 1: single-drone routing and delivery plan"
description: "One drone, the six known orders #01–#06: correct search, the full round trip with energy, and a justified task order. Released week 3, due week 7."
week: 7
due: 2027-04-09T17:00:00+10:00
weight: 40
marking:
  mode: weighted
  criteria:
    - name: Search implementation, correctness conditions, counterexample
      weight: 35
    - name: Full task and resource handling
      weight: 20
    - name: Timetable, ordering and local improvement
      weight: 25
    - name: Fair experiments, tests, personal explanation
      weight: 20
spec:
  - "Dijkstra and A* share one search framework, and one counterexample with its test exposes a wrong implementation"
  - "the fastest candidate being over budget is reported as that, never as no feasible task"
  - "the six-order plan is checked against all 720 permutations and the report says which optimum it reached"
  - "no order is dropped and no parameter is changed to improve a result"
  - "the analysis is at most 1,200 English words, excluding code, references and tables"
related:
  - lectures/w03-a-star
  - sessions/w06-one-swap
  - assignment-2
---

Released Monday of week 3 (2027-03-08). Due Friday of week 7, 17:00 Australia/Sydney. It
covers weeks 1 to 6 only; nothing about several drones is examined here.

## The brief

> One drone, the six known orders #01–#06. Implement correct search, handle the full round
> trip and the energy budget, then produce a single-drone task order you can justify.

## What you do

1. Implement Dijkstra and A* in the same search framework. Justify the heuristic: its unit,
   its lower-bound argument, and whether it is consistent. Provide one counterexample that
   exposes a wrong implementation, with the test that fixes it.
2. Complete the budget and dominance checks in the resource-label skeleton. Distinguish "the
   fastest candidate is out of budget" from "no feasible task was found". Every order
   includes service and the unloaded return leg.
3. Implement the timetable recurrence. Compare FIFO, earliest-deadline and swap improvement
   on the course's objective. On the six-order instance, check your result against all 720
   permutations and say which optimum you reached.
4. With the task and parameters fixed, explain one improvement, one limitation and one
   failure. Do not change the model or drop an order to improve a number.

## What you submit

- Runnable code, configuration and tests, using the practice guide linked above.
- A structured six-order plan produced by your program, with run results and exported workbench comparison records.
- The search and scheduling comparison tables.
- A personal analysis of at most 1,200 English words. Code, references and tables do not
  count. It states assumptions, correctness conditions, counterexamples and experimental
  conclusions; it is not a development diary.

## How to justify the result

The four criteria below carry the weights shown. Constraints are checked before performance
is compared: a plan with a violation is not a valid plan, but an accurate diagnosis of why it
fails earns analysis marks. A correct argument and a reliable counterexample are marked in
their own right; performance is not the only evidence.

Peer discussion and external code are acknowledged in the analysis. AI assistance does not
replace your own explanation. Every claim about a result points at code, an input and a run
record.
