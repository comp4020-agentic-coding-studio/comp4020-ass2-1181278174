// Week 7: which drone takes which order. The feasibility matrix first, then
// the greedy assignment by earliest predicted completion, against equal
// counts: same number of orders each, very different finish times. And an
// assignment made by hand, order by order, evaluated by the same evaluator
// and held to the same validator: a pair that cannot fly is diagnostic,
// never a plan.

import { feasibilityMatrix, greedyAssign } from "../engine/assign.ts";
import { evaluate, type Assignment } from "../engine/fleet.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, esc, fmtTicks, table } from "./html.ts";
import { minimap } from "./minimap.ts";
import { droneLabel, world } from "./world.ts";

const ten = [...world.orders.slice(0, 9), world.orders[19]];

export interface AssignState {
  rule: "earliest-completion" | "equal-counts" | "hand";
  fleet: "light" | "mixed";
  /** Ordered order ids per drone, for the assignment made by hand. */
  hand?: Assignment;
}

function worldFor(state: AssignState) {
  const drones = state.fleet === "light" ? world.fleet.drones.filter((d) => d.type === "L") : world.fleet.drones;
  return { ...world, fleet: { ...world.fleet, drones }, orders: ten };
}

/** The hand assignment, seeded from the greedy one; a link that carries something else falls back to the seed. */
function handOf(state: AssignState): Assignment {
  const w = worldFor(state);
  const drones = w.fleet.drones.map((d) => d.id);
  const seed = greedyAssign(w, ten, "earliest-completion").assignment;
  const h = state.hand;
  if (!h) return seed;
  const all = Object.values(h).flat();
  const valid = Object.keys(h).every((k) => drones.includes(k)) && new Set(all).size === all.length && all.every((id) => ten.some((o) => o.id === id));
  if (!valid) return seed;
  return Object.fromEntries(drones.map((d) => [d, [...(h[d] ?? [])]]));
}

const clone = (a: Assignment): Assignment => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, [...v]]));

export const assignCase: CaseDef<AssignState> = {
  key: "assign",
  weeks: [7],
  caption: () => ({
    decision: "Which drone takes which order: exclude the pairs that cannot fly first, then choose by predicted completion, not by count.",
    breaks: "Week 6's single sequence: with several drones, the order of one is not the plan of all.",
  }),
  initial: () => ({ rule: "equal-counts", fleet: "mixed" }),
  controls: (state): Control[] => [
    { id: "rule", label: "Assignment rule", kind: "radio", primary: true, value: state.rule, options: [{ value: "equal-counts", label: "equal counts" }, { value: "earliest-completion", label: "earliest predicted completion" }, { value: "hand", label: "by hand" }] },
    { id: "fleet", label: "Fleet", kind: "select", value: state.fleet, options: [{ value: "mixed", label: "A, B, C light; D, E heavy" }, { value: "light", label: "A, B, C light only" }] },
  ],
  apply: (state, action) => {
    if (action.id === "rule" && action.value) return { ...state, rule: action.value as AssignState["rule"] };
    if (action.id === "fleet" && action.value) return { ...state, fleet: action.value as AssignState["fleet"], hand: undefined };
    if (action.id.startsWith("assign:")) {
      const order = action.id.slice(7), drone = action.value ?? "";
      const h = clone(handOf(state));
      for (const k of Object.keys(h)) h[k] = h[k].filter((id) => id !== order);
      if (drone in h && ten.some((o) => o.id === order)) h[drone].push(order);
      return { ...state, rule: "hand", hand: h };
    }
    if (action.id.startsWith("up:") || action.id.startsWith("down:")) {
      const order = action.id.slice(action.id.indexOf(":") + 1);
      const h = clone(handOf(state));
      for (const list of Object.values(h)) {
        const i = list.indexOf(order);
        if (i < 0) continue;
        const j = action.id.startsWith("up:") ? i - 1 : i + 1;
        if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      }
      return { ...state, rule: "hand", hand: h };
    }
    return state;
  },
  render: (state) => {
    const t0 = Date.now();
    const w = worldFor(state);
    const matrix = feasibilityMatrix(w, ten);
    const feas = (d: string, o: string) => matrix.find((x) => x.drone === d && x.order === o)!;
    const byHand = state.rule === "hand";
    const g = state.rule === "hand" ? null : greedyAssign(w, ten, state.rule);
    const assignment = byHand ? handOf(state) : g!.assignment;
    const plan = evaluate(w, assignment);
    const parts: string[] = [];
    parts.push(minimap(world.map, { orders: ten, ariaLabel: "Slop Hill with the ten orders of week 7 labelled." }));
    const finish = (d: string) => plan.tasks.filter((t) => t.drone === d && t.status === "flown").reduce((m, t) => Math.max(m, t.land ?? 0), 0);
    const perDrone = w.fleet.drones.map((d) => ({ drone: droneLabel(d.id), orders: assignment[d.id].join(", ") || "—", count: assignment[d.id].length, finish: assignment[d.id].length ? clock(finish(d.id)) : "—", late: plan.tasks.filter((t) => t.drone === d.id && (t.late ?? 0) > 0).length }));
    const counts = perDrone.map((p) => p.count);
    const assigned = new Set(Object.values(assignment).flat());
    const unassigned = ten.filter((o) => !assigned.has(o.id)).map((o) => o.id);
    const result = plan.objective ? `lateness ${fmtTicks(plan.objective.lateness)} (${plan.objective.lateCount} late), everyone back by ${clock(plan.objective.allReturned)}.` : "The plan is not complete.";
    if (byHand) {
      const problems = [...plan.unscheduled.map((u) => `${u.order} on ${u.drone}: ${u.reason}`), ...(unassigned.length ? [`not assigned to anyone: ${unassigned.join(", ")}`] : [])];
      const greedyPlan = evaluate(w, greedyAssign(w, ten, "earliest-completion").assignment);
      const equalPlan = evaluate(w, greedyAssign(w, ten, "equal-counts").assignment);
      const back = (p: typeof plan) => (p.objective ? clock(p.objective.allReturned) : "incomplete");
      parts.push(`<p class="wb-summary"><strong>Your assignment:</strong> ${problems.length ? `<strong>diagnostic, not a plan</strong> — ${esc(problems.join("; "))}. The validator does not pass a plan with an order left out.` : `${esc(result)} ${plan.validation.ok ? "✓ validated: no violation." : "✗ the validator found a violation."}`} Earliest predicted completion would have everyone back by ${back(greedyPlan)}, equal counts by ${back(equalPlan)}.</p>`);
      parts.push(board(w.fleet.drones.map((d) => d.id), assignment, (d, o) => { const f = feas(d, o); return f.feasible ? `${f.ticks} s` : `✗ ${f.reason}`; }));
    } else {
      parts.push(`<p class="wb-summary"><strong>${state.rule === "equal-counts" ? "Equal counts" : "Earliest predicted completion"}:</strong> ${g!.unassignable.length ? `${g!.unassignable.join(", ")} cannot be flown by any drone in this fleet. ` : ""}${esc(result)} ${Math.max(...counts) - Math.min(...counts.filter((_, i) => perDrone[i].count > 0 || state.rule === "equal-counts")) <= 1 && state.rule === "equal-counts" ? "The counts are level; the finish times are not." : ""}</p>`);
    }
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "orders", label: "orders, in sequence" }, { key: "count", label: "count", align: "right" }, { key: "finish", label: "last landing" }, { key: "late", label: "late", align: "right" }],
      perDrone, byHand ? "The assignment as it stands" : "The assignment", (r) => (Number(r.late) > 0 ? "wb-bad" : ""),
    ));
    parts.push(table(
      [{ key: "order", label: "order" }, ...w.fleet.drones.map((d) => ({ key: d.id, label: droneLabel(d.id) }))],
      ten.map((o) => ({ order: `${o.id} (${o.weight} kg)`, ...Object.fromEntries(w.fleet.drones.map((d) => { const f = feas(d.id, o.id); return [d.id, f.feasible ? `✓ ${f.ticks} s` : `✗ ${f.reason}`]; })) })),
      "Feasibility and static round-trip time: excluded before any efficiency is compared",
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${matrix.length} pairs checked, ${byHand ? "3 plans evaluated" : `${g!.steps.length} placements`} · ${ms} ms · engine 0.1 · case #01–#09 and #20` };
  },
};

