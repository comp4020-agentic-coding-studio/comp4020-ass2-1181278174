// The 2D map as inline SVG: streets, buildings, the corridor, named places,
// and whatever the current view wants highlighted. It is the side view on most
// weeks and the poster behind the 3D view on the rest.

import type { MapData, Order } from "../data/schema.ts";
import { esc } from "./html.ts";

export interface MinimapOptions {
  /** Node ids to fill (expanded, visited, waiting…). */
  marked?: string[];
  /** Node ids drawn as the frontier. */
  open?: string[];
  /** Routes as node id sequences, drawn thick; each with a class name. */
  routes?: { path: string[]; cls: string; label?: string }[];
  /** Orders to label by id at their node. */
  orders?: Order[];
  /** Zoom to a box [x0, y0, x1, y1] in map metres. */
  box?: [number, number, number, number];
  ariaLabel: string;
}

export function minimap(map: MapData, opts: MinimapOptions): string {
  const H = map.world.height;
  const node = new Map(map.nodes.map((n) => [n.id, n]));
  const sy = (y: number) => H - y;
  const [x0, y0, x1, y1] = opts.box ?? [0, 0, map.world.width, map.world.height];
  const view = `${x0} ${H - y1} ${x1 - x0} ${y1 - y0}`;
  const stroke = Math.max(4, (x1 - x0) / 400);

  const buildings = map.buildings
    .map((b) => `<rect x="${b.x}" y="${sy(b.y + b.d)}" width="${b.w}" height="${b.d}" class="mm-building mm-${b.kind}"/>`)
    .join("");
  const seen = new Set<string>();
  const edges = map.edges
    .filter((e) => {
      const k = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((e) => {
      const pts = e.polyline.map(([x, y]) => `${x},${sy(y)}`).join(" ");
      return `<polyline points="${pts}" class="mm-edge${e.resource ? " mm-corridor" : ""}" stroke-width="${e.resource ? stroke * 2 : stroke}"/>`;
    })
    .join("");
  const routes = (opts.routes ?? [])
    .map((r) => {
      const pts: string[] = [];
      for (let i = 1; i < r.path.length; i++) {
        const e = map.edges.find((x) => x.from === r.path[i - 1] && x.to === r.path[i]);
        const poly = e ? e.polyline : [[node.get(r.path[i - 1])!.x, node.get(r.path[i - 1])!.y], [node.get(r.path[i])!.x, node.get(r.path[i])!.y]];
        for (const [x, y] of poly) pts.push(`${x},${sy(y)}`);
      }
      return `<polyline points="${pts.join(" ")}" class="mm-route ${esc(r.cls)}" stroke-width="${stroke * 2.5}"><title>${esc(r.label ?? r.cls)}</title></polyline>`;
    })
    .join("");
  const marked = new Set(opts.marked ?? []);
  const open = new Set(opts.open ?? []);
  const r = stroke * 1.6;
  const nodes = map.nodes
    .map((n) => {
      const cls = ["mm-node", n.kind === "kitchen" ? "mm-kitchen" : "", n.id === "summit" ? "mm-summit" : "", marked.has(n.id) ? "mm-marked" : "", open.has(n.id) ? "mm-open" : ""].filter(Boolean).join(" ");
      return n.kind === "kitchen"
        ? `<rect x="${n.x - r * 1.5}" y="${sy(n.y) - r * 1.5}" width="${r * 3}" height="${r * 3}" class="${cls}"><title>kitchen</title></rect>`
        : `<circle cx="${n.x}" cy="${sy(n.y)}" r="${marked.has(n.id) || open.has(n.id) ? r * 1.6 : r}" class="${cls}"><title>${esc(n.id)}</title></circle>`;
    })
    .join("");
  const fs = Math.max(28, (x1 - x0) / 45);
  const labels = (opts.orders ?? [])
    .map((o) => {
      const n = node.get(o.node)!;
      return `<text x="${n.x + r * 2}" y="${sy(n.y) - r}" font-size="${fs}" class="mm-label">${esc(o.id)}</text>`;
    })
    .join("");
  const kitchenLabel = `<text x="${node.get(map.kitchen)!.x + r * 2}" y="${sy(node.get(map.kitchen)!.y) + fs}" font-size="${fs}" class="mm-label">kitchen</text>`;
  return `<svg viewBox="${view}" class="minimap" role="img" aria-label="${esc(opts.ariaLabel)}" preserveAspectRatio="xMidYMid meet">${buildings}${edges}${routes}${nodes}${labels}${kitchenLabel}</svg>`;
}
