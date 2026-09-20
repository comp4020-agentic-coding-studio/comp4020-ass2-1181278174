// Calibration of the fleet numbers against the facts the course promises:
//   pnpm calibrate          print every order × type and check the targets
//   pnpm calibrate --search scan batteries and grade factors, print what passes
//
// Targets (docs/engine.md §8, docs/course.md):
//   T1  #01–#06 feasible for L (assignment 1 flies one light drone)
//   T2  #07 for L: at least two candidates, the fastest over budget, a slower one feasible
//   T3  every order feasible for at least one type; #20 feasible only for H, by payload
//   T4  H feasible for all twenty (the long-range type)
//   T5  L infeasible for at least one order that fits its payload (a short-range type)

import { readFileSync } from "node:fs";
import type { DroneType, FleetData, MapData, OrdersData, RulesData } from "../../src/data/schema.ts";
import { planTask } from "../../src/engine/task.ts";

const map = JSON.parse(readFileSync("src/data/map.json", "utf8")) as MapData;
const rules = JSON.parse(readFileSync("src/data/rules.json", "utf8")) as RulesData;
const orders = (JSON.parse(readFileSync("src/data/orders.json", "utf8")) as OrdersData).orders;
const fleet = JSON.parse(readFileSync("src/data/fleet.json", "utf8")) as FleetData;

type Row = ReturnType<typeof planTask>;
function plans(type: DroneType): Row[] {
  return orders.map((order) => planTask({ map, rules, type, order, loadFrom: 0 }));
}

function targets(L: Row[], H: Row[], budgetL: number): { pass: boolean; report: string[] } {
  const r: string[] = [];
  const ok = (name: string, cond: boolean, detail: string) => r.push(`${cond ? "PASS" : "FAIL"} ${name}: ${detail}`);
  ok("T1", L.slice(0, 6).every((p) => p.status === "found"), `#01–#06 for L: ${L.slice(0, 6).map((p) => p.status === "found" ? "ok" : p.status).join(" ")}`);
  const s = L[6];
  ok("T2", s.candidates.length >= 2 && !!s.fastest && s.fastest.energy > budgetL && !!s.chosen && s.chosen !== s.fastest,
    `#07 for L: ${s.candidates.length} candidates; fastest ${s.fastest ? `${s.fastest.time}s/${s.fastest.energy}J` : "-"}; chosen ${s.chosen ? `${s.chosen.time}s/${s.chosen.energy}J` : "-"}; budget ${budgetL}J`);
  const someType = orders.every((_, i) => L[i].status === "found" || H[i].status === "found");
  ok("T3", someType && L[19].status === "infeasible-payload" && H[19].status === "found",
    `every order by some type: ${someType}; #20 L ${L[19].status}, H ${H[19].status}`);
  ok("T4", H.every((p) => p.status === "found"), `H infeasible for: ${H.filter((p) => p.status !== "found").map((p) => p.order).join(" ") || "none"}`);
  const shortRange = L.filter((p) => p.status === "none-in-domain").map((p) => p.order);
  ok("T5", shortRange.length >= 1, `L out of range for: ${shortRange.join(" ") || "none"}`);
  return { pass: r.every((x) => x.startsWith("PASS")), report: r };
}

function table(type: DroneType, rows: Row[]): void {
  const budget = Math.floor(type.batteryJ * (1 - rules.reserveFraction));
  console.log(`== ${type.id}: battery ${type.batteryJ} J, budget ${budget} J, lift ${type.liftJPerM} J/m, gradeFactor ${type.gradeFactor}, maxClimb ${type.maxClimb}`);
  for (const [i, p] of rows.entries()) {
    const z = map.nodes.find((n) => n.id === orders[i].node)!.z;
    const f = p.fastest ? `${p.fastest.time}s/${p.fastest.energy}J` : "-";
    const c = p.chosen ? `${p.chosen.time}s/${p.chosen.energy}J` : "-";
    const mark = p.fastest && p.chosen && p.fastest !== p.chosen ? "  <- fastest over budget" : "";
    console.log(`${orders[i].id} z=${String(z).padStart(5)} ${p.status.padEnd(18)} cands ${p.candidates.length}  fastest ${f.padEnd(15)} chosen ${c.padEnd(15)}${mark}`);
  }
}

const L = fleet.types.find((t) => t.id === "L")!;
const H = fleet.types.find((t) => t.id === "H")!;

if (process.argv.includes("--search")) {
  const hits: string[] = [];
  for (const gradeFactor of [15, 20, 25, 30, 40]) {
    for (const liftJPerM of [60, 80, 100]) {
      const l = { ...L, gradeFactor, liftJPerM };
      const lp = plans(l);
      for (let batteryJ = 60000; batteryJ <= 250000; batteryJ += 5000) {
        const lt = { ...l, batteryJ };
        const budget = Math.floor(batteryJ * (1 - rules.reserveFraction));
        // recompute only what the budget changes: chosen/status
        const lpb = orders.map((order) => planTask({ map, rules, type: lt, order, loadFrom: 0 }));
        for (let hBattery = 150000; hBattery <= 600000; hBattery += 25000) {
          const ht = { ...H, gradeFactor, liftJPerM: Math.round(liftJPerM * 1.5), batteryJ: hBattery };
          const hp = plans(ht);
          const t = targets(lpb, hp, budget);
          if (t.pass) hits.push(`gradeFactor ${gradeFactor} lift ${liftJPerM} L ${batteryJ} H ${hBattery}  | ${t.report[1].replace(/^PASS T2: /, "")}`);
          if (t.pass) break;
        }
      }
      void lp;
    }
  }
  console.log(hits.length ? hits.join("\n") : "no combination passed");
} else {
  const lp = plans(L), hp = plans(H);
  table(L, lp);
  table(H, hp);
  const t = targets(lp, hp, Math.floor(L.batteryJ * (1 - rules.reserveFraction)));
  console.log(t.report.join("\n"));
  process.exitCode = t.pass ? 0 : 1;
}
