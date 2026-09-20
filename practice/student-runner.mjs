import assert from 'node:assert/strict';
import { canonical, ENGINE_VERSION, fingerprint, defaultConfig, worldFor, symbolicJobs, microEdges, runExperiment, fromEdges, fromMap, search, timetable, mapCost, enumerate, compareObjective, feasibilityMatrix, neighbours as referenceNeighbours, evaluate, checkPlan, parseConfig } from './engine.mjs';
import { stateSearch, sameOrders } from './framework.mjs';

/** No missing implementation is replaced by the reference. The checker never edits a result. */
export function runStudent(task, implementation, { config: suppliedConfig, kind = 'student-implementation' } = {}) {
  const week = task === 'a1' ? 6 : task === 'a2' ? 12 : Number(task);
  if (!Number.isInteger(week) || week < 1 || week > 12) throw Error('Use week 1–12, a1 or a2');
  const config = parseConfig(structuredClone(suppliedConfig ?? defaultConfig(week)));
  assert.equal(config.week,week,'Configuration must belong to the selected week');
  if (task === 'a1') config.caseId = 'canonical-six';
  const record = { format: 'slop3969-student-run', version: 1, kind, engine: ENGINE_VERSION, inputFingerprint: fingerprint(config), modelFingerprint: fingerprint(canonical), task: String(task), config, algorithms: {}, calls: {}, outputs: {}, checks: [] };
  const fn = name => (...args) => {
    const f = implementation[name];
    if (typeof f !== 'function') throw Error(`Implement ${name}`);
    record.algorithms[name] = f.toString(); record.calls[name] = (record.calls[name] ?? 0) + 1;
    return f(...args);
  };
  const checked = name => record.checks.push(name);
  const graphRun = (name, edges, start, goal, h = () => 0) => {
    const result = fn('mySearch')(structuredClone(edges), start, goal, h);
    const reference = search(fromEdges(edges), start, goal);
    assert.equal(result.status, reference.status, name + ': wrong search status');
    assert.equal(result.cost, reference.cost, name + ': wrong path cost');
    if (result.status === 'found') {
      assert.equal(result.path?.[0], start); assert.equal(result.path?.at(-1), goal);
      let cost = 0;
      for (let i = 1; i < result.path.length; i++) {
        const edge = edges.filter(e => e.from === result.path[i - 1] && e.to === result.path[i]).sort((a, b) => a.cost - b.cost)[0];
        assert(edge, name + ': path uses a missing directed edge'); cost += edge.cost;
      }
      assert.equal(cost, result.cost, name + ': reported cost differs from path');
    }
    record.outputs[name] = result; checked(name);
  };
  if ([2, 3].includes(week) || task === 'a1') {
    graphRun('discovery', [{from:'S',to:'G',cost:10},{from:'S',to:'A',cost:1},{from:'A',to:'G',cost:1}], 'S', 'G');
    if (week === 3 || task === 'a1') graphRun('reopening', microEdges, 'S', 'G', n => ({S:0,A:0,B:3,G:0}[n]));
    if (task === 'a1') {
      const g = fromMap(canonical.map, canonical.fleet.types[0], 'time');
      const edges = g.nodeIds().flatMap(from => g.neighbours(from).map(e => ({from,to:e.to,cost:e.cost})));
      graphRun('canonicalSearch', edges, canonical.map.kitchen, canonical.orders[0].node);
    }
  }
  if (week === 4 || task === 'a1') {
    const c = defaultConfig(4);
    for (const key of ['h', 'dominates', 'withinBudget']) {
      const source = implementation[key]?.toString();
      if (!source) throw Error('Implement ' + key);
      record.algorithms[key] = source;
      c.strategies[key].mode = 'custom'; c.strategies[key].code = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
    }
    const result = runExperiment(c, {allowCustom:true});
    assert.equal(result.status, 'verified', 'The full hilltop trip must remain feasible');
    assert.equal(result.check?.ok, true, 'Independent full-trip check');
    record.outputs.resourceLabels = result; checked('full-trip energy and return');
  }
  if ([5, 6].includes(week)) {
    const symbolic = task !== 'a1' && week === 6;
    const jobs = structuredClone(symbolic ? symbolicJobs : canonical.orders.slice(0, 6));
    const cost = symbolic ? j => ({d:j.d,p:j.p,energy:0}) : mapCost(canonical.map, canonical.rules, canonical.fleet.types[0], jobs);
    const options = symbolic ? {} : {loadingTicks:canonical.rules.loadingTicks,turnaroundTicks:canonical.rules.turnaroundTicks};
    const compute = sequence => {
      sameOrders(sequence.map(j => j.id), jobs.map(j => j.id));
      const output = fn('myTimetable')(structuredClone(sequence), cost, options);
      const reference = timetable(sequence, cost, options);
      for (const key of ['slots','infeasible','feasible','objective']) assert.deepEqual(output[key], reference[key], `myTimetable: wrong ${key}`);
      return output;
    };
    const fifo = [...jobs].sort((a,b) => a.ready-b.ready || a.id.localeCompare(b.id));
    const deadline = [...jobs].sort((a,b) => a.promised-b.promised || a.ready-b.ready || a.id.localeCompare(b.id));
    record.outputs.fifo = compute(fifo); record.outputs.deadline = compute(deadline);
    if (week === 6) {
      const result = fn('mySwaps')(deadline, sequence => compute(sequence).objective, 1000);
      const final = compute(result.sequence);
      assert(compareObjective(final.objective, record.outputs.deadline.objective) <= 0, 'Swaps made the plan worse');
      assert(['local-optimum','budget'].includes(result.status), 'Name the swap stopping reason');
      if (result.status === 'local-optimum') for(let i=0;i<jobs.length;i++) for(let j=i+1;j<jobs.length;j++) {
        const next=[...result.sequence]; [next[i],next[j]]=[next[j],next[i]];
        assert(compareObjective(timetable(next,cost,options).objective, final.objective)>=0, 'An improving swap remains');
      }
      record.outputs.swaps = {...result, timetable:final};
      record.outputs.teacherExactComparison = enumerate(jobs,cost,options);
      if(task==='a1') {
        const world={...canonical,orders:jobs,fleet:{...canonical.fleet,drones:[{id:'A',type:'L'}]}};
        const assignment={A:result.sequence.map(j=>j.id)}, plan=evaluate(world,assignment,{charging:false,corridor:false});
        const check=checkPlan(world,plan,{charging:false,corridor:false});
        assert(check.ok&&check.complete,'Six-order plan failed reconstruction');
        assert.deepEqual(check.objective,final.objective,'Student timetable and actual flights disagree');
        record.outputs.singleDronePlan={assignment,plan,check};
      }
    }
    checked('student timetable and order completeness');
  }
  if ([9,10].includes(week) || task === 'a2') {
    const edges = [{from:'P',to:'G',ticks:2,energy:2,resource:'corridor',phase:'out'}];
    const full = week === 10 || task === 'a2';
    if(full) edges.push({from:'G',to:'G',ticks:1,energy:1,resource:'service',phase:'out',toPhase:'back'}, {from:'G',to:'P',ticks:2,energy:1,resource:'corridor',phase:'back'});
    const result = stateSearch({node:'P',phase:'out',tick:3,energy:0}, {node:full?'P':'G',phase:full?'back':'out'}, edges, [{resource:'corridor',start:0,end:6}], fn('myNeighbours'), {horizon:20,budget:8,waitNodes:['P'],waitEnergy:0});
    assert.equal(result.status,'found','Retain later states and finish the required phase');
    assert.equal(result.arrival,full?11:8,'Earliest complete symbolic route');
    record.outputs.spaceTimeExercise=result; checked('symbolic states, phase, intervals and energy');
  }
  if ([7,8,11,12].includes(week)) {
    const world=worldFor(config), matrix=feasibilityMatrix(world);
    const validateAssignment = assignment => {
      assert.deepEqual(Object.keys(assignment).sort(),world.fleet.drones.map(d=>d.id).sort(),'Unknown or missing drone');
      sameOrders(Object.values(assignment),world.orders.map(o=>o.id));
    };
    const options={charging:week>=8,corridor:week>=11,priority:fn('priority')};
    const planFor = assignment => {
      validateAssignment(assignment);
      const plan=evaluate(world,structuredClone(assignment),options), check=checkPlan(world,plan,options);
      return {plan,check};
    };
    let assignment=fn('myAssign')(structuredClone(world),structuredClone(matrix));
    const initial=planFor(assignment); record.outputs.initial={assignment:structuredClone(assignment),...initial};
    if(week>=11) {
      const independent=evaluate(world,assignment,{...options,corridor:false});
      record.outputs.independent={plan:independent,jointCheck:checkPlan(world,independent,options)};
      record.outputs.coordinated=initial;
    }
    let evaluated=0;
    const fullEvaluation = candidate => {
      if(++evaluated>120) throw Error('Candidate budget of 120 exceeded');
      const {check}=planFor(candidate); return check.ok&&check.complete?check.objective:undefined;
    };
    const neighbours = current => {
      const result=fn('myMigrations')(structuredClone(current));
      assert(Array.isArray(result),'myMigrations must return an array');
      for(const move of result) validateAssignment(move.assignment);
      const signature=a=>JSON.stringify(Object.keys(a).sort().map(id=>[id,a[id]]));
      const expected=new Set(referenceNeighbours(current).map(n=>signature(n.assignment)));
      const actual=new Set(result.map(n=>signature(n.assignment)));
      assert.deepEqual(actual,expected,'Generate the complete swap and migration neighbourhood');
      return result;
    };
    if (week===8) {
      record.outputs.migrations=neighbours(assignment).slice(0,120).map(move=>({description:move.description,assignment:move.assignment,objective:fullEvaluation(move.assignment)}));
    }
    if (week>=11) {
      const result=fn('myImprove')(structuredClone(assignment),{evaluate:fullEvaluation,neighbours,compare:compareObjective,limit:120});
      assert(['local-optimum','budget','infeasible'].includes(result.status),'Name the feedback stopping reason');
      assert(evaluated>0,'Call the supplied evaluator before returning a result');
      assignment=result.assignment; record.outputs.improvement={...result,actualEvaluations:evaluated};
      const final=planFor(assignment);
      if(initial.check.ok&&initial.check.complete) assert(final.check.ok&&final.check.complete&&compareObjective(final.check.objective,initial.check.objective)<=0,'Do not lose the best feasible plan');
      if(result.status==='local-optimum') for(const move of neighbours(assignment)) {
        const p=planFor(move.assignment);
        assert(!(p.check.ok&&p.check.complete&&compareObjective(p.check.objective,final.check.objective)<0),'An improving move remains');
      }
    }
    record.outputs.final={assignment,...planFor(assignment)};
    if(week>=11) {
      const reversed={...options,priority:tasks=>[...fn('priority')(tasks)].reverse()};
      const plan=evaluate(world,assignment,reversed);
      record.outputs.reversedPriority={plan,check:checkPlan(world,plan,reversed)};
    }
    checked('full fleet reconstruction; feasibility is reported separately from search termination');
  }
  if(week===1) record.outputs.providedGeometry=runExperiment(config);
  record.status=record.outputs.final ? (record.outputs.final.check.ok&&record.outputs.final.check.complete?'verified':'diagnostic') : 'verified';
  record.sourceFingerprint=fingerprint(record.algorithms);
  return record;
}
