import { describe, it, expect } from 'vitest';
import { defaultConfig, lessons } from '../../src/lab/model.ts';
import { runExperiment } from '../../src/lab/compute.ts';
describe('all twelve runnable teaching stages', () => {
    for (let week = 1; week <= 12; week++)
        for (const item of lessons[week].cases)
            it(`W${week} ${item.id}`, () => {
                const c = defaultConfig(week);
                c.caseId = item.id;
                const r = runExperiment(c);
                expect(r.summary.length).toBeGreaterThan(20);
                expect(r.tables.length).toBeGreaterThan(0);
                expect(r.metrics.length).toBeGreaterThan(0);
                expect(JSON.stringify(r).length).toBeLessThan(5000000);
                if (week === 12) {
                    expect(r.check?.complete).toBe(true);
                    expect(r.check?.onTime).toBe(20);
                }
            });
    it('reproduces, then fixes, the discarded-label bug', () => {
        const c = defaultConfig(4);
        c.strategies.dominates.preset = 'time';
        expect(runExperiment(c).status).toBe('no-solution');
        c.strategies.dominates.preset = 'pareto';
        expect(runExperiment(c).status).toBe('verified');
    });
    it('enumerates a real counterexample to swap optimality', () => {
        const r = runExperiment(defaultConfig(6));
        expect(r.objective?.lateness).toBe(48);
        const exact = defaultConfig(6); exact.method = 'exact';
        expect(runExperiment(exact).comparisons?.at(-1)?.value).toBe('46, 51, 0');
    });
    it('runs the exact-enumeration selector on both models', () => {
        for (const caseId of ['six-jobs', 'canonical-six']) {
            const c = defaultConfig(6);
            c.caseId = caseId;
            c.method = 'exact';
            expect(runExperiment(c).status).toBe('verified');
        }
    });
});
