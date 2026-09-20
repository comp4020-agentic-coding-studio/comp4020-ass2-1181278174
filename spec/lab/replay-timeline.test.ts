import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { resultsHtml } from '../../src/lab/render';
import { skipIdle } from '../../src/lab/replay-inspection';

describe('one clock for flights and resource intervals',()=>{
    it('lets the user seek to a closure after the last flight',()=>{
        const input=defaultConfig(12);input.scenario.closures=[{start:11000,end:11100}];
        const run=runExperiment(input),html=resultsHtml(run);
        expect(Math.max(...run.scene!.events.map(e=>e.end))).toBeLessThan(11000);
        expect(html).toMatch(/data-time-slider min="0" max="11100"/);
        expect(skipIdle(run.scene!,10900)).toBe(11000);
        expect(skipIdle(run.scene!,11001)).toBe(11001);
    });
    it('includes closures in the evidence even when independent planning ignores them',()=>{
        const input=defaultConfig(10);input.method='independent';input.scenario.closures=[{start:5100,end:5300}];
        const run=runExperiment(input);
        expect(run.timeline.filter(e=>e.kind==='closed')).toHaveLength(1);
        expect(run.tables.find(t=>t.id==='resources')!.rows.some(r=>r.values.includes('closed'))).toBe(true);
    });
    it('keeps the symbolic job clock in teaching units',()=>{
        const input=defaultConfig(5);input.caseId='six-jobs';const html=resultsHtml(runExperiment(input));
        expect(html).toContain('data-timeline-time>0 units');
    });
});
