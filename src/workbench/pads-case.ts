// Week 8: two charging pads. With charging off a drone is available again
// after its turnaround; with it on, after a pad has charged it — first come
// first served, two at a time. Move one order and a third drone's plan
// changes through the queue.

import { greedyAssign } from "../engine/assign.ts";
import { evaluate, type Assignment } from "../engine/fleet.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, fmtTicks, table } from "./html.ts";
import { droneLabel, world } from "./world.ts";

export interface PadsState {
  charging: boolean;
  migrated: boolean;
}

const base = greedyAssign(world).assignment;
function migrated(): Assignment {
  const a: Assignment = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, [...v]]));
  // move the busiest drone's last order to the drone with the fewest
  const ids = Object.keys(a);
  const busiest = ids.reduce((x, y) => (a[y].length > a[x].length ? y : x));
  const idle = ids.reduce((x, y) => (a[y].length < a[x].length ? y : x));
  const moved = a[busiest].pop()!;
  a[idle].push(moved);
  return a;
}
const migratedAssignment = migrated();
const movedOrder = Object.entries(migratedAssignment).flatMap(([d, l]) => l.filter((o) => !(base[d] ?? []).includes(o)).map((o) => ({ o, d })))[0];

export const padsCase: CaseDef<PadsState> = {
  key: "pads",
  weeks: [8],
  caption: () => ({
    decision: "When is a drone available again: after its own turnaround, or after a pad has charged it — and who is in the queue ahead of it.",
    breaks: "Week 7's 'available = back plus turnaround'.",
  }),
  initial: () => ({ charging: false, migrated: false }),
  controls: (state): Control[] => [
    { id: "charging", label: `Charging: ${state.charging ? "on, two pads" : "off"} — switch ${state.charging ? "off" : "on"}`, kind: "button", primary: true },
    { id: "migrated", label: state.migrated ? `Put ${movedOrder.o} back` : `Move ${movedOrder.o} to ${movedOrder.d}`, kind: "button" },
  ],
  apply: (state, action) => {
    if (action.id === "charging") return { ...state, charging: !state.charging };
    if (action.id === "migrated") return { ...state, migrated: !state.migrated };
    return state;
  },
  render: (state) => {
    const t0 = Date.now();
    const assignment = state.migrated ? migratedAssignment : base;
    const plan = evaluate(world, assignment, { charging: state.charging });
    const other = evaluate(world, assignment, { charging: !state.charging });
    const parts: string[] = [];
    const flown = plan.tasks.filter((t) => t.status === "flown");
    const queued = flown.filter((t) => t.chargeStart !== undefined && t.chargeStart > t.land! + world.rules.turnaroundTicks);
    parts.push(`<p class="wb-summary"><strong>Charging ${state.charging ? "on" : "off"}${state.migrated ? `, ${movedOrder.o} moved to ${movedOrder.d}` : ""}:</strong> ${plan.objective ? `lateness ${fmtTicks(plan.objective.lateness)} (${plan.objective.lateCount} late), everyone back by ${clock(plan.objective.allReturned)}` : "plan incomplete"}. ${state.charging ? `${flown.filter((t) => t.chargeStart !== undefined).length} charges; ${queued.length} of them waited for a pad${queued.length ? ` (${queued.map((t) => `${t.drone} after ${t.order}: ${t.chargeStart! - t.land! - world.rules.turnaroundTicks} s`).join(", ")})` : ""}.` : `With charging on the same assignment would be back by ${other.objective ? clock(other.objective.allReturned) : "—"}.`}</p>`);
    parts.push(table(
      [{ key: "drone", label: "drone" }, { key: "order", label: "order" }, { key: "start", label: "start" }, { key: "land", label: "land" }, { key: "charge", label: "charge" }, { key: "available", label: "available" }, { key: "late", label: "late", align: "right" }],
      flown.map((t) => ({ drone: droneLabel(t.drone), order: t.order, start: clock(t.start), land: clock(t.land!), charge: t.chargeStart !== undefined ? `${clock(t.chargeStart)}–${clock(t.chargeEnd!)}${t.chargeStart > t.land! + world.rules.turnaroundTicks ? " (queued)" : ""}` : "—", available: clock(t.available!), late: t.late ? fmtTicks(t.late) : "—" })),
      `Every task, in order of start${state.charging ? "; a charge marked queued began after the drone asked because both pads were busy" : ""}`,
      (r) => (String(r.charge).includes("queued") ? "wb-bad" : r.late !== "—" ? "wb-bad" : ""),
    ));
    if (state.charging) {
      const pads = plan.occupancies.filter((o) => o.resource === "pads").sort((a, b) => a.start - b.start);
      parts.push(table(
        [{ key: "from", label: "from" }, { key: "to", label: "to" }, { key: "drone", label: "drone" }, { key: "after", label: "after order" }],
        pads.map((o) => ({ from: clock(o.start), to: clock(o.end), drone: o.owner, after: o.task ?? "" })),
        "Pad occupancy, capacity two",
      ));
    }
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${flown.length} tasks, event-driven · ${ms} ms · engine 0.1 · case all twenty orders, greedy assignment` };
  },
};
