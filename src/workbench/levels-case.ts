// Week 11: three levels. Independent costs, evaluated jointly: conflicts.
// The same assignment coordinated in space-time: valid, but late. The
// assignment improved with every candidate re-evaluated under the pads and
// the corridor: all twenty on time. The stored reference is re-run here.

import { evaluate } from "../engine/fleet.ts";
import { edgeTicks } from "../engine/graph.ts";
import { validate } from "../engine/validate.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, esc, fmtTicks, table } from "./html.ts";
import { droneLabel, reference, world } from "./world.ts";

export interface LevelsState {
  level: "1" | "2" | "3";
}

/** Level 1: static routes, no coordination — then the validator on the corridor intervals they imply. */
function independent() {
  const plan = evaluate(world, reference.greedy.assignment, { charging: true });
  const occupancies: { resource: string; owner: string; task?: string; start: number; end: number }[] = [];
  for (const t of plan.tasks) {
    if (t.status !== "flown") continue;
    const type = world.fleet.types.find((x) => x.id === world.fleet.drones.find((d) => d.id === t.drone)!.type)!;
    for (const [path, from] of [[t.pathOut!, t.depart!], [t.pathBack!, t.deliver!]] as const) {
      let tick = from;
      for (let i = 1; i < path.length; i++) {
        const e = world.map.edges.find((x) => x.from === path[i - 1] && x.to === path[i])!;
        const dt = edgeTicks(e, type);
        if (e.resource) occupancies.push({ resource: e.resource, owner: t.drone, task: t.order, start: tick, end: tick + dt });
        tick += dt;
      }
    }
  }
  const v = validate({ orders: world.orders.map((o) => o.id), activities: [], occupancies, deliveries: plan.deliveries, capacities: { corridor: 1, pads: 2 }, cutoff: world.rules.evening.cutoffTick });
  return { plan, conflicts: v.violations.filter((x) => x.rule === "capacity"), occupancies };
}

