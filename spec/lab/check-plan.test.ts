import { describe, expect, it } from 'vitest';
import { canonical, defaultConfig } from '../../src/lab/model.ts';
import { runExperiment } from '../../src/lab/compute.ts';
import { checkPlan } from '../../src/engine/check-plan.ts';
import { parseConfig } from '../../src/lab/input.ts';
import { fleetAt, positionAt } from '../../src/lab/replay.ts';
import { importRecord } from '../../src/lab/import.ts';
describe('independent physical checking', () => {
    const reference = runExperiment(defaultConfig(12));
    const options = { charging: true, corridor: true };
    it('accepts the recomputed reference with twenty deliveries', () => {
        expect(checkPlan(canonical, reference.plan!, options)).toMatchObject({ ok: true, complete: true, onTime: 20 });
    });
    const tamper: Record<string, (p: NonNullable<typeof reference.plan>) => void> = {
        'reported energy': p => { p.tasks[0].energyUsed = 0; },
        'action energy': p => { p.tasks[0].movements![0].energy = 0; },
        'duration': p => { p.tasks[0].movements![0].end += 1; },
        'illegal edge': p => { p.tasks[0].movements![0].to = 'summit'; },
        'duplicate delivery': p => { p.tasks.push(structuredClone(p.tasks[0])); },
        'missing return': p => { p.tasks[0].movements!.pop(); },
        'ready time': p => { p.tasks[1].start = 0; },
        'charging interval': p => { p.tasks.find(t => t.chargeEnd)!.chargeEnd! += 1; },
    };
    for (const [name, change] of Object.entries(tamper))
        it(`rejects tampered ${name} even when reported validation is green`, () => {
            const plan = structuredClone(reference.plan!);
            change(plan);
            plan.complete = true;
            plan.validation.ok = true;
            const result = checkPlan(canonical, plan, options);
            expect(result.ok).toBe(false);
            expect(result.objective).toBeUndefined();
        });
    it('does not infer physical feasibility from a user budget callback', () => {
        const c = defaultConfig(4);
        c.strategies.withinBudget.preset = 'ignore';
        const r = runExperiment(c);
        expect(r.status).toBe('diagnostic');
        expect(r.check?.issues.some(i => i.rule === 'reserve')).toBe(true);
    });
    it('uses scenario copies without changing canonical data', () => {
        const original = JSON.stringify(canonical), c = defaultConfig(12);
        c.method = 'greedy';
        c.scenario.pads = 1;
        c.scenario.addedOrders = [{ ...canonical.orders[0], id: '#21', ready: 0, promised: 1, label: 'Test dinner' }];
        const r = runExperiment(c);
        expect(r.plan?.tasks.some(t => t.order === '#21')).toBe(true);
        expect(r.scene?.pads).toBe(1);
        expect(JSON.stringify(canonical)).toBe(original);
    });
});
describe('movement replay and input boundaries', () => {
    it('waits at the entrance then traverses the corridor at the computed time', () => {
        const c = defaultConfig(9);
        c.arrangement = 'wait';
        const r = runExperiment(c), scene = r.scene!;
        const hover = scene.events.find(e => e.kind === 'hover')!;
        expect(hover.end - hover.start).toBe(5);
        const start = positionAt(scene, hover, hover.start), middle = positionAt(scene, hover, hover.start + 2);
        expect([start.x, start.y, start.z]).toEqual([middle.x, middle.y, middle.z]);
        const at = fleetAt(scene, hover.end).find(s => s.drone === 'A')!;
        expect(at.event.resource).toBe('corridor');
        expect(at.event.start).toBe(112);
    });
    it('rejects malformed scenario and case inputs', () => {
        const c = defaultConfig(8);
        c.scenario.pads = 4;
        expect(() => parseConfig(c)).toThrow();
        c.scenario.pads = 2;
        c.caseId = 'unknown';
        expect(() => parseConfig(c)).toThrow();
    });
    it('does not execute imported strategy text without an explicit run capability', () => {
        const c = defaultConfig(4);
        c.strategies.dominates.mode = 'custom';
        c.strategies.dominates.code = 'throw new Error("EXECUTED");';
        expect(parseConfig(c).strategies.dominates.code).toContain('EXECUTED');
        expect(() => runExperiment(c)).toThrow('Review');
        expect(() => runExperiment(c, { allowCustom: true })).toThrow('EXECUTED');
    });
    it('limits feedback and keeps a fully checked improvement', () => {
        const c = defaultConfig(11);
        c.method = 'feedback';
        c.maxCandidates = 120;
        const r = runExperiment(c);
        expect(r.status).toBe('budget');
        expect(r.check?.complete).toBe(true);
        expect(r.objective!.lateness).toBeLessThan(runExperiment(defaultConfig(11)).objective!.lateness);
        expect(r.tables.find(t => t.id === 'feedback')!.rows).toHaveLength(119);
    });
    it('checks imported actions instead of trusting their reported green check', () => {
        const run = runExperiment(defaultConfig(12));
        run.plan!.tasks[0].energyUsed = 0;
        const imported = importRecord({ format: 'slop3969-experiment', version: 2, run });
        expect(imported.check?.ok).toBe(false);
        expect(() => importRecord({ hello: 'not an experiment' })).toThrow('version 2');
    });
    it('keeps a manually chosen complete route while planning legal waits', () => {
        const c = defaultConfig(12);
        c.routeCandidates = { '#07': 2 };
        const r = runExperiment(c);
        expect(r.check?.complete).toBe(true);
        const target = r.plan!.tasks.find(t => t.order === '#07')!;
        const w4 = runExperiment({ ...defaultConfig(4), candidate: 2 });
        expect(target.pathOut).toEqual(w4.plan!.tasks[0].pathOut);
    });
});
