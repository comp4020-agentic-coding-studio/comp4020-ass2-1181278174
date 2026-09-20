import { describe, expect, it } from "vitest";
import { caseByKey } from "../src/workbench/cases.ts";

const text = (html: string) => html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ").replace(/\s+/g, " ");

// A scenario made by hand is a configuration of the fixed world; the greedy
// planner and the validator answer for it like for the canonical one.

describe("scenario design", () => {
  it("adds an order, evaluates the greedy plan under charging and the corridor, and validates it", () => {
    const def = caseByKey("design")!;
    let s = def.initial(0);
    expect(text(def.render(s, 0).html)).toContain("20 orders, 5 drones");
    s = def.apply(s, { id: "node", value: "summit" });
    s = def.apply(s, { id: "weight", value: "3.5" });
    s = def.apply(s, { id: "add" });
    const html = text(def.render(s, 0).html);
    expect(html).toContain("21 orders");
    expect(html).toContain("#21");
    expect(html).toMatch(/✓ validated|Diagnostic/);
    s = def.apply(s, { id: "heavy", value: "0" });
    expect(text(def.render(s, 0).html)).toMatch(/#21[^.]*cannot be flown by any drone in this fleet/);
    s = def.apply(s, { id: "reset" });
    expect(s.extra).toEqual([]);
  });

  it("a closed corridor window is respected and reported", () => {
    const def = caseByKey("design")!;
    let s = def.initial(0);
    s = def.apply(s, { id: "closure", value: "3600-5400" });
    const html = text(def.render(s, 0).html);
    expect(html).toContain("corridor closed 19:00–19:30");
    expect(html).toMatch(/✓ validated|Diagnostic/);
  });

  it("ignores a link that carries an order off the map", () => {
    const def = caseByKey("design")!;
    const s = { ...def.initial(0), extra: [{ node: "nowhere", weight: 1, ready: 100, promised: 200 }, { node: "summit", weight: 1, ready: 100, promised: 50 }] };
    expect(text(def.render(s, 0).html)).toContain("20 orders");
  });
});
