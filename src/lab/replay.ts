import type { FlightEvent, SceneData } from './model.ts';
export function positionAt(scene: SceneData, event: FlightEvent, tick: number) {
    const a = scene.map.nodes.find(n => n.id === event.from)!, b = scene.map.nodes.find(n => n.id === event.to)!;
    const fraction = Math.max(0, Math.min(1, (tick - event.start) / Math.max(1,event.end - event.start)));
    const edge = event.kind === 'move' ? scene.map.edges.find(e => e.from === a.id && e.to === b.id) : undefined;
    const points = edge?.polyline ?? [[a.x, a.y], [b.x, b.y]];
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = lengths.reduce((s, n) => s + n, 0);
    let remaining = fraction * total, x = a.x, y = a.y, heading=0;
    for (let i = 0; i < lengths.length; i++) {
        if (remaining <= lengths[i] || i === lengths.length - 1) {
            const f = lengths[i] ? remaining / lengths[i] : 0;
            heading=Math.atan2(points[i+1][0]-points[i][0],points[i][1]-points[i+1][1]);
            x = points[i][0] + (points[i + 1][0] - points[i][0]) * f;
            y = points[i][1] + (points[i + 1][1] - points[i][1]) * f;
            break;
        }
        remaining -= lengths[i];
    }
    return { x, y, z: a.z + (b.z - a.z) * fraction, fraction, heading };
}
/** Visual slot assignment for the already computed charge intervals; never reschedules them. */
export function padSchedule(scene: SceneData) {
    const free=Array.from({length:scene.pads??2},()=>-Infinity);
    return scene.events.filter(e=>e.phase==='charge').sort((a,b)=>a.start-b.start||a.drone.localeCompare(b.drone)).map(event=>{
        const pad=free.findIndex(t=>t<=event.start); if(pad>=0) free[pad]=event.end;
        return {event,pad};
    });
}
const progress=(tick:number,start:number,end:number)=>Math.max(0,Math.min(1,(tick-start)/Math.max(1,end-start)));
const phases: Record<FlightEvent['phase'],string>={out:'outbound',back:'returning',load:'loading',service:'delivering',turnaround:'turnaround',charge:'charging','pad-queue':'waiting for pad'};
export function fleetAt(scene: SceneData, tick: number) {
    const pads=padSchedule(scene);
    return [...new Set(scene.events.map(e=>e.drone))].map(drone=>{
        const own=scene.events.filter(e=>e.drone===drone).sort((a,b)=>a.start-b.start);
        const active=own.find(e=>e.start<=tick&&e.end>tick);
        const event=active??own.filter(e=>e.end<=tick).sort((a,b)=>a.end-b.end).at(-1)??own[0];
        const position=positionAt(scene,event,tick);
        if(event.kind!=='move') {
            const headingEvent=own.filter(e=>e.kind==='move'&&e.end<=tick).at(-1);
            if(headingEvent) position.heading=positionAt(scene,headingEvent,headingEvent.end).heading;
        }
        const flown=own.filter(e=>e.order===event.order);
        let energyUsed=flown.reduce((sum,e)=>sum+e.energy*progress(tick,e.start,e.end),0);
        const charge=flown.find(e=>e.phase==='charge');
        if(charge&&tick>=charge.start) energyUsed*=1-progress(tick,charge.start,charge.end);
        const airborne=!!active&&(event.kind==='move'||event.kind==='hover');
        const phase=active ? event.phase==='service'?'delivering':event.kind==='hover'?'hovering':event.kind==='ground-wait'&&['out','back'].includes(event.phase)?'ground wait':phases[event.phase]
            : tick<own[0].start ? (scene.orders.find(o=>o.id===event.order)?.ready??0)>tick?'order not ready':'idle' : scene.legOnly?'leg complete':'idle';
        const parcel=(!!active&&['out','load','service'].includes(event.phase)) || !!scene.legOnly&&event.phase==='out'&&tick>=event.end;
        const airSeconds=own.filter(e=>e.kind==='move'||e.kind==='hover').reduce((sum,e)=>sum+(e.end-e.start)*progress(tick,e.start,e.end),0);
        const pad=phase==='charging'?pads.find(p=>p.event.id===event.id)?.pad:undefined;
        return {drone,event,position,energyUsed,phase,airborne,parcel,pad,rotorAngle:airSeconds*40};
    });
}
export function routePoints(scene: SceneData, path: string[]) {
    return path.flatMap((id,i)=>{
        const n=scene.map.nodes.find(n=>n.id===id); if(!n) return [];
        if(!i) return [{x:n.x,y:n.y,z:n.z}];
        const previous=scene.map.nodes.find(n=>n.id===path[i-1])!;
        const edge=scene.map.edges.find(e=>e.from===previous.id&&e.to===id);
        if(!edge) return [{x:n.x,y:n.y,z:n.z}];
        const lengths=edge.polyline.slice(1).map((p,j)=>Math.hypot(p[0]-edge.polyline[j][0],p[1]-edge.polyline[j][1]));
        const total=lengths.reduce((a,b)=>a+b,0); let distance=0;
        return edge.polyline.slice(1).map(([x,y],j)=>{distance+=lengths[j];return {x,y,z:previous.z+(n.z-previous.z)*(total?distance/total:0)};});
    });
}
