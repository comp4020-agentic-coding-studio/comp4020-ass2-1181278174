// The lab's scenario design: the same world, configured. Add up to three
// orders at street corners, close the corridor for a window, choose one to
// three pads and up to five drones. The week-7 greedy assignment is
// evaluated under the week-11 model — charging queue and corridor
// reservations — and checked by the validator, next to the same method on
// the canonical scenario and the reference plan. The design space is a
// configuration of the fixed map: no new streets, no new addresses.

import type { Order } from "../data/schema.ts";
import { greedyAssign } from "../engine/assign.ts";
import { evaluate, type FleetPlan, type World } from "../engine/fleet.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, esc, fmtTicks, kJ, table } from "./html.ts";
import { minimap } from "./minimap.ts";
import { placeName } from "./names.ts";
import { droneLabel, reference, world } from "./world.ts";

export interface Extra {
  node: string;
  weight: number;
  ready: number;
  promised: number;
}

export interface DesignState {
  extra: Extra[];
  /** The form for the next order. */
  node: string;
  weight: string;
  ready: string;
  lead: string;
  /** "none" or "start-end" in ticks. */
  closure: string;
  pads: string;
  light: string;
  heavy: string;
}

const ADDRESSES = world.map.nodes.filter((n) => n.kind !== "kitchen").map((n) => n.id).sort((a, b) => placeName(a).localeCompare(placeName(b)));
const WEIGHTS = ["0.5", "1", "1.5", "2", "3.5"];
const READY = Array.from({ length: 16 }, (_, i) => String(600 + i * 600));
const LEADS = ["20", "30", "45", "60"];
const CLOSURES = ["none", "1800-3600", "3600-5400", "5400-7200", "7200-9000", "1800-5400"];
const PADS = ["1", "2", "3"];
const LIGHT = ["1", "2", "3"];
const HEAVY = ["0", "1", "2"];
const MAX_EXTRA = 3;
const OPTIONS = { charging: true, corridor: true } as const;

const initial = (): DesignState => ({ extra: [], node: "summit", weight: "1", ready: "5400", lead: "30", closure: "none", pads: "2", light: "3", heavy: "2" });

function closureOf(state: DesignState): { start: number; end: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(state.closure);
  return m && CLOSURES.includes(state.closure) ? { start: Number(m[1]), end: Number(m[2]) } : null;
}

/** The extra orders, dropping anything a link carried that is not an order on this map. */
function extrasOf(state: DesignState): Extra[] {
  return (Array.isArray(state.extra) ? state.extra : [])
    .filter((e) => e && ADDRESSES.includes(e.node) && Number.isFinite(e.weight) && Number.isFinite(e.ready) && Number.isFinite(e.promised) && e.promised > e.ready)
    .slice(0, MAX_EXTRA);
}

function scenario(state: DesignState): { w: World; closure: { start: number; end: number } | null; extra: Order[] } {
  const light = LIGHT.includes(state.light) ? Number(state.light) : 3, heavy = HEAVY.includes(state.heavy) ? Number(state.heavy) : 2, pads = PADS.includes(state.pads) ? Number(state.pads) : 2;
  const drones = [...world.fleet.drones.filter((d) => d.type === "L").slice(0, light), ...world.fleet.drones.filter((d) => d.type === "H").slice(0, heavy)];
  const extra: Order[] = extrasOf(state).map((e, i) => ({ id: `#${21 + i}`, node: e.node, ready: e.ready, weight: e.weight, promised: e.promised, label: `your order at ${placeName(e.node)}` }));
  const rules = { ...world.rules, resources: { ...world.rules.resources, pads: { capacity: pads } } };
  return { w: { map: world.map, fleet: { ...world.fleet, drones }, rules, orders: [...world.orders, ...extra] }, closure: closureOf(state), extra };
}

let canonical: { greedy: FleetPlan; reference: FleetPlan } | null = null;
/** The two yardsticks on the canonical scenario, computed once: the same method, and the improved reference plan. */
function yardsticks() {
  if (!canonical) canonical = { greedy: evaluate(world, greedyAssign(world).assignment, OPTIONS), reference: evaluate(world, reference.reference.assignment, OPTIONS) };
  return canonical;
}

const summary = (p: FleetPlan, n: number) => `${p.onTime} of ${n} on time${p.objective ? `, lateness ${fmtTicks(p.objective.lateness)}, everyone back by ${clock(p.objective.allReturned)}, ${kJ(p.objective.energy)}` : ""}`;

