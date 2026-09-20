// TEACHER REFERENCE: comparison code supplied with the course, never student authorship.
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { search, fromEdges, timetable, greedyAssign, neighbours, compareObjective } from './engine.mjs';
import { runStudent } from './student-runner.mjs';

// These baseline slot implementations stay independent of edits to strategies.mjs.
const slots = {
  h: () => 0,
  dominates: (a,b) => a.time<=b.time&&a.energy<=b.energy&&(a.time<b.time||a.energy<b.energy),
  withinBudget: (label,budget) => label.energy<=budget,
  priority: tasks => tasks.map(t=>t.drone).sort(),
};
// Braced bodies match the browser strategy-slot source contract.
slots.h = function h(node,goal,state) { return 0; };
slots.dominates = function dominates(a,b) { return a.time<=b.time&&a.energy<=b.energy&&(a.time<b.time||a.energy<b.energy); };
slots.withinBudget = function withinBudget(label,budget) { return label.energy<=budget; };

export const referenceStrategies = {
  ...slots,
  mySearch(edges,start,goal,heuristic) { return search(fromEdges(edges),start,goal,{heuristic}); },
  myTimetable: timetable,
  myAssign(world) { return greedyAssign(world).assignment; },
  myMigrations: neighbours,
  myNeighbours(state,edges,reservations,{waitNodes=['P'],waitEnergy=0}={}) {
    const out=waitNodes.includes(state.node)?[{...state,tick:state.tick+1,energy:state.energy+waitEnergy}]:[];
    for(const e of edges) {
      if(e.from!==state.node || (e.phase&&e.phase!==state.phase))continue;
      if(reservations.some(r=>r.resource===e.resource&&Math.max(state.tick,r.start)<Math.min(state.tick+e.ticks,r.end)))continue;
      out.push({node:e.to,phase:e.toPhase??state.phase,tick:state.tick+e.ticks,energy:state.energy+e.energy});
    }
    return out;
  },
  mySwaps(sequence,score,limit=1000) {
    const outcome=referenceStrategies.myImprove({A:sequence},{evaluate:a=>score(a.A),neighbours:a=>{
      const out=[];
      for(let i=0;i<a.A.length;i++)for(let j=i+1;j<a.A.length;j++) {
        const next=[...a.A];[next[i],next[j]]=[next[j],next[i]];
        out.push({description:`swap ${i+1}, ${j+1}`,assignment:{A:next}});
      }
      return out;
    },compare:compareObjective,limit});
    return {sequence:outcome.assignment.A,status:outcome.status,checked:outcome.candidatesEvaluated,moves:outcome.moves};
  },
  myImprove(start,{evaluate,neighbours,compare,limit}) {
    let assignment=structuredClone(start), current=evaluate(assignment), count=1;
    const moves=[];
    if(!current)return {assignment,status:'infeasible',candidatesEvaluated:count,moves};
    while(true) {
      let best, exhausted=false;
      for(const move of neighbours(assignment)) {
        if(count>=limit){exhausted=true;break;}
        const value=evaluate(move.assignment);count++;
        if(value&&compare(value,current)<0&&(!best||compare(value,best.value)<0))best={...move,value};
      }
      if(best){moves.push({description:best.description,before:current,after:best.value});assignment=best.assignment;current=best.value;}
      if(exhausted||!best)return {assignment,status:exhausted?'budget':'local-optimum',candidatesEvaluated:count,moves};
    }
  },
};
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const task=process.argv[2]??'4';
  const record=runStudent(task,referenceStrategies,{kind:'teacher-reference'});
  writeFileSync(`reference-${task}.json`,JSON.stringify(record,null,2));
  console.log(`TEACHER REFERENCE: ${record.status}; reference-${task}.json`);
}
