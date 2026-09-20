import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FleetData, MapData, OrdersData, RulesData } from "../../src/data/schema.ts";
import { feasibilityMatrix, greedyAssign, improve } from "../../src/engine/assign.ts";
import { evaluate, type World } from "../../src/engine/fleet.ts";
import { ReservationTable } from "../../src/engine/reservations.ts";
import { planLeg, planSpaceTimeTask } from "../../src/engine/spacetime.ts";

const read = (n: string) => JSON.parse(readFileSync(resolve("src/data", n), "utf8"));
const world: World = { map: read("map.json") as MapData, fleet: read("fleet.json") as FleetData, rules: read("rules.json") as RulesData, orders: (read("orders.json") as OrdersData).orders };
const L = world.fleet.types.find((t) => t.id === "L")!;
const ten = [...world.orders.slice(0, 9), world.orders[19]];
const tenWorld: World = { ...world, orders: ten };
const lightOnly: World = { ...world, fleet: { ...world.fleet, drones: world.fleet.drones.filter((d) => d.type === "L") } };

describe("the feasibility matrix", () => {
  it("excludes #20 for the light type on payload and #14 on range, and keeps them for the heavy type", () => {
    const m = feasibilityMatrix(world);
    const at = (d: string, o: string) => m.find((f) => f.drone === d && f.order === o)!;
    expect(at("A", "#20")).toMatchObject({ feasible: false, reason: "3.5 kg over 1.5 kg" });
    expect(at("A", "#14")).toMatchObject({ feasible: false, reason: "out of range on this battery" });
    expect(at("D", "#20").feasible).toBe(true);
    expect(at("D", "#14").feasible).toBe(true);
    expect(m).toHaveLength(5 * 20);
  });
});

