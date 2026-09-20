// Weeks 5 and 6: one light drone, the six orders of assignment 1. FIFO and
// earliest-deadline timetables under the course objective; the swap
// improver with every accepted move; all 720 permutations, which say how
// far the swaps stopped from the optimum; and a sequence made by hand, one
// move at a time, costed by the same recurrence and held to the same
// objective.

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
  rule: "fifo" | "edf" | "swaps" | "enumerate" | "hand";
  /** The sequence made by hand, as order ids. */
  hand?: string[];
}

const objectiveText = (o?: Objective) => (o ? `lateness ${fmtTicks(o.lateness)} (${o.lateCount} late), all back ${clock(o.allReturned)}, ${kJ(o.energy)}` : "no feasible timetable");
const seqText = (s: Job[] | string[]) => s.map((j) => (typeof j === "string" ? j : j.id)).join(" → ");
const ids = (s: Job[]) => s.map((j) => j.id);

/** The hand sequence, or FIFO when there is none yet or the link carried something that is not a permutation of the six. */
function handOf(state: TimetableState): string[] {
  const h = state.hand;
  if (h && h.length === six.length && new Set(h).size === six.length && h.every((id) => jobs.some((j) => j.id === id))) return h;
  return ids(fifo(jobs));
}
const jobsFor = (h: string[]) => h.map((id) => jobs.find((j) => j.id === id)!);

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

/** The sequence with a move-earlier and a move-later button on every row. */
function editor(seq: Job[]): string {
  const rows = seq.map((j, i) => `<tr><td class="num">${i + 1}</td><td>${esc(j.id)}</td><td>${esc(dish.get(j.id))}</td><td>${clock(j.ready)}</td><td>${clock(j.promised)}</td><td class="wb-moves"><button type="button" class="wb-control wb-move" data-control="up" data-value="${i}" aria-label="move ${esc(j.id)} earlier"${i === 0 ? " disabled" : ""}>▲</button> <button type="button" class="wb-control wb-move" data-control="down" data-value="${i}" aria-label="move ${esc(j.id)} later"${i === seq.length - 1 ? " disabled" : ""}>▼</button></td></tr>`).join("");
  return `<div class="wb-table wb-editor"><table><caption>Your sequence: move an order earlier or later and the timetable is computed again</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">order</th><th scope="col">dish</th><th scope="col">ready</th><th scope="col">promised</th><th scope="col">move</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
      { value: "hand", label: "by hand — move the orders yourself" },
    ] },
    ...(week === 6 && state.rule !== "enumerate" ? [{ id: "enumerate", label: "Run all 720 permutations", kind: "button" as const, primary: true }] : []),
  ],
  apply: (state, action) => {
    if (action.id === "rule") return { ...state, rule: (action.value as TimetableState["rule"]) ?? state.rule };
    if (action.id === "enumerate") return { ...state, rule: "enumerate" };
    if (action.id === "hand-from") return { ...state, rule: "hand", hand: ids(action.value === "edf" ? earliestDeadline(jobs) : fifo(jobs)) };
    if (action.id === "up" || action.id === "down") {
      const h = [...handOf(state)];
      const i = Number(action.value), j = action.id === "up" ? i - 1 : i + 1;
      if (Number.isInteger(i) && i >= 0 && i < h.length && j >= 0 && j < h.length) [h[i], h[j]] = [h[j], h[i]];
      return { ...state, rule: "hand", hand: h };
    }
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
    } else if (state.rule === "hand") {
      const h = handOf(state), seq = jobsFor(h);
      const mine = timetable(seq, cost, opts);
      const f = timetable(fifo(jobs), cost, opts), e = timetable(earliestDeadline(jobs), cost, opts), best = enumerate(jobs, cost, opts);
      const vsBest = compareObjective(mine.objective, best.best);
      const verdict = !mine.feasible
        ? `Not a feasible timetable: ${mine.infeasible.join(", ")} cannot be flown by this drone.`
        : vsBest === 0
          ? "This is one of the optimal sequences: none of the 720 does better under the course objective."
          : `The best of all 720 permutations is ${objectiveText(best.best)}. FIFO gives ${objectiveText(f.objective)}; earliest deadline ${objectiveText(e.objective)}.`;
      parts.push(`<p class="wb-summary"><strong>Your sequence:</strong> ${esc(seqText(seq))}. ${esc(objectiveText(mine.objective))}. ${esc(verdict)}</p>`);
      parts.push(`<p class="wb-hand-start"><button type="button" class="wb-control" data-control="hand-from" data-value="fifo">Start again from FIFO</button> <button type="button" class="wb-control" data-control="hand-from" data-value="edf">Start again from earliest deadline</button></p>`);
      parts.push(editor(seq));
      parts.push(timetableTable(seq, "Your timetable"));
      count = best.count + 3;
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
