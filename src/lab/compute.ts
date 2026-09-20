import { canonical, ENGINE_VERSION, fingerprint, modelAssumptions, reference, worldFor, type FlightEvent, type LabConfig, type LabRun, type LabTable, type Route, type SceneData } from './model.ts';
import { parseConfig } from './input.ts';
import { compileStrategies, sourceFor } from './strategies.ts';
import { fromEdges, fromBiEdges, fromMap, hoverEnergy } from '../engine/graph.ts';
import { search, admissible, consistent } from '../engine/search.ts';
import { blockedBy } from '../engine/geometry.ts';
import { labelSearch, pathOf } from '../engine/labels.ts';
import { planTask } from '../engine/task.ts';
import { evaluate, droneType, type FleetOptions, type FleetPlan, type World, type Assignment } from '../engine/fleet.ts';
import { checkPlan } from '../engine/check-plan.ts';
import { pathMovements } from '../engine/motion.ts';
import { greedyAssign, feasibilityMatrix, improve } from '../engine/assign.ts';
import { timetable, mapCost, fifo, improveBySwaps, enumerate, type Objective, type Job } from '../engine/timetable.ts';
const colors = ['#007f78', '#be4b25', '#514aad', '#9a6500', '#186ea3'];
const round = (n: number | undefined) => n === undefined ? '—' : Math.round(n * 100) / 100;
const objectiveText = (o?: Objective) => o ? `${o.lateness}, ${o.allReturned}, ${o.energy}` : 'infeasible';
function table(id: string, title: string, headers: string[], rows: LabTable['rows'], primary = false): LabTable { return { id, title, headers, rows, primary }; }
function addMetrics(r: LabRun, entries: [
    string,
    string | number
][]) { r.metrics.push(...entries.map(([label, value]) => ({ key: label, label, value }))); }
function route(id: string, label: string, path: string[], i = 0): Route { return { id, label, path, color: colors[i % colors.length] }; }
/** A result contains data only. The renderer, 2D map and 3D scene consume this same record. */
export function runExperiment(input: LabConfig, options: {
    allowCustom?: boolean;
    progress?: (n: number) => void;
} = {}): LabRun {
    const started = performance.now(), c = parseConfig(input), s = compileStrategies(c, options.allowCustom), world = worldFor(c);
    const r: LabRun = { format: 'slop3969-lab-run', version: 2, input: c, inputHash: fingerprint(c), modelHash: fingerprint({ case: c.caseId, world, drone: c.drone, jobs: c.caseId === 'six-jobs' ? c.jobs : undefined, graph: c.caseId === 'reopen' ? c.graph : undefined, charging: c.week >= 8, corridor: c.week >= 10 }), engine: ENGINE_VERSION, created: new Date().toISOString(), elapsed: 0, status: 'verified', summary: '', assumptions: modelAssumptions(c), metrics: [], tables: [], trace: [], timeline: [] };
    if (c.week === 1)
        geometryRun(r);
    else if (c.week <= 3)
        searchRun(r, s);
    else if (c.week === 4)
        labelsRun(r, s);
    else if (c.week <= 6)
        sequenceRun(r, s);
    else if (c.week === 9)
        corridorRun(r);
    else
        fleetRun(r, s, options.progress);
    r.strategyHashes = s.hashes;
    r.strategySources = Object.fromEntries(Object.entries(c.strategies).map(([key, strategy]) => [key, sourceFor(key as keyof typeof c.strategies, strategy)]));
    r.elapsed = Math.round((performance.now() - started) * 100) / 100;
    return r;
}
type Strategies = ReturnType<typeof compileStrategies>;
function geometryRun(r: LabRun) {
    const m = canonical.map, type = canonical.fleet.types[0], ids = new Set(m.nodes.filter(n => n.x <= 800 && n.y <= 800).map(n => n.id));
    const full = fromMap(m, type, 'time'), g = { nodeIds: () => [...ids], neighbours: (id: string) => full.neighbours(id).filter(n => ids.has(n.to)) };
    const best = search(g, m.kitchen, canonical.orders[2].node), paths = [best];
    for (const [from, to] of [[best.path![0], best.path![1]], [best.path!.at(-2)!, best.path!.at(-1)!]])
        paths.push(search({ ...g, neighbours: (id) => g.neighbours(id).filter(n => !(id === from && n.to === to)) }, m.kitchen, canonical.orders[2].node));
    const proposals: LabTable['rows'] = [], blocks = new Set<string>();
    for (const a of m.nodes.filter(n => ids.has(n.id)))
        for (const b of m.nodes.filter(n => ids.has(n.id))) {
            if (a.id >= b.id || Math.hypot(a.x - b.x, a.y - b.y) >= 450 || m.edges.some(e => e.from === a.id && e.to === b.id))
                continue;
            const blocked = blockedBy([[a.x, a.y], [b.x, b.y]], m.buildings);
            blocked.forEach(b => blocks.add(b.id));
            proposals.push({ id: `${a.id}-${b.id}`, values: [`${a.id} → ${b.id}`, blocked.length ? 'Building intersection' : 'Clear geometry; absent from graph', blocked.map(b => b.id).join(', ') || '—'], path: [a.id, b.id], selection: { kind: 'route', id: `${a.id}-${b.id}` }, tone: 'bad', detail: (blocked.length ? 'The segment crosses ' + blocked.map(b => b.id).join(', ') + '. ' : 'No building is crossed. ') + 'This connection is absent from the fixed directed graph, so it cannot be used as a route edge.' });
        }
    r.tables = [table('routes', 'Three legal alternatives', ['Route', 'Path', 'Time (s)'], paths.filter(p => p.status === 'found').map((p, i) => ({ id: 'route' + i, values: [String.fromCharCode(65 + i), p.path!.join(' → '), p.cost!], path: p.path, selection: { kind: 'route', id: 'route' + i } }))), table('connections', 'Inspect a proposed connection', ['Connection', 'Geometry check', 'Building'], proposals, true)];
    r.scene = { map: m, orders: [canonical.orders[2], canonical.orders[4]], routes: paths.filter(p => p.path).map((p, i) => route('route' + i, 'Route ' + String.fromCharCode(65 + i), p.path!, i)), events: [], focusNodes: [...ids], blockedBuildings: [...blocks] };
    r.summary = 'Select a connection to see exactly where it crosses the block. Legal endpoints do not prove that the line between them is a legal edge.';
    addMetrics(r, [['Block nodes', ids.size], ['Legal alternatives', paths.filter(p => p.path).length], ['Proposals to inspect', proposals.length]]);
}
function searchRun(r: LabRun, s: Strategies) {
    const c = r.input, m = canonical.map, type = canonical.fleet.types.find(t => t.id === c.drone)!, real = c.caseId === 'canonical';
    const edges = c.caseId === 'reopen' ? c.graph : c.caseId === 'unreachable' ? [{ from: 'S', to: 'A', cost: 1 }, { from: 'B', to: 'G', cost: 1 }] : [{ from: 'S', to: 'G', cost: 10 }, { from: 'S', to: 'A', cost: 1 }, { from: 'A', to: 'G', cost: 1 }];
    const g = real ? fromMap(m, type, 'time') : fromEdges(edges), start = real ? m.kitchen : 'S', goal = real ? canonical.orders.find(o => o.id === c.target)!.node : c.caseId === 'source-goal' ? 'S' : 'G';
    const node = (id: string) => real ? m.nodes.find(n => n.id === id)! : { id, x: 0, y: 0, z: 0 };
    const h = (id: string) => s.h(node(id), node(goal), { speed: type.speed, example: c.heuristic });
    const got = search(g, start, goal, { heuristic: h, reopenClosed: !(c.week === 3 && c.diagnostic), stopOnDiscovery: c.week === 2 && c.diagnostic, maxExpansions: c.maxExpansions });
    const correct = search(g, start, goal), adm = admissible(g, h, goal), cons = consistent(g, h);
    r.status = got.status === 'budget' ? 'budget' : got.status === 'no-solution' ? 'no-solution' : got.cost !== correct.cost ? 'diagnostic' : 'verified';
    r.summary = got.status === 'found' ? `Returned ${got.path!.join(' → ')} with cost ${got.cost}. Dijkstra with goal-on-pop returns ${correct.cost}. ${got.cost !== correct.cost ? 'The diagnostic rule returned a worse answer.' : 'The costs agree for this input.'}` : `Search stopped: ${got.status}. No route is invented for this result.`;
    addMetrics(r, [['Returned cost', got.cost ?? 'No route'], ['Correct cost', correct.cost ?? 'No route'], ['Expansions', got.expansions], ['h admissible', adm.ok ? 'yes' : 'no'], ['h consistent', cons.ok ? 'yes' : 'no']]);
    r.trace = got.steps.map(p => ({ id: 'search' + p.n, title: `${p.n}. Pop ${p.popped} · g=${p.g}, f=${p.f}`, node: p.popped, detail: `OPEN: ${p.open.map(e => `${e.node}(g=${e.g}, h=${e.h}, f=${e.f}, parent=${e.parent ?? '—'})`).join('; ') || 'empty'}. CLOSED: ${p.closed.join(', ')}. ${p.relaxed.map(x => `${x.to}: ${x.skippedClosed ? 'discarded: CLOSED' : x.reopened ? 'reopened' : x.improved ? 'relaxed' : 'not improved'} (${x.oldG ?? '∞'} → ${x.newG})`).join('; ')}` }));
    r.tables = [table('search', 'Pop, relax, reopen', ['Step', 'Node', 'g', 'f', 'OPEN', 'CLOSED'], got.steps.map(p => ({ id: 'search' + p.n, values: [p.n, p.popped, p.g, p.f, p.open.map(e => e.node).join(', '), p.closed.join(', ')], selection: { kind: 'search', id: 'search' + p.n } })), true)];
    if (!real)
        r.tables.push(table('graph', 'Editable graph used in this run', ['From', 'To', 'Cost'], edges.map((e, i) => ({ id: 'edge' + i, values: [e.from, e.to, e.cost] }))));
    r.tables.push(table('heuristic-check', 'Heuristic proof obligations', ['Check', 'Inequality / evidence'], [...adm.violations.map((x, i) => ({ id: 'admissible' + i, values: ['Overestimate', `h(${x.node})=${x.h} > exact cost ${x.exact}`] })), ...cons.violations.map((x, i) => ({ id: 'consistent' + i, values: ['Inconsistent', `h(${x.from})=${x.h} > c(${x.from},${x.to}) + h(${x.to}) = ${x.cost} + ${x.hTo}`] })), ...(adm.ok && cons.ok ? [{ id: 'h-ok', values: ['Passed', 'No overestimate or inconsistent directed edge in this input.'] }] : [])]));
    if (real)
        r.scene = { map: m, orders: [canonical.orders.find(o => o.id === c.target)!], routes: got.path ? [route('answer', 'Returned path', got.path)] : [], events: [] };
}
function labelsRun(r: LabRun, s: Strategies) {
    const c = r.input;
    if (c.caseId === 'labels') {
        const g = fromBiEdges([{ from: 'S', to: 'A', time: 2, energy: 3 }, { from: 'A', to: 'Q', time: 2, energy: 4 }, { from: 'S', to: 'B', time: 3, energy: 1 }, { from: 'B', to: 'Q', time: 3, energy: 2 }, { from: 'Q', to: 'G', time: 2, energy: 2 }]);
        const got = labelSearch(g, 'S', 'G', { budget: 8, dominates: s.dominates, withinBudget: s.withinBudget, maxExpansions: c.maxExpansions });
        r.trace = got.events.map((e, i) => ({ id: 'label' + i, title: `${e.node}: (${e.time}, ${e.energy}) · ${e.outcome}`, detail: `${e.path.join(' → ')}${e.by ? `; compared with (${e.by.time}, ${e.by.energy})` : ''}`, path: e.path, node: e.node, energy: e.energy }));
        r.tables = [table('labels', 'Every offered label', ['Node', 'Time', 'Energy', 'Decision', 'Path'], got.events.map((e, i) => ({ id: 'label' + i, values: [e.node, e.time, e.energy, e.outcome, e.path.join(' → ')], selection: { kind: 'label', id: 'label' + i }, path: e.path, tone: e.outcome === 'kept' ? 'good' : 'bad' })), true)];
        r.status = got.status === 'budget' ? 'budget' : got.feasible.length ? 'verified' : 'no-solution';
        r.summary = got.feasible.length ? `A surviving route is ${pathOf(got.feasible[0]).join(' → ')}: time ${got.feasible[0].time}, energy ${got.feasible[0].energy}, budget 8.` : 'No feasible label survived. Inspect the discarded S → B → Q prefix: keeping only time loses the route that fits.';
        addMetrics(r, [['Energy budget', 8], ['Feasible labels', got.feasible.length], ['Expansions', got.expansions]]);
        return;
    }
    const world = worldFor(c), order = world.orders[0], type = world.fleet.types.find(t => t.id === c.drone)!;
    const input = { map: world.map, rules: world.rules, type, order, loadFrom: Math.max(order.ready, (c.requestedDepartures[order.id] ?? 0) - world.rules.loadingTicks) };
    const p = planTask({ ...input, dominates: s.dominates, withinBudget: s.withinBudget, maxExpansions: c.maxExpansions, candidate: c.candidate });
    const correct = planTask(input), m = world.map;
    r.status = p.status === 'budget' ? 'budget' : p.status !== 'found' ? 'no-solution' : p.energyUsed! > p.budget ? 'diagnostic' : 'verified';
    r.summary = p.status === 'found' ? `${order.id}: ${p.chosen!.time} s from take-off to landing; ${p.energyUsed} J including service and the unloaded return. ${r.status === 'diagnostic' ? 'The independent reserve check rejects this candidate.' : `${p.energyLeft} J remain on landing.`}` : `${p.status}. ${correct.chosen ? 'The correct Pareto search still finds a complete trip; inspect where this strategy discarded its prefix.' : 'The correct search also finds no complete trip in this domain.'}`;
    addMetrics(r, [['Trip time (s)', p.chosen?.time ?? 'No route'], ['Trip energy (J)', p.energyUsed ?? '—'], ['Usable budget (J)', p.budget], ['Return reserve (J)', type.batteryJ - p.budget], ['Expansions', p.expansions ?? 0]]);
    const candidates = p.candidates;
    r.tables.push(table('candidates', 'Complete trips · outbound + service + unloaded return', ['Candidate', 'Out (s / J)', 'Service (s / J)', 'Back (s / J)', 'Total (s / J)', 'Reserve check'], candidates.map((x, i) => ({ id: 'candidate' + i, values: [i, `${x.out.time} / ${x.out.energy}`, `${world.rules.serviceTicks} / ${hoverEnergy(type, world.rules.serviceTicks)}`, `${x.back.time} / ${x.back.energy}`, `${x.time} / ${x.energy}`, x.energy <= p.budget ? 'fits' : 'over budget'], path: [...pathOf(x.out), ...pathOf(x.back).slice(1)], selection: { kind: 'route', id: 'candidate' + i }, tone: x.energy <= p.budget ? 'good' : 'bad', detail: `Outbound: ${pathOf(x.out).join(' → ')}. Return: ${pathOf(x.back).join(' → ')}.` })), true));
    const ev = [...(p.trace?.out ?? []).map(e => ({ ...e, phase: 'out' })), ...(p.trace?.back ?? []).map(e => ({ ...e, phase: 'back' }))];
    r.trace = ev.map((e, i) => ({ id: 'label' + i, title: `${e.phase} · ${e.node} (${e.time} s, ${e.energy} J) · ${e.outcome}`, node: e.node, path: e.path, energy: e.energy, phase: e.phase, detail: `${e.path.join(' → ')}${e.by ? `. Compared with (${e.by.time} s, ${e.by.energy} J).` : ''}` }));
    r.tables.push(table('labels', 'Kept and pruned paths', ['Leg', 'Node', 'Time (s)', 'Energy (J)', 'Decision'], ev.map((e, i) => ({ id: 'label' + i, values: [e.phase, e.node, e.time, e.energy, e.outcome], path: e.path, selection: { kind: 'label', id: 'label' + i }, tone: e.outcome === 'kept' ? 'good' : 'bad' }))));
    const events: FlightEvent[] = [];
    for (const leg of p.legs) {
        const node = leg.kind === 'service' ? order.node : m.kitchen;
        if (leg.path)
            events.push(...pathMovements(m, type, leg.path, leg.start, leg.kind === 'out' ? order.weight : 0).map((e, i) => ({ ...e, id: `${leg.kind}${i}`, drone: 'A', order: order.id, phase: leg.kind as 'out' | 'back' })));
        else
            events.push({ id: leg.kind, drone: 'A', order: order.id, phase: leg.kind as 'load' | 'service', kind: leg.kind === 'service' ? 'hover' : 'ground-wait', from: node, to: node, start: leg.start, end: leg.end, energy: leg.energy });
    }
    const routes: Route[] = candidates.slice(0, 12).map((x, i) => ({ ...route('candidate' + i, `${i} · ${i === 0 ? 'fastest' : x === p.chosen ? 'selected contour' : 'alternative'} · ${x.time}s / ${round(x.energy / 1000)}kJ${x.energy > p.budget ? ' · over budget' : ''}`, [...pathOf(x.out), ...pathOf(x.back).slice(1)], i), color: x.energy > p.budget ? '#bb4f2b' : '#007f78' }));
    if (p.chosen)
        routes.push({ ...route('return', 'Selected return · unloaded', pathOf(p.chosen.back), 2), dashed: true });
    if (!p.chosen && correct.chosen)
        routes.push({ ...route('correct', 'Correct Pareto route · discarded by this strategy', [...pathOf(correct.chosen.out), ...pathOf(correct.chosen.back).slice(1)]), dashed: true, diagnostic: true });
    r.scene = { map: m, orders: [order], routes, events, pads: world.rules.resources.pads.capacity, droneTypes: { A: c.drone } };
    if (p.chosen) {
        const task = { order: order.id, drone: 'A', status: 'flown' as const, start: input.loadFrom, depart: p.depart, arrive: p.deliver! - world.rules.serviceTicks, deliver: p.deliver, land: p.land, energyUsed: p.energyUsed, late: Math.max(0, p.deliver! - order.promised), pathOut: pathOf(p.chosen.out), pathBack: pathOf(p.chosen.back), movements: events.filter(e => e.phase === 'out' || e.phase === 'back') };
        const candidatePlan: FleetPlan = { tasks: [task], activities: [], occupancies: [], deliveries: [], unscheduled: [], complete: true, onTime: 0, validation: { ok: true, violations: [], unfinished: [], delivered: [] }, expansions: p.expansions ?? 0 };
        const taskWorld = { ...world, fleet: { ...world.fleet, drones: [{ id: 'A', type: c.drone }] } };
        r.check = checkPlan(taskWorld, candidatePlan);
        r.plan = candidatePlan;
        if (!r.check.ok)
            r.status = 'diagnostic';
    }
    r.timeline = events.map(e => ({ id: e.id, lane: 'A', start: e.start, end: e.end, label: `${e.phase}: ${e.from} → ${e.to}`, kind: e.phase, selection: { kind: 'move', id: e.id } }));
    r.tables.push(table('ledger', 'Flight ledger · select an event to scrub the replay', ['Phase', 'From → to', 'Start', 'End', 'Energy (J)'], events.map(e => ({ id: e.id, values: [e.phase, `${e.from} → ${e.to}`, e.start, e.end, e.energy], selection: { kind: 'move', id: e.id } }))));
    r.comparisons = [{ label: 'Correct Pareto strategy, same input', value: correct.chosen ? `${correct.chosen.time} s / ${correct.energyUsed} J` : correct.status, sameModel: true }];
}
function sequenceRun(r: LabRun, s: Strategies) {
    const c = r.input, symbolic = c.caseId === 'six-jobs', world = worldFor(c), type = world.fleet.types.find(t => t.id === c.drone)!;
    const jobs: Job[] = symbolic ? c.jobs : world.orders, cost = symbolic ? ((j: Job) => { const x = c.jobs.find(x => x.id === j.id)!; return { d: x.d, p: x.p, energy: 0 }; }) : mapCost(world.map, world.rules, type, world.orders);
    const opts = { loadingTicks: symbolic ? 0 : world.rules.loadingTicks, turnaroundTicks: symbolic ? 0 : world.rules.turnaroundTicks, compare: s.compare, requestedDepartures: c.requestedDepartures };
    let seq = c.sequence.length ? c.sequence.map(id => { const j = jobs.find(j => j.id === id); if (!j)
        throw new Error('Unknown job ' + id); return j; }) : c.method === 'fifo' ? fifo(jobs) : [...jobs].sort((a, b) => s.orderKey(a, { now: 0, trip: cost(a, 0)?.p ?? 0 }) - s.orderKey(b, { now: 0, trip: cost(b, 0)?.p ?? 0 }) || a.ready - b.ready || a.id.localeCompare(b.id));
    if (seq.length !== 6 || new Set(seq.map(j => j.id)).size !== 6)
        throw new Error('The sequence must contain each of the six jobs exactly once.');
    const initial = timetable(seq, cost, opts), swaps = improveBySwaps(seq, cost, opts), exact = c.method === 'exact' || c.week === 6 ? enumerate(jobs, cost, opts) : undefined;
    if (c.method === 'swaps')
        seq = swaps.sequence;
    if (c.method === 'exact' && exact?.optima[0])
        seq = exact.optima[0].map(id => jobs.find(j => j.id === id)!);
    const result = timetable(seq, cost, opts);
    r.objective = result.objective;
    r.status = result.feasible ? 'verified' : 'no-solution';
    r.summary = `Sequence ${seq.map(j => j.id).join(' → ')}. Course objective (lateness, final return, energy): ${objectiveText(result.objective)}. ${exact ? `${exact.count} sequences enumerated with the selected comparison function.` : ''} ${swaps.status === 'local-optimum' ? 'Every pair swap was checked; this proves only a local optimum.' : ''}`;
    addMetrics(r, [['Total lateness', result.objective?.lateness ?? '—'], ['Final return', result.objective?.allReturned ?? '—'], ['Swaps checked', swaps.neighboursChecked], ['Exact sequences', exact?.count ?? 'Not run']]);
    r.tables.push(table('schedule', 'The recurrence, order by order', ['Order', 'Ready', 'Load start', 'Depart', 'Deliver', 'Return', 'Lateness'], result.slots.map(x => ({ id: x.id, values: [x.id, jobs.find(j => j.id === x.id)!.ready, x.start, x.depart, x.deliver, x.ret, x.late], selection: { kind: 'task', id: x.id }, tone: x.late ? 'bad' : 'good', detail: `Available for the next order at ${x.available}. Energy ${x.energy} J.` })), true));
    r.tables.push(table('swaps', 'Every swap candidate and acceptance decision', ['Iteration', 'Swap positions', 'Sequence', 'Objective', 'Decision'], (swaps.candidates ?? []).map((x, i) => ({ id: 'swap' + i, values: [x.iteration, `${x.i + 1} ↔ ${x.j + 1}`, x.sequence.join(' '), objectiveText(x.objective), x.accepted ? 'accepted: best strict improvement' : !x.objective ? 'rejected: infeasible' : 'rejected: no better than the chosen candidate/current sequence'], tone: x.accepted ? 'good' : undefined }))));
    r.trace = result.slots.map(x => ({ id: x.id, title: `${x.id}: depart ${x.depart}, deliver ${x.deliver}`, tick: x.depart, detail: `start = max(ready ${jobs.find(j => j.id === x.id)!.ready}, prior availability, requested departure − loading) = ${x.start}. Return ${x.ret}; next available ${x.available}; lateness ${x.late}.` }));
    r.timeline = result.slots.map(x => ({ id: x.id, lane: 'One drone', start: x.start, end: x.ret, label: x.id, kind: x.late ? 'late' : 'task', selection: { kind: 'task', id: x.id } }));
    r.comparisons = [{ label: 'Starting sequence', value: objectiveText(initial.objective), sameModel: true }, { label: 'Swap local optimum', value: objectiveText(swaps.objective), sameModel: true }, ...(exact ? [{ label: 'Exact optimum for this six-job model', value: objectiveText(exact.best), sameModel: true }] : [])];
}
function sceneFromPlan(world: World, p: FleetPlan): SceneData {
    const events: FlightEvent[] = [], routes: Route[] = [];
    for (const t of p.tasks) {
        if (t.status !== 'flown')
            continue;
        const i = world.fleet.drones.findIndex(d => d.id === t.drone), order = world.orders.find(o => o.id === t.order)!;
        for (const [phase, path] of [['out', t.pathOut], ['back', t.pathBack]] as const)
            if (path)
                routes.push({ ...route(t.order + phase, `${t.drone} · ${t.order} ${phase}`, path, i), order: t.order, dashed: phase === 'back' });
        (t.movements ?? []).forEach((m, i) => events.push({ ...m, id: t.order + 'move' + i, drone: t.drone, order: t.order, phase: m.start < t.deliver! ? 'out' : 'back' }));
        const staticEvent = (phase: FlightEvent['phase'], from: string, start: number | undefined, end: number | undefined, energy = 0) => { if (start !== undefined && end !== undefined && end > start)
            events.push({ id: t.order + phase, drone: t.drone, order: t.order, phase, kind: phase === 'service' ? 'hover' : 'ground-wait', from, to: from, start, end, energy }); };
        staticEvent('load', world.map.kitchen, t.start, t.start + world.rules.loadingTicks);
        staticEvent('service', order.node, t.arrive, t.deliver, hoverEnergy(droneType(world, t.drone), world.rules.serviceTicks));
        staticEvent('turnaround', world.map.kitchen, t.land, t.land! + world.rules.turnaroundTicks);
        staticEvent('charge', world.map.kitchen, t.chargeStart, t.chargeEnd);
    }
    return { map: world.map, orders: world.orders, routes, events: events.sort((a, b) => a.start - b.start), pads: world.rules.resources.pads.capacity, droneTypes: Object.fromEntries(world.fleet.drones.map(d => [d.id, d.type])) };
}
function fleetRun(r: LabRun, s: Strategies, progress?: (n: number) => void) {
    const c = r.input;
    let world = worldFor(c);
    const opts: FleetOptions = { charging: c.week >= 8, corridor: c.week >= 10 && c.method !== 'independent', priority: s.priority, maxExpansions: c.maxExpansions, recordTrace: c.week >= 10, requestedDepartures: c.requestedDepartures, routeCandidates: c.routeCandidates, closures: c.scenario.closures };
    let assignment: Assignment, steps: ReturnType<typeof greedyAssign>['steps'] = [];
    if (c.week === 10) {
        world = { ...world, orders: [canonical.orders[12], canonical.orders[10]], fleet: { ...world.fleet, drones: [{ id: 'A', type: 'L' }, { id: 'B', type: 'L' }] } };
        const depart = Math.max(...world.orders.map(o => o.ready)) + world.rules.loadingTicks;
        opts.requestedDepartures = Object.fromEntries(world.orders.map(o => [o.id, Math.max(depart, c.requestedDepartures[o.id] ?? 0)]));
        assignment = c.assignment ?? { A: [world.orders[0].id], B: [world.orders[1].id] };
        r.assumptions = ['Two complete tasks; original ready times and payloads', 'Both loads start together at the later ready time', 'Full return, reserve and corridor interval checks'];
    }
    else if (c.assignment)
        assignment = c.assignment;
    else if (c.method === 'reference')
        assignment = Object.fromEntries(world.fleet.drones.map(d => [d.id, ((reference.reference.assignment as Assignment)[d.id] ?? []).filter(id => world.orders.some(o => o.id === id))]));
    else {
        const g = greedyAssign(world, world.orders, c.method === 'equal-counts' ? 'equal-counts' : 'earliest-completion', { score: s.assignCost, includeWaits: c.includeWaits || c.strategies.assignCost.preset === 'waits', fleetOptions: opts });
        assignment = g.assignment;
        steps = g.steps;
    }
    const assigned = Object.values(assignment).flat();
    if (assigned.some(id => !world.orders.some(o => o.id === id)) || Object.keys(assignment).some(id => !world.fleet.drones.some(d => d.id === id)))
        throw new Error('The assignment contains an order or drone outside this scenario.');
    const before = evaluate(world, assignment, opts);
    let p = before, searchStatus = '';
    if (c.method === 'feedback') {
        const feedback = improve(world, assignment, { ...opts, recordTrace: false, maxCandidates: c.maxCandidates, onProgress: n => progress?.(n) });
        assignment = feedback.assignment;
        p = evaluate(world, assignment, opts);
        searchStatus = feedback.status;
        r.tables.push(table('feedback', 'Full-plan feedback · every tested candidate', ['Iteration', 'Change', 'Objective', 'Decision'], (feedback.candidates ?? []).map((x, i) => ({ id: 'feedback' + i, values: [x.iteration, x.description, objectiveText(x.objective), x.accepted ? 'accepted: best strict improvement' : !x.complete ? 'rejected: incomplete or invalid' : 'rejected: no better than selected/current plan'], tone: x.accepted ? 'good' : undefined })), true));
        r.comparisons = [{ label: 'Before feedback · same resources', value: objectiveText(before.objective), sameModel: true }];
        addMetrics(r, [['Candidates evaluated', feedback.candidatesEvaluated], ['Accepted changes', feedback.moves.length], ['Search stopped', feedback.status]]);
    }
    const checkerOpts = { ...opts, corridor: c.week >= 10 };
    const check = checkPlan(world, p, checkerOpts);
    r.check = check;
    r.plan = p;
    r.assignment = assignment;
    r.objective = check.objective;
    r.modelHash = fingerprint({ world, charging: opts.charging, corridor: checkerOpts.corridor, closures: opts.closures });
    r.status = searchStatus === 'budget' ? 'budget' : !check.ok ? 'diagnostic' : !check.complete ? 'no-solution' : 'verified';
    r.summary = `${check.onTime}/${world.orders.length} on time. ${check.complete ? 'Every order delivered and every drone returned with all checks passing.' : `${check.unfinished.length} unfinished; ${check.issues.length} validation issues.`} ${searchStatus === 'budget' ? 'Candidate budget reached; this is the best feasible plan found so far, not a proven local optimum.' : ''} ${c.method === 'reference' ? 'The stored assignment was recomputed using this scenario.' : ''}`;
    addMetrics(r, [['On time', `${check.onTime}/${world.orders.length}`], ['Total lateness (s)', check.objective?.lateness ?? '—'], ['All returned (s)', check.objective?.allReturned ?? '—'], ['Check issues', check.issues.length]]);
    r.scene = sceneFromPlan(world, p);
    r.tables.push(table('tasks', 'Assignment and complete tasks', ['Order', 'Drone', 'Load start', 'Deliver', 'Return', 'Late (s)', 'Energy (J)'], p.tasks.map(t => ({ id: t.order, values: [t.order, t.drone, t.start, t.deliver ?? t.reason ?? '—', t.land ?? '—', t.late ?? '—', t.energyUsed ?? '—'], selection: { kind: 'task', id: t.order }, tone: t.status !== 'flown' || t.late ? 'bad' : 'good', detail: taskCause(world, p, t.order) })), c.week !== 11));
    if (c.week <= 8)
        r.tables.push(table('feasibility', 'Payload and range · every drone × order', ['Order', 'Drone', 'Feasible', 'Trip (s)', 'Energy (J)', 'Reason'], feasibilityMatrix(world).map(f => ({ id: f.drone + f.order, values: [f.order, f.drone, f.feasible ? 'yes' : 'no', f.ticks ?? '—', f.energy ?? '—', f.reason ?? 'Within payload and usable battery'], selection: { kind: 'task', id: f.order }, tone: f.feasible ? 'good' : 'bad' }))));
    if (steps.length)
        r.tables.push(table('assignment-decisions', 'Assignment decisions', ['Order', 'Chosen', 'Predicted delivery', 'Alternatives'], steps.map(x => ({ id: 'assign' + x.order, values: [x.order, x.chosen, x.predicted, x.alternatives.map(a => `${a.drone}: ${a.predicted ?? 'infeasible'}`).join('; ')], selection: { kind: 'task', id: x.order } }))));
    r.tables.push(table('resources', 'Shared-resource intervals · half-open [start, end)', ['Resource', 'Drone', 'Order', 'Start', 'End'], p.occupancies.map((o, i) => ({ id: 'resource' + i, values: [o.resource, o.owner, o.task ?? 'closure', o.start, o.end], selection: { kind: 'resource', id: 'resource' + i }, detail: `${o.resource} occupied by ${o.owner} on [${o.start}, ${o.end}).` }))), table('checks', 'Independent full-plan checker', ['Rule', 'Order', 'Evidence'], check.issues.length ? check.issues.map((x, i) => ({ id: 'issue' + i, values: [x.rule, x.order ?? '—', x.detail], tone: 'bad', selection: x.order ? { kind: 'task', id: x.order } : undefined })) : [{ id: 'passed', values: ['All checks', 'All tasks', 'Recomputed directed edges, action times and energy, payload, service, reserve, uniqueness, availability, FCFS pads, corridor intervals and cutoff.'], tone: 'good' }]));
    for (const t of p.tasks) {
        r.trace.push({ id: t.order, title: `${t.drone} · ${t.order} · ${t.late ? `${t.late} s late` : t.status}`, detail: taskCause(world, p, t.order), tick: t.start, node: world.orders.find(o => o.id === t.order)?.node });
        (t.trace ?? []).slice(0, 400).forEach((e, i) => r.trace.push({ id: t.order + 'st' + i, title: `${t.drone} ${e.phase ?? 'out'} · ${e.node}@${e.t}: ${e.action}`, node: e.node, tick: e.t, energy: e.energy, detail: e.blockers?.length ? `${e.resource}: ${e.blockers.map(b => `${b.owner} ${b.task ?? ''} [${b.start}, ${b.end})`).join('; ')} blocks [${e.t}, ${e.end}).` : `${e.action}: ${e.node}${e.to ? ' → ' + e.to : ''} at ${e.t}${e.end ? ' to ' + e.end : ''}; ${e.energy} J. State identity preserves node, phase, time and energy.` }));
    }
    r.timeline = [...p.tasks.filter(t => t.status === 'flown').map(t => ({ id: t.order, lane: t.drone, start: t.depart!, end: t.land!, label: t.order, kind: t.late ? 'late' : 'task', selection: { kind: 'task' as const, id: t.order } })), ...r.scene.events.filter(e => !['out', 'back', 'service'].includes(e.phase)).map(e => ({ id: e.id, lane: e.drone, start: e.start, end: e.end, label: `${e.order} ${e.phase}`, kind: e.phase, selection: { kind: 'move' as const, id: e.id } })), ...p.occupancies.map((o, i) => ({ id: 'resource' + i, lane: o.resource, start: o.start, end: o.end, label: `${o.owner} ${o.task ?? 'closure'}`, kind: o.resource, selection: { kind: 'resource' as const, id: 'resource' + i } }))];
}
export function taskCause(world: World, p: FleetPlan, id: string): string {
    const t = p.tasks.find(t => t.order === id);
    if (!t)
        return 'No task record.';
    const order = world.orders.find(o => o.id === id)!;
    if (t.status !== 'flown')
        return `Unscheduled: ${t.reason}. Ready ${order.ready}, payload ${order.weight} kg.`;
    const prior = p.tasks.filter(x => x.drone === t.drone && x.start < t.start && x.status === 'flown').sort((a, b) => b.start - a.start)[0];
    const blockers = (t.trace ?? []).filter(x => x.blockers?.length).flatMap(x => x.blockers!).map(x => `${x.owner}/${x.task ?? 'closure'} [${x.start},${x.end})`);
    return [`${id} is ready at ${order.ready} and promised at ${order.promised}.`, prior ? `Previous task ${prior.order} lands at ${prior.land}; turnaround finishes ${prior.land! + world.rules.turnaroundTicks}${prior.chargeEnd !== undefined ? `; charging occupies [${prior.chargeStart}, ${prior.chargeEnd}) after ${prior.chargeStart! - prior.land! - world.rules.turnaroundTicks} s in the pad queue` : ''}.` : 'This is the first task for this drone.', `Loading starts ${t.start}; take-off ${t.depart}; ground wait ${t.groundWait ?? 0} s; airborne wait ${t.hover ?? 0} s; service [${t.arrive}, ${t.deliver}); return ${t.land}.`, `Lateness = max(0, ${t.deliver} − ${order.promised}) = ${t.late}.`, blockers.length ? `Observed reservation blockers: ${[...new Set(blockers)].slice(0, 8).join('; ')}.` : 'No reservation blocker was recorded for this task.'].join(' ');
}
function corridorRun(r: LabRun) {
    const c = r.input;
    if (c.caseId === 'waiting') {
        let tick = 3;
        const seen = new Set<string>();
        let found = false;
        while (tick <= 8) {
            const key = c.diagnostic ? 'P' : `P@${tick}`;
            if (seen.has(key)) {
                r.trace.push({ id: 'wait' + tick, title: `Discard P@${tick}`, node: 'P', tick, detail: 'visited[node] already contains P, so the later state and its different future are lost.' });
                break;
            }
            seen.add(key);
            r.trace.push({ id: 'wait' + tick, title: `Expand P@${tick}`, node: 'P', tick, detail: tick < 6 ? 'The corridor is occupied on [0,6). Offer a one-second wait.' : 'The full crossing interval [6,8) is free. Reach G@8.' });
            if (tick >= 6) {
                found = true;
                break;
            }
            tick++;
        }
        r.status = found ? 'verified' : 'no-solution';
        r.summary = found ? 'P@3 → P@4 → P@5 → P@6 → G@8. Waiting changes which future moves are possible.' : 'visited[P] discards P@4. This failed search does not prove that no route exists.';
        r.tables = [table('wait-states', 'States actually explored', ['State', 'Decision'], r.trace.map(t => ({ id: t.id, values: [t.title, t.detail], selection: { kind: 'search', id: t.id } })), true)];
        r.timeline = [{ id: 'closed', lane: 'corridor', start: 0, end: 6, label: 'reserved', kind: 'closed' }, ...(found ? [{ id: 'cross', lane: 'corridor', start: 6, end: 8, label: 'P → G', kind: 'move' }] : [])];
        addMetrics(r, [['Start', 3], ['Arrival', found ? 8 : 'No route'], ['Visited key', c.diagnostic ? 'node' : 'node + time']]);
        return;
    }
    const m = canonical.map, type = canonical.fleet.types[0], order = canonical.orders[12], g = fromMap(m, type, 'time');
    const out = search(g, m.kitchen, order.node).path!, back = search(g, order.node, m.kitchen).path!;
    const rawA = pathMovements(m, type, out, 0, order.weight), b0 = pathMovements(m, type, back, 0, 0), ac = rawA.find(e => e.resource === 'corridor')!, bc = b0.find(e => e.resource === 'corridor')!;
    const bStart = ac.start - 20 - bc.start, B = pathMovements(m, type, back, bStart, 0), window = B.find(e => e.resource === 'corridor')!;
    const wait = Math.max(0, window.end - ac.start);
    let A = rawA;
    if (c.arrangement === 'detour')
        A = pathMovements(m, type, search({ ...g, neighbours: (id) => g.neighbours(id).filter(n => !m.edges.find(e => e.id === n.edge)?.resource) }, m.kitchen, order.node).path!, 0, order.weight);
    if (c.arrangement === 'wait')
        A = rawA.flatMap(e => e === ac ? [{ kind: 'hover' as const, from: e.from, to: e.from, start: e.start, end: e.start + wait, energy: hoverEnergy(type, wait) }, { ...e, start: e.start + wait, end: e.end + wait }] : [{ ...e, start: e.start + (e.start >= ac.start ? wait : 0), end: e.end + (e.start >= ac.start ? wait : 0) }]);
    const conflict = c.arrangement === 'both' && ac.start < window.end && window.start < ac.end;
    const events: FlightEvent[] = [...A.map((e, i) => ({ ...e, id: 'A' + i, drone: 'A', order: order.id, phase: 'out' as const })), ...B.map((e, i) => ({ ...e, id: 'B' + i, drone: 'B', order: order.id, phase: 'back' as const }))];
    r.scene = { map: m, orders: [order], routes: [route('A', `A · ${c.arrangement}`, A.filter(e => e.kind === 'move').map(e => e.from).concat(A.at(-1)!.to)), { ...route('B', 'B · returning', back, 1), dashed: true }], events };
    r.status = conflict ? 'diagnostic' : 'verified';
    r.assumptions = ['Two individual flight legs: loaded A outbound, unloaded B returning', 'Corridor capacity one; half-open intervals', 'This case checks the shared passage, not a complete delivery schedule'];
    r.summary = conflict ? `Conflict on [${Math.max(ac.start, window.start)}, ${Math.min(ac.end, window.end)}): both drones occupy the corridor.` : c.arrangement === 'wait' ? `A hovers ${wait} s at ${ac.from} and enters when B leaves. Hover energy is charged.` : 'A takes a legal route around the corridor. Compare the longer flight and its energy with waiting.';
    addMetrics(r, [['A arrival (s)', A.at(-1)!.end], ['A hover (s)', c.arrangement === 'wait' ? wait : 0], ['A energy (J)', A.reduce((v, e) => v + e.energy, 0)], ['Corridor check', conflict ? 'conflict' : 'passed']]);
    r.timeline = events.filter(e => e.resource || e.kind === 'hover').map(e => ({ id: e.id, lane: e.resource ?? 'A hover', start: e.start, end: e.end, label: `${e.drone} ${e.kind}`, kind: e.kind, selection: { kind: 'move', id: e.id } }));
    r.tables = [table('corridor', 'The whole occupancy interval', ['Drone', 'From', 'To', 'Start', 'End', 'Energy (J)'], events.filter(e => e.resource || e.kind === 'hover').map(e => ({ id: e.id, values: [e.drone, e.from, e.to, e.start, e.end, e.energy], selection: { kind: 'move', id: e.id }, tone: conflict ? 'bad' : 'good' })), true)];
    r.trace = events.map(e => ({ id: e.id, title: `${e.drone}: ${e.from} → ${e.to}`, node: e.from, tick: e.start, energy: e.energy, detail: `${e.kind} [${e.start},${e.end}), ${e.energy} J${e.resource ? `, resource ${e.resource}` : ''}.` }));
}
