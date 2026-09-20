import { describe, expect, it } from "vitest";
import mapJson from "../src/data/map.json";
import type { MapData } from "../src/data/schema.ts";
import { mapSvg, setMapWidth } from "../src/workbench/minimap.ts";

// The map carries the hill, the ridge, the corridor and the street directory,
// zooms with an overview, and draws at the width the client asks for.

const map = mapJson as MapData;

describe("the map", () => {
  it("draws the hill, the ridge, the corridor and the street directory", () => {
    const svg = mapSvg(map, { ariaLabel: "the whole map" });
    expect((svg.match(/<circle [^>]*stroke="#8d7a52"/g) ?? []).length).toBeGreaterThanOrEqual(16);
    expect(svg).toContain("Slop Ridge");
    expect(svg).toContain("Corridor · capacity 1");
    expect(svg).toContain(">A<");
    expect(svg).toContain(">G<");
    expect(svg).toContain(">1<");
    expect(svg).toContain(">7<");
    expect(svg).toContain("Kitchen");
  });

  it("keeps an overview when zoomed and none when not", () => {
    const zoomed = mapSvg(map, { box: [0, 0, 800, 800], ariaLabel: "the kitchen's block" });
    expect(zoomed).toContain("-oclip");
    expect(mapSvg(map, { ariaLabel: "all" })).not.toContain("-oclip");
  });

  it("draws at the width the client asks for", () => {
    setMapWidth(350);
    expect(mapSvg(map, { ariaLabel: "phone" })).toContain('viewBox="0 0 350 ');
    setMapWidth(560);
    expect(mapSvg(map, { ariaLabel: "desktop" })).toContain('viewBox="0 0 560 ');
  });
});
