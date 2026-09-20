---
title: "Three routes on the kitchen's block"
description: "Hand-compute three candidate routes on the eight-node block graph, find the edge that passes through a building, and draw the task state diagram."
week: 1
date: 2027-02-24
teachers:
  - kofi-marchetti
spec:
  - "you can say whether a given object changes the legal edge set, and which edge"
  - "you can name the leg a task description is missing"
  - "your three routes have the costs the workbench reports"
---

## This week's question

Why is "a line from the depot to the customer" not yet a problem definition?

## Before the tutorial

Read the one-order case #07 and write down, before anything is computed: which nodes a
route must visit, which events end a task, and one connection on the block that you
think is illegal and why.

## In the tutorial

Two hours, the same shape every week: 15 minutes of prediction and hand computation, 25
minutes deriving or tracing a small example, 55 minutes implementing and comparing, 25
minutes of tests and explanation.

On the eight-node sub-graph of the kitchen's block (kitchen, depot merge point, four
intersections, houses #03 and #05), list three candidate routes and compute their costs
by hand; then check them. Find an edge whose endpoints are legal but whose segment
passes through a building, and fix the graph. Draw the task state diagram including
delivery and return.

## Afterwards

A one-page problem definition, a hand-computed route table, a task state diagram and one
geometric counterexample. 3D is the main view this week: which connections the buildings block.
