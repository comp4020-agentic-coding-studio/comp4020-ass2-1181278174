import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import fleetJson from "../data/fleet.json";
import rulesJson from "../data/rules.json";
import referenceJson from "../data/reference.json";
import type { MapData, FleetData, RulesData, Order } from "../data/schema.ts";
import type { World, Assignment, FleetPlan } from "../engine/fleet.ts";
import type { Movement } from "../engine/motion.ts";
import type { PlanCheck } from "../engine/check-plan.ts";
import type { Objective } from "../engine/timetable.ts";
export const ENGINE_VERSION = "lab-1.0";
export const canonical: World = { map: mapJson as MapData, orders: ordersJson.orders as Order[], fleet: fleetJson as FleetData, rules: rulesJson as unknown as RulesData };
export const reference = referenceJson;
export type SlotKey = "h" | "dominates" | "withinBudget" | "orderKey" | "objective" | "assignCost" | "priority";
export interface Strategy {
    mode: "preset" | "composed" | "custom";
    preset: string;
    factor: number;
    secondary: number;
    code: string;
}
export interface SymbolicJob {
    id: string;
    ready: number;
    promised: number;
    d: number;
    p: number;
}
export interface MicroEdge {
    from: string;
    to: string;
    cost: number;
}
export interface Scenario {
    pads: number;
    drones: {
        id: string;
        type: "L" | "H";
    }[];
    addedOrders: Order[];
    closures: {
        start: number;
        end: number;
    }[];
}
export interface LabConfig {
    version: 2;
    week: number;
    caseId: string;
    target: string;
    drone: "L" | "H";
    method: string;
    diagnostic: boolean;
    arrangement: "both" | "wait" | "detour";
    candidate?: number;
    sequence: string[];
    assignment?: Assignment;
    requestedDepartures: Record<string, number>;
    routeCandidates: Record<string, number>;
    strategies: Record<SlotKey, Strategy>;
    scenario: Scenario;
    jobs: SymbolicJob[];
    graph: MicroEdge[];
    heuristic: Record<string, number>;
    maxCandidates: number;
    maxExpansions: number;
    includeWaits: boolean;
}
export interface Selection {
    kind: "node" | "label" | "task" | "resource" | "move" | "search" | "route";
    id: string;
}
export interface Row {
    id: string;
    values: (string | number)[];
    selection?: Selection;
    detail?: string;
    tone?: "good" | "bad";
    path?: string[];
}
export interface LabTable {
    id: string;
    title: string;
    headers: string[];
    rows: Row[];
    primary?: boolean;
}
export interface Metric {
    key: string;
    label: string;
    value: string | number;
    unit?: string;
}
export interface Trace {
    id: string;
    title: string;
    detail: string;
    node?: string;
    path?: string[];
    tick?: number;
    energy?: number;
    phase?: string;
}
export interface Route {
    id: string;
    label: string;
    path: string[];
    color: string;
    dashed?: boolean;
    diagnostic?: boolean;
    order?: string;
}
export interface FlightEvent extends Movement {
    id: string;
    drone: string;
    order: string;
    phase: "out" | "back" | "service" | "load" | "charge" | "turnaround" | "pad-queue";
}
export interface SceneData {
    map: MapData;
    orders: Order[];
    routes: Route[];
    events: FlightEvent[];
    pads?: number;
    droneTypes?: Record<string, string>;
    blockedBuildings?: string[];
    focusNodes?: string[];
    legOnly?: boolean;
}
export interface LabRun {
    format: "slop3969-lab-run";
    version: 2;
    input: LabConfig;
    inputHash: string;
    modelHash: string;
    engine: string;
    strategyHashes?: Record<string, string>;
    strategySources?: Record<string, string>;
    created: string;
    elapsed: number;
    status: "verified" | "diagnostic" | "no-solution" | "budget";
    summary: string;
    assumptions: string[];
    metrics: Metric[];
    tables: LabTable[];
    trace: Trace[];
    scene?: SceneData;
    timeline: {
        id: string;
        lane: string;
        start: number;
        end: number;
        label: string;
        kind: string;
        selection?: Selection;
    }[];
    objective?: Objective;
    check?: PlanCheck;
    plan?: FleetPlan;
    assignment?: Assignment;
    comparisons?: {
        label: string;
        value: string;
        sameModel: boolean;
    }[];
}
export interface Lesson {
    title: string;
    question: string;
    adds: string;
    cases: {
        id: string;
        label: string;
    }[];
    slots: SlotKey[];
    primary: string;
}
export const lessons: Record<number, Lesson> = {
    1: { title: "Which connections are legal?", question: "Two legal endpoints: can the edge still cross a building?", adds: "A directed graph and legal edges", cases: [{ id: "block", label: "The kitchen block · #03 and #05" }], slots: [], primary: "Check another connection" },
    2: { title: "When can Dijkstra stop?", question: "Is discovering the goal enough, or must its best entry be popped?", adds: "The search frontier and relaxation", cases: [{ id: "discovery", label: "Goal-discovery counterexample" }, { id: "canonical", label: "Kitchen → #03 on Slop Hill" }, { id: "source-goal", label: "Source equals goal" }, { id: "unreachable", label: "Unreachable goal" }], slots: ["h"], primary: "Try stopping on discovery" },
    3: { title: "A better path reaches a closed node", question: "Can an admissible heuristic still return the wrong answer?", adds: "Heuristics and reopening", cases: [{ id: "reopen", label: "The four-edge counterexample" }, { id: "canonical", label: "Compare on Slop Hill" }], slots: ["h"], primary: "Change the reopening rule" },
    4: { title: "The fastest route may not bring you home", question: "Which time–energy labels must survive until the return is checked?", adds: "Payload, service, return energy and reserve", cases: [{ id: "hilltop", label: "#07 · ridge and contour on Slop Hill" }, { id: "labels", label: "Two labels at Q · worked example" }], slots: ["dominates", "withinBudget"], primary: "Try keeping only the fastest label" },
    5: { title: "One drone, six dinner orders", question: "How does moving one order change every departure after it?", adds: "Ready times, deadlines and the objective", cases: [{ id: "canonical-six", label: "#01–#06 · real flight costs" }, { id: "six-jobs", label: "Editable six-job teaching table" }], slots: ["orderKey", "objective"], primary: "Compare earliest deadline with FIFO" },
    6: { title: "One more swap — or already the best?", question: "Does checking every pair swap prove a global optimum?", adds: "Neighbourhoods, acceptance and exact comparison", cases: [{ id: "six-jobs", label: "Local-optimum counterexample · six jobs" }, { id: "canonical-six", label: "#01–#06 · real flight costs" }], slots: ["orderKey", "objective"], primary: "Enumerate all 720 sequences" },
    7: { title: "Which drone takes which order?", question: "Can you balance the workload while respecting payload and range?", adds: "Drone capabilities and assignment", cases: [{ id: "ten-orders", label: "#01–#09 and #20 · mixed fleet" }], slots: ["assignCost"], primary: "Assign by predicted completion" },
    8: { title: "A shared charger changes the next flight", question: "Which other drone is delayed when you move an order?", adds: "The shared FCFS charging queue", cases: [{ id: "ten-orders", label: "Ten orders · two shared pads" }, { id: "one-pad", label: "#01–#04 · A and B sharing one pad" }, { id: "evening", label: "Extension · the full evening" }], slots: ["assignCost"], primary: "Recompute after a migration" },
    9: { title: "Same place, different possible futures", question: "What disappears when the search remembers only the node?", adds: "Whole occupancy intervals and waiting states", cases: [{ id: "corridor", label: "#13 · two routes, one corridor" }, { id: "waiting", label: "P at 3 s → G at 8 s · state diagnostic" }], slots: [], primary: "Try waiting for the corridor" },
    10: { title: "Plan around an existing reservation", question: "Who waits when you change which drone is planned first?", adds: "Space-time search and planning priority", cases: [{ id: "two-tasks", label: "Two complete tasks · synchronised loading" }], slots: ["priority"], primary: "Reverse the planning priority" },
    11: { title: "Let real route costs change the assignment", question: "Will a different assignment still improve after every queue is recomputed?", adds: "Feedback from routes and shared resources", cases: [{ id: "evening", label: "All twenty orders · linked improvement" }], slots: ["assignCost", "priority"], primary: "Run feedback improvement" },
    12: { title: "Twenty dinners, explained event by event", question: "Can another person reproduce the run and trace one failure?", adds: "Replay, independent checking and a reproducible record", cases: [{ id: "evening", label: "All twenty orders · reference or your plan" }], slots: ["priority"], primary: "Inspect the greedy plan's late orders" },
};
export const symbolicJobs: SymbolicJob[] = [
    { id: "A", ready: 5, d: 3, p: 6, promised: 9 }, { id: "B", ready: 6, d: 1, p: 2, promised: 13 }, { id: "C", ready: 3, d: 6, p: 12, promised: 12 },
    { id: "D", ready: 4, d: 6, p: 12, promised: 28 }, { id: "E", ready: 1, d: 5, p: 10, promised: 25 }, { id: "F", ready: 6, d: 4, p: 8, promised: 22 },
];
export const microEdges: MicroEdge[] = [{ from: "S", to: "A", cost: 3 }, { from: "S", to: "B", cost: 1 }, { from: "B", to: "A", cost: 1 }, { from: "A", to: "G", cost: 2 }];
export function fingerprint(value: unknown): string {
    const stable = (x: any): any => Array.isArray(x) ? x.map(stable) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
    const text = JSON.stringify(stable(value));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return "fnv1a32:" + (hash >>> 0).toString(16).padStart(8, "0");
}
export function defaultConfig(week = 4): LabConfig {
    const strategy = (preset: string): Strategy => ({ mode: "preset", preset, factor: 1, secondary: 1, code: "" });
    return {
        version: 2, week, caseId: lessons[week].cases[0].id, target: week <= 2 ? "#03" : "#07", drone: "L",
        method: week === 5 ? "fifo" : week === 6 ? "swaps" : week === 7 ? "equal-counts" : week === 12 ? "reference" : "greedy",
        diagnostic: week === 3, arrangement: "both", sequence: [], requestedDepartures: {}, routeCandidates: {},
        strategies: { h: strategy(week === 3 ? "example" : "zero"), dominates: strategy("pareto"), withinBudget: strategy("reserve"), orderKey: strategy("edf"), objective: strategy("course"), assignCost: strategy("completion"), priority: strategy("drone") },
        scenario: { pads: 2, drones: structuredClone(week === 7 ? canonical.fleet.drones.filter(d => ["A", "B", "D"].includes(d.id)) : canonical.fleet.drones), addedOrders: [], closures: [] }, jobs: structuredClone(symbolicJobs), graph: structuredClone(microEdges), heuristic: { S: 0, A: 0, B: 3, G: 0 }, maxCandidates: 120, maxExpansions: 10000, includeWaits: false,
    };
}
export function worldFor(config: LabConfig): World {
    let orders = canonical.orders;
    if (config.caseId === "hilltop" || config.caseId === "canonical")
        orders = orders.filter(o => o.id === config.target);
    if (config.caseId === "canonical-six")
        orders = orders.slice(0, 6);
    if (config.caseId === "ten-orders")
        orders = [...orders.slice(0, 9), orders[19]];
    if (config.caseId === "one-pad")
        orders = orders.slice(0, 4);
    if (["ten-orders", "evening"].includes(config.caseId))
        orders = [...orders, ...config.scenario.addedOrders];
    const drones = config.caseId === "one-pad" ? canonical.fleet.drones.slice(0, 2) : config.scenario.drones;
    return { map: canonical.map, orders: structuredClone(orders), fleet: { ...canonical.fleet, drones: structuredClone(drones) }, rules: { ...canonical.rules, resources: { ...canonical.rules.resources, pads: { capacity: config.caseId === "one-pad" ? 1 : config.scenario.pads } } } };
}
export function modelAssumptions(c: LabConfig): string[] {
    if (["six-jobs", "labels", "discovery", "reopen", "waiting", "source-goal", "unreachable"].includes(c.caseId))
        return ["Symbolic teaching case", c.caseId === "waiting" ? "Seconds; capacity one" : "Published example units; not flight-model totals", lessons[c.week].adds];
    return [c.week < 4 ? "Flight time only" : c.week < 7 ? "One drone; complete trips" : "Mixed fleet; complete trips", c.week >= 8 ? "Shared charging, FCFS" : "No shared charging in this model", c.week >= 9 ? "Corridor capacity one" : "Corridor reservations not active"];
}
