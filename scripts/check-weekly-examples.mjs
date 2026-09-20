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


    const checks=[];const check=(name,ok)=>{checks.push({name,ok});console.log(JSON.stringify({name,ok}));};
    const until=async expression=>{for(let i=0;i<150;i++){if(await js(expression))return true;await sleep(100);}return false;};
    await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const links=await fetch(base+'/sessions/').then(r=>r.text());
    const urls=[...new Set([...links.matchAll(/href="([^"]*sessions\/w\d[^"#]*\/?)"/g)].map(m=>m[1]))].sort();
    console.log({urls});
    for(const [index,url] of urls.entries()) {
      await nav(new URL(url,base+'/').href);
      check(url+' dedicated example, no embedded editors',await js(`!!document.querySelector('[data-weekly-example]')&&!document.querySelector('[data-lab-workspace], [data-slot], [data-json], [data-import]')`));
      await js(`document.querySelector('[data-example-action="change"]').click()`);
      check(url+' change recomputes and finishes',await until(`document.querySelector('[data-example-action="change"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('[data-example-action="change"]').disabled`));
      check(url+' no horizontal overflow',await js(`document.documentElement.scrollWidth<=innerWidth`));
      if([0,3,8,11].includes(index)) {
        await sleep(350);await js(`document.querySelector('.example-stage').scrollIntoView({behavior:'instant',block:'center'})`);await sleep(200);
        const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/w'+(index+1)+'.png',Buffer.from(shot.data,'base64'));
      }
    }
    check('all twelve tutorials were checked',urls.length===12);
    check('no unhandled exceptions',!events.some(e=>e.method==='Runtime.exceptionThrown'));
    writeFileSync(out+'/checks.json',JSON.stringify({checks,events},null,2));
    if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{chrome.kill('SIGTERM');}
