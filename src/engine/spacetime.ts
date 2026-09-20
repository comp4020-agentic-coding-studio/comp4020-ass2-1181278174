// Space-time search (docs/engine.md §3, weeks 9 and 10): A* over (place, tick)
// under a reservation table. Moving along an edge that carries a resource
// needs the whole interval free; waiting is allowed at the depot (on the
// ground, free) and at waiting points (in the air, at hover power). Under one
// (place, tick) key the lower-energy label is kept. The heuristic is the
// static time to go, which ignores occupancy and so never overestimates.

import type { DroneType, MapData, MapEdge, Order, RulesData } from "../data/schema.ts";
import { edgeEnergy, edgeTicks, fromMap, fromMapTimeEnergy, hoverEnergy } from "./graph.ts";
import { labelSearch } from "./labels.ts";
import { costToGo } from "./search.ts";
import type { Occupancy, ReservationTable } from "./reservations.ts";

export interface SpaceTimeLeg {
  path: string[];
  /** Arrival tick minus the requested departure tick, ground wait included. */
  ticks: number;
  /** Ticks spent on the ground at the depot before taking off: free. */
  groundWait: number;
  /** Ticks spent hovering at waiting points: at hover power. */
  hover: number;
  energy: number;
  occupancies: Occupancy[];
  expansions: number;
}

export type SpaceTimeStatus = "found" | "no-route" | "over-budget" | "budget";

interface Label {
  node: string;
  t: number;
  energy: number;
  parent?: Label;
  edge?: MapEdge;
}

const heuristics = new Map<string, Map<string, number>>();
const cheapestReturn = new Map<string, number>();

/** The least energy any static route back to the depot can cost, unloaded:
 *  reserved before the outbound leg is planned, so a fast outbound route
 *  cannot spend what the return needs (the week-4 lesson, in space-time). */
function minReturnEnergy(map: MapData, type: DroneType, from: string): number {
  const key = `${type.id}|${type.batteryJ}|${from}`;
  let e = cheapestReturn.get(key);
  if (e === undefined) {
    const r = labelSearch(fromMapTimeEnergy(map, type, 0), from, map.kitchen);
    e = r.all.length ? Math.min(...r.all.map((l) => l.energy)) : Infinity;
    cheapestReturn.set(key, e);
  }
  return e;
}

function staticToGo(map: MapData, type: DroneType, goal: string): Map<string, number> {
  const key = `${type.id}|${goal}`;
  let h = heuristics.get(key);
  if (!h) {
    h = costToGo(fromMap(map, type, "time"), goal);
    heuristics.set(key, h);
  }
  return h;
}

export interface LegInput {
  map: MapData;
  type: DroneType;
  payloadKg: number;
  from: string;
  to: string;
  depart: number;
  table: ReservationTable;
  pending: Occupancy[];
  owner: string;
  budget: number;
  latest: number;
  maxExpansions: number;
}

