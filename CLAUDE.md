# COMP4020 Assignment 2 — Twenty Dinners, One Hill

A course site for a made-up SlopU course, SLOP3969: one ghost kitchen at the foot of
Slop Hill, one evening, twenty orders, five drones, two charging pads, one shared narrow
corridor. Twelve weeks take a route-finding program and turn it into a planner that can
schedule all twenty. Astro site on the course template, deployed to GitHub Pages.

**The deployed URL is what gets marked**, in Chrome at 1920×1080 and 390×844. The marker
reads it as a prospective student for about ten minutes. Process is 45% of the mark, the
site 20%, the response to the brief 35%. This file, `PROCESS.md` and the commit history
are the process evidence.

The design is in `docs/` — `docs/README.md` lists the files. Read `docs/course.md` before
any content, `docs/site.md` before any page, `docs/engine.md` before anything in `src/engine`
or `src/data`, `docs/delivery.md` before a test or a ship. When this file and the design
disagree, stop and ask.

## Commands

- `pnpm dev` — keep it running while building.
- `pnpm check` — `astro check`, then `pnpm build`, then `vitest run spec`. Run before every
  commit. This is the same command CI runs.
- `pnpm check:evidence` — the submission gate: STARTER_CONTENT markers, the four starter
  images, `PROCESS.md` (`TEMPLATE:` gone, every commit citation resolves), this file exists.
  Run before `/ship`. It does not count words: the course guides 400–600 for `PROCESS.md`
  with no penalty; count them myself.
- `pnpm test:template` — starter internals, not ours. Ignore unless a template file changed.
- `/preflight` before `/ship`. `/ship` flips the repo public. That cannot be undone and
  only happens on my word.

CI runs nothing while the repo is private (`checks.yml`, `if: !repository.private`). The
deploy job does not wait for `check`: a red spec test does not stop a deploy, a failed
build does. So the local `pnpm check` is the only gate until the flip.

The pre-commit hook blocks anything staged that looks like an API key. Do not bypass it.

## What is fixed and what is mine

Fixed by the template, do not edit: the four collections in `src/content.config.ts`,
the generated API, the build hooks (axe, links, refs, decks), the branding, the last three
digits of the course code (`969`). Read `README.md` before touching anything near them.

Mine: `src/pages`, `src/components`, `src/content/**`, `src/decks`, `src/data`, `src/engine`,
`spec/*.test.ts` (except the shipped ones), `tools/models`, `docs/`, this file.

## Working with me

The marked thing is my directing. A fix I never saw is not evidence.

- **One bounded task per turn**, then stop and report. Anything else you noticed goes under
  "next".
- **Stop at the first red check.** Paste the failure, say what you think went wrong, offer:
  (a) fix the code, (b) add a rule here, (c) add or tighten a check, (d) throw the attempt
  away. Wait for my pick.
- **Two attempts, then stop.** Report what you tried, what you saw, what you now think.
- **Design decisions are mine.** More than one reasonable answer: at most two options with
  trade-offs and a recommendation, then wait. The decision goes into the design doc, with
  the date.
- **More than one agent, one lead.** A second agent works on a branch of its own; nothing
  from that branch reaches `main` until I have judged it against the design and said so.
  Neither agent settles a design disagreement with the other; I do.
- **Do not edit without asking:** the canonical data files in `src/data/` and their hashes
  in `spec/`, the rules file (energy, charging, ticks, cutoff), `src/course-config.ts`, the
  assessment weights and dates. A number that does not hold is a finding, not a number to
  change.
- **List what you fixed on your own** under "fixed silently", so I can decide whether it
  earns a rule or a check.
- **Cap the run.** After about ten tool calls without a checkpoint, report progress even if
  unfinished.
- **The evidence block ends every turn:** commands and output, `git diff --numstat`, what
  you saw at both viewports (or "no UI yet"), what you did not verify, fixed silently, next.