export const levelsCase: CaseDef<LevelsState> = {
  key: "levels",
  weeks: [11],
  caption: () => ({
    decision: "Let the route's real cost — its waits at the pads and the corridor — reach the assignment, and re-evaluate the whole plan for every candidate.",
    breaks: "Week 7's cost matrix: a static number per drone and order.",
  }),
  initial: () => ({ level: "1" }),
  controls: (state): Control[] => [
    { id: "level", label: "Level", kind: "radio", primary: true, value: state.level, options: [
      { value: "1", label: "1 · independent costs, no coordination" },
      { value: "2", label: "2 · same assignment, coordinated" },
      { value: "3", label: "3 · assignment improved with feedback" },
    ] },
  ],
  apply: (state, action) => (action.id === "level" && action.value ? { level: action.value as LevelsState["level"] } : state),
  render: (state) => {
    const t0 = Date.now();
    const l1 = independent();
    const l2 = evaluate(world, reference.greedy.assignment, { charging: true, corridor: true });
    const l3 = evaluate(world, reference.reference.assignment, { charging: true, corridor: true });
    const migrationAssignment = Object.fromEntries(Object.entries(reference.greedy.assignment).map(([drone, ids]) => [drone, [...ids]]));
    let previous = l2;
    const migrationRows = reference.moves.map((move, i) => {
      const match = move.description.match(/(#\d+): (\w+) → (\w+) at position (\d+)/)!;
      const [, order, from, to, position] = match;
      migrationAssignment[from] = migrationAssignment[from].filter((id) => id !== order);
      migrationAssignment[to].splice(Number(position), 0, order);
      const next = evaluate(world, migrationAssignment, { charging: true, corridor: true });
      const row = { n: i + 1, move: move.description, before: `lateness ${fmtTicks(previous.objective!.lateness)}, back ${clock(previous.objective!.allReturned)}`, after: `lateness ${fmtTicks(next.objective!.lateness)}, back ${clock(next.objective!.allReturned)}` };
      previous = next; return row;
    });
    const parts: string[] = [];
    const rows = [
      { level: "1 · independent", onTime: l1.plan.onTime, lateness: fmtTicks(l1.plan.objective?.lateness ?? 0), back: l1.plan.objective ? clock(l1.plan.objective.allReturned) : "—", valid: l1.conflicts.length ? `✗ ${l1.conflicts.length} corridor conflict${l1.conflicts.length === 1 ? "" : "s"}` : "✓ no conflict", waits: "—" },
      { level: "2 · coordinated", onTime: l2.onTime, lateness: fmtTicks(l2.objective?.lateness ?? 0), back: l2.objective ? clock(l2.objective.allReturned) : "—", valid: l2.validation.ok ? "✓ resource check" : "✗", waits: `${l2.tasks.reduce((s, t) => s + (t.groundWait ?? 0) + (t.hover ?? 0), 0)} s` },
      { level: "3 · with feedback", onTime: l3.onTime, lateness: fmtTicks(l3.objective?.lateness ?? 0), back: l3.objective ? clock(l3.objective.allReturned) : "—", valid: l3.validation.ok ? "✓ resource check" : "✗", waits: `${l3.tasks.reduce((s, t) => s + (t.groundWait ?? 0) + (t.hover ?? 0), 0)} s` },
    ];
    const chosen = rows[Number(state.level) - 1];
    const summaries: Record<LevelsState["level"], string> = {
      "1": `The greedy assignment on static costs, each route flown as if alone: ${l1.plan.onTime} of 20 on time. ${l1.conflicts.length ? `The corridor intervals the routes imply collide ${l1.conflicts.length} time${l1.conflicts.length === 1 ? "" : "s"} (first at tick ${l1.conflicts[0].tick}): fast on paper, not a plan.` : "The corridor intervals the routes imply happen not to collide on this assignment — but nothing at this level checked that, and the waits at the pads are already in the numbers. Level 2 is where the corridor is checked."}`,
      "2": `The same assignment, every leg planned in space-time against the reservations: valid, ${l2.onTime} of 20 on time, lateness ${fmtTicks(l2.objective?.lateness ?? 0)}. The waits are real now, and drone A's task queue produces late deliveries.`,
      "3": `Two migrations chosen with every candidate re-evaluated under the pads and the corridor — ${reference.moves.map((m) => m.description.split(" at position")[0]).join("; ")} — and all 20 are on time, everyone back by ${clock(l3.objective!.allReturned)}. These migration choices were computed in advance; this page re-evaluates each intermediate assignment with the current charging and corridor model.`,
    };
    parts.push(`<p class="wb-summary"><strong>Level ${state.level}:</strong> ${esc(summaries[state.level])}</p>`);
    parts.push(table(
      [{ key: "level", label: "level" }, { key: "onTime", label: "on time", align: "right" }, { key: "lateness", label: "lateness", align: "right" }, { key: "back", label: "all back" }, { key: "waits", label: "waits", align: "right" }, { key: "valid", label: "resource check" }],
      rows.map((r) => ({ ...r, level: r.level + (r === chosen ? " (shown)" : "") })),
      "The three levels on the same twenty orders",
      (r) => (String(r.valid).startsWith("✗") ? "wb-bad" : String(r.level).includes("(shown)") ? "wb-good" : ""),
    ));
    if (state.level === "3") {
      parts.push(table(
        [{ key: "n", label: "#", align: "right" }, { key: "move", label: "move" }, { key: "before", label: "before" }, { key: "after", label: "after" }],
        migrationRows,
        "Stored migration choices, intermediate results re-evaluated live",
      ));
    }
    const shownPlan = state.level === "1" ? l1.plan : state.level === "2" ? l2 : l3;
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "orders", label: "orders" }, { key: "late", label: "late", align: "right" }],
      world.fleet.drones.map((d) => ({ drone: droneLabel(d.id), orders: (state.level === "3" ? reference.reference.assignment : reference.greedy.assignment)[d.id]?.join(", ") || "—", late: shownPlan.tasks.filter((t) => t.drone === d.id && (t.late ?? 0) > 0).length })),
      "Who flies what at this level",
      (r) => (Number(r.late) > 0 ? "wb-bad" : ""),
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · five full evaluations of twenty orders · ${ms} ms · engine 0.1 · reference plan re-evaluated, not read` };
  },
};
