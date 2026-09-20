// The reference plan for the twenty orders: `pnpm reference`.
//
// Greedy assignment on static costs, then best-improvement local search
// (swaps within a drone, migrations between drones) with every candidate
// re-evaluated as a whole plan — charging queue and corridor reservations on.
// Slow (a minute or two), so the result is written to src/data/reference.json
// and the spec re-evaluates the stored assignment live rather than searching
// again. The stored file is a result of this script, never edited by hand.

import { writeFileSync } from "node:fs";
import { greedyAssign, improve } from "../../src/engine/assign.ts";
import { evaluate, type World } from "../../src/engine/fleet.ts";
import { readFileSync } from "node:fs";

const read = (n: string) => JSON.parse(readFileSync(`src/data/${n}`, "utf8"));
const world: World = { map: read("map.json"), fleet: read("fleet.json"), rules: read("rules.json"), orders: read("orders.json").orders };
const options = { charging: true, corridor: true } as const;

const t0 = Date.now();
const greedy = greedyAssign(world);
const greedyPlan = evaluate(world, greedy.assignment, options);
const r = improve(world, greedy.assignment, { ...options, maxIterations: 12 });
const millis = Date.now() - t0;

const out = {
  method: "greedy earliest-completion on static costs, then best-improvement swaps and migrations under full re-evaluation with charging and corridor reservations",
  options,
  greedy: { assignment: greedy.assignment, objective: greedyPlan.objective, onTime: greedyPlan.onTime, complete: greedyPlan.complete },
  reference: { assignment: r.assignment, objective: r.plan.objective, onTime: r.plan.onTime, complete: r.plan.complete, status: r.status },
  moves: r.moves.map((m) => ({ kind: m.kind, description: m.description, before: m.before, after: m.after })),
  candidatesEvaluated: r.candidatesEvaluated,
  millis,
};
writeFileSync("src/data/reference.json", JSON.stringify(out, null, 2) + "\n");
console.log(`greedy: on time ${greedyPlan.onTime}/20, lateness ${greedyPlan.objective?.lateness}; reference: on time ${r.plan.onTime}/20, lateness ${r.plan.objective?.lateness}, ${r.moves.length} moves, ${r.candidatesEvaluated} candidates, ${r.status}, ${millis} ms`);
