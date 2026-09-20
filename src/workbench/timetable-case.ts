// Weeks 5 and 6: one light drone, the six orders of assignment 1. FIFO and
// earliest-deadline timetables under the course objective; then the swap
// improver with every accepted move; then all 720 permutations, which beat
// the swaps and say by how much.

import type { FleetData, MapData, OrdersData, RulesData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import rulesJson from "../data/rules.json";
import { compareObjective, earliestDeadline, enumerate, fifo, improveBySwaps, jobsOf, mapCost, timetable, type Job, type Objective } from "../engine/timetable.ts";
import type { CaseDef, Control } from "./case.ts";
import { clock, esc, fmtTicks, kJ, table } from "./html.ts";
import { minimap } from "./minimap.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const rules = rulesJson as unknown as RulesData;
const orders = (ordersJson as OrdersData).orders;
const six = orders.slice(0, 6);
const L = fleet.types.find((t) => t.id === "L")!;
const cost = mapCost(map, rules, L, six);
const opts = { loadingTicks: rules.loadingTicks, turnaroundTicks: rules.turnaroundTicks };
const jobs = jobsOf(six);
const dish = new Map(six.map((o) => [o.id, o.label]));

export interface TimetableState {
  rule: "fifo" | "edf" | "swaps" | "enumerate";
}

const objectiveText = (o?: Objective) => (o ? `lateness ${fmtTicks(o.lateness)} (${o.lateCount} late), all back ${clock(o.allReturned)}, ${kJ(o.energy)}` : "no feasible timetable");
const seqText = (s: Job[] | string[]) => s.map((j) => (typeof j === "string" ? j : j.id)).join(" → ");

function timetableTable(sequence: Job[], caption: string): string {
  const t = timetable(sequence, cost, opts);
  const byId = new Map(six.map((o) => [o.id, o]));
  return table(
    [{ key: "id", label: "order" }, { key: "dish", label: "dish" }, { key: "ready", label: "ready" }, { key: "depart", label: "depart" }, { key: "deliver", label: "deliver" }, { key: "promised", label: "promised" }, { key: "late", label: "late", align: "right" }, { key: "ret", label: "back" }],
    t.slots.map((s) => ({ id: s.id, dish: dish.get(s.id), ready: clock(byId.get(s.id)!.ready), depart: clock(s.depart), deliver: clock(s.deliver), promised: clock(byId.get(s.id)!.promised), late: s.late ? fmtTicks(s.late) : "—", ret: clock(s.ret) })),
    `${caption} — ${objectiveText(t.objective)}`,
    (r) => (r.late !== "—" ? "wb-bad" : ""),
  );
}

export const timetableCase: CaseDef<TimetableState> = {
  key: "timetable",
  weeks: [5, 6],
  caption: (week) =>
    week === 5
      ? { decision: "Which order goes first: the one that is ready, or the one whose promise is nearest — judged by the objective the course fixed, total lateness first.", breaks: "Week 4's single task: each order feasible on its own does not make any order of them on time." }
      : { decision: "Accept a swap only when it strictly improves the objective, and call the result a local optimum only after every swap has been checked.", breaks: "Week 5's best rule: the swaps beat it, and the 720 permutations beat the swaps." },
  initial: (week) => ({ rule: week === 5 ? "fifo" : "swaps" }),
  controls: (state, week): Control[] => [
    { id: "rule", label: "Method", kind: "select", value: state.rule, primary: week === 5, options: [
      { value: "fifo", label: "FIFO — ready time first" },
      { value: "edf", label: "earliest deadline first" },
      { value: "swaps", label: "best-improvement swaps from earliest deadline" },
      { value: "enumerate", label: "all 720 permutations" },
    ] },
    ...(week === 6 && state.rule !== "enumerate" ? [{ id: "enumerate", label: "Run all 720 permutations", kind: "button" as const, primary: true }] : []),
  ],
  apply: (state, action) => {
    if (action.id === "rule") return { rule: (action.value as TimetableState["rule"]) ?? state.rule };
    if (action.id === "enumerate") return { rule: "enumerate" };
    return state;
  },
  render: (state) => {
    const t0 = Date.now();
    const parts: string[] = [];
    parts.push(minimap(map, { orders: six, box: [0, 0, 2000, 2000], ariaLabel: "Slop Hill with the six orders of assignment 1 labelled." }));
    let count = 0;
    if (state.rule === "fifo" || state.rule === "edf") {
      const seq = state.rule === "fifo" ? fifo(jobs) : earliestDeadline(jobs);
      const other = state.rule === "fifo" ? earliestDeadline(jobs) : fifo(jobs);
      const mine = timetable(seq, cost, opts), theirs = timetable(other, cost, opts);
      const cmp = compareObjective(mine.objective, theirs.objective);
      parts.push(`<p class="wb-summary"><strong>${state.rule === "fifo" ? "FIFO" : "Earliest deadline first"}:</strong> ${seqText(seq)}. ${esc(objectiveText(mine.objective))}. ${cmp < 0 ? "Better" : cmp > 0 ? "Worse" : "Equal"} than ${state.rule === "fifo" ? "earliest deadline" : "FIFO"} (${esc(objectiveText(theirs.objective))}) under the course objective.</p>`);
      parts.push(timetableTable(seq, state.rule === "fifo" ? "FIFO" : "Earliest deadline first"));
      count = 2;
    } else if (state.rule === "swaps") {
      const start = earliestDeadline(jobs);
      const r = improveBySwaps(start, cost, opts);
      parts.push(`<p class="wb-summary"><strong>Swaps from earliest deadline:</strong> ${r.moves.length} accepted move${r.moves.length === 1 ? "" : "s"}, ${r.neighboursChecked} neighbours checked, stopped as a <em>${r.status}</em>. Start ${esc(objectiveText(timetable(start, cost, opts).objective))}; end ${esc(objectiveText(r.objective))}.</p>`);
      if (r.moves.length) {
        parts.push(table(
          [{ key: "n", label: "#", align: "right" }, { key: "swap", label: "swap" }, { key: "before", label: "before" }, { key: "after", label: "after" }, { key: "seq", label: "sequence" }],
          r.moves.map((m, i) => ({ n: i + 1, swap: `positions ${m.i + 1} and ${m.j + 1}`, before: objectiveText(m.before), after: objectiveText(m.after), seq: seqText(m.sequence) })),
          "Accepted moves, each a strict improvement",
        ));
      }
      parts.push(timetableTable(r.sequence, "After the swaps"));
      count = r.neighboursChecked + 1;
    } else {
      const e = enumerate(jobs, cost, opts);
      const r = improveBySwaps(earliestDeadline(jobs), cost, opts);
      const gap = compareObjective(e.best, r.objective);
      parts.push(`<p class="wb-summary"><strong>All ${e.count} permutations:</strong> best ${esc(objectiveText(e.best))}, reached by ${e.optima.length} sequence${e.optima.length === 1 ? "" : "s"}. The swaps stopped at ${esc(objectiveText(r.objective))} — ${gap < 0 ? "the enumeration is better: a local optimum is not the optimum." : "the same value: here the swaps did reach the optimum."}</p>`);
      parts.push(table([{ key: "n", label: "#", align: "right" }, { key: "seq", label: "optimal sequence" }], e.optima.map((s, i) => ({ n: i + 1, seq: seqText(s) })), `Sequence${e.optima.length === 1 ? "" : "s"} at the optimum`));
      const bestJobs = e.optima[0].map((id) => jobs.find((j) => j.id === id)!);
      parts.push(timetableTable(bestJobs, "One optimal timetable"));
      count = e.count;
    }
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${count} timetable${count === 1 ? "" : "s"} evaluated · ${ms} ms · engine 0.1 · case #01–#06, type L` };
  },
};
