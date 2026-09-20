---
title: "Let delays change the assignment"
description: "Assignment, routes, resources and the objective as one evaluation; full re-evaluation of every candidate; what a decomposed method can claim."
week: 11
date: 2027-05-03
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w11-routes-changed"
  - "lectures/w12-twenty-dinners"
---

A drone that looked best using independent trip costs may spend time waiting once every plan is combined. We can feed those actual costs back into the assignment decision.

## What you will learn

- Compare independent, coordinated and feedback methods fairly.
- Re-evaluate a candidate from a clean initial state.
- Explain an accepted move and a budget-limited result.

**Model:** all twenty orders, five drones, two pads and the shared corridor. The three methods use the same initial assignment and evaluation rules. An independent plan is still checked for joint conflicts.

## Three questions, one input

| Method | What changes? | What to inspect |
|---|---|---|
| Independent routes | Routing ignores corridor commitments | Does the final joint checker find a conflict? |
| Fixed assignment with coordination | Route planning respects reservations | Did waits, energy or delivery times change? |
| Bounded feedback | Swaps and migrations may change the assignment/order | Is the complete recomputed objective better? |

The first two can tie. On the default input they both deliver 13/20 on time without a corridor violation. Report that observation. It does not establish that independent planning always avoids conflicts; W9 already supplies a counterexample.

## Evaluate the proposed plan, not yesterday's costs

Start from one assignment. A candidate swaps positions or migrates an order. Rebuild its tasks, charging queue and reservations from the same initial state, then apply the independent checker. Compare only complete feasible candidates on total lateness, final return and energy in that order.

```text
best = checked initial plan
for candidates within the stated budget:
    proposed = evaluate from a fresh world and reservation table
    if complete and valid and objective improves:
        retain the best candidate for this scan
accept the best strict improvement, then repeat if budget remains
```

Old reservations cannot leak into the next proposal. A migration changes at least two drone queues and may change a third through charging. Trace that dependency instead of merely presenting two totals.

## Read the stopping reason

With the default 120-candidate budget, the current feedback run improves the on-time count from 13 to 17 and stops at its budget. That is a valid plan with three late orders, not a proof of local optimality. The stored reference assignment reaches 20/20 after recomputation; it is a separate reference, not the claimed output of this bounded run.

An **ablation** removes one mechanism to see what changes: here, holding assignment fixed removes feedback. Keep all other inputs fixed. A better observed result is evidence on this instance, not a global optimum for all assignments and priorities.

## Read and try

Use this evaluation note with W7's migration, W8's queue and W10's reservations. Save the initial plan, run each method and inspect one accepted change. Complete `myImprove` using the provided full evaluator. W12 checks whether another reader can reproduce your causal explanation.
