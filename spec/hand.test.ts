import { describe, expect, it } from "vitest";
import { caseByKey } from "../src/workbench/cases.ts";

const text = (html: string) => html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ").replace(/\s+/g, " ");

// Plans made by hand go through the same engine and the same validator as
// the presets; a plan that cannot fly is called diagnostic, never a result.

describe("plans made by hand", () => {
  it("week 5: moving an order changes the sequence and the timetable is computed again", () => {
    const def = caseByKey("timetable")!;
    let s = def.initial(5);
    s = def.apply(s, { id: "rule", value: "hand" });
    expect(text(def.render(s, 5).html)).toContain("Your sequence: #01 → #02 → #03");
    s = def.apply(s, { id: "down", value: "0" });
    expect(s.hand).toEqual(["#02", "#01", "#03", "#04", "#05", "#06"]);
    expect(text(def.render(s, 5).html)).toContain("Your sequence: #02 → #01 → #03");
    s = def.apply(s, { id: "up", value: "0" });
    expect(s.hand[0]).toBe("#02");
    s = def.apply(s, { id: "hand-from", value: "edf" });
    expect(text(def.render(s, 5).html)).toContain("Your sequence: #01 → #02 → #04 → #03");
  });

  it("week 7: an order given to a drone that cannot carry it makes the plan diagnostic, moving it back makes it valid", () => {
    const def = caseByKey("assign")!;
    let s = def.initial(7);
    s = def.apply(s, { id: "assign:#20", value: "A" });
    expect(s.rule).toBe("hand");
    const bad = text(def.render(s, 7).html);
    expect(bad).toContain("diagnostic, not a plan");
    expect(bad).toMatch(/#20 on A: payload 3\.5 kg/);
    s = def.apply(s, { id: "assign:#20", value: "D" });
    expect(text(def.render(s, 7).html)).toContain("✓ validated: no violation");
    s = def.apply(s, { id: "assign:#03", value: "" });
    expect(text(def.render(s, 7).html)).toContain("not assigned to anyone: #03");
  });

  it("week 9: a take-off delay chosen by hand clears the conflict; none does not", () => {
    const def = caseByKey("corridor")!;
    let s = def.initial(9);
    s = def.apply(s, { id: "arrangement", value: "hand" });
    expect(text(def.render(s, 9).html)).toContain("✗ conflict");
    s = def.apply(s, { id: "delay", value: "5" });
    expect(text(def.render(s, 9).html)).toContain("✓ validated: no violation");
    s = def.apply(s, { id: "via", value: "around" });
    expect(text(def.render(s, 9).html)).toContain("no shared resource used");
  });
});

