import type { SceneData } from './model';
import type { fleetAt } from './replay';
type DroneState = ReturnType<typeof fleetAt>[number];
const ease=(fraction:number)=>{const t=Math.max(0,Math.min(1,fraction));return t*t*(3-2*t);};

/** Presentation coordinates only; the event, energy and resource intervals remain authoritative. */
export function displayPose(scene: SceneData, state: DroneState, tick: number, index: number) {
    const p=state.position,event=state.event;
    // The corridor example contains isolated flight legs, with no recorded take-off or landing phase.
    if(scene.legOnly) return {x:p.x,y:p.y,z:p.z+22};
    const kitchen=scene.map.nodes.find(n=>n.id===scene.map.kitchen)!;
    const parked={x:30+index*40,y:-35,z:3},window=Math.min(3,(event.end-event.start)/2);
    if(state.airborne) {
        let ground=0;
        if(event.kind==='move'&&event.phase==='out'&&event.from===kitchen.id)
            ground=1-ease((tick-event.start)/window);
        else if(event.kind==='move'&&event.phase==='back'&&event.to===kitchen.id)
            ground=1-ease((event.end-tick)/window);
        return {x:p.x+parked.x*ground,y:p.y+parked.y*ground,z:p.z+22+(parked.z-22)*ground};
    }
    const atKitchen=Math.hypot(p.x-kitchen.x,p.y-kitchen.y)<.01;
    if(!atKitchen) return {x:p.x,y:p.y,z:p.z+3};
    const point={x:kitchen.x+parked.x,y:kitchen.y+parked.y,z:kitchen.z+parked.z};
    if(state.pad!==undefined&&state.pad>=0) {
        // Short illustrative docking/undocking inside the reserved interval, not extra simulated time.
        const blend=Math.min(ease((tick-event.start)/window),ease((event.end-tick)/window));
        point.x+=(50+state.pad*48-parked.x)*blend;
        point.y-=parked.y*blend;
        point.z+=(5-parked.z)*blend;
    }
    return point;
}
