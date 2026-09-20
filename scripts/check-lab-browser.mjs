// Run after pnpm build with the local preview on port 4173. Uses an isolated browser profile.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
let probeRequests = 0;
const probe = createServer((_req, res) => { probeRequests++; res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/javascript'); res.end('self.__networkAllowed = true;'); });
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const probeUrl = 'http://127.0.0.1:' + probe.address().port + '/probe';
const response = await fetch('http://127.0.0.1:4173/comp4020-ass2-1181278174/');
if (!response.ok)
    throw new Error('Preview unavailable: ' + response.status);
const out = process.env.LAB_QA_OUTPUT || '/tmp/comp4020-lab-acceptance';
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
    const checks = [];
    const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(JSON.stringify({ name, ok, detail })); };
    const click = sel => js(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)throw new Error('missing '+${JSON.stringify(sel)});el.click()})()`);
    const change = (sel, value) => js(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)throw new Error('missing '+${JSON.stringify(sel)});if(el.type==='checkbox')el.checked=${JSON.stringify(value)};else el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const state = () => js(`document.querySelector('[data-run-state]').textContent`);
    const waitRun = async () => { for (let i = 0; i < 100; i++) {
        await sleep(100);
        const text = await state();
        if (text.startsWith('Computed ') || text.includes('must return') || text.includes('Run stopped') || text.includes('cancelled') || text.includes('Unexpected') || text.includes('CSP_TEST') || text.includes('Review'))
            return text;
    } throw new Error('run wait ' + await state()); };
    const run = async () => { await click('[data-action="run"]'); return waitRun(); };
    const week = async (n) => { await click(`[data-action="week"][data-week="${n}"]`); return waitRun(); };
    const shot = async (name) => { const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(out + '/' + name + '.png', Buffer.from(image.data, 'base64')); };
    await call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await nav(base + '/lab/');
    await js('localStorage.clear()');
    await nav(base + '/lab/');
    await sleep(900);
    check('one workspace, actual 3D canvas', await js(`document.querySelectorAll('[data-lab-workspace]').length===1 && !!document.querySelector('[data-scene-host] canvas')`));
    await click('[data-action="baseline"]');
    await change('[data-slot="dominates"] [data-strategy="preset"]', 'time');
    check('edits visibly stale the old result', await js(`document.querySelector('[data-results]').classList.contains('lab-stale')`));
    await run();
    check('time-only strategy loses the feasible task', await js(`document.querySelector('[data-verdict]').classList.contains('no-solution')`));
    await change('[data-table-select]', 'labels');
    await change('[data-table-filter]', 'summit');
    await click('[data-table-host] [data-action="inspect"]');
    check('a discarded label links to its full path', await js(`!!document.querySelector('[data-map-selection]').getAttribute('points') && document.querySelector('[data-selection-facts]').textContent.includes('→')`));
    await change('[data-slot="dominates"] [data-strategy="preset"]', 'pareto');
    await run();
    await change('[data-slot="withinBudget"] [data-strategy="preset"]', 'ignore');
    await run();
    check('wrong budget accepted by slot is rejected independently', await js(`document.querySelector('[data-verdict]').classList.contains('diagnostic')`));
    await change('[data-slot="withinBudget"] [data-strategy="preset"]', 'reserve');
    await run();
    await change('[data-time-slider]', 1900);
    check('time scrubber drives the actual drone and energy readout', await js(`document.querySelector('[data-time-output]').textContent==='1900 s' && document.querySelector('[data-map-drones]').childElementCount===1 && document.querySelector('[data-live-position]').textContent.includes('J remaining')`));
    await change('[data-note="prediction"]', 'A faster route may spend the reserve');
    await click('[data-action="archive"]');
    await js(`(()=>{window.exportBlob=null;const original=URL.createObjectURL;URL.createObjectURL=b=>{window.exportBlob=b;return original(b)};HTMLAnchorElement.prototype.click=function(){}})()`);
    await click('[data-action="export"]');
    const exported = await js('window.exportBlob.text().then(JSON.parse)');
    check('export carries source, actions, independent checks, notes and baseline', !!exported.run.strategyHashes && !!exported.run.plan?.tasks[0].movements.length && exported.run.check.ok && exported.notes['4:prediction'].includes('reserve') && !!exported.baseline);
    exported.run.metrics[0].value = 999999;
    await js(`(()=>{const file=new File([${JSON.stringify(JSON.stringify(exported))}],'record.json',{type:'application/json'});const dt=new DataTransfer();dt.items.add(file);const el=document.querySelector('[data-import]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await sleep(200);
    check('import waits for review and does not trust metrics', await js(`document.querySelector('[data-run-state]').textContent.includes('has not executed') && !document.querySelector('.lab-metrics').textContent.includes('999999')`));
    await run();
    check('imported input recomputes the same canonical trip', await js(`document.querySelector('.lab-metrics').textContent.includes('80443')`));
    await change('[data-slot="dominates"] [data-strategy="mode"]', 'custom');
    for (const [name, code, needle] of [['syntax', 'return ! ;', 'Unexpected'], ['wrong type', 'return NaN;', 'must return'], ['infinite loop', 'while(true) {}', 'Run stopped'], ['valid code', 'return a.time <= b.time && a.energy <= b.energy && (a.time < b.time || a.energy < b.energy);', 'Computed verified']]) {
        await change('[data-slot="dominates"] [data-strategy="code"]', code);
        const result = await run();
        check('custom code ' + name, result.includes(needle), result);
    }
    await change('[data-slot="dominates"] [data-strategy="code"]', "try { importScripts('" + probeUrl + "'); throw new Error('NETWORK ALLOWED'); } catch (e) { throw new Error('CSP_TEST: '+e.message); }");
    const network = await run();
    check('external script execution is blocked by the isolated policy', network.includes('CSP_TEST') && !network.includes('NETWORK ALLOWED'), network);
    await js(`fetch(${JSON.stringify(probeUrl)}).then(r=>r.text())`);
    const controlRequests = probeRequests;
    await change('[data-slot="dominates"] [data-strategy="code"]', `if(!self.__probed){self.__probed=true;fetch(${JSON.stringify(probeUrl)}).catch(()=>{});const end=performance.now()+200;while(performance.now()<end){}} return a.time <= b.time && a.energy <= b.energy && (a.time < b.time || a.energy < b.energy);`);
    await run();
    await sleep(100);
    check('custom fetch is blocked before reaching a reachable server', controlRequests > 0 && probeRequests === controlRequests, { controlRequests, afterWorker: probeRequests });
    await change('[data-slot="dominates"] [data-strategy="mode"]', 'preset');
    await run();
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        if (n !== 4)
            await week(n);
        else {
            await week(n);
            await run();
        }
        check('W' + n + ' has one computed workspace', await js(`document.querySelectorAll('[data-lab-workspace]').length===1 && document.querySelectorAll('[data-workspace-content] .lab-heading').length===1 && document.querySelector('[data-lab-heading]').textContent.length>10`));
    }
    await week(6);
    check('symbolic 720 comparison is live', await js(`document.querySelector('.lab-built-comparisons').textContent.includes('46, 51, 0') && document.querySelector('.lab-metrics').textContent.includes('48')`));
    const before = await js(`document.querySelector('.lab-sequence').textContent`);
    await click('[data-action="sequence-down"]');
    await run();
    check('six-order board reorders and recomputes', await js(`document.querySelector('.lab-sequence').textContent`) !== before);
    await week(7);
    await change('[data-migrate="#20"]', 'A');
    await run();
    check('#20 on light drone stays an explained failure', await js(`document.querySelector('[data-verdict]').textContent.includes('unfinished') && document.querySelector('[data-table-host]').textContent.includes('payload')`));
    await change('[data-migrate="#20"]', 'D');
    await run();
    check('moving #20 to H restores a complete plan', await js(`document.querySelector('[data-verdict]').textContent.includes('Every order')`));
    await week(8);
    await change('[data-field="caseId"]', 'one-pad');
    await waitRun();
    check('W8 hand case has two drone lanes and one pad', await js(`document.querySelectorAll('.lab-fleet-board section').length===2 && document.querySelector('.lab-timeline').textContent.includes('pads')`));
    await week(9);
    await change('[data-field="arrangement"]', 'wait');
    await run();
    check('actual corridor wait is five seconds', await js(`document.querySelector('[data-verdict]').textContent.includes('5 s') && document.querySelector('[data-verdict]').classList.contains('verified')`));
    await change('[data-field="caseId"]', 'waiting');
    await waitRun();
    await change('[data-field="diagnostic"]', true);
    await run();
    check('visited node removes the later wait state', await js(`document.querySelector('[data-verdict]').classList.contains('no-solution') && document.querySelector('[data-verdict]').textContent.includes('P@4')`));
    await week(10);
    await change('[data-slot="priority"] [data-strategy="preset"]', 'reverse');
    await run();
    check('priority slot computes both complete tasks', await js(`document.querySelector('[data-verdict]').textContent.includes('2/2') && document.querySelector('[data-run-state]').textContent.includes('0 independent')`));
    await week(11);
    await change('[data-field="method"]', 'feedback');
    await run();
    check('bounded feedback improves with honest budget status', await js(`document.querySelector('[data-verdict]').classList.contains('budget') && document.querySelector('[data-verdict]').textContent.includes('17/20')`));
    await change('[data-field="maxCandidates"]', 3000);
    await click('[data-action="run"]');
    await sleep(60);
    await click('[data-action="cancel"]');
    await sleep(300);
    check('cancellation keeps stale previous evidence and clears worker frame', await js(`document.querySelector('[data-run-state]').textContent.includes('cancelled') && document.querySelector('[data-results]').classList.contains('lab-stale') && document.querySelectorAll('iframe[title="Isolated experiment runner"]').length===0`));
    await week(12);
    await change('[data-field="method"]', 'greedy');
    await run();
    await click('[data-row-id="#07"]');
    check('late order inspector explains a real predecessor', await js(`document.querySelector('[data-selection-detail]').textContent.includes('Previous task') && document.querySelector('[data-selection-detail]').textContent.includes('Lateness =')`));
    await week(6);
    await change('[data-field="method"]', 'exact');
    await run();
    check('exact selector runs the enumerator', await js(`document.querySelector('[data-verdict]').textContent.includes('46, 51, 0')`));
    await week(12);
    await change('[data-field="method"]', 'greedy');
    await run();
    await change('[data-scenario-pads]', '1');
    await click('[data-action="add-order"]');
    await run();
    check('scenario form adds a real twenty-first order and changes pad capacity', await js(`document.querySelector('[data-verdict]').textContent.includes('/21') && document.querySelector('[data-table-host]').textContent.includes('#21') && JSON.parse(document.querySelector('[data-json="scenario"]').value).pads===1`));
    await click('[data-action="reset-scenario"]');
    await run();
    check('restore canonical removes the added order', await js(`JSON.parse(document.querySelector('[data-json="scenario"]').value).addedOrders.length===0 && document.querySelector('[data-verdict]').textContent.includes('/20')`));
    await week(4);
    await run();
    await sleep(300);
    await click('[data-action="map-2d"]');
    await click('[data-action="map-3d"]');
    check('3D can reopen with camera controls after switching to 2D', await js(`!document.querySelector('[data-scene-host]').hidden && !document.querySelector('[data-camera-tools]').hidden && document.querySelectorAll('[data-scene-host] canvas').length===1`));
    await click('[data-action="trace-next"]');
    check('first trace click selects the first offered label', await js(`document.querySelector('[data-trace-count]').textContent.startsWith('1 /') && document.querySelector('[data-map-selection]').getAttribute('points').length>0`));
    for (const width of [1920, 390]) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: width === 1920 ? 1080 : 844, deviceScaleFactor: 1, mobile: false });
        for (const n of [4, 6, 9, 12]) {
            await week(n);
            await sleep(250);
            if (n === 9) {
                await change('[data-field="caseId"]', 'corridor');
                await waitRun();
            }
            await js(`document.querySelector('.lab-stage').scrollIntoView({block:'center',behavior:'instant'})`);
            await shot('w' + n + '-' + width);
            check('W' + n + ' fits ' + width, await js('document.documentElement.scrollWidth<=innerWidth'));
        }
    }
    await nav(base + '/sessions/w04-back-with-battery/');
    await run();
    await change('[data-note="prediction"]', 'Tutorial to Lab persistence');
    await click('[data-action="archive"]');
    await nav(base + '/lab/#lab-w4');
    check('tutorial notes survive opening semester Lab', await js(`document.querySelector('[data-note="prediction"]').value==='Tutorial to Lab persistence'`));
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await nav(base + '/sessions/w09-same-place/');
    check('reduced motion loads a static map without autoplay', await js(`!document.querySelector('[data-scene-host] canvas') && document.querySelector('[data-action="play"]').textContent==='Play replay'`));
    await js(`(()=>{document.querySelector('[data-node]').focus()})()`);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    check('keyboard selects a map entity', await js(`document.querySelector('[data-selection-title]').textContent!=='Select something to explain it'`));
    check('no unhandled application exceptions', events.filter(e => e.method === 'Runtime.exceptionThrown').length === 0, events.filter(e => e.method === 'Runtime.exceptionThrown'));
    writeFileSync(out + '/checks.json', JSON.stringify(checks, null, 2));
    writeFileSync(out + '/errors.json', JSON.stringify(events, null, 2));
    if (checks.some(check => !check.ok))
        process.exitCode = 1;
    console.log(JSON.stringify({ passed: checks.filter(c => c.ok).length, total: checks.length, out }));
}
finally {
    chrome.kill('SIGTERM');
    probe.close();
}
