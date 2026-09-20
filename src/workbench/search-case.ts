// Weeks 2 and 3: one search loop, stepped. Week 2 runs Dijkstra on the real
// map from the kitchen to #03 with the open list in view. Week 3 runs the
// four-edge counterexample with an admissible, inconsistent heuristic and the
// reopen switch off, which returns cost 5; switching it on returns 4.

import type { FleetData, MapData, OrdersData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import { fromEdges, fromMap, straightLineTicks, type WeightedGraph } from "../engine/graph.ts";
import { admissible, consistent, Searcher, type SearchResult, type Step } from "../engine/search.ts";
import type { CaseDef, Control } from "./case.ts";
import { esc, table } from "./html.ts";
import { minimap } from "./minimap.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const orders = (ordersJson as OrdersData).orders;
const L = fleet.types.find((t) => t.id === "L")!;

export interface SearchState {
  graph: "four" | "map";
  heuristic: "zero" | "example" | "straight" | "composed" | "custom";
  reopen: boolean;
  /** Pops shown so far; -1 means run to the end. */
  shown: number;
  /** The rule composer: h = factor × distance ÷ speed. */
  compose?: { dist: "3d" | "2d"; factor: "0.5" | "1" | "2" };
  /** The escape hatch: the body of a function (node, goal, dist2d, dist3d, speed) → ticks. */
  custom?: string;
}

const DEFAULT_CUSTOM = "// a lower bound on the ticks from node to goal\nreturn Math.floor(dist3d(node, goal) / speed);";
const nodeOf = new Map(map.nodes.map((n) => [n.id, n]));
const dist2d = (a: string, b: string) => { const p = nodeOf.get(a)!, q = nodeOf.get(b)!; return Math.hypot(p.x - q.x, p.y - q.y); };
const dist3d = (a: string, b: string) => { const p = nodeOf.get(a)!, q = nodeOf.get(b)!; return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); };

function composedH(c: NonNullable<SearchState["compose"]>, goal: string): (id: string) => number {
  const f = Number(c.factor);
  return (id) => Math.floor((f * (c.dist === "3d" ? dist3d(id, goal) : dist2d(id, goal))) / L.speed);
}

/** Compiles the escape-hatch body. Runs in the page, so a body that never returns would hang
 *  it; the call budget catches a function that is merely expensive. */
function customH(body: string, goal: string): { h: (id: string) => number; error?: string } {
  let calls = 0;
  try {
    const fn = new Function("node", "goal", "dist2d", "dist3d", "speed", body) as (n: string, g: string, d2: typeof dist2d, d3: typeof dist3d, s: number) => unknown;
    const h = (id: string) => {
      if (++calls > 200000) throw new Error("call budget of 200 000 exceeded");
      const v = Number(fn(id, goal, dist2d, dist3d, L.speed));
      if (!Number.isFinite(v)) throw new Error(`h(${id}) is not a finite number`);
      return v;
    };
    h(goal);
    return { h };
  } catch (e) {
    return { h: () => 0, error: e instanceof Error ? e.message : String(e) };
  }
}

const FOUR = [
  { from: "S", to: "A", cost: 3 },
  { from: "S", to: "B", cost: 1 },
  { from: "B", to: "A", cost: 1 },
  { from: "A", to: "G", cost: 2 },
];
const FOUR_H: Record<string, number> = { S: 0, A: 0, B: 3, G: 0 };
const FOUR_POS: Record<string, [number, number]> = { S: [50, 100], B: [180, 40], A: [180, 160], G: [310, 100] };
const MAP_GOAL = orders[2].node; // #03, the house nearest the kitchen

function problem(state: SearchState): { graph: WeightedGraph; start: string; goal: string; h: (id: string) => number; error?: string } {
  if (state.graph === "four") {
    return { graph: fromEdges(FOUR), start: "S", goal: "G", h: state.heuristic === "example" ? (id) => FOUR_H[id] ?? 0 : () => 0 };
  }
  const graph = fromMap(map, L, "time");
  let h: (id: string) => number = () => 0;
  let error: string | undefined;
  if (state.heuristic === "straight") h = straightLineTicks(graph, L, MAP_GOAL);
  else if (state.heuristic === "composed") h = composedH(state.compose ?? { dist: "3d", factor: "1" }, MAP_GOAL);
  else if (state.heuristic === "custom") ({ h, error } = customH(state.custom ?? DEFAULT_CUSTOM, MAP_GOAL));
  return { graph, start: map.kitchen, goal: MAP_GOAL, h, error };
}

