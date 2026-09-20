import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FleetData, MapData } from "../../src/data/schema.ts";
import { edgeEnergy, edgeTicks, fromEdges, fromMap, straightLineTicks } from "../../src/engine/graph.ts";
import { admissible, consistent, Searcher, search } from "../../src/engine/search.ts";

// docs/examples.md §1: four edges, an admissible but inconsistent heuristic.
const four = fromEdges([
  { from: "S", to: "A", cost: 3 },
  { from: "S", to: "B", cost: 1 },
  { from: "B", to: "A", cost: 1 },
  { from: "A", to: "G", cost: 2 },
]);
const h = (id: string) => ({ S: 0, A: 0, B: 3, G: 0 })[id] ?? 0;

describe("the four-edge counterexample", () => {
  it("Dijkstra returns cost 4 by S, B, A, G", () => {
    const r = search(four, "S", "G");
    expect(r.status).toBe("found");
    expect(r.cost).toBe(4);
    expect(r.path).toEqual(["S", "B", "A", "G"]);
  });

  it("A* that never reopens a closed node returns 5", () => {
    const r = search(four, "S", "G", { heuristic: h, reopenClosed: false });
    expect(r.cost).toBe(5);
    expect(r.path).toEqual(["S", "A", "G"]);
    expect(r.steps.map((s) => s.popped)).toEqual(["S", "A", "B", "G"]);
    const bAtA = r.steps[2].relaxed.find((x) => x.to === "A")!;
    expect(bAtA.newG).toBe(2);
    expect(bAtA.skippedClosed).toBe(true);
  });

  it("A* that reopens returns 4, and the trace shows A expanded twice", () => {
    const r = search(four, "S", "G", { heuristic: h, reopenClosed: true });
    expect(r.cost).toBe(4);
    expect(r.path).toEqual(["S", "B", "A", "G"]);
    expect(r.steps.map((s) => s.popped)).toEqual(["S", "A", "B", "A", "G"]);
    expect(r.steps[2].relaxed.find((x) => x.to === "A")!.reopened).toBe(true);
    expect(r.expansions).toBe(5);
  });

  it("the heuristic is admissible and not consistent, and the violation is B→A", () => {
    expect(admissible(four, h, "G").ok).toBe(true);
    const c = consistent(four, h);
    expect(c.ok).toBe(false);
    expect(c.violations).toEqual([{ from: "B", to: "A", h: 3, cost: 1, hTo: 0 }]);
  });

  it("the first step shows A at f=3 and B at f=4 on the open list", () => {
    const s = new Searcher(four, "S", "G", { heuristic: h });
    const first = s.step()!;
    expect(first.popped).toBe("S");
    expect(first.open.map((e) => [e.node, e.g, e.f])).toEqual([["A", 3, 3], ["B", 1, 4]]);
  });
});

describe("edge cases the tutorial tests", () => {
  it("source equal to goal costs 0 with a one-node path", () => {
    const r = search(four, "G", "G");
    expect(r).toMatchObject({ status: "found", cost: 0, path: ["G"] });
  });

  it("an unreachable goal is no-solution, not an error", () => {
    const r = search(four, "G", "S");
    expect(r.status).toBe("no-solution");
    expect(r.cost).toBeUndefined();
  });

  it("an expansion budget stops with status budget, never with a partial answer", () => {
    const r = search(four, "S", "G", { maxExpansions: 1 });
    expect(r.status).toBe("budget");
    expect(r.path).toBeUndefined();
  });

  it("a beaten queue entry is popped as stale and not expanded", () => {
    const g = fromEdges([
      { from: "S", to: "A", cost: 5 },
      { from: "S", to: "B", cost: 1 },
      { from: "B", to: "A", cost: 1 },
      // G is far enough that the beaten A entry comes up before the goal does.
      { from: "A", to: "G", cost: 10 },
    ]);
    const r = search(g, "S", "G");
    expect(r.cost).toBe(12);
    const stale = r.steps.filter((s) => s.stale);
    expect(stale.map((s) => [s.popped, s.g])).toEqual([["A", 5]]);
    expect(r.expansions).toBe(4);
    expect(r.steps).toHaveLength(5);
  });

  it("equal-cost paths give the same cost whichever is found", () => {
    const g = fromEdges([
      { from: "S", to: "A", cost: 2 },
      { from: "S", to: "B", cost: 2 },
      { from: "A", to: "G", cost: 2 },
      { from: "B", to: "G", cost: 2 },
    ]);
    expect(search(g, "S", "G").cost).toBe(4);
  });
});

describe("the real map", () => {
  const map = JSON.parse(readFileSync(resolve("src/data/map.json"), "utf8")) as MapData;
  const fleet = JSON.parse(readFileSync(resolve("src/data/fleet.json"), "utf8")) as FleetData;
  const L = fleet.types.find((t) => t.id === "L")!;
  const orders = JSON.parse(readFileSync(resolve("src/data/orders.json"), "utf8")).orders as { id: string; node: string }[];
  const summit = orders[6].node;
  const time = fromMap(map, L, "time");

  it("costs a steep edge more time and more energy than a gentle one of the same length", () => {
    const steep = { id: "x", from: "a", to: "b", length: 300, rise: 120, polyline: [] as [number, number][] };
    const gentle = { ...steep, rise: 15 };
    const down = { ...steep, rise: -60 };
    expect(edgeTicks(steep, L)).toBeGreaterThan(edgeTicks(gentle, L));
    expect(edgeEnergy(steep, L)).toBeGreaterThan(edgeEnergy(gentle, L));
    expect(edgeEnergy(gentle, L)).toBeGreaterThan(edgeEnergy(down, L));
    expect(edgeTicks(down, L)).toBe(edgeTicks({ ...steep, rise: 0 }, L));
    expect(edgeEnergy(steep, L, 1.4)).toBeGreaterThan(edgeEnergy(steep, L, 0));
  });

  it("reaches the summit from the kitchen, and A* with the straight-line bound agrees with Dijkstra", () => {
    const d = search(time, map.kitchen, summit);
    const a = search(time, map.kitchen, summit, { heuristic: straightLineTicks(time, L, summit) });
    expect(d.status).toBe("found");
    expect(a.cost).toBe(d.cost);
    expect(a.expansions).toBeLessThan(d.expansions);
  });

  it("the straight-line-over-speed heuristic is admissible and consistent on this map", () => {
    const hs = straightLineTicks(time, L, summit);
    expect(admissible(time, hs, summit).ok).toBe(true);
    expect(consistent(time, hs).ok).toBe(true);
  });
});
