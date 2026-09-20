// The fleet evaluator (docs/engine.md §4, §6; weeks 7, 8, 11): every drone's
// ordered task list in, a joint plan out. It advances by event time. A task
// starts when its order is ready and its drone is available; loading, the
// flight, the service and the return follow; landing triggers the turnaround
// and, with charging on, the pad queue: first come first served by request
// time, two pads, non-preemptive, charge to full. With the corridor on, each
// leg is planned in space-time against the reservations committed so far.

import type { DroneType, FleetData, MapData, Order, RulesData } from "../data/schema.ts";
import { hoverEnergy } from "./graph.ts";
import { ReservationTable, type Occupancy } from "./reservations.ts";
import { planSpaceTimeTask } from "./spacetime.ts";
import { planTask } from "./task.ts";
import type { Objective } from "./timetable.ts";
import { validate, type Activity, type Delivery, type Validation } from "./validate.ts";

export interface World {
  map: MapData;
  fleet: FleetData;
  rules: RulesData;
  orders: Order[];
}

/** Ordered order ids per drone id. */
export type Assignment = Record<string, string[]>;

export interface FleetOptions {
  charging?: boolean;
  corridor?: boolean;
  /** Which task starts first when two could start at the same tick. */
  tieBreak?: "drone" | "promised";
  maxExpansions?: number;
}

export interface TaskRecord {
  order: string;
  drone: string;
  status: "flown" | "unscheduled";
  reason?: string;
  start: number;
  depart?: number;
  arrive?: number;
  deliver?: number;
  land?: number;
  /** Ticks spent hovering at waiting points, both legs. */
  hover?: number;
  /** Ticks the take-off was delayed on the ground to let a reservation clear. */
  groundWait?: number;
  energyUsed?: number;
  chargeStart?: number;
  chargeEnd?: number;
  available?: number;
  late?: number;
  pathOut?: string[];
  pathBack?: string[];
}

export interface FleetPlan {
  tasks: TaskRecord[];
  activities: Activity[];
  occupancies: Occupancy[];
  deliveries: Delivery[];
  unscheduled: { order: string; drone: string; reason: string }[];
  complete: boolean;
  objective?: Objective;
  onTime: number;
  validation: Validation;
  expansions: number;
}

const staticMemo = new Map<string, { out: number; back: number; energy: number; pathOut?: string[]; pathBack?: string[]; status: string }>();

/** The static round trip for a type and an order does not depend on when it starts; plan it once. */
function staticTask(world: World, type: DroneType, order: Order) {
  const key = `${world.map.seed}|${type.id}|${type.batteryJ}|${order.id}`;
  let s = staticMemo.get(key);
  if (!s) {
    const p = planTask({ map: world.map, rules: world.rules, type, order, loadFrom: 0 });
    s = p.status === "found"
      ? { status: "found", out: p.chosen!.out.time, back: p.chosen!.back.time, energy: p.energyUsed!, pathOut: p.legs[1].path, pathBack: p.legs[3].path }
      : { status: p.status, out: 0, back: 0, energy: 0 };
    staticMemo.set(key, s);
  }
  return s;
}

export function droneType(world: World, droneId: string): DroneType {
  const d = world.fleet.drones.find((x) => x.id === droneId);
  if (!d) throw new Error(`no drone ${droneId}`);
  return world.fleet.types.find((t) => t.id === d.type)!;
}

interface Ev {
  time: number;
  kind: "start" | "charge";
  drone: string;
  promised: number;
}

