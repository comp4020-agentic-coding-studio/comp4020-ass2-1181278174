// The home page and week 9: two shortest routes through one corridor. A is
// flying out to #13; B is flying back. Each route is the answer week 2 gives.
// Together they need the corridor at the same time. Three arrangements, each
// costed by the engine and checked by the validator.

import type { FleetData, MapData, OrdersData, RulesData } from "../data/schema.ts";
import caseJson from "../data/cases/corridor-two-drones.json";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import rulesJson from "../data/rules.json";
import { edgeEnergy, edgeTicks, fromMap, hoverEnergy, type MapGraph } from "../engine/graph.ts";
import { ReservationTable } from "../engine/reservations.ts";
import { search } from "../engine/search.ts";
import { validate } from "../engine/validate.ts";
import type { CaseDef, Control } from "./case.ts";
import { esc, kJ, table } from "./html.ts";
import { minimap } from "./minimap.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const rules = rulesJson as unknown as RulesData;
const orders = (ordersJson as OrdersData).orders;
const L = fleet.types.find((t) => t.id === "L")!;
const order = orders.find((o) => o.id === caseJson.a.order)!;
const loaded: MapGraph = fromMap(map, L, "time");
const corridorEdges = map.edges.filter((e) => e.resource === "corridor");
const noCorridor: MapGraph = { ...loaded, neighbours: (id) => loaded.neighbours(id).filter((n) => !corridorEdges.some((e) => e.id === n.edge)) };

interface Flight {
  path: string[];
  ticks: number;
  energy: number;
  /** Corridor entry and exit, relative to take-off; undefined when the route avoids it. */
  corridor?: { enter: number; exit: number };
}

function flight(graph: MapGraph, from: string, to: string, payloadKg: number): Flight {
  const r = search(graph, from, to);
  if (r.status !== "found") throw new Error(`no route ${from} → ${to}`);
  let t = 0, energy = 0;
  let corridor: Flight["corridor"];
  for (let i = 1; i < r.path!.length; i++) {
    const e = map.edges.find((x) => x.from === r.path![i - 1] && x.to === r.path![i])!;
    const dt = edgeTicks(e, L);
    if (e.resource === "corridor") corridor = { enter: t, exit: t + dt };
    t += dt;
    energy += edgeEnergy(e, L, payloadKg);
  }
  return { path: r.path!, ticks: t, energy, corridor };
}

const A = flight(loaded, map.kitchen, order.node, order.weight);
const A_DETOUR = flight(noCorridor, map.kitchen, order.node, order.weight);
const B = flight(loaded, order.node, map.kitchen, 0);
// B takes off so that it enters the corridor leadTicks before A would.
const bTakeOff = caseJson.a.takeOff + A.corridor!.enter - caseJson.b.leadTicks - B.corridor!.enter;
const bWindow = { start: bTakeOff + B.corridor!.enter, end: bTakeOff + B.corridor!.exit };

export interface CorridorState {
  arrangement: "both" | "wait" | "detour";
}

interface Outcome {
  label: string;
  aPath: string[];
  aCorridor?: { start: number; end: number };
  wait: number;
  arrive: number;
  energy: number;
  verdict: string;
  ok: boolean;
}

function outcome(arr: CorridorState["arrangement"]): Outcome {
  const t0 = caseJson.a.takeOff;
  if (arr === "detour") {
    return { label: "A detours around the ridge", aPath: A_DETOUR.path, wait: 0, arrive: t0 + A_DETOUR.ticks, energy: A_DETOUR.energy, verdict: "no shared resource used", ok: true };
  }
  const table = new ReservationTable({ corridor: 1 });
  table.reserve({ resource: "corridor", owner: "B", start: bWindow.start, end: bWindow.end });
  const dur = A.corridor!.exit - A.corridor!.enter;
  const planned = t0 + A.corridor!.enter;
  const enter = arr === "wait" ? table.earliestFree("corridor", planned, dur, "A") : planned;
  const wait = enter - planned;
  const occupancies = [
    { resource: "corridor", owner: "B", start: bWindow.start, end: bWindow.end },
    { resource: "corridor", owner: "A", start: enter, end: enter + dur },
  ];
  const v = validate({ orders: [order.id], activities: [], occupancies, deliveries: [], capacities: Object.fromEntries(Object.entries(rules.resources).map(([k, v]) => [k, v.capacity])), cutoff: rules.evening.cutoffTick });
  const conflict = v.violations.find((x) => x.rule === "capacity");
  return {
    label: arr === "wait" ? "B first; A waits at the west end" : "both fly their own shortest route",
    aPath: A.path,
    aCorridor: { start: enter, end: enter + dur },
    wait,
    arrive: t0 + A.ticks + wait,
    energy: A.energy + hoverEnergy(L, wait),
    verdict: conflict ? `conflict: ${conflict.detail}` : `validated: no violation; A holds the corridor [${enter}, ${enter + dur})`,
    ok: !conflict,
  };
}

