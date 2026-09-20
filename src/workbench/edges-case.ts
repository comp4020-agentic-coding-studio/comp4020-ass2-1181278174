// Week 1: the kitchen's block. Three candidate routes to #03 with their
// costs, and straight connections that look like streets but are not: the
// check says which building each one passes through.

import type { FleetData, MapData, MapNode, OrdersData } from "../data/schema.ts";
import fleetJson from "../data/fleet.json";
import mapJson from "../data/map.json";
import ordersJson from "../data/orders.json";
import { blockedBy } from "../engine/geometry.ts";
import { edgeTicks, fromMap } from "../engine/graph.ts";
import { search } from "../engine/search.ts";
import type { CaseDef, Control } from "./case.ts";
import { esc, table } from "./html.ts";
import { minimap } from "./minimap.ts";

const map = mapJson as MapData;
const fleet = fleetJson as FleetData;
const orders = (ordersJson as OrdersData).orders;
const L = fleet.types.find((t) => t.id === "L")!;
const BOX: [number, number, number, number] = [0, 0, 800, 800];
const node = (id: string) => map.nodes.find((n) => n.id === id)!;
const inBlock = (n: MapNode) => n.x <= BOX[2] && n.y <= BOX[3];
const blockNodes = map.nodes.filter(inBlock);
const goal = orders[2].node; // #03
const fullGraph = fromMap(map, L, "time");
const blockIds = new Set(blockNodes.map((n) => n.id));
const graph = { nodeIds: () => [...blockIds], neighbours: (id: string) => fullGraph.neighbours(id).filter((e) => blockIds.has(e.to)) };

/** Straight connections between block nodes that are not streets. */
const proposals = (() => {
  const streets = new Set(map.edges.map((e) => `${e.from}|${e.to}`));
  const out: { id: string; from: string; to: string }[] = [];
  for (const a of blockNodes) for (const b of blockNodes) {
    if (a.id >= b.id || streets.has(`${a.id}|${b.id}`)) continue;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 450) out.push({ id: `${a.id}>${b.id}`, from: a.id, to: b.id });
  }
  return out.sort((x, y) => x.id.localeCompare(y.id));
})();

function routeCost(path: string[]): number {
  let t = 0;
  for (let i = 1; i < path.length; i++) t += edgeTicks(map.edges.find((e) => e.from === path[i - 1] && e.to === path[i])!, L);
  return t;
}

/** Three routes: the shortest, the shortest avoiding its first street, and the shortest avoiding its last. */
function threeRoutes(): { name: string; path: string[]; ticks: number }[] {
  const best = search(graph, map.kitchen, goal);
  if (best.status !== "found") return [];
  const avoid = (skip: [string, string]) => {
    const g = { nodeIds: () => graph.nodeIds(), neighbours: (id: string) => graph.neighbours(id).filter((n) => !(id === skip[0] && n.to === skip[1])) };
    const r = search(g, map.kitchen, goal);
    return r.status === "found" ? r.path! : null;
  };
  const p = best.path!;
  const routes = [{ name: "A — the shortest", path: p, ticks: best.cost! }];
  const b = avoid([p[0], p[1]]);
  if (b) routes.push({ name: "B — not using A's first street", path: b, ticks: routeCost(b) });
  const c = avoid([p[p.length - 2], p[p.length - 1]]);
  if (c && (!b || c.join() !== b.join())) routes.push({ name: "C — not using A's last street", path: c, ticks: routeCost(c) });
  return routes;
}

export interface EdgesState {
  proposal: string;
}

export const edgesCase: CaseDef<EdgesState> = {
  key: "edges",
  weeks: [1],
  caption: () => ({
    decision: "Which connections are edges at all: two legal endpoints do not make a legal street if the line between them passes through a building.",
    breaks: "Drawing a line from the kitchen to the customer and calling it a route.",
  }),
  initial: () => ({ proposal: proposals.find((p) => blockedBy([[node(p.from).x, node(p.from).y], [node(p.to).x, node(p.to).y]], map.buildings).length > 0)?.id ?? proposals[0]?.id ?? "" }),
  controls: (state): Control[] => [
    { id: "proposal", label: "Check this connection", kind: "select", primary: true, value: state.proposal, options: proposals.map((p) => ({ value: p.id, label: `${p.from} → ${p.to}` })) },
  ],
  apply: (state, action) => (action.id === "proposal" && action.value ? { proposal: action.value } : state),
  render: (state) => {
    const t0 = Date.now();
    const parts: string[] = [];
    const routes = threeRoutes();
    const prop = proposals.find((p) => p.id === state.proposal) ?? proposals[0];
    const a = node(prop.from), b = node(prop.to);
    const line: [number, number][] = [[a.x, a.y], [b.x, b.y]];
    const blocked = blockedBy(line, map.buildings);
    parts.push(minimap(map, {
      routes: [...routes.map((r, i) => ({ path: r.path, cls: i === 0 ? "route-chosen" : "route-found", label: r.name })), { path: [prop.from, prop.to], cls: blocked.length ? "route-fastest" : "route-proposal", label: `the connection checked: ${prop.from} → ${prop.to}` }],
      orders: orders.filter((o) => o.node === goal || o.node === orders[4].node),
      box: BOX, focus: [prop.from, prop.to], blockedBuildings: blocked.map((b) => b.id),
      ariaLabel: `The kitchen's block: ${routes.length} candidate routes to ${orders[2].id} and the straight connection ${prop.from} → ${prop.to} being checked.`,
    }));
    parts.push(`<p class="wb-summary"><strong>${esc(prop.from)} → ${esc(prop.to)}:</strong> ${blocked.length ? `not a legal edge — it passes through ${blocked.map((x) => x.id).join(" and ")}. Both endpoints are streets; the line between them is not.` : "no building in the way. It could be a street; it is not one on this map, so it is not an edge either."}</p>`);
    parts.push(table(
      [{ key: "name", label: "route" }, { key: "path", label: "streets" }, { key: "ticks", label: "time for L (s)", align: "right" }],
      routes.map((r) => ({ name: r.name, path: r.path.join(" → "), ticks: r.ticks })),
      `${routes.length} candidate routes from the kitchen to ${orders[2].id}, costed edge by edge`,
    ));
    const ms = Date.now() - t0;
    return { html: parts.join(""), status: `computed in your browser · ${routes.length} routes, ${proposals.length} connections checkable · ${ms} ms · engine 0.1 · case the kitchen's block` };
  },
};
