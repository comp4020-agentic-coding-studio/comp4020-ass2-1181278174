import { fingerprint, type LabConfig, type SlotKey, type Strategy } from "./model.ts";
import type { Objective } from "../engine/timetable.ts";
export const slotNames: Record<SlotKey, string> = {
    h: "h(node, goal, state)", dominates: "dominates(a, b)", withinBudget: "withinBudget(label, budget)",
    orderKey: "orderKey(order, state)", objective: "objective(plan)", assignCost: "assignCost(drone, order, state)", priority: "priority(tasks, state)",
};
export const presets: Record<SlotKey, {
    id: string;
    label: string;
}[]> = {
    h: [{ id: "zero", label: "Zero · Dijkstra" }, { id: "distance", label: "Straight-line time lower bound" }, { id: "example", label: "The micrograph's h values" }],
    dominates: [{ id: "pareto", label: "Time and energy · Pareto" }, { id: "time", label: "Time only · diagnostic" }, { id: "weighted", label: "Weighted sum · diagnostic" }],
    withinBudget: [{ id: "reserve", label: "Keep the required reserve" }, { id: "strict", label: "Strictly below the budget" }, { id: "ignore", label: "Ignore energy · diagnostic" }],
    orderKey: [{ id: "edf", label: "Earliest deadline" }, { id: "fifo", label: "Ready time first" }, { id: "trip", label: "Shortest trip first" }],
    objective: [{ id: "course", label: "Course objective · lateness first" }, { id: "delivery", label: "Teaching contrast · delivery sum" }, { id: "return", label: "Teaching contrast · final return" }],
    assignCost: [{ id: "completion", label: "Predicted completion" }, { id: "count", label: "Fewest assigned orders" }, { id: "waits", label: "Include actual resource waits" }],
    priority: [{ id: "drone", label: "Drone ID ascending" }, { id: "reverse", label: "Drone ID descending" }, { id: "promised", label: "Promised delivery first" }],
};
const names: Record<SlotKey, string[]> = { h: ["node", "goal", "state"], dominates: ["a", "b"], withinBudget: ["label", "budget"], orderKey: ["order", "state"], objective: ["plan"], assignCost: ["drone", "order", "state"], priority: ["tasks", "state"] };
export function sourceFor(key: SlotKey, s: Strategy): string {
    if (s.mode === "custom")
        return s.code;
    const factor = s.mode === "composed" ? s.factor : 1, secondary = s.mode === "composed" ? s.secondary : 1;
    if (key === "h")
        return s.preset === "zero" ? "return 0;" : s.preset === "example" ? "return state.example[node.id] ?? 0;" : "return Math.floor(" + factor + " * Math.hypot(node.x-goal.x, node.y-goal.y) / state.speed);";
    if (key === "dominates")
        return s.preset === "time" ? "return a.time < b.time;" : s.preset === "weighted" ? "return " + factor + " * a.time + " + secondary + " * a.energy < " + factor + " * b.time + " + secondary + " * b.energy;" : "return a.time <= b.time && a.energy <= b.energy && (a.time < b.time || a.energy < b.energy);";
    if (key === "withinBudget")
        return s.preset === "ignore" ? "return true;" : "return label.energy " + (s.preset === "strict" ? "<" : "<=") + " budget * " + factor + ";";
    if (key === "orderKey")
        return s.mode === "composed" ? "return " + factor + " * (order.promised - state.now) + " + secondary + " * state.trip;" : s.preset === "fifo" ? "return order.ready;" : s.preset === "trip" ? "return state.trip;" : "return order.promised;";
    if (key === "objective" && s.mode === "composed")
        return "return [" + factor + " * plan.lateness + " + secondary + " * plan.allReturned, plan.energy];";
    if (key === "objective")
        return s.preset === "delivery" ? "return [plan.sumDelivery, plan.lateness, plan.energy];" : s.preset === "return" ? "return [plan.allReturned, plan.lateness, plan.energy];" : "return [plan.lateness, plan.allReturned, plan.energy];";
    if (key === "assignCost")
        return s.preset === "count" ? "return state.count;" : s.preset === "waits" || s.mode === "composed" ? "return " + factor + " * state.predicted + " + secondary + " * state.wait;" : "return state.predicted;";
    return s.preset === "promised" || s.mode === "composed" ? "return tasks.slice().sort((a,b) => " + factor + " * (a.promised-b.promised) || " + secondary + " * a.drone.localeCompare(b.drone)).map(t => t.drone);" : "return tasks.map(t => t.drone).sort()" + (s.preset === "reverse" ? ".reverse()" : "") + ";";
}
function freeze(value: any): any {
    if (value && typeof value === "object") {
        for (const v of Object.values(value))
            freeze(v);
        Object.freeze(value);
    }
    return value;
}
export function compileStrategies(config: LabConfig, allowCustom = false) {
    const functions = new Map<SlotKey, Function>();
    const call = (key: SlotKey, args: unknown[]): any => {
        let f = functions.get(key);
        if (!f) {
            const s = config.strategies[key];
            if (s.mode === "custom" && !allowCustom)
                throw new Error("Review the imported function, then choose Run this strategy.");
            try {
                f = new Function(...names[key], '"use strict";\n' + sourceFor(key, s));
            }
            catch (e) {
                throw new Error(key + ": " + (e as Error).message);
            }
            functions.set(key, f!);
        }
        try {
            return f!(...args.map(a => freeze(structuredClone(a))));
        }
        catch (e) {
            throw new Error(key + ": " + (e as Error).message);
        }
    };
    const number = (key: SlotKey, args: unknown[], nonnegative = false) => {
        const n = call(key, args);
        if (typeof n !== "number" || !Number.isFinite(n) || (nonnegative && n < 0))
            throw new Error(key + " must return a finite" + (nonnegative ? ", non-negative" : "") + " number.");
        return n;
    };
    const boolean = (key: SlotKey, args: unknown[]) => {
        const value = call(key, args);
        if (typeof value !== "boolean")
            throw new Error(key + " must return true or false.");
        return value;
    };
    const objective = (plan: Objective): number[] => {
        const v = call("objective", [plan]);
        if (!Array.isArray(v) || v.length < 1 || v.length > 5 || v.some(n => typeof n !== "number" || !Number.isFinite(n)))
            throw new Error("objective must return one to five finite numbers.");
        return v;
    };
    return {
        h: (node: unknown, goal: unknown, state: unknown) => number("h", [node, goal, state], true),
        dominates: (a: {
            time: number;
            energy: number;
        }, b: {
            time: number;
            energy: number;
        }) => boolean("dominates", [{ time: a.time, energy: a.energy }, { time: b.time, energy: b.energy }]),
        withinBudget: (label: {
            time: number;
            energy: number;
        }, budget: number) => boolean("withinBudget", [label, budget]),
        orderKey: (order: unknown, state: unknown) => number("orderKey", [order, state]),
        assignCost: (drone: unknown, order: unknown, state: unknown) => number("assignCost", [drone, order, state]),
        priority: (tasks: unknown[], state: unknown = {}) => {
            const value = call("priority", [tasks, state]);
            if (!Array.isArray(value) || value.some(v => typeof v !== "string"))
                throw new Error("priority must return an array of drone IDs.");
            return value as string[];
        },
        objective,
        compare: (a?: Objective, b?: Objective) => {
            if (!a || !b)
                return a ? -1 : b ? 1 : 0;
            const aa = objective(a), bb = objective(b);
            if (aa.length !== bb.length)
                throw new Error("objective must return a stable number of terms.");
            for (let i = 0; i < aa.length; i++)
                if (aa[i] !== bb[i])
                    return aa[i] - bb[i];
            return 0;
        },
        hashes: Object.fromEntries(Object.entries(config.strategies).map(([key, s]) => [key, fingerprint(sourceFor(key as SlotKey, s))])),
    };
}
