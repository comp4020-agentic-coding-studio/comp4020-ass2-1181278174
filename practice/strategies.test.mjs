import test from 'node:test';
import assert from 'node:assert/strict';
import { dominates, withinBudget, priority } from './strategies.mjs';
import { canonical, defaultConfig, runExperiment, checkPlan } from './engine.mjs';
test('a cheaper label must survive a faster label',()=>{
  assert.equal(dominates({time:2,energy:6},{time:4,energy:2}),false);
  assert.equal(dominates({time:2,energy:2},{time:4,energy:6}),true);
});
test('the reserve boundary is inclusive',()=>{
  assert.equal(withinBudget({energy:80750},80750),true);
  assert.equal(withinBudget({energy:80751},80750),false);
});
test('priority preserves every ready task',()=>{
  assert.deepEqual(priority([{drone:'B'},{drone:'A'}],{}),['A','B']);
});
test('the symbolic swap optimum is not global',()=>{
  const run=runExperiment(defaultConfig(6));
  assert.equal(run.objective.lateness,48);
  assert.equal(run.comparisons.at(-1).value,'46, 51, 0');
});
test('reference output is independently checkable, and tampering fails',()=>{
  const run=runExperiment(defaultConfig(12));
  assert.equal(run.check.onTime,20);
  const plan=structuredClone(run.plan);plan.tasks[0].energyUsed=0;
  assert.equal(checkPlan(canonical,plan,{charging:true,corridor:true}).ok,false);
});
