# Evidence for the owner's process account

This is an evidence outline, not a personal reflection or an assessed answer written in
someone else's voice. `PROCESS.md` remains explicitly labelled as an agent-assisted
technical record. The owner should write the final design account using their own
judgement and only experiences they can truthfully explain.

The published [COMP4020 Assignment 2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
weights process at 45%, artefact at 20% and response to the brief at 35%. Its 400–600-word
account should point to actual repository evidence. Passing the local evidence script
checks length, template removal and resolvable citations; it does not judge the quality
or authorship of a reflection.

## Decisions with inspectable evidence

| Decision | Evidence | Question for the owner |
|---|---|---|
| Keep one world but correct mismatched weekly promises | `1a80be0`, the review report, `course-promises.test.ts` | Which mismatch most undermined your trust in the course, and why? |
| Give each lecture a derivation, worked example and boundary | `1bdd014`, all twelve lectures, `LectureDiagram.astro` | What should a learner now be able to explain before opening the Lab? |
| Put the result and one experiment ahead of the full controls | `23c5036`, guided tutorials and the viewport checks | Which interaction best shows the intended learning progression? What still needs judgement? |
| Make the practice runner call the actual student functions | `b6165b4`, `student-runner.mjs`, mutation/wiring checks | Why was running only the teacher engine insufficient evidence of learning? |
| Make assessment evidence readable and reproducible | The subsequent assessment commit and `course-revision-verification.md` | How does a marker distinguish feasibility, performance and the algorithm's guarantee? |

## Suggested 400–600-word structure

1. About 80 words: the intended learner and the course's single-world progression.
2. About 120 words: a concrete shortcoming you identified and the decision you made.
3. About 120 words: how you directed the revision, including what the agent implemented
   and which judgement remained yours. Cite the relevant commits.
4. About 120 words: evidence you personally inspected, including an example of a failing
   strategy and why the corrected result is credible. Separate your inspection from
   automated checks run by the agent.
5. About 60 words: a remaining limit and what you would improve next.

Do not claim to have written or tested code personally if the repository records agent
implementation. Do not claim the site is deployed until its hosted URL has been checked.
The richer Blender models and expanded flight-event animation remain a separate plan.