export function planLeg(input: LegInput): { status: SpaceTimeStatus; leg?: SpaceTimeLeg; expansions: number } {
  const { map, type, payloadKg, from, to, depart, table, pending, owner, budget, latest, maxExpansions } = input;
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  const out = new Map<string, MapEdge[]>();
  for (const e of map.edges) out.set(e.from, [...(out.get(e.from) ?? []), e]);
  const h = staticToGo(map, type, to);
  const best = new Map<string, number>(); // (node|t) -> energy
  const open: Label[] = [{ node: from, t: depart, energy: 0 }];
  best.set(`${from}|${depart}`, 0);
  let expansions = 0;
  let sawOverBudget = false;
  while (open.length) {
    let k = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i], b = open[k];
      const fa = a.t + (h.get(a.node) ?? Infinity), fb = b.t + (h.get(b.node) ?? Infinity);
      if (fa < fb || (fa === fb && a.energy < b.energy)) k = i;
    }
    const cur = open.splice(k, 1)[0];
    if ((best.get(`${cur.node}|${cur.t}`) ?? Infinity) < cur.energy) continue;
    if (cur.node === to) {
      const path: string[] = [];
      const occupancies: Occupancy[] = [];
      let hover = 0, groundWait = 0;
      for (let l: Label | undefined = cur; l; l = l.parent) {
        path.unshift(l.node);
        if (l.parent && !l.edge) {
          if (nodes.get(l.node)!.kind === "kitchen") groundWait++;
          else hover++;
        }
        if (l.edge?.resource) occupancies.unshift({ resource: l.edge.resource, owner, start: l.parent!.t, end: l.t });
      }
      const compact = path.filter((n, i) => i === 0 || n !== path[i - 1]);
      return { status: "found", expansions, leg: { path: compact, ticks: cur.t - depart, groundWait, hover, energy: cur.energy, occupancies, expansions } };
    }
    if (expansions >= maxExpansions) return { status: "budget", expansions };
    expansions++;
    const offer = (node: string, t: number, energy: number, edge?: MapEdge) => {
      if (t > latest) return;
      if (energy > budget) { sawOverBudget = true; return; }
      const key = `${node}|${t}`;
      if ((best.get(key) ?? Infinity) <= energy) return;
      best.set(key, energy);
      open.push({ node, t, energy, parent: cur, edge });
    };
    const here = nodes.get(cur.node)!;
    if (here.kind === "kitchen") offer(cur.node, cur.t + 1, cur.energy);
    else if (here.wait) offer(cur.node, cur.t + 1, cur.energy + hoverEnergy(type, 1));
    for (const e of out.get(cur.node) ?? []) {
      const dt = edgeTicks(e, type);
      if (e.resource && !table.available(e.resource, cur.t, cur.t + dt, owner, pending)) continue;
      offer(e.to, cur.t + dt, cur.energy + edgeEnergy(e, type, payloadKg), e);
    }
  }
  return { status: sawOverBudget ? "over-budget" : "no-route", expansions };
}

export interface SpaceTimeTaskInput {
  map: MapData;
  rules: RulesData;
  type: DroneType;
  order: Order;
  table: ReservationTable;
  drone: string;
  depart: number;
  maxExpansions?: number;
}

export interface SpaceTimeTask {
  status: SpaceTimeStatus;
  out: SpaceTimeLeg;
  back: SpaceTimeLeg;
  energy: number;
  expansions: number;
}

/** A full task in space-time: out loaded, service, back unloaded; the corridor
 *  reservations are tried in a transaction and committed only if both legs fit. */
export function planSpaceTimeTask(input: SpaceTimeTaskInput): SpaceTimeTask | { status: Exclude<SpaceTimeStatus, "found">; expansions: number } {
  const { map, rules, type, order, table, drone, depart } = input;
  const budget = Math.floor(type.batteryJ * (1 - rules.reserveFraction));
  const latest = rules.evening.cutoffTick;
  const maxExpansions = input.maxExpansions ?? 40000;
  const tx = table.transaction();
  const pending: Occupancy[] = [];
  const service = hoverEnergy(type, rules.serviceTicks);
  const reserveForReturn = minReturnEnergy(map, type, order.node) + service;
  const out = planLeg({ map, type, payloadKg: order.weight, from: map.kitchen, to: order.node, depart, table, pending, owner: drone, budget: budget - reserveForReturn, latest, maxExpansions });
  if (out.status !== "found") { tx.rollback(); return { status: out.status, expansions: out.expansions }; }
  for (const o of out.leg!.occupancies) { tx.reserve({ ...o, task: order.id }); pending.push({ ...o, task: order.id }); }
  const backDepart = depart + out.leg!.ticks + rules.serviceTicks;
  const back = planLeg({ map, type, payloadKg: 0, from: order.node, to: map.kitchen, depart: backDepart, table, pending, owner: drone, budget: budget - out.leg!.energy - service, latest, maxExpansions });
  if (back.status !== "found") { tx.rollback(); return { status: back.status, expansions: out.expansions + back.expansions }; }
  for (const o of back.leg!.occupancies) tx.reserve({ ...o, task: order.id });
  tx.commit();
  return { status: "found", out: out.leg!, back: back.leg!, energy: out.leg!.energy + service + back.leg!.energy, expansions: out.expansions + back.expansions };
}
