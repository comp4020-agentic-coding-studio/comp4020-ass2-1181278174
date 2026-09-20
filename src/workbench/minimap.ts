// The map drawn as a place. Slop Hill is contour lines from the terrain
// function, the town is blocks and streets, the ridge is a hatched band with
// the corridor through its gap, the orders are houses, and on top sits
// whatever the week wants to show. Every week draws the same map; a week that
// zooms in keeps a small overview in the corner, so the reader never loses
// the whole. Coordinates stay canonical; only the camera and the labels are
// screen-space.

import type { MapData, MapNode, Order } from "../data/schema.ts";
import { contourRadius } from "../data/terrain.ts";
import { esc } from "./html.ts";
import { buildingName, placeName } from "./names.ts";

export interface MinimapOptions {
  /** Node ids drawn filled: expanded, visited. */
  marked?: string[];
  /** Node ids drawn ringed and named: the frontier. */
  open?: string[];
  /** Routes as node id sequences; the class picks the colour, the label goes in the legend. */
  routes?: { path: string[]; cls: string; label?: string }[];
  /** Orders drawn as houses and named. */
  orders?: Order[];
  /** Zoom to [x0, y0, x1, y1] in map metres; the full map otherwise. */
  box?: [number, number, number, number];
  /** Node ids to name even when the map is not zoomed. */
  focus?: string[];
  /** Hover markers with a label. */
  waits?: { node: string; label: string }[];
  /** Building ids to mark as in the way. */
  blocked?: string[];
  ariaLabel: string;
}

type Box = [number, number, number, number];
type Pt = [number, number];

let width = 560;
/** The client calls this with the column's width before re-rendering, so labels stay readable on a phone. */
export function setMapWidth(w: number): void { width = Math.max(280, Math.min(720, Math.round(w))); }
export function mapWidth(): number { return width; }

let serial = 0;
const GRID_ID = /^s-(\d+)-(\d+)$/;
const PAPER = "#fbf9f3", INK = "#2b2520", ROAD = "#7b7160", CONTOUR = "#8d7a52";
const COLOUR: Record<string, string> = { "route-chosen": "#2f7d32", "route-a": "#2f7d32", "route-fastest": "#b93c1e", "route-proposal": "#b93c1e", "route-return": "#375f9b", "route-b": "#375f9b", "route-found": "#5b5247", "route-c": "#765297" };
const PALETTE = ["#2f7d32", "#b93c1e", "#375f9b", "#765297"];
export function routeColour(cls: string, i = 0): string { return COLOUR[cls] ?? PALETTE[i % PALETTE.length]; }
export const routeDashed = (cls: string): boolean => cls === "route-fastest" || cls === "route-proposal" || cls === "route-return" || cls === "route-b";

interface Proj { s: number; px: (x: number) => number; py: (y: number) => number; left: number; top: number; w: number; h: number; box: Box }
function project(box: Box, left: number, top: number, w: number): Proj {
  const s = w / (box[2] - box[0]);
  return { s, px: (x) => left + (x - box[0]) * s, py: (y) => top + (box[3] - y) * s, left, top, w, h: (box[3] - box[1]) * s, box };
}
const r2 = (v: number) => Math.round(v * 10) / 10;
const inBox = (b: Box, x: number, y: number) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

interface Scene {
  map: MapData;
  node: Map<string, MapNode>;
  grid: MapNode[][];
  rows: number;
  cols: number;
  ridge: { bands: Pt[][]; mid: Pt; along: Pt } | null;
}

