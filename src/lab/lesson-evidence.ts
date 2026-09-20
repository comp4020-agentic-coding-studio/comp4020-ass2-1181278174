import type { LabRun, LabTable } from './model';
import { esc, symbolicSvg, profileHtml } from './render';
import { placeText } from './places';
import { padSchedule } from './replay';

const rows=(r:LabRun,id:string)=>r.tables.find(t=>t.id===id)?.rows??[];
const value=(r:LabRun,key:string)=>r.metrics.find(m=>m.key===key)?.value??'—';
const text=(v:unknown)=>esc(placeText(v));
export function evidenceTable(headers:string[],data:unknown[][],classes:string[]=[]) {
  return `<div class="lesson-table-wrap"><table class="lesson-table"><thead><tr>${headers.map(h=>`<th scope="col">${text(h)}</th>`).join('')}</tr></thead><tbody>${data.map((row,i)=>`<tr class="${classes[i]??''}">${row.map((v,j)=>j===0?`<th scope="row">${text(v)}</th>`:`<td>${text(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const showTable=(t:LabTable|undefined,limit=12)=>t?evidenceTable(t.headers,t.rows.slice(0,limit).map(r=>r.values),t.rows.slice(0,limit).map(r=>r.tone??'')):'';
type Interval={lane:string;start:number;end:number;label:string;kind?:string};
export function intervalFigure(items:Interval[],title:string) {
  if(!items.length)return `<p class="lesson-empty">No occupied interval in this run.</p>`;
  const lanes=[...new Set(items.map(e=>e.lane))],min=Math.min(...items.map(e=>e.start)),max=Math.max(...items.map(e=>e.end)),span=Math.max(1,max-min);
  const x=(t:number)=>112+(t-min)/span*500,h=lanes.length*53+60;
  return `<svg class="lesson-intervals" viewBox="0 0 660 ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}; seconds after 18:00</title>${lanes.map((lane,i)=>`<text x="8" y="${i*53+31}" font-size="14" fill="#26493f">${text(lane)}</text><line x1="112" x2="612" y1="${i*53+30}" y2="${i*53+30}" stroke="#d4dcce"/>`).join('')}${items.map(e=>{const y=lanes.indexOf(e.lane)*53+14,w=Math.max(3,x(e.end)-x(e.start)),color=e.kind==='wait'?'#bb702d':e.kind==='conflict'?'#b84630':'#2d796c';return `<g><title>${text(e.label)} [${e.start}, ${e.end})</title><rect x="${x(e.start)}" y="${y}" width="${w}" height="29" rx="4" fill="${color}"/>${w>32?`<text x="${x(e.start)+5}" y="${y+19}" fill="white" font-size="12">${text(e.label)}</text>`:''}</g>`;}).join('')}<text x="112" y="${h-12}" font-size="13">${min} s</text><text x="612" y="${h-12}" text-anchor="end" font-size="13">${max} s</text></svg>`;
}

export function orderCause(r:LabRun,id:string) {
  const task=r.plan?.tasks.find(t=>t.order===id),order=r.scene?.orders.find(o=>o.id===id);
  if(!task||!order)return '<p>Select a recorded delivery to trace its cause.</p>';
  const previous=r.plan!.tasks.filter(t=>t.drone===task.drone&&t.order!==id&&t.land!==undefined&&t.land<=task.start).sort((a,b)=>b.land!-a.land!)[0];
  const events=r.scene?.events.filter(e=>e.order===id)??[];
  const wait=events.filter(e=>e.phase==='pad-queue'||e.kind==='hover'&&e.phase!=='service').reduce((n,e)=>n+e.end-e.start,0);
  return `<ol class="lesson-cause"><li><span>Ready</span><strong>${order.ready} s</strong></li><li><span>Previous return</span><strong>${previous?.land??'First task'}</strong></li><li><span>Take-off</span><strong>${task.depart??'Unscheduled'}</strong></li><li><span>Deliver / due</span><strong>${task.deliver??'—'} / ${order.promised}</strong></li></ol><p>${text(task.status==='flown'?`Drone ${task.drone}; ${wait} s of recorded queue or airborne wait; ${task.late??0} s late. Return: ${task.land} s.`:task.reason??'No complete task was flown.')}</p>`;
}

export function lessonEvidence(r:LabRun,baseline:LabRun) {
  const week=r.input.week;
  if(week===1) {
    const legal=rows(r,'routes'),blocked=rows(r,'connections').find(x=>x.values[1]==='Building intersection');
    return `<section class="lesson-evidence" data-lesson-shape="block-routes"><h3>Two routes and one tempting shortcut</h3>${evidenceTable(['Connection','Cost','Can we use it?'],[...legal.map(x=>['Route '+x.values[0],x.values[2]+' s','Legal route']),['Shortcut','—','Blocked by '+placeText(blocked?.values[2])]],['good','good','bad'])}<p>Start at the kitchen. Both legal routes reach Home 03. The shortcut crosses a building even though its endpoints are clear.</p><div class="lesson-phases"><span>Load</span> → <span>Fly out</span> → <span>Deliver</span> → <span>Return</span></div></section>`;
  }
  if(week===2||week===3) return `<section class="lesson-evidence lesson-search" data-lesson-shape="${week===2?'open-table':'reopening'}"><div class="lesson-graph">${symbolicSvg(r)}${week===3?`<p class="lesson-emphasis">Returned ${text(value(r,'Returned cost'))} · correct ${text(value(r,'Correct cost'))}</p>`:''}</div><div><h3>${week===2?'OPEN: what remains to be searched':'A cheaper arrival at A'}</h3>${showTable(r.tables.find(t=>t.id==='search'))}<p>${week===2?'Read each row after its node is popped. Finding G in OPEN is not a proof of its final cost.':'The path through B improves A. Reopening lets that improvement reach G.'}</p></div></section>`;
  if(week===4) {
    const all=rows(baseline,'candidates'),fast=all[0],fit=all.find(x=>x.tone==='good');
    const current=rows(r,'candidates');
    return `<section class="lesson-evidence" data-lesson-shape="time-energy-labels"><h3>Keep both time and energy</h3><div class="lesson-labels">${[fast,fit].filter(Boolean).map((x,i)=>{const [time,energy]=String(x!.values[4]).split(' / ');return `<article class="${i?'good':'bad'}"><span>${i?'Contour · gentler':'Ridge · faster'}</span><strong>${time} <small>s</small></strong><strong>${(Number(energy)/1000).toFixed(1)} <small>kJ</small></strong><p>${i?'Fits the complete-trip budget':'Too much energy to return'}</p>${!current.some(c=>c.values[4]===x!.values[4])?'<b class="lesson-discarded">Discarded by this rule</b>':''}</article>`;}).join('')}</div><p>Budget: <strong>${Number(value(baseline,'Usable budget (J)'))/1000} kJ</strong>. Totals include outbound flight, service and unloaded return.</p>${profileHtml(baseline)}</section>`;
  }
  if(week===5)return `<section class="lesson-evidence" data-lesson-shape="delivery-timetable"><h3>One drone · six complete trips</h3><div class="lesson-equation">Next load = max(order ready, previous return + turnaround)</div>${showTable(r.tables.find(t=>t.id==='schedule'))}<p>Read down the rows: moving one meal changes when every following meal can leave.</p></section>`;
  if(week===6) {
    const enumerated=value(r,'Exact sequences');
    return `<section class="lesson-evidence lesson-enumeration" data-lesson-shape="permutation-search"><div class="lesson-possibilities"><strong>720</strong><span>possible orders of six jobs</span><p>6 × 5 × 4 × 3 × 2 × 1</p><b>${enumerated==='Not run'?'Enumeration not run':text(enumerated)+' sequences checked'}</b></div><div><h3>${enumerated==='Not run'?'Swaps stop here. Is it the best?':'The exact comparison is now available'}</h3><div class="lesson-sequence">${rows(r,'schedule').map(x=>`<span>${text(x.values[0])}</span>`).join('<i>→</i>')}</div>${evidenceTable(['Method','Lateness','Final return'],[['Starting swaps',value(baseline,'Total lateness'),value(baseline,'Final return')],[enumerated==='Not run'?'Exact result':'Best of 720',enumerated==='Not run'?'Not run':value(r,'Total lateness'),enumerated==='Not run'?'Not run':value(r,'Final return')]])}<p>Small symbolic time units. Exhausting pair swaps proves only that this neighbourhood has no improvement.</p></div></section>`;
  }
  if(week===7) {
    const fs=rows(r,'feasibility'),orders=[...new Set(fs.map(x=>String(x.values[0])))],drones=r.input.scenario.drones;
    return `<section class="lesson-evidence" data-lesson-shape="assignment-matrix"><h3>Which drone can carry each meal?</h3>${evidenceTable(['Order',...drones.map(d=>`${d.id} · ${d.type==='L'?'light':'heavy'}`),'Assigned'],orders.map(id=>[id,...drones.map(d=>{const cell=fs.find(x=>x.values[0]===id&&x.values[1]===d.id);return cell?.values[2]==='yes'?'✓ '+cell.values[3]+' s':'No';}),Object.entries(r.assignment??{}).find(([,ids])=>ids.includes(id))?.[0]??'—']),orders.map(id=>id==='#20'?'hotpot':''))}<p>Hotpot #20 weighs 3.5 kg. Light drones carry at most 1.5 kg. Each time includes the complete trip.</p></section>`;
  }
  if(week===8) {
    const pads=r.scene?padSchedule(r.scene).map(p=>({...p.event,pad:p.pad})):[];
    const items:Interval[]=pads.map(p=>({lane:'Pad '+(p.pad+1),start:p.start,end:p.end,label:p.drone+' '+p.order}));
    const waiting=r.scene?.events.filter(e=>e.phase==='pad-queue')??[];
    items.push(...waiting.map(e=>({lane:'Queue · '+e.drone,start:e.start,end:e.end,label:e.order,kind:'wait'})));
    return `<section class="lesson-evidence" data-lesson-shape="charging-timeline"><h3>${r.input.scenario.pads} charging ${r.input.scenario.pads===1?'pad':'pads'} · one shared queue</h3>${intervalFigure(items,'Charging pads and ground queues')}${evidenceTable(['Drone / order','Requests pad','Starts charge','Wait'],pads.slice(0,7).map(p=>{const q=waiting.find(e=>e.drone===p.drone&&e.order===p.order);return [p.drone+' '+p.order,q?.start??p.start,p.start,(q?q.end-q.start:0)+' s'];}))}<p>Orange intervals are ground queues. A later charging start can delay the drone’s next order.</p></section>`;
  }
  if(week===9) {
    const events=r.scene?.events.filter(e=>e.resource==='corridor')??[],a=events.find(e=>e.drone==='A'),b=events.find(e=>e.drone==='B');
    const start=Math.max(a?.start??0,b?.start??0),end=Math.min(a?.end??0,b?.end??0),conflict=start<end;
    return `<section class="lesson-evidence" data-lesson-shape="corridor-occupancy"><h3>One pass · two occupancy intervals</h3>${intervalFigure(events.map(e=>({lane:'Drone '+e.drone,start:e.start,end:e.end,label:`${e.start}–${e.end}`,kind:conflict?'conflict':''})),'Whole corridor occupancy intervals')}<p class="lesson-overlap ${conflict?'bad':'good'}">${conflict?`Overlap [${start}, ${end}) · ${end-start} s conflict`:'No overlap · both intervals fit'}</p>${evidenceTable(['Drone','Pass entry','Pass exit'],events.map(e=>[e.drone,e.start+' s',e.end+' s']))}<p>The pass is the gap in the ridge. A drone occupies it for the whole interval, not just at its entry time.</p></section>`;
  }
  if(week===10) {
    const intervals=rows(r,'resources').filter(x=>x.values[0]==='corridor'),waits=r.scene?.events.filter(e=>e.kind==='hover'&&e.phase!=='service'||e.kind==='ground-wait'&&['out','back'].includes(e.phase))??[];
    return `<section class="lesson-evidence" data-lesson-shape="space-time-reservations"><h3>Reserve a time, then plan the next drone</h3>${intervalFigure(intervals.map(x=>({lane:'Drone '+x.values[1],start:Number(x.values[3]),end:Number(x.values[4]),label:String(x.values[2])})),'Reserved passage times')}<div class="lesson-phases"><span>Existing reservation</span> → <span>Move or wait</span> → <span>Check the full return</span></div>${evidenceTable(['Drone','Waiting state','From','Until'],waits.slice(0,4).map(e=>[e.drone,e.kind==='ground-wait'?'Ground':'Airborne',e.start,e.end]))}<p>State = place + phase + absolute time + energy. The next drone must fit around the recorded intervals.</p></section>`;
  }
  if(week===11) {
    const accepted=rows(r,'feedback').filter(x=>x.tone==='good');
    return `<section class="lesson-evidence" data-lesson-shape="feedback-chain"><h3>Let the actual waiting cost change the plan</h3><ol class="lesson-feedback"><li><span>1 · Assign</span><strong>${r.input.method==='independent'?'Independent flight costs':'Same initial assignment'}</strong></li><li><span>2 · Coordinate</span><strong>${r.input.method==='independent'?'Conflicts still possible':'Recompute routes and queues'}</strong></li><li><span>3 · Reconsider</span><strong>${accepted.length?text(accepted[0].values[1]):'No accepted feedback move yet'}</strong></li><li><span>4 · Check again</span><strong>${text(value(r,'On time'))} on time</strong></li></ol>${accepted.length?showTable({...r.tables.find(t=>t.id==='feedback')!,rows:accepted},3):'<p>The feedback action tries changes against the real coordinated cost. A valid improvement must survive the whole-plan check.</p>'}<p>Candidate budget: ${r.input.maxCandidates}. Search stopped: ${text(value(r,'Search stopped'))}. A budget stop is not a proof of optimality.</p></section>`;
  }
  return `<section class="lesson-evidence" data-lesson-shape="evening-audit"><h3>Follow one dinner through the evening</h3><label>Delivery<select data-example-order>${r.scene?.orders.map(o=>`<option value="${o.id}" ${o.id==='#20'?'selected':''}>${text(o.id)} → ${text(o.node)}</option>`).join('')}</select></label><div data-example-cause>${orderCause(r,'#20')}</div><p data-example-selection></p><p data-example-detail></p></section>`;
}
