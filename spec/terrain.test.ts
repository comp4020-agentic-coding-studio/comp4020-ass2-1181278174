import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { MapData } from "../src/data/schema.ts";
import { contourRadius, heightAt, hill } from "../src/data/terrain.ts";

// The map drawing computes contour lines from src/data/terrain.ts. This
// proves the function it draws is the one the generator wrote the node
// heights from: every node's z is the terrain height at its position.

const map = JSON.parse(readFileSync(resolve("src/data/map.json"), "utf8")) as MapData;

describe("terrain", () => {
  it("gives every node of the map its recorded height", () => {
    for (const n of map.nodes) expect(Math.abs(hill(map.world, n.x, n.y) - n.z), n.id).toBeLessThanOrEqual(0.05);
  });

  it("is highest at the summit and falls with distance", () => {
    const summit = map.nodes.find((n) => n.id === "summit")!;
    expect(Math.round(heightAt(map.world, 0))).toBe(Math.round(summit.z));
    let last = heightAt(map.world, 0);
    for (let d = 25; d <= 2500; d += 25) {
      const h = heightAt(map.world, d);
      expect(h).toBeLessThan(last);
      last = h;
    }
  });

  it("finds the contour circles the drawing needs", () => {
    for (const h of [10, 60, 120, 160]) {
      const r = contourRadius(map.world, h)!;
      expect(r).toBeGreaterThan(0);
      expect(Math.abs(heightAt(map.world, r) - h)).toBeLessThan(0.01);
    }
    expect(contourRadius(map.world, 0)).toBeNull();
    expect(contourRadius(map.world, 200)).toBeNull();
  });
});
