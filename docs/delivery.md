# Delivery

Build order, platform constraints, the test plan and the acceptance list for COMP4020
Assignment 2.

## 1. Workload

The course content holds up, provided implementation is cumulative and the teacher's
framework is explicit; building the full platform is still medium-to-high risk. That is a
design judgement, not a measured schedule.

| Layer | Load and boundary |
|---|---|
| Students | Three cumulative modules. Dijkstra → A* → resource labels → space-time states reuse one search structure; ordering → assignment → feedback reuse one evaluator and neighbourhood. Nobody writes an engine from scratch. |
| Materials | All twelve weeks need derivations, examples, exercises and mastery standards. Twelve short blurbs do not meet this design. |
| Site | One workbench, three modes. The hard part is consistency of resources, time and energy, not the number of pages. |
| Algorithmic depth | Correctness, state representation, dominance, neighbourhoods and guarantee ranges. Difficulty does not come from adding algorithm families. |
| Parameters and cases | A feasible baseline, distinguishable routes and tasks must be calibrated; no idealised performance curve is pre-written. |

Resource labels and space-time search are the hard parts; the teacher provides runnable
skeletons and reference implementations, and students complete key functions, tests and
explanations.

## 2. Site and student code

The browser runs the teacher's skeleton and the students' slot functions. A slot runs the
visitor's own pure function in a restricted scope in the page, without DOM or network access;
that is a visitor running their own code in their own browser and is no risk to anyone else.
The line that matters: imported JSON is data only and never executed; after validation the
derived quantities and constraints are recomputed and self-reported scores are not trusted.

The practice pack is the fictional course's formal submission format: the same JSON data,
function signatures and tests. The site does not depend on it to demonstrate anything.

GitHub Pages is static hosting: client-side experiments, no server-side code, no submission
service. Search and scheduling run synchronously on the main thread under an expansion cap;
only when a measured single computation exceeds 100 ms (§4) is a Worker introduced, with
progress and cancel.

Framework dependencies and directories follow the actual starter; platform facts are in §5.
Nothing here asks for changes to the protected content collections.

## 3. Build order, gates and the two layers of promise

Every capability on the site belongs to one of two layers. **Demo layer**: runs live on the
site. **Materials layer**: provided as course documents and labelled as such, never presented
as runnable. The site promises only what the demo layer can do; materials are promoted when
they are built.

| Order | Result required before the capability is claimed | Layer |
|---|---|---|
| 1. Small graphs and the course skeleton | 12 dated weeks and 2 assignments consistent; the Dijkstra/A* small-graph examples and counterexample actually run; slot 1. | demo |
| 2. Full single drone | Outbound–service–return and resource labels correct; the six-order timetable and the 720-permutation comparison hold; slots 2 and 3; the first three entries of the worked-example record. | demo |
| 3. Multi-drone resources | Assignment and shared charging reproducible; event queue and capacity pass hand computation and tests; slot 4. | materials → demo |
| 4. Space-time coordination | The two-drone corridor example, legal waiting, failed-reservation rollback and energy update hold (demo); then five drones (materials → demo); slot 5. | two drones demo |
| 5. Feedback and the full experiment | The twenty-order baseline complete and feasible; a task change actually re-evaluates routes and resources; all five entries of the worked-example record. | materials → demo |
| 6. Teaching and release | Materials, hints, the real deck, entry points, export, both viewports and the live check together. | demo |

Materials are written in parallel with the core experiments. Every promise is met by a real
tool or by a document labelled as materials; "coming soon" never appears on the site.

## 4. Browser and accessibility

The workbench has a compute budget; once a Worker exists it has progress and cancel, and an
old response never overwrites new input. After a search completes, playback follows the
record; nothing is re-solved per frame. Leaving or pausing a page releases unused rendering
and compute. Performance is measured at the marking viewports; no millisecond promise is made
without a run.

Ordering has move up/down; selection has a list; time has previous/next event buttons. Every
drag has a pointer alternative that does not depend on dragging, and the keyboard path is
tested separately. The phone keeps the core operations — change, run, compare, locate, export;
it may lower visual quality but never changes the formal graph, tick, orders or rules.

## 5. Platform constraints

| Fact | Requirement |
|---|---|
| Pages serves the site under the repository path | URLs in JS use `?url` imports or `import.meta.env.BASE_URL`; never a hand-written root-absolute path (works locally, 404 live). |
| axe-core runs on every built page and any violation fails the build | `<canvas>` has `role`, `aria-label` and a text fallback; step controls are real `<button>`s; state is never colour only; every form control has a label. |
| ClientRouter is on | 3D scenes are created on `astro:page-load` and disposed on `astro:before-swap`; otherwise WebGL contexts run out. |
| Reveal decks capture arrow keys and swipes | 3D inside a deck is read-only. |
| `prefers-reduced-motion` | Handled by hand: no autoplay; static results and step buttons remain. |
| Starter assets are hash-checked | `card.png`, `hero-home.avif` and the two people images are replaced or deleted; the thirteen `STARTER_CONTENT` markers are removed. |
| Course record | `courseMeta.code` is `SLOP3969`, `level` is 3, `endDate` is on or after the A2 due date. |

## 6. Tests and human review

