import { evaluate } from "../../engine/fleet";
import { world, reference } from "../../workbench/world";
export function GET() {
  const plan = evaluate(world, reference.reference.assignment, { charging: true, corridor: true });
  return new Response(JSON.stringify({ format: "slop3969-fleet-result", version: 1, assignment: reference.reference.assignment, options: { charging: true, corridor: true }, checkingScope: "The evaluator computes complete tasks and energy from the canonical model. The separate validator checks activity intervals, resource capacities and delivery accounting; it is not a full validator of arbitrary imported trajectories.", plan }, null, 2), { headers: { "Content-Type": "application/json" } });
}
