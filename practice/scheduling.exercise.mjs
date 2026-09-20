// Student exercise checks: intentionally fail until the corresponding skeleton is implemented.
import test from 'node:test';
import assert from 'node:assert/strict';
import { myTimetable, mySwaps, myAssign, myMigrations, myImprove } from './strategies.mjs';
import { canonical, worldFor, defaultConfig, feasibilityMatrix, compareObjective } from './engine.mjs';

test('W5 loading, return and turnaround change the next start',()=>{
  const jobs=[{id:'a',ready:5,promised:10},{id:'b',ready:0,promised:20}];
  const t=myTimetable(jobs,()=>({d:2,p:5,energy:7}),{loadingTicks:3,turnaroundTicks:4});
  assert.deepEqual(t.slots.map(s=>[s.start,s.depart,s.deliver,s.ret,s.available]),[[5,8,10,13,17],[17,20,22,25,29]]);
  assert.equal(t.objective.lateness,2);assert.equal(t.objective.allReturned,25);assert.equal(t.objective.energy,14);
});
test('W6 accept only a strict improvement and finish a full scan',()=>{
  const a={id:'a'},b={id:'b'},score=seq=>({lateness:seq[0].id==='b'?0:5,allReturned:10,energy:10});
  const r=mySwaps([a,b],score,20);
  assert.deepEqual(r.sequence.map(j=>j.id),['b','a']);assert.equal(r.status,'local-optimum');
});
test('W7 every order occurs once and the hotpot goes to a capable drone',()=>{
  const w=worldFor(defaultConfig(7)),a=myAssign(w,feasibilityMatrix(w));
  assert.deepEqual(Object.values(a).flat().sort(),w.orders.map(o=>o.id).sort());
  const drone=w.fleet.drones.find(d=>a[d.id].includes('#20'));
  assert(canonical.fleet.types.find(t=>t.id===drone.type).payloadKg>=3.5);
});
test('W8 migrations preserve their input and include every insertion position',()=>{
  const a={A:['a','b'],B:['c']},snapshot=structuredClone(a),moves=myMigrations(a);
  assert.deepEqual(a,snapshot);
  assert(moves.some(m=>JSON.stringify(m.assignment)===JSON.stringify({A:['b'],B:['c','a']})));
  for(const m of moves)assert.deepEqual(Object.values(m.assignment).flat().sort(),['a','b','c']);
});
test('W11 the evaluation budget includes the initial plan',()=>{
  let calls=0;
  const r=myImprove({A:['a'],B:[]},{evaluate:()=>{calls++;return {lateness:1,allReturned:2,energy:3};},neighbours:()=>[{assignment:{A:[],B:['a']}}],compare:compareObjective,limit:1});
  assert.equal(calls,1);assert.equal(r.status,'budget');
});
