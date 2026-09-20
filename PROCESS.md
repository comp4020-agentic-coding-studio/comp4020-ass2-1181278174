# Process overview

This record describes the repository and the owner's directions. The implementation and
verification in the September 2026 revision were assisted by Codex; it does not present
agent actions as independent student work.

The site is for SLOP3969, a fictional third-year course called Twenty Dinners, One Hill.
One kitchen, twenty orders and a fixed hill connect twelve weeks of graph search,
resource labels, scheduling and shared-airspace planning. The course uses the existing
university template and preserves its branding, content collections and build hooks.
The original hilltop track and spiral are recorded in
[`63f9938`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/63f9938).
That shared geometry matters because a visual comparison should use the same costs as
the planner, rather than a separately invented picture.

The owner first questioned whether the weekly tutorial labs matched the plan, then asked
for a complete project review and explained that the map was difficult to understand.
The review connected those reactions to concrete problems: unclear map symbols, cropped
endpoints, hidden elevation, overlapping routes and experiments dominated by preset
results. It also found cases where the explanation overstated what the computation
showed. The owner then requested a written improvement plan followed by implementation.
The plan is preserved in
[`fa29728`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/fa29728).

Correctness came first. A regression on the existing greedy assignment reproduced a
charging queue inversion: drone D started at 6299 although the earlier request from A
waited until 6628. Charging reservations had been allocated while planning future flights.
Moving allocation to actual request events fixed the regression. The complete reference
assignment still delivered twenty orders on time, while the greedy baseline's lateness
changed. Intermediate migration results therefore needed live re-evaluation rather than
historic stored metrics. This change is traceable in
[`201016f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/201016f).

The next change made maps and experiments usable together. Routes now have endpoint
labels, direction arrows and a legend, with a responsive screen-space layout. Week 4
compares complete-trip time and energy and plots actual waypoint heights against route
distance. Every tutorial has its own prediction, procedure and explanation prompts,
plus a saved baseline and exportable record. Weekly URL settings are isolated; a browser
check caught an additional page-router race during Lab week changes. Custom heuristic
code runs in a terminable Worker, and only checked numeric values reach the renderer.
Those changes are in
[`ebf7593`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/ebf7593).

The course revision then grouped weeks by the five learning stages, added worked lecture
checkpoints and connected assignments to canonical inputs, reference output and a practice
guide. It labelled symbolic examples separately and removed unavailable interface promises
([`1bbd7b9`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/1bbd7b9)).

Verification combined the repository checks with browser interaction. The final build
produced 37 pages with no reported link, accessibility or deck-structure violations;
96 tests passed. The browser audit covered 36 regular pages at both marking sizes and
18 targeted checks, including state restoration, exports, invalid input and code timeouts.
Screenshots and exact scope are in [the verification record](docs/improvement-verification.md).
The canonical inputs, assessment weights and dates were unchanged. Full WebGL, arbitrary
plan import and online deployment were outside this revision; the result is a locally
verified teaching site, not evidence of a live submission or real drone operation.
