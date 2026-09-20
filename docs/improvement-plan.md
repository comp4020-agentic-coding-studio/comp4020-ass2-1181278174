# Website improvement plan — 20 September 2026

The owner asked for a plan and implementation after reviewing the whole site and the map.
The work preserves the course, canonical data, assessment dates and weights, and template
branding. Results remain visible before interaction. All site content stays in English.

## Order and acceptance

1. **Trust the results.** Process charging requests in arrival order, protect custom code
   with a terminable Worker, isolate weekly URL state, and correct unsupported W5/W6 and
   validation claims. Reproduce the charging defect before fixing it and keep its regression.
2. **Make the map understandable.** Rebuild the shared 2D presentation with readable
   landmarks, route legends, direction arrows, consistent route identity, and a fit that
   includes the task endpoints. W4 adds selectable route comparison and an elevation
   profile derived from the existing coordinates. W9 shows the actual corridor and waits.
3. **Make tutorials into experiments.** Give each week its own prediction, procedure and
   evidence prompts. Let learners save a baseline, compare it with the current run, keep
   notes, and export a reproducible experiment record. Add a manual six-order sequence.
4. **Make the course easy to navigate.** Put audience, outcomes and entry points near the
   top of home. Group the syllabus by the five stages. Show one selected Lab week at a
   time and preserve its state. Add adjacent-week and lecture/tutorial links.
5. **Connect teaching and assessment.** Add a worked checkpoint to each lecture, link
   assignments to the relevant experiments and downloadable canonical practice data, and
   remove descriptions of unavailable interface features. Repair the W9 deck diagram.
6. **Verify and record.** Run type, build, links, accessibility and engine checks; inspect
   every regular page at 1920×1080 and 390×844; exercise state links, code errors/timeouts,
   maps, experiments and exports. Record real work and commit references in PROCESS.md.

## Design decisions

- The first map delivery uses a responsive 2D view plus an elevation profile. A full 3D
  scene is deferred: the map must explain endpoints, routes and slope before additional
  camera controls are added. This supersedes the seven-page WebGL requirement in the
  original site design for this implementation.
- The Lab's semester control selects a week instead of stacking every earlier experiment.
  Its navigation still shows the full progression.
- The six canonical orders are unchanged. If swaps reach the exact optimum, the page says
  so. The symbolic local-optimum example is labelled separately from the flight model.
- Export is an experiment record and practice data, not a claim that arbitrary imported
  flight plans have passed a complete independent validator.
- Local verification precedes delivery. Publishing and changing repository visibility are
  outside this change.

## Progress

- [x] Result correctness and reproducible state
- [x] Shared map and W4 route comparison
- [x] Weekly experiments and records
- [x] Course navigation, Lab and home
- [x] Lecture checkpoints, assignment resources and deck
- [x] Browser verification, checks and process evidence
