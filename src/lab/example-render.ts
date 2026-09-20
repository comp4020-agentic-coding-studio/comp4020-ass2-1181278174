import { lessons, type LabRun } from './model';
import { basePath, esc, mapSvg, symbolicSvg, tableHtml, timelineHtml, profileHtml } from './render';
import { placeName, placeText } from './places';
import { teachingActions } from './teaching';
import { replayBounds, replayIssues } from './replay-inspection';

const button=(action:string,label:string,extra='')=>`<button type="button" data-example-action="${action}" ${extra}>${label}</button>`;
export const exampleIntros:Record<number,string>={
  1:'Dinner #03 goes from the kitchen to Home 03. Compare two legal routes with a shortcut through a building.',
  2:'S is the start and G is the destination. The numbers on the arrows are travel costs. Find the cheapest route.',
  3:'A cheaper way to reach A appears later. Watch what happens when the search is allowed to revisit it.',
  4:'Deliver #07 to the hilltop home and return to the kitchen. The fastest route uses too much battery.',
  5:'One drone delivers six meals, one after another. Changing the order changes when it can start the next meal.',
  6:'These six jobs use small, symbolic time units. Compare a good sequence with the best of all 720 possibilities.',
  7:'Two light drones and one heavy drone share ten orders. The 3.5 kg hotpot needs the heavy drone.',
  8:'The same five drones share charging pads. Reduce two pads to one and inspect the queue it creates.',
  9:'Two recorded flight legs use one narrow passage. Let one drone wait so they do not occupy it together.',
  10:'Two complete deliveries compete for the passage. Change which drone reserves its route first.',
  11:'Compare independent routes, coordinated routes and an assignment revised using the real waiting costs.',
  12:'Audit the twenty-order evening. Choose an order to see its destination, or jump to the first late delivery.',
};
export const exampleHas3D=(r:LabRun)=>!!r.scene&&[1,4,9,10,12].includes(r.input.week);

