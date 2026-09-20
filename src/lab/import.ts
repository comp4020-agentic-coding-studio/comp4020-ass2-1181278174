import { canonical, defaultConfig, worldFor, type LabConfig } from './model.ts';
import { parseConfig } from './input.ts';
import { checkPlan } from '../engine/check-plan.ts';
import type { FleetPlan } from '../engine/fleet.ts';
export function verifyPlanForInput(input: LabConfig, plan: FleetPlan) {
    let world = worldFor(input);
    if (input.week === 4)
        world = { ...world, fleet: { ...world.fleet, drones: [{ id: 'A', type: input.drone }] } };
    if (input.week === 10)
        world = { ...world, orders: [canonical.orders[12], canonical.orders[10]], fleet: { ...world.fleet, drones: [{ id: 'A', type: 'L' }, { id: 'B', type: 'L' }] } };
    return checkPlan(world, plan, { charging: input.week >= 8, corridor: input.week >= 10, closures: input.scenario.closures, requestedDepartures: input.requestedDepartures });
}
/** Source is parsed as data. This function cannot compile or execute a slot. */
export function importRecord(value: unknown) {
    if (!value || typeof value !== 'object')
        throw new Error('Import a versioned Lab input or experiment record.');
    const record = value as Record<string, any>;
    let input: LabConfig;
    if (record.format === 'slop3969-fleet-result' && record.version === 2) {
        input = defaultConfig(12);
        input.assignment = record.assignment;
        input.method = 'manual';
    }
    else {
        const settings = record.run?.input ?? record.input ?? record;
        if (settings.version !== 2 || settings.week === undefined || settings.caseId === undefined)
            throw new Error('The record needs version 2, a week and a case ID.');
        input = parseConfig(settings);
    }
    input = parseConfig(input);
    const plan = record.run?.plan ?? record.plan;
    let check: ReturnType<typeof checkPlan> | undefined;
    if (plan) {
        try {
            check = verifyPlanForInput(input, plan);
        }
        catch {
            throw new Error('The imported action record is malformed. Import a complete versioned record.');
        }
    }
    const notes: Record<string, string> = {};
    for (const [key, text] of Object.entries(record.notes ?? {}))
        if (/^\d{1,2}:(prediction|observation|explanation)$/.test(key) && typeof text === 'string' && text.length <= 10000)
            notes[key] = text;
    return { input, check, notes };
}
