import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Building, FleetData, MapData, OrdersData, RulesData } from "../src/data/schema.ts";

// The canonical data's contract: the shape the engine, the tutorials and the
// spec all assume. Numbers (speeds, weights, budgets) are calibrated later and
// pinned by hash then; this file holds what must be true of any version.

const read = <T>(name: string): T => JSON.parse(readFileSync(resolve("src/data", name), "utf8")) as T;
const map = read<MapData>("map.json");
const orders = read<OrdersData>("orders.json").orders;
const fleet = read<FleetData>("fleet.json");
const rules = read<RulesData>("rules.json");
const node = (id: string) => map.nodes.find((n) => n.id === id);
const L = fleet.types.find((t) => t.id === "L")!;

function segmentHitsRect(p: [number, number], q: [number, number], b: Building): boolean {
  for (let t = 0; t <= 1; t += 0.02) {
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.d) return true;
  }
  return false;
}

function dijkstra(from: string, skipResource?: string): Map<string, number> {
  const d = new Map<string, number>([[from, 0]]);
  const open = new Set<string>([from]);
  while (open.size) {
    let u = ""; let best = Infinity;
    for (const v of open) if (d.get(v)! < best) { best = d.get(v)!; u = v; }
    open.delete(u);
    for (const e of map.edges) {
      if (e.from !== u || (skipResource && e.resource === skipResource)) continue;
      const nd = best + e.length;
      if (nd < (d.get(e.to) ?? Infinity)) { d.set(e.to, nd); open.add(e.to); }
    }
  }
  return d;
}

describe("the map", () => {
  it("has unique nodes and edges whose ends exist", () => {
    expect(new Set(map.nodes.map((n) => n.id)).size).toBe(map.nodes.length);
    for (const e of map.edges) {
      expect(node(e.from), e.id).toBeDefined();
      expect(node(e.to), e.id).toBeDefined();
      expect(e.length).toBeGreaterThan(0);
    }
  });

  it("stores every street in both directions with consistent geometry", () => {
    const ids = new Set(map.edges.map((e) => e.id));
    for (const e of map.edges) {
      expect(ids.has(`${e.to}>${e.from}`), `${e.id} has no reverse`).toBe(true);
      const a = node(e.from)!, b = node(e.to)!;
      expect(Math.abs(e.rise - (b.z - a.z)), `${e.id} rise`).toBeLessThan(0.11);
      expect(e.polyline[0]).toEqual([a.x, a.y]);
      expect(e.polyline[e.polyline.length - 1]).toEqual([b.x, b.y]);
      expect(e.resource === undefined || e.resource === map.edges.find((r) => r.id === `${e.to}>${e.from}`)!.resource).toBe(true);
    }
  });

  it("is connected from the kitchen", () => {
    expect(dijkstra(map.kitchen).size).toBe(map.nodes.length);
  });

  it("has one corridor, two-way, between waiting points, with a detour at least three times as long", () => {
    const corridor = map.edges.filter((e) => e.resource === "corridor");
    expect(corridor).toHaveLength(2);
    const [a, b] = [corridor[0].from, corridor[0].to];
    expect(node(a)!.wait && node(b)!.wait).toBe(true);
    const detour = dijkstra(a, "corridor").get(b)!;
    expect(Number.isFinite(detour), "the detour must exist").toBe(true);
    expect(detour / corridor[0].length).toBeGreaterThanOrEqual(3);
  });

  it("has no street through a building", () => {
    for (const e of map.edges) for (const b of map.buildings) {
      expect(segmentHitsRect(e.polyline[0], e.polyline[1], b), `${e.id} passes through ${b.id}`).toBe(false);
    }
    expect(map.buildings.filter((b) => b.kind === "tower")).toHaveLength(2);
  });
});

describe("the orders", () => {
  it("are #01 to #20 on distinct existing nodes, inside the evening, promised after ready", () => {
    expect(orders.map((o) => o.id)).toEqual(Array.from({ length: 20 }, (_, i) => `#${String(i + 1).padStart(2, "0")}`));
    expect(new Set(orders.map((o) => o.node)).size).toBe(20);
    for (const o of orders) {
      expect(node(o.node), o.id).toBeDefined();
      expect(o.ready).toBeGreaterThanOrEqual(0);
      expect(o.ready).toBeLessThan(rules.evening.endTick);
      expect(o.promised).toBeGreaterThan(o.ready);
      expect(o.promised).toBeLessThanOrEqual(rules.evening.cutoffTick);
    }
  });

  it("number by ready time", () => {
    for (let i = 1; i < orders.length; i++) expect(orders[i].ready).toBeGreaterThanOrEqual(orders[i - 1].ready);
  });

  it("put #07 on the highest node and #20 beyond the light drone's payload", () => {
    const top = Math.max(...map.nodes.map((n) => n.z));
    expect(node(orders[6].node)!.z).toBe(top);
    expect(orders[19].weight).toBeGreaterThan(L.payloadKg);
    expect(orders.filter((o) => o.weight > L.payloadKg).map((o) => o.id)).toEqual(["#20"]);
  });

  it("put #13 across the corridor: its shortest way from the kitchen uses it", () => {
    const via = dijkstra(map.kitchen).get(orders[12].node)!;
    const without = dijkstra(map.kitchen, "corridor").get(orders[12].node)!;
    expect(without).toBeGreaterThan(via);
  });
});

describe("the fleet and the rules", () => {
  it("has five drones of two types and two charging pads", () => {
    expect(fleet.drones).toHaveLength(5);
    expect(fleet.drones.filter((d) => d.type === "L")).toHaveLength(3);
    expect(fleet.types.map((t) => t.id).sort()).toEqual(["H", "L"]);
    expect(rules.resources.pads.capacity).toBe(2);
    expect(rules.resources.corridor.capacity).toBe(1);
  });

  it("keeps the objective order and a positive reserve", () => {
    expect(rules.objective).toEqual(["lateness", "allReturned", "energy"]);
    expect(rules.reserveFraction).toBeGreaterThan(0);
    expect(rules.reserveFraction).toBeLessThan(0.5);
    expect(rules.evening.cutoffTick).toBeGreaterThan(rules.evening.endTick);
  });
});