/** One row per order: which drone, its place in that drone's sequence, and the static cost of the pair. */
function board(drones: string[], assignment: Assignment, cost: (drone: string, order: string) => string): string {
  const where = new Map<string, { drone: string; i: number; n: number }>();
  for (const d of drones) assignment[d]?.forEach((o, i) => where.set(o, { drone: d, i, n: assignment[d].length }));
  const rows = ten.map((o) => {
    const at = where.get(o.id);
    const options = [`<option value=""${at ? "" : " selected"}>— nobody</option>`, ...drones.map((d) => `<option value="${d}"${at?.drone === d ? " selected" : ""}>${esc(droneLabel(d))}</option>`)].join("");
    const moves = at
      ? `<button type="button" class="wb-control wb-move" data-control="up:${esc(o.id)}" aria-label="fly ${esc(o.id)} earlier on ${at.drone}"${at.i === 0 ? " disabled" : ""}>▲</button> <button type="button" class="wb-control wb-move" data-control="down:${esc(o.id)}" aria-label="fly ${esc(o.id)} later on ${at.drone}"${at.i === at.n - 1 ? " disabled" : ""}>▼</button>`
      : "";
    return `<tr${at && cost(at.drone, o.id).startsWith("✗") ? ' class="wb-bad"' : ""}><td>${esc(o.id)} (${o.weight} kg)</td><td><select data-control="assign:${esc(o.id)}" aria-label="drone for ${esc(o.id)}">${options}</select></td><td class="num">${at ? at.i + 1 : "—"}</td><td class="wb-moves">${moves}</td><td>${at ? esc(cost(at.drone, o.id)) : "—"}</td></tr>`;
  }).join("");
  return `<div class="wb-table wb-editor"><table><caption>Who flies what: choose a drone for each order, then move it within that drone's sequence</caption><thead><tr><th scope="col">order</th><th scope="col">drone</th><th scope="col" class="num">position</th><th scope="col">move</th><th scope="col">static round trip</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
