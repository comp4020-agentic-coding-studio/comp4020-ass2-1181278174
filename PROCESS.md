# Process overview

This is an agent-assisted record of the repository and the owner's directions. Codex
implemented and checked the September 2026 revisions; this account does not present those
actions as independent student work.

SLOP3969, Twenty Dinners, One Hill, connects twelve weeks through one kitchen, twenty
orders, five drones and a fixed map. Early route finding develops into resource labels,
scheduling and shared-airspace planning. The university template, branding, content
collections and build hooks remain in place. Keeping one computational world makes the
weekly comparisons meaningful: a different drawing must not silently change the problem.

The owner first questioned whether the tutorial Labs matched the design and said the map
was difficult to understand. An initial revision improved 2D maps, explanations, saved
experiments and navigation. It also fixed a genuine charging-order defect: a later request
could reserve a pad before an earlier arrival. The regression and correction are recorded in
[`201016f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/201016f).
That work improved the existing demonstrations but did not deliver the continuing workspace
in the original plan.

The owner then requested larger changes that followed that plan, followed by an explicit
instruction to implement them autonomously. The rebuild proposal
([`0e15b80`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/0e15b80))
reversed the earlier 3D deferral and defined acceptance gates around student actions:
change a rule, run it, locate its consequence, compare and preserve the evidence.
This was a change in the teaching interaction, not just the map's appearance.

The engine revision exposed seven strategy functions and recorded complete movement and
search traces. Four new regression tests first failed against the old behaviour.
An independent checker now reconstructs legality, time, payload, energy, charging and
completion from actions. Disabling its energy comparison made a tampering test fail;
restoring the check made it pass. These changes are in
[`01055fe`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/01055fe),
with the checker regression delivered alongside the Lab.

The shared workspace
([`7f99ab0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/7f99ab0))
now opens distinct weekly activities within three cumulative modes. Week 4 links labels
to a complete flight; week 6 enumerates all 720 sequences; week 8 follows ten orders
through charging; week 11 evaluates live improvement candidates. The procedural map,
tables and replay share selection. Records carry inputs, source, actions, checks and notes,
with local import and an offline practice pack. Browser checks caught duplicate
initialisation that dropped a baseline from export; an idempotent controller fixed it.

Verification passed 142 tests, the build's checks on 37 pages, 55 browser interaction
assertions and all 37 pages at both marking sizes. Five Astro navigations released their
old WebGL contexts; unavailable WebGL retained readable alternatives. A reachable-server
test confirmed that custom code could not fetch external data. A measured 427 ms feedback
run justified terminable workers under the original performance rule.

A later course review corrected factual promises
([`1a80be0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/1a80be0)),
replaced lecture outlines with worked lessons
([`1bdd014`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/1bdd014)),
and moved tutorial results ahead of the full tools
([`23c5036`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/23c5036)).
The practice pack now calls actual student implementations and separates teacher references
([`b6165b4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/b6165b4)).
Fresh-folder tests reject fabricated paths, changed timetable times, missing orders and
illegal successors. The owner requested a separate commit for each completed step.

The [verification record](docs/lab-rebuild-verification.md) distinguishes measured results
from guarantees. The bounded search claims no global optimum. Canonical hashes, assessment
dates and weights remain unchanged. The work is committed locally on `codex/ass2`;
deployment and public submission have not been performed. Teaching quality still needs
the owner's judgement beyond these automated checks.
