# Design documents

These describe what is to be built. Nothing here claims that it exists yet; the code, the
tests and the deployed site are the evidence.

| File | What it holds | Read it before |
|---|---|---|
| `course.md` | The course itself: premise, the world, the five upgrades, learning outcomes, the twelve weeks, tutorials, the two assignments, readings. | writing anything under `src/content/` or a deck |
| `examples.md` | The four worked micro-examples the tutorials are built on, with their checked results. | building a tutorial page or its engine fixture |
| `site.md` | What the site does: pages, the workbench and its layers, strategy slots, how it is presented to the marker, what users may design, where 3D goes. | any page or component |
| `engine.md` | The computational contract: units, tasks, guarantees, timetable and charging, reservations, the objective, canonical data. | anything under `src/engine/` or `src/data/` |
| `delivery.md` | Build order and gates, platform constraints, the test plan, the Assignment 2 acceptance list. | shipping, adding a test, changing the build |

The working rules for the agent are in `CLAUDE.md` at the repository root. The process record
is `docs/moments.md` and `PROCESS.md`.

The Lab rebuild against the original design is recorded in
[`lab-redesign-plan.md`](lab-redesign-plan.md). It preserves the gaps found before the
rebuild, twelve weekly activities and staged acceptance gates. Implementation and local
verification are recorded in [`lab-rebuild-verification.md`](lab-rebuild-verification.md);
the dated revisions in `site.md`, `engine.md` and `delivery.md` describe the resulting
contracts. Local acceptance does not establish that the hosted site has been updated.
