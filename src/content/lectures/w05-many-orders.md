---
title: "Which dinner goes first?"
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

W4 can cost a complete trip. With six orders, we must decide what “better” means before choosing their sequence. A shorter route and an earlier dinner are different objectives.

## What you will learn

- Calculate a single-drone timetable from ready times and full-task costs.
- Measure lateness at delivery, not at return.
- Compare objectives without changing the question after seeing the result.

**Model:** #01–#06, one light drone, static full trips and a fixed turnaround. Shared charging queues are introduced in W8. One order is carried per trip.

## The recurrence

For order i, let r be its ready time, a the drone's availability, L loading time, d the time from take-off through delivery, p the time from take-off to landing, and T turnaround.

```text
loadStart = max(r, a)
depart = loadStart + L
deliver = depart + d
land = depart + p
nextAvailable = land + T
late = max(0, deliver - promised)
```

For a hand calculation, suppose r=100 s, a=120 s, L=60 s, d=90 s, p=150 s and T=60 s. Loading starts at 120, take-off is 180, delivery is 270, landing is 330 and next availability is 390. If promised at 250, lateness is 20 seconds. These are teaching values, not a canonical order's record.

## Two objectives can disagree

A smaller example removes loading and turnaround. Both orders are ready at zero. N delivers after 1 minute, returns after 2 and is promised at 10. F delivers after 4, returns after 8 and is promised at 5.

| Sequence | Delivery times | Total lateness | Sum of delivery times | Final return |
|---|---|---:|---:|---:|
| N then F | N=1, F=6 | 1 | 7 | 10 |
| F then N | F=4, N=9 | 0 | 13 | 10 |

F first wins on lateness; N first wins on delivery-time sum. Neither changes total trip distance. The course compares complete feasible plans **lexicographically**: compare total lateness first; use all-returned time only if lateness ties; use energy only if both tie. This is not a weighted sum.

## Baselines worth keeping

FIFO means ready-time order. EDF means earliest promised time first. Neither guarantees the best schedule. On the canonical six-order case, both have zero lateness; their final-return times differ. A tie on the first objective is a result to explain, not an excuse to alter the data.

## Read and try

This recurrence and the N/F table are this week's required course note. Revisit W4's full-task ledger if d and p are unclear. In the tutorial, calculate the first rows yourself, then compare FIFO and EDF. Implement `myTimetable`; next week we will reuse it to score a swapped sequence.
