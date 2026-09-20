// One full delivery task (docs/engine.md §2, week 4): load at the kitchen,
// fly out loaded, hover for the service, fly back unloaded, land. Time and
// energy come from the label search on the map; the budget is the battery
// minus the reserve, and it is checked on the whole trip.

import type { DroneType, MapData, Order, RulesData } from "../data/schema.ts";
import { fromMapTimeEnergy, hoverEnergy } from "./graph.ts";
import { dominates, labelSearch, pathOf, type Label } from "./labels.ts";

export interface Leg {
  kind: "load" | "out" | "service" | "back";
  start: number;
  end: number;
  energy: number;
  path?: string[];
}

export interface TaskCandidate {
  out: Label;
  back: Label;
  /** Ticks from take-off to landing. */
  time: number;
  energy: number;
}

export type TaskStatus = "found" | "infeasible-payload" | "none-in-domain" | "budget";

export interface TaskPlan {
  status: TaskStatus;
  order: string;
  drone: string;
  budget: number;
  /** All non-dominated (time, energy) round trips, budget ignored, fastest first. */
  candidates: TaskCandidate[];
  /** The chosen one: the fastest round trip within budget. */
  chosen?: TaskCandidate;
  /** The fastest round trip ignoring the budget, for the "fastest is over budget" comparison. */
  fastest?: TaskCandidate;
  depart?: number;
  deliver?: number;
  land?: number;
  energyUsed?: number;
  energyLeft?: number;
  legs: Leg[];
}

export interface TaskInput {
  map: MapData;
  rules: RulesData;
  type: DroneType;
  order: Order;
  /** Tick when loading may begin (the drone is at the kitchen, charged). */
  loadFrom: number;
}

export function planTask({ map, rules, type, order, loadFrom }: TaskInput): TaskPlan {
  const budget = Math.floor(type.batteryJ * (1 - rules.reserveFraction));
  const base: TaskPlan = { status: "none-in-domain", order: order.id, drone: type.id, budget, candidates: [], legs: [] };
  if (order.weight > type.payloadKg) return { ...base, status: "infeasible-payload" };

  const outSearch = labelSearch(fromMapTimeEnergy(map, type, order.weight), map.kitchen, order.node);
  const backSearch = labelSearch(fromMapTimeEnergy(map, type, 0), order.node, map.kitchen);
  if (outSearch.status === "budget" || backSearch.status === "budget") return { ...base, status: "budget" };
  const service = { time: rules.serviceTicks, energy: hoverEnergy(type, rules.serviceTicks) };

  let candidates: TaskCandidate[] = [];
  for (const out of outSearch.all) {
    for (const back of backSearch.all) {
      const c: TaskCandidate = { out, back, time: out.time + service.time + back.time, energy: out.energy + service.energy + back.energy };
      if (candidates.some((d) => dominates(d, c) || (d.time === c.time && d.energy === c.energy))) continue;
      candidates = [...candidates.filter((d) => !dominates(c, d)), c];
    }
  }
  candidates.sort((a, b) => a.time - b.time || a.energy - b.energy);
  const fastest = candidates[0];
  const chosen = candidates.find((c) => c.energy <= budget);
  if (!chosen) return { ...base, candidates, fastest };

  const depart = loadFrom + rules.loadingTicks;
  const arrive = depart + chosen.out.time;
  const deliver = arrive + service.time;
  const land = deliver + chosen.back.time;
  const legs: Leg[] = [
    { kind: "load", start: loadFrom, end: depart, energy: 0 },
    { kind: "out", start: depart, end: arrive, energy: chosen.out.energy, path: pathOf(chosen.out) },
    { kind: "service", start: arrive, end: deliver, energy: service.energy },
    { kind: "back", start: deliver, end: land, energy: chosen.back.energy, path: pathOf(chosen.back) },
  ];
  return {
    ...base,
    status: "found",
    candidates,
    chosen,
    fastest,
    depart,
    deliver,
    land,
    energyUsed: chosen.energy,
    energyLeft: type.batteryJ - chosen.energy,
    legs,
  };
}