export function exampleHtml(r:LabRun,baseline:LabRun,mode='start') {
  const week=r.input.week, lesson=lessons[week], action=teachingActions[week], bounds=replayBounds(r);
  const inspectRows=week===1?[...(r.tables.find(t=>t.id==='routes')?.rows??[]),...(r.tables.find(t=>t.id==='connections')?.rows.filter(x=>x.values[1]==='Building intersection').slice(0,1)??[])]:week===4?(r.tables.find(t=>t.id==='candidates')?.rows.filter((x,i)=>i===0||x.tone==='good').slice(0,2)??[]):[];
  const primary=r.tables.find(t=>t.primary)??r.tables[0];
  return `<header class="example-heading"><div><span class="lab-eyebrow">WEEK ${String(week).padStart(2,'0')} / INTERACTIVE EXAMPLE</span><h2>${esc(lesson.title)}</h2><p>${esc(exampleIntros[week])}</p></div><a data-open-lab href="${basePath()}lab/#lab-w${week}">Open full Lab ↗</a></header>
  <div class="example-decision"><div><span class="example-step">1</span><strong>Compare one change</strong></div><div class="example-options">${button('start','Starting case',`aria-pressed="${mode==='start'}"`)}${week===11?button('reserved','Coordinate routes',`aria-pressed="${mode==='reserved'}"`):''}${button('change',esc(action.action),`class="lab-primary" aria-pressed="${mode==='change'}"`)}</div><span role="status" data-example-status>${mode==='start'?'Starting case is ready.':'The changed case has been recomputed.'}</span></div>
  <div class="example-stage">
    <section class="example-visual" aria-label="Experiment visual"><div class="example-mapbar"><strong>${r.scene?(week===1?'Kitchen neighbourhood':'Slop Hill · delivery map'):'This week’s small example'}</strong><div>${r.scene?button('map-2d','2D map','aria-pressed="true"'):''}${exampleHas3D(r)?button('map-3d','3D view','aria-pressed="false"'):''}${button('expand','Expand view','class="example-expand" aria-expanded="false"')}</div></div>
    <div class="example-canvas-area">${r.scene?`<div class="lab-map" data-map-host>${mapSvg(r.scene)}</div><div class="lab-scene" data-scene-host hidden></div><div class="example-camera" data-example-camera hidden>${button('overview',week===1?'Whole block':'Reset view')}${week===1?button('top','Top view'):button('destination','Locate home')}</div>`:`<div class="example-symbolic">${symbolicSvg(r)}</div>`}</div>
    <p class="example-map-key">${r.scene?'House number = delivery address · teal dot = doorstep · pink = selected route. Click a house or an order to locate it.':'Follow the arrows and compare the numbers. The diagram uses the computed case above.'}</p>
    ${r.scene?.events.length?`<div class="example-playback"><div>${button('play','Play flight','class="lab-primary"')}${button('next','Next event')}${button('issue','First issue',replayIssues(r).length?'':'disabled')}<label>Speed<select data-example-speed>${[1,5,30,120,600].map(n=>`<option value="${n}" ${n===(week===9?1:30)?'selected':''}>${n}×</option>`).join('')}</select></label><output data-example-time>${bounds.min} s</output></div><input type="range" data-example-time-slider min="${bounds.min}" max="${bounds.max}" value="${bounds.min}" aria-label="Flight time in seconds"><p data-example-flight>Play the actual recorded flight, or drag the time slider.</p></div>`:''}
    </section>
    <aside class="example-sidebar"><div class="example-prompt"><span class="example-step">2</span><strong>${week===1?'Choose a connection':r.scene?'Choose a delivery':'Follow the search'}</strong></div>
    ${inspectRows.length?`<div class="example-choices">${inspectRows.map((row,i)=>button('inspect',week===1?(row.id.startsWith('route')?`Route ${row.values[0]} · ${row.values[2]} s`:'Blocked shortcut'):(i===0?'Fastest candidate':'Candidate within battery'),`data-id="${esc(row.id)}"`)).join('')}</div>`:''}
    ${r.scene?`<div class="example-orders">${r.scene.orders.map(o=>button('order',`<strong>${o.id} → ${esc(placeName(o.node))}</strong><small>${esc(o.label)}</small>`,`data-order="${esc(o.id)}"`)).join('')}</div>`:''}
    <section class="example-selection" aria-live="polite"><h3 data-example-selection>${week===1?'Start with Route A':r.scene?'Where does this dinner go?':'Ready to trace'}</h3><p data-example-detail>${week===1?'Choose a route or the blocked shortcut. The matching line and building appear on the map.':r.scene?'Select an order above. Its home and the recorded outbound route will be highlighted.':'Press Next search step to see which state is considered and why.'}</p><p data-example-live></p><details><summary>Route and technical IDs</summary><div data-example-technical>No selection yet.</div></details></section>
    ${r.trace.length&&[2,3].includes(week)?`<div class="example-trace"><output data-example-trace-count>0 / ${r.trace.length}</output>${button('trace-next','Next search step')}${button('trace-prev','Previous step')}</div>`:''}
    <div class="example-conclusion"><span class="example-step">3</span><strong>What to look for</strong><p>${esc(action.observe)}</p></div></aside>
  </div>
  <section class="example-result" aria-label="Computed result"><div class="example-result-heading"><span class="example-badge ${r.status}">${r.status==='verified'?'Checks passed':r.status==='budget'?'Budget reached':r.status==='diagnostic'?'Diagnostic case':'No route found'}</span><p>${esc(placeText(r.summary))}</p></div><div class="example-metrics">${r.metrics.slice(0,3).map(m=>{const before=baseline.metrics.find(b=>b.key===m.key)?.value;return `<div><span>${esc(m.label)}</span><strong>${mode!=='start'&&before!==m.value?`<del>${esc(before)}</del> → `:''}${esc(m.value)}</strong></div>`;}).join('')}</div></section>
  <details class="example-evidence"><summary>See the numbers and model assumptions</summary><p>${r.assumptions.map(placeText).map(esc).join(' · ')}</p><label>Evidence table<select data-example-table>${r.tables.map(t=>`<option value="${t.id}" ${t.id===primary.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></label><div data-example-table-host>${tableHtml(primary)}</div>${r.input.week===4?profileHtml(r):''}${timelineHtml(r)}</details>`;
}
