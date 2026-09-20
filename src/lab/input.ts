import { canonical, defaultConfig, lessons, type LabConfig, type SlotKey, type SymbolicJob } from "./model.ts";
import { presets } from "./strategies.ts";
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const whole = (v: unknown, min: number, max: number) => finite(v, min, max) && Number.isInteger(v);
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
function requireInput(ok: unknown, message: string): asserts ok { if (!ok)
    throw new Error(message); }
export function parseConfig(value: unknown, fallbackWeek = 4): LabConfig {
    requireInput(object(value), "Experiment settings must be an object.");
    const week = value.week ?? fallbackWeek;
    requireInput(whole(week, 1, 12), "Week must be from 1 to 12.");
    const c = defaultConfig(week);
    requireInput(value.version === undefined || value.version === 2, "Unsupported experiment version.");
    for (const key of ["caseId", "target", "method", "drone", "arrangement"] as const)
        if (value[key] !== undefined) {
            requireInput(text(value[key], 80), "Invalid " + key);
            (c as any)[key] = value[key];
        }
    requireInput(lessons[week].cases.some(x => x.id === c.caseId), "This case does not belong to the selected week.");
    requireInput(["L", "H"].includes(c.drone), "Choose a known drone type.");
    requireInput(["both", "wait", "detour", "custom"].includes(c.arrangement), "Unknown corridor arrangement.");
    if (value.corridorDelay !== undefined) {
        requireInput(whole(value.corridorDelay, 0, 600), "Use a whole-second corridor delay from 0 to 600.");
        c.corridorDelay = value.corridorDelay;
    }
    if (value.corridorRoute !== undefined) {
        requireInput(["pass", "detour"].includes(value.corridorRoute), "Choose the pass or detour route.");
        c.corridorRoute = value.corridorRoute;
    }
    requireInput(["fifo", "edf", "manual", "swaps", "exact", "enumerate", "equal-counts", "greedy", "independent", "reserved", "feedback", "reference"].includes(c.method), "Unknown planning method.");
    for (const key of ["diagnostic", "includeWaits"] as const)
        if (value[key] !== undefined) {
            requireInput(typeof value[key] === "boolean", "Invalid " + key);
            c[key] = value[key];
        }
    for (const key of ["maxCandidates", "maxExpansions"] as const)
        if (value[key] !== undefined) {
            requireInput(whole(value[key], 1, key === "maxCandidates" ? 3000 : 50000), "Invalid search budget.");
            c[key] = value[key];
        }
    if (value.candidate !== undefined) {
        requireInput(whole(value.candidate, 0, 100), "Invalid route candidate.");
        c.candidate = value.candidate;
    }
    if (value.strategies !== undefined) {
        requireInput(object(value.strategies), "Strategies must be an object.");
        for (const key of Object.keys(c.strategies) as SlotKey[]) {
            const s = value.strategies[key];
            if (s === undefined)
                continue;
            requireInput(object(s) && ["preset", "composed", "custom"].includes(s.mode) && presets[key].some(p => p.id === s.preset), "Unknown strategy preset.");
            requireInput(finite(s.factor, -10, 10) && finite(s.secondary, -10, 10) && text(s.code, 8000), "Invalid strategy parameters or code longer than 8,000 characters.");
            c.strategies[key] = { mode: s.mode, preset: s.preset, factor: s.factor, secondary: s.secondary, code: s.code };
        }
    }
    if (value.scenario !== undefined) {
        const s = value.scenario;
        requireInput(object(s) && whole(s.pads, 1, 3), "Use one to three pads.");
        requireInput(Array.isArray(s.drones) && s.drones.length >= 1 && s.drones.length <= 5, "Use one to five drones.");
        const ids = new Set<string>();
        c.scenario.drones = s.drones.map((d: any) => {
            requireInput(object(d) && canonical.fleet.drones.some(x => x.id === d.id) && ["L", "H"].includes(d.type) && !ids.has(d.id), "Unknown or repeated drone.");
            ids.add(d.id);
            return { id: d.id, type: d.type };
        });
        requireInput(Array.isArray(s.addedOrders) && s.addedOrders.length <= 5, "Add at most five orders to existing addresses.");
        const orderIds = new Set(canonical.orders.map(o => o.id));
        c.scenario.addedOrders = s.addedOrders.map((o: any) => {
            requireInput(object(o) && typeof o.id === "string" && /^#(?:2[1-9]|30)$/.test(o.id) && !orderIds.has(o.id), "New orders need distinct IDs #21–#30.");
            requireInput(canonical.orders.some(x => x.node === o.node) && text(o.label, 100) && finite(o.weight, 0.01, 10) && whole(o.ready, 0, 12600) && whole(o.promised, 0, 12600), "Invalid address, weight, readiness or promise.");
            orderIds.add(o.id);
            return { id: o.id, node: o.node, label: o.label, weight: o.weight, ready: o.ready, promised: o.promised };
        });
        requireInput(Array.isArray(s.closures) && s.closures.length <= 5, "Use at most five corridor closure windows.");
        c.scenario.closures = s.closures.map((r: any) => {
            requireInput(object(r) && whole(r.start, 0, 12599) && whole(r.end, 1, 12600) && r.start < r.end, "A closure needs an increasing interval inside the evaluation window.");
            return { start: r.start, end: r.end };
        }).sort((a, b) => a.start - b.start);
        for (let i = 1; i < c.scenario.closures.length; i++)
            requireInput(c.scenario.closures[i].start >= c.scenario.closures[i - 1].end, "Closure windows must not overlap.");
        c.scenario.pads = s.pads;
    }
    requireInput([...canonical.orders, ...c.scenario.addedOrders].some(o => o.id === c.target), "Choose an existing order.");
    const list = (v: unknown) => {
        requireInput(Array.isArray(v) && v.length <= 30 && v.every(x => text(x, 12)), "Expected an order-ID list.");
        return [...v] as string[];
    };
    if (value.sequence !== undefined)
        c.sequence = list(value.sequence);
    if (value.assignment !== undefined) {
        requireInput(object(value.assignment) && Object.keys(value.assignment).length <= 5, "Invalid assignment.");
        c.assignment = {};
        for (const [id, orders] of Object.entries(value.assignment)) {
            requireInput(c.scenario.drones.some(d => d.id === id), "Assignment names a drone outside this fleet.");
            c.assignment[id] = list(orders);
        }
    }
    for (const key of ["requestedDepartures", "routeCandidates"] as const)
        if (value[key] !== undefined) {
            requireInput(object(value[key]) && Object.keys(value[key]).length <= 30, "Invalid " + key);
            const records: Record<string, number> = {};
            for (const [id, v] of Object.entries(value[key])) {
                requireInput(/^#\d{2}$|^[A-F]$/.test(id) && whole(v, 0, key === "routeCandidates" ? 100 : 12600), "Invalid order setting.");
                records[id] = v as number;
            }
            c[key] = records;
        }
    if (value.jobs !== undefined) {
        requireInput(Array.isArray(value.jobs) && value.jobs.length === 6, "The editable table needs six jobs A–F.");
        const ids = new Set<string>();
        c.jobs = value.jobs.map((j: any) => {
            requireInput(object(j) && /^[A-F]$/.test(j.id) && !ids.has(j.id) && whole(j.ready, 0, 1000) && whole(j.promised, 0, 5000) && whole(j.d, 1, 1000) && whole(j.p, j.d + 1, 2000), "Invalid six-job teaching table.");
            ids.add(j.id);
            return { id: j.id, ready: j.ready, promised: j.promised, d: j.d, p: j.p } as SymbolicJob;
        });
    }
    if (value.graph !== undefined) {
        requireInput(Array.isArray(value.graph) && value.graph.length <= 24, "Use at most 24 micrograph edges.");
        c.graph = value.graph.map((e: any) => { requireInput(object(e) && /^[SABG]$/.test(e.from) && /^[SABG]$/.test(e.to) && e.from !== e.to && finite(e.cost, 0, 100), "Invalid micrograph edge."); return { from: e.from, to: e.to, cost: e.cost }; });
    }
    if (value.heuristic !== undefined) {
        requireInput(object(value.heuristic), "Heuristic values must be an object.");
        for (const id of ["S", "A", "B", "G"]) {
            requireInput(finite(value.heuristic[id], 0, 1000), "Give each micrograph node a non-negative heuristic.");
            c.heuristic[id] = value.heuristic[id];
        }
    }
    return c;
}
