import { writeFileSync, readFileSync } from 'node:fs';
import * as student from './strategies.mjs';
import { runStudent } from './student-runner.mjs';
try {
  const task=process.argv[2]??'4';
  const config=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):undefined;
  const record=runStudent(task,student,{config});
  const path=`student-${task}.json`;
  writeFileSync(path,JSON.stringify(record,null,2));
  console.log(`${record.kind}: ${record.status}; ${path}`); console.log(record.checks.join('\n'));
} catch(error) { console.error(error.message); process.exitCode=1; }
