# Worked examples for the tutorials

Four micro-examples, one per turning point. Each isolates one algorithmic property and states
its simplifications, and each names the place on Slop Hill it stands for. The results were
checked independently, by hand and by enumeration; the site still has to reproduce them with
its own engine rather than display these numbers.

## 1. W3 — an admissible heuristic that still returns a worse path

**Place.** A four-edge symbolic graph that isolates implementation behaviour; it does not
correspond to a map location.

**Graph.** Four directed edges: S→A cost 3; S→B cost 1; B→A cost 1; A→G cost 2. One cost
unit. Heuristic h(S)=0, h(A)=0, h(B)=3, h(G)=0.

**Prediction.** Does h overestimate anywhere? If the implementation never reopens a node in
CLOSED, which path does A* return?

**Reference trace.**

| Step | Key state |
|---|---|
| Expand S | A: (g,f)=(3,3); B: (g,f)=(1,4). |
| Expand A | G discovered, g=5; A goes to CLOSED. |
| Expand B | A better prefix to A found, g=2. |
| Wrong implementation ignores it | Returns S→A→G, cost 5. |
| Correct handling reopens A | Returns S→B→A→G, cost 4. |

h never overestimates the true remaining cost, but on B→A it breaks consistency: 3 > 1+0.
Students must separate the heuristic's property from the implementation's behaviour; "with
an admissible heuristic re-expansion is unnecessary" is wrong as stated.

**Two-hour task.** Compute both paths and the OPEN order by hand; locate the CLOSED-handling
bug; fix the W2 framework; write the test; then change the graph so the same bug appears on a
different structure. The reference solution opens after the prediction is submitted.

**Acceptance.** A correct Dijkstra and the fixed A* return cost 4. Tests compare optimal cost
and path validity, not node order on general graphs. The student states h's unit, its
conditions and the reason for re-expansion.

## 2. W4 — the fastest prefix eats the return energy

**Place.** The two routes to #07 on the hilltop: S→A→Q is the ridge line (fast, expensive),
S→B→Q the contour route (slow, cheap). Numbers are teaching units; the formal data lives in
the scenario files.

**Graph.** Edges as (time, energy):

| Edge | Time | Energy |
|---|---:|---:|
| S→A | 2 | 3 |
| A→Q | 2 | 4 |
| S→B | 3 | 1 |
| B→Q | 3 | 2 |
| Q→G | 2 | 2 |

G is the end of the full task after return, not the customer. The abbreviated edges already
include the task actions this example needs. Both prefixes to Q are in the same task phase.
Usable energy after the reserve is 8.

The two labels at Q are (time 4, energy 7) and (time 6, energy 3). One is faster, the other
cheaper; neither dominates.

| Complete candidate | Total time | Total energy | Verdict |
|---|---:|---:|---|
| S→A→Q→G | 6 | 9 | Over budget. |
| S→B→Q→G | 8 | 5 | Feasible, and the fastest feasible route in this example. |

**Task.** Run the wrong version that keeps only the fastest label per node first; explain what
it lost; complete the budget and dominance functions; keep mutually non-dominated candidates
in the label engine; confirm by enumerating both paths.

**Acceptance.** "The fastest candidate is over budget" is never written as "the order has no
solution". The dominance rule is used only in the static, additive, history-free model; labels
and dominance in resource-constrained routing are a separate concept from single-distance
labels.

**Explanation question.** If we only compute one fastest and one cheapest route, is the fastest
feasible route within budget guaranteed to be found? Students explain the gap left by finite
candidates and do not present them as a full resource-constrained solver.

## 3. W5–W6 — define the objective first, then improve

### 3A. Two orders: different objectives prefer different orders

**Place.** N and F play a near and a far order (the roles of #03 and #07). The numbers are a
simplified teaching model, not the twenty-order data.

Minutes. One drone, no loading or charging time, plenty of energy, both orders ready at 0.
Departure-to-delivery and full round trip are given.

| Order | Depart→deliver | Full round trip | Promised time |
|---|---:|---:|---:|
| N | 1 | 2 | 10 |
| F | 4 | 8 | 5 |

| Sequence | N delivered | F delivered | Total lateness | Sum of delivery times | All returned |
|---|---:|---:|---:|---:|---:|
| N→F | 1 | 6 | 1 | 7 | 10 |
| F→N | 9 | 4 | 0 | 13 | 10 |

**Task.** Write the prediction before running; derive the recurrence by hand; then write the
evaluator. Explain why total lateness prefers the second sequence, sum of delivery times the
first, and all-returned time does not separate them.

**Acceptance.** The student declares the objective first and explains the result against it;
picking a favourable metric after the run is not accepted.

### 3B. Six orders: the swaps stopped, which is not the global optimum

**Place.** A–F play A1's #01–#06; letters are kept for hand computation, and the numbers are
teaching settings.

Same simplified time model. All orders are known in advance, but no departure before the
ready time. The given sequence is followed strictly; if the next order is not ready the drone
waits. Delivery time is departure plus d, return time is departure plus p.

| Order | Ready r | Depart→deliver d | Full round trip p | Promised δ |
|---|---:|---:|---:|---:|
| A | 5 | 3 | 6 | 9 |
| B | 6 | 1 | 2 | 13 |
| C | 3 | 6 | 12 | 12 |
| D | 4 | 6 | 12 | 28 |
| E | 1 | 5 | 10 | 25 |
| F | 6 | 4 | 8 | 22 |

Objective (total lateness, all-returned time) compared lexicographically: lower total
lateness first, then earlier all-returned time. Energy is the same for every sequence in this
example.

Start from the earliest-deadline sequence `A→C→B→F→E→D`, objective `(57, 55)`. At each step
enumerate all 15 two-position swaps and take the best strict improvement; ties are broken
deterministically by sequence.

Improvement stops at `A→B→C→F→E→D`, objective `(48, 55)`: all 15 swaps checked, none
strictly better. Enumerating all 720 permutations finds `E→B→A→F→C→D` at `(46, 51)`. The
optimum is tied: `E→B→A→F→D→C` is also `(46, 51)`, because energy is constant here and the
third term does not apply. The tutorial says "one of the optima" and tests compare the
objective value, not the sequence.

**Task.** Reproduce the improvement trace; check the final neighbourhood item by item; prove
with an independent enumerator that a better sequence exists; explain the difference between
"local optimum for this neighbourhood" and "global optimum". Finally build a variant of your
own rather than copying these six.

**Acceptance.** The code's stopping condition matches the report's claim. Stopping early on a
budget is reported as "best within budget", not as a local optimum; the local-optimum claim
needs the complete neighbourhood scan.

## 4. W9–W10 — remembering only the node deletes "waiting"

**Place.** P is the waiting point at the west end of the corridor, G the east exit; the
reservation [0,6) is a drone coming the other way.

The drone is at P, where waiting is allowed, at second 3. The only edge P→G takes 2 seconds
and is reserved for [0,6). No other obstacle or energy limit; P's waiting position is free.

An implementation that keys on `visited[P]` alone may reject (P,4), (P,5), (P,6) and report no
path. With time in the state the legal process is:

```text
(P,3) → (P,4) → (P,5) → (P,6) → (G,8)
```

**Task.** Justify each wait; change the deduplication key and neighbour generation; check
that the occupancy [6,8) does not overlap [0,6); then add the given hover energy and check
that the budget still holds after waiting.

**Acceptance.** Same place at a different time is a different state; but time in the state
does not solve energy by itself, and the real engine keeps task phase and resource labels
together. Entering at second 6 follows this example's occupancy rule only, not a real
separation standard.
