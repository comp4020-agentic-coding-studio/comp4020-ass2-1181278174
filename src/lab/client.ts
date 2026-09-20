import { metricComparison } from './comparison';
import { canonical, defaultConfig, fingerprint, lessons, type LabConfig, type LabRun, type Selection, type SlotKey } from './model.ts';
import { parseConfig } from './input.ts';
import { importRecord, verifyPlanForInput } from './import.ts';
import { startRun } from './runner.ts';
import { basePath, esc, mapPoint, tableHtml, workspaceHtml } from './render.ts';
import { sourceFor } from './strategies.ts';
import { presentation } from './presentation';
import { placeName, placeText } from './places';
import { demonstrationInput } from './teaching';
import { corridorAt, replayBounds, replayIssues, resourceReadout, skipIdle, waitReason, waits, type ReplayIssue } from './replay-inspection';
import { fleetAt, routePoints } from './replay.ts';
type Archive = {
    name: string;
    input: LabConfig;
    inputHash: string;
    modelHash: string;
    metrics: LabRun['metrics'];
    notes: Record<string, string>;
    facts?: {
        id: string;
        drone: string;
        deliver?: number;
        land?: number;
    }[];
};
type StorageData = {
    version: 2;
    weeks: Record<string, LabConfig>;
    notes: Record<string, string>;
    archive: Archive[];
    baseline?: Archive;
    lastWeek?: number;
};
const STORAGE = 'slop3969.lab.v2';
let disposeCurrent: (() => void) | undefined;
let mountedRoot: HTMLElement | undefined;
export function mountWorkspace(root: HTMLElement) {
    const controller = new AbortController(), signal = controller.signal, semester = root.dataset.semester === 'true', compact = root.dataset.compact === 'true', guided = root.dataset.guided === 'true';
    let run = JSON.parse(root.querySelector<HTMLScriptElement>('[data-initial-run]')!.textContent!) as LabRun;
    let config = structuredClone(run.input), draft = false, request = 0, active: ReturnType<typeof startRun> | undefined, scene: ReturnType<typeof import('./scene.ts')['mountScene']> | undefined, sceneLoading = false, sceneGeneration = 0;
    let storage: StorageData = { version: 2, weeks: {}, notes: {}, archive: [] }, tableId = '', page = 0, filter = '', selected: Selection | undefined, traceIndex = -1, time = 0, prefer2D = false, playing = false, raf = 0, lastFrame = 0;
    let network=!!run.scene?.focusNodes, allRoutes=false, focusedOrder=run.scene?.routes.find(r=>r.order)?.order;
    let issues=replayIssues(run), sceneSelection:{path:string[];blocked:string[]}|undefined;
    const content = root.querySelector<HTMLElement>('[data-workspace-content]')!;
    const expanded=presentation(root);let panel='experiment';
    function showPanel(name:string){panel=name;root.dataset.panel=name;content.querySelectorAll<HTMLElement>('[data-lab-panel]').forEach(el=>el.hidden=el.dataset.labPanel!==name);content.querySelectorAll<HTMLElement>('[data-action="panel"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panel===name)));}
    const q = <T extends HTMLElement = HTMLElement>(selector: string) => content.querySelector<T>(selector)!;
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
        if (stored?.version === 2)
            storage = stored;
    }
    catch { /* An unavailable store does not prevent experiments. */ }
    const persist = () => { try {
        localStorage.setItem(STORAGE, JSON.stringify(storage));
        q('[data-save-state]').textContent = 'Saved in this browser';
    }
    catch {
        q('[data-save-state]').textContent = 'Browser storage unavailable · export to keep your record';
    } };
    const message = (text: string, error = false) => { q('[data-run-state]').textContent = text; q('[data-run-state]').classList.toggle('lab-error', error); };
    const saveNotes = () => { for (const el of content.querySelectorAll<HTMLTextAreaElement>('[data-note]'))
        storage.notes[`${config.week}:${el.dataset.note}`] = el.value; };
    const stopPlayback = () => { playing = false; cancelAnimationFrame(raf); const b = q('[data-action="play"]'); if (b)
        b.textContent = 'Play replay'; };
    const disposeScene = () => { sceneGeneration++; sceneLoading = false; scene?.dispose(); scene = undefined; };
    function draw() { const opened = new Set([...content.querySelectorAll('details[open]')].map(d => d.querySelector('summary')?.textContent)); stopPlayback(); disposeScene(); content.innerHTML = workspaceHtml({ ...run, input: config }, semester, compact, guided); content.querySelectorAll('details').forEach(d => { if (opened.has(d.querySelector('summary')?.textContent))
        d.open = true; }); tableId = (run.tables.find(t => t.primary) ?? run.tables[0]).id; page = 0; filter = ''; selected = undefined; sceneSelection=undefined; traceIndex = -1; time = 0; for (const el of content.querySelectorAll<HTMLTextAreaElement>('[data-note]'))
        el.value = storage.notes[`${config.week}:${el.dataset.note}`] ?? ''; issues=replayIssues(run); network=!!run.scene?.focusNodes; allRoutes=false; focusedOrder=run.scene?.routes.find(r=>r.order)?.order; showPanel(panel);expanded.refresh();recordUi(); updateLayers(); updateTime(0); if (wants3D())
        void enable3D(); }
    function wants3D() { return !prefer2D && !!run.scene && [1, 4, 9, 10, 12].includes(config.week) && matchMedia('(min-width: 900px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches; }
    async function enable3D() {
        prefer2D = false;
        if (!run.scene || sceneLoading)
            return;
        if (scene) {
            q('[data-scene-host]').hidden = false;
            q('[data-map-host]').hidden = true;
            q('[data-camera-tools]').hidden = false;
            q('[data-action="map-3d"]').setAttribute('aria-pressed', 'true');
            q('[data-action="map-2d"]').setAttribute('aria-pressed', 'false');
            return;
        }
        const host = q('[data-scene-host]'), generation = ++sceneGeneration;
        sceneLoading = true;
        q('[data-action="map-3d"]').textContent = 'Loading 3D…';
        host.hidden = false;
        try {
            const mod = await import('./scene.ts');
            if (signal.aborted || generation !== sceneGeneration || !host.isConnected)
                return;
            scene = mod.mountScene(host, run.scene, node => select({ kind: 'node', id: node }));
            q('[data-map-host]').hidden = true;
            q('[data-camera-tools]').hidden = false;
            q('[data-action="map-3d"]').textContent = '3D scene';
            q('[data-action="map-3d"]').setAttribute('aria-pressed', 'true');
            q('[data-action="map-2d"]').setAttribute('aria-pressed', 'false');
            updateLayers(); scene.time(time);
            if(sceneSelection)scene.select(sceneSelection.path,sceneSelection.blocked);
            const follow=q<HTMLButtonElement>('[data-action="follow"]');
            if(follow)follow.disabled=matchMedia('(prefers-reduced-motion: reduce)').matches || !run.scene.events.length;
        }
        catch (e) {
            host.hidden = true;
            q('[data-map-host]').hidden = false;
            q('[data-action="map-3d"]').textContent = 'Retry 3D';
            message('3D is unavailable on this device. The 2D map, tables and replay remain available.');
        }
        finally {
            if (generation === sceneGeneration)
                sceneLoading = false;
        }
    }
    function readInputs() {
        const copy = structuredClone(config);
        for (const el of content.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]:enabled')) {
            const key = el.dataset.field!;
            let value: unknown = el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.type === 'number' ? (el.value === '' ? undefined : Number(el.value)) : el.value;
            (copy as unknown as Record<string, unknown>)[key] = value;
        }
        for (const el of content.querySelectorAll<HTMLTextAreaElement>('[data-json]')) {
            try {
                (copy as unknown as Record<string, unknown>)[el.dataset.json!] = JSON.parse(el.value);
            }
            catch {
                throw new Error(`Invalid JSON in ${el.closest('label')?.childNodes[0].textContent?.trim()}.`);
            }
        }
        for (const field of content.querySelectorAll<HTMLElement>('[data-slot]')) {
            const key = field.dataset.slot as SlotKey;
            for (const el of field.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-strategy]')) {
                const prop = el.dataset.strategy!;
                (copy.strategies[key] as unknown as Record<string, unknown>)[prop] = el.type === 'number' ? Number(el.value) : el.value;
            }
        }
        config = parseConfig(copy);
        return config;
    }
    function dirty() { draft = true; active?.cancel(); active = undefined; request++; q('[data-action="run"]').removeAttribute('disabled'); q('[data-action="cancel"]').hidden = true; q('[data-results]').classList.add('lab-stale'); message('Inputs changed · the displayed result belongs to the previous run. Run experiment to recompute.'); }
    async function execute() {
        let input: LabConfig;
        try {
            input = readInputs();
        }
        catch (e) {
            message((e as Error).message, true);
            return;
        }
        saveNotes();
        active?.cancel();
        stopPlayback();
        const id = ++request;
        draft = true;
        q('[data-results]').classList.add('lab-stale');
        q('[data-action="run"]').setAttribute('disabled', '');
        q('[data-action="cancel"]').hidden = false;
        message('Running this input…');
        active = startRun(input, n => { if (id === request)
            message(`Re-evaluating the whole plan · ${n} feedback candidates checked…`); });
        try {
            const next = await active.promise;
            if (id !== request || signal.aborted)
                return;
            if (next.inputHash !== fingerprint(input))
                throw new Error('The returned run does not match the current input.');
            if (next.plan) {
                const checked = verifyPlanForInput(input, next.plan);
                if (!checked.ok && next.check?.ok)
                    throw new Error('Independent validation rejected the returned action record: ' + checked.issues[0].detail);
                next.check = checked;
                next.objective = checked.objective;
            }
            run = next;
            panel='experiment';
            draft = false;
            storage.weeks[config.week] = structuredClone(config);
            storage.lastWeek = config.week;
            draw();
            persist();
            message(`Computed ${run.status} result · ${run.elapsed} ms. ${run.check ? `${run.check.issues.length} independent-check issues.` : ''}`);
        }
        catch (e) {
            if (id === request && !signal.aborted)
                message((e as Error).message, true);
        }
        finally {
            if (id === request && !signal.aborted) {
                active = undefined;
                q('[data-action="run"]').removeAttribute('disabled');
                q('[data-action="cancel"]').hidden = true;
            }
        }
    }
    async function switchWeek(week: number) {
        if (week < 1 || week > 12 || !Number.isInteger(week))
            return;
        try {
            readInputs();
            storage.weeks[config.week] = structuredClone(config);
        }
        catch { /* Invalid drafts remain visible until an explicit change of week. */ }
        saveNotes();
        active?.cancel();
        const generation = ++request;
        config = storage.weeks[week] ? parseConfig(storage.weeks[week]) : defaultConfig(week);
        if (!storage.weeks[week]) {
            const previous = run.input;
            // Keep the named weekly fleet unless the learner deliberately edits it.
            if (fingerprint(previous.scenario) !== fingerprint(defaultConfig(previous.week).scenario))
                config.scenario = structuredClone(previous.scenario);
            for (const key of Object.keys(config.strategies) as SlotKey[])
                if (previous.strategies[key].mode !== 'preset')
                    config.strategies[key] = structuredClone(previous.strategies[key]);
        }
        // Only one workspace and scene exist. A week change replaces their data.
        const { runExperiment } = await import('./compute.ts');
        if (signal.aborted || generation !== request)
            return;
        const safe = defaultConfig(week);
        run = runExperiment(safe);
        draw();
        draft = true;
        q('[data-results]').classList.add('lab-stale');
        if (semester)
            history.replaceState(history.state, '', `#lab-w${week}`);
        q('[data-lab-heading]').focus({ preventScroll: true });
        if (Object.values(config.strategies).some(s => s.mode === 'custom'))
            message('This week has saved JavaScript. Review it below, then Run experiment to execute it.');
        else
            await execute();
    }
    function recordUi() {
        const host = q('[data-archive]');
        if (!host)
            return;
        const baseline = storage.baseline, compare = q('[data-comparison]');
        compare.innerHTML = baseline ? metricComparison(baseline,run,'Saved baseline') : '<p>No baseline yet. Keep this result before changing the strategy.</p>';
        if (baseline?.facts && run.plan) {
            const changes = run.plan.tasks.filter(t => { const b = baseline.facts!.find(x => x.id === t.order); return b && (b.drone !== t.drone || b.deliver !== t.deliver || b.land !== t.land); });
            if (changes.length)
                compare.innerHTML += '<p><strong>Changed tasks · inspect the cause</strong></p><ul>' + changes.slice(0, 8).map(t => { const b = baseline.facts!.find(x => x.id === t.order)!; return `<li><button type="button" data-action="inspect" data-row-id="${esc(t.order)}">${esc(t.order)}: drone ${esc(b.drone)} → ${esc(t.drone)}, delivery ${b.deliver ?? '—'} → ${t.deliver ?? '—'}</button></li>`; }).join('') + '</ul>';
        }
        const live=q('[data-live-comparison]');if(live)live.innerHTML=baseline?.input.week===run.input.week&&baseline.inputHash!==run.inputHash?metricComparison(baseline,run,'Starting case'):'';
        host.innerHTML = `<h3>Saved runs (${storage.archive.length}/8)</h3>${storage.archive.length ? `<ul>${storage.archive.map((x, i) => `<li><button type="button" data-action="restore" data-index="${i}">${esc(x.name)}</button> <small>${esc(x.inputHash)}</small></li>`).join('')}</ul>` : '<p>Your saved experiments will appear here.</p>'}`;
    }
    function snapshot(): Archive { return { name: `W${run.input.week} · ${run.input.caseId} · ${new Date().toLocaleTimeString()}`, input: run.input, inputHash: run.inputHash, modelHash: run.modelHash, metrics: run.metrics, notes: { ...storage.notes }, facts: run.plan?.tasks.map(t => ({ id: t.order, drone: t.drone, deliver: t.deliver, land: t.land })) }; }
    function download(name: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function evidenceTable() { const t = run.tables.find(t => t.id === tableId) ?? run.tables[0]; q('[data-table-host]').innerHTML = tableHtml(t, filter, page); const n = t.rows.filter(x => (x.values.join(' ')+' '+placeText(x.values.join(' '))).toLowerCase().includes(filter.toLowerCase())).length; q('[data-table-count]').textContent = `${n} rows · ${n ? Math.min(page * 80 + 1, n) : 0}–${Math.min((page + 1) * 80, n)}`; (q('[data-action="rows-prev"]') as HTMLButtonElement).disabled = page === 0; (q('[data-action="rows-next"]') as HTMLButtonElement).disabled = (page + 1) * 80 >= n; }
    function updateLayers() {
        content.querySelector<SVGElement>('[data-flight-network]')?.style.setProperty('display',network?'':'none');
        content.querySelectorAll<SVGElement>('[data-route],[data-route-key]').forEach(el=>el.style.display=allRoutes||!el.dataset.order||el.dataset.order===focusedOrder?'':'none');
        q('[data-action="layer-network"]')?.setAttribute('aria-pressed',String(network));
        q('[data-action="layer-routes"]')?.setAttribute('aria-pressed',String(allRoutes));
        const label=q('[data-route-focus]'); if(label) label.textContent=allRoutes?'All computed routes':focusedOrder?`Route: ${focusedOrder}`:'Routes for this example';
        scene?.layers(network,allRoutes,focusedOrder);
    }
    function select(selection: Selection) {
        selected = selection;
        const row = run.tables.flatMap(t => t.rows).find(x => x.id === selection.id), trace = run.trace.find(t => t.id === selection.id), event = run.scene?.events.find(e => e.id === selection.id), interval = run.timeline.find(t => t.id === selection.id);
        let title = row?.values[0] ?? trace?.title ?? selection.id, detail = row?.detail ?? trace?.detail ?? row?.values.join(' · ') ?? interval?.label ?? '', path = row?.path ?? trace?.path ?? (trace?.node ? [trace.node] : undefined);
        if (trace) {
            traceIndex = run.trace.indexOf(trace);
            const slider = q<HTMLInputElement>('[data-trace-slider]');
            if (slider) {
                slider.value = String(traceIndex);
                q('[data-trace-count]').textContent = `${traceIndex + 1} / ${run.trace.length}`;
            }
        }
        if (selection.kind === 'node' && run.scene) {
            const n = run.scene.map.nodes.find(n => n.id === selection.id)!;
            const o = run.scene.orders.find(o => o.node === n.id);
            title = o ? `${o.id} → ${placeName(n.id)}` : placeName(n.id);
            detail = `${placeName(n.id)}: ${n.x} m east, ${n.y} m north, ${Math.round(n.z * 10) / 10} m elevation. ${o ? `Payload ${o.weight} kg; ready ${o.ready}; promised ${o.promised}.` : ''} ${n.wait ? 'Waiting is allowed here.' : ''}`;
            path = [n.id];
        }
        const order = run.scene?.orders.find(o=>o.id===selection.id || o.node===selection.id)?.id ?? event?.order;
        if (order) { focusedOrder=order; updateLayers(); if(q('[data-action="follow"]')?.getAttribute('aria-pressed')==='true') scene?.follow(run.scene?.events.find(e=>e.order===order)?.drone); }
        if (selection.kind === 'task' && run.scene)
            path = run.plan?.tasks.find(t=>t.order===selection.id)?.pathOut ?? run.scene.routes.find(r => r.order === selection.id)?.path;
        if (event) {
            title = `${event.drone} · ${event.order} · ${event.phase}`;
            detail = `${event.kind}: ${event.from} → ${event.to}, [${event.start}, ${event.end}) s; energy ${event.energy} J${event.resource ? `; occupies ${event.resource}` : ''}.`;
            path = [event.from, event.to];
            updateTime(event.start);
        }
        else if (interval)
            updateTime(interval.start);
        else if (trace?.tick !== undefined)
            updateTime(trace.tick);
        q('[data-selection-title]').textContent = placeText(title);
        q('[data-selection-detail]').textContent = placeText(detail);
        q('[data-selection-facts]').innerHTML = path ? `<p><strong>Path</strong> ${esc(path.map(placeName).join(' → '))}</p>` : '';
        const technical=q('[data-node-details]');if(technical)technical.textContent=path?.map(placeName).join(' → ')??'No graph path for this selection.';
        content.querySelectorAll('[data-row]').forEach(el => el.classList.toggle('lab-selected', (el as HTMLElement).dataset.row === selection.id));
        if (run.scene && path) {
            const pts = routePoints(run.scene, path).map(n => mapPoint(run.scene!, n.x, n.y).join(',')).join(' ');
            content.querySelector('[data-map-selection]')?.setAttribute('points', pts);
            const target=path.at(-1)==='kitchen'?run.scene.orders.find(o=>path.includes(o.node))?.node:path.at(-1);
            content.querySelectorAll<HTMLElement>('[data-customer-homes] [data-node],[data-map-markers] [data-node]').forEach(el=>el.classList.toggle('is-destination',el.dataset.node===target));
            const blocked = run.input.week === 1 && selection.kind === 'route' ? String(row?.values[2] ?? '').split(',').map(s => s.trim()) : [];
            content.querySelectorAll<SVGElement>('[data-building]').forEach(el => el.setAttribute('fill', blocked.includes(el.dataset.building!) ? '#df7161' : '#adb3a2'));
            sceneSelection={path,blocked};
            scene?.select(path, blocked);
        }
    }
    function stepTrace(index: number) { traceIndex = Math.max(0, Math.min(run.trace.length - 1, index)); const t = run.trace[traceIndex]; if (!t)
        return; q<HTMLInputElement>('[data-trace-slider]').value = String(traceIndex); q('[data-trace-count]').textContent = `${traceIndex + 1} / ${run.trace.length}`; select({ kind: 'search', id: t.id }); }
    function updateTime(t: number) {
        time = t;
        const slider = q<HTMLInputElement>('[data-time-slider]');
        if (slider) {
            slider.value = String(t);
            q('[data-time-output]').textContent = `${Math.floor(t)} s`;
        }
        const timeline=q<HTMLElement>('.lab-timeline'), clock=q('[data-timeline-time]');
        if(timeline) {
            const {min,max}=replayBounds(run);
            timeline.style.setProperty('--replay-progress',`${Math.max(0,Math.min(100,(t-min)/(max-min)*100))}%`);
            if(clock) clock.textContent=`${Math.floor(t)} ${['six-jobs','waiting'].includes(run.input.caseId)?'units':'s'}`;
            timeline.querySelectorAll<HTMLButtonElement>('[data-event]').forEach(bar=>{
                const active=Number(bar.dataset.start)<=t&&t<Number(bar.dataset.end);
                if(active) bar.setAttribute('aria-current','time'); else bar.removeAttribute('aria-current');
            });
        }
        if (!run.scene) return;
        scene?.time(t);
        const states = fleetAt(run.scene, t), layer = content.querySelector('[data-map-drones]');
        if (layer)
            layer.innerHTML = states.map(s => { const [x, y] = mapPoint(run.scene!, s.position.x, s.position.y); return `<g transform="translate(${x},${y})"><circle r="9" fill="#273d37" stroke="white" stroke-width="2"/><text x="-4" y="4" fill="white" font-size="11">${esc(s.drone)}</text></g>`; }).join('');
        const matching = selected?.kind === 'task' ? states.filter(s => s.event.order === selected!.id) : states;
        const current = matching.length ? matching : states;
        const resources=q('[data-resource-state]'); if(resources) resources.textContent=resourceReadout(run.scene,t);
        const corridor=corridorAt(run.scene,t);
        const indicator=content.querySelector<SVGElement>('[data-corridor]');
        indicator?.setAttribute('stroke',corridor.color); if(indicator) indicator.dataset.state=corridor.state;
        if (!states.length) return;
        const out = q('[data-live-position]');
        if (out)
            out.textContent = current.slice(0, 5).map(s => { const type = canonical.fleet.types.find(t => t.id === (run.scene!.droneTypes?.[s.drone] ?? config.scenario.drones.find(d => d.id === s.drone)?.type ?? 'L'))!; return `${s.drone} · ${s.event.order}: ${s.phase}, ${Math.round(s.position.z)} m elevation, ${Math.round(type.batteryJ - s.energyUsed)} J remaining${s.parcel ? ', carrying parcel' : ', no parcel'}${s.pad !== undefined && s.pad >= 0 ? ', pad '+(s.pad+1) : ''}`; }).join(' | ');
        const status=q('[data-replay-state]'); if(status) status.textContent=(!matching.length&&selected?.kind==='task'?`${selected.id} has no current event at ${Math.floor(t)} s. Fleet: `:'')+current.map(s=>`${s.drone} · ${s.event.order}: ${s.phase}${s.parcel ? ' · parcel aboard' : ''}`).join(' | ');
    }
    function showIssue(issue: ReplayIssue) {
        stopPlayback();
        if(issue.order) select({kind:'task',id:issue.order});
        else if(issue.event) select({kind:'move',id:issue.event});
        updateTime(issue.tick);
        q('[data-replay-note]').textContent=issue.detail;
        const taskDetail=run.tables.find(t=>t.id==='tasks')?.rows.find(r=>r.id===issue.order)?.detail;
        q('[data-selection-title]').textContent=issue.resource?`${issue.resource} issue`:issue.order??'Run issue';
        q('[data-selection-detail]').textContent=issue.detail+(taskDetail?' '+taskDetail:'');
        if(issue.resource==='corridor') { scene?.follow(); scene?.view('corridor'); q('[data-action="follow"]')?.setAttribute('aria-pressed','false'); }
    }
    function animate(now: number) {
        if(!playing) return;
        const max=Number(q<HTMLInputElement>('[data-time-slider]').max), speed=Number(q<HTMLSelectElement>('[data-speed]').value);
        let next=Math.min(max,time+(lastFrame?now-lastFrame:0)/1000*speed); lastFrame=now;
        if(run.scene&&q<HTMLInputElement>('[data-skip-idle]')?.checked) next=Math.min(max,skipIdle(run.scene,next));
        const issue=q<HTMLInputElement>('[data-pause-issue]')?.checked?issues.find(i=>i.tick>time&&i.tick<=next):undefined;
        if(issue) { showIssue(issue); return; }
        updateTime(next);
        if(time>=max) stopPlayback(); else raf=requestAnimationFrame(animate);
    }
    function editBoard(id: string, delta: number, migrate?: string) {
        saveNotes();
        readInputs();
        if (config.week <= 6) {
            config.sequence = config.sequence.length ? config.sequence : [...(run.tables.find(t => t.id === 'schedule')?.rows.map(x => x.id) ?? [])];
            const i = config.sequence.indexOf(id), j = i + delta;
            if (i >= 0 && j >= 0 && j < config.sequence.length)
                [config.sequence[i], config.sequence[j]] = [config.sequence[j], config.sequence[i]];
            config.method = 'manual';
        }
        else {
            const assignment = structuredClone(config.assignment ?? run.assignment!);
            const source = Object.keys(assignment).find(d => assignment[d].includes(id));
            if (!source)
                return;
            const i = assignment[source].indexOf(id);
            if (migrate && migrate !== source) {
                assignment[source].splice(i, 1);
                assignment[migrate].push(id);
            }
            else {
                const j = i + delta;
                if (j >= 0 && j < assignment[source].length)
                    [assignment[source][i], assignment[source][j]] = [assignment[source][j], assignment[source][i]];
            }
            config.assignment = assignment;
            config.method = 'manual';
        }
        // Render the editable board from the draft, while retaining old evidence.
        const previous = run;
        const display = structuredClone(run);
        if (config.week <= 6) {
            const t = display.tables.find(t => t.id === 'schedule')!;
            t.rows = config.sequence.map(id => t.rows.find(x => x.id === id)!);
        }
        else
            display.assignment = config.assignment;
        run = display;
        draw();
        run = previous;
        dirty();
    }
    content.addEventListener('click', async (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action],[data-node]');
        if (!target)
            return;
        if (target.dataset.node) {
            select({ kind: 'node', id: target.dataset.node });
            return;
        }
        const action = target.dataset.action;
        try {
            if(action==='panel')showPanel(target.dataset.panel!);
            else if(action==='expand')await expanded.toggle();
            else if (action === 'run')
                await execute();
            else if (action === 'cancel') {
                active?.cancel();
            }
            else if (action === 'week')
                await switchWeek(Number(target.dataset.week));
            else if (action === 'demo') {
                saveNotes();
                const week = config.week, mode = target.dataset.demo;
                const { runExperiment } = await import('./compute.ts');
                active?.cancel(); request++;
                config = demonstrationInput(week);
                run = runExperiment(config);
                draft = false;
                storage.baseline = snapshot();
                if (mode !== 'reset') {
                    config = demonstrationInput(week, true);
                    if (mode === 'reserved') config.method = 'reserved';
                    if (week === 7) {
                        config.assignment = structuredClone(run.assignment!);
                        for (const ids of Object.values(config.assignment)) {
                            const at = ids.indexOf('#20'); if (at >= 0) ids.splice(at, 1);
                        }
                        config.assignment.A.push('#20'); config.method = 'manual';
                    }
                }
                draw();
                await execute();
                if (week === 1) {
                    const row = run.tables.find(t => t.id === 'connections')?.rows.find(r => r.values[1] === 'Building intersection');
                    if (row?.selection) select(row.selection);
                }
                const result = q('[data-verdict]');
                result?.setAttribute('tabindex', '-1'); result?.focus({ preventScroll: true });
            }
            else if(action==='destination') {
                const order=run.scene?.orders.find(o=>o.id===target.dataset.order);
                if(order) {
                    const route=run.plan?.tasks.find(t=>t.order===order.id)?.pathOut ?? run.scene?.routes.find(r=>r.order===order.id)?.path;
                    select(route?{kind:'task',id:order.id}:{kind:'node',id:order.node});
                    q('[data-selection-title]').textContent=`${order.id} → ${placeName(order.node)}`;
                    q('[data-selection-detail]').textContent=`${order.label}. Deliver to the teal doorstep beside ${placeName(order.node)}. ${route?'The highlighted line is the outbound route. Playback includes the recorded return.':'This example marks the delivery address; no complete flight is recorded for this order.'}`;
                    content.querySelectorAll('[data-action="destination"]').forEach(el=>el.setAttribute('aria-pressed',String((el as HTMLElement).dataset.order===order.id)));
                    scene?.view('route');
                }
            }
            else if (action === 'inspect')
                select(run.tables.flatMap(t => t.rows).find(x => x.id === target.dataset.rowId)?.selection ?? { kind: 'route', id: target.dataset.rowId! });
            else if (action === 'timeline') {
                const item = run.timeline.find(t => t.id === target.dataset.event);
                if (item) {
                    select(item.selection ?? { kind: 'resource', id: item.id });
                    updateTime(item.start);
                }
            }
            else if (action === 'trace-next' || action === 'trace-prev')
                stepTrace(traceIndex + (action === 'trace-next' ? 1 : -1));
            else if (action === 'rows-next' || action === 'rows-prev') {
                page += action === 'rows-next' ? 1 : -1;
                evidenceTable();
            }
            else if (action === 'map-3d')
                await enable3D();
            else if (action === 'map-2d') {
                prefer2D = true;
                q('[data-map-host]').hidden = false;
                q('[data-scene-host]').hidden = true;
                q('[data-camera-tools]').hidden = true;
                target.setAttribute('aria-pressed', 'true');
                q('[data-action="map-3d"]')?.setAttribute('aria-pressed', 'false');
            }
            else if (action === 'layer-network' || action === 'layer-routes') {
                if (action === 'layer-network') network=!network; else allRoutes=!allRoutes;
                updateLayers();
            }
            else if (action === 'camera') {
                scene?.follow(); scene?.view(target.dataset.camera!); q('[data-action="follow"]')?.setAttribute('aria-pressed','false');
            }
            else if (action === 'follow') {
                const enabled=target.getAttribute('aria-pressed')!=='true';
                target.setAttribute('aria-pressed',String(enabled));
                const drone=run.scene?.events.find(e=>e.order===focusedOrder)?.drone??run.scene?.events[0]?.drone;
                scene?.follow(enabled?drone:undefined);
            }
            else if (action === 'first-issue' && issues.length) showIssue(issues[0]);
            else if (action === 'next-wait' && run.scene) {
                const list=waits(run.scene), wait=list.find(e=>e.start>time)??list[0];
                if(wait) { stopPlayback(); select({kind:'move',id:wait.id}); q('[data-replay-note]').textContent=waitReason(run.scene,wait); }
            }
            else if (action === 'play') {
                if (playing)
                    stopPlayback();
                else {
                    if (time >= Number(q<HTMLInputElement>('[data-time-slider]').max))
                        time = 0;
                    playing = true;
                    lastFrame = 0;
                    target.textContent = 'Pause replay';
                    raf = requestAnimationFrame(animate);
                }
            }
            else if (action === 'event-prev' || action === 'event-next') {
                stopPlayback();
                const ticks = [...new Set((run.scene?.events ?? []).flatMap(e => [e.start, e.end]))].sort((a, b) => a - b);
                const tick = action === 'event-next' ? ticks.find(t => t > time) : ticks.filter(t => t < time).at(-1);
                if (tick !== undefined) {
                    updateTime(tick);
                    const e = run.scene?.events.find(e => e.start === tick);
                    if (e)
                        select({ kind: 'move', id: e.id });
                }
            }
            else if (action === 'time-start' || action === 'time-end') {
                stopPlayback();
                updateTime(Number(action === 'time-start' ? q<HTMLInputElement>('[data-time-slider]').min : q<HTMLInputElement>('[data-time-slider]').max));
            }
            else if (action?.startsWith('sequence-') || action?.startsWith('order-'))
                editBoard(target.dataset.id!, action.endsWith('up') ? -1 : 1);
            else if (['baseline', 'archive', 'export'].includes(action!)) {
                if (draft)
                    throw new Error('Run the changed input before saving or exporting a result.');
                saveNotes();
                if (action === 'export')
                    download(`slop-lab-w${config.week}.json`, { format: 'slop3969-experiment', version: 2, run, notes: storage.notes, baseline: storage.baseline });
                else {
                    const record = snapshot();
                    if (action === 'baseline')
                        storage.baseline = record;
                    else
                        storage.archive = [record, ...storage.archive].slice(0, 8);
                    persist();
                    recordUi();
                    message(action === 'baseline' ? 'Baseline saved. Change one decision and run again.' : 'Experiment saved to your archive.');
                }
            }
            else if (['add-order', 'add-closure', 'reset-scenario'].includes(action!)) {
                readInputs();
                saveNotes();
                if (action === 'add-order') {
                    const id = Array.from({ length: 10 }, (_, i) => '#' + (21 + i)).find(id => !config.scenario.addedOrders.some(o => o.id === id))!;
                    const value = (key: string) => q<HTMLInputElement>('[data-new="' + key + '"]').value;
                    config.scenario.addedOrders.push({ id, node: value('node'), weight: Number(value('weight')), ready: Number(value('ready')), promised: Number(value('promised')), label: 'Added dinner ' + id });
                    if (config.assignment) {
                        const drone = config.scenario.drones.find(d => d.type === 'H') ?? config.scenario.drones[0];
                        config.assignment[drone.id] = [...(config.assignment[drone.id] ?? []), id];
                    }
                    else if (config.method === 'reference')
                        config.method = 'greedy';
                }
                else if (action === 'add-closure')
                    config.scenario.closures.push({ start: Number(q<HTMLInputElement>('[data-close="start"]').value), end: Number(q<HTMLInputElement>('[data-close="end"]').value) });
                else {
                    config.scenario = defaultConfig(config.week).scenario;
                    config.assignment = undefined;
                    config.method = 'greedy';
                    config.requestedDepartures = {};
                    config.routeCandidates = {};
                }
                config = parseConfig(config);
                draw();
                dirty();
            }
            else if (action === 'share') {
                readInputs();
                const url = new URL(basePath() + 'lab/', location.origin);
                url.hash = 'input=' + encodeURIComponent(JSON.stringify(config));
                await navigator.clipboard.writeText(url.href);
                message('Input link copied. Opening it requires Run before any custom code executes.');
            }
            else if (action === 'restore') {
                const record = storage.archive[Number(target.dataset.index)];
                config = parseConfig(record.input);
                storage.notes = { ...storage.notes, ...record.notes };
                draw();
                dirty();
                message('Saved input restored. Review the strategy and Run to recompute; stored results are not trusted.');
            }
        }
        catch (e) {
            message((e as Error).message, true);
        }
    }, { signal });
    content.addEventListener('keydown', event => { const el = (event.target as HTMLElement).closest<HTMLElement>('[data-node]'); if (el && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        select({ kind: 'node', id: el.dataset.node! });
    } }, { signal });
    content.addEventListener('input', event => {
        const el = event.target as HTMLInputElement;
        if(el.matches('[data-week-slider]')){const week=Number(el.value);q('[data-semester-label]').textContent=`W${week} · ${lessons[week].adds}`;el.setAttribute('aria-valuetext',`Week ${week}: ${lessons[week].title}`);}
        else if (el.matches('[data-time-slider]')) {
            stopPlayback();
            updateTime(Number(el.value));
        }
        else if (el.matches('[data-trace-slider]'))
            stepTrace(Number(el.value));
        else if (el.matches('[data-table-filter]')) {
            filter = el.value;
            page = 0;
            evidenceTable();
        }
        else if (el.matches('[data-note]')) {
            saveNotes();
            persist();
        }
        else if (el.matches('[data-field],[data-json],[data-strategy]'))
            dirty();
    }, { signal });
    content.addEventListener('change', async (event) => {
        const el = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        try {
            if (el.matches('[data-address]'))
                select({ kind: 'node', id: el.value });
            else if (el.matches('[data-week-slider],[data-week-picker]'))
                await switchWeek(Number(el.value));
            else if (el.matches('[data-table-select]')) {
                tableId = el.value;
                page = 0;
                filter = '';
                q<HTMLInputElement>('[data-table-filter]').value = '';
                evidenceTable();
            }
            else if (el.matches('[data-scenario-pads],[data-scenario-drone]')) {
                readInputs();
                if (el.matches('[data-scenario-pads]'))
                    config.scenario.pads = Number(el.value);
                else {
                    const id = el.dataset.scenarioDrone!;
                    config.scenario.drones = config.scenario.drones.filter(d => d.id !== id);
                    if (el.value !== 'off')
                        config.scenario.drones.push({ id, type: el.value as 'L' | 'H' });
                    config.scenario.drones.sort((a, b) => a.id.localeCompare(b.id));
                }
                q<HTMLTextAreaElement>('[data-json="scenario"]').value = JSON.stringify(config.scenario, null, 2);
                config.assignment = undefined;
                config.method = 'greedy';
                q<HTMLSelectElement>('[data-field="method"]').value = 'greedy';
                dirty();
            }
            else if (el.dataset.migrate)
                editBoard(el.dataset.migrate, 0, el.value);
            else if (el.matches('[data-import]')) {
                const file = (el as HTMLInputElement).files?.[0];
                if (!file)
                    return;
                if (file.size > 5000000)
                    throw new Error('Import is limited to 5 MB.');
                const value = JSON.parse(await file.text());
                const imported = importRecord(value);
                saveNotes();
                config = imported.input;
                storage.notes = { ...storage.notes, ...imported.notes };
                draw();
                dirty();
                message('Imported input ready for review. ' + (imported.check ? `Independent check of imported actions: ${imported.check.issues.length} issues, ${imported.check.unfinished.length} unfinished. ` : '') + 'Run recomputes every result; imported code has not executed.', !!imported.check && !imported.check.ok);
            }
            else if (el.dataset.field === 'caseId') {
                const caseId = el.value;
                config = { ...defaultConfig(config.week), caseId, scenario: config.scenario, strategies: config.strategies };
                draw();
                dirty();
                await execute();
            }
            else if (el.dataset.field === 'arrangement') {
                const fields = q<HTMLFieldSetElement>('[data-corridor-custom]');
                fields.hidden = fields.disabled = el.value !== 'custom';
                dirty();
            }
            else if (el.dataset.field === 'method') {
                config.method = el.value;
                if (el.value !== 'manual') {
                    config.assignment = undefined;
                    config.sequence = [];
                }
                dirty();
            }
            else if (el.dataset.strategy) {
                const field = el.closest<HTMLElement>('[data-slot]')!, key = field.dataset.slot as SlotKey;
                const s = config.strategies[key];
                if (el.dataset.strategy === 'mode') {
                    if (el.value === 'custom')
                        s.code = field.querySelector<HTMLTextAreaElement>('[data-strategy="code"]')!.value;
                    s.mode = el.value as typeof s.mode;
                }
                else if (el.dataset.strategy === 'preset')
                    s.preset = el.value;
                else if (el.dataset.strategy === 'factor' || el.dataset.strategy === 'secondary')
                    s[el.dataset.strategy] = Number(el.value);
                else
                    s.code = el.value;
                const area = field.querySelector<HTMLTextAreaElement>('[data-strategy="code"]')!;
                area.readOnly = s.mode !== 'custom';
                if (s.mode !== 'custom')
                    area.value = sourceFor(key, s);
                field.querySelector<HTMLElement>('[data-compose]')!.hidden = s.mode !== 'composed';
                dirty();
            }
        }
        catch (e) {
            message((e as Error).message, true);
        }
    }, { signal });
    // Restore input only. Automatically running saved custom code would be unsafe.
    const initialWeek = Number(location.hash.replace('#lab-w', ''));
    if (location.hash.startsWith('#input=')) {
        try {
            if (location.hash.length > 100000)
                throw new Error('Input link too large.');
            config = parseConfig(JSON.parse(decodeURIComponent(location.hash.slice(7))));
            draw();
            dirty();
            message('Shared input loaded. Review the functions and choose Run experiment.');
        }
        catch (e) {
            message('Cannot open input link: ' + (e as Error).message, true);
        }
    }
    else if (semester && new URLSearchParams(location.search).get('assignment') === '1') {
        config = defaultConfig(6);
        config.caseId = 'canonical-six';
        draw();
        void execute();
    }
    else if (semester && initialWeek >= 1 && initialWeek <= 12 && initialWeek !== config.week)
        void switchWeek(initialWeek);
    else if (storage.weeks[config.week] && !compact) {
        try {
            config = parseConfig(storage.weeks[config.week]);
            draw();
            if (fingerprint(config) !== run.inputHash) {
                dirty();
                message('Your last input is restored. Review it and Run experiment to refresh its result.');
            }
        }
        catch {
            draw();
        }
    }
    else
        draw();
    const hashChange = () => { const n = Number(location.hash.replace('#lab-w', '')); if (semester && n >= 1 && n <= 12 && n !== config.week)
        void switchWeek(n); };
    window.addEventListener('hashchange', hashChange, { signal });
    return () => { saveNotes(); try {
        readInputs();
        storage.weeks[config.week] = structuredClone(config);
    }
    catch { } try {
        localStorage.setItem(STORAGE, JSON.stringify(storage));
    }
    catch { } expanded.dispose();controller.abort(); request++; active?.cancel(); stopPlayback(); disposeScene(); };
}
function boot() { const root = document.querySelector<HTMLElement>('[data-lab-workspace]'); if (root && root === mountedRoot && disposeCurrent)
    return; disposeCurrent?.(); mountedRoot = root ?? undefined; disposeCurrent = root ? mountWorkspace(root) : undefined; }
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => { disposeCurrent?.(); disposeCurrent = undefined; mountedRoot = undefined; });
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => { if (!disposeCurrent)
        boot(); }, { once: true });
else if (!disposeCurrent)
    boot();