describe("greedy assignment", () => {
  it("gives #20 to a heavy drone and everything to someone", () => {
    const g = greedyAssign(world, ten);
    expect(g.unassignable).toEqual([]);
    const holder = Object.entries(g.assignment).find(([, list]) => list.includes("#20"))![0];
    expect(["D", "E"]).toContain(holder);
    expect(Object.values(g.assignment).flat().sort()).toEqual(ten.map((o) => o.id).sort());
    expect(g.steps.find((s) => s.order === "#20")!.alternatives.filter((a) => a.predicted === null).map((a) => a.drone)).toEqual(["A", "B", "C"]);
  });

  it("cannot place #20 with light drones only, and says so", () => {
    const g = greedyAssign(lightOnly, ten);
    expect(g.unassignable).toEqual(["#20"]);
  });

  it("equal counts spreads the orders; earliest completion may not", () => {
    const eq = greedyAssign(lightOnly, ten.slice(0, 9), "equal-counts");
    const counts = Object.values(eq.assignment).map((l) => l.length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe("the fleet evaluator", () => {
  it("runs a consistent timetable per drone with charging off", () => {
    const g = greedyAssign(tenWorld);
    const plan = evaluate(tenWorld, g.assignment);
    expect(plan.complete).toBe(true);
    expect(plan.validation.ok).toBe(true);
    for (const drone of Object.keys(g.assignment)) {
      const mine = plan.tasks.filter((t) => t.drone === drone && t.status === "flown");
      for (const [k, t] of mine.entries()) {
        const o = world.orders.find((x) => x.id === t.order)!;
        expect(t.start).toBeGreaterThanOrEqual(o.ready);
        expect(t.depart).toBe(t.start + world.rules.loadingTicks + (t.groundWait ?? 0));
        expect(t.land!).toBeGreaterThan(t.deliver!);
        expect(t.available).toBe(t.land! + world.rules.turnaroundTicks);
        if (k > 0) expect(t.start).toBeGreaterThanOrEqual(mine[k - 1].available!);
      }
    }
    expect(plan.objective).toBeDefined();
    expect(plan.onTime).toBeGreaterThan(0);
  });

  it("with charging on, a drone's next task waits for its charge, and two pads never hold three", () => {
    const g = greedyAssign(tenWorld);
    const plan = evaluate(tenWorld, g.assignment, { charging: true });
    expect(plan.validation.ok).toBe(true);
    const rate = (id: string) => { const type = world.fleet.types.find((t) => t.id === world.fleet.drones.find((d) => d.id === id)!.type)!; return type.batteryJ / world.rules.chargeTicks; };
    for (const t of plan.tasks.filter((x) => x.chargeStart !== undefined)) {
      expect(t.chargeStart!).toBeGreaterThanOrEqual(t.land! + world.rules.turnaroundTicks);
      expect(t.chargeEnd! - t.chargeStart!).toBe(Math.max(1, Math.ceil(t.energyUsed! / rate(t.drone))));
      expect(t.available).toBe(t.chargeEnd);
    }
    expect(plan.occupancies.every((o) => o.resource === "pads")).toBe(true);
  });

  it("queues at the pads when charging is slow: some drone starts charging after it asked", () => {
    const slow: World = { ...world, rules: { ...world.rules, chargeTicks: 6000 } };
    const g = greedyAssign(slow, world.orders);
    const plan = evaluate(slow, g.assignment, { charging: true });
    expect(plan.validation.ok).toBe(true);
    const waited = plan.tasks.filter((t) => t.chargeStart !== undefined && t.chargeStart > t.land! + slow.rules.turnaroundTicks);
    expect(waited.length).toBeGreaterThan(0);
  });
});

describe("space-time planning", () => {
  const order13 = world.orders[12];
  it("waits on the ground for B rather than detouring or hovering, and reserves the interval it takes", () => {
    const table = new ReservationTable({ corridor: 1, pads: 2 });
    table.reserve({ resource: "corridor", owner: "B", start: 87, end: 112 });
    const free = planLeg({ map: world.map, type: L, payloadKg: order13.weight, from: world.map.kitchen, to: order13.node, depart: 0, table: new ReservationTable({ corridor: 1 }), pending: [], owner: "A", budget: 80750, latest: 12600, maxExpansions: 40000 });
    const held = planLeg({ map: world.map, type: L, payloadKg: order13.weight, from: world.map.kitchen, to: order13.node, depart: 0, table, pending: [], owner: "A", budget: 80750, latest: 12600, maxExpansions: 40000 });
    expect(free.status).toBe("found");
    expect(held.status).toBe("found");
    expect(free.leg!.hover + free.leg!.groundWait).toBe(0);
    expect(held.leg!.ticks).toBeGreaterThan(free.leg!.ticks);
    // the planner prefers to delay take-off on the ground (free) over hovering at the corridor (hover power)
    expect(held.leg!.groundWait).toBeGreaterThan(0);
    expect(held.leg!.hover).toBe(0);
    const occ = held.leg!.occupancies.find((o) => o.resource === "corridor")!;
    expect(occ.start).toBeGreaterThanOrEqual(112);
    expect(held.leg!.ticks - free.leg!.ticks).toBe(held.leg!.groundWait);
  });

  it("plans a full task, commits both legs' corridor intervals, and a second drone then waits for them", () => {
    const table = new ReservationTable({ corridor: 1, pads: 2 });
    const a = planSpaceTimeTask({ map: world.map, rules: world.rules, type: L, order: order13, table, drone: "A", depart: 0 });
    expect(a.status).toBe("found");
    const corridorHeld = table.list("corridor");
    expect(corridorHeld.length).toBe(2);
    expect(corridorHeld.every((o) => o.owner === "A" && o.task === order13.id)).toBe(true);
    const b = planSpaceTimeTask({ map: world.map, rules: world.rules, type: L, order: order13, table, drone: "B", depart: 0 });
    expect(b.status).toBe("found");
    if (b.status === "found") expect(b.out.groundWait + b.out.hover + b.back.hover).toBeGreaterThan(0);
    expect(table.list("corridor")).toHaveLength(4);
  });

  it("reports over-budget rather than a route when the battery cannot carry the wait", () => {
    const table = new ReservationTable({ corridor: 1 });
    table.reserve({ resource: "corridor", owner: "B", start: 0, end: 12000 });
    const r = planLeg({ map: world.map, type: L, payloadKg: order13.weight, from: world.map.kitchen, to: order13.node, depart: 0, table, pending: [], owner: "A", budget: 20000, latest: 12600, maxExpansions: 40000 });
    expect(["over-budget", "budget", "no-route"]).toContain(r.status);
    expect(r.leg).toBeUndefined();
  });
});

describe("full re-evaluation", () => {
  it("evaluates the same assignment with the corridor on: waits appear, the plan stays valid", () => {
    const g = greedyAssign(tenWorld);
    const off = evaluate(tenWorld, g.assignment, { charging: true });
    const on = evaluate(tenWorld, g.assignment, { charging: true, corridor: true });
    expect(on.validation.ok).toBe(true);
    expect(on.complete).toBe(true);
    expect(on.occupancies.some((o) => o.resource === "corridor")).toBe(true);
    expect(on.objective!.allReturned).toBeGreaterThanOrEqual(off.objective!.allReturned);
  });

  it("improves by migration or swap without ever returning something worse", () => {
    const g = greedyAssign(tenWorld);
    const start = evaluate(tenWorld, g.assignment, { charging: true });
    const r = improve(tenWorld, g.assignment, { charging: true, maxIterations: 2 });
    expect(["local-optimum", "budget"]).toContain(r.status);
    expect(r.plan.complete).toBe(true);
    expect(r.plan.objective!.lateness).toBeLessThanOrEqual(start.objective!.lateness);
  });
});
