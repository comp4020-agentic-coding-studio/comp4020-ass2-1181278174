---
title: "Check a legal route"
description: "Hand-compute the available candidate routes on the ten-node block graph, find the edge that passes through a building, and draw the task state diagram."
week: 1
date: 2027-02-24
teachers:
  - kofi-marchetti
spec:
  - "you can say whether a given object changes the legal edge set, and which edge"
  - "you can name the leg a task description is missing"
  - "your candidate routes have the costs the workbench reports"
---

## This week's task

**Model:** The ten-node kitchen block; two computed alternatives to #03 and proposed connections near #03/#05. Costs are flight seconds, without battery constraints.

## Before you start · 15 minutes

Read W1 and sketch load → outward → service → return. Predict which proposed segment crosses a building.

## Trace the example · 25 minutes

Inspect a blocked connection. Name both endpoints and the highlighted building, then inspect the legal-route table.

## Implement and compare · 55 minutes

Add the edge times for each available route on paper. Use the published graph to check every directed edge. Reject the blocked proposal; the browser does not edit the canonical graph.

Use **Open full Lab** for editable inputs, strategy code, exports and the practice pack. The example on this page compares this week's published cases; your local student runner must call the functions you complete.

## Check and explain · 25 minutes

Write one route-cost table, the task-phase sketch and a geometric counterexample. Check a reverse direction separately.

**What to keep:** A1: problem definition and legal-edge reasoning. Show the tutor your prediction, experiment and explanation for this week’s participation point; keep the record to develop your assignment.

## Optional extension

Try a geometrically clear proposal that is still absent from the graph. Explain why “clear” does not add a legal edge.
