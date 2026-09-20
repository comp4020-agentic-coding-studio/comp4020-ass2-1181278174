import map from "../../data/map.json";
import orders from "../../data/orders.json";
import fleet from "../../data/fleet.json";
import rules from "../../data/rules.json";
export function GET() {
  return new Response(JSON.stringify({ format: "slop3969-scenario", version: 1, units: { distance: "metres", time: "integer seconds after 18:00", energy: "joules", mass: "kilograms" }, map, orders, fleet, rules }, null, 2), { headers: { "Content-Type": "application/json" } });
}
