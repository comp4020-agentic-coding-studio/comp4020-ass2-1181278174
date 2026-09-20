import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { fleetAt } from '../../src/lab/replay';

describe('the replay follows recorded task boundaries', () => {
    it('keeps a drone on the ground before loading and after landing', () => {
        const input=defaultConfig(4); input.requestedDepartures={'#07':200};
        const run=runExperiment(input), scene=run.scene!, task=run.plan!.tasks[0];
        expect(fleetAt(scene,0)[0].airborne).toBe(false);
        expect(fleetAt(scene,0)[0].parcel).toBe(false);
        expect(fleetAt(scene,task.start)[0].phase).toBe('loading');
        expect(fleetAt(scene,task.depart!)[0].airborne).toBe(true);
        const landed=fleetAt(scene,task.land!)[0];
        expect(landed.phase).toBe('idle'); expect(landed.airborne).toBe(false);
        expect(landed.position.x).toBe(scene.map.nodes.find(n=>n.id===scene.map.kitchen)!.x);
        expect(landed.energyUsed).toBeCloseTo(task.energyUsed!,6);
    });
    it('removes the parcel exactly at service completion and seeks deterministically', () => {
        const run=runExperiment(defaultConfig(4)), task=run.plan!.tasks[0], scene=run.scene!;
        expect(fleetAt(scene,task.deliver!-.01)[0].parcel).toBe(true);
        expect(fleetAt(scene,task.deliver!)[0].parcel).toBe(false);
        expect(fleetAt(scene,task.deliver!)[0].phase).toBe('returning');
        const first=fleetAt(scene,task.depart!+10);
        fleetAt(scene,task.land!); fleetAt(scene,0);
        expect(fleetAt(scene,task.depart!+10)).toEqual(first);
        expect(Number.isFinite(first[0].position.heading)).toBe(true);
    });
    it('keeps hover position fixed while spending energy, then enters at the half-open boundary', () => {
        const input=defaultConfig(9); input.arrangement='wait';
        const scene=runExperiment(input).scene!, wait=scene.events.find(e=>e.kind==='hover')!;
        const at=(t:number)=>fleetAt(scene,t).find(s=>s.drone==='A')!;
        expect(at(wait.start).phase).toBe('hovering');
        expect(at(wait.start+2).energyUsed).toBeGreaterThan(at(wait.start).energyUsed);
        expect(at(wait.start+2).position.x).toBe(at(wait.start).position.x);
        expect(at(wait.end).event.resource).toBe('corridor');
    });
    it('shows actual pad queues and charges only after a pad becomes free', () => {
        const input=defaultConfig(8); input.scenario.pads=1;
        const run=runExperiment(input), scene=run.scene!;
        const queues=scene.events.filter(e=>e.phase==='pad-queue');
        expect(queues.length).toBeGreaterThan(0);
        const wait=queues[0], charge=scene.events.find(e=>e.order===wait.order&&e.phase==='charge')!;
        const at=(t:number)=>fleetAt(scene,t).find(s=>s.drone===wait.drone)!;
        expect(at(wait.start).phase).toBe('waiting for pad');
        expect(at(wait.start).airborne).toBe(false);
        expect(at(wait.end).phase).toBe('charging');
        expect(at(charge.start).pad).toBe(0);
        expect(at((charge.start+charge.end)/2).energyUsed).toBeCloseTo(at(charge.start).energyUsed/2,6);
        expect(at(charge.end).energyUsed).toBe(0);
    });
    it('does not animate a successful trip for a strategy that lost the feasible route', () => {
        const input=defaultConfig(4); input.strategies.dominates.preset='time';
        const run=runExperiment(input);
        expect(run.status).toBe('no-solution');
        expect(run.scene!.events).toEqual([]); expect(fleetAt(run.scene!,100)).toEqual([]);
    });
});
