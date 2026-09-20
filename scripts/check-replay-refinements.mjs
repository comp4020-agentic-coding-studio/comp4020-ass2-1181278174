// Model, phase and diagnostic acceptance against the built preview on port 4173.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-replay-refinements';
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
    const checks=[];
    const check=(name,ok)=>{checks.push({name,ok});console.log(JSON.stringify({name,ok}));};
    const until=async expression=>{for(let i=0;i<80;i++){if(await js(expression))return true;await sleep(100);}return false;};
    const click=action=>js(`document.querySelector('[data-action="${action}"]').click()`);
    const seek=tick=>js(`(()=>{const s=document.querySelector('[data-time-slider]');s.value=${tick};s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const pose=async(tick,drone)=>{await js(`document.querySelector('[data-time-slider]').step='any'`);await seek(tick);return js(`JSON.parse(document.querySelector('[data-drone="${drone}"]').dataset.pose)`);};
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    const shot=async(name,selector)=>{await js(`document.querySelector('${selector}').scrollIntoView({behavior:'instant',block:'center'})`);await sleep(150);const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));};
    for(const width of [1920,390]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
        await nav(base+'/sessions/w12-twenty-dinners/');
        await js(`document.querySelector('[data-close="start"]').value='5100';document.querySelector('[data-close="end"]').value='5300'`);
        await click('add-closure');await click('run');
        check(width+' closure experiment recomputes',await until(`document.querySelector('[data-run-state]').textContent.startsWith('Computed')&&!document.querySelector('[data-results]').classList.contains('lab-stale')`));
        if(width===390) await click('map-3d');
        await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
        await seek(5200);
        check(width+' closure matches text, SVG and 3D',await js(`document.querySelector('[data-resource-state]').textContent.includes('CLOSED [5100, 5300)')&&document.querySelector('[data-corridor]').dataset.state==='closed'&&document.querySelector('[data-scene-host]').dataset.corridorState==='closed'`));
        await js(`document.querySelector('[data-camera="corridor"]').click()`);
        await shot('closure-'+width,width===1920?'[data-scene-host]':'.lab-playback');
        await seek(5300);
        check(width+' closure ends on the same boundary everywhere',await js(`!document.querySelector('[data-resource-state]').textContent.includes('CLOSED')&&document.querySelector('[data-corridor]').dataset.state!=='closed'&&document.querySelector('[data-scene-host]').dataset.corridorState!=='closed'`));
        const charge=await js(`(()=>{const bar=document.querySelector('.lab-timeline button.charge');return {start:Number(bar.dataset.start),end:Number(bar.dataset.end),drone:bar.closest('.lab-lane').querySelector('strong').textContent};})()`);
        check(width+' charging starts without a position jump',distance(await pose(charge.start-.0001,charge.drone),await pose(charge.start,charge.drone))<.05);
        check(width+' charging ends without a position jump',distance(await pose(charge.end-.0001,charge.drone),await pose(charge.end,charge.drone))<.05);
        const docked=await pose((charge.start+charge.end)/2,charge.drone),waiting=await pose(charge.start,charge.drone);
        check(width+' charging visibly moves onto the pad',distance(docked,waiting)>5);
        await nav(base+'/sessions/w04-back-with-battery/');
        if(width===390) await click('map-3d');
        await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
        const task=await js(`JSON.parse(document.querySelector('[data-initial-run]').textContent).plan.tasks[0]`);
        check(width+' take-off keeps a continuous model position',distance(await pose(task.depart-.0001,'A'),await pose(task.depart,'A'))<.05);
        check(width+' landing keeps a continuous model position',distance(await pose(task.land-.0001,'A'),await pose(task.land,'A'))<.05);
        const rising=await pose(task.depart+1,'A');await pose(task.land,'A');
        check(width+' seeking back restores the same transition',distance(rising,await pose(task.depart+1,'A'))===0);
        await js(`document.querySelector('[data-camera="kitchen"]').click()`);
        await shot('take-off-'+width,'[data-scene-host]');
        await nav(base+'/sessions/w09-same-place/');
        if(width===390) await click('map-3d');
        await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
        const end=await js(`Math.max(...JSON.parse(document.querySelector('[data-initial-run]').textContent).scene.events.filter(e=>e.drone==='A').map(e=>e.end))`);
        await seek(end);
        check(width+' a completed leg keeps its undelivered parcel',await js(`document.querySelector('[data-drone="A"]').dataset.parcel==='true'&&document.querySelector('[data-replay-state]').textContent.includes('leg complete')`));
        await js(`document.querySelector('.lab-timeline').closest('details').open=true`);
        await seek(107);
        check(width+' both overlapping intervals remain visible',await js(`(()=>{const bars=[...document.querySelectorAll('.lab-timeline [aria-current="time"]')];return bars.length===2&&bars[0].getBoundingClientRect().top!==bars[1].getBoundingClientRect().top;})()`));
        check(width+' cursor shares the flight clock and is visible',await js(`(()=>{const run=JSON.parse(document.querySelector('[data-initial-run]').textContent),end=Math.max(...run.scene.events.map(e=>e.end)),cursor=document.querySelector('[data-time-cursor]');return document.querySelector('[data-timeline-time]')?.textContent==='107 s'&&Math.abs(parseFloat(document.querySelector('.lab-timeline').style.getPropertyValue('--replay-progress'))-107/end*100)<.01&&getComputedStyle(cursor).backgroundColor!=='rgba(0, 0, 0, 0)';})()`));
        await shot('timeline-'+width,'.lab-timeline');
        await js(`document.querySelector('[data-time-slider]').step='any'`);await seek(111.9);
        check(width+' clock does not round up before an interval ends',await js(`document.querySelector('[data-time-output]').textContent==='111 s'&&document.querySelector('[data-timeline-time]').textContent==='111 s'&&document.querySelectorAll('.lab-timeline [aria-current="time"]').length===2`));
        await seek(112);
        check(width+' active intervals exclude their end',await js(`document.querySelectorAll('.lab-timeline [aria-current="time"]').length===1`));
        await js(`document.querySelector('.lab-timeline button').focus()`);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
        await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        check(width+' keyboard interval selection seeks the clock',await js(`Number(document.querySelector('[data-time-slider]').value)===Number(document.activeElement.dataset.start)`));
        await seek(107);await js(`document.querySelector('[data-speed]').value='5'`);await click('play');await until(`Number(document.querySelector('[data-time-slider]').value)>107`);await click('play');
        const paused=await js(`document.querySelector('.lab-timeline').style.getPropertyValue('--replay-progress')`);
        await sleep(150);
        check(width+' cursor follows playback and stays put on pause',await js(`document.querySelector('.lab-timeline').style.getPropertyValue('--replay-progress')===${JSON.stringify(paused)}&&Number(document.querySelector('[data-time-slider]').value)>107`));
        check(width+' no document overflow',await js(`document.documentElement.scrollWidth<=innerWidth`));
    }
    check('no unhandled exceptions',!events.some(e=>e.method==='Runtime.exceptionThrown'));
    writeFileSync(out+'/checks.json',JSON.stringify(checks,null,2));
    console.log(JSON.stringify({passed:checks.filter(c=>c.ok).length,total:checks.length,out}));
    if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{chrome.kill('SIGTERM');}
