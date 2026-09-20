import { describe, expect, it } from "vitest";
import { caseFor } from "../src/workbench/cases.ts";
import { buildingName, placeName } from "../src/workbench/names.ts";

// The pages name places as a street directory does; the data keeps its ids.

const visibleText = (html: string) => html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ");

describe("place names", () => {
  it("names street corners by column letter and row number from the north", () => {
    expect(placeName("s-3-2")).toBe("C4");
    expect(placeName("s-3-3")).toBe("D4");
    expect(placeName("s-1-1")).toBe("B6");
    expect(placeName("s-6-0")).toBe("A1");
    expect(placeName("kitchen")).toBe("Kitchen");
    expect(placeName("summit")).toBe("Summit");
    expect(placeName("S")).toBe("S");
  });

  it("names buildings in words", () => {
    expect(buildingName("block-2")).toBe("building 2");
    expect(buildingName("tower-n")).toBe("the north tower");
    expect(buildingName("ridge-s-2-2")).toBe("the ridge at C5");
  });

  it("keeps every data id out of the text of every week's workbench", () => {
    for (let week = 1; week <= 12; week++) {
      const def = caseFor(week)!;
      const text = visibleText(def.render(def.initial(week), week).html);
      expect(text, `week ${week}`).not.toMatch(/\bs-\d+-\d+\b/);
      expect(text, `week ${week}`).not.toMatch(/\bblock-\d+\b/);
    }
  });
});

