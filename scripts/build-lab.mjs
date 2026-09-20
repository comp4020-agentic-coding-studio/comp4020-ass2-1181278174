import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';
await mkdir('.generated', { recursive: true });
await build({ entryPoints: ['src/lab/worker-entry.ts'], outfile: '.generated/lab-worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true });
await build({ entryPoints: ['src/lab/practice-api.ts'], outfile: '.generated/practice-engine.mjs', bundle: true, format: 'esm', platform: 'node', target: 'es2022' });
const api = await import('../.generated/practice-engine.mjs?build=' + Date.now());
const files = {};
for (const name of await readdir('practice'))
    files[name] = new Uint8Array(await readFile('practice/' + name));
files['engine.mjs'] = new Uint8Array(await readFile('.generated/practice-engine.mjs'));
files['scenario.json'] = new TextEncoder().encode(JSON.stringify(api.canonical, null, 2));
for (const [name, week] of [['a1', 6], ['a2', 12]]) {
    const input = api.defaultConfig(week);
    if (week === 6)
        input.caseId = 'canonical-six';
    files['sample-' + name + '.json'] = new TextEncoder().encode(JSON.stringify({ format: 'slop3969-experiment', version: 2, run: api.runExperiment(input) }, null, 2));
}
await writeFile('.generated/lab-practice.zip', zipSync(files, { level: 6 }));