export function evaluate(world: World, assignment: Assignment, options: FleetOptions = {}): FleetPlan {
  const { map, rules } = world;
  const charging = options.charging ?? false;
  const corridor = options.corridor ?? false;
  const orders = new Map(world.orders.map((o) => [o.id, o]));
  const table = new ReservationTable(Object.fromEntries(Object.entries(rules.resources).map(([k, v]) => [k, v.capacity])));
  const tasks: TaskRecord[] = [];
  const activities: Activity[] = [];
  const deliveries: Delivery[] = [];
  const unscheduled: FleetPlan["unscheduled"] = [];
  let expansions = 0;

  const idx = new Map<string, number>();
  const available = new Map<string, number>();
  const events: Ev[] = [];
  const push = (e: Ev) => {
    events.push(e);
  };
  const nextEvent = (): Ev | undefined => {
    if (!events.length) return undefined;
    let k = 0;
    for (let i = 1; i < events.length; i++) {
      const a = events[i], b = events[k];
      const key = (e: Ev) => (options.tieBreak === "promised" ? e.promised : 0);
      if (a.time < b.time || (a.time === b.time && (a.kind === "charge") !== (b.kind === "charge") && a.kind === "charge") ||
        (a.time === b.time && a.kind === b.kind && (key(a) < key(b) || (key(a) === key(b) && a.drone < b.drone)))) k = i;
    }
    return events.splice(k, 1)[0];
  };
  const scheduleNext = (drone: string) => {
    const list = assignment[drone] ?? [];
    const i = idx.get(drone) ?? 0;
    if (i >= list.length) return;
    const order = orders.get(list[i]);
    if (!order) throw new Error(`no order ${list[i]}`);
    push({ time: Math.max(order.ready, available.get(drone) ?? 0), kind: "start", drone, promised: order.promised });
  };
  for (const drone of Object.keys(assignment)) {
    idx.set(drone, 0);
    available.set(drone, 0);
    scheduleNext(drone);
  }

  for (let ev = nextEvent(); ev; ev = nextEvent()) {
    const drone = ev.drone;
    const type = droneType(world, drone);
    if (ev.kind === "charge") {
      // handled inline below; kept for ordering
      continue;
    }
    const i = idx.get(drone)!;
    const order = orders.get(assignment[drone][i])!;
    idx.set(drone, i + 1);
    const start = ev.time;
    const depart = start + rules.loadingTicks;
    const budget = Math.floor(type.batteryJ * (1 - rules.reserveFraction));

    let outTicks: number, backTicks: number, hover = 0, groundWait = 0, energyUsed: number, pathOut: string[] | undefined, pathBack: string[] | undefined;
    let failure: string | undefined;
    if (order.weight > type.payloadKg) failure = `payload ${order.weight} kg over type ${type.id}'s ${type.payloadKg} kg`;
    else if (corridor) {
      const r = planSpaceTimeTask({ map, rules, type, order, table, drone, depart, maxExpansions: options.maxExpansions });
      expansions += r.expansions;
      if (r.status !== "found") failure = r.status === "budget" ? "not found within the expansion budget" : r.status === "over-budget" ? "no round trip within the energy budget under the reservations" : "no route under the reservations";
      else { outTicks = r.out.ticks - r.out.groundWait; groundWait = r.out.groundWait; backTicks = r.back.ticks; hover = r.out.hover + r.back.hover; energyUsed = r.energy; pathOut = r.out.path; pathBack = r.back.path; }
    } else {
      const s = staticTask(world, type, order);
      if (s.status !== "found") failure = s.status === "none-in-domain" ? "no round trip within the energy budget" : s.status;
      else { outTicks = s.out; backTicks = s.back; energyUsed = s.energy; pathOut = s.pathOut; pathBack = s.pathBack; }
    }
    if (failure) {
      tasks.push({ order: order.id, drone, status: "unscheduled", reason: failure, start });
      unscheduled.push({ order: order.id, drone, reason: failure });
      scheduleNext(drone);
      continue;
    }
    const takeOff = depart + groundWait;
    const arrive = takeOff + outTicks!;
    const deliver = arrive + rules.serviceTicks;
    const land = deliver + backTicks!;
    const turnaroundEnd = land + rules.turnaroundTicks;
    void budget;
    activities.push({ owner: drone, kind: "load", start, end: depart, task: order.id });
    if (groundWait > 0) activities.push({ owner: drone, kind: "wait", start: depart, end: takeOff, task: order.id });
    activities.push(
      { owner: drone, kind: "fly", start: takeOff, end: arrive, task: order.id },
      { owner: drone, kind: "service", start: arrive, end: deliver, task: order.id },
      { owner: drone, kind: "fly", start: deliver, end: land, task: order.id },
      { owner: drone, kind: "turnaround", start: land, end: turnaroundEnd, task: order.id },
    );
    deliveries.push({ order: order.id, owner: drone, tick: deliver });
    const rec: TaskRecord = { order: order.id, drone, status: "flown", start, depart: takeOff, arrive, deliver, land, hover, groundWait, energyUsed: energyUsed! + hoverEnergy(type, 0), late: Math.max(0, deliver - order.promised), pathOut, pathBack };
    if (charging && idx.get(drone)! < (assignment[drone]?.length ?? 0)) {
      const rate = type.batteryJ / rules.chargeTicks;
      const duration = Math.max(1, Math.ceil(energyUsed! / rate));
      const chargeStart = table.earliestFree("pads", turnaroundEnd, duration, drone);
      table.reserve({ resource: "pads", owner: drone, task: order.id, start: chargeStart, end: chargeStart + duration });
      activities.push({ owner: drone, kind: "charge", start: chargeStart, end: chargeStart + duration, task: order.id });
      rec.chargeStart = chargeStart;
      rec.chargeEnd = chargeStart + duration;
      available.set(drone, chargeStart + duration);
    } else {
      available.set(drone, turnaroundEnd);
    }
    rec.available = available.get(drone);
    tasks.push(rec);
    scheduleNext(drone);
  }

  const occupancies = table.list();
  const validation = validate({
    orders: world.orders.map((o) => o.id),
    activities,
    occupancies,
    deliveries,
    capacities: Object.fromEntries(Object.entries(rules.resources).map(([k, v]) => [k, v.capacity])),
    cutoff: rules.evening.cutoffTick,
  });
  const flown = tasks.filter((t) => t.status === "flown");
  const assignedIds = new Set(Object.values(assignment).flat());
  const complete = unscheduled.length === 0 && world.orders.every((o) => assignedIds.has(o.id)) && validation.ok && validation.unfinished.length === 0;
  const objective: Objective | undefined = complete
    ? {
        lateness: flown.reduce((s, t) => s + (t.late ?? 0), 0),
        allReturned: flown.reduce((m, t) => Math.max(m, t.land ?? 0), 0),
        energy: flown.reduce((s, t) => s + (t.energyUsed ?? 0), 0),
        lateCount: flown.filter((t) => (t.late ?? 0) > 0).length,
        sumDelivery: flown.reduce((s, t) => s + (t.deliver ?? 0), 0),
      }
    : undefined;
  const onTime = flown.filter((t) => (t.late ?? 0) === 0 && (t.deliver ?? Infinity) <= rules.evening.cutoffTick).length;
  return { tasks, activities, occupancies, deliveries, unscheduled, complete, objective, onTime, validation, expansions };
}
