import { presentation } from './presentation';
import { type LabRun } from './model';
import { demonstrationInput } from './teaching';
import { startRun } from './runner';
import { exampleHas3D, exampleHtml } from './example-render';
import { esc, mapPoint, tableHtml } from './render';
import { placeName, placeText } from './places';
import { corridorAt, replayBounds, replayIssues, skipIdle } from './replay-inspection';
import { fleetAt, routePoints } from './replay';
import { orderCause, lessonEvidence } from './lesson-evidence';
import { markLessonChanges } from './comparison';

let cleanup:(()=>void)|undefined,mounted:HTMLElement|undefined;
function mount(root:HTMLElement) {
  const initial=JSON.parse(root.querySelector('[data-example-initial]')!.textContent!) as LabRun, week=initial.input.week;
  let run=initial,mode='start',scene:ReturnType<typeof import('./scene')['mountScene']>|undefined,selectedOrder:string|undefined,selectedPath:string[]=[],blocked:string[]=[],tick=0,trace=-1,playing=false,raf=0,last=0,generation=0,disposed=false,prefer2D=false,loading3D=false;
  let active:ReturnType<typeof startRun>|undefined;
  const content=root.querySelector<HTMLElement>('[data-example-content]')!,controller=new AbortController(),signal=controller.signal;
  const expanded=presentation(root);
  const q=<T extends HTMLElement=HTMLElement>(selector:string)=>content.querySelector<T>(selector);
  const status=(text:string)=>{const el=q('[data-example-status]');if(el)el.textContent=text;};
  function pause(){playing=false;cancelAnimationFrame(raf);const b=q('[data-example-action="play"]');if(b)b.textContent='Play flight';}
  function time(t:number){
    tick=t;scene?.time(t);
    const slider=q<HTMLInputElement>('[data-example-time-slider]');if(slider)slider.value=String(t);
    const clock=q('[data-example-time]');if(clock)clock.textContent=`${Math.floor(t)} s`;
    if(!run.scene)return;
    const states=fleetAt(run.scene,t),layer=q<SVGElement&HTMLElement>('[data-map-drones]');
    if(layer)layer.innerHTML=states.map(s=>{const [x,y]=mapPoint(run.scene!,s.position.x,s.position.y);return `<g transform="translate(${x},${y})"><circle r="10" fill="#214d43" stroke="white" stroke-width="2"/><text x="0" y="4" fill="white" text-anchor="middle" font-size="12">${s.drone}</text></g>`;}).join('');
    const relevant=states.filter(s=>!selectedOrder||s.event.order===selectedOrder),visible=relevant.length?relevant:states;
    const text=visible.slice(0,3).map(s=>`Drone ${s.drone} · ${s.event.order} · ${s.phase}`).join(' | ');
    const readout=q('[data-example-flight]');if(readout)readout.textContent=text||'No flight at this time.';
    const resource=corridorAt(run.scene,t),corridor=q('[data-corridor]');if(corridor){corridor.setAttribute('stroke',resource.color);corridor.dataset.state=resource.state;}
    const timeline=q<HTMLElement>('.lab-timeline');if(timeline){const {min,max}=replayBounds(run);timeline.style.setProperty('--replay-progress',`${(t-min)/(max-min)*100}%`);const c=q('[data-timeline-time]');if(c)c.textContent=`${Math.floor(t)} s`;timeline.querySelectorAll<HTMLElement>('[data-event]').forEach(e=>e.toggleAttribute('data-active',Number(e.dataset.start)<=t&&t<Number(e.dataset.end)));}
  }
  function mark(path:string[],obstacles:string[]=[]) {
    selectedPath=path;blocked=obstacles;
    content.querySelectorAll<HTMLElement>('[data-search-node]').forEach(el=>el.classList.toggle('is-current',el.dataset.searchNode===path.at(-1)));
    content.querySelectorAll<HTMLElement>('[data-search-from]').forEach(el=>el.classList.toggle('is-in-path',path.some((id,i)=>id===el.dataset.searchFrom&&path[i+1]===el.dataset.searchTo)));
    const points=run.scene?routePoints(run.scene,path).map(p=>mapPoint(run.scene!,p.x,p.y).join(',')).join(' '):'';
    q('[data-map-selection]')?.setAttribute('points',points);
    const target=path.at(-1)==='kitchen'?run.scene?.orders.find(o=>path.includes(o.node))?.node:path.at(-1);
    content.querySelectorAll<HTMLElement>('[data-customer-homes] [data-node],[data-map-markers] [data-node]').forEach(el=>el.classList.toggle('is-destination',el.dataset.node===target));
    content.querySelectorAll<SVGElement>('[data-building]').forEach(e=>e.setAttribute('fill',obstacles.includes(e.dataset.building!)?'#dc6a54':'#adb3a2'));
    q('[data-example-technical]')!.innerHTML=`<p>${esc(path.map(placeName).join(' → '))}</p>`;
    scene?.select(path,obstacles);
  }
  function inspect(id:string) {
    const row=run.tables.flatMap(t=>t.rows).find(r=>r.id===id),step=run.trace.find(t=>t.id===id);
    if(!row&&!step)return;
    q('[data-example-selection]')!.textContent=placeText(step?.title??row!.values[0]);
    q('[data-example-detail]')!.textContent=placeText(step?.detail??row?.detail??row?.values.join(' · '));
    const path=row?.path??step?.path??(step?.node?[step.node]:[]);
    mark(path,week===1&&row?.values[1]==='Building intersection'?String(row.values[2]).split(',').map(x=>x.trim()):[]);
    content.querySelectorAll<HTMLElement>('[data-example-action="inspect"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
    content.querySelectorAll<HTMLElement>('[data-row]').forEach(row=>row.classList.toggle('lab-selected',row.dataset.row===id));
    if(step?.tick!==undefined)time(step.tick);
  }
  function order(id:string,focus=true){
    const item=run.scene?.orders.find(o=>o.id===id);if(!item)return;
    selectedOrder=id;
    const picker=q<HTMLSelectElement>('[data-example-order]');if(picker)picker.value=id;
    const cause=q('[data-example-cause]');if(cause)cause.innerHTML=orderCause(run,id);
    const task=run.plan?.tasks.find(t=>t.order===id),route=task?.pathOut??run.scene?.routes.find(r=>r.order===id)?.path;
    q('[data-example-selection]')!.textContent=`${id} → ${placeName(item.node)}`;
    const evidence=run.tables.find(t=>t.id==='tasks')?.rows.find(r=>r.id===id)?.detail;
    const delivery=task?.deliver!==undefined?`Drone ${task.drone} delivers at ${task.deliver} s (${task.late?'late by '+task.late+' s':'on time'}) and returns at ${task.land} s.`:evidence??(run.scene?.legOnly?'This is a recorded flight leg, not a complete delivery task.':'This case marks the address; no complete flight is recorded for this order.');
    q('[data-example-detail]')!.textContent=placeText(`${item.label}. Delivery point: the teal doorstep at ${placeName(item.node)}. ${delivery}`);
    mark(route??[item.node]);
    if(evidence)q('[data-example-technical]')!.innerHTML+=`<p>${esc(placeText(evidence))}</p>`;
    scene?.layers(week===1,false,id);
    content.querySelectorAll<HTMLElement>('[data-route],[data-route-key]').forEach(e=>e.style.display=!e.dataset.order||e.dataset.order===id?'':'none');
    content.querySelectorAll<HTMLElement>('[data-example-action="order"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.order===id)));
    if(focus)scene?.view('route');
    if(task?.depart!==undefined)time(task.depart);
  }
  function node(id:string){const delivery=run.scene?.orders.find(o=>o.node===id);if(delivery)order(delivery.id);else {q('[data-example-selection]')!.textContent=placeName(id);q('[data-example-detail]')!.textContent='A route can pass through this location. The numbered homes are delivery addresses.';mark([id]);}}
  async function enable3D(){
    if(!run.scene||!exampleHas3D(run)||loading3D)return;
    prefer2D=false;const host=q('[data-scene-host]')!,current=generation;
    host.hidden=false;loading3D=true;
    try {
      if(!scene){const mod=await import('./scene');if(disposed||current!==generation)return;scene=mod.mountScene(host,run.scene,node);scene.layers(week===1,false,selectedOrder);scene.time(tick);if(selectedPath.length)scene.select(selectedPath,blocked);}
      q('[data-map-host]')!.hidden=true;q('[data-example-camera]')!.hidden=false;
      const toggle=q('[data-example-action="toggle-map"]');if(toggle){toggle.textContent='Use 2D map';toggle.setAttribute('aria-pressed','true');}
    }catch{host.hidden=true;q('[data-map-host]')!.hidden=false;status('3D could not open. The 2D map and result are still available.');}finally{if(current===generation)loading3D=false;}
  }
  function draw(){
    pause();generation++;scene?.dispose();scene=undefined;loading3D=false;selectedPath=[];blocked=[];selectedOrder=undefined;trace=-1;tick=0;
    content.innerHTML=exampleHtml(run,initial,mode);expanded.refresh();if(mode!=='start')markLessonChanges(content,lessonEvidence(initial,initial));
    if(week===1)inspect(mode==='start'?'route0':run.tables.find(t=>t.id==='connections')!.rows.find(r=>r.values[1]==='Building intersection')!.id);
    else if(run.scene?.orders.length)order(week===12?'#20':run.scene.orders[0].id,false);
    time(tick);
    if(!prefer2D&&matchMedia('(min-width:900px)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches)void enable3D();
  }
  async function change(next:string){
    pause();active?.cancel();const current=++generation;
    let input=demonstrationInput(week,next!=='start');
    if(next==='reserved')input.method='reserved';
    if(week===7&&next!=='start'){input.assignment=structuredClone(initial.assignment!);for(const ids of Object.values(input.assignment)){const at=ids.indexOf('#20');if(at>=0)ids.splice(at,1);}input.assignment.A.push('#20');input.method='manual';}
    content.querySelectorAll<HTMLButtonElement>('.example-options button').forEach(b=>b.disabled=true);status('Recomputing this case…');
    active=startRun(input,n=>status(`Checking candidate ${n}…`));
    try{const result=await active.promise;if(disposed||current!==generation)return;run=result;mode=next;draw();if(week===7&&next!=='start')order('#20',false);if(next!=='start'&&replayIssues(run).length)issue();else if(next!=='start'){const wait=run.scene?.events.find(e=>e.phase==='pad-queue'||e.kind==='hover'&&e.phase!=='service');if(wait){order(wait.order,false);time(wait.start);}}}
    catch(e){if(current===generation){status((e as Error).message);content.querySelectorAll<HTMLButtonElement>('.example-options button').forEach(b=>b.disabled=false);}}
  }
  function issue(){const found=replayIssues(run)[0];if(!found)return;pause();if(found.order)order(found.order,false);time(found.tick);q('[data-example-detail]')!.textContent=placeText(found.detail);if(found.resource==='corridor')scene?.view('corridor');}
  function animate(now:number){if(!playing)return;const {max}=replayBounds(run),speed=Number(q<HTMLSelectElement>('[data-example-speed]')?.value??30);let next=Math.min(max,tick+(last?now-last:0)/1000*speed);last=now;if(run.scene)next=Math.min(max,skipIdle(run.scene,next));time(next);if(next>=max)pause();else raf=requestAnimationFrame(animate);}
  content.addEventListener('click',async event=>{
    const b=(event.target as HTMLElement).closest<HTMLElement>('[data-example-action],[data-action="inspect"],[data-action="timeline"],[data-node]');if(!b)return;
    if(b.dataset.node){node(b.dataset.node);return;}
    if(b.dataset.action==='inspect'){inspect(b.dataset.rowId!);return;}
    if(b.dataset.action==='timeline'){time(Number(b.dataset.start));return;}
    const action=b.dataset.exampleAction;
    if(['start','change','reserved'].includes(action!))await change(b.dataset.next??action!);
    else if(action==='expand')await expanded.toggle();
    else if(action==='inspect')inspect(b.dataset.id!);
    else if(action==='order')order(b.dataset.order!);
    else if(action==='map-3d'||action==='toggle-map'&&q('[data-scene-host]')!.hidden)await enable3D();
    else if(action==='map-2d'||action==='toggle-map'){prefer2D=true;q('[data-scene-host]')!.hidden=true;q('[data-map-host]')!.hidden=false;q('[data-example-camera]')!.hidden=true;b.textContent='Open 3D';b.setAttribute('aria-pressed','false');}
    else if(action==='overview')scene?.view(week===1?'block':[9,10].includes(week)?'corridor':'overview');
    else if(action==='top')scene?.view('top');
    else if(action==='destination')scene?.view('destination');
    else if(action==='play'){if(playing)pause();else{if(tick>=replayBounds(run).max)time(replayBounds(run).min);playing=true;last=0;b.textContent='Pause flight';raf=requestAnimationFrame(animate);}}
    else if(action==='next'){pause();const next=[...new Set((run.scene?.events??[]).flatMap(e=>[e.start,e.end]))].sort((a,b)=>a-b).find(t=>t>tick);if(next!==undefined)time(next);}
    else if(action==='issue')issue();
    else if(action==='trace-next'||action==='trace-prev'){trace=Math.max(0,Math.min(run.trace.length-1,trace+(action==='trace-next'?1:-1)));inspect(run.trace[trace].id);q('[data-example-trace-count]')!.textContent=`${trace+1} / ${run.trace.length}`;}
  },{signal});
  content.addEventListener('input',event=>{const el=event.target as HTMLInputElement;if(el.matches('[data-example-time-slider]')){pause();time(Number(el.value));}},{signal});
  content.addEventListener('change',event=>{const el=event.target as HTMLSelectElement;if(el.matches('[data-example-order]'))order(el.value);else if(el.matches('[data-example-table]'))q('[data-example-table-host]')!.innerHTML=tableHtml(run.tables.find(t=>t.id===el.value)!);},{signal});
  content.addEventListener('keydown',event=>{const el=(event.target as HTMLElement).closest<HTMLElement>('[data-node]');if(el&&(event.key==='Enter'||event.key===' ')){event.preventDefault();node(el.dataset.node!);}},{signal});
  draw();
  return ()=>{disposed=true;generation++;pause();active?.cancel();scene?.dispose();expanded.dispose();controller.abort();};
}
function boot(){const root=document.querySelector<HTMLElement>('[data-weekly-example]');if(root===mounted)return;cleanup?.();mounted=root??undefined;cleanup=root?mount(root):undefined;}
document.addEventListener('astro:page-load',boot);
document.addEventListener('astro:before-swap',()=>{cleanup?.();cleanup=undefined;mounted=undefined;});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
