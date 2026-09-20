// Model, phase and diagnostic acceptance against the built preview on port 4173.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-visual-replay';
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
    const checks=[], stats=[];
    const check=(name,ok)=>{checks.push({name,ok});console.log(JSON.stringify({name,ok}));};
    const until=async expression=>{for(let i=0;i<60;i++){if(await js(expression))return true;await sleep(100);}return false;};
    const click=async action=>js(`document.querySelector('[data-action="${action}"]').click()`);
    const seek=async tick=>js(`(()=>{const s=document.querySelector('[data-time-slider]');s.value=${tick};s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const shot=async(name,selector='[data-scene-host]')=>{await js(`document.querySelector('${selector}').scrollIntoView({behavior:'instant',block:'center'})`);await sleep(200);const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));};
    for(const width of [1920,390]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
        await nav(base+'/sessions/w04-back-with-battery/');
        if(width===390) {check('phone starts with SVG',await js(`!document.querySelector('[data-scene-host] canvas')`));await click('map-3d');}
        check(width+' loads Blender assets',await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`));
        const metrics=await js(`({...document.querySelector('[data-scene-host]').dataset,modelLoadMs:performance.getEntriesByType('resource').find(r=>r.name.endsWith('/models/slop-hill.glb'))?.duration})`);
        check(width+' 40 buildings and under 200 draw calls',metrics.buildings==='40'&&Number(metrics.drawCalls)<200);
        const loading=await js(`JSON.parse(document.querySelector('[data-initial-run]').textContent).scene.events.find(e=>e.phase==='load').start`);
        await click('play');
        check(width+' Play skips the long opening idle gap',await until(`Number(document.querySelector('[data-time-slider]').value)>=${loading}`));
        await click('play');await click('time-start');
        await shot('w4-overview-'+width);
        const boundary=await js(`JSON.parse(document.querySelector('[data-initial-run]').textContent).scene.events.find(e=>e.phase==='service').end`);
        await seek(boundary-1);
        check(width+' service keeps the parcel',await js(`document.querySelector('[data-drone="A"]').dataset.parcel==='true'&&document.querySelector('[data-drone="A"]').dataset.phase==='delivering'`));
        await seek(boundary);
        check(width+' return removes the parcel',await js(`document.querySelector('[data-drone="A"]').dataset.parcel==='false'&&document.querySelector('[data-drone="A"]').dataset.phase==='returning'`));
        await click('follow');await shot('w4-follow-'+width);
        await js(`document.querySelector('[data-speed]').value='1'`);await click('play');
        metrics.playback=await js(`(new Promise(resolve=>{const gaps=[];let previous=performance.now();function frame(now){gaps.push(now-previous);previous=now;if(gaps.length<30)requestAnimationFrame(frame);else{gaps.sort((a,b)=>a-b);resolve({frames:30,medianMs:gaps[15],p95Ms:gaps[28],tick:document.querySelector('[data-time-slider]').value});}}requestAnimationFrame(frame);}))`);
        check(width+' replay yields frame timing',Number.isFinite(metrics.playback?.medianMs));
        await click('play');stats.push({width,...metrics});
        check(width+' no overflow',await js(`document.documentElement.scrollWidth<=innerWidth`));
        await nav(base+'/sessions/w09-same-place/');
        if(width===390) await click('map-3d');
        await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
        check(width+' W9 starts at 1x',await js(`document.querySelector('[data-speed]').value==='1'`));
        await click('first-issue');
        check(width+' conflict starts at 107',await js(`document.querySelector('[data-time-slider]').value==='107'&&document.querySelector('[data-replay-note]').textContent.includes('[107, 112)')&&document.querySelector('[data-resource-state]').textContent.includes('CONFLICT')`));
        await shot('w9-conflict-'+width);
        await seek(112);
        check(width+' conflict ends at 112',await js(`!document.querySelector('[data-resource-state]').textContent.includes('CONFLICT')`));
        await seek(0);await js(`document.querySelector('[data-pause-issue]').checked=true;document.querySelector('[data-speed]').value='600'`);await click('play');
        check(width+' playback stops at first issue',await until(`document.querySelector('[data-time-slider]').value==='107'&&document.querySelector('[data-action="play"]').textContent==='Play replay'`));
        await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
        await until(`document.querySelector('[data-verdict]').classList.contains('verified')&&!document.querySelector('[data-action="next-wait"]').disabled`);
        await click('next-wait');
        check(width+' wait identifies blocker and energy',await js(`document.querySelector('[data-replay-note]').textContent.includes('B [87, 112)')&&document.querySelector('[data-replay-state]').textContent.includes('hovering')`));
        await nav(base+'/sessions/w08-charging-pads/');
        await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
        await until(`document.querySelector('[data-scenario-pads]').value==='1'&&!document.querySelector('[data-action="next-wait"]').disabled`);
        await click('next-wait');
        check(width+' pad queue appears in SVG replay',await js(`document.querySelector('[data-replay-state]').textContent.includes('waiting for pad')&&document.querySelector('[data-resource-state]').textContent.includes('1/1 occupied')`));
        await shot('w8-queue-'+width,'.lab-playback');
        await nav(base+'/sessions/w12-twenty-dinners/');
        await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
        await until(`!document.querySelector('[data-action="first-issue"]').disabled`);await click('first-issue');
        check(width+' late task exposes cause chain',await js(`document.querySelector('[data-replay-note]').textContent.includes('late')&&document.querySelector('[data-selection-detail]').textContent.includes('Loading starts')`));
        check(width+' focuses one order',await js(`(()=>{const lines=[...document.querySelectorAll('[data-route]')].filter(e=>e.style.display!=='none');return lines.length===2&&lines[0].dataset.order===lines[1].dataset.order;})()`));
    }
    await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await nav(base+'/sessions/w04-back-with-battery/');
    check('reduced motion starts without 3D or animation',await js(`!document.querySelector('[data-scene-host] canvas')&&document.querySelector('[data-time-slider]').value==='0'`));
    await click('map-3d');await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
    check('reduced motion disables camera follow',await js(`document.querySelector('[data-action="follow"]').disabled`));
    await call('Emulation.setEmulatedMedia',{features:[]});
    const delayed=await call('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const fetchNow=window.fetch;window.fetch=(input,...rest)=>{const url=typeof input==='string'?input:input.url;if(url?.includes('/models/slop-hill.glb'))return new Promise((resolve,reject)=>setTimeout(()=>fetchNow(input,...rest).then(resolve,reject),2000));return fetchNow(input,...rest);};})()`});
    await nav(base+'/sessions/w04-back-with-battery/');
    await until(`!!document.querySelector('[data-scene-host] canvas')`);
    check('delayed asset is still pending before navigation',await js(`document.querySelector('[data-scene-host]').dataset.models==='loading'`));
    await js(`window.__oldGl=document.querySelector('[data-scene-host] canvas').getContext('webgl2');(()=>{const a=document.createElement('a');a.href=${JSON.stringify(base+'/sessions/w01-one-order/')};a.textContent='QA navigation';document.body.append(a);a.click();})()`);
    await until(`location.pathname.includes('w01-one-order')&&document.querySelector('[data-scene-host]')?.dataset.models==='loaded'`);
    check('late model completion cannot revive a disposed scene',await js(`window.__oldGl.isContextLost()&&document.querySelectorAll('[data-scene-host] canvas').length===1&&location.pathname.includes('w01-one-order')`));
    await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:delayed.identifier});
    await call('Network.setBlockedURLs',{urls:['*models/slop-hill.glb']});
    await nav(base+'/sessions/w04-back-with-battery/');
    check('missing GLB keeps procedural scene and replay',await until(`document.querySelector('[data-scene-host]').dataset.models==='fallback'&&!!document.querySelector('[data-scene-host] canvas')&&!document.querySelector('[data-action="play"]').disabled`));
    check('no runtime exceptions',!events.some(e=>e.method==='Runtime.exceptionThrown'));
    writeFileSync(out+'/checks.json',JSON.stringify({checks,stats,errors:events.filter(e=>e.method==='Runtime.exceptionThrown')},null,2));
    console.log(JSON.stringify({passed:checks.filter(c=>c.ok).length,total:checks.length,stats,out}));
    if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{chrome.kill('SIGTERM');}