function scene(map: MapData): Scene {
  const node = new Map(map.nodes.map((n) => [n.id, n]));
  const grid: MapNode[][] = [];
  for (const n of map.nodes) {
    const m = GRID_ID.exec(n.id);
    if (!m) continue;
    (grid[Number(m[1])] ??= [])[Number(m[2])] = n;
  }
  const rows = grid.length, cols = Math.max(...grid.map((r) => r.length));
  // The ridge runs between the columns the corridor joins, over the rows whose
  // street across is missing; it is read off the data, not assumed.
  const corridor = map.edges.find((e) => e.resource === "corridor");
  let ridge: Scene["ridge"] = null;
  if (corridor) {
    const a = GRID_ID.exec(corridor.from), b = GRID_ID.exec(corridor.to);
    if (a && b && a[1] === b[1]) {
      const c0 = Math.min(Number(a[2]), Number(b[2])), c1 = c0 + 1, r0 = Number(a[1]);
      const has = new Set(map.edges.map((e) => `${e.from}|${e.to}`));
      const closed = (r: number) => grid[r]?.[c0] && grid[r]?.[c1] && !has.has(`${grid[r][c0].id}|${grid[r][c1].id}`);
      let lo = r0, hi = r0;
      while (closed(lo - 1)) lo--;
      while (closed(hi + 1)) hi++;
      const mid = (r: number): Pt => [(grid[r][c0].x + grid[r][c1].x) / 2, (grid[r][c0].y + grid[r][c1].y) / 2];
      const first = mid(lo), last = mid(hi), gap = mid(r0);
      const len = Math.hypot(last[0] - first[0], last[1] - first[1]) || 1;
      const along: Pt = [(last[0] - first[0]) / len, (last[1] - first[1]) / len];
      const at = (p: Pt, d: number): Pt => [p[0] + along[0] * d, p[1] + along[1] * d];
      ridge = { bands: [[at(first, -120), at(gap, -60)], [at(gap, 60), at(last, 120)]], mid: gap, along };
    }
  }
  return { map, node, grid, rows, cols, ridge };
}

function edgePoints(sc: Scene, path: string[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 1; i < path.length; i++) {
    const e = sc.map.edges.find((x) => x.from === path[i - 1] && x.to === path[i]);
    const poly: Pt[] = e ? (e.polyline as Pt[]) : [path[i - 1], path[i]].map((id) => [sc.node.get(id)!.x, sc.node.get(id)!.y] as Pt);
    for (const [k, p] of poly.entries()) if (i === 1 || k > 0) pts.push(p);
  }
  return pts;
}

