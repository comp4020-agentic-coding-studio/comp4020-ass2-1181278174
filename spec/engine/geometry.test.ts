import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { MapData } from "../../src/data/schema.ts";
import { blockedBy, segmentHitsRect } from "../../src/engine/geometry.ts";

const box = { id: "b", kind: "block" as const, x: 100, y: 100, w: 50, d: 50, h: 10 };

describe("a segment against a footprint", () => {
  it("hits when it crosses, misses when it passes beside or ends at the wall", () => {
    expect(segmentHitsRect([0, 125], [200, 125], box)).toBe(true);
    expect(segmentHitsRect([0, 50], [200, 50], box)).toBe(false);
    expect(segmentHitsRect([0, 125], [100, 125], box)).toBe(false);
    expect(segmentHitsRect([110, 0], [140, 300], box)).toBe(true);
  });

  it("names every building a polyline passes through", () => {
    const other = { ...box, id: "c", x: 300 };
    expect(blockedBy([[0, 125], [400, 125]], [box, other]).map((b) => b.id)).toEqual(["b", "c"]);
    expect(blockedBy([[0, 125], [90, 125], [90, 300]], [box, other])).toEqual([]);
  });
});

describe("on the canonical map", () => {
  const map = JSON.parse(readFileSync(resolve("src/data/map.json"), "utf8")) as MapData;
  it("every street is legal", () => {
    for (const e of map.edges) expect(blockedBy(e.polyline, map.buildings), e.id).toEqual([]);
  });
});
