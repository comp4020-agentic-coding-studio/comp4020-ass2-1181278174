---
title: "Two drones, one corridor"
description: "Defining a conflict, putting time into the state, half-open occupancy intervals, and why visited[node] deletes waiting."
week: 9
date: 2027-04-19
teachers:
  - ines-halvorsen-tan
slides: /decks/same-place/
related:
  - "sessions/w09-same-place"
  - "lectures/w10-searching-in-time"
---

Each drone can have a legal route while the pair cannot execute those routes together. We need to know when each route uses the same narrow corridor.

## What you will learn

- Test whole occupancy intervals for overlap.
- Explain why later arrival at the same point creates a different search state.
- Repair a conflict by legal waiting and account for its cost.

**Model:** the live example shows A heading to #13 and B returning through the corridor. Times are seconds after A's take-off. It isolates occupancy; W10 checks two complete tasks. A separate small example uses P at time 3.

## Work through the five-second conflict

B reserves [87,112); A requests [107,132). The corridor has capacity one for both directions combined.

```text
overlap = max(startA, startB) < min(endA, endB)
        = 107 < 112
```

The conflict lasts five seconds. If A waits at the west waiting point until 112, its interval becomes [112,137). The two intervals touch but do not overlap. These are declared teaching resource rules; the animation is a view of the interval calculation.

| Arrangement | A's corridor use | Meaning |
|---|---|---|
| Both depart as planned | [107,132) | Diagnostic conflict |
| B first; A waits | [112,137) | Legal resource handover; add hover cost |
| A detours | No use of this corridor | Check longer flight and energy |

## Why a spatial visited set fails

Use a smaller symbolic example: B holds [0,6), A reaches waiting point P at 3, and P→G takes two seconds. At (P,3), crossing is blocked. At (P,6), it is available. The place is the same but the future actions differ.

The useful sequence is (P,3)→(P,4)→(P,5)→(P,6)→(G,8). A visited key containing only P discards the later states. Include time in state identity. W10 will also retain task phase and energy information.

A **reservation** is a commitment to occupy a resource during an interval. Check every interval an action occupies, not isolated frames from the replay. Airborne waits are allowed only at designated points and consume energy.

## Read and try

Read the conflict definitions and modelling assumptions in [Stern et al., Multi-Agent Pathfinding](https://ojs.aaai.org/index.php/SOCS/article/view/18510). Compare their assumptions with this course's exclusive corridor. Open the slides linked above, then try waiting in the tutorial. Complete the interval query before attempting the full coordinated search next week.
