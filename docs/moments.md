# Moments

One line per event that `PROCESS.md` may cite: a stop at a red check, a reverted attempt, a
rule added to `CLAUDE.md`, a design reversal. Date, what happened, what I decided, the commit.

| Date | What happened | What I decided | Commit |
|---|---|---|---|
| 2026-09-20 | Wrote the harness before any code. Carried the working rules from assignment 1 and dropped its project-specific sections. | Rules first; one decision per commit; messages in my voice with no agent attribution. | fcdbd5c |
| 2026-09-20 | Rewrote the design as six English files with no history in them. The Chinese drafts stay outside the repo. | `docs/` holds the design; `CLAUDE.md` points at the files instead of importing them. | ec880b0, 45a6c46 |
| 2026-09-20 | First `pnpm check` on the twelve week files failed at build: a YAML parse error, one lecture title with unescaped double quotes inside a double-quoted string. | Escaped the one title; scanned every frontmatter line for stray quotes before rerunning. | 4eabc6f |
| 2026-09-20 | Removing the starter people with `git rm` also removed the now-empty `src/content/people/` directory, so the two new files were never written; the build then failed on every lecture's teacher reference ("Cannot read properties of undefined (reading 'id')"). | Recreated the directory, wrote the files, reran the check. Lesson for the harness: a red check after a delete is often the delete. | 3ffbd60 |
| 2026-09-20 | The first map generator sealed the whole ridge, so the corridor was the only crossing: the detour came out infinite and no order could be "across the corridor" in the sense the test needed. | Ridge on rows 2–4 only, the two end crossings protected from thinning; the detour is 5.4× and #13 lands beyond the corridor. | c16e05c |
| 2026-09-20 | The stale-entry search test failed on first run. The engine was right: with A→G costing 1 the goal was popped before the beaten A entry ever came up, so there was nothing stale to see. | Fixed the fixture (A→G costs 10), not the engine. | cdd89b0 |
| 2026-09-20 | Two label tests failed on first run: the ridge route (6,9) was missing from the "all candidates" set because over-budget labels were pruned before reaching the goal. | Kept over-budget labels that reach the goal in `all` (exact for the micro-examples); planTask searches each leg without a budget and filters the combined trip, so its sets are exact by construction. | 245d28e |
| 2026-09-20 | The first calibration probe showed two things: batteries too small for #20 on any type, and no order with more than one round-trip candidate — under the climb-rate model a steep edge was slow and dear at once, so the week-4 phenomenon could not occur on this map. | Energy model A: lift scaled by (1 + gradeFactor × grade); a summit knob with a steep track and a gentle spiral in the generator; a search over batteries and grade factors; one passing set pinned in fleet.json and spec. | 625e608 |
