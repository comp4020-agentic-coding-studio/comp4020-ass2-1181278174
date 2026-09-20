import { describe, expect, it } from 'vitest';
import { defaultConfig, type SceneData } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { fleetAt } from '../../src/lab/replay';
import { displayPose } from '../../src/lab/replay-pose';

function pose(scene:SceneData,tick:number,drone='A') {
    const states=fleetAt(scene,tick),index=states.findIndex(s=>s.drone===drone);
    return displayPose(scene,states[index],tick,index);
}
const distance=(a:ReturnType<typeof pose>,b:ReturnType<typeof pose>)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

describe('continuous presentation over the recorded clock',()=>{
    it('takes off and lands without jumping between the parking spot and route',()=>{
        const run=runExperiment(defaultConfig(4)),scene=run.scene!,task=run.plan!.tasks[0];
        for(const tick of [task.depart!,task.land!])
            expect(distance(pose(scene,tick-.0001),pose(scene,tick))).toBeLessThan(.05);
        const before=pose(scene,task.depart!),rising=pose(scene,task.depart!+1);
        expect(rising.z).toBeGreaterThan(before.z);
        expect(rising.z-before.z).toBeLessThan(19);
    });
    it('enters and leaves a pad continuously while keeping the recorded charge interval',()=>{
        const scene=runExperiment(defaultConfig(8)).scene!,charge=scene.events.find(e=>e.phase==='charge')!;
        for(const tick of [charge.start,charge.end])
            expect(distance(pose(scene,tick-.0001,charge.drone),pose(scene,tick,charge.drone))).toBeLessThan(.05);
        const middle=(charge.start+charge.end)/2,state=fleetAt(scene,middle).find(s=>s.drone===charge.drone)!;
        expect(state.phase).toBe('charging');
        const kitchen=scene.map.nodes.find(n=>n.id===scene.map.kitchen)!;
        expect(pose(scene,middle,charge.drone)).toEqual({x:kitchen.x+50+state.pad!*48,y:kitchen.y,z:kitchen.z+5});
    });
    it('remains continuous across all full-fleet event boundaries',()=>{
        const scene=runExperiment(defaultConfig(12)).scene!;
        for(const event of scene.events) for(const tick of [event.start,event.end])
            expect(distance(pose(scene,tick-.0001,event.drone),pose(scene,tick,event.drone)),event.id+' at '+tick).toBeLessThan(.1);
    });
    it('does not add a landing to either isolated flight leg',()=>{
        const scene=runExperiment(defaultConfig(9)).scene!;
        for(const drone of ['A','B']) {
            const end=Math.max(...scene.events.filter(e=>e.drone===drone).map(e=>e.end));
            expect(distance(pose(scene,end-.0001,drone),pose(scene,end,drone))).toBeLessThan(.05);
            const state=fleetAt(scene,end).find(s=>s.drone===drone)!;
            expect(pose(scene,end,drone).z).toBe(state.position.z+22);
        }
    });
    it('seeks deterministically without changing any computed record',()=>{
        const scene=runExperiment(defaultConfig(4)).scene!,before=JSON.stringify(scene),move=scene.events.find(e=>e.kind==='move')!;
        const expected=pose(scene,move.start+1);
        pose(scene,10000);pose(scene,0);
        expect(pose(scene,move.start+1)).toEqual(expected);
        expect(JSON.stringify(scene)).toBe(before);
    });
});
