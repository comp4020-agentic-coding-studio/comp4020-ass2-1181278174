// One drone, many orders (docs/engine.md §4 and §7, weeks 5 and 6): the
// timetable recurrence, the objective, two ordering rules, a best-improvement
// swap improver and an exact enumeration for small instances.
//
// Task costs come through a function so the same recurrence runs the
// micro-examples (d and p given) and the real map (planTask). The recurrence
// is: loading starts at max(ready, available); departure is after loading;
// delivery is departure + d; return is departure + p; the drone is available
// again after the turnaround.

import type { DroneType, MapData, Order, RulesData } from "../data/schema.ts";
import { planTask } from "./task.ts";

export interface Job {
  id: string;
  ready: number;
  promised: number;
}

/** Ticks from departure to delivery (d) and to return (p), and the energy of the trip. */
export interface TaskCost {
  d: number;
  p: number;
  energy: number;
}

/** null means the job cannot be flown by this drone at all. */
export type CostFn = (job: Job, start: number) => TaskCost | null;

export interface Slot {
  id: string;
  start: number;
  depart: number;
  deliver: number;
  ret: number;
  available: number;
  late: number;
  energy: number;
}

export interface Objective {
  lateness: number;
  allReturned: number;
  energy: number;
  lateCount: number;
  sumDelivery: number;
}

export interface Timetable {
  slots: Slot[];
  infeasible: string[];
  feasible: boolean;
  objective?: Objective;
}

export interface TimetableOptions {
  availableFrom?: number;
  loadingTicks?: number;
  turnaroundTicks?: number;
}

export function timetable(sequence: Job[], cost: CostFn, options: TimetableOptions = {}): Timetable {
  const loading = options.loadingTicks ?? 0;
  const turnaround = options.turnaroundTicks ?? 0;
  let available = options.availableFrom ?? 0;
  const slots: Slot[] = [];
  const infeasible: string[] = [];
  for (const job of sequence) {
    const start = Math.max(job.ready, available);
    const c = cost(job, start);
    if (!c) {
      infeasible.push(job.id);
      continue;
    }
    const depart = start + loading;
    const deliver = depart + c.d;
    const ret = depart + c.p;
    available = ret + turnaround;
    slots.push({ id: job.id, start, depart, deliver, ret, available, late: Math.max(0, deliver - job.promised), energy: c.energy });
  }
  const feasible = infeasible.length === 0;
  return {
    slots,
    infeasible,
    feasible,
    ...(feasible
      ? {
          objective: {
            lateness: slots.reduce((s, x) => s + x.late, 0),
            allReturned: slots.reduce((m, x) => Math.max(m, x.ret), 0),
            energy: slots.reduce((s, x) => s + x.energy, 0),
            lateCount: slots.filter((x) => x.late > 0).length,
            sumDelivery: slots.reduce((s, x) => s + x.deliver, 0),
          },
        }
      : {}),
  };
}

/** Lexicographic: lateness, then all-returned time, then energy. Infeasible is worst. */
export function compareObjective(a?: Objective, b?: Objective): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.lateness - b.lateness || a.allReturned - b.allReturned || a.energy - b.energy;
}

export function fifo(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => a.ready - b.ready || a.id.localeCompare(b.id));
}

export function earliestDeadline(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => a.promised - b.promised || a.ready - b.ready || a.id.localeCompare(b.id));
}

export interface SwapMove {
  i: number;
  j: number;
  before: Objective;
  after: Objective;
  sequence: string[];
}

export interface SwapResult {
  sequence: Job[];
  objective?: Objective;
  moves: SwapMove[];
  /** local-optimum: every pairwise swap was checked and none improves strictly. */
  status: "local-optimum" | "budget" | "infeasible";
  neighboursChecked: number;
}

/** Best-improvement pairwise swaps from a starting sequence. Every candidate is
 *  evaluated from the same initial state. Ties between equally good swaps go
 *  to the earlier (i, j) pair, so the trace is reproducible. */
export function improveBySwaps(start: Job[], cost: CostFn, options: TimetableOptions & { maxIterations?: number } = {}): SwapResult {
  const maxIterations = options.maxIterations ?? Infinity;
  let current = [...start];
  let currentT = timetable(current, cost, options);
  if (!currentT.feasible) return { sequence: current, moves: [], status: "infeasible", neighboursChecked: 0 };
  const moves: SwapMove[] = [];
  let checked = 0;
  for (let iter = 0; ; iter++) {
    if (iter >= maxIterations) return { sequence: current, objective: currentT.objective, moves, status: "budget", neighboursChecked: checked };
    let best: { i: number; j: number; seq: Job[]; t: Timetable } | null = null;
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const seq = [...current];
        [seq[i], seq[j]] = [seq[j], seq[i]];
        const t = timetable(seq, cost, options);
        checked++;
        if (!t.feasible) continue;
        if (compareObjective(t.objective, currentT.objective) < 0 && (!best || compareObjective(t.objective, best.t.objective) < 0)) {
          best = { i, j, seq, t };
        }
      }
    }
    if (!best) return { sequence: current, objective: currentT.objective, moves, status: "local-optimum", neighboursChecked: checked };
    moves.push({ i: best.i, j: best.j, before: currentT.objective!, after: best.t.objective!, sequence: best.seq.map((x) => x.id) });
    current = best.seq;
    currentT = best.t;
  }
}

export interface EnumerationResult {
  count: number;
  best?: Objective;
  /** Every sequence that reaches the best objective, in enumeration order. */
  optima: string[][];
}

/** Every permutation, for small instances only (n ≤ limit). */
export function enumerate(jobs: Job[], cost: CostFn, options: TimetableOptions & { limit?: number } = {}): EnumerationResult {
  const limit = options.limit ?? 8;
  if (jobs.length > limit) throw new Error(`enumerate: ${jobs.length} jobs is more than the limit of ${limit}`);
  let count = 0;
  let best: Objective | undefined;
  let optima: string[][] = [];
  const rec = (prefix: Job[], rest: Job[]) => {
    if (rest.length === 0) {
      count++;
      const t = timetable(prefix, cost, options);
      if (!t.feasible) return;
      const c = compareObjective(t.objective, best);
      if (best === undefined || c < 0) {
        best = t.objective;
        optima = [prefix.map((x) => x.id)];
      } else if (c === 0) optima.push(prefix.map((x) => x.id));
      return;
    }
    for (let i = 0; i < rest.length; i++) rec([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
  };
  rec([], jobs);
  return { count, best, optima };
}

/** Task costs on the real map for one drone type. Without reservations a
 *  task's cost does not depend on when it starts, so each order is planned
 *  once. */
export function mapCost(map: MapData, rules: RulesData, type: DroneType, orders: Order[]): CostFn {
  const byId = new Map(orders.map((o) => [o.id, o]));
  const memo = new Map<string, TaskCost | null>();
  return (job) => {
    if (memo.has(job.id)) return memo.get(job.id)!;
    const order = byId.get(job.id);
    if (!order) throw new Error(`no order ${job.id}`);
    const p = planTask({ map, rules, type, order, loadFrom: 0 });
    const c = p.status === "found" ? { d: p.deliver! - p.depart!, p: p.land! - p.depart!, energy: p.energyUsed! } : null;
    memo.set(job.id, c);
    return c;
  };
}

export function jobsOf(orders: Order[]): Job[] {
  return orders.map((o) => ({ id: o.id, ready: o.ready, promised: o.promised }));
}
