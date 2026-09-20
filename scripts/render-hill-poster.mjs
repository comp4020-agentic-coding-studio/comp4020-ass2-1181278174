// Render the existing scene using the CDP screenshot setup from check-w1-scene.mjs.
// Run after pnpm build with the preview on port 4173: node scripts/render-hill-poster.mjs.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/hill-poster';
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


    const { default: sharp } = await import('sharp');
    await call('Emulation.setDeviceMetricsOverride',{width:2560,height:1440,deviceScaleFactor:1,mobile:false});
    await nav(base+'/lab/?lighting=evening#lab-w12');
    await js(`document.querySelector('[data-action="map-3d"]').click()`);
    for(let i=0;i<150;i++) {
        if(await js(`document.querySelector('[data-scene-host]')?.dataset.models==='loaded'`))break;
        await sleep(100);
    }
    if(!await js(`document.querySelector('[data-scene-host]')?.dataset.models==='loaded'`))throw new Error('Models did not load');
    await js(`(()=>{const host=document.querySelector('[data-scene-host]');host.classList.add('lab-expanded');host.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647';document.body.append(host);document.querySelector('[data-camera="overview"]').click();document.querySelectorAll('.lab-scene-labels').forEach(e=>e.hidden=true);})()`);
    await sleep(800);
    const result=await call('Page.captureScreenshot',{format:'png'});
    const frame=Buffer.from(result.data,'base64');
    await sharp(frame).avif({quality:70}).toFile('src/assets/images/hero-home.avif');
    await sharp(frame).resize(1200,630,{fit:'cover'}).png().toFile('src/assets/images/card.png');
    writeFileSync(out+'/render.png',frame);
    console.log('Rendered the existing Lab scene at 2560 × 1440; exported hero-home.avif and card.png.');
}finally{chrome.kill('SIGTERM');}
