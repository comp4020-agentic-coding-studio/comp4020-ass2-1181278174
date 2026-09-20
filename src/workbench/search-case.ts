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
  heuristic: "zero" | "example" | "straight";
  reopen: boolean;
  /** Pops shown so far; -1 means run to the end. */
  shown: number;
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

function problem(state: SearchState): { graph: WeightedGraph; start: string; goal: string; h: (id: string) => number } {
  if (state.graph === "four") {
    return { graph: fromEdges(FOUR), start: "S", goal: "G", h: state.heuristic === "example" ? (id) => FOUR_H[id] ?? 0 : () => 0 };
  }
  const graph = fromMap(map, L, "time");
  return { graph, start: map.kitchen, goal: MAP_GOAL, h: state.heuristic === "straight" ? straightLineTicks(graph, L, MAP_GOAL) : () => 0 };
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
      controls.push({ id: "heuristic", label: "Heuristic", kind: "select", value: state.heuristic, options: [{ value: "zero", label: "h = 0 (Dijkstra)" }, { value: "straight", label: "straight line ÷ speed (A*)" }] });
    }
    controls.push({ id: "step", label: state.shown < 0 ? "Step through from the start" : "Next expansion", kind: "button", primary: week === 2 });
    if (state.shown >= 0) controls.push({ id: "run", label: "Run to the end", kind: "button" });
    return controls;
  },
  apply: (state, action) => {
    switch (action.id) {
      case "reopen": return { ...state, reopen: !state.reopen, shown: -1 };
      case "heuristic": return { ...state, heuristic: (action.value as SearchState["heuristic"]) ?? state.heuristic, shown: -1 };
      case "step": return { ...state, shown: state.shown < 0 ? 1 : state.shown + 1 };
      case "run": return { ...state, shown: -1 };
      default: return state;
    }
  },
  render: (state) => {
    const t0 = Date.now();
    const { result, steps, finished } = run(state);
    const { graph, goal, h } = problem(state);
    const last = steps[steps.length - 1];
    const parts: string[] = [];

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
