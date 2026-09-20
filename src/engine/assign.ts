// Assignment (docs/engine.md §6, week 7): which drone takes which order. A
// feasibility matrix first; then a greedy initial solution by earliest
// predicted completion on static task costs; then local improvement by
// swaps within a drone and migrations between drones, every candidate
// re-evaluated as a whole plan by the fleet evaluator (week 11 turns the
// corridor on in that evaluation and the costs stop being static).

import type { Order } from "../data/schema.ts";
import { droneType, evaluate, type Assignment, type FleetOptions, type FleetPlan, type World } from "./fleet.ts";
import { planTask } from "./task.ts";
import { compareObjective } from "./timetable.ts";

export interface Feasibility {
  drone: string;
  order: string;
  feasible: boolean;
  reason?: string;
  /** Static round trip in ticks and joules, when feasible. */
  ticks?: number;
  energy?: number;
  d?: number;
}

/** Every drone × order: can this drone fly this order at all, and what does it cost on its own. */
export function feasibilityMatrix(world: World, orders: Order[] = world.orders): Feasibility[] {
  const memo = new Map<string, Feasibility>();
  const out: Feasibility[] = [];
  for (const drone of world.fleet.drones) {
    const type = droneType(world, drone.id);
    for (const order of orders) {
      const key = `${type.id}|${order.id}`;
      let f = memo.get(key);
      if (!f) {
        const p = planTask({ map: world.map, rules: world.rules, type, order, loadFrom: 0 });
        f = p.status === "found"
          ? { drone: drone.id, order: order.id, feasible: true, ticks: p.chosen!.time, energy: p.energyUsed, d: p.deliver! - p.depart! }
          : { drone: drone.id, order: order.id, feasible: false, reason: p.status === "infeasible-payload" ? `${order.weight} kg over ${type.payloadKg} kg` : "out of range on this battery" };
        memo.set(key, f);
      }
      out.push({ ...f, drone: drone.id });
    }
  }
  return out;
}

export interface GreedyStep {
  order: string;
  chosen: string;
  predicted: number;
  alternatives: { drone: string; predicted: number | null }[];
}

export interface AssignOptions {
  score?: (drone: { id: string; type: string }, order: Order, state: { predicted: number; wait: number; available: number; count: number; trip: number; energy: number }) => number;
  includeWaits?: boolean;
  fleetOptions?: FleetOptions;
}

/** Orders in ready order; each goes to the feasible drone that would deliver it earliest. */
export function greedyAssign(world: World, orders: Order[] = world.orders, rule: "earliest-completion" | "equal-counts" = "earliest-completion", options: AssignOptions = {}): { assignment: Assignment; steps: GreedyStep[]; unassignable: string[] } {
  const matrix = feasibilityMatrix(world, orders);
  const feas = (drone: string, order: string) => matrix.find((f) => f.drone === drone && f.order === order)!;
  const assignment: Assignment = Object.fromEntries(world.fleet.drones.map((d) => [d.id, [] as string[]]));
  const available = new Map(world.fleet.drones.map((d) => [d.id, 0]));
  const steps: GreedyStep[] = [];
  const unassignable: string[] = [];
  const sorted = [...orders].sort((a, b) => a.ready - b.ready || a.id.localeCompare(b.id));
  let rr = 0;
  for (const order of sorted) {
    const alternatives = world.fleet.drones.map((d) => {
      const f = feas(d.id, order.id);
      if (!f.feasible) return { drone: d.id, predicted: null, score: Infinity };
      const start = Math.max(order.ready, available.get(d.id)!);
      const predicted = start + world.rules.loadingTicks + f.d!;
      let wait = 0;
      if (options.includeWaits) {
        const candidate = Object.fromEntries(Object.entries(assignment).map(([id, list]) => [id, id === d.id ? [...list, order.id] : [...list]]));
        const p = evaluate(world, candidate, options.fleetOptions);
        const task = p.tasks.find(t => t.order === order.id);
        if (task?.status !== "flown") return { drone: d.id, predicted: null, score: Infinity };
        wait = Math.max(0, task.deliver! - predicted);
      }
      const score = options.score ? options.score(d, order, { predicted, wait, available: available.get(d.id)!, count: assignment[d.id].length, trip: f.ticks!, energy: f.energy! }) : predicted + wait;
      if (!Number.isFinite(score)) throw new Error("assignCost must return a finite number for a feasible pair");
      return { drone: d.id, predicted, score, wait };
    });
    const feasible = alternatives.filter((a) => a.predicted !== null) as { drone: string; predicted: number; score: number }[];
    if (!feasible.length) {
      unassignable.push(order.id);
      continue;
    }
    let chosen: { drone: string; predicted: number };
    if (rule === "equal-counts") {
      // round robin over the drones that can fly it, in fleet order
      const ids = world.fleet.drones.map((d) => d.id);
      let k = rr;
      chosen = feasible[0];
      for (let n = 0; n < ids.length; n++) {
        const cand = feasible.find((a) => a.drone === ids[(k + n) % ids.length]);
        if (cand) { chosen = cand; rr = (ids.indexOf(cand.drone) + 1) % ids.length; break; }
      }
    } else {
      chosen = feasible.reduce((best, a) => (a.score < best.score || (a.score === best.score && a.drone < best.drone) ? a : best));
    }
    assignment[chosen.drone].push(order.id);
    const f = feas(chosen.drone, order.id);
    const start = Math.max(order.ready, available.get(chosen.drone)!);
    available.set(chosen.drone, start + world.rules.loadingTicks + f.ticks! + world.rules.turnaroundTicks);
    steps.push({ order: order.id, chosen: chosen.drone, predicted: chosen.predicted, alternatives });
  }
  return { assignment, steps, unassignable };
}

