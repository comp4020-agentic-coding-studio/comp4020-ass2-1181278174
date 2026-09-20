import { writeFileSync } from 'node:fs';
import { defaultConfig, runExperiment } from './engine.mjs';
import * as strategy from './strategies.mjs';
const week=Number(process.argv[2]??4),config=defaultConfig(week);
for(const key of ['h','dominates','withinBudget','orderKey','objective','assignCost','priority']){
  const fn=strategy[key].toString();config.strategies[key].mode='custom';config.strategies[key].code=fn.slice(fn.indexOf('{')+1,fn.lastIndexOf('}'));
}
const run=runExperiment(config,{allowCustom:true});
writeFileSync(`run-w${week}.json`,JSON.stringify({format:'slop3969-experiment',version:2,run},null,2));
console.log(run.summary);console.table(run.metrics);
