import { describe, expect, it } from 'vitest';
import { defaultConfig, type FlightEvent } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { replayIssues, resourceReadout, skipIdle, waitReason, waits } from '../../src/lab/replay-inspection';
import { positionAt, routePoints } from '../../src/lab/replay';

describe('replay evidence navigation',()=>{
    it('locates the whole corridor overlap and clears it at the exact end',()=>{
        const input=defaultConfig(9);input.arrangement='both';const run=runExperiment(input);
        const issue=replayIssues(run)[0]; expect([issue.tick,issue.end]).toEqual([107,112]);
        expect(resourceReadout(run.scene!,107)).toContain('CONFLICT');
        expect(resourceReadout(run.scene!,112)).not.toContain('CONFLICT');
        input.arrangement='wait';const safe=runExperiment(input);expect(replayIssues(safe)).toEqual([]);
        const wait=waits(safe.scene!)[0];expect(waitReason(safe.scene!,wait)).toContain('B [87, 112)');
    });
    it('jumps over genuinely idle gaps without skipping loading or charging',()=>{
        const input=defaultConfig(4);input.requestedDepartures={'#07':500};const run=runExperiment(input),start=run.plan!.tasks[0].start;
        expect(skipIdle(run.scene!,0)).toBe(start);expect(skipIdle(run.scene!,start+1)).toBe(start+1);
    });
    it('finds late tasks even in a valid plan and preserves the actual promise',()=>{
        const input=defaultConfig(12);input.method='greedy';const run=runExperiment(input);
        expect(run.check!.ok).toBe(true);
        const late=run.plan!.tasks.filter(t=>t.late);
        expect(late.length).toBeGreaterThan(0);
        for(const task of late) {const issue=replayIssues(run).find(i=>i.id==='late-'+task.order)!;expect(issue.tick).toBe(run.scene!.orders.find(o=>o.id===task.order)!.promised);expect(issue.detail).toContain(`${task.late} s late`);}
    });
    it('draws the curved route at the same elevations as the moving drone',()=>{
        const scene=runExperiment(defaultConfig(4)).scene!, edge=scene.map.edges.find(e=>e.polyline.length>4)!;
        const event:FlightEvent={id:'curve',drone:'A',order:'#07',phase:'out',kind:'move',from:edge.from,to:edge.to,start:0,end:100,energy:0};
        const points=routePoints(scene,[edge.from,edge.to]);
        const lengths=edge.polyline.slice(1).map((p,i)=>Math.hypot(p[0]-edge.polyline[i][0],p[1]-edge.polyline[i][1]));
        const total=lengths.reduce((a,b)=>a+b,0);
        const moving=positionAt(scene,event,100*lengths.slice(0,2).reduce((a,b)=>a+b,0)/total);
        expect(moving.z).toBeCloseTo(points[2].z,6);
    });
});
