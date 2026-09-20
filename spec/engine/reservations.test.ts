import { describe, expect, it } from "vitest";
import { overlaps, ReservationTable } from "../../src/engine/reservations.ts";
import { validate, type PlanForValidation } from "../../src/engine/validate.ts";

describe("half-open intervals", () => {
  it("[0,6) meets [5,7) and [3,5), and not [6,8)", () => {
    expect(overlaps({ start: 0, end: 6 }, { start: 5, end: 7 })).toBe(true);
    expect(overlaps({ start: 0, end: 6 }, { start: 3, end: 5 })).toBe(true);
    expect(overlaps({ start: 0, end: 6 }, { start: 6, end: 8 })).toBe(false);
    expect(overlaps({ start: 6, end: 8 }, { start: 0, end: 6 })).toBe(false);
  });
});

// docs/examples.md §4: B holds the corridor [0,6); A reaches P at 3 and needs 2 ticks.
describe("the corridor", () => {
  const table = () => {
    const t = new ReservationTable({ corridor: 1, pads: 2 });
    expect(t.reserve({ resource: "corridor", owner: "B", task: "#09", start: 0, end: 6 })).toBe(true);
    return t;
  };

  it("refuses A's [3,5) because of B, and names B as the conflict", () => {
    const t = table();
    expect(t.available("corridor", 3, 5, "A")).toBe(false);
    expect(t.conflicts("corridor", 3, 5, "A")).toMatchObject([{ owner: "B", start: 0, end: 6 }]);
    expect(t.reserve({ resource: "corridor", owner: "A", start: 3, end: 5 })).toBe(false);
    expect(t.list("corridor")).toHaveLength(1);
  });

  it("grants [6,8): wait three ticks at P, cross in two, arrive at G at 8", () => {
    const t = table();
    expect(t.earliestFree("corridor", 3, 2, "A")).toBe(6);
    expect(t.reserve({ resource: "corridor", owner: "A", start: 6, end: 8 })).toBe(true);
    expect(t.list("corridor").map((o) => [o.owner, o.start, o.end])).toEqual([["B", 0, 6], ["A", 6, 8]]);
  });

  it("counts a drone's consecutive occupancies once", () => {
    const t = new ReservationTable({ corridor: 1 });
    t.reserve({ resource: "corridor", owner: "B", start: 0, end: 3 });
    t.reserve({ resource: "corridor", owner: "B", start: 3, end: 6 });
    expect(t.available("corridor", 2, 4, "A")).toBe(false);
    expect(t.available("corridor", 2, 4, "B")).toBe(true);
  });
});

describe("two charging pads", () => {
  it("take two drones at once and make the third wait for the first to leave", () => {
    const t = new ReservationTable({ pads: 2 });
    t.reserve({ resource: "pads", owner: "X", start: 0, end: 600 });
    t.reserve({ resource: "pads", owner: "Y", start: 100, end: 700 });
    expect(t.available("pads", 200, 300, "Z")).toBe(false);
    expect(t.available("pads", 600, 700, "Z")).toBe(true);
    expect(t.earliestFree("pads", 200, 100, "Z")).toBe(600);
  });

  it("does not confuse two entries that never coincide with two at once", () => {
    const t = new ReservationTable({ pads: 2 });
    t.reserve({ resource: "pads", owner: "X", start: 0, end: 5 });
    t.reserve({ resource: "pads", owner: "Y", start: 5, end: 10 });
    expect(t.available("pads", 0, 10, "Z")).toBe(true);
  });
});

