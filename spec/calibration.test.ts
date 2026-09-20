import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FleetData, MapData, OrdersData, RulesData } from "../src/data/schema.ts";
import { planTask } from "../src/engine/task.ts";

// The canonical files are pinned by hash. A change to any of them is a
// decision: regenerate with `pnpm data`, recalibrate with `pnpm calibrate`,
// update the hashes here on purpose, and write the line in docs/moments.md.
const PINNED: Record<string, string> = {
  "map.json": "23cc9c816d9afe88d9d32a58da7d28aca87b736f78627ac51bcf1dd3acac6b11",
  "orders.json": "8ba07d5da6ea0a9562613c4be145012c8bd52ca266cf5acc178908877d92cd4f",
  "fleet.json": "cdad01f30ffa37346862c431e520ee832bdf6a90370bd21d0927ab1ff9da5f87",
  "rules.json": "e80a2339415b8ae879a1198d0397120dc327c04d6af4ddbb5fd086816d3ad5d4",
};

const read = (name: string) => readFileSync(resolve("src/data", name));
const sha = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

describe("the canonical files", () => {
  for (const [name, hash] of Object.entries(PINNED)) {
    it(`${name} is the pinned version`, () => {
      expect(sha(read(name)), `${name} changed; see the note at the top of this file`).toBe(hash);
    });
  }
});

// The facts the course promises about this data (docs/engine.md §8), checked
// by running the planner, not by reading numbers off a table.
describe("the calibrated facts", () => {
  const map = JSON.parse(read("map.json").toString()) as MapData;
  const fleet = JSON.parse(read("fleet.json").toString()) as FleetData;
  const rules = JSON.parse(read("rules.json").toString()) as RulesData;
  const orders = (JSON.parse(read("orders.json").toString()) as OrdersData).orders;
  const L = fleet.types.find((t) => t.id === "L")!;
  const H = fleet.types.find((t) => t.id === "H")!;
  const plan = (type: typeof L, i: number) => planTask({ map, rules, type, order: orders[i], loadFrom: 0 });

  it("a light drone can fly every one of assignment 1's six orders", () => {
    for (let i = 0; i < 6; i++) expect(plan(L, i).status, orders[i].id).toBe("found");
  });

  it("#07 for a light drone: the fastest round trip is over budget and a slower, cheaper one is chosen", () => {
    const p = plan(L, 6);
    expect(p.status).toBe("found");
    expect(p.candidates.length).toBeGreaterThanOrEqual(2);
    expect(p.fastest!.energy).toBeGreaterThan(p.budget);
    expect(p.chosen).not.toBe(p.fastest);
    expect(p.chosen!.time).toBeGreaterThan(p.fastest!.time);
    expect(p.chosen!.energy).toBeLessThanOrEqual(p.budget);
  });

  it("every order can be flown by some type, and #20 only by the heavy one, on payload", () => {
    for (let i = 0; i < 20; i++) expect(plan(L, i).status === "found" || plan(H, i).status === "found", orders[i].id).toBe(true);
    expect(plan(L, 19).status).toBe("infeasible-payload");
    expect(plan(H, 19).status).toBe("found");
  });

  it("the heavy drone reaches all twenty; the light one is out of range for at least one it could carry", () => {
    for (let i = 0; i < 20; i++) expect(plan(H, i).status, orders[i].id).toBe("found");
    expect(orders.some((_, i) => plan(L, i).status === "none-in-domain")).toBe(true);
  });

  it("the hilltop has a steep track and a gentle spiral, and the spiral is the cheaper climb", () => {
    const up = map.edges.filter((e) => e.to === "summit");
    expect(up).toHaveLength(2);
    const [steep, gentle] = [...up].sort((a, b) => b.rise / b.length - a.rise / a.length);
    expect(steep.rise / steep.length).toBeGreaterThan(2 * (gentle.rise / gentle.length));
    expect(gentle.length).toBeGreaterThan(2 * steep.length);
  });
});
