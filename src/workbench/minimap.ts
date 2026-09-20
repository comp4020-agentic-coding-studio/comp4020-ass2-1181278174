import type { MapData, Order } from "../data/schema.ts";
import { esc } from "./html.ts";

export interface MinimapOptions {
  marked?: string[];
  open?: string[];
  routes?: { path: string[]; cls: string; label?: string }[];
  orders?: Order[];
  box?: [number, number, number, number];
  ariaLabel: string;
  focus?: string[];
  blockedBuildings?: string[];
}
const palette = ["#28705b", "#a35218", "#375f9b", "#765297"];

/** Coordinates stay canonical; only the camera and screen-space labels change. */
export function mapSvg(map: MapData, opts: MinimapOptions, width = 720): string {
  const W = Math.max(240, Math.round(width)), H = W < 480 ? 360 : 420;
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  const routes = opts.routes ?? [], orders = opts.orders ?? [];
  const points = [...new Set([map.kitchen, ...orders.map((o) => o.node), ...routes.flatMap((r) => r.path), ...(opts.focus ?? [])])].map((id) => nodes.get(id)!).filter(Boolean);
  let box = opts.box;
  if (routes.length || orders.length) box = [Math.min(...points.map((n) => n.x)) - 100, Math.min(...points.map((n) => n.y)) - 100, Math.max(...points.map((n) => n.x)) + 100, Math.max(...points.map((n) => n.y)) + 100];
  const [x0, y0, x1, y1] = box ?? [0, 0, map.world.width, map.world.height];
  const scale = Math.min((W - 64) / Math.max(200, x1 - x0), (H - 90) / Math.max(200, y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const p = (x: number, y: number) => [W / 2 + (x - cx) * scale, H / 2 - (y - cy) * scale];
  const xy = (id: string) => { const n = nodes.get(id)!; return p(n.x, n.y); };
  const inside = (x: number, y: number) => x > 12 && x < W - 12 && y > 16 && y < H - 24;
  const [hx, hy] = p(...map.world.summit);
  const terrain = [650, 420, 190].map((r, i) => `<ellipse cx="${hx}" cy="${hy}" rx="${r * scale}" ry="${r * scale}" fill="#d4dfc5" fill-opacity="${0.18 + i * 0.09}" stroke="#93a57f" stroke-opacity="0.3"/>`).join("");
  const buildings = map.buildings.map((b) => { const [x, y] = p(b.x, b.y + b.d); return `<rect x="${x}" y="${y}" width="${Math.max(3, b.w * scale)}" height="${Math.max(3, b.d * scale)}" rx="1" fill="${opts.blockedBuildings?.includes(b.id) ? "#e8bda6" : "#b7b0a5"}" stroke="${opts.blockedBuildings?.includes(b.id) ? "#9c351b" : "#837b70"}" stroke-width="${opts.blockedBuildings?.includes(b.id) ? 2 : 0.5}"/>`; }).join("");
  const seen = new Set<string>();
  const edges = map.edges.filter((e) => { const k = [e.from, e.to].sort().join("|"); if (seen.has(k)) return false; seen.add(k); return true; }).map((e) => {
    const pts = e.polyline.map(([x, y]) => p(x, y).join(",")).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${e.resource ? "#c49d48" : "#c1bbaf"}" stroke-width="${e.resource ? 10 : 1.3}" stroke-linecap="round"/>`;
  }).join("");
  const routeLines = routes.map((r, i) => {
    const pts: number[][] = [];
    for (let k = 1; k < r.path.length; k++) {
      const edge = map.edges.find((e) => e.from === r.path[k - 1] && e.to === r.path[k]);
      const coords = edge?.polyline ?? [nodes.get(r.path[k - 1])!, nodes.get(r.path[k])!].map((n) => [n.x, n.y]);
      for (const [x, y] of coords) pts.push(p(x, y));
    }
    const color = routeColor(r.cls, i);
    // Parallel screen-space lanes make shared edges visible; the legend names each route.
    const offset = routes.length > 1 ? (i - (routes.length - 1) / 2) * 4 : 0;
    const path = pts.map(([x, y]) => `${x + offset},${y + offset}`).join(" ");
    const arrows = pts.slice(1).map((end, k) => {
      const start = pts[k], dx = end[0] - start[0], dy = end[1] - start[1];
      if (Math.hypot(dx, dy) < 22) return "";
      const x = (start[0] + end[0]) / 2 + offset, y = (start[1] + end[1]) / 2 + offset;
      return `<path d="M -5 -3 L 0 0 L -5 3" fill="none" stroke="${color}" stroke-width="2" transform="translate(${x},${y}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})"/>`;
    }).join("");
    return `<g><title>${esc(r.label ?? r.cls)}</title><polyline points="${path}" fill="none" stroke="#fffdf8" stroke-width="6"/><polyline points="${path}" fill="none" stroke="${color}" stroke-width="3" ${i % 2 ? 'stroke-dasharray="8 5"' : ""}/>${arrows}</g>`;
  }).join("");
  const marked = new Set(opts.marked), open = new Set(opts.open);
  const dots = map.nodes.map((n) => { const [x, y] = xy(n.id); return `<circle cx="${x}" cy="${y}" r="${marked.has(n.id) || open.has(n.id) ? 4 : 2}" fill="${marked.has(n.id) ? "#375f9b" : "#fffdf8"}" stroke="${open.has(n.id) ? "#a35218" : "#aaa293"}" stroke-width="${open.has(n.id) ? 2 : 1}"/>`; }).join("");
  const occupied: { x: number; y: number; w: number }[] = [];
  const label = (text: string, x: number, y: number, important = false) => {
    const w = Math.min(W - 20, text.length * 6.6 + 12);
    let lx = Math.max(8, Math.min(W - w - 8, x + 9)), ly = Math.max(20, Math.min(H - 22, y - 10));
    for (let i = 0; i < 8 && occupied.some((a) => Math.abs(a.y - ly) < 20 && lx < a.x + a.w && lx + w > a.x); i++) ly = ly + 22 < H - 16 ? ly + 22 : ly - 44;
    occupied.push({ x: lx, y: ly, w });
    return `<g><rect x="${lx - 3}" y="${ly - 13}" width="${w}" height="19" rx="3" fill="#fffdf8" fill-opacity="0.96"/><text x="${lx + 2}" y="${ly}" font-size="12" font-weight="${important ? 650 : 450}" fill="#29251f">${esc(text)}</text></g>`;
  };
  const [kx, ky] = xy(map.kitchen);
  let labels = `<rect x="${kx - 5}" y="${ky - 5}" width="10" height="10" rx="2" fill="#29251f"/>${label("Kitchen · start / return", kx, ky, true)}`;
  for (const o of orders) {
    const n = nodes.get(o.node)!, [x, y] = xy(o.node);
    labels += `<circle cx="${x}" cy="${y}" r="5" fill="#a35218"/>${label(`${o.id}${n.id === "summit" ? ` Summit · ${Math.round(n.z)} m` : ""}`, x, y, true)}`;
  }
  for (const id of opts.focus ?? []) { const [x, y] = xy(id); labels += label(id, x, y); }
  for (const id of opts.blockedBuildings ?? []) { const b = map.buildings.find((b) => b.id === id); if (b) { const [x, y] = p(b.x + b.w / 2, b.y + b.d / 2); labels += label(`${id} · blocks connection`, x, y); } }
  const corridor = map.edges.find((e) => e.resource === "corridor");
  if (corridor) { const a = xy(corridor.from), b = xy(corridor.to), x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2; if (inside(x, y)) labels += label("Corridor · capacity 1", x, y + 26); }
  const unit = Math.max(50, Math.round(70 / scale / 50) * 50), len = unit * scale;
  return `<svg viewBox="0 0 ${W} ${H}" class="teaching-map" role="img" aria-label="${esc(opts.ariaLabel)}"><rect width="${W}" height="${H}" fill="#faf9f4"/>${terrain}${buildings}${edges}${routeLines}${dots}${labels}<path d="M 16 ${H - 18} h ${len}" stroke="#534d43" stroke-width="2"/><text x="16" y="${H - 25}" font-size="11" fill="#534d43">${unit} m</text><text x="${W - 14}" y="20" text-anchor="end" font-size="11" fill="#534d43">N ↑</text></svg>`;
}
export function routeColor(cls: string, i = 0): string {
  if (cls === "route-return" || cls === "route-b") return palette[2];
  if (cls === "route-chosen" || cls === "route-a") return palette[0];
  if (cls === "route-fastest" || cls === "route-proposal") return palette[1];
  return palette[i % palette.length];
}
export function minimap(map: MapData, opts: MinimapOptions): string {
  const legend = (opts.routes ?? []).map((r, i) => `<span><i style="--route-color:${routeColor(r.cls, i)};${i % 2 ? "border-top-style:dashed" : ""}"></i>${esc(r.label ?? r.cls)}</span>`).join("");
  return `<figure class="map-figure"><div class="map-viewport" data-map-options="${esc(JSON.stringify(opts))}">${mapSvg(map, opts)}</div>${legend ? `<figcaption class="map-legend">${legend}</figcaption>` : ""}<p class="map-key">Square: kitchen · dots: waypoints · blocks: buildings · lines: allowed flight links. Arrows show direction; hill shading is schematic.</p></figure>`;
}