- **Never quote me unless you are quoting me.** If there is no message to quote, say so.
- **Adding to this file:** only after I corrected you on the same thing twice, or a check
  caught you unexpectedly. One commit per rule, when it happens.

## The loop

1. **Explore** — read the relevant source and the checks first.
2. **Plan** — the change, its boundary, and how it will be verified, before writing code.
   One-line diffs may skip this. Multi-file or open-ended ones may not.
3. **Implement** — one bounded change. A second change worth doing gets its own commit.
4. **Verify** — `git diff --numstat` and read it; `pnpm check`; the page at both viewports.
   A failed verify sends you back to step 1, not to a patch.

**"Done" is a claim.** It comes with what you ran, what it printed, the diff, what you saw,
and what you did not verify.

**A new test must be shown failing first.** Break the thing it guards, watch it go red,
put it back. A test that cannot fail is decoration.

**Corrections land here, not in a retry.** Twice wrong: a rule here, a check, or a revert
with the reason in the message.

## Commits

- **One decision, one commit.** Not one file, not one session. If a commit needs "and" in
  the title, it is two commits.
- **Message shape:** lowercase, `topic: what changed`, one line, under 60 characters. A
  second paragraph only when the reason is not obvious, in plain words, two or three lines.
- **My voice.** The message describes what changed in the repo, as I would say it, and
  nothing about how the change was made.
- **Plain words.** No adjectives like robust, clean, comprehensive, elegant. No metaphors.
  No abbreviations or names that someone outside this repo would not understand.
- **English.** Always, even when we are talking in Chinese.
- Run `pnpm check` before each commit. A spec test that is red on purpose is named in the
  message with why.
- Commit after each completed part. Push to `main` after each part unless I say hold.

Good: `engine: half-open intervals for corridor occupancy`
Good: `w4: two routes to #07, label table, dominance toggle`
Good: `spec: pin the scenario file hashes`
Bad: `Implement robust conflict detection with comprehensive tests`
Bad: `update files and fix things`
Bad: `fix stuff`

## Rules for this site

### Platform facts (from `README.md` and the build; verified before relying on them)

- **Base path.** Pages serves the site at `/comp4020-ass2-1181278174/`. URLs in JS use
  `?url` imports or `import.meta.env.BASE_URL`. A hand-written root-absolute path works
  locally and 404s live.
- **axe runs on every built page and any violation fails the build.** Every `<canvas>` has
  `role`, `aria-label` and a text fallback next to it. Every step control is a real
  `<button>`. State is never colour only. Every form control has a label.
- **ClientRouter is on.** Three.js scenes init on `astro:page-load` and dispose on
  `astro:before-swap`. Otherwise WebGL contexts run out after a few page switches.
- **Reveal decks take the arrow keys and swipes.** Nothing interactive inside a deck.
- **`prefers-reduced-motion`** is handled by hand: no autoplay, static result and step
  buttons stay.
- **Starter assets.** `card.png`, `hero-home.avif`, and the two people images are hash
  checked; replace or delete. Thirteen `STARTER_CONTENT` markers must be gone.
- **Course record.** `code: "SLOP3969"`, `level: 3`, `endDate` on or after the A2 due date.

### Content contract

- A collection key is the URL and the API path. Pick slugs once; changing one breaks
  `related:` refs and the build.
- `related:` must resolve. `week` is 1–12. Every session, lecture and assessment date is
  inside `startDate`–`endDate`. Assessment weights sum to 100; each `marking` block sums
  to 100. The deck path matches `/^\/decks\/[a-z0-9-]+\/$/` and is linked from the W9
  lecture. `description` is 80–300 characters, `tags` is 1–3.
- **Everything on the site is English.** Chinese stays in chat.
- Every page states which model it assumes (W1–W3, W4, W5–W6, W7–W8, W9–W12).

### Engine

- One validator. Nothing bypasses it: hand-made plans, composed rules, custom code,
  imported JSON, reference plans. A plan that fails validation is shown as "diagnostic",
  never as a result.
