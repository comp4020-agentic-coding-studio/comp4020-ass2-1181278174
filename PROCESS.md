# Process overview

## What I built

I built SLOP3969, *Twenty Dinners, One Hill*, around one ghost kitchen's evening:
twenty orders, five drones, two charging pads and one narrow corridor. Across twelve
weeks, students turn a route finder into a planner that schedules all twenty deliveries.
They revisit the same problem as energy, deadlines and shared resources invalidate
earlier assumptions. The lab supports experiments, 3D replay and student strategy code,
with a downloadable practice pack
([`7f99ab0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/7f99ab0)).

## How I got here

I wanted a course where students could explain why each new method was necessary.
My design borrowed the focus on one question from *Calling Bullshit* and the accumulation
towards a final project from *How to Make (Almost) Anything*. I organised five upgrades
of one delivery problem, with outcomes expressed as code, counterexamples and explanations
students could produce. The tutorials practise the work the assignments ask for. These
choices went into six English design files
([`ec880b0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/ec880b0)),
and I made `CLAUDE.md` point agents to the relevant document before each kind of work
([`45a6c46`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/45a6c46)).

I carried forward assignment 1's rules: one decision per commit, stop at failed checks,
show that new tests can fail, and leave design and canonical data changes to me. For this
course, I added rules for shared data and presentation: show the result first,
expose one primary control, and make each week's evidence different. This gave the agents
criteria for both numerical correctness and the progression I wanted readers to see
([`fcdbd5c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/fcdbd5c)).

Those criteria exposed a problem in week 4's teaching example. The fastest round trip
needed to exceed the battery budget while a slower one returned safely. The initial
model made steep routes both slow and expensive, so it could not produce that trade-off.
I changed the energy model and calibrated its parameters
([`625e608`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/625e608)).
I then protected the scenario files with hash checks and added assertions for the promised
route comparison. Temporarily raising the light drone's battery to 150 kJ made both the
hash check and the energy check fail. The tests now protected the lesson as well as the data
([`010d96a`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/010d96a)).

Stopping at a failed check also meant deciding what was actually wrong. In a stale-entry
test, the search reached the goal before the outdated queue entry could appear; increasing
the last edge's cost made the fixture exercise the intended behaviour
([`cdd89b0`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/cdd89b0)).
The fleet planner had a different problem: its outbound choice spent energy needed for
the return. I fixed that by reserving return energy before planning the outbound leg
([`360b46f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/360b46f)).
A charging regression exposed another ordering error: pads were reserved while planning
flights, allowing later arrivals to overtake earlier requests. Allocating pads at the
request event fixed it, with a test guarding arrival order
([`201016f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/201016f)).

The first lab collected preset examples behind a week slider; a layout check kept it off
the header after a sixth navigation item pushed the search button onto a second row
([`cac27a1`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/cac27a1)).
I wanted students to change a strategy, inspect its consequence and keep an experiment.
I used two agents to explore alternatives: one developed manual planning controls
([`411bd37`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/411bd37)),
while the other rebuilt the continuing lab on a separate branch. I made W4 the first
acceptance case, because it ties the algorithm and the map to the energy a complete
delivery needs: changing the dominance rule had to change the search trace, and picking a
discarded route had to show why it was feasible. Only after W4 passed did the approach
extend to the other weeks
([`0e15b80`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/0e15b80)).
The rebuild connected strategy functions to the engine and added tests of their effect
on the search, plus an independent checker for complete flights
([`01055fe`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/01055fe)).

That implementation still needed my design review. Against `docs/site.md`, putting the
full workspace on every tutorial obscured the weekly decision. I required one focused
example on each tutorial, leaving editors and saved experiments in the lab
([`71149cf`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/71149cf)).
I also required clearer geography and named homes so readers could connect an order to
its destination
([`9a184f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/9a184f4),
[`36533a1`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/36533a1)),
and simpler lab controls
([`61f3128`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/61f3128)).
I removed work reports from `docs/` so the design instructions were easier to find
([`3c1cd24`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/3c1cd24)).
I chose the rebuilt lab and retained the alternative as `claude/map-and-lab`. The disagreement
became a rule in `CLAUDE.md` on `main`: one agent leads, others experiment on branches,
and I judge their work against the design before merging
([`98edf3b`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/98edf3b)).

The home page's course timeline and the `/hill/` page, a 3D hill you walk with the keyboard
to reach each week, are there so a student can see the course's shape before reading it. The
3D walk is my idea of a new way to present teaching material and draw students in; I wanted
a freer version, but with the time I had it shows only a first step. An early version sat on
the home page and I took it off, because the reader needed to understand the course first
([`877f758`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/877f758),
[`acc0e27`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/acc0e27));
the finished opening and the separate hill page came back on the last morning
([`10da0a5`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/10da0a5)).

I used `pnpm check` for types, the production build (including axe and links) and the spec,
then browser checks for interaction. On the submitted commit that is 190 passing tests and
38 pages through axe and the link checker; the browser checks cover import/export, replay,
keyboard interaction and the WebGL fallback at 1920×1080 and 390×844
([`1328c4d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-1181278174/commit/1328c4d)).
Disabling the independent checker's energy comparison made the tampering regression fail;
restoring it made the suite pass. That checked whether the validator could catch a bad
plan, beyond accepting the reference result.
These were local checks. I have not manually tested every control with a screen reader.
Numerical checks could protect the examples; I still had to read the pages and decide
whether they explained a coherent course. The most useful change in my workflow was
making that acceptance criterion concrete before asking for more implementation.
