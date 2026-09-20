// Reconstruct the task from physical actions. Neither the planner's ok flag
// nor its reported energy/objective is evidence that the plan is feasible.
import type { World, FleetOptions, FleetPlan, TaskRecord } from "./fleet.ts";
import { droneType } from "./fleet.ts";
import { edgeEnergy, edgeTicks, hoverEnergy } from "./graph.ts";
import { ReservationTable, type Occupancy } from "./reservations.ts";
import { validate, type Activity, type Delivery } from "./validate.ts";
import type { Objective } from "./timetable.ts";
export interface PlanIssue {
    rule: string;
    detail: string;
    order?: string;
    drone?: string;
    tick?: number;
    resource?: string;
}
export interface PlanCheck {
    ok: boolean;
    complete: boolean;
    issues: PlanIssue[];
    objective?: Objective;
    onTime: number;
    unfinished: string[];
}
const integer = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
export function checkPlan(world: World, plan: FleetPlan, options: FleetOptions = {}): PlanCheck {
    const issues: PlanIssue[] = [], acts: Activity[] = [], occupancies: Occupancy[] = [], deliveries: Delivery[] = [];
    const facts: {
        task: TaskRecord;
        energy: number;
        land: number;
        deliver: number;
        depart: number;
    }[] = [];
    const seen = new Set<string>(), flown = new Set<string>();
    const add = (rule: string, detail: string, t?: TaskRecord, tick?: number) => issues.push({ rule, detail, order: t?.order, drone: t?.drone, tick });
    if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length > 100)
        return { ok: false, complete: false, issues: [{ rule: "input", detail: "A plan must contain at most 100 task records." }], onTime: 0, unfinished: world.orders.map(o => o.id) };
    for (const t of plan.tasks) {
        const order = world.orders.find(o => o.id === t.order);
        if (!order || !world.fleet.drones.some(d => d.id === t.drone)) {
            add("identity", "Unknown order or drone.", t);
            continue;
        }
        if (seen.has(t.order))
            add("duplicate", "An order appears more than once.", t);
        seen.add(t.order);
        if (t.status === "unscheduled")
            continue;
        if (t.status !== "flown" || !integer(t.start)) {
            add("input", "Task status or start tick is invalid.", t);
            continue;
        }
        const type = droneType(world, t.drone);
        if (order.weight > type.payloadKg)
            add("payload", order.weight + " kg exceeds " + type.payloadKg + " kg.", t);
        if (t.start < order.ready)
            add("ready", "Loading begins before the order is ready.", t, t.start);
        if (!Array.isArray(t.movements) || t.movements.length === 0 || t.movements.length > 10000) {
            add("actions", "A flown task needs its complete movement record.", t);
            continue;
        }
        let node = world.map.kitchen, tick = t.start + world.rules.loadingTicks, energy = 0;
        let serviced = false, arrive = -1, deliver = -1, depart = -1, bad = false;
        acts.push({ owner: t.drone, task: t.order, kind: "load", start: t.start, end: tick });
        for (const m of t.movements) {
            if (!integer(m.start) || !integer(m.end) || m.end <= m.start) {
                add("time", "Action ticks must be increasing non-negative integers.", t);
                bad = true;
                break;
            }
            if (!serviced && node === order.node) {
                arrive = tick;
                deliver = tick + world.rules.serviceTicks;
                energy += hoverEnergy(type, world.rules.serviceTicks);
                acts.push({ owner: t.drone, task: t.order, kind: "service", start: arrive, end: deliver });
                tick = deliver;
                serviced = true;
            }
            if (m.from !== node || m.start !== tick) {
                add("continuity", "Actions must continue from the previous place and time.", t, m.start);
                bad = true;
                break;
            }
            let expectedEnergy = 0;
            if (m.kind === "move") {
                const edge = world.map.edges.find(e => e.from === node && e.to === m.to);
                if (!edge) {
                    add("edge", "No legal directed edge " + node + " → " + m.to + ".", t, tick);
                    bad = true;
                    break;
                }
                if (m.edge !== undefined && m.edge !== edge.id)
                    add("edge", "The action's edge ID does not match its endpoints.", t, tick);
                if (m.end - m.start !== edgeTicks(edge, type))
                    add("duration", "Flight duration differs from the canonical edge and drone model.", t, tick);
                expectedEnergy = edgeEnergy(edge, type, serviced ? 0 : order.weight);
                if (depart < 0)
                    depart = tick;
                if (edge.resource && options.corridor)
                    occupancies.push({ resource: edge.resource, owner: t.drone, task: t.order, start: m.start, end: m.end });
            }
            else if (m.kind === "hover" || m.kind === "ground-wait") {
                if (m.to !== node)
                    add("wait", "Waiting cannot change the node.", t, tick);
                const place = world.map.nodes.find(n => n.id === node)!;
                if (m.kind === "ground-wait") {
                    if (place.kind !== "kitchen" || depart >= 0)
                        add("wait", "Ground waiting belongs before take-off at the kitchen.", t, tick);
                    acts.push({ owner: t.drone, task: t.order, kind: "wait", start: m.start, end: m.end });
                }
                else {
                    if (!place.wait || place.kind === "kitchen")
                        add("wait", "Hovering is not allowed at this point.", t, tick);
                    expectedEnergy = hoverEnergy(type, m.end - m.start);
                }
            }
            else {
                add("action", "Unknown movement kind.", t, tick);
                bad = true;
                break;
            }
            if (m.energy !== expectedEnergy)
                add("energy", "Action energy differs from the recomputed value " + expectedEnergy + " J.", t, tick);
            energy += expectedEnergy;
            tick = m.end;
            node = m.to;
        }
        if (bad)
            continue;
        if (!serviced || node !== world.map.kitchen || depart < 0) {
            add("goal", "The task must serve its customer and return to the kitchen.", t);
            continue;
        }
        const expected = { depart, arrive, deliver, land: tick, energyUsed: energy, late: Math.max(0, deliver - order.promised) };
        for (const [field, value] of Object.entries(expected))
            if ((t as unknown as Record<string, unknown>)[field] !== value)
                add(field, field + " must be " + value + " after recomputation.", t, tick);
        if (depart < (options.requestedDepartures?.[order.id] ?? 0))
            add("departure", "Take-off precedes the requested earliest departure.", t, depart);
        if (energy > Math.floor(type.batteryJ * (1 - world.rules.reserveFraction)))
            add("reserve", "The complete trip exceeds the usable battery, including service and return.", t, tick);
        if (tick > world.rules.evening.cutoffTick)
            add("cutoff", "The drone returns after the evaluation cutoff.", t, tick);
        acts.push({ owner: t.drone, task: t.order, kind: "fly", start: depart, end: arrive }, { owner: t.drone, task: t.order, kind: "fly", start: deliver, end: tick }, { owner: t.drone, task: t.order, kind: "turnaround", start: tick, end: tick + world.rules.turnaroundTicks });
        deliveries.push({ owner: t.drone, order: t.order, tick: deliver });
        facts.push({ task: t, energy, land: tick, deliver, depart });
        flown.add(t.order);
    }
    const requests = facts.filter(f => facts.some(g => g.task.drone === f.task.drone && g.task.start > f.task.start));
    if (options.charging) {
        const table = new ReservationTable({ pads: world.rules.resources.pads.capacity });
        requests.sort((a, b) => a.land - b.land || a.task.drone.localeCompare(b.task.drone));
        for (const f of requests) {
            const t = f.task, type = droneType(world, t.drone), request = f.land + world.rules.turnaroundTicks;
            const duration = Math.max(1, Math.ceil(f.energy / (type.batteryJ / world.rules.chargeTicks)));
            const start = table.earliestFree("pads", request, duration, t.drone), end = start + duration;
            if (t.chargeStart !== start || t.chargeEnd !== end)
                add("charging", "FCFS charging must occupy [" + start + ", " + end + ").", t, start);
            const occ = { resource: "pads", owner: t.drone, task: t.order, start, end };
            table.reserve(occ);
            occupancies.push(occ);
            acts.push({ owner: t.drone, task: t.order, kind: "charge", start, end });
            const next = facts.filter(g => g.task.drone === t.drone && g.task.start > t.start).sort((a, b) => a.task.start - b.task.start)[0];
            if (next && next.task.start < end)
                add("availability", "The next task starts before charging finishes.", next.task, next.task.start);
        }
    }
    if (options.corridor)
        for (const closure of options.closures ?? [])
            occupancies.push({ resource: "corridor", owner: "closed", ...closure });
    const validation = validate({ orders: world.orders.map(o => o.id), activities: acts, occupancies, deliveries, capacities: Object.fromEntries(Object.entries(world.rules.resources).map(([id, r]) => [id, r.capacity])), cutoff: world.rules.evening.cutoffTick });
    for (const v of validation.violations)
        issues.push({ rule: v.rule, detail: v.detail, drone: v.owner, order: v.order, tick: v.tick, resource: v.resource });
    const unfinished = world.orders.filter(o => !flown.has(o.id) || !deliveries.some(d => d.order === o.id && d.tick <= world.rules.evening.cutoffTick)).map(o => o.id);
    const ok = issues.length === 0, complete = ok && unfinished.length === 0;
    const objective = complete ? { lateness: facts.reduce((s, f) => s + Math.max(0, f.deliver - world.orders.find(o => o.id === f.task.order)!.promised), 0), allReturned: Math.max(0, ...facts.map(f => f.land)), energy: facts.reduce((s, f) => s + f.energy, 0), lateCount: facts.filter(f => f.deliver > world.orders.find(o => o.id === f.task.order)!.promised).length, sumDelivery: facts.reduce((s, f) => s + f.deliver, 0) } : undefined;
    const onTime = facts.filter(f => f.deliver <= world.orders.find(o => o.id === f.task.order)!.promised && f.deliver <= world.rules.evening.cutoffTick).length;
    return { ok, complete, issues, objective, onTime, unfinished };
}
