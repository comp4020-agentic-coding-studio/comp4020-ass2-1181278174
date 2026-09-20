# Moments

One line per event that `PROCESS.md` may cite: a stop at a red check, a reverted attempt, a
rule added to `CLAUDE.md`, a design reversal. Date, what happened, what I decided, the commit.

| Date | What happened | What I decided | Commit |
|---|---|---|---|
| 2026-09-20 | Wrote the harness before any code. Carried the working rules from assignment 1 and dropped its project-specific sections. | Rules first; one decision per commit; messages in my voice with no agent attribution. | fcdbd5c |
| 2026-09-20 | Rewrote the design as six English files with no history in them. The Chinese drafts stay outside the repo. | `docs/` holds the design; `CLAUDE.md` points at the files instead of importing them. | ec880b0, 45a6c46 |
| 2026-09-20 | First `pnpm check` on the twelve week files failed at build: a YAML parse error, one lecture title with unescaped double quotes inside a double-quoted string. | Escaped the one title; scanned every frontmatter line for stray quotes before rerunning. | 4eabc6f |
| 2026-09-20 | Removing the starter people with `git rm` also removed the now-empty `src/content/people/` directory, so the two new files were never written; the build then failed on every lecture's teacher reference ("Cannot read properties of undefined (reading 'id')"). | Recreated the directory, wrote the files, reran the check. Lesson for the harness: a red check after a delete is often the delete. | 3ffbd60 |
