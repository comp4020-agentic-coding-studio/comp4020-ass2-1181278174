import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FleetData, MapData, OrdersData, RulesData } from "../../src/data/schema.ts";
import { fromBiEdges } from "../../src/engine/graph.ts";
import { dominates, labelSearch, pathOf, withinBudget } from "../../src/engine/labels.ts";
import { planTask } from "../../src/engine/task.ts";

// docs/examples.md §2: the fastest prefix eats the return energy.
const ridge = fromBiEdges([
  { from: "S", to: "A", time: 2, energy: 3 },
  { from: "A", to: "Q", time: 2, energy: 4 },
  { from: "S", to: "B", time: 3, energy: 1 },
  { from: "B", to: "Q", time: 3, energy: 2 },
  { from: "Q", to: "G", time: 2, energy: 2 },
]);
const te = (l: { time: number; energy: number }) => [l.time, l.energy];

describe("dominance", () => {
  it("needs no-worse on both and better on one", () => {
    expect(dominates({ time: 4, energy: 3 }, { time: 4, energy: 7 })).toBe(true);
    expect(dominates({ time: 4, energy: 7 }, { time: 6, energy: 3 })).toBe(false);
    expect(dominates({ time: 6, energy: 3 }, { time: 4, energy: 7 })).toBe(false);
    expect(dominates({ time: 4, energy: 7 }, { time: 4, energy: 7 })).toBe(false);
    expect(withinBudget({ energy: 8 }, 8)).toBe(true);
    expect(withinBudget({ energy: 9 }, 8)).toBe(false);
  });
});

describe("the two routes to #07", () => {
  it("keeps both labels at Q: (4,7) and (6,3) do not dominate each other", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8 });
    expect(r.perNode.Q.map(te)).toEqual([[4, 7], [6, 3]]);
  });

  it("finds the ridge complete at (6,9) over budget and the contour at (8,5) feasible", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8 });
    expect(r.status).toBe("found");
    expect(r.all.map(te)).toEqual([[6, 9], [8, 5]]);
    expect(r.feasible.map(te)).toEqual([[8, 5]]);
    expect(pathOf(r.feasible[0])).toEqual(["S", "B", "Q", "G"]);
    expect(pathOf(r.all[0])).toEqual(["S", "A", "Q", "G"]);
  });

  it("the fastest-only version throws the contour away and reports no feasible route", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8, keepOnly: "fastest" });
    expect(r.perNode.Q.map(te)).toEqual([[4, 7]]);
    expect(r.all.map(te)).toEqual([[6, 9]]);
    expect(r.feasible).toEqual([]);
    expect(r.status).toBe("none-in-domain");
    expect(r.pruned.notFastest).toBeGreaterThan(0);
  });

  it("a budget nothing fits is none-in-domain with the over-budget prunes counted", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 4 });
    expect(r.status).toBe("none-in-domain");
    expect(r.feasible).toEqual([]);
    expect(r.pruned.overBudget).toBeGreaterThan(0);
  });

  it("an expansion cap reports budget, not an answer", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8, maxExpansions: 1 });
    expect(r.status).toBe("budget");
  });

  it("records why each label was kept or dropped", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8 });
    const over = r.events.find((e) => e.outcome === "over-budget");
    expect(over).toMatchObject({ node: "G", time: 6, energy: 9 });
  });
});

describe("a full task on the real map", () => {
  const map = JSON.parse(readFileSync(resolve("src/data/map.json"), "utf8")) as MapData;
  const fleet = JSON.parse(readFileSync(resolve("src/data/fleet.json"), "utf8")) as FleetData;
  const rules = JSON.parse(readFileSync(resolve("src/data/rules.json"), "utf8")) as RulesData;
  const orders = (JSON.parse(readFileSync(resolve("src/data/orders.json"), "utf8")) as OrdersData).orders;
  const L = fleet.types.find((t) => t.id === "L")!;
  const H = fleet.types.find((t) => t.id === "H")!;

  it("delivers #03 with a light drone and keeps a consistent ledger", () => {
    const p = planTask({ map, rules, type: L, order: orders[2], loadFrom: 1000 });
    expect(p.status).toBe("found");
    expect(p.depart).toBe(1000 + rules.loadingTicks);
    expect(p.deliver!).toBeGreaterThan(p.depart!);
    expect(p.land!).toBeGreaterThan(p.deliver!);
    expect(p.legs.map((l) => l.kind)).toEqual(["load", "out", "service", "back"]);
    expect(p.legs.reduce((s, l) => s + l.energy, 0)).toBe(p.energyUsed);
    expect(p.energyLeft).toBe(L.batteryJ - p.energyUsed!);
    expect(p.energyUsed!).toBeLessThanOrEqual(p.budget);
    expect(p.legs[1].path![0]).toBe(map.kitchen);
    expect(p.legs[3].path!.at(-1)).toBe(map.kitchen);
    expect(p.legs[1].path!.at(-1)).toBe(orders[2].node);
  });

  it("the unloaded return costs less than the loaded outbound on the same route", () => {
    const p = planTask({ map, rules, type: L, order: orders[2], loadFrom: 0 });
    const out = p.legs[1], back = p.legs[3];
    if (out.path!.join() === [...back.path!].reverse().join()) expect(back.energy).toBeLessThan(out.energy);
    else expect(back.energy).toBeLessThanOrEqual(out.energy + 1); // a different route back; still no heavier
  });

  it("refuses #20 for the light type on payload, before any search", () => {
    const p = planTask({ map, rules, type: L, order: orders[19], loadFrom: 0 });
    expect(p.status).toBe("infeasible-payload");
    expect(p.candidates).toEqual([]);
    const q = planTask({ map, rules, type: H, order: orders[19], loadFrom: 0 });
    expect(q.status).not.toBe("infeasible-payload");
  });

  it("separates the fastest round trip from the chosen one whenever they differ", () => {
    for (const o of orders) {
      const p = planTask({ map, rules, type: L, order: o, loadFrom: 0 });
      if (p.status !== "found") continue;
      expect(p.fastest!.time).toBeLessThanOrEqual(p.chosen!.time);
      if (p.fastest !== p.chosen) expect(p.fastest!.energy).toBeGreaterThan(p.budget);
    }
  });
});
