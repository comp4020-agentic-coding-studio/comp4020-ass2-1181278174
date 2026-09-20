// Run after pnpm build with pnpm preview on port 4173. Exercises the published course journey.
// Checks both marking viewports and Astro navigation/WebGL cleanup.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-course-acceptance';
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

 const slugs=['w01-one-order','w02-dijkstra','w03-a-star','w04-back-with-battery','w05-many-orders','w06-one-swap','w07-which-drone','w08-charging-pads','w09-same-place','w10-searching-in-time','w11-routes-changed','w12-twenty-dinners'];
 const checks=[], extra=[];
 const assert=(name,ok)=>{extra.push({name,ok});if(!ok)throw Error(name);};
 for(const width of [1920,390]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
 for(const slug of slugs){
 events.length=0; await nav(base+'/sessions/'+slug+'/');
 await js('localStorage.clear()'); await nav(base+'/sessions/'+slug+'/');
 const before=await js(`(()=>{const y=s=>Math.round(document.querySelector(s).getBoundingClientRect().top+scrollY);return {text:document.querySelector('[data-verdict]').textContent,result:y('[data-verdict]'),primary:y('[data-demo="change"]'),height:document.body.scrollHeight,visibleControls:[...document.querySelectorAll('button,input,select,textarea')].filter(e=>e.checkVisibility()).length}})()`);
 await js(`document.querySelector('[data-demo="change"]').click()`);
 await sleep(700);
 const after=await js(`({text:document.querySelector('[data-verdict]').textContent,comparison:document.querySelector('[data-comparison]').textContent,width:innerWidth,scroll:document.documentElement.scrollWidth,state:document.querySelector('[data-run-state]').textContent})`);
 checks.push({slug,width,before,after,errors:events.filter(x=>x.method==='Runtime.exceptionThrown')});
 if(after.scroll>width || !after.comparison.includes('Baseline') || events.some(x=>x.method==='Runtime.exceptionThrown'))throw Error(JSON.stringify(checks.at(-1)));
 if(slug==='w04-back-with-battery'){await js('scrollTo(0,350)'); const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/w4-'+width+'.png',Buffer.from(shot.data,'base64'));}
 }
 }

 for(const width of [1920,390]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:844,deviceScaleFactor:1,mobile:false});
  for(const slug of slugs){
   await nav(base+'/lectures/'+slug+'/');
   assert(slug+' lesson '+width,await js(`document.documentElement.scrollWidth<=innerWidth&&!!document.querySelector('.lesson-diagram')&&document.body.textContent.includes('What you will learn')`));
  }
  for(const id of [1,2]){
   await nav(base+'/assessments/assignment-'+id+'/');
   assert('A'+id+' example '+width,await js(`document.documentElement.scrollWidth<=innerWidth&&document.querySelectorAll('#worked-example tbody tr').length===${id===1?4:3}`));
   await js(`document.querySelector('#worked-example').scrollIntoView({behavior:'instant'})`);
   const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/a'+id+'-'+width+'.png',Buffer.from(shot.data,'base64'));
  }
  await nav(base+'/sessions/w03-a-star/');
  assert('W3 directed graph '+width,await js(`document.querySelectorAll('.lab-search-graph line').length===4`));
  await js(`document.querySelector('.lab-search-graph').scrollIntoView({block:'center',behavior:'instant'})`);
  const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/w3-'+width+'.png',Buffer.from(shot.data,'base64'));
  await nav(base+'/sessions/w04-back-with-battery/');
  await js(`document.querySelector('[data-demo="reset"]').click()`);await sleep(600);
  await js(`document.querySelector('[data-demo="change"]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',text:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await sleep(600);
  assert('Keyboard starts real comparison '+width,await js(`document.querySelector('[data-verdict]').textContent.includes('lost a feasible route')&&document.activeElement.hasAttribute('data-verdict')`));
  await nav(base+'/sessions/w04-back-with-battery/');
  assert('Changed tutorial inputs survive reload '+width,await js(`document.querySelector('[data-slot="dominates"] [data-strategy="preset"]').value==='time'&&document.querySelector('[data-run-state]').textContent.includes('restored')&&document.querySelector('[data-results]').classList.contains('lab-stale')`));
  await nav(base+'/assessments/assignment-1/');
  await js(`document.querySelector('.assessment-resources a[href*="/lab/"]').click()`);await sleep(700);
  assert('A1 link opens canonical six '+width,await js(`document.querySelector('[data-verdict]').textContent.includes('#01')&&document.querySelector('[data-field="caseId"]').value==='canonical-six'`));
 }
 writeFileSync(out+'/checks.json',JSON.stringify({tutorials:checks,extra},null,2));
 console.log(JSON.stringify({passed:true,tutorialViewports:checks.length,additionalChecks:extra.length,out}));

}finally{chrome.kill('SIGTERM');}
