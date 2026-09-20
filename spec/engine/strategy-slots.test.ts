import { describe, expect, it } from "vitest";
import { fromBiEdges, fromEdges } from "../../src/engine/graph.ts";
import { labelSearch } from "../../src/engine/labels.ts";
import { search } from "../../src/engine/search.ts";

const ridge = fromBiEdges([
  { from: "S", to: "A", time: 2, energy: 3 },
  { from: "A", to: "Q", time: 2, energy: 4 },
  { from: "S", to: "B", time: 3, energy: 1 },
  { from: "B", to: "Q", time: 3, energy: 2 },
  { from: "Q", to: "G", time: 2, energy: 2 },
]);

describe("the learner's strategy reaches the search", () => {
  it("a time-only dominance function loses the feasible contour prefix", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8, dominates: (a, b) => a.time < b.time });
    expect(r.status).toBe("none-in-domain");
    expect(r.events.find(e => e.node === "Q" && e.energy === 3)).toMatchObject({ outcome: "dominated", path: ["S", "B", "Q"] });
  });
  it("the budget function can reject a label the default accepts", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8, withinBudget: label => label.energy < 5 });
    expect(r.feasible).toEqual([]);
    expect(r.events.some(e => e.node === "G" && e.outcome === "over-budget")).toBe(true);
  });
  it("every prune retains the prefix needed to locate it on the map", () => {
    const r = labelSearch(ridge, "S", "G", { budget: 8 });
    expect(r.events.find(e => e.outcome === "over-budget")?.path).toEqual(["S", "A", "Q", "G"]);
  });
  it("the labelled discovery-stop diagnostic really returns the wrong route", () => {
    const graph = fromEdges([{ from: "S", to: "G", cost: 10 }, { from: "S", to: "A", cost: 1 }, { from: "A", to: "G", cost: 1 }]);
    expect(search(graph, "S", "G").cost).toBe(2);
    expect(search(graph, "S", "G", { stopOnDiscovery: true }).cost).toBe(10);
  });
});
