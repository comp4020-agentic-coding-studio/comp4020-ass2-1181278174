import type { FlightEvent, LabRun, SceneData } from './model';
import { padSchedule } from './replay';
export interface ReplayIssue { id: string; tick: number; end?: number; order?: string; event?: string; resource?: string; detail: string }
export const waits = (scene: SceneData) => scene.events.filter(e=>e.phase==='pad-queue'||e.kind==='hover'&&e.phase!=='service'||e.kind==='ground-wait'&&['out','back'].includes(e.phase)).sort((a,b)=>a.start-b.start);
export function replayIssues(run: LabRun): ReplayIssue[] {
    const issues: ReplayIssue[]=[];
    const events=run.scene?.events.filter(e=>e.resource)??[];
    events.forEach((a,i)=>events.slice(i+1).forEach(b=>{
        const tick=Math.max(a.start,b.start), end=Math.min(a.end,b.end);
        if(a.drone!==b.drone&&a.resource===b.resource&&tick<end)
            issues.push({id:`overlap-${a.id}-${b.id}`,tick,end,event:a.id,resource:a.resource,order:a.order,detail:`${a.resource}: ${a.drone} and ${b.drone} both reserve [${tick}, ${end}). Capacity is one; this is a reservation conflict, even when the models do not touch.`});
    }));
    for(const [index,closure] of (run.scene?.closures??[]).entries()) for(const event of events) {
        const tick=Math.max(closure.start,event.start),end=Math.min(closure.end,event.end);
        if(event.resource==='corridor'&&tick<end) issues.push({id:`closure-${index}-${event.id}`,tick,end,event:event.id,order:event.order,resource:'corridor',detail:`${event.drone} uses the corridor on [${tick}, ${end}) during closure [${closure.start}, ${closure.end}). This flight violates the closure.`});
    }
    for(const [i,issue] of (run.check?.issues??[]).entries()) {
        const task=run.plan?.tasks.find(t=>t.order===issue.order);
        issues.push({id:'check-'+i,tick:issue.tick??task?.start??0,order:issue.order,resource:issue.resource,detail:`${issue.rule}: ${issue.detail}`});
    }
    for(const task of run.plan?.tasks??[]) {
        if(task.status==='unscheduled') issues.push({id:'unscheduled-'+task.order,tick:task.start,order:task.order,detail:`${task.order} is unscheduled: ${task.reason}. There is no flight to replay.`});
        else if(task.late) {
            const order=run.scene?.orders.find(o=>o.id===task.order);
            issues.push({id:'late-'+task.order,tick:order?.promised??task.deliver!,order:task.order,detail:`${task.order} misses its promise at ${order?.promised} s; delivery completes at ${task.deliver} s (${task.late} s late). Select its task evidence for the readiness, previous task and charging chain.`});
        }
    }
    if(!issues.length&&['no-solution','diagnostic'].includes(run.status)) issues.push({id:'result',tick:0,detail:run.summary});
    return issues.sort((a,b)=>a.tick-b.tick);
}
export function waitReason(scene: SceneData, event: FlightEvent) {
    const resource=event.phase==='pad-queue'?'pads':scene.events.find(e=>e.drone===event.drone&&e.start===event.end&&e.kind==='move')?.resource;
    const blockers=scene.events.filter(e=>e.drone!==event.drone&&(resource==='pads'?e.phase==='charge':!!resource&&e.resource===resource)&&Math.max(e.start,event.start)<Math.min(e.end,event.end));
    const closures=resource==='corridor'?(scene.closures??[]).filter(c=>Math.max(c.start,event.start)<Math.min(c.end,event.end)):[];
    const reasons=[...blockers.map(e=>`${e.drone} [${e.start}, ${e.end})`),...closures.map(c=>`corridor closure [${c.start}, ${c.end})`)];
    return `${event.drone} · ${event.order} waits at ${event.from} on [${event.start}, ${event.end}) for ${event.end-event.start} s; ${event.energy} J.${reasons.length?' Occupied by '+reasons.join(', ')+'.':''} Next recorded action starts at ${event.end} s.`;
}
export const corridorColors={free:'#c79726',occupied:'#de9b19',closed:'#6a526d',conflict:'#c23838'};
export function corridorAt(scene: SceneData,tick:number) {
    const occupants=scene.events.filter(e=>e.resource==='corridor'&&e.start<=tick&&tick<e.end);
    const closures=(scene.closures??[]).filter(c=>c.start<=tick&&tick<c.end);
    const state=occupants.length>1||occupants.length>0&&closures.length>0?'conflict':closures.length?'closed':occupants.length?'occupied':'free';
    return {occupants,closures,state,color:corridorColors[state]};
}
export function resourceReadout(scene: SceneData, tick: number) {
    const corridor=corridorAt(scene,tick);
    const contents=[...corridor.closures.map(c=>`CLOSED [${c.start}, ${c.end})`),...corridor.occupants.map(e=>`${e.drone} [${e.start}, ${e.end})`)];
    const charging=padSchedule(scene).filter(p=>p.event.start<=tick&&tick<p.event.end);
    const queue=scene.events.filter(e=>e.phase==='pad-queue'&&e.start<=tick&&tick<e.end).sort((a,b)=>a.start-b.start);
    return [`Corridor: ${contents.join(' + ')||'free'}${corridor.state==='conflict'?' · CONFLICT':''}`,scene.events.some(e=>e.phase==='charge')?`Pads: ${charging.length}/${scene.pads??2} occupied${charging.length?'; '+charging.map(p=>`${p.event.drone} on pad ${p.pad+1} until ${p.event.end}`).join(', '):''}. Queue: ${queue.map(e=>e.drone).join(' → ')||'empty'}.`:undefined].filter(Boolean).join(' | ');
}
export function replayBounds(run: LabRun) {
    const intervals=[...run.timeline,...(run.scene?.events??[]),...(run.scene?.closures??[])];
    return {min:Math.min(0,...intervals.map(e=>e.start)),max:Math.max(1,...intervals.map(e=>e.end))};
}
export function skipIdle(scene: SceneData,tick:number) {
    const intervals=[...scene.events,...(scene.closures??[])];
    return intervals.some(e=>e.start<=tick&&tick<e.end)?tick:intervals.filter(e=>e.start>tick).sort((a,b)=>a.start-b.start)[0]?.start??tick;
}
