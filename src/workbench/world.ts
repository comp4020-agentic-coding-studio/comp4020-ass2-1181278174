// The canonical world as the workbench cases see it, built once from the
// data files. Every case module imports this rather than the files.
import type { FleetData, MapData, OrdersData, RulesData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import referenceJson from "../data/reference.json";
import rulesJson from "../data/rules.json";
import type { Assignment, World } from "../engine/fleet.ts";

export const world: World = {
  map: mapJson as MapData,
  fleet: fleetJson as FleetData,
  rules: rulesJson as unknown as RulesData,
  orders: (ordersJson as OrdersData).orders,
};

export const reference = referenceJson as unknown as {
  greedy: { assignment: Assignment; onTime: number; objective?: { lateness: number; allReturned: number; energy: number } };
  reference: { assignment: Assignment; onTime: number; objective?: { lateness: number; allReturned: number; energy: number } };
  moves: { kind: string; description: string; before: { lateness: number; allReturned: number }; after: { lateness: number; allReturned: number } }[];
  candidatesEvaluated: number;
  millis: number;
};

export const droneLabel = (id: string) => {
  const d = world.fleet.drones.find((x) => x.id === id);
  return d ? `${id} (${d.type})` : id;
};
