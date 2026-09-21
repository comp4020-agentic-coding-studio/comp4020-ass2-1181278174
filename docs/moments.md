# Moments

One line per event that `PROCESS.md` may cite: a stop at a red check, a reverted attempt, a
rule added to `CLAUDE.md`, a design reversal. Date, what happened, what I decided, the commit.

| Date | What happened | What I decided | Commit |
|---|---|---|---|
| 2026-09-20 | Wrote the harness before any code. Carried the working rules from assignment 1 and dropped its project-specific sections. | Rules first; one decision per commit; messages in my voice. | fcdbd5c |
| 2026-09-20 | Rewrote the design as six English files with no history in them. The Chinese drafts stay outside the repo. | `docs/` holds the design; `CLAUDE.md` points at the files instead of importing them. | ec880b0, 45a6c46 |
| 2026-09-20 | First `pnpm check` on the twelve week files failed at build: a YAML parse error, one lecture title with unescaped double quotes inside a double-quoted string. | Escaped the one title; scanned every frontmatter line for stray quotes before rerunning. | 4eabc6f |
| 2026-09-20 | Removing the starter people with `git rm` also removed the now-empty `src/content/people/` directory, so the two new files were never written; the build then failed on every lecture's teacher reference ("Cannot read properties of undefined (reading 'id')"). | Recreated the directory, wrote the files, reran the check. Lesson for the harness: a red check after a delete is often the delete. | 3ffbd60 |
| 2026-09-20 | The first map generator sealed the whole ridge, so the corridor was the only crossing: the detour came out infinite and no order could be "across the corridor" in the sense the test needed. | Ridge on rows 2–4 only, the two end crossings protected from thinning; the detour is 5.4× and #13 lands beyond the corridor. | c16e05c |
| 2026-09-20 | The stale-entry search test failed on first run. The engine was right: with A→G costing 1 the goal was popped before the beaten A entry ever came up, so there was nothing stale to see. | Fixed the fixture (A→G costs 10), not the engine. | cdd89b0 |
| 2026-09-20 | Two label tests failed on first run: the ridge route (6,9) was missing from the "all candidates" set because over-budget labels were pruned before reaching the goal. | Kept over-budget labels that reach the goal in `all` (exact for the micro-examples); planTask searches each leg without a budget and filters the combined trip, so its sets are exact by construction. | 245d28e |
| 2026-09-20 | The first calibration probe showed two things: batteries too small for #20 on any type, and no order with more than one round-trip candidate — under the climb-rate model a steep edge was slow and dear at once, so the week-4 phenomenon could not occur on this map. | Energy model A: lift scaled by (1 + gradeFactor × grade); a summit knob with a steep track and a gentle spiral in the generator; a search over batteries and grade factors; one passing set pinned in fleet.json and spec. | 625e608 |
| 2026-09-20 | The first twenty-order run under the corridor left #07 unscheduled: the space-time planner chose the outbound leg time-first and spent the energy the return needed — week 4's lesson again, one layer up. | The cheapest static return energy is reserved before the outbound leg is planned; #07 then flies, and the improvement reaches all twenty on time. | 360b46f |
| 2026-09-20 | Adding "Lab" as a sixth item in the theme's header wrapped the search icon onto a second row at 1920. | The lab stays off the header: a card on the home page and a link under every workbench instance. | cac27a1 |
| 2026-09-20 | The charging regression showed D using a pad before an earlier request from A. | Allocate pads at the charge-request event and recompute comparisons. | d627552 |
| 2026-09-20 | Same-page Lab navigation restored old settings after a control change. | Keep week changes local and preserve the current input. | d627552 |
| 2026-09-21 | The weekly Labs did not match the original design. | The owner requested a larger rebuild with live strategy functions and shared 3D. | 0e15b80 |
| 2026-09-21 | Strategy tests found ignored callbacks and missing search diagnostics. | Connect the callbacks and retain the independent action checker. | 01055fe, 7f99ab0 |
| 2026-09-21 | The build rejected interactive SVG markers inside an image role. | Use an interactive group with individually named controls. | 7f99ab0 |
| 2026-09-21 | Duplicate mounting made a baseline stale and omitted it from export. | Make ordinary loads and page navigation mount each workspace once. | 7f99ab0 |
| 2026-09-21 | Course tests exposed mismatched W1 counts, W7 fleets and W5/W6 guarantees. | Align the descriptions with the computed cases without changing canonical data. | 1a80be0 |
| 2026-09-21 | A browser assertion expected W6 to enumerate while displaying a swap result. | Require explicit enumeration and retain the separate 720-sequence check. | f2ef13d |
| 2026-09-21 | A model test detected a missing drone body anchor. | Keep named anchors in the Blender export contract. | 5276a3b |
| 2026-09-21 | A legend edit introduced a type error after an earlier successful check. | Correct it, rerun the full check and amend the unpublished commit. | 3cefa94 |
| 2026-09-21 | Replay tests found missing ground, parcel, hover and queue states. | Derive those display states from recorded events. | 8aa0544 |
| 2026-09-21 | A route curve and its replay differed by 9.238 metres in elevation. | Interpolate both by distance along the recorded polyline. | 68f2539 |
| 2026-09-21 | Two agents worked on the site at once, one on `main` and one on a branch, and disagreed about what the lab is; neither could settle it. | One agent leads and the other tries things on a branch; nothing merges until I have judged it against the ten presentation rules. Took the branch after three fixes; the other line stays as `claude/map-and-lab`. | acc0e27 |
