// Week 10: prioritised planning. Two drones, two orders across the corridor,
// both ready at once. The drone planned first gets the corridor; the other
// is planned against its reservations and waits on the ground. Swap the
// order and the waiting changes hands. Neither is the joint optimum, and
// the page says so.

import { fromMap } from "../engine/graph.ts";
import { ReservationTable } from "../engine/reservations.ts";
import { search } from "../engine/search.ts";
import { planSpaceTimeTask } from "../engine/spacetime.ts";
import type { CaseDef, Control } from "./case.ts";
import { kJ, table } from "./html.ts";
import { minimap } from "./minimap.ts";
import { world } from "./world.ts";

const L = world.fleet.types.find((t) => t.id === "L")!;
// two orders whose shortest route uses the corridor: #13 and the next best such order
const time = fromMap(world.map, L, "time");
const corridorIds = new Set(world.map.edges.filter((e) => e.resource === "corridor").map((e) => e.id));
const usesCorridor = (node: string) => {
  const r = search(time, world.map.kitchen, node);
  if (r.status !== "found") return false;
  for (let i = 1; i < r.path!.length; i++) if (corridorIds.has(`${r.path![i - 1]}>${r.path![i]}`)) return true;
  return false;
};
const across = world.orders.filter((o) => usesCorridor(o.node) && o.weight <= L.payloadKg);
const orderA = across.find((o) => o.id === "#13") ?? across[0];
const orderB = across.find((o) => o.id !== orderA.id) ?? across[0];

export interface PriorityState {
  first: "A" | "B";
}

interface Flown {
  drone: string;
  order: string;
  groundWait: number;
  hover: number;
  corridor: string;
  deliver: number;
  land: number;
  energy: number;
  pathOut: string[];
  status: string;
}

function plan(first: "A" | "B"): { rows: Flown[]; table: ReservationTable } {
  const table = new ReservationTable({ corridor: 1, pads: 2 });
  const order = first === "A" ? [["A", orderA], ["B", orderB]] as const : [["B", orderB], ["A", orderA]] as const;
  const rows: Flown[] = [];
  for (const [drone, o] of order) {
    const r = planSpaceTimeTask({ map: world.map, rules: world.rules, type: L, order: o, table, drone, depart: world.rules.loadingTicks });
    if (r.status !== "found") { rows.push({ drone, order: o.id, groundWait: 0, hover: 0, corridor: "—", deliver: 0, land: 0, energy: 0, pathOut: [], status: r.status }); continue; }
    const cor = [...r.out.occupancies, ...r.back.occupancies].filter((x) => x.resource === "corridor").map((x) => `[${x.start}, ${x.end})`).join(" ");
    const takeOff = world.rules.loadingTicks + r.out.groundWait;
    const deliver = takeOff + (r.out.ticks - r.out.groundWait) + world.rules.serviceTicks;
    rows.push({ drone, order: o.id, groundWait: r.out.groundWait, hover: r.out.hover + r.back.hover, corridor: cor, deliver, land: deliver + r.back.ticks, energy: r.energy, pathOut: r.out.path, status: "found" });
  }
  return { rows: rows.sort((x, y) => x.drone.localeCompare(y.drone)), table };
}

export const priorityCase: CaseDef<PriorityState> = {
  key: "priority",
  weeks: [10],
  caption: () => ({
    decision: "Who is planned first: the first drone gets the corridor, the second is planned around it — and the choice is not the joint optimum, only a way to find a joint plan.",
    breaks: "Week 9's hand-made waits: the search now places them, on the ground if it can.",
  }),
  initial: () => ({ first: "A" }),
  controls: (state): Control[] => [
    { id: "first", label: "Planned first", kind: "radio", primary: true, value: state.first, options: [{ value: "A", label: `A (${orderA.id})` }, { value: "B", label: `B (${orderB.id})` }] },
  ],
  apply: (state, action) => (action.id === "first" && action.value ? { first: action.value as "A" | "B" } : state),
  render: (state) => {
    const t0 = Date.now();
    const mine = plan(state.first);
    const theirs = plan(state.first === "A" ? "B" : "A");
    const parts: string[] = [];
    parts.push(minimap(world.map, {
      routes: mine.rows.filter((r) => r.pathOut.length).map((r) => ({ path: r.pathOut, cls: r.drone === state.first ? "route-chosen" : "route-fastest", label: `${r.drone} out to ${r.order}` })),
      orders: [orderA, orderB],
      box: [200, 400, 1600, 1600],
      ariaLabel: `Two routes through the corridor: ${state.first} planned first (solid), the other planned around it (dashed).`,
    }));
    const wait = (rows: Flown[]) => rows.reduce((s, r) => s + r.groundWait + r.hover, 0);
    const second = mine.rows.find((r) => r.drone !== state.first)!;
    parts.push(`<p class="wb-summary"><strong>${state.first} first:</strong> ${state.first} takes the corridor at ${mine.rows.find((r) => r.drone === state.first)!.corridor}; ${second.drone} is planned around it and ${second.groundWait ? `delays take-off by ${second.groundWait} s on the ground` : second.hover ? `hovers ${second.hover} s` : "needs no wait"}. Total waiting ${wait(mine.rows)} s; with ${state.first === "A" ? "B" : "A"} first it would be ${wait(theirs.rows)} s. ${wait(mine.rows) === wait(theirs.rows) ? "The same either way here." : wait(mine.rows) < wait(theirs.rows) ? "This order waits less, which is not a proof that it is best for everyone." : "The other order waits less; the priority chose who yields, not the best plan."}</p>`);
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "order", label: "order" }, { key: "groundWait", label: "ground wait (s)", align: "right" }, { key: "hover", label: "hover (s)", align: "right" }, { key: "corridor", label: "corridor held" }, { key: "deliver", label: "deliver (s)", align: "right" }, { key: "land", label: "land (s)", align: "right" }, { key: "energy", label: "energy", align: "right" }],
      mine.rows.map((r) => ({ ...r, energy: kJ(r.energy) })),
      `Planned in the order ${state.first} then ${state.first === "A" ? "B" : "A"}; both loading from tick 0`,
      (r) => (Number(r.groundWait) + Number(r.hover) > 0 ? "wb-bad" : "wb-good"),
    ));
    parts.push(table(
      [{ key: "resource", label: "resource" }, { key: "drone", label: "drone" }, { key: "task", label: "task" }, { key: "from", label: "from", align: "right" }, { key: "to", label: "to", align: "right" }],
      mine.table.list("corridor").map((o) => ({ resource: o.resource, drone: o.owner, task: o.task, from: o.start, to: o.end })),
      "The reservation table after both drones are planned",
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · 2 drones planned in space-time, both orders tried · ${ms} ms · engine 0.1 · case ${orderA.id} and ${orderB.id}` };
  },
};
