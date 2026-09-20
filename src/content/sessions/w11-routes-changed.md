---
title: "Explain a feedback change"
description: "Compare independent-cost assignment, fixed assignment with coordination, and assignment with cost feedback; trace one order through the chain."
week: 11
date: 2027-05-05
teachers:
  - kofi-marchetti
spec:
  - "your record shows route cost reaching the assignment decision, not two tables side by side"
  - "all three methods were run on the same inputs, priority and budget"
  - "you can name one input the result depends on that a joint optimum would not"
---

## This week's task

**Model:** Twenty orders, five drones, two pads and the corridor. Compare from the same initial assignment with a stated candidate budget.

## Before you start · 15 minutes

Read W11. Pick an order and predict how changing its drone might affect charging and reservations.

## Trace the example · 25 minutes

Compare Independent routes, Add coordination only, and feedback. The first two may tie; do not invent a conflict. Feedback reports the best feasible result within its budget.

## Implement and compare · 55 minutes

Complete myImprove using myMigrations and the provided full-plan evaluator. Start each candidate with fresh resource state and retain only complete feasible improvements.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Inspect an accepted migration and its changed task times. Record the objective before/after, the search budget and a causal explanation. A budget stop is not a local-optimum proof.

**What to keep:** A2: integrated improvement and a same-input comparison. These tutorial records are ungraded preparation for the assignment.

## Optional extension

Repeat with a different candidate budget and report both quality and computation cost. Keep the stored reference labelled separately.
