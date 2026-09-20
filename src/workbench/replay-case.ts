// Week 12: the twenty-order reference plan, re-evaluated and replayed.
// Pick an order and see its chain: when it was ready, when its drone was
// free and why, the route out, the corridor, the delivery against the
// promise, the landing, the charge.

import { evaluate } from "../engine/fleet.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, esc, fmtTicks, kJ, table } from "./html.ts";
import { minimap } from "./minimap.ts";
import { droneLabel, reference, world } from "./world.ts";

export interface ReplayState {
  order: string;
}

export const replayCase: CaseDef<ReplayState> = {
  key: "replay",
  weeks: [12],
  caption: () => ({
    decision: "Settle every order: delivered when, by whom, against which promise, and why then — from the records, not from the planner's word.",
    breaks: "Nothing new: this is the whole semester, checked.",
  }),
  initial: () => ({ order: "#07" }),
  controls: (state): Control[] => [
    { id: "order", label: "Order", kind: "select", primary: true, value: state.order, options: world.orders.map((o) => ({ value: o.id, label: `${o.id} — ${o.label}` })) },
  ],
  apply: (state, action) => (action.id === "order" && action.value ? { order: action.value } : state),
  render: (state) => {
    const t0 = Date.now();
    const plan = evaluate(world, reference.reference.assignment, { charging: true, corridor: true });
    const parts: string[] = [];
    const t = plan.tasks.find((x) => x.order === state.order)!;
    const o = world.orders.find((x) => x.id === state.order)!;
    const mine = plan.tasks.filter((x) => x.drone === t.drone && x.status === "flown");
    const prev = mine[mine.findIndex((x) => x.order === t.order) - 1];
    parts.push(minimap(world.map, {
      routes: t.status === "flown" ? [{ path: t.pathOut!, cls: "route-chosen", label: `${t.drone} out to ${t.order}` }, { path: t.pathBack!, cls: "route-return", label: `${t.drone} → Kitchen (return)` }] : [],
      orders: [o],
      ariaLabel: `${t.order}'s route out (solid) and back (dashed) on Slop Hill.`,
    }));
    if (t.status === "flown") {
      const why = prev ? `Its drone ${t.drone} was free at ${clock(t.start)}${prev.chargeEnd ? ` — after charging until ${clock(prev.chargeEnd)} following ${prev.order}` : ` — after ${prev.order}'s turnaround`}; the order was ready at ${clock(o.ready)}, so the task started at ${clock(t.start)}.` : `Its drone ${t.drone} was free from the start; the order was ready at ${clock(o.ready)}, so the task started at ${clock(t.start)}.`;
      parts.push(`<p class="wb-summary"><strong>${o.id}, ${esc(o.label)}:</strong> delivered by ${droneLabel(t.drone)} at ${clock(t.deliver!)}, promised ${clock(o.promised)} — ${t.late ? `<strong>${fmtTicks(t.late)} late</strong>` : "on time"}. ${esc(why)} Take-off ${clock(t.depart!)}${t.groundWait ? ` after ${t.groundWait} s on the ground for the corridor` : ""}${t.hover ? `, ${t.hover} s hovering` : ""}; landed ${clock(t.land!)}; ${kJ(t.energyUsed!)}.</p>`);
    } else {
      parts.push(`<p class="wb-summary"><strong>${o.id}:</strong> not flown — ${esc(t.reason ?? "")}.</p>`);
    }
    parts.push(`<p>${plan.onTime} of 20 on time; ${plan.validation.ok ? "the validator finds no violation" : "the validator reports violations"}; ${plan.occupancies.filter((x) => x.resource === "corridor").length} corridor passages, ${plan.occupancies.filter((x) => x.resource === "pads").length} charges; everyone back by ${clock(plan.objective!.allReturned)}.</p>`);
    parts.push(table(
      [{ key: "order", label: "order" }, { key: "drone", label: "drone" }, { key: "ready", label: "ready" }, { key: "depart", label: "take-off" }, { key: "deliver", label: "delivered" }, { key: "promised", label: "promised" }, { key: "late", label: "late", align: "right" }, { key: "land", label: "landed" }],
      plan.tasks.map((x) => { const oo = world.orders.find((y) => y.id === x.order)!; return { order: x.order + (x.order === state.order ? " ◀" : ""), drone: x.drone, ready: clock(oo.ready), depart: x.depart !== undefined ? clock(x.depart) : "—", deliver: x.deliver !== undefined ? clock(x.deliver) : "—", promised: clock(oo.promised), late: x.late ? fmtTicks(x.late) : "—", land: x.land !== undefined ? clock(x.land) : "—" }; }),
      "All twenty, in order of start",
      (r) => (String(r.order).includes("◀") ? "wb-good" : r.late !== "—" ? "wb-bad" : ""),
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · the reference assignment re-evaluated, 20 tasks · ${ms} ms · engine 0.1 · reference plan, re-validated live` };
  },
};