describe("transactions", () => {
  it("keeps nothing when one reservation of a task fails", () => {
    const t = new ReservationTable({ corridor: 1 });
    t.reserve({ resource: "corridor", owner: "B", start: 0, end: 6 });
    const tx = t.transaction();
    expect(tx.reserve({ resource: "corridor", owner: "A", task: "#13", start: 10, end: 12 })).toBe(true);
    expect(tx.reserve({ resource: "corridor", owner: "A", task: "#13", start: 4, end: 5 })).toBe(false);
    tx.rollback();
    expect(t.list("corridor")).toHaveLength(1);
  });

  it("keeps everything on commit, and pending entries block each other", () => {
    const t = new ReservationTable({ corridor: 1 });
    const tx = t.transaction();
    expect(tx.reserve({ resource: "corridor", owner: "A", start: 0, end: 2 })).toBe(true);
    expect(tx.reserve({ resource: "corridor", owner: "A", start: 2, end: 4 })).toBe(true);
    expect(tx.earliestFree("corridor", 0, 2, "C")).toBe(4);
    tx.commit();
    expect(t.list("corridor")).toHaveLength(2);
    expect(() => tx.commit()).toThrow(/closed/);
  });

  it("releases one drone's reservations by task", () => {
    const t = new ReservationTable({ corridor: 1 });
    t.reserve({ resource: "corridor", owner: "A", task: "#13", start: 0, end: 2 });
    t.reserve({ resource: "corridor", owner: "A", task: "#14", start: 5, end: 7 });
    expect(t.release("A", "#13")).toBe(1);
    expect(t.list("corridor").map((o) => o.task)).toEqual(["#14"]);
  });
});

describe("the validator", () => {
  const base = (): PlanForValidation => ({
    orders: ["#01", "#02", "#03"],
    activities: [
      { owner: "A", kind: "load", start: 0, end: 60, task: "#01" },
      { owner: "A", kind: "fly", start: 60, end: 200, task: "#01" },
      { owner: "A", kind: "service", start: 200, end: 245, task: "#01" },
      { owner: "A", kind: "fly", start: 245, end: 380, task: "#01" },
    ],
    occupancies: [{ resource: "corridor", owner: "A", task: "#01", start: 100, end: 130 }],
    deliveries: [{ order: "#01", owner: "A", tick: 245 }],
    capacities: { corridor: 1, pads: 2 },
    cutoff: 12600,
  });

  it("accepts a clean plan and lists the orders it did not finish", () => {
    const v = validate(base());
    expect(v.ok).toBe(true);
    expect(v.delivered).toEqual(["#01"]);
    expect(v.unfinished).toEqual([{ order: "#02", reason: "not-delivered" }, { order: "#03", reason: "not-delivered" }]);
  });

  it("catches a drone doing two things at once", () => {
    const p = base();
    p.activities.push({ owner: "A", kind: "charge", start: 300, end: 900 });
    const v = validate(p);
    expect(v.ok).toBe(false);
    expect(v.violations.map((x) => x.rule)).toEqual(["overlap-self"]);
  });

  it("catches a third drone on two pads and names the tick", () => {
    const p = base();
    p.occupancies.push(
      { resource: "pads", owner: "X", start: 0, end: 600 },
      { resource: "pads", owner: "Y", start: 100, end: 700 },
      { resource: "pads", owner: "Z", start: 200, end: 300 },
    );
    const v = validate(p);
    expect(v.violations).toMatchObject([{ rule: "capacity", resource: "pads", tick: 200 }]);
  });

  it("catches an order delivered twice and an order that is not in the case", () => {
    const p = base();
    p.deliveries.push({ order: "#01", owner: "B", tick: 900 }, { order: "#99", owner: "B", tick: 950 });
    const v = validate(p);
    expect(v.violations.map((x) => x.rule).sort()).toEqual(["delivered-twice", "unknown-order"]);
  });

  it("treats a delivery after the cut-off as unfinished, not as done", () => {
    const p = base();
    p.deliveries.push({ order: "#02", owner: "A", tick: 13000 });
    const v = validate(p);
    expect(v.ok).toBe(true);
    expect(v.delivered).toEqual(["#01"]);
    expect(v.unfinished).toContainEqual({ order: "#02", reason: "after-cutoff" });
  });

  it("rejects an empty or reversed interval", () => {
    const p = base();
    p.activities.push({ owner: "B", kind: "wait", start: 10, end: 10 });
    expect(validate(p).violations.map((x) => x.rule)).toEqual(["interval"]);
  });
});