| Group | Promise protected |
|---|---|
| Search correctness | Known small graphs, unreachable, equal-cost paths, stale queue entries, goal test, the admissible-but-inconsistent counterexample. |
| Resource labels | Outbound and return phases differ; two non-dominated prefixes are both kept; over-budget pruning; payload switch after service; units consistent; an uphill edge costs more than a downhill edge of the same length. |
| Time and objective | Delivery and return differ; no loading before ready time; every order kept; the two-order and six-order hand results match (six-order compares the objective value and accepts tied optima). |
| Local search | Every acceptance is a strict improvement; full neighbourhood scan and budget stop are distinguished; no order dropped, no metric changed. |
| Shared resources | One drone's activities never overlap; two-pad capacity; FCFS request order; occupancy intervals for different speeds. |
| Space-time and reservations | Waiting states survive spatial visited; two-way sharing; node transitions; waiting costs energy; a failure leaves no reservation behind. |
| Whole system | Changing an assignment recomputes routes and charging; a failed candidate keeps the previous legal solution; the validator does not trust the planner's success flag. |
| Canonical scenario | sha256 of the map, orders, fleet and rules files; each weekly case is a subset of them; the design target (a complete feasible baseline exists; the reference delivers ≥ N on time). |
| Strategy slots | Errors are shown, never silently replaced; results record the slot version; the three presets match the reference output. |
| Teaching and pages | Dates and assignments consistent; level equals the code's first digit; A2 is due after the W12 tutorial; tutorial cases open directly; the deck opens from the W9 lecture; the worked-example record has five entries. |
| Browser | Both viewports usable; keyboard, text alternatives, reduced motion, page switches and deep paths correct. |

Tests plug into the real `spec/` and check entry points. A new test must first catch its own
error fixture; a test file that never runs is not a test.

Three things automation cannot prove are reviewed by a person: whether each week carries a
new reasoning load; whether the activity trains the stated outcome; whether two non-adjacent
weeks still read as one course. "The titles differ" and "the field is not empty" are not
quality judgements.

## 7. COMP4020 Assignment 2 acceptance

This is the design of a new SlopU course, not the final site and not `PROCESS.md`.

### Response to the brief

The course studies one kitchen's twenty orders on one evening and asks how routing and
scheduling hold together. Each week changes the state, cost and constraints of the same
problem, and early algorithms keep working later; that is coherence. The niche claim rests on
commitment to the instance: every example and every case has a place on Slop Hill, and there
is no exercise unrelated to this evening. The remaining risk is a page that reads as a generic
algorithms summary; specific delivery counterexamples, cumulative code and task-cost evidence
are what carry the distinct position. This is design analysis, not a predicted grade.

| Official requirement | Pre-release check |
|---|---|
| A niche SlopU course with 12 dated teaching weeks | Course name, outcomes, week pages and assignments agree; 2027-02-22 to 2027-05-10. |
| A valid SLOP code, fixed branding and content contract | SLOP3969, level 3; name, logo, palette, collections and generated API kept; `README.md` is the authority. |
| Staff | Two people pages; starter images replaced. |
| At least one real lecture deck; assessment totals 100% | The W9 lecture opens a complete deck; assignments are 40% / 60%; each internal rubric sums to 100. |
| Own checks and process material | `spec/`, `pnpm check`, `pnpm check:evidence`; the author's 400–600-word `PROCESS.md`, `CLAUDE.md`, a real commit history. |
| Live site and source | The assigned public GitHub Pages site and repository; core paths verified at 1920×1080 and 390×844. |
| Own artwork | Placeholder assets replaced with assets that fit the course and pass the evidence check. |

Process 45%, artefact 20%, response 35%. More algorithms or more 3D do not add marks by
themselves.

### What the harness records

`CLAUDE.md` holds the working rules, the platform facts above and the acceptance steps;
`spec/` holds the executable promises; teaching quality stays with human judgement. The
process narrative in `PROCESS.md` is built from things that actually happened and the commits
that show them; a plan is never rewritten in the past tense, and a teaching counterexample is
never dressed up as a development incident.

## 8. Sources

- [UC Berkeley CS188 — Informed Search](https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html)
- [Boost Graph Library — Resource-Constrained Shortest Paths (concept reference)](https://www.boost.org/doc/libs/1_86_0/libs/graph/doc/r_c_shortest_paths.html)
- [Stern et al., 2019 — Multi-Agent Pathfinding: Definitions, Variants, and Benchmarks](https://ojs.aaai.org/index.php/SOCS/article/view/18510)
- [Silver, 2005 — Cooperative Pathfinding](https://ojs.aaai.org/index.php/AIIDE/article/view/18726)
- [GitHub Docs — What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [MDN — Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [W3C — Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [COMP4020 Assignment 2](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
- [COMP4020 Assessment](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
- [COMP4020 AI use and academic integrity](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/)

## 9. Local rebuild verification — 21 September 2026

The larger Lab implementation and its acceptance evidence are in
`lab-rebuild-verification.md`. A measured 120-candidate feedback computation took about
427 ms, exceeding §2's 100 ms Worker threshold. Runs now use a terminable worker inside
an opaque-origin iframe with a policy that blocks connections and external scripts.
The browser checks tested both restrictions against a reachable local server. Custom
functions have an eight-second timeout; other runs have a 45-second timeout, explicit
algorithm budgets, progress and cancellation. Stale responses cannot replace newer input.

The site's live examples use the shared engine. The downloadable offline practice pack
contains seven baseline strategy functions, tests and separately labelled unfinished
search/neighbourhood exercises. Import reviews data and source without executing it;
full plans are independently checked and derived metrics are recomputed.

Run `pnpm check`, then the two `scripts/check-lab-*.mjs` browser scripts against the local
preview for the Lab acceptance gates. Those scripts return a failing exit status for
failed assertions. `pnpm check:evidence` remains the submission evidence gate. This
revision was verified locally; hosting, public visibility and submission remain separate
delivery actions requiring the owner's instruction.
