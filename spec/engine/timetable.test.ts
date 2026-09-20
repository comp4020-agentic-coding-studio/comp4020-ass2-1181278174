import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FleetData, MapData, OrdersData, RulesData } from "../../src/data/schema.ts";
import { compareObjective, earliestDeadline, enumerate, fifo, improveBySwaps, jobsOf, mapCost, timetable, type CostFn, type Job } from "../../src/engine/timetable.ts";

// docs/examples.md §3A: two orders, different objectives prefer different sequences.
const two: Job[] = [
  { id: "N", ready: 0, promised: 10 },
  { id: "F", ready: 0, promised: 5 },
];
const twoCost: CostFn = (job) => (job.id === "N" ? { d: 1, p: 2, energy: 1 } : { d: 4, p: 8, energy: 1 });

// §3B: six orders; the swaps stop at a local optimum the enumeration beats.
const six: Record<string, { r: number; d: number; p: number; promised: number }> = {
  A: { r: 5, d: 3, p: 6, promised: 9 },
  B: { r: 6, d: 1, p: 2, promised: 13 },
  C: { r: 3, d: 6, p: 12, promised: 12 },
  D: { r: 4, d: 6, p: 12, promised: 28 },
  E: { r: 1, d: 5, p: 10, promised: 25 },
  F: { r: 6, d: 4, p: 8, promised: 22 },
};
const sixJobs: Job[] = Object.entries(six).map(([id, x]) => ({ id, ready: x.r, promised: x.promised }));
const sixCost: CostFn = (job) => ({ d: six[job.id].d, p: six[job.id].p, energy: 1 });
const seq = (ids: string) => ids.split("").map((id) => sixJobs.find((j) => j.id === id)!);
const J = (t: ReturnType<typeof timetable>) => [t.objective!.lateness, t.objective!.allReturned];

describe("two orders", () => {
  it("N→F is late by 1 with delivery sum 7; F→N is on time with delivery sum 13; both return at 10", () => {
    const nf = timetable(two, twoCost);
    const fn = timetable([two[1], two[0]], twoCost);
    expect(nf.slots.map((s) => s.deliver)).toEqual([1, 6]);
    expect(nf.objective).toMatchObject({ lateness: 1, sumDelivery: 7, allReturned: 10, lateCount: 1 });
    expect(fn.slots.map((s) => s.deliver)).toEqual([4, 9]);
    expect(fn.objective).toMatchObject({ lateness: 0, sumDelivery: 13, allReturned: 10, lateCount: 0 });
  });

  it("the course objective prefers F→N; the sum of delivery times would prefer N→F", () => {
    const nf = timetable(two, twoCost).objective;
    const fn = timetable([two[1], two[0]], twoCost).objective;
    expect(compareObjective(fn, nf)).toBeLessThan(0);
    expect(nf!.sumDelivery).toBeLessThan(fn!.sumDelivery);
  });
});

describe("six orders", () => {
  it("earliest-deadline is A,C,B,F,E,D at (57, 55) and waits for orders not yet ready", () => {
    const edf = earliestDeadline(sixJobs);
    expect(edf.map((j) => j.id).join("")).toBe("ACBFED");
    const t = timetable(edf, sixCost);
    expect(J(t)).toEqual([57, 55]);
    expect(t.slots[0].start).toBe(5); // A is not ready until 5
  });

  it("best-improvement swaps stop at A,B,C,F,E,D at (48, 55) with all fifteen neighbours checked", () => {
    const r = improveBySwaps(earliestDeadline(sixJobs), sixCost);
    expect(r.status).toBe("local-optimum");
    expect(r.sequence.map((j) => j.id).join("")).toBe("ABCFED");
    expect([r.objective!.lateness, r.objective!.allReturned]).toEqual([48, 55]);
    expect(r.moves).toHaveLength(1);
    expect(r.moves[0]).toMatchObject({ before: { lateness: 57 }, after: { lateness: 48 } });
    expect(r.neighboursChecked).toBe(30); // fifteen to find the move, fifteen to confirm the optimum
  });

  it("enumeration finds (46, 51) with two tied optima", () => {
    const e = enumerate(sixJobs, sixCost);
    expect(e.count).toBe(720);
    expect([e.best!.lateness, e.best!.allReturned]).toEqual([46, 51]);
    expect(e.optima.map((s) => s.join(""))).toEqual(["EBAFCD", "EBAFDC"]);
  });

  it("a budget stop is reported as budget, not as a local optimum", () => {
    const r = improveBySwaps(earliestDeadline(sixJobs), sixCost, { maxIterations: 0 });
    expect(r.status).toBe("budget");
    expect(r.sequence.map((j) => j.id).join("")).toBe("ACBFED");
  });

  it("the local optimum really is one: no single swap of A,B,C,F,E,D improves", () => {
    const base = timetable(seq("ABCFED"), sixCost).objective;
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      const s = seq("ABCFED");
      [s[i], s[j]] = [s[j], s[i]];
      expect(compareObjective(timetable(s, sixCost).objective, base)).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses to enumerate more than the limit", () => {
    expect(() => enumerate([...sixJobs, ...sixJobs, ...sixJobs], sixCost)).toThrow(/limit/);
  });
});

describe("on the real map", () => {
  const map = JSON.parse(readFileSync(resolve("src/data/map.json"), "utf8")) as MapData;
  const fleet = JSON.parse(readFileSync(resolve("src/data/fleet.json"), "utf8")) as FleetData;
  const rules = JSON.parse(readFileSync(resolve("src/data/rules.json"), "utf8")) as RulesData;
  const orders = (JSON.parse(readFileSync(resolve("src/data/orders.json"), "utf8")) as OrdersData).orders;
  const L = fleet.types.find((t) => t.id === "L")!;
  const first6 = orders.slice(0, 6);
  const cost = mapCost(map, rules, L, first6);
  const opts = { loadingTicks: rules.loadingTicks, turnaroundTicks: rules.turnaroundTicks };

  it("runs the six A1 orders in FIFO order with a consistent timetable", () => {
    const t = timetable(fifo(jobsOf(first6)), cost, opts);
    for (const [k, s] of t.slots.entries()) {
      const o = first6.find((x) => x.id === s.id)!;
      expect(s.start).toBeGreaterThanOrEqual(o.ready);
      expect(s.depart).toBe(s.start + rules.loadingTicks);
      expect(s.deliver).toBeGreaterThan(s.depart);
      expect(s.ret).toBeGreaterThan(s.deliver);
      expect(s.available).toBe(s.ret + rules.turnaroundTicks);
      if (k > 0) expect(s.start).toBeGreaterThanOrEqual(t.slots[k - 1].available);
    }
  });

  it("the swap improver never returns something worse than its start, and the enumeration never worse than the improver", () => {
    const start = earliestDeadline(jobsOf(first6));
    const startT = timetable(start, cost, opts);
    const r = improveBySwaps(start, cost, opts);
    if (r.status === "infeasible") return;
    expect(compareObjective(r.objective, startT.objective)).toBeLessThanOrEqual(0);
    const e = enumerate(jobsOf(first6), cost, opts);
    expect(compareObjective(e.best, r.objective)).toBeLessThanOrEqual(0);
    expect(e.count).toBe(720);
  });
});
