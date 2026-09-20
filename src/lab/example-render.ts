import { lessons, type LabRun } from './model';
import { basePath, esc, mapSvg, tableHtml, timelineHtml } from './render';
import { placeName, placeText } from './places';
import { teachingActions } from './teaching';
import { replayBounds, replayIssues } from './replay-inspection';
import { lessonEvidence } from './lesson-evidence';
import { metricComparison } from './comparison';

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


const mobileDecisions:Record<number,string>={1:'Check the whole connection.',2:'Stop when the goal is popped.',3:'Reopen A after a better arrival.',4:'Count the return energy.',5:'One sequence, six deliveries.',6:'Compare swaps with all 720 orders.',7:'Check payload before assigning.',8:'Charging is a shared queue.',9:'The whole interval must fit.',10:'Reserve, then plan the next drone.',11:'Recheck costs after each change.',12:'Trace a dinner from ready to return.'};

export function exampleHtml(r:LabRun,baseline:LabRun,mode='start') {
  const week=r.input.week, action=teachingActions[week], bounds=replayBounds(r),hasMap=[1,4,9,10,12].includes(week)&&!!r.scene;
  const figures=lessonEvidence(r,baseline);
  const selectedRows=week===1?[...(r.tables.find(t=>t.id==='routes')?.rows??[]),...(r.tables.find(t=>t.id==='connections')?.rows.filter(x=>x.values[1]==='Building intersection').slice(0,1)??[])]:week===4?(r.tables.find(t=>t.id==='candidates')?.rows.filter((x,i)=>i===0||x.tone==='good').slice(0,2)??[]):[];
  const primary=r.tables.find(t=>t.primary)??r.tables[0];
  const map=r.scene?`<section class="example-visual"><div class="example-mapbar"><strong>${week===1?'Kitchen block':'Slop Hill · terrain & routes'}</strong>${exampleHas3D(r)?button('toggle-map','Open 3D','aria-pressed="false"'):''}</div><div class="example-canvas-area"><div class="lab-map" data-map-host>${mapSvg(r.scene).replaceAll('tabindex="0"','').replaceAll('role="button"','role="img"')}</div><div class="lab-scene" data-scene-host hidden></div></div><p class="example-map-key">${week===1?'A and B reach Home 03. Pink marks the inspected connection.':'Light green = lowlands · brown = higher slope · ridge pass = the central gap. Height shown at 3× scale.'}</p></section>`:'';
  return `<header class="example-heading"><p class="example-mobile-line">W${week} · ${mobileDecisions[week]}</p><div><span class="lab-eyebrow">WEEK ${String(week).padStart(2,'0')} / THIS WEEK’S DECISION</span><h2>${esc(lessons[week].question)}</h2><p>${esc(exampleIntros[week])}</p></div>${hasMap?button('expand','Expand view','class="example-expand" aria-expanded="false"'):''}</header>
  <section class="example-result" aria-label="Computed result"><div class="example-result-heading"><span class="example-badge ${r.status}">${r.status==='verified'?'Checks passed':r.status==='budget'?'Budget reached':r.status==='diagnostic'?'Diagnostic case':r.plan?'Incomplete plan':'No route found'}</span><p>${esc(placeText(r.summary))}</p></div><div class="example-metrics">${r.metrics.slice(0,3).map(m=>`<div><span>${esc(m.label)}</span><strong>${esc(m.value)}</strong></div>`).join('')}</div>${mode==='start'?'':metricComparison(baseline,r)}<p class="example-provenance">Computed from this case · ${r.elapsed} ms · ${esc(r.engine)} · ${esc(r.input.caseId)}</p></section>
  <div class="example-decision"><div class="example-options">${button('change',mode==='start'?esc(action.action):'Restore starting case',`class="lab-primary" data-next="${mode==='start'?'change':'start'}" aria-pressed="${mode!=='start'}"`)}</div><span role="status" data-example-status>${mode==='start'?'Starting case is ready.':'Changed case recomputed.'}</span></div>
  <div class="example-stage lesson-week-${week}">${hasMap?map:''}${figures}</div>

  <details class="example-tools"><summary>Explore the evidence, replay or open full Lab</summary><p><a data-open-lab href="${basePath()}lab/#lab-w${week}">Open full Lab ↗</a> for editable inputs, strategy code and saved comparisons.</p><p>${esc(action.observe)}</p>${week===11?button('reserved','Coordinate routes only'):''}
    ${!hasMap?map:''}
    <div class="example-inspection-tools">${selectedRows.map((row,i)=>button('inspect',week===1?(row.id.startsWith('route')?`Route ${row.values[0]}`:'Blocked shortcut'):(i===0?'Fastest candidate':'Candidate within battery'),`data-id="${esc(row.id)}"`)).join('')}${r.scene&&week!==12?`<label>Inspect a delivery<select data-example-order>${r.scene.orders.map(o=>`<option value="${o.id}">${o.id} → ${esc(placeName(o.node))}</option>`).join('')}</select></label>`:''}<div data-example-camera hidden>${button('overview',week===1?'Whole block':'Reset view')}${week===1?button('top','Top view'):button('destination','Locate home')}</div></div>
    ${week===12?'':`<section class="example-selection" aria-live="polite"><h3 data-example-selection>Read the example above</h3><p data-example-detail>${esc(action.observe)}</p></section>`}<div data-example-technical></div><p data-example-live></p>
    ${r.trace.length&&[2,3].includes(week)?`<div class="example-trace"><output data-example-trace-count>0 / ${r.trace.length}</output>${button('trace-next','Next search step')}${button('trace-prev','Previous step')}</div>`:''}
    <div class="example-evidence"><p>${r.assumptions.map(placeText).map(esc).join(' · ')}</p><label>Evidence table<select data-example-table>${r.tables.map(t=>`<option value="${t.id}" ${t.id===primary.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></label><div data-example-table-host>${tableHtml(primary)}</div></div>
    ${r.scene?.events.length?`<div class="example-playback"><div>${button('play','Play flight','class="lab-primary"')}${button('next','Next event')}${button('issue','First issue',replayIssues(r).length?'':'disabled')}<label>Speed<select data-example-speed>${[1,5,30,120,600].map(n=>`<option value="${n}" ${n===(week===9?1:30)?'selected':''}>${n}×</option>`).join('')}</select></label><output data-example-time>${bounds.min} s</output></div><input type="range" data-example-time-slider min="${bounds.min}" max="${bounds.max}" value="${bounds.min}" aria-label="Flight time in seconds"><p data-example-flight>Play the recorded flight, or drag the time slider.</p>${timelineHtml(r)}</div>`:''}
  </details>`;
}
