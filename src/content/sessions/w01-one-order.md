---
title: "Legal routes on the kitchen's block"
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

## This week's question

Why is "a line from the depot to the customer" not yet a problem definition?

## Before the tutorial

Read the one-order case #07 and write down, before anything is computed: which nodes a
route must visit, which events end a task, and one connection on the block that you
think is illegal and why.

## In the tutorial

Use the experiment steps above to record a prediction and a controlled comparison.
In the two-hour tutorial, work through the small example, implement the key change in
your own planner, and finish with tests and an explanation.

On the ten-node sub-graph of the kitchen's block (kitchen, depot merge point, six
intersections, houses #03 and #05), list the available candidate routes and compute their costs
by hand; then check them. Find an edge whose endpoints are legal but whose segment
passes through a building, and explain why that proposed edge must be excluded. Draw the task state diagram including
delivery and return.

## Afterwards

A one-page problem definition, a hand-computed route table, a task state diagram and one
geometric counterexample.