- Integer ticks. Half-open intervals `[s, e)`; overlap is `max(s1,s2) < min(e1,e2)`.
  Task phase is part of state identity. No negative-energy edge. Uphill costs more than
  downhill of the same length.
- Every result carries a status: invalid input, found and verified, no solution in the
  searched domain, not found within budget, cancelled, not verified. Never one red light.
- Precomputed plans are labelled `reference plan, re-validated live` and the validator
  runs on them in the page.
- No Worker until a measured single computation exceeds 100 ms. The one exception is
  user-typed slot code, which runs in a Worker so it can be terminated.
- Canonical data (`map`, `orders`, `fleet`, `rules`) is hashed in `spec/`. Weekly cases
  are subsets of it, never separate data.

### Presentation

- **Result first.** Every workbench instance loads already run. No empty state.
- **One primary control** per instance; the rest is under "more". After the click, the
  before and after rows sit side by side and what changed is marked.
- **Static fallback.** The SSR HTML already holds the result table and a poster image.
  JS enhances it.
- **Mobile order:** one-line caption, result table, primary button, "open 3D" poster,
  details. WebGL does not load on its own at 390.
- **WebGL on seven pages only:** home, W1, W4, W9, W10, W12, lab. Everywhere else the map
  is an SVG.
- **Two layers of promise.** Demo layer: runs live on the site. Materials layer: described
  as course material and labelled as such. The site never says "coming soon".
- Each week's instance looks different from the last: graph and OPEN table; two labels;
  schedule and 720 permutations; reservation intervals; replay. Same panel with new numbers
  is not a new week.

### Not in this assignment

A second scenario or map. Weather. Free-form delivery points. Adding edges to the map.
Blender assets before the procedural scene works on all seven pages. A third assignment.
A server. Anything the design docs do not name; if it seems needed, say so and stop.

## Process evidence

- After every stop-at-red, every reverted attempt and every rule added here, append one
  line to `docs/moments.md`: date, what happened, what I decided, the commit. `PROCESS.md`
  is written from that file and cites those commits.
- The design docs are committed with their history. A design reversal is a commit and a
  line in `docs/moments.md`.
- Nothing in `PROCESS.md` is written in the past tense before it happened.

## Facts about this repo that bite

An entry earns its place only after it has cost time in this repo. Shape: what happened,
what is actually true, how it was measured. Delete it when it stops being true.

### CI is skipped while the repo is private

**What is true.** Both jobs in `.github/workflows/checks.yml` carry
`if: !github.event.repository.private`. The first real `check:evidence` run is at ship
time, and `deploy` does not depend on `check`.

**How it was measured.** Read the workflow. Same fact bit in A1 (run 31954015672: both
jobs skipped).

### Carried from A1, not yet re-verified here

Windows `chrome.exe --headless --window-size=390,844` lays the page out at 526 px and
crops the PNG to 390, so the screenshot lies. A1 fixed it with a Linux headless Chromium
(`scripts/shot.ts`, `~/chromium-libs`). Port that script before trusting any 390 screenshot
from this machine.

### A screenshot of a port nothing answers on is a blank PNG

**What happened.** Two rounds of home-page screenshots came back white. `astro preview` had
refused to start because another preview of the same `dist` was already running (it says so
and exits), and headless Chromium exits 0 on a refused connection, writing a blank image.

**What is true.** One preview per `dist`. Before any screenshot, wait until the URL answers
200; a blank PNG is a failed capture, not an empty page.

**How it was measured.** 2026-09-21: `curl` against the port got no response while the
capture reported success.

### The template's own tests go red once the starter images are replaced

**What is true.** `scripts/check-evidence.test.ts` copies the starter images out of the
working tree to prove the gate rejects them. Replace or delete those images, as the gate
requires, and three of its cases fail. CI runs `pnpm test:template` in the `check` job;
`deploy` does not depend on it.

**How it was measured.** 2026-09-21: `pnpm test:template` fails three cases naming
`card.png`, `hero-home.avif` and `idris-fenn.avif` while `pnpm check` is green.
