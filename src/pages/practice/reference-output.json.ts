import { evaluate } from "../../engine/fleet";
import { world, reference } from "../../workbench/world";
import { checkPlan } from "../../engine/check-plan";
export function GET() {
  const plan = evaluate(world, reference.reference.assignment, { charging: true, corridor: true });
  const check=checkPlan(world,plan,{charging:true,corridor:true});
  return new Response(JSON.stringify({ format: "slop3969-fleet-result", version: 2, assignment: reference.reference.assignment, options: { charging: true, corridor: true }, checkingScope: "Complete actions are independently checked against directed edges, times, payload, service, energy, reserve, availability, FCFS pads, corridor capacity and completion.", plan, check }, null, 2), { headers: { "Content-Type": "application/json" } });
}
