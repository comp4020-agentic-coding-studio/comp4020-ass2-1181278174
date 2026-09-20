// Resource-constrained search with (time, energy) labels (docs/engine.md §3,
// week 4). A node may keep several labels: a faster one and a cheaper one
// are both worth extending, because the energy budget is checked on the
// whole task, not at the node. `keepOnly: "fastest"` is the wrong version
// the tutorial runs first: one label per node, the fastest, and the cheap
// route that would have fitted the budget is thrown away.

import type { BiGraph } from "./graph.ts";

export interface Label {
  node: string;
  time: number;
  energy: number;
  parent?: Label;
  edge?: string;
}

export interface LabelEvent {
  node: string;
  time: number;
  energy: number;
  outcome: "kept" | "dominated" | "over-budget" | "not-fastest";
  /** For "dominated": the label that dominates it. */
  by?: { time: number; energy: number };
}

export interface LabelSearchOptions {
  /** Joules available for the whole leg; labels above it are pruned. */
  budget?: number;
  keepOnly?: "pareto" | "fastest";
  maxExpansions?: number;
}

export type LabelStatus = "found" | "none-in-domain" | "budget";

export interface LabelSearchResult {
  status: LabelStatus;
  /** Non-dominated complete labels at the goal that fit the budget, fastest first. */
  feasible: Label[];
  /** Non-dominated complete labels at the goal including those that arrived over
   *  budget, fastest first. Exact when no prefix exceeds the budget before the goal;
   *  planTask runs without a budget and filters afterwards, so its sets are exact. */
  all: Label[];
  /** Labels kept at each node when the search ended. */
  perNode: Record<string, Label[]>;
  events: LabelEvent[];
  expansions: number;
  pruned: { dominated: number; overBudget: number; notFastest: number };
}

/** a dominates b: no worse on either, strictly better on at least one. */
export function dominates(a: { time: number; energy: number }, b: { time: number; energy: number }): boolean {
  return a.time <= b.time && a.energy <= b.energy && (a.time < b.time || a.energy < b.energy);
}

export function withinBudget(label: { energy: number }, budget: number): boolean {
  return label.energy <= budget;
}

export function pathOf(label: Label): string[] {
  const out: string[] = [];
  for (let l: Label | undefined = label; l; l = l.parent) out.unshift(l.node);
  return out;
}

export function labelSearch(graph: BiGraph, start: string, goal: string, options: LabelSearchOptions = {}): LabelSearchResult {
  const budget = options.budget ?? Infinity;
  const fastestOnly = options.keepOnly === "fastest";
  const maxExpansions = options.maxExpansions ?? Infinity;
  const perNode = new Map<string, Label[]>();
  const events: LabelEvent[] = [];
  const pruned = { dominated: 0, overBudget: 0, notFastest: 0 };
  const queue: Label[] = [];
  const overBudgetAtGoal: Label[] = [];
  let expansions = 0;

  const offer = (label: Label): boolean => {
    const here = perNode.get(label.node) ?? [];
    if (label.energy > budget) {
      pruned.overBudget++;
      events.push({ node: label.node, time: label.time, energy: label.energy, outcome: "over-budget" });
      if (label.node === goal) overBudgetAtGoal.push(label);
      return false;
    }
    if (fastestOnly) {
      const best = here[0];
      if (best && best.time <= label.time) {
        pruned.notFastest++;
        events.push({ node: label.node, time: label.time, energy: label.energy, outcome: "not-fastest", by: { time: best.time, energy: best.energy } });
        return false;
      }
      perNode.set(label.node, [label]);
    } else {
      const dom = here.find((h) => dominates(h, label) || (h.time === label.time && h.energy === label.energy));
      if (dom) {
        pruned.dominated++;
        events.push({ node: label.node, time: label.time, energy: label.energy, outcome: "dominated", by: { time: dom.time, energy: dom.energy } });
        return false;
      }
      perNode.set(label.node, [...here.filter((h) => !dominates(label, h)), label]);
    }
    events.push({ node: label.node, time: label.time, energy: label.energy, outcome: "kept" });
    queue.push(label);
    return true;
  };

  offer({ node: start, time: 0, energy: 0 });
  let status: LabelStatus = "none-in-domain";
  while (queue.length) {
    let k = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i], b = queue[k];
      if (a.time < b.time || (a.time === b.time && a.energy < b.energy)) k = i;
    }
    const label = queue.splice(k, 1)[0];
    // a label pruned after it was queued (dominated by a later arrival) is not expanded
    if (!(perNode.get(label.node) ?? []).includes(label)) continue;
    if (label.node === goal) continue;
    if (expansions >= maxExpansions) {
      status = "budget";
      break;
    }
    expansions++;
    for (const nb of graph.neighbours(label.node)) {
      offer({ node: nb.to, time: label.time + nb.time, energy: label.energy + nb.energy, parent: label, edge: nb.edge });
    }
  }
  const atGoal = [...(perNode.get(goal) ?? [])].sort((a, b) => a.time - b.time || a.energy - b.energy);
  const feasible = atGoal.filter((l) => withinBudget(l, budget));
  let all: Label[] = [];
  for (const l of [...atGoal, ...overBudgetAtGoal]) {
    if (all.some((d) => dominates(d, l) || (d.time === l.time && d.energy === l.energy))) continue;
    all = [...all.filter((d) => !dominates(l, d)), l];
  }
  all.sort((a, b) => a.time - b.time || a.energy - b.energy);
  if (feasible.length && status !== "budget") status = "found";
  return {
    status,
    feasible,
    all,
    perNode: Object.fromEntries([...perNode].map(([n, ls]) => [n, [...ls].sort((a, b) => a.time - b.time)])),
    events,
    expansions,
    pruned,
  };
}
