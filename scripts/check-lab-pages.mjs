// Checks both marking viewports and Astro navigation/WebGL cleanup.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-lab-pages';
mkdirSync(out, { recursive: true });
const chrome = spawn(process.env.LAB_QA_CHROME || '/home/song/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell', ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless', '--hide-scrollbars', '--remote-debugging-pipe', `--user-data-dir=${out}/profile`], { env: { ...process.env, LD_LIBRARY_PATH: process.env.LAB_QA_LIBS || '/home/song/chromium-libs/root/usr/lib/x86_64-linux-gnu' }, stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
let buffer = '', next = 0;
const pending = new Map(), events = [];
chrome.stderr.on('data', b => writeFileSync(out + '/chrome.log', b, { flag: 'a' }));
chrome.stdio[4].on('data', b => { buffer += b; let p; while ((p = buffer.indexOf('\0')) >= 0) {
    const line = buffer.slice(0, p);
    buffer = buffer.slice(p + 1);
    if (!line)
        continue;
    const msg = JSON.parse(line);
    if (msg.id) {
        const job = pending.get(msg.id);
        if (job) {
            pending.delete(msg.id);
            clearTimeout(job.timer);
            msg.error ? job.reject(new Error(JSON.stringify(msg.error))) : job.resolve(msg.result);
        }
    }
    else if (/exceptionThrown|loadingFailed/.test(msg.method))
        events.push(msg);
} });
const rpc = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++next; const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout ' + method)); }, 15000); pending.set(id, { resolve, reject, timer }); chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0'); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
    const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
    const call = (m, p) => rpc(m, p, sessionId);
    const js = async (expression) => { if (!expression.trim().startsWith('(') && /\bconst [a-z]+=/.test(expression))
        expression = '(async()=>{' + expression + '})()'; const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails)
        throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Network.enable');
    const nav = async (url) => { await call('Page.navigate', { url }); for (let i = 0; i < 50; i++) {
        await sleep(100);
        try {
            if (await js('document.readyState === "complete"'))
                break;
        }
        catch { }
    } await sleep(300); };
    const base = 'http://127.0.0.1:4173/comp4020-ass2-1181278174';
    const root = join(process.cwd(), 'dist');
    const find = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? find(join(dir, x.name), prefix + '/' + x.name) : x.name === 'index.html' ? [prefix + '/'] : x.name === '404.html' ? ['/404.html'] : []);
    const paths = find(root).filter(x => !x.startsWith('/_')), results = [], checks = [];
    for (const width of [1920, 390]) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: width === 1920 ? 1080 : 844, deviceScaleFactor: 1, mobile: false });
        for (const path of paths) {
            events.length = 0;
            await nav(base + path);
            await sleep(180);
            const info = await js(`(()=>({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,roots:document.querySelectorAll('[data-lab-workspace],[data-weekly-example]').length,canvases:document.querySelectorAll('[data-scene-host] canvas').length,frames:document.querySelectorAll('iframe[title="Isolated experiment runner"]').length}))()`);
            info.errors = events.filter(x => x.method === 'Runtime.exceptionThrown');
            results.push(info);
        }
        console.log(JSON.stringify({ width, pages: paths.length, overflow: results.filter(x => x.width === width && x.scrollWidth > width), errors: results.filter(x => x.errors.length), webgl: results.filter(x => x.width === width && x.canvases).map(x => x.path) }));
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await nav(base + '/sessions/w04-back-with-battery/');
    await sleep(300);
    let disposals = 0;
    for (const slug of ['w09-same-place', 'w01-one-order', 'w12-twenty-dinners', 'w10-searching-in-time', 'w04-back-with-battery']) {
        await js(`window.__oldGl=document.querySelector('[data-scene-host] canvas')?.getContext('webgl2')`);
        await js(`(()=>{const a=document.createElement('a');a.href=${JSON.stringify(base + '/sessions/')}+${JSON.stringify(slug)}+'/';a.textContent='QA navigation';document.body.append(a);a.click();})()`);
        for (let i = 0; i < 40; i++) {
            await sleep(100);
            if (await js(`location.pathname.includes(${JSON.stringify(slug)}) && !!document.querySelector('[data-scene-host] canvas')`))
                break;
        }
        const ok = await js(`document.querySelectorAll('[data-lab-workspace],[data-weekly-example]').length===1 && document.querySelectorAll('[data-scene-host] canvas').length===1 && window.__oldGl?.isContextLost()===true`);
        if (ok)
            disposals++;
        console.log(JSON.stringify({ navigation: slug, disposed: ok }));
    }
    checks.push({ name: 'five Astro navigations dispose their old WebGL contexts', ok: disposals === 5 });
    const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...args);};})()` });
    await nav(base + '/sessions/w04-back-with-battery/');
    await sleep(600);
    checks.push({ name: 'WebGL unavailable retains readable 2D map and evidence', ok: await js(`!document.querySelector('[data-map-host]').hidden && document.querySelector('[data-example-table-host] table')!==null && document.querySelector('[data-example-status]').textContent.includes('3D could not open')`) });
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    checks.push({ name: 'all 74 page/viewports have no overflow or runtime exceptions', ok: results.length === 74 && results.every(x => x.scrollWidth <= x.width && !x.errors.length) });
    checks.push({ name: '3D loads only on the six designated desktop lab/tutorial pages', ok: results.filter(x => x.width === 1920 && x.canvases).length === 6 });
    checks.push({ name: 'the home decision loads no WebGL scene', ok: results.filter(x => x.path === '/comp4020-ass2-1181278174/').every(x => x.canvases === 0) });
    checks.push({ name: 'no phone page loads WebGL automatically', ok: results.filter(x => x.width === 390).every(x => x.canvases === 0) });
    writeFileSync(out + '/pages.json', JSON.stringify(results, null, 2));
    writeFileSync(out + '/checks.json', JSON.stringify(checks, null, 2));
    if (checks.some(check => !check.ok))
        process.exitCode = 1;
    console.log(JSON.stringify({ checks, out }));
}
finally {
    chrome.kill('SIGTERM');
}
