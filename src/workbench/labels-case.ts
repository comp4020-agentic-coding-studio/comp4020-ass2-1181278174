// Week 4: the two routes to #07. The fastest round trip is over the light
// drone's budget; a slower, cheaper one is flown. The wrong version keeps one
// label per node — the fastest — and reports no feasible route.

import type { FleetData, MapData, OrdersData, RulesData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import rulesJson from "../data/rules.json";
import { pathOf } from "../engine/labels.ts";
import { planTask } from "../engine/task.ts";
import type { CaseDef, Control } from "./case.ts";
import { esc, kJ, table } from "./html.ts";
import { elevationProfile } from "./profile";
import { minimap } from "./minimap.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const rules = rulesJson as unknown as RulesData;
const orders = (ordersJson as OrdersData).orders;

export interface LabelsState {
  drone: "L" | "H";
  fastestOnly: boolean;
  route: "both" | "fastest" | "chosen";
}

export const labelsCase: CaseDef<LabelsState> = {
  key: "labels",
  weeks: [4],
  caption: () => ({
    decision: "Keep the fast route or the cheap one to #07 — and keep both labels until the whole round trip is costed.",
    breaks: "Week 3's habit of keeping one best value per node.",
  }),
  initial: () => ({ drone: "L", fastestOnly: false, route: "both" }),
  controls: (state): Control[] => [
    { id: "fastestOnly", label: `Keep only the fastest label per node: ${state.fastestOnly ? "on (the wrong version)" : "off"} — switch ${state.fastestOnly ? "off" : "on"}`, kind: "button", primary: true },
    { id: "route", label: "Map focus", kind: "select", value: state.route, options: [{ value: "both", label: "Compare both routes" }, { value: "fastest", label: "Fastest route" }, { value: "chosen", label: "Route within budget" }] },
    { id: "drone", label: "Drone type", kind: "select", value: state.drone, options: [{ value: "L", label: "L — light: 95 kJ, 1.5 kg" }, { value: "H", label: "H — heavy: 250 kJ, 4 kg" }] },
  ],
  apply: (state, action) => {
    switch (action.id) {
      case "fastestOnly": return { ...state, fastestOnly: !state.fastestOnly };
      case "route": return { ...state, route: action.value as LabelsState["route"] };
      case "drone": return { ...state, drone: action.value === "H" ? "H" : "L" };
      default: return state;
    }
  },
  render: (state) => {
    const t0 = Date.now();
    const type = fleet.types.find((t) => t.id === state.drone)!;
    const order = orders[6];
    const p = planTask({ map, rules, type, order, loadFrom: 0, keepOnly: state.fastestOnly ? "fastest" : "pareto" });
    const right = state.fastestOnly ? planTask({ map, rules, type, order, loadFrom: 0 }) : p;
    const parts: string[] = [];

    const routes = [];
    if (right.fastest && right.fastest !== right.chosen) routes.push({ path: pathOf(right.fastest.out), cls: "route-fastest", label: "Fastest outbound route" });
    if (right.chosen) routes.push({ path: pathOf(right.chosen.out), cls: "route-chosen", label: "Outbound route within budget" });
    else if (right.fastest) routes.push({ path: pathOf(right.fastest.out), cls: "route-fastest", label: "Fastest outbound route" });
    const focused = routes.filter((r) => state.route === "both" || (state.route === "fastest" ? r.cls === "route-fastest" || right.fastest === right.chosen : r.cls === "route-chosen"));
    parts.push(`<p class="wb-summary"><strong>Kitchen → #07 Summit → Kitchen.</strong> Compare complete round trips against a ${(p.budget / 1000).toFixed(2)} kJ usable budget. The map and height profile show the loaded outbound leg.</p>`);
    const candidates = [{ name: "Fastest round trip", c: right.fastest, color: "#a35218" }, { name: "Chosen round trip", c: right.chosen, color: "#28705b" }].filter((x) => x.c);
    parts.push(`<div class="route-comparison">${candidates.map(({ name, c, color }) => `<div class="route-option" style="--route-color:${color}"><strong>${name}</strong><p>${c!.time} s · ${kJ(c!.energy)}</p><p>${c!.energy > p.budget ? `Over budget by ${kJ(c!.energy - p.budget)}` : `Within budget · ${kJ(p.budget - c!.energy)} margin`}</p></div>`).join("")}</div>`);
    parts.push(minimap(map, { routes: focused, orders: [order], ariaLabel: `Kitchen and summit, with directional routes. ${focused.map((r) => r.label).join("; ")}.` }));
    parts.push(elevationProfile(map, focused));
    parts.push(`<p class="map-key">A steeper segment means more climb per metre. The full-trip totals also include service and the unloaded return. ${state.fastestOnly ? "The map retains the full-label comparison so you can see the route the fastest-only search discards." : ""}</p>`);

    const budgetLine = `Budget for ${type.label} drone ${type.id}: ${kJ(p.budget)} (battery ${kJ(type.batteryJ)} less the ${Math.round(rules.reserveFraction * 100)}% reserve).`;
    if (p.status === "found" && p.fastest && p.chosen) {
      if (p.fastest !== p.chosen) {
        parts.push(`<p class="wb-summary"><strong>The fastest round trip is over budget.</strong> Fastest: ${p.fastest.time} s, ${kJ(p.fastest.energy)}. Flown: ${p.chosen.time} s, ${kJ(p.chosen.energy)} — ${p.chosen.time - p.fastest.time} s slower, ${kJ(p.fastest.energy - p.chosen.energy)} cheaper. ${esc(budgetLine)}</p>`);
      } else {
        parts.push(`<p class="wb-summary"><strong>The fastest round trip fits the budget.</strong> ${p.fastest.time} s, ${kJ(p.fastest.energy)}. ${esc(budgetLine)}${p.candidates.length > 1 ? ` ${p.candidates.length - 1} slower, cheaper candidate${p.candidates.length > 2 ? "s were" : " was"} kept and not needed.` : ""}</p>`);
      }
    } else if (p.status === "infeasible-payload") {
      parts.push(`<p class="wb-summary"><strong>Payload first:</strong> ${order.id} weighs ${order.weight} kg and type ${type.id} carries ${type.payloadKg} kg. No search is run.</p>`);
    } else {
      const wrong = state.fastestOnly && right.chosen;
      parts.push(`<p class="wb-summary"><strong>No feasible round trip found</strong> (${p.status}). ${p.fastest ? `The only candidate kept, ${p.fastest.time} s at ${kJ(p.fastest.energy)}, is over budget.` : ""} ${esc(budgetLine)}${wrong ? ` <strong>This is the wrong answer.</strong> With every non-dominated label kept, the ${right.chosen!.time} s round trip at ${kJ(right.chosen!.energy)} fits the budget and is flown.` : ""}</p>`);
    }

    parts.push(`<details><summary>Inspect candidates and resource labels</summary>`);
    parts.push(table(
      [{ key: "n", label: "#", align: "right" }, { key: "time", label: "round trip (s)", align: "right" }, { key: "energy", label: "energy", align: "right" }, { key: "verdict", label: "verdict" }, { key: "out", label: "route out" }],
      p.candidates.map((c, i) => ({
        n: i + 1, time: c.time, energy: kJ(c.energy),
        verdict: c.energy <= p.budget ? (c === p.chosen ? "✓ within budget — flown" : "✓ within budget") : "✗ over budget",
        out: pathOf(c.out).join(" → "),
      })),
      `Non-dominated round trips to ${order.id} for type ${type.id}${state.fastestOnly ? " (fastest-only version)" : ""}`,
      (r) => (String(r.verdict).startsWith("✗") ? "wb-bad" : String(r.verdict).includes("flown") ? "wb-good" : ""),
    ));

    parts.push(table(
      [{ key: "time", label: "time out (s)", align: "right" }, { key: "energy", label: "energy out", align: "right" }],
      p.outAtGoal.map((l) => ({ time: l.time, energy: kJ(l.energy) })),
      `Labels kept at ${order.id} after the outbound search: ${p.outAtGoal.length}. Pruned on the way: ${p.pruned.dominated} dominated, ${p.pruned.overBudget} over budget${state.fastestOnly ? `, ${p.pruned.notFastest} not the fastest` : ""}.`,
    ));

    parts.push("</details>");
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${p.candidates.length} candidates · ${ms} ms · engine 0.1 · case ${order.id} hilltop, type ${type.id}${state.fastestOnly ? ", fastest-only" : ""}` };
  },
};