export interface ImproveMove {
  kind: "swap" | "migrate";
  description: string;
  before: ReturnType<typeof evaluate>["objective"];
  after: ReturnType<typeof evaluate>["objective"];
  assignment: Assignment;
}

export interface ImproveResult {
  assignment: Assignment;
  plan: FleetPlan;
  moves: ImproveMove[];
  status: "local-optimum" | "budget" | "infeasible";
  candidatesEvaluated: number;
  candidates?: { description: string; iteration: number; objective?: FleetPlan["objective"]; complete: boolean; accepted: boolean }[];
}

export function neighbours(assignment: Assignment): { kind: "swap" | "migrate"; description: string; assignment: Assignment }[] {
  const out: { kind: "swap" | "migrate"; description: string; assignment: Assignment }[] = [];
  const clone = (a: Assignment): Assignment => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, [...v]]));
  for (const [drone, list] of Object.entries(assignment)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = clone(assignment);
        [a[drone][i], a[drone][j]] = [a[drone][j], a[drone][i]];
        out.push({ kind: "swap", description: `${drone}: swap ${list[i]} and ${list[j]}`, assignment: a });
      }
      for (const other of Object.keys(assignment)) {
        if (other === drone) continue;
        for (let pos = 0; pos <= assignment[other].length; pos++) {
          const a = clone(assignment);
          const [moved] = a[drone].splice(i, 1);
          a[other].splice(pos, 0, moved);
          out.push({ kind: "migrate", description: `${moved}: ${drone} → ${other} at position ${pos + 1}`, assignment: a });
        }
      }
    }
  }
  return out;
}

/** Best-improvement local search over swaps and migrations; every candidate is a full evaluation. */
export function improve(world: World, start: Assignment, options: FleetOptions & { maxIterations?: number; maxCandidates?: number; onProgress?: (count: number, plan: FleetPlan) => void } = {}): ImproveResult {
  const maxIterations = options.maxIterations ?? 50;
  let current = start;
  let plan = evaluate(world, current, options);
  const moves: ImproveMove[] = [];
  let evaluated = 1;
  const candidates: NonNullable<ImproveResult["candidates"]> = [];
  if (!plan.complete) return { assignment: current, plan, moves, status: "infeasible", candidatesEvaluated: evaluated };
  for (let iter = 0; ; iter++) {
    if (iter >= maxIterations) return { assignment: current, plan, moves, candidates, status: "budget", candidatesEvaluated: evaluated };
    let best: { n: ReturnType<typeof neighbours>[number]; p: FleetPlan } | null = null;
    let exhausted = false;
    for (const n of neighbours(current)) {
      if (evaluated >= (options.maxCandidates ?? Infinity)) { exhausted = true; break; }
      const p = evaluate(world, n.assignment, options);
      evaluated++;
      candidates.push({ description: n.description, iteration: iter + 1, objective: p.objective, complete: p.complete, accepted: false });
      if (evaluated % 10 === 0) options.onProgress?.(evaluated, best?.p ?? plan);
      if (!p.complete) continue;
      if (compareObjective(p.objective, plan.objective) < 0 && (!best || compareObjective(p.objective, best.p.objective) < 0)) best = { n, p };
    }
    if (!best) return { assignment: current, plan, moves, candidates, status: exhausted ? "budget" : "local-optimum", candidatesEvaluated: evaluated };
    candidates.find(c => c.iteration === iter + 1 && c.description === best!.n.description)!.accepted = true;
    moves.push({ kind: best.n.kind, description: best.n.description, before: plan.objective, after: best.p.objective, assignment: best.n.assignment });
    current = best.n.assignment;
    plan = best.p;
    if (exhausted) return { assignment: current, plan, moves, candidates, status: "budget", candidatesEvaluated: evaluated };
  }
}
