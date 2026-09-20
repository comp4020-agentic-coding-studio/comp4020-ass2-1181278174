---
title: "One drone, many orders: write \"a good plan\" as a formula first"
description: "The timetable recurrence, and four objectives that are not the same objective."
week: 5
date: 2027-03-22
teachers:
  - ines-halvorsen-tan
related:
  - "sessions/w05-many-orders"
  - "lectures/w06-one-swap"
  - "lectures/w07-which-drone"
---

Same total distance; why different lateness?

## What the lecture covers

From full-task cost we derive loading, departure, delivery, return and next
availability. Total lateness, number of late orders, all-returned time and the sum of
delivery times are four different objectives, and a two-order case proves they disagree.
Lateness is measured at delivery, not at return.

## What you must be able to derive

start = max(ready time, drone available time), then loading, flight and service; next
availability from the actual return plus the fixed turnaround and charging. With tasks
and routes fixed, swapping the order does not change total flight distance.

## Where it goes next

The same evaluation function drives the ordering improvements of week 6 and the
assignment of week 7. Use the labelled map and result tables to connect the calculation to the hill.
