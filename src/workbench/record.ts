// The worked-example record: the five model upgrades on the one instance,
// each with what changed, what it broke and what survived, and — where the
// engine already covers the stage — the numbers, computed at build time.

import type { FleetData, MapData, OrdersData, RulesData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import rulesJson from "../data/rules.json";
import { fromMap } from "../engine/graph.ts";
import { search } from "../engine/search.ts";
import { planTask } from "../engine/task.ts";
import { compareObjective, earliestDeadline, enumerate, fifo, improveBySwaps, jobsOf, mapCost, timetable } from "../engine/timetable.ts";
import { clock, fmtTicks, kJ } from "./html.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const rules = rulesJson as unknown as RulesData;
const orders = (ordersJson as OrdersData).orders;
const L = fleet.types.find((t) => t.id === "L")!;

export interface RecordEntry {
  stage: string;
  weeks: string;
  href: string;
  changed: string;
  broke: string;
  survived: string;
  /** Numbers from the engine; absent where the engine does not reach yet. */
  computed?: string;
}

export function record(): RecordEntry[] {
  const summit = orders[6];
  const route = search(fromMap(map, L, "time"), map.kitchen, summit.node);
  const trip = planTask({ map, rules, type: L, order: summit, loadFrom: 0 });
  const six = orders.slice(0, 6);
  const cost = mapCost(map, rules, L, six);
  const opts = { loadingTicks: rules.loadingTicks, turnaroundTicks: rules.turnaroundTicks };
  const f = timetable(fifo(jobsOf(six)), cost, opts).objective!;
  const e = timetable(earliestDeadline(jobsOf(six)), cost, opts).objective!;
  const s = improveBySwaps(earliestDeadline(jobsOf(six)), cost, opts);
  const best = enumerate(jobsOf(six), cost, opts);

  return [
    {
      stage: "Find a route",
      weeks: "Weeks 1–3",
      href: "/sessions/w02-dijkstra/",
      changed: "The evening became a graph: streets as edges with a time cost, buildings deciding which connections are legal.",
      broke: "The straight line from the kitchen to the customer.",
      survived: "The map. Everything after this searches it.",
      computed: route.status === "found" ? `Dijkstra from the kitchen to ${summit.id} on the hilltop: ${route.cost} s one way over ${route.path!.length - 1} streets, ${route.expansions} expansions.` : undefined,
    },
    {
      stage: "Find a route the drone can fly and return from",
      weeks: "Week 4",
      href: "/sessions/w04-back-with-battery/",
      changed: "Energy is counted along the whole round trip, loaded out and unloaded back, and a steep climb costs more per metre of rise.",
      broke: `Week 3's fastest route to ${summit.id}: it does not fit the light drone's budget.`,
      survived: "The search loop, now over (time, energy) labels that are kept until the whole trip is costed.",
      computed: trip.fastest && trip.chosen ? `Fastest round trip ${trip.fastest.time} s at ${kJ(trip.fastest.energy)}; budget ${kJ(trip.budget)}; flown: ${trip.chosen.time} s at ${kJ(trip.chosen.energy)}.` : undefined,
    },
    {
      stage: "Order many deliveries for one drone",
      weeks: "Weeks 5–6",
      href: "/sessions/w06-one-swap/",
      changed: "One order became six, each with a ready time and a promised time, and an objective: total lateness, then the time the drone is back, then energy.",
      broke: "\"Each order is feasible on its own\" as a plan.",
      survived: "Each task's cost from week 4; the timetable only adds them up in an order.",
      computed: `#01–#06 on one light drone: FIFO ${fmtTicks(f.lateness)} late, back ${clock(f.allReturned)}; earliest deadline back ${clock(e.allReturned)}; swaps stop at back ${clock(s.objective!.allReturned)}; the best of 720 permutations is back ${clock(best.best!.allReturned)}${compareObjective(best.best, s.objective) < 0 ? " — better than the swaps found" : " — the same as the swaps found"}.`,
    },
    {
      stage: "Divide the work between drones that share two charging pads",
      weeks: "Weeks 7–8",
      href: "/sessions/w08-charging-pads/",
      changed: "Five drones of two types, and two charging pads that only two of them can use at once.",
      broke: "\"Available again\" as \"back plus turnaround\": a drone's next start is when a pad is free.",
      survived: "The recurrence, with \"available\" set by the pad queue instead of the drone's own clock.",
    },
    {
      stage: "Make five plans executable in one airspace",
      weeks: "Weeks 9–12",
      href: "/sessions/w09-same-place/",
      changed: "The corridor is a shared resource with capacity one; a state is a place and a time.",
      broke: "Week 2's shortest paths for two drones that want the corridor at the same time.",
      survived: "Each drone's route, as the proposal the reservation table answers.",
      computed: "See the corridor case above: two shortest routes, one conflict, and the two arrangements that pass the validator.",
    },
  ];
}