function timeline(o: Outcome): string {
  const t1 = Math.max(bWindow.end, o.aCorridor?.end ?? 0, 1) + 10;
  const W = 640, H = 96, x = (t: number) => 60 + (t / t1) * (W - 80);
  const bar = (y: number, s: number, e: number, cls: string, txt: string) => `<rect x="${x(s).toFixed(1)}" y="${y}" width="${(x(e) - x(s)).toFixed(1)}" height="18" class="${cls}"/><text x="${(x(s) + 4).toFixed(1)}" y="${y + 13}" font-size="11" class="mm-label">${esc(txt)}</text>`;
  const overlap = o.aCorridor && Math.max(bWindow.start, o.aCorridor.start) < Math.min(bWindow.end, o.aCorridor.end)
    ? `<rect x="${x(Math.max(bWindow.start, o.aCorridor.start)).toFixed(1)}" y="26" width="${(x(Math.min(bWindow.end, o.aCorridor.end)) - x(Math.max(bWindow.start, o.aCorridor.start))).toFixed(1)}" height="46" class="tl-conflict"/>`
    : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="timeline" role="img" aria-label="Corridor occupancy: B holds ${bWindow.start} to ${bWindow.end}${o.aCorridor ? `; A holds ${o.aCorridor.start} to ${o.aCorridor.end}` : "; A does not use the corridor"}${overlap ? "; they overlap" : ""}.">
    <text x="4" y="40" font-size="12" class="mm-label">B</text><text x="4" y="66" font-size="12" class="mm-label">A</text>
    ${overlap}${bar(28, bWindow.start, bWindow.end, "tl-b", `B ${bWindow.start}–${bWindow.end}`)}${o.aCorridor ? bar(54, o.aCorridor.start, o.aCorridor.end, o.ok ? "tl-a" : "tl-a tl-bad", `A ${o.aCorridor.start}–${o.aCorridor.end}`) : `<text x="60" y="67" font-size="11" class="mm-label">A avoids the corridor</text>`}
    <line x1="60" y1="80" x2="${W - 20}" y2="80" class="tl-axis"/><text x="60" y="93" font-size="10" class="mm-label">0 s</text><text x="${W - 20}" y="93" font-size="10" text-anchor="end" class="mm-label">${t1} s after A's take-off</text>
  </svg>`;
}

export const corridorCase: CaseDef<CorridorState> = {
  key: "corridor",
  weeks: [9],
  caption: () => ({
    decision: "Two routes, each the shortest for its drone, want the same corridor at the same time: who goes first, who waits, or who goes round.",
    breaks: "Week 2's answer: a shortest path is not yet a plan.",
  }),
  initial: () => ({ arrangement: "both" }),
  controls: (state): Control[] => [
    { id: "arrangement", label: "Arrangement", kind: "radio", primary: true, value: state.arrangement, options: [
      { value: "both", label: "both depart as planned" },
      { value: "wait", label: "B first, A waits" },
      { value: "detour", label: "A detours" },
    ] },
  ],
  apply: (state, action) => (action.id === "arrangement" && action.value ? { arrangement: action.value as CorridorState["arrangement"] } : state),
  render: (state) => {
    const t0 = Date.now();
    const o = outcome(state.arrangement);
    const all = (["both", "wait", "detour"] as const).map((a) => ({ a, o: outcome(a) }));
    const parts: string[] = [];
    parts.push(minimap(map, {
      routes: [{ path: B.path, cls: "route-fastest", label: "B, flying back" }, { path: o.aPath, cls: o.ok ? "route-chosen" : "route-found", label: `A, ${o.label}` }],
      orders: [order],
      waits: o.wait ? [{ node: A.path.find((n, i) => corridorEdges.some((e) => e.from === n && e.to === A.path[i + 1]))!, label: `A hovers ${o.wait} s` }] : [],
      box: [200, 400, 1500, 1500],
      ariaLabel: `The ridge and the corridor. B's route back is dashed; A's route out to ${order.id} is solid: ${o.label}.`,
    }));
    parts.push(timeline(o));
    parts.push(`<p class="wb-summary"><strong>${esc(o.label)}:</strong> ${o.ok ? "✓" : "✗"} ${esc(o.verdict)}. A reaches ${order.id} ${o.arrive} s after take-off${o.wait ? `, ${o.wait} s of them hovering at the west end` : ""}, using ${kJ(o.energy)}.</p>`);
    parts.push(table(
      [{ key: "label", label: "arrangement" }, { key: "corridor", label: "A in the corridor" }, { key: "arrive", label: "A arrives (s)", align: "right" }, { key: "wait", label: "hover (s)", align: "right" }, { key: "energy", label: "A's energy", align: "right" }, { key: "verdict", label: "validator" }],
      all.map(({ a, o: x }) => ({ label: x.label + (a === state.arrangement ? " (shown)" : ""), corridor: x.aCorridor ? `[${x.aCorridor.start}, ${x.aCorridor.end})` : "—", arrive: x.arrive, wait: x.wait, energy: kJ(x.energy), verdict: x.ok ? "✓ no violation" : "✗ conflict" })),
      `B holds the corridor [${bWindow.start}, ${bWindow.end}). The three arrangements for A, all checked by the same validator`,
      (r) => (String(r.verdict).startsWith("✗") ? "wb-bad" : String(r.label).includes("(shown)") ? "wb-good" : ""),
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · 3 arrangements, validator run on each · ${ms} ms · engine 0.1 · case corridor-two-drones` };
  },
};
