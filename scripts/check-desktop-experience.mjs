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
    const until=async expression=>{for(let i=0;i<100;i++){if(await js(expression))return true;await sleep(100);}return false;};
    const click=action=>js(`document.querySelector('[data-example-action="${action}"]').click()`);
    const shot=async name=>{await sleep(250);const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));};
    for(const width of [1920,1366]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:width===1920?1080:768,deviceScaleFactor:1,mobile:false});
      for(const [slug,id] of [['w01-one-order','#03'],['w04-back-with-battery','#07'],['w09-same-place','#13'],['w12-twenty-dinners','#20']]) {
        await nav(base+'/sessions/'+slug+'/');
        check(width+' '+slug+' models load',await until(`document.querySelector('[data-scene-host]')?.dataset.models==='loaded'`));
        if(slug.startsWith('w01'))await click('change');
        else await js(`document.querySelector('[data-example-action="order"][data-order="${id}"]').click()`);
        await until(`!document.querySelector('[data-example-action="change"]').disabled`);
        const state=await js(`JSON.stringify({path:document.querySelector('[data-scene-host]').dataset.selectedPath,time:document.querySelector('[data-example-time-slider]')?.value})`);
        await click('expand');await sleep(300);
        check(width+' '+slug+' expands the same instance',await js(`document.querySelector('[data-weekly-example]').classList.contains('lab-expanded')&&JSON.stringify({path:document.querySelector('[data-scene-host]').dataset.selectedPath,time:document.querySelector('[data-example-time-slider]')?.value})===${JSON.stringify(state)}`));
        check(width+' '+slug+' canvas fits the desktop window',await js(`(()=>{const r=document.querySelector('[data-scene-host] canvas').getBoundingClientRect();return r.width>700&&r.height>230&&r.x>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})()`));
        check(width+' '+slug+' selection is understandable',await js(`!document.querySelector('[data-example-selection]').textContent.includes('s-')&&!!document.querySelector('[data-example-selection]').textContent`));
        await shot(slug+'-'+width);

        if(slug.startsWith('w04')) {
          const at=await js(`Number(document.querySelector('[data-example-time-slider]').value)`);
          await click('play');check(width+' weekly playback advances',await until(`Number(document.querySelector('[data-example-time-slider]').value)>${at+1}`));await click('play');
          const paused=await js(`document.querySelector('[data-example-time-slider]').value`);await sleep(150);
          check(width+' pause holds the same tick',await js(`document.querySelector('[data-example-time-slider]').value===${JSON.stringify(paused)}`));
          await js(`(()=>{const input=document.querySelector('[data-example-time-slider]');input.value=${at};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
          check(width+' seeking returns to the requested tick',await js(`Number(document.querySelector('[data-example-time-slider]').value)===${at}`));

          await click('change');await until(`document.querySelector('[data-example-action="change"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('[data-example-action="change"]').disabled`);
          check(width+' recomputing preserves expanded mode and its exit control',await js(`document.querySelector('.lab-expanded')&&document.querySelector('[data-example-action="expand"]').getAttribute('aria-expanded')==='true'&&document.querySelectorAll('[data-scene-host] canvas').length<=1`));
        }
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        check(width+' '+slug+' Escape restores the page',await until(`!document.querySelector('.lab-expanded')&&document.body.style.overflow!=='hidden'`));
        check(width+' '+slug+' has no horizontal overflow',await js(`document.documentElement.scrollWidth<=innerWidth`));
      }
    }
    await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

    await nav(base+'/sessions/w07-which-drone/');await click('change');
    await until(`document.querySelector('[data-example-action="change"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('[data-example-action="change"]').disabled`);
    check('an unflown order still highlights its home on the 2D map',await js(`document.querySelector('[data-customer-homes] .is-destination')?.dataset.node==='s-6-5'&&document.querySelector('[data-example-selection]').textContent.includes('#20')&&document.querySelector('[data-example-detail]').textContent.includes('payload')`));
    await shot('w7-failed-home');
    await nav(base+'/sessions/w12-twenty-dinners/');await until(`document.querySelector('[data-scene-host]')?.dataset.models==='loaded'`);
    await js(`document.querySelector('[data-example-action="order"][data-order="#20"]').click()`);await click('expand');await click('destination');await shot('home20-closeup');
    check('Locate home keeps the correct delivery selected',await js(`document.querySelector('[data-example-selection]').textContent.includes('Home 20')&&document.querySelector('[data-inspection="destination"]')?.textContent.includes('Home 20')&&!document.querySelector('[data-inspection="destination"]').hidden`));
    await click('expand');
    await nav(base+'/lab/#lab-w4');
    check('Lab starts on the experiment section',await js(`!document.querySelector('[data-lab-panel="experiment"]').hidden&&document.querySelector('[data-lab-panel="settings"]').hidden&&document.querySelector('[data-lab-panel="record"]').hidden`));
    await js(`document.querySelector('[data-action="panel"][data-panel="settings"]').click()`);
    check('editors are accessible through Change inputs',await js(`!document.querySelector('[data-lab-panel="settings"]').hidden&&document.querySelector('[data-lab-panel="experiment"]').hidden`));
    await js(`(()=>{const d=document.querySelector('[data-field="drone"]');d.value='H';d.dispatchEvent(new Event('input',{bubbles:true}));d.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action="run"]').click();})()`);
    check('Run recomputes and returns to the experiment',await until(`document.querySelector('[data-run-state]').textContent.startsWith('Computed')&&!document.querySelector('[data-lab-panel="experiment"]').hidden`));
    await js(`document.querySelector('[data-action="expand"]').click()`);await sleep(300);await shot('lab-expanded');
    check('Lab expands its current map',await js(`document.querySelector('[data-lab-workspace]').classList.contains('lab-expanded')&&document.querySelector('[data-action="expand"]').textContent==='Exit expanded view'`));
    await js(`document.querySelector('[data-action="expand"]').click()`);
    await js(`document.querySelector('[data-action="panel"][data-panel="record"]').click();document.querySelector('[data-action="archive"]').click()`);
    check('Saved work retains run archives',await js(`!document.querySelector('[data-lab-panel="record"]').hidden&&document.querySelector('[data-archive]').textContent.includes('Saved runs (1/8)')`));
    await js(`(()=>{const s=document.querySelector('[data-week-picker]');s.value='9';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    check('week picker loads the selected experiment',await until(`document.querySelector('[data-lab-heading]').textContent.includes('Same place')&&document.querySelector('[data-run-state]').textContent.startsWith('Computed')`));

    await nav(base+'/sessions/w01-one-order/');
    await call('Runtime.evaluate',{expression:`document.querySelector('[data-example-action="expand"]').click()`,userGesture:true});await sleep(300);
    check('native browser fullscreen opens when available',await js(`document.fullscreenElement===document.querySelector('[data-weekly-example]')`));
    await call('Runtime.evaluate',{expression:'document.exitFullscreen()',awaitPromise:true});
    check('leaving native fullscreen restores normal focus and layout',await until(`!document.querySelector('.lab-expanded')&&document.activeElement?.dataset.exampleAction==='expand'`));
    await call('Network.setBlockedURLs',{urls:['*models/slop-hill.glb']});await nav(base+'/sessions/w01-one-order/');
    check('missing models retain the procedural weekly example',await until(`document.querySelector('[data-scene-host]').dataset.models==='fallback'`));
    await click('change');await until(`document.querySelector('[data-example-action="change"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('[data-example-action="change"]').disabled`);
    check('fallback still identifies the blocked shortcut',await until(`document.querySelector('[data-scene-host]').dataset.selectedBuildings==='block-2'`));
    await call('Network.setBlockedURLs',{urls:[]});
    check('no unhandled exceptions',!events.some(e=>e.method==='Runtime.exceptionThrown'));
    writeFileSync(out+'/checks.json',JSON.stringify({checks,events},null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.ok).length,total:checks.length}));
    if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{chrome.kill('SIGTERM');}
