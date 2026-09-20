---
title: "When swaps stop helping"
description: "Plans as permutations, a swap neighbourhood, strict improvement, and what a local optimum does and does not mean."
week: 6
date: 2027-03-29
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w06-one-swap"
  - "lectures/w07-which-drone"
  - "lectures/w11-routes-changed"
---

A timetable evaluator lets us test a change. It does not tell us which change to try, or whether the best change nearby is the best schedule overall.

## What you will learn

- Define a swap neighbourhood and a strict acceptance rule.
- Explain the difference between a local optimum and an exact finite result.
- Measure an observed gap without generalising beyond the tested case.

**Model:** first the editable six-job symbolic table, then the canonical six-order flight case. Keep their units and results separate. Use the same objective within each comparison.

## Define the search before running it

Represent a schedule by a permutation: each order appears exactly once. A pair swap exchanges positions i and j. With six positions there are 6×5/2=15 neighbours.

```text
current = starting sequence
repeat:
    evaluate all pair swaps from the same initial state
    best = the feasible neighbour with the best objective
    if best does not strictly improve current: stop
    current = best
```

The **neighbourhood** is this defined set of candidate changes. Strict improvement cannot revisit a previous objective on a finite set of permutations, so the search terminates. Stopping after a complete scan proves local optimality for pair swaps. Stopping because a budget expires does not even establish that local claim.

## Work through the counterexample

The lecture checkpoint below gives the full six-job input table. Starting with earliest deadlines gives A→C→B→F→E→D, with (lateness, final return)=(57,55). An accepted swap produces A→B→C→F→E→D and (48,55). Every further pair swap is no better.

Enumeration tries all 6!=720 sequences. One optimum is E→B→A→F→C→D, with (46,51). Its lateness is two teaching units lower. This does not contradict the local stopping rule: a better sequence can exist outside the current pair-swap neighbourhood.

The canonical flight case behaves differently: swaps reach an exact optimum and the measured gap is zero. That supports a claim about those six orders, not a theorem that swaps always succeed.

## What to report

State the input, initial sequence, neighbourhood, objective, accepted moves and stopping reason. Compare only complete feasible plans. An omitted dinner cannot improve a valid result. If multiple sequences tie, report “one optimum”, not a uniquely best sequence.

## Read and try

Use this course note and W5's evaluator. First inspect the swap result; then request all 720 permutations and compare the two results. Implement `mySwaps` using `myTimetable`. Your A1 report should include the canonical comparison and the separate symbolic counterexample. W7 keeps the same evaluation habit but moves an order between drones.
