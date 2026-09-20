// Provided harness checks: these do not claim that the unfinished student exercises pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runStudent } from './student-runner.mjs';
import { referenceStrategies as ref } from './reference.mjs';
import { stateSearch } from './framework.mjs';
import * as student from './strategies.mjs';

test('A1 calls actual search, timetable and swap implementations',()=>{
  const called=new Set();
  const implementation=Object.fromEntries(Object.entries(ref).map(([name,fn])=>[name,(...args)=>{called.add(name);return fn(...args);} ]));
  // Slot sources must be standalone bodies, not closures from this spy.
  for(const name of ['h','dominates','withinBudget'])implementation[name]=ref[name];
  const record=runStudent('a1',implementation);
  for(const name of ['mySearch','myTimetable','mySwaps'])assert(called.has(name),name);
  assert.equal(record.outputs.teacherExactComparison.count,720);
  assert.equal(record.outputs.swaps.sequence.length,6);
  assert.equal(record.kind,'student-implementation');
});
test('A2 calls neighbours, assignment, migrations and feedback; priority affects the evaluator',()=>{
  const called=new Set();
  const implementation=Object.fromEntries(Object.entries(ref).map(([name,fn])=>[name,(...args)=>{called.add(name);return fn(...args);} ]));
  const record=runStudent('a2',implementation);
  for(const name of ['myNeighbours','myAssign','myMigrations','myImprove','priority'])assert(called.has(name),name);
  assert.equal(record.outputs.spaceTimeExercise.arrival,11);
  assert.equal(record.outputs.final.check.complete,true);
  assert.equal(record.outputs.improvement.actualEvaluations,120);
});
test('unfinished search and neighbours cannot fall back to reference results',()=>{
  assert.throws(()=>runStudent(2,student),/Implement/);
  assert.throws(()=>runStudent(10,student),/Implement legal/);
});
test('a search cost without a real directed path is rejected',()=>{
  assert.throws(()=>runStudent(2,{...ref,mySearch:()=>({status:'found',cost:2,path:['S','G']})}),/reported cost/);
});
test('a student exception propagates instead of producing a successful record',()=>{
  assert.throws(()=>runStudent('a1',{...ref,mySearch:()=>{throw Error('student defect');}}),/student defect/);
});
test('wrong timetable times fail even if the objective was left correct',()=>{
  assert.throws(()=>runStudent(5,{...ref,myTimetable:(...args)=>{const t=ref.myTimetable(...args);t.slots[0].depart++;return t;}}),/wrong slots/);
});
test('deleting or duplicating an order is rejected',()=>{
  assert.throws(()=>runStudent(7,{...ref,myAssign:w=>Object.fromEntries(w.fleet.drones.map(d=>[d.id,[]]))}),/exactly once/);
  assert.throws(()=>runStudent(8,{...ref,myMigrations:a=>[{assignment:{...a,A:[]}}]}),/exactly once/);
});
test('payload failures remain diagnostic instead of becoming a score',()=>{
  const r=runStudent(7,{...ref,myAssign:(...args)=>{const a=ref.myAssign(...args);for(const ids of Object.values(a)){const i=ids.indexOf('#20');if(i>=0)ids.splice(i,1);}a.A.push('#20');return a;}});
  assert.equal(r.status,'diagnostic');assert.equal(r.outputs.final.check.complete,false);
  assert.equal(r.outputs.final.check.objective,undefined);
});
test('a fabricated local optimum is checked against the actual neighbourhood',()=>{
  assert.throws(()=>runStudent(6,{...ref,mySwaps:sequence=>({sequence,status:'local-optimum',moves:[],checked:0})}),/improving swap/);
});
test('overlapping reservation proposals fail independent successor reconstruction',()=>{
  assert.throws(()=>runStudent(9,{...ref,myNeighbours:s=>[{node:'G',phase:'out',tick:s.tick+2,energy:s.energy+2}]}),/Illegal successor/);
});
test('half-open touching intervals are legal but interior overlaps are rejected',()=>{
  const s={node:'P',phase:'out',tick:6,energy:0}, edges=[{from:'P',to:'G',ticks:2,energy:2,resource:'x'}];
  assert(ref.myNeighbours(s,edges,[{resource:'x',start:0,end:6}]).some(n=>n.node==='G'));
  assert(!ref.myNeighbours(s,edges,[{resource:'x',start:7,end:9}]).some(n=>n.node==='G'));
});
test('space-time driver preserves phases and honours its horizon and energy budget',()=>{
  const s={node:'P',phase:'out',tick:3,energy:0}, e=[{from:'P',to:'G',ticks:2,energy:2,resource:'x'}], r=[{resource:'x',start:0,end:6}];
  const run=(goal,opts)=>stateSearch(s,goal,e,r,ref.myNeighbours,opts);
  assert.equal(run({node:'G',phase:'out'},{horizon:7}).status,'no-solution');
  assert.equal(run({node:'G',phase:'out'},{budget:1}).status,'no-solution');
  assert.equal(run({node:'G',phase:'back'},{}).status,'no-solution');
});

test('an empty migration generator cannot certify a local optimum',()=>{
  assert.throws(()=>runStudent(8,{...ref,myMigrations:()=>[]}),/complete swap and migration/);
});

test('every published weekly reference command has a runnable implementation path',()=>{
  for(let week=1;week<=12;week++) {
    const record=runStudent(week,ref,{kind:'teacher-reference'});
    assert(['verified','diagnostic'].includes(record.status),`week ${week}`);
  }
});