function run(state: SearchState): { result: SearchResult | null; steps: Step[]; finished: boolean; searcher: Searcher } {
  const { graph, start, goal, h } = problem(state);
  const searcher = new Searcher(graph, start, goal, { heuristic: h, reopenClosed: state.reopen });
  if (state.shown < 0) {
    const result = searcher.run();
    return { result, steps: result.steps, finished: true, searcher };
  }
  const steps: Step[] = [];
  for (let i = 0; i < state.shown; i++) {
    const s = searcher.step();
    if (!s) break;
    steps.push(s);
  }
  const result = searcher.result();
  return { result, steps, finished: result !== null, searcher };
}

function fourSvg(steps: Step[], result: SearchResult | null): string {
  const last = steps[steps.length - 1];
  const closed = new Set(last?.closed ?? []);
  const open = new Set((last?.open ?? []).map((e) => e.node));
  const onPath = new Set(result?.path ?? []);
  const edges = FOUR.map((e) => {
    const [x1, y1] = FOUR_POS[e.from], [x2, y2] = FOUR_POS[e.to];
    const inPath = result?.path && result.path.some((n, i) => i > 0 && result.path![i - 1] === e.from && n === e.to);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mm-edge${inPath ? " mm-route" : ""}" stroke-width="${inPath ? 5 : 2}"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" font-size="13" class="mm-label" text-anchor="middle">${e.cost}</text>`;
  }).join("");
  const nodes = Object.entries(FOUR_POS).map(([id, [x, y]]) => {
    const cls = ["mm-node", closed.has(id) ? "mm-marked" : "", open.has(id) ? "mm-open" : "", onPath.has(id) ? "mm-onpath" : ""].filter(Boolean).join(" ");
    return `<circle cx="${x}" cy="${y}" r="14" class="${cls}"/><text x="${x}" y="${y + 5}" font-size="14" text-anchor="middle" class="mm-label mm-nodelabel">${id}</text><text x="${x}" y="${y + 30}" font-size="11" text-anchor="middle" class="mm-label">h=${FOUR_H[id]}</text>`;
  }).join("");
  return `<svg viewBox="20 10 320 180" class="minimap minimap-small" role="img" aria-label="Four nodes S, A, B, G. Edges S to A cost 3, S to B cost 1, B to A cost 1, A to G cost 2. h is 0 at S, A and G, and 3 at B."><rect x="20" y="10" width="320" height="180" class="mm-bg"/>${edges}${nodes}</svg>`;
}

export const searchCase: CaseDef<SearchState> = {
  key: "search",
  weeks: [2, 3],
  caption: (week) =>
    week === 2
      ? { decision: "Trust the current shortest path only when the goal has been popped, not when it has been seen.", breaks: "Stopping when the goal is first generated." }
      : { decision: "An admissible heuristic still needs the implementation to reopen a closed node.", breaks: "Week 2's assumption that a settled node stays settled." },
  initial: (week) => (week === 2 ? { graph: "map", heuristic: "zero", reopen: true, shown: -1 } : { graph: "four", heuristic: "example", reopen: false, shown: -1 }),
  controls: (state, week): Control[] => {
    const controls: Control[] = [];
    if (state.graph === "four") {
      controls.push({ id: "reopen", label: `Reopen closed nodes: ${state.reopen ? "on" : "off"} — switch ${state.reopen ? "off" : "on"}`, kind: "button", primary: week === 3 });
      controls.push({ id: "heuristic", label: "Heuristic", kind: "select", value: state.heuristic, options: [{ value: "example", label: "the example h (admissible, not consistent)" }, { value: "zero", label: "h = 0 (Dijkstra)" }] });
    } else {
      controls.push({ id: "heuristic", label: "Heuristic", kind: "select", value: state.heuristic, options: [
        { value: "zero", label: "h = 0 (Dijkstra)" },
        { value: "straight", label: "straight line ÷ speed (A*)" },
        { value: "composed", label: "compose one: factor × distance ÷ speed" },
        { value: "custom", label: "write one as code" },
      ] });
      if (state.heuristic === "composed") {
        const c = state.compose ?? { dist: "3d", factor: "1" };
        controls.push({ id: "dist", label: "Distance", kind: "select", value: c.dist, options: [{ value: "3d", label: "straight line in 3D" }, { value: "2d", label: "straight line on the map (2D)" }] });
        controls.push({ id: "factor", label: "Factor", kind: "select", value: c.factor, options: [{ value: "0.5", label: "× 0.5" }, { value: "1", label: "× 1" }, { value: "2", label: "× 2" }] });
      }
      if (state.heuristic === "custom") controls.push({ id: "code", label: "h(node, goal) body — dist2d, dist3d and speed are in scope; runs in this page", kind: "code", value: state.custom ?? DEFAULT_CUSTOM });
    }
    controls.push({ id: "step", label: state.shown < 0 ? "Step through from the start" : "Next expansion", kind: "button", primary: week === 2 });
    if (state.shown >= 0) controls.push({ id: "run", label: "Run to the end", kind: "button" });
    return controls;
  },
  apply: (state, action) => {
    switch (action.id) {
      case "reopen": return { ...state, reopen: !state.reopen, shown: -1 };
      case "heuristic": return { ...state, heuristic: (action.value as SearchState["heuristic"]) ?? state.heuristic, shown: -1 };
      case "dist": return { ...state, compose: { ...(state.compose ?? { dist: "3d", factor: "1" }), dist: action.value === "2d" ? "2d" : "3d" }, shown: -1 };
      case "factor": return { ...state, compose: { ...(state.compose ?? { dist: "3d", factor: "1" }), factor: (action.value as "0.5" | "1" | "2") ?? "1" }, shown: -1 };
      case "code": return { ...state, heuristic: "custom", custom: action.value ?? DEFAULT_CUSTOM, shown: -1 };
      case "step": return { ...state, shown: state.shown < 0 ? 1 : state.shown + 1 };
      case "run": return { ...state, shown: -1 };
      default: return state;
    }
  },
  render: (state) => {
    const t0 = Date.now();
    const { result, steps, finished } = run(state);
    const { graph, goal, h, error } = problem(state);
    const last = steps[steps.length - 1];
    const parts: string[] = [];

    if (state.graph === "map" && (state.heuristic === "composed" || state.heuristic === "custom")) {
      if (error) parts.push(`<p class="wb-summary wb-error"><strong>Your function did not run:</strong> ${esc(error)}. h = 0 was used instead.</p>`);
      const adm = admissible(graph, h, goal), con = consistent(graph, h);
      const code = state.heuristic === "composed"
        ? `h = (node) => Math.floor(${state.compose?.factor ?? "1"} * dist${state.compose?.dist === "2d" ? "2d" : "3d"}(node, goal) / speed)`
        : "your function";
      const zero = new Searcher(graph, map.kitchen, goal).run();
      parts.push(`<p class="wb-summary"><code>${esc(code)}</code> — on this graph it is <strong>${adm.ok ? "admissible" : `not admissible: h(${adm.violations[0].node}) = ${adm.violations[0].h} but the true cost to go is ${adm.violations[0].exact}`}</strong> and <strong>${con.ok ? "consistent" : `not consistent: at ${con.violations[0].from} → ${con.violations[0].to}, h = ${con.violations[0].h} but cost + h = ${con.violations[0].cost + con.violations[0].hTo}`}</strong>. Expansions: ${result?.expansions ?? steps.length} with it, ${zero.expansions} with h = 0${result && result.status === "found" ? `; cost found ${result.cost}${result.cost !== zero.cost ? ` — <strong>Dijkstra finds ${zero.cost}: the answer is wrong</strong>` : ", the same as Dijkstra"}` : ""}.</p>`);
    }

    // the picture
    if (state.graph === "four") parts.push(fourSvg(steps, result));
    else parts.push(minimap(map, { marked: last?.closed ?? [], open: (last?.open ?? []).map((e) => e.node), routes: result?.path ? [{ path: result.path, cls: "route-found", label: "the route found" }] : [], orders: orders.filter((o) => o.node === goal), box: [0, 0, 1000, 1000], ariaLabel: `The kitchen's quarter of Slop Hill. Expanded nodes are filled, the open list is ringed${result?.path ? ", the route found is drawn thick" : ""}.` }));

    // the summary
    if (finished && result) {
      const line = result.status === "found"
        ? `<strong>Found</strong>: cost ${result.cost}, path ${result.path!.join(" → ")}, ${result.expansions} expansions, ${result.queueOps} queue operations.`
        : `<strong>${result.status === "budget" ? "Stopped at the expansion budget" : "No solution"}</strong> after ${result.expansions} expansions.`;
      parts.push(`<p class="wb-summary">${line}</p>`);
      if (state.graph === "four") {
        const adm = admissible(graph, h, goal), con = consistent(graph, h);
        const verdict = state.heuristic === "example"
          ? `h is ${adm.ok ? "admissible" : "not admissible"} and ${con.ok ? "consistent" : `not consistent: at ${con.violations[0].from}→${con.violations[0].to}, h=${con.violations[0].h} but cost + h(${con.violations[0].to}) = ${con.violations[0].cost + con.violations[0].hTo}`}.`
          : "h = 0 is admissible and consistent; this is Dijkstra.";
        const bug = result.cost === 5 ? ` <strong>This is the wrong answer.</strong> The best path costs 4: B reached A with g = 2 after A had been expanded, and with reopening off that improvement was dropped.` : result.cost === 4 && state.heuristic === "example" ? ` With reopening on, A is expanded twice and the search returns the true cost.` : "";
        parts.push(`<p>${esc(verdict)}${bug}</p>`);
      }
    } else {
      parts.push(`<p class="wb-summary">${steps.length} expansion${steps.length === 1 ? "" : "s"} so far; the goal has not been popped.</p>`);
    }

    // the pops so far
    if (steps.length) {
      parts.push(table(
        [{ key: "n", label: "#", align: "right" }, { key: "popped", label: "popped" }, { key: "g", label: "g", align: "right" }, { key: "f", label: "f", align: "right" }, { key: "note", label: "what happened" }],
        steps.map((s) => ({
          n: s.n, popped: s.popped, g: s.g, f: s.f,
          note: s.stale ? "stale entry, skipped" : s.relaxed.length === 0 ? (s.popped === goal ? "goal popped: done" : "no neighbours") : s.relaxed.map((r) => `${r.to}: g ${r.newG}${r.improved ? (r.reopened ? " (reopened)" : r.oldG === undefined ? " (new)" : ` (was ${r.oldG})`) : r.skippedClosed ? ` (better, but closed: ignored)` : ` (not better than ${r.oldG})`}`).join("; "),
        })),
        "Expansions, in order",
        (r) => (String(r.note).includes("ignored") ? "wb-bad" : String(r.note).includes("reopened") ? "wb-good" : ""),
      ));
    }

    // the open list after the last pop
    if (last && last.open.length) {
      parts.push(table(
        [{ key: "node", label: "node" }, { key: "g", label: "g", align: "right" }, { key: "h", label: "h", align: "right" }, { key: "f", label: "f", align: "right" }, { key: "parent", label: "parent" }],
        last.open.map((e) => ({ node: e.node, g: e.g, h: e.h, f: e.f, parent: e.parent ?? "—" })),
        `OPEN after expansion ${last.n}${last.closed.length ? ` · CLOSED: ${last.closed.join(", ")}` : ""}`,
      ));
    }

    const ms = Date.now() - t0;
    const status = `computed in your browser · ${result ? result.expansions : steps.length} expansions · ${ms} ms · engine 0.1 · ${state.graph === "four" ? "case four-edge counterexample" : `case kitchen → ${orders[2].id}, type L, time`}`;
    return { html: parts.join(""), status };
  },
};
