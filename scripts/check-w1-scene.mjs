// W1 block inspection acceptance against the built preview on port 4173.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-w1-scene';
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
    const camera=name=>js(`document.querySelector('[data-camera="${name}"]')?.click()`);
    const shot=async(name)=>{
        await js(`document.querySelector('[data-scene-host]').scrollIntoView({behavior:'instant',block:'center'})`);await sleep(150);
        const clip=await js(`(()=>{const r=document.querySelector('.lab-stage').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:Math.min(r.height,620),scale:1};})()`);
        const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip});writeFileSync(out+'/'+name+'.png',Buffer.from(result.data,'base64'));
    };
    for(const width of [1920,390]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
        await nav(base+'/sessions/w01-one-order/');
        await click('map-2d');
        await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
        check(width+' blocked demonstration selects its evidence',await until(`document.querySelector('[data-selection-detail]').textContent.includes('block-2')`));
        await click('map-3d');
        check(width+' models load',await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`));
        check(width+' first 3D mount preserves the proposed connection and obstacle',await js(`(()=>{const s=document.querySelector('[data-scene-host]');return s.dataset.selectedPath==='s-1-1>s-2-2'&&s.dataset.selectedBuildings==='block-2';})()`));
        check(width+' selection and obstacle fit inside the camera',await js(`document.querySelector('[data-scene-host]').dataset.selectionInView==='true'`));
        check(width+' selection uses a visible screen-space stroke',await js(`document.querySelector('[data-scene-host]').dataset.selectionStroke==='5'`));
        check(width+' both endpoints and obstacle have visible labels',await js(`(()=>{const labels=[...document.querySelectorAll('[data-inspection]')];return labels.length===3&&labels.every(e=>!e.hidden)&&labels.some(e=>e.textContent==='block-2 · blocked');})()`));
        await shot('blocked-'+width);
        await camera('top');
        check(width+' top view includes the footprint crossing',await js(`!!document.querySelector('[data-camera="top"]')&&document.querySelector('[data-scene-host]').dataset.selectionInView==='true'`));
        await shot('top-'+width);
        await camera('block');
        check(width+' whole block fits all ten nodes',await js(`document.querySelector('[data-scene-host]').dataset.visibleNodes==='10'`));
        check(width+' W1 omits unused replay, trace and distant resource controls',await js(`!document.querySelector('[data-time-slider], [data-trace-slider], [data-action="follow"], [data-action="layer-routes"]')&&![...document.querySelectorAll('.lab-scene-label')].some(e=>/SUMMIT|CORRIDOR|PAD/.test(e.textContent))`));
        await shot('block-'+width);
        await click('map-2d');
        await js(`(()=>{const s=document.querySelector('[data-table-select]');s.value='routes';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await js(`document.querySelector('[data-table-host] [data-action="inspect"]').click()`);
        await click('map-3d');await sleep(200);
        check(width+' route A clears the blocked overlay and focuses the legal route',await js(`(()=>{const s=document.querySelector('[data-scene-host]');return s.dataset.selectedPath==='kitchen>s-1-0>s-1-1'&&s.dataset.selectedBuildings===''&&s.dataset.selectionInView==='true'&&!document.querySelector('[data-inspection="building"]');})()`));
        await js(`document.querySelectorAll('[data-table-host] [data-action="inspect"]')[1].focus()`);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
        await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        check(width+' keyboard route B selection updates 3D',await js(`document.querySelector('[data-scene-host]').dataset.selectedPath==='kitchen>s-1-0>s-0-0>s-0-1>s-1-1'&&document.querySelector('[data-scene-host]').dataset.selectionInView==='true'`));
        await shot('route-b-'+width);
        const otherWidth=width===1920?390:1920;
        await call('Emulation.setDeviceMetricsOverride',{width:otherWidth,height:otherWidth===1920?1080:844,deviceScaleFactor:1,mobile:false});await sleep(250);
        check(width+' resizing keeps selected route in frame',await js(`document.querySelector('[data-scene-host]').dataset.selectionInView==='true'`));
        await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
        await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
        await until(`document.querySelector('[data-selection-detail]').textContent.includes('block-2')`);
        if(width===390)await click('map-3d');
        await until(`document.querySelector('[data-scene-host]').dataset.models==='loaded'`);
        check(width+' recompute preserves selection across scene recreation',await js(`document.querySelector('[data-scene-host]').dataset.selectedPath==='s-1-1>s-2-2'&&document.querySelector('[data-scene-host]').dataset.selectionInView==='true'`));
        check(width+' no document overflow',await js(`document.documentElement.scrollWidth<=innerWidth`));
    }

    await call('Network.setBlockedURLs',{urls:['*models/slop-hill.glb']});
    await nav(base+'/sessions/w01-one-order/');
    await click('map-2d');
    await js(`document.querySelector('[data-action="demo"][data-demo="change"]').click()`);
    await until(`document.querySelector('[data-selection-detail]').textContent.includes('block-2')`);
    await click('map-3d');
    check('missing models keep a working W1 procedural scene',await until(`document.querySelector('[data-scene-host]').dataset.models==='fallback'`));
    check('procedural fallback retains the selected obstacle and connection',await js(`document.querySelector('[data-scene-host]').dataset.selectedBuildings==='block-2'&&document.querySelector('[data-scene-host]').dataset.selectionInView==='true'&&[...document.querySelectorAll('[data-inspection]')].filter(e=>!e.hidden).length===3`));
    await shot('fallback');
    await call('Network.setBlockedURLs',{urls:[]});
    check('no unhandled exceptions',!events.some(e=>e.method==='Runtime.exceptionThrown'));
    writeFileSync(out+'/checks.json',JSON.stringify(checks,null,2));
    console.log(JSON.stringify({passed:checks.filter(c=>c.ok).length,total:checks.length,out}));
    if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{chrome.kill('SIGTERM');}