/** Ground: hill shading and contours, blocks, the ridge, buildings, streets. */
function ground(sc: Scene, P: Proj, id: string, detail: boolean, fs: number, blocked: Set<string>): string {
  const { map } = sc;
  const [sx, sy] = [P.px(map.world.summit[0]), P.py(map.world.summit[1])];
  const outer = (contourRadius(map.world, 4) ?? 1500) * P.s;
  let out = `<circle cx="${r2(sx)}" cy="${r2(sy)}" r="${r2(outer)}" fill="url(#${id}-hill)"/>`;
  const seen = new Set<string>();
  const links = map.edges.filter((e) => { const k = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`; if (seen.has(k)) return false; seen.add(k); return true; });
  // blocks: the cells of the street grid, drawn under the streets so that a
  // missing street simply leaves two blocks joined
  for (let r = 0; r + 1 < sc.rows; r++) for (let c = 0; c + 1 < sc.cols; c++) {
    const q = [sc.grid[r]?.[c], sc.grid[r]?.[c + 1], sc.grid[r + 1]?.[c + 1], sc.grid[r + 1]?.[c]];
    if (q.some((n) => !n)) continue;
    out += `<polygon points="${q.map((n) => `${r2(P.px(n!.x))},${r2(P.py(n!.y))}`).join(" ")}" fill="#ebe3d0" fill-opacity="0.72"/>`;
  }
  // contours every ten metres from the shared terrain function
  const top = map.world.summitHeight;
  for (let h = 10; h < top + 60; h += 10) {
    const r = contourRadius(map.world, h);
    if (r === null) break;
    const major = h % 50 === 0;
    out += `<circle cx="${r2(sx)}" cy="${r2(sy)}" r="${r2(r * P.s)}" fill="none" stroke="${CONTOUR}" stroke-width="${major ? 1.3 : 0.7}" stroke-opacity="${major ? 0.85 : 0.6}"/>`;
    if (detail && (h === 20 || h === 60 || h === 100 || h === 140)) {
      const [lx, ly] = [sx - r * P.s * 0.7071, sy + r * P.s * 0.7071];
      if (lx > P.left + 12 && lx < P.left + P.w - 12 && ly > P.top + 12 && ly < P.top + P.h - 12) out += `<text x="${r2(lx)}" y="${r2(ly)}" font-size="${fs - 3}" fill="#5b4d36" text-anchor="middle" paint-order="stroke" stroke="${PAPER}" stroke-width="3" stroke-linejoin="round" transform="rotate(45 ${r2(lx)} ${r2(ly)})">${h} m</text>`;
    }
  }
  // the ridge: a hatched band, cut where the corridor crosses it
  if (sc.ridge) {
    const wBand = Math.max(4, 70 * P.s);
    for (const band of sc.ridge.bands) {
      const pts = band.map(([x, y]) => `${r2(P.px(x))},${r2(P.py(y))}`).join(" ");
      out += `<polyline points="${pts}" fill="none" stroke="#6d5d44" stroke-width="${r2(wBand)}" stroke-opacity="0.85"/>`;
      if (detail) out += `<polyline points="${pts}" fill="none" stroke="url(#${id}-hatch)" stroke-width="${r2(wBand)}"/>`;
    }
  }
  // buildings
  for (const b of map.buildings) {
    if (b.kind === "kitchen") continue;
    const x = P.px(b.x), y = P.py(b.y + b.d), w = Math.max(3, b.w * P.s), h = Math.max(3, b.d * P.s);
    const hit = blocked.has(b.id);
    out += `<rect x="${r2(x + 1.5)}" y="${r2(y + 1.5)}" width="${r2(w)}" height="${r2(h)}" fill="#000" fill-opacity="0.18"/>`;
    out += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${hit ? "#e9b3a5" : b.kind === "tower" ? "#5a4d3b" : "#a08e72"}" stroke="${hit ? "#b93c1e" : "#4a4034"}" stroke-width="${hit ? 1.8 : 0.6}"/>`;
  }
  // streets, the corridor in gold
  const casing = Math.max(3, 24 * P.s), fill = Math.max(1.5, 14 * P.s);
  const poly = (pts: Pt[]) => pts.map(([x, y]) => `${r2(P.px(x))},${r2(P.py(y))}`).join(" ");
  for (const e of links) out += `<polyline points="${poly(e.polyline as Pt[])}" fill="none" stroke="${e.resource ? "#7a5a14" : ROAD}" stroke-width="${r2(casing)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const e of links) out += `<polyline points="${poly(e.polyline as Pt[])}" fill="none" stroke="${e.resource ? "#e0a93a" : "#fffaf0"}" stroke-width="${r2(fill)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (sc.ridge && detail) {
    const [a, b] = sc.ridge.bands[1];
    const [mx, my] = [P.px((a[0] + b[0]) / 2), P.py((a[1] + b[1]) / 2)];
    const angle = -Math.atan2(sc.ridge.along[1], sc.ridge.along[0]) * 180 / Math.PI;
    if (inBox(P.box, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) out += `<text x="${r2(mx)}" y="${r2(my + 4)}" font-size="${fs - 1}" font-weight="700" fill="${PAPER}" text-anchor="middle" paint-order="stroke" stroke="#3f3526" stroke-width="3" stroke-linejoin="round" transform="rotate(${r2(angle)} ${r2(mx)} ${r2(my)})">Slop Ridge</text>`;
  }
  return out;
}

/** The small overview in the corner of a zoomed map. */
function overview(sc: Scene, P: Proj, crop: Box, id: string): string {
  const { map } = sc;
  const full: Box = [0, 0, map.world.width, map.world.height];
  const O = project(full, P.left, P.top, P.w);
  const [sx, sy] = [O.px(map.world.summit[0]), O.py(map.world.summit[1])];
  let out = `<g clip-path="url(#${id}-oclip)"><rect x="${P.left}" y="${P.top}" width="${P.w}" height="${O.h}" fill="${PAPER}"/>`;
  for (const h of [30, 80, 130]) { const r = contourRadius(map.world, h); if (r) out += `<circle cx="${r2(sx)}" cy="${r2(sy)}" r="${r2(r * O.s)}" fill="none" stroke="${CONTOUR}" stroke-width="0.8"/>`; }
  for (const band of sc.ridge?.bands ?? []) out += `<polyline points="${band.map(([x, y]) => `${r2(O.px(x))},${r2(O.py(y))}`).join(" ")}" fill="none" stroke="#6d5d44" stroke-width="${r2(Math.max(2, 70 * O.s))}"/>`;
  const seen = new Set<string>();
  for (const e of map.edges) {
    const k = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out += `<polyline points="${(e.polyline as Pt[]).map(([x, y]) => `${r2(O.px(x))},${r2(O.py(y))}`).join(" ")}" fill="none" stroke="${ROAD}" stroke-width="0.7" stroke-opacity="0.8"/>`;
  }
  out += `<rect x="${r2(O.px(crop[0]))}" y="${r2(O.py(crop[3]))}" width="${r2((crop[2] - crop[0]) * O.s)}" height="${r2((crop[3] - crop[1]) * O.s)}" fill="#b93c1e" fill-opacity="0.12" stroke="#b93c1e" stroke-width="1.2"/>`;
  return out + `</g><rect x="${P.left}" y="${P.top}" width="${P.w}" height="${O.h}" fill="none" stroke="${INK}" stroke-width="0.8"/>`;
}

export function mapSvg(map: MapData, opts: MinimapOptions): string {
  const sc = scene(map);
  const id = `mm${serial++}`;
  const fs = width < 420 ? 11 : 12;
  const M = { l: 22, t: 18, r: 8, b: 26 };
  const full: Box = [0, 0, map.world.width, map.world.height];
  const zoomed = !!opts.box && !(opts.box[0] <= 0 && opts.box[1] <= 0 && opts.box[2] >= full[2] && opts.box[3] >= full[3]);
  const box: Box = zoomed ? opts.box! : full;
  const P = project(box, M.l, M.t, width - M.l - M.r);
  const W = width, H = Math.round(M.t + P.h + M.b);
  const blocked = new Set(opts.blocked ?? []);
  const marked = new Set(opts.marked ?? []), open = new Set(opts.open ?? []);
  const xy = (n: MapNode): Pt => [P.px(n.x), P.py(n.y)];
  // A zoomed map keeps an overview in the emptiest corner, and labels keep off it.
  let inset: { x: number; y: number; size: number } | null = null;
  if (zoomed) {
    const size = Math.round(width * 0.17), pad = 6;
    const pts: Pt[] = [];
    for (const idn of [map.kitchen, "summit", ...(opts.orders ?? []).map((o) => o.node), ...(opts.focus ?? []), ...(opts.waits ?? []).map((w) => w.node)]) {
      const n = sc.node.get(idn);
      if (n && inBox(box, n.x, n.y)) pts.push(xy(n));
    }
    const corners: Pt[] = [[P.left + P.w - size - pad, P.top + pad], [P.left + pad, P.top + pad], [P.left + P.w - size - pad, P.top + P.h - size - pad], [P.left + pad, P.top + P.h - size - pad]];
    const crowd = (c: Pt) => pts.filter(([x, y]) => x > c[0] - 40 && x < c[0] + size + 40 && y > c[1] - 40 && y < c[1] + size + 40).length;
    const best = corners.reduce((a, b) => (crowd(b) < crowd(a) ? b : a));
    inset = { x: best[0], y: best[1], size };
  }

  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="minimap" role="img" aria-label="${esc(opts.ariaLabel)}" style="max-width:${W}px">`;
  out += `<defs><clipPath id="${id}-clip"><rect x="${P.left}" y="${P.top}" width="${r2(P.w)}" height="${r2(P.h)}"/></clipPath>`;
  out += `<radialGradient id="${id}-hill" gradientUnits="userSpaceOnUse" cx="${r2(P.px(map.world.summit[0]))}" cy="${r2(P.py(map.world.summit[1]))}" r="${r2((contourRadius(map.world, 4) ?? 1500) * P.s)}"><stop offset="0" stop-color="#a98f5a" stop-opacity="0.5"/><stop offset="0.45" stop-color="#bda876" stop-opacity="0.22"/><stop offset="1" stop-color="#d9cfb0" stop-opacity="0"/></radialGradient>`;
  out += `<pattern id="${id}-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#3f3526" stroke-width="2"/></pattern>`;
  if (inset) out += `<clipPath id="${id}-oclip"><rect x="${inset.x}" y="${inset.y}" width="${inset.size}" height="${inset.size}"/></clipPath>`;
  out += `</defs><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  out += `<g clip-path="url(#${id}-clip)">${ground(sc, P, id, true, fs, blocked)}`;

  // routes: a paper halo, the line, arrows along it; parallel lanes where routes share a street
  const routes = opts.routes ?? [];
  routes.forEach((r, i) => {
    const pts = edgePoints(sc, r.path).map(([x, y]) => [P.px(x), P.py(y)] as Pt);
    if (pts.length < 2) return;
    const off = routes.length > 1 ? (i - (routes.length - 1) / 2) * 3.5 : 0;
    const colour = routeColour(r.cls, i);
    const line = pts.map(([x, y]) => `${r2(x + off)},${r2(y + off)}`).join(" ");
    let arrows = "";
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k], dx = bx - ax, dy = by - ay;
      if (Math.hypot(dx, dy) < 26) continue;
      const mx = (ax + bx) / 2 + off, my = (ay + by) / 2 + off;
      arrows += `<path d="M-5,-3.5 L0,0 L-5,3.5" fill="none" stroke="${colour}" stroke-width="2.2" stroke-linecap="round" transform="translate(${r2(mx)},${r2(my)}) rotate(${r2(Math.atan2(dy, dx) * 180 / Math.PI)})"/>`;
    }
    out += `<g class="mm-route ${esc(r.cls)}"><title>${esc(r.label ?? r.cls)}</title><polyline points="${line}" fill="none" stroke="${PAPER}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9"/><polyline points="${line}" fill="none" stroke="${colour}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"${routeDashed(r.cls) ? ' stroke-dasharray="9 6"' : ""}/>${arrows}</g>`;
  });

  // nodes: street corners as small dots; expanded ones filled; the frontier ringed
  for (const n of map.nodes) {
    if (n.kind === "kitchen" || !inBox(box, n.x, n.y)) continue;
    const [x, y] = xy(n);
    if (marked.has(n.id)) out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="4.2" fill="${INK}" stroke="${PAPER}" stroke-width="1.2"/>`;
    else if (open.has(n.id)) out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="4.6" fill="${PAPER}" stroke="#b97d1c" stroke-width="2.6"/>`;
    else if (n.id === "summit") out += `<path d="M${r2(x - 5)},${r2(y + 4)} L${r2(x)},${r2(y - 5)} L${r2(x + 5)},${r2(y + 4)} Z" fill="${INK}"/>`;
    else out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="2.3" fill="${PAPER}" stroke="${ROAD}" stroke-width="1"/>`;
  }
  // houses at the orders, the kitchen, hover markers
  const houses = new Set<string>();
  for (const o of opts.orders ?? []) {
    const n = sc.node.get(o.node);
    if (!n || !inBox(box, n.x, n.y)) continue;
    houses.add(n.id);
    const [x, y] = xy(n), k = fs / 12;
    out += `<path d="M${r2(x - 7 * k)},${r2(y + 1 * k)} L${r2(x)},${r2(y - 7 * k)} L${r2(x + 7 * k)},${r2(y + 1 * k)} L${r2(x + 7 * k)},${r2(y + 8 * k)} L${r2(x - 7 * k)},${r2(y + 8 * k)} Z" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`;
  }
  const kitchen = sc.node.get(map.kitchen)!;
  if (inBox(box, kitchen.x, kitchen.y)) {
    const [x, y] = xy(kitchen);
    out += `<rect x="${r2(x - 7)}" y="${r2(y - 7)}" width="14" height="14" rx="2.5" fill="${INK}" stroke="${PAPER}" stroke-width="1.4"/><text x="${r2(x)}" y="${r2(y + 4)}" font-size="10" font-weight="700" fill="${PAPER}" text-anchor="middle">K</text>`;
  }
  for (const w of opts.waits ?? []) {
    const n = sc.node.get(w.node);
    if (!n || !inBox(box, n.x, n.y)) continue;
    const [x, y] = xy(n);
    out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="8" fill="none" stroke="#375f9b" stroke-width="2" stroke-dasharray="3 2.5"/>`;
  }
  out += "</g>";

  // labels, placed so that they do not sit on each other
  const boxes: { x: number; y: number; w: number; h: number }[] = inset ? [{ x: inset.x - 4, y: inset.y - 4, w: inset.size + 8, h: inset.size + 8 }] : [];
  const label = (text: string, x: number, y: number, bold = false, fill = INK): string => {
    const size = bold ? fs : fs - 1;
    const w = text.length * size * 0.56 + 8, h = size + 5;
    const cands: Pt[] = [[x + 9, y - h - 1], [x + 9, y + 3], [x - w - 9, y - h - 1], [x - w - 9, y + 3], [x - w / 2, y - h - 9], [x - w / 2, y + 10]];
    const fits = (c: Pt) => c[0] >= P.left + 1 && c[0] + w <= P.left + P.w - 1 && c[1] >= P.top + 1 && c[1] + h <= P.top + P.h - 1;
    const clear = (c: Pt) => !boxes.some((b) => c[0] < b.x + b.w && c[0] + w > b.x && c[1] < b.y + b.h && c[1] + h > b.y);
    let at = cands.find((c) => fits(c) && clear(c)) ?? cands.find(fits) ?? cands[0];
    at = [Math.min(Math.max(at[0], P.left + 1), P.left + P.w - w - 1), Math.min(Math.max(at[1], P.top + 1), P.top + P.h - h - 1)];
    boxes.push({ x: at[0], y: at[1], w, h });
    return `<rect x="${r2(at[0])}" y="${r2(at[1])}" width="${r2(w)}" height="${h}" rx="2.5" fill="${PAPER}" fill-opacity="0.93"/><text x="${r2(at[0] + 4)}" y="${r2(at[1] + size + 1)}" font-size="${size}" font-weight="${bold ? 700 : 500}" fill="${fill}">${esc(text)}</text>`;
  };
  let labels = "";
  if (inBox(box, kitchen.x, kitchen.y)) labels += label("Kitchen", ...xy(kitchen), true);
  for (const o of opts.orders ?? []) {
    const n = sc.node.get(o.node);
    if (!n || !inBox(box, n.x, n.y)) continue;
    labels += label(n.id === "summit" ? `${o.id} · Summit ${Math.round(n.z)} m` : o.id, ...xy(n), true);
  }
  const named = new Set<string>([...(opts.focus ?? []), ...open, ...(opts.waits ?? []).map((w) => w.node)]);
  if (zoomed && P.s >= 0.45) for (const n of map.nodes) if (GRID_ID.test(n.id) && inBox(box, n.x, n.y)) named.add(n.id);
  for (const idn of named) {
    const n = sc.node.get(idn);
    if (!n || n.kind === "kitchen" || houses.has(idn) || !inBox(box, n.x, n.y)) continue;
    labels += label(placeName(idn), ...xy(n), false, "#4a4034");
  }
  for (const w of opts.waits ?? []) { const n = sc.node.get(w.node); if (n && inBox(box, n.x, n.y)) labels += label(w.label, ...xy(n), false, "#375f9b"); }
  for (const bid of blocked) { const b = map.buildings.find((x) => x.id === bid); if (b && inBox(box, b.x + b.w / 2, b.y + b.d / 2)) labels += label(`${buildingName(bid)} · in the way`, P.px(b.x + b.w), P.py(b.y + b.d / 2), false, "#b93c1e"); }
  const corridor = map.edges.find((e) => e.resource === "corridor");
  if (corridor && sc.ridge && inBox(box, sc.ridge.mid[0], sc.ridge.mid[1])) labels += label("Corridor · capacity 1", P.px(sc.ridge.mid[0]), P.py(sc.ridge.mid[1]) + 12, false, "#7a5a14");
  out += labels;

  // the street directory: letters over the columns, numbers by the rows
  for (let c = 0; c < sc.cols; c++) {
    const xs = sc.grid.map((r) => r[c]).filter(Boolean).map((n) => n.x);
    const x = xs.reduce((a, b) => a + b, 0) / xs.length;
    if (x >= box[0] && x <= box[2]) out += `<text x="${r2(P.px(x))}" y="${M.t - 5}" font-size="10.5" font-weight="700" fill="#5b5247" text-anchor="middle">${String.fromCharCode(65 + c)}</text>`;
  }
  for (let r = 0; r < sc.rows; r++) {
    const ys = (sc.grid[r] ?? []).filter(Boolean).map((n) => n.y);
    const y = ys.reduce((a, b) => a + b, 0) / ys.length;
    if (y >= box[1] && y <= box[3]) out += `<text x="${M.l - 4}" y="${r2(P.py(y) + 3.5)}" font-size="10.5" font-weight="700" fill="#5b5247" text-anchor="end">${sc.rows - r}</text>`;
  }
  if (inset) out += overview(sc, project(full, inset.x, inset.y, inset.size), box, id);
  // scale bar and north
  const unit = [50, 100, 200, 250, 500, 1000].find((u) => u * P.s >= 48) ?? 1000;
  out += `<path d="M ${M.l} ${H - 9} h ${r2(unit * P.s)}" stroke="${INK}" stroke-width="2"/><text x="${M.l}" y="${H - 13}" font-size="10" fill="#5b5247">${unit} m</text>`;
  out += `<text x="${W - M.r}" y="${H - 11}" font-size="10.5" fill="#5b5247" text-anchor="end">N ↑</text>`;
  return out + "</svg>";
}


export function minimap(map: MapData, opts: MinimapOptions): string {
  const legend = (opts.routes ?? [])
    .map((r, i) => `<span><i style="--c:${routeColour(r.cls, i)};${routeDashed(r.cls) ? "border-top-style:dashed" : ""}"></i>${esc(r.label ?? r.cls)}</span>`)
    .join("");
  return `<figure class="map-figure">${mapSvg(map, opts)}${legend ? `<figcaption class="map-legend">${legend}</figcaption>` : ""}<p class="map-key">Contour lines every 10 m. The hatched band is the ridge; its gap is the corridor. Letters and numbers name the street corners; houses are the orders.</p></figure>`;
}
