# Slop Hill practice data

Download scenario.json and reference-output.json from the assignment page. The scenario
contains the unchanged canonical map, twenty orders, two drone types, fleet and rules.
Every coordinate is in metres; time is integer seconds after 18:00; energy is in joules.
Edges are directed. Both directions of the corridor share one resource with capacity one.
The pads resource has capacity two. Ground waiting and in-air hover are different actions.

For Assignment 1, use orders #01–#06 with a type L drone, the graph and the full-task
energy model. Compare FIFO, earliest deadline, swaps and every permutation. Order #07 is
the separate resource-label regression case. Do not copy the twenty-order reference result
as your single-drone output.

For Assignment 2, use all twenty orders and the fleet. The reference output shows the
per-drone assignment, task records, activities, deliveries and resource occupancies. Recompute
all times from inputs. The embedded resource check is not an independent check of arbitrary
trajectory geometry, payload or energy: your implementation must verify those too.

A language-neutral submission layout:

- src/: your planner and evaluator; document how to run them in a README.
- tests/: graph-search counterexamples, full-trip budget checks and resource cases.
- input/: the canonical scenario and any separately named experimental variant.
- output/: your assignment, structured task/event results, and experiment records.
- report: your own explanation, comparisons, assumptions and limitations.

On each tutorial or Lab page, expand “Try it yourself”. Write a prediction, save a baseline,
change the case, explain the result, and export the JSON record. A configuration link
reproduces settings; it does not contain private notes. Custom heuristic code runs in an
isolated runner with a one-second limit. Syntax errors, non-numeric results and timeouts
produce no successful search result.

The website has no submission service and does not accept arbitrary plan imports. The
new-order experiment in Assignment 2 belongs in your own program using the same graph and
rules. Include that input and its checked output in your submission package.
