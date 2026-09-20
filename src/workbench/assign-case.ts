// Week 7: which drone takes which order. The feasibility matrix first, then
// the greedy assignment by earliest predicted completion, against equal
// counts: same number of orders each, very different finish times.

import { feasibilityMatrix, greedyAssign } from "../engine/assign.ts";
import { evaluate } from "../engine/fleet.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, fmtTicks, table } from "./html.ts";
import { minimap } from "./minimap.ts";
import { droneLabel, world } from "./world.ts";

const ten = [...world.orders.slice(0, 9), world.orders[19]];

export interface AssignState {
  rule: "earliest-completion" | "equal-counts";
  fleet: "light" | "mixed";
}

function worldFor(state: AssignState) {
  const drones = state.fleet === "light" ? world.fleet.drones.filter((d) => d.type === "L") : world.fleet.drones;
  return { ...world, fleet: { ...world.fleet, drones }, orders: ten };
}

export const assignCase: CaseDef<AssignState> = {
  key: "assign",
  weeks: [7],
  caption: () => ({
    decision: "Which drone takes which order: exclude the pairs that cannot fly first, then choose by predicted completion, not by count.",
    breaks: "Week 6's single sequence: with several drones, the order of one is not the plan of all.",
  }),
  initial: () => ({ rule: "equal-counts", fleet: "mixed" }),
  controls: (state): Control[] => [
    { id: "rule", label: "Assignment rule", kind: "radio", primary: true, value: state.rule, options: [{ value: "equal-counts", label: "equal counts" }, { value: "earliest-completion", label: "earliest predicted completion" }] },
    { id: "fleet", label: "Fleet", kind: "select", value: state.fleet, options: [{ value: "mixed", label: "A, B, C light; D, E heavy" }, { value: "light", label: "A, B, C light only" }] },
  ],
  apply: (state, action) => {
    if (action.id === "rule" && action.value) return { ...state, rule: action.value as AssignState["rule"] };
    if (action.id === "fleet" && action.value) return { ...state, fleet: action.value as AssignState["fleet"] };
    return state;
  },
  render: (state) => {
    const t0 = Date.now();
    const w = worldFor(state);
    const matrix = feasibilityMatrix(w, ten);
    const g = greedyAssign(w, ten, state.rule);
    const plan = evaluate(w, g.assignment);
    const parts: string[] = [];
    parts.push(minimap(world.map, { orders: ten, ariaLabel: "Slop Hill with the ten orders of week 7 labelled." }));
    const finish = (d: string) => plan.tasks.filter((t) => t.drone === d && t.status === "flown").reduce((m, t) => Math.max(m, t.land ?? 0), 0);
    const perDrone = w.fleet.drones.map((d) => ({ drone: droneLabel(d.id), orders: g.assignment[d.id].join(", ") || "—", count: g.assignment[d.id].length, finish: g.assignment[d.id].length ? clock(finish(d.id)) : "—", late: plan.tasks.filter((t) => t.drone === d.id && (t.late ?? 0) > 0).length }));
    const counts = perDrone.map((p) => p.count);
    parts.push(`<p class="wb-summary"><strong>${state.rule === "equal-counts" ? "Equal counts" : "Earliest predicted completion"}:</strong> ${g.unassignable.length ? `${g.unassignable.join(", ")} cannot be flown by any drone in this fleet. ` : ""}${plan.objective ? `lateness ${fmtTicks(plan.objective.lateness)} (${plan.objective.lateCount} late), everyone back by ${clock(plan.objective.allReturned)}.` : "The plan is not complete."} ${Math.max(...counts) - Math.min(...counts.filter((_, i) => perDrone[i].count > 0 || state.rule === "equal-counts")) <= 1 && state.rule === "equal-counts" ? "The counts are level; the finish times are not." : ""}</p>`);
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "orders", label: "orders, in sequence" }, { key: "count", label: "count", align: "right" }, { key: "finish", label: "last landing" }, { key: "late", label: "late", align: "right" }],
      perDrone, "The assignment", (r) => (Number(r.late) > 0 ? "wb-bad" : ""),
    ));
    parts.push(table(
      [{ key: "order", label: "order" }, ...w.fleet.drones.map((d) => ({ key: d.id, label: droneLabel(d.id) }))],
      ten.map((o) => ({ order: `${o.id} (${o.weight} kg)`, ...Object.fromEntries(w.fleet.drones.map((d) => { const f = matrix.find((x) => x.drone === d.id && x.order === o.id)!; return [d.id, f.feasible ? `✓ ${f.ticks} s` : `✗ ${f.reason}`]; })) })),
      "Feasibility and static round-trip time: excluded before any efficiency is compared",
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${matrix.length} pairs checked, ${g.steps.length} placements · ${ms} ms · engine 0.1 · case #01–#09 and #20` };
  },
};