export const designCase: CaseDef<DesignState> = {
  key: "design",
  weeks: [],
  caption: () => ({
    decision: "Configure the world — orders, a closed corridor, pads, drones — and let the same planner and the same validator answer for it.",
    breaks: "The canonical scenario's comfort: an order placed well can make the greedy plan late, and the page says by how much.",
  }),
  initial,
  controls: (state): Control[] => [
    { id: "node", label: "New order at", kind: "select", value: state.node, options: ADDRESSES.map((id) => ({ value: id, label: placeName(id) })) },
    { id: "weight", label: "Weight", kind: "select", value: state.weight, options: WEIGHTS.map((v) => ({ value: v, label: `${v} kg` })) },
    { id: "ready", label: "Ready at", kind: "select", value: state.ready, options: READY.map((v) => ({ value: v, label: clock(Number(v)) })) },
    { id: "lead", label: "Promised", kind: "select", value: state.lead, options: LEADS.map((v) => ({ value: v, label: `${v} min after ready` })) },
    { id: "add", label: extrasOf(state).length >= MAX_EXTRA ? `Add this order (${MAX_EXTRA} is the most)` : "Add this order", kind: "button", primary: true },
    { id: "closure", label: "Corridor", kind: "select", value: state.closure, options: CLOSURES.map((v) => { const m = /^(\d+)-(\d+)$/.exec(v); return { value: v, label: m ? `closed ${clock(Number(m[1]))}–${clock(Number(m[2]))}` : "open all evening" }; }) },
    { id: "pads", label: "Charging pads", kind: "select", value: state.pads, options: PADS.map((v) => ({ value: v, label: v })) },
    { id: "light", label: "Light drones", kind: "select", value: state.light, options: LIGHT.map((v) => ({ value: v, label: v })) },
    { id: "heavy", label: "Heavy drones", kind: "select", value: state.heavy, options: HEAVY.map((v) => ({ value: v, label: v })) },
    { id: "reset", label: "Back to the canonical scenario", kind: "button" },
  ],
  apply: (state, action) => {
    const pick = (list: string[], key: keyof DesignState) => (action.value !== undefined && list.includes(action.value) ? { ...state, [key]: action.value } : state);
    switch (action.id) {
      case "node": return pick(ADDRESSES, "node");
      case "weight": return pick(WEIGHTS, "weight");
      case "ready": return pick(READY, "ready");
      case "lead": return pick(LEADS, "lead");
      case "closure": return pick(CLOSURES, "closure");
      case "pads": return pick(PADS, "pads");
      case "light": return pick(LIGHT, "light");
      case "heavy": return pick(HEAVY, "heavy");
      case "add": {
        const extra = extrasOf(state);
        if (extra.length >= MAX_EXTRA || !ADDRESSES.includes(state.node)) return state;
        const ready = READY.includes(state.ready) ? Number(state.ready) : 5400;
        return { ...state, extra: [...extra, { node: state.node, weight: WEIGHTS.includes(state.weight) ? Number(state.weight) : 1, ready, promised: ready + (LEADS.includes(state.lead) ? Number(state.lead) : 30) * 60 }] };
      }
      case "remove": return { ...state, extra: extrasOf(state).filter((_, i) => String(i) !== action.value) };
      case "reset": return initial();
      default: return state;
    }
  },
  render: (state) => {
    const t0 = Date.now();
    const { w, closure, extra } = scenario(state);
    const closures = closure ? [{ resource: "corridor", start: closure.start, end: closure.end, label: "closed" }] : [];
    const g = greedyAssign(w, w.orders);
    const plan = evaluate(w, g.assignment, { ...OPTIONS, closures });
    const yard = yardsticks();
    const parts: string[] = [];
    const corridor = w.map.edges.find((e) => e.resource === "corridor")!;
    const closedText = closure ? `corridor closed ${clock(closure.start)}–${clock(closure.end)}` : "";
    parts.push(minimap(w.map, {
      orders: extra,
      waits: closure ? [{ node: corridor.from, label: closedText }] : [],
      ariaLabel: `Slop Hill with ${extra.length ? `your ${extra.length} added order${extra.length === 1 ? "" : "s"} marked` : "no added order"}${closure ? `; the ${closedText}` : ""}.`,
    }));
    const fleetText = `${w.fleet.drones.length} drone${w.fleet.drones.length === 1 ? "" : "s"} (${w.fleet.drones.filter((d) => d.type === "L").length} light, ${w.fleet.drones.filter((d) => d.type === "H").length} heavy), ${w.rules.resources.pads.capacity} pad${w.rules.resources.pads.capacity === 1 ? "" : "s"}${closure ? `, ${closedText}` : ""}`;
    const problems = [
      ...(g.unassignable.length ? [`${g.unassignable.join(", ")} cannot be flown by any drone in this fleet`] : []),
      ...plan.unscheduled.map((u) => `${u.order} on ${u.drone}: ${u.reason}`),
    ];
    const verdict = problems.length
      ? `<strong>Diagnostic, not a complete plan</strong> — ${esc(problems.join("; "))}.`
      : `${plan.validation.ok ? "✓ validated: no violation" : `✗ the validator found ${plan.validation.violations.length} violation${plan.validation.violations.length === 1 ? "" : "s"}`}.`;
    const late = plan.tasks.filter((t) => (t.late ?? 0) > 0);
    parts.push(`<p class="wb-summary"><strong>Your scenario:</strong> ${w.orders.length} orders, ${esc(fleetText)}. The greedy assignment, evaluated with the charging queue and the corridor reservations: ${esc(summary(plan, w.orders.length))}. ${verdict}${late.length ? ` Late: ${late.map((t) => `${t.order} by ${fmtTicks(t.late!)}`).join(", ")}.` : ""}</p>`);
    parts.push(`<p>The same method on the canonical scenario: ${esc(summary(yard.greedy, 20))}. The reference plan, after the improvement pass: ${esc(summary(yard.reference, 20))}. This page runs the greedy assignment and one full evaluation; the improvement pass is what week 11 adds, and on the canonical scenario it takes the reference script about two minutes, so it is not run here.</p>`);
    if (extra.length) {
      parts.push(`<div class="wb-table wb-editor"><table><caption>Your orders</caption><thead><tr><th scope="col">order</th><th scope="col">at</th><th scope="col">weight</th><th scope="col">ready</th><th scope="col">promised</th><th scope="col">result</th><th scope="col">remove</th></tr></thead><tbody>${extra.map((o, i) => {
        const t = plan.tasks.find((x) => x.order === o.id);
        const res = !t ? "not assigned" : t.status !== "flown" ? `not flown: ${t.reason}` : t.late ? `delivered ${clock(t.deliver!)}, ${fmtTicks(t.late)} late` : `delivered ${clock(t.deliver!)}, on time`;
        return `<tr${!t || t.status !== "flown" || t.late ? ' class="wb-bad"' : ""}><td>${esc(o.id)}</td><td>${esc(placeName(o.node))}</td><td>${o.weight} kg</td><td>${clock(o.ready)}</td><td>${clock(o.promised)}</td><td>${esc(res)}</td><td><button type="button" class="wb-control wb-move" data-control="remove" data-value="${i}" aria-label="remove ${esc(o.id)}">✕</button></td></tr>`;
      }).join("")}</tbody></table></div>`);
    }
    const finish = (d: string) => plan.tasks.filter((t) => t.drone === d && t.status === "flown").reduce((m, t) => Math.max(m, t.land ?? 0), 0);
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "orders", label: "orders, in sequence" }, { key: "finish", label: "last landing" }, { key: "late", label: "late", align: "right" }],
      w.fleet.drones.map((d) => ({ drone: droneLabel(d.id), orders: g.assignment[d.id].join(", ") || "—", finish: g.assignment[d.id].length ? clock(finish(d.id)) : "—", late: plan.tasks.filter((t) => t.drone === d.id && (t.late ?? 0) > 0).length })),
      "The greedy assignment for this scenario",
      (r) => (Number(r.late) > 0 ? "wb-bad" : ""),
    ));
    parts.push(table(
      [{ key: "order", label: "order" }, { key: "drone", label: "drone" }, { key: "depart", label: "take-off" }, { key: "wait", label: "waited", align: "right" }, { key: "deliver", label: "delivered" }, { key: "promised", label: "promised" }, { key: "late", label: "late", align: "right" }, { key: "land", label: "landed" }],
      plan.tasks.map((t) => { const o = w.orders.find((x) => x.id === t.order)!; return { order: t.order, drone: t.drone, depart: t.depart !== undefined ? clock(t.depart) : `not flown: ${t.reason}`, wait: t.status === "flown" ? `${(t.groundWait ?? 0) + (t.hover ?? 0)} s` : "—", deliver: t.deliver !== undefined ? clock(t.deliver) : "—", promised: clock(o.promised), late: t.late ? fmtTicks(t.late) : "—", land: t.land !== undefined ? clock(t.land) : "—" }; }),
      "Every task, in order of start; waited counts ground delay and hovering for the corridor",
      (r) => (r.late !== "—" || String(r.depart).startsWith("not flown") ? "wb-bad" : ""),
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · greedy assignment and one full evaluation, charging and corridor on · ${ms} ms · engine 0.1 · scenario: ${w.orders.length} orders, ${esc(fleetText)}` };
  },
};
