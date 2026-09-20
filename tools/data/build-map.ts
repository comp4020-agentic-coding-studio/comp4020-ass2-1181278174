// Builds the canonical map and orders for Slop Hill: `pnpm data`.
//
// Deterministic from SEED. The JSON it writes is never edited by hand; change
// this file, rerun, and the spec's data checks say whether the result still
// meets the contract. Edge times and energies are NOT stored here — the engine
// derives them from geometry, the fleet and the rules, in one place.

import { writeFileSync } from "node:fs";
import type { Building, MapData, MapEdge, MapNode, Order, OrdersData } from "../../src/data/schema.ts";
import { hill as terrainHeight } from "../../src/data/terrain.ts";

const SEED = 3969;
const WORLD = { width: 2000, height: 2000, summit: [1240, 1460] as [number, number], summitHeight: 120 };
const GRID = 7;
const SPACING = 300;
const MARGIN = 100;
const JITTER = 70;
const KITCHEN = { x: 160, y: 480 };
const CORRIDOR: [string, string] = ["s-3-2", "s-3-3"]; // on the line from the kitchen to the summit
const DETOUR_RATIO = 3;
const REMOVE_P = 0.18;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const rand = (lo: number, hi: number) => lo + (hi - lo) * rnd();
const r1 = (v: number) => Math.round(v * 10) / 10;
const hill = (x: number, y: number) => terrainHeight(WORLD, x, y); // the shape lives in src/data/terrain.ts
const dist = (a: MapNode, b: MapNode) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- nodes -----------------------------------------------------------------
const nodes: MapNode[] = [];
const byId = new Map<string, MapNode>();
function addNode(n: MapNode): MapNode { nodes.push(n); byId.set(n.id, n); return n; }
for (let r = 0; r < GRID; r++) {
  for (let c = 0; c < GRID; c++) {
    const x = r1(MARGIN + c * SPACING + rand(-JITTER, JITTER));
    const y = r1(MARGIN + r * SPACING + rand(-JITTER, JITTER));
    addNode({ id: `s-${r}-${c}`, x, y, z: r1(hill(x, y)), kind: "street" });
  }
}
const kitchen = addNode({ id: "kitchen", x: KITCHEN.x, y: KITCHEN.y, z: r1(hill(KITCHEN.x, KITCHEN.y)), kind: "kitchen" });

// ---- undirected street links ---------------------------------------------
type Link = [string, string];
const links: Link[] = [];
const linkKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const linkSet = new Set<string>();
function addLink(a: string, b: string) { if (!linkSet.has(linkKey(a, b))) { links.push([a, b]); linkSet.add(linkKey(a, b)); } }
function dropLink(a: string, b: string) {
  const k = linkKey(a, b); const i = links.findIndex(([p, q]) => linkKey(p, q) === k);
  if (i >= 0) { links.splice(i, 1); linkSet.delete(k); }
}
for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
  if (c + 1 < GRID) addLink(`s-${r}-${c}`, `s-${r}-${c + 1}`);
  if (r + 1 < GRID) addLink(`s-${r}-${c}`, `s-${r + 1}-${c}`);
}
const kitchenNeighbours = nodes.filter((n) => n.kind === "street").sort((a, b) => dist(a, kitchen) - dist(b, kitchen)).slice(0, 2).map((n) => n.id);
for (const id of kitchenNeighbours) addLink("kitchen", id);

function neighbours(id: string, skip?: Link): string[] {
  const out: string[] = [];
  for (const [a, b] of links) {
    if (skip && linkKey(a, b) === linkKey(skip[0], skip[1])) continue;
    if (a === id) out.push(b); else if (b === id) out.push(a);
  }
  return out;
}
function connected(): boolean {
  const seen = new Set<string>(["kitchen"]); const stack = ["kitchen"];
  while (stack.length) { const v = stack.pop()!; for (const w of neighbours(v)) if (!seen.has(w)) { seen.add(w); stack.push(w); } }
  return seen.size === nodes.length;
}
function shortest(from: string, to: string, skip?: Link): { d: number; path: string[] } {
  const d = new Map<string, number>([[from, 0]]); const prev = new Map<string, string>();
  const open = new Set<string>([from]); const done = new Set<string>();
  while (open.size) {
    let u = ""; let best = Infinity;
    for (const v of open) { const dv = d.get(v)!; if (dv < best) { best = dv; u = v; } }
    open.delete(u); done.add(u);
    if (u === to) break;
    for (const w of neighbours(u, skip)) {
      if (done.has(w)) continue;
      const nd = best + dist(byId.get(u)!, byId.get(w)!);
      if (nd < (d.get(w) ?? Infinity)) { d.set(w, nd); prev.set(w, u); open.add(w); }
    }
  }
  const path: string[] = []; let cur: string | undefined = to;
  while (cur !== undefined) { path.unshift(cur); cur = prev.get(cur); }
  return { d: d.get(to) ?? Infinity, path: path[0] === from ? path : [] };
}

// The ridge: between columns 2 and 3, rows 2 to 4 have no street except the
// corridor. Crossing from the kitchen's side to the far side means the
// corridor, or the long way round the end of the ridge (rows 1 and 5 stay
// open, and are protected from thinning so that the detour stays finite).
const RIDGE_COLS: [number, number] = [2, 3];
const RIDGE_ROWS = [2, 3, 4];
const ridgeGaps: Link[] = [];
for (const r of RIDGE_ROWS) {
  const l: Link = [`s-${r}-${RIDGE_COLS[0]}`, `s-${r}-${RIDGE_COLS[1]}`];
  if (linkKey(...l) === linkKey(...CORRIDOR)) continue;
  dropLink(...l); ridgeGaps.push(l);
}
const ridgeEnds: Link[] = [1, 5].map((r) => [`s-${r}-${RIDGE_COLS[0]}`, `s-${r}-${RIDGE_COLS[1]}`]);

// Thin the grid into a street network, keeping it connected.
const protectedLinks = new Set<string>([linkKey(...CORRIDOR), ...ridgeEnds.map((l) => linkKey(...l)), ...kitchenNeighbours.map((id) => linkKey("kitchen", id))]);
for (const [a, b] of [...links]) {
  if (protectedLinks.has(linkKey(a, b))) continue;
  if (rnd() < REMOVE_P) { dropLink(a, b); if (!connected()) addLink(a, b); }
}

// The corridor is the only short way across: lengthen every detour until it is
// at least DETOUR_RATIO times the corridor, by closing streets on the detour.
const corridorLen = dist(byId.get(CORRIDOR[0])!, byId.get(CORRIDOR[1])!);
for (let i = 0; i < 60; i++) {
  const { d, path } = shortest(CORRIDOR[0], CORRIDOR[1], CORRIDOR);
  if (d >= DETOUR_RATIO * corridorLen) break;
  let removed = false;
  for (let k = 0; k + 1 < path.length && !removed; k++) {
    const l: Link = [path[k], path[k + 1]];
    if (protectedLinks.has(linkKey(...l))) continue;
    dropLink(...l);
    if (connected()) removed = true; else addLink(...l);
  }
  if (!removed) throw new Error("could not lengthen the detour without disconnecting the map");
}

// The hilltop house: one node above the grid, reached by a short steep track
// from the nearest street and by a long gentle spiral from the next one. The
// track is faster; the spiral climbs the same height over three times the
// distance. This is the week-4 pair of routes.
const summit = addNode({ id: "summit", x: WORLD.summit[0], y: WORLD.summit[1], z: r1(hill(WORLD.summit[0], WORLD.summit[1])), kind: "street" });
const nearSummit = nodes.filter((n) => n.kind === "street" && n.id !== "summit").sort((a, b) => dist(a, summit) - dist(b, summit));
const trackFrom = nearSummit[0], spiralFrom = nearSummit[1];
addLink(trackFrom.id, "summit");
addLink(spiralFrom.id, "summit");
function spiral(from: MapNode): [number, number][] {
  const r0 = dist(from, summit);
  const th0 = Math.atan2(from.y - summit.y, from.x - summit.x);
  const pts: [number, number][] = [];
  const steps = 6;
  for (let k = 0; k <= steps; k++) {
    const r = r0 * (1 - k / steps);
    const th = th0 + (k / steps) * (1.5 * Math.PI);
    pts.push([r1(summit.x + r * Math.cos(th)), r1(summit.y + r * Math.sin(th))]);
  }
  pts[0] = [from.x, from.y];
  pts[steps] = [summit.x, summit.y];
  return pts;
}
const polylineLength = (pts: [number, number][]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
const spiralPts = spiral(spiralFrom);

// ---- directed edges ---------------------------------------------------------
const edges: MapEdge[] = [];
for (const [a, b] of links) {
  const A = byId.get(a)!, B = byId.get(b)!;
  const isSpiral = (a === spiralFrom.id && b === "summit") || (b === spiralFrom.id && a === "summit");
  const forward: [number, number][] = isSpiral ? (a === spiralFrom.id ? spiralPts : [...spiralPts].reverse()) : [[A.x, A.y], [B.x, B.y]];
  const length = r1(isSpiral ? polylineLength(spiralPts) : dist(A, B));
  const resource = linkKey(a, b) === linkKey(...CORRIDOR) ? "corridor" : undefined;
  edges.push({ id: `${a}>${b}`, from: a, to: b, length, rise: r1(B.z - A.z), polyline: forward, ...(resource ? { resource } : {}) });
  edges.push({ id: `${b}>${a}`, from: b, to: a, length, rise: r1(A.z - B.z), polyline: [...forward].reverse(), ...(resource ? { resource } : {}) });
}
for (const id of [...CORRIDOR, ...kitchenNeighbours]) byId.get(id)!.wait = true;

// ---- buildings ---------------------------------------------------------------
const buildings: Building[] = [];
const cA = byId.get(CORRIDOR[0])!, cB = byId.get(CORRIDOR[1])!;
const mid = { x: (cA.x + cB.x) / 2, y: (cA.y + cB.y) / 2 };
buildings.push({ id: "tower-n", kind: "tower", x: r1(mid.x - 25), y: r1(mid.y + 22), w: 50, d: 45, h: 45 });
buildings.push({ id: "tower-s", kind: "tower", x: r1(mid.x - 25), y: r1(mid.y - 67), w: 50, d: 45, h: 45 });
buildings.push({ id: "kitchen", kind: "kitchen", x: r1(kitchen.x - 40), y: r1(kitchen.y - 10), w: 30, d: 20, h: 6 });

function segRectDistance(p: [number, number], q: [number, number], b: Building): number {
  // distance from the segment to the rectangle: 0 when they intersect
  const cx = Math.min(Math.max((p[0] + q[0]) / 2, b.x), b.x + b.w), cy = Math.min(Math.max((p[1] + q[1]) / 2, b.y), b.y + b.d);
  let best = Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    const dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.d));
    best = Math.min(best, Math.hypot(dx, dy));
  }
  void cx; void cy;
  return best;
}
// The ridge estate: a building where each removed crossing was, so the wall is visible.
for (const [a, b] of ridgeGaps) {
  const A = byId.get(a)!, B = byId.get(b)!;
  const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
  const w = 40, d = 110;
  const bld: Building = { id: `ridge-${a}`, kind: "block", x: r1(cx - w / 2), y: r1(cy - d / 2), w, d, h: 12 };
  if (edges.every((e) => e.polyline.slice(1).every((q, i) => segRectDistance(e.polyline[i], q, bld) >= 20))) buildings.push(bld);
}
let blockNo = 0;
for (let r = 0; r + 1 < GRID; r++) for (let c = 0; c + 1 < GRID; c++) {
  if (rnd() > 0.4) continue;
  const corners = [byId.get(`s-${r}-${c}`)!, byId.get(`s-${r}-${c + 1}`)!, byId.get(`s-${r + 1}-${c}`)!, byId.get(`s-${r + 1}-${c + 1}`)!];
  const cx = corners.reduce((s, n) => s + n.x, 0) / 4, cy = corners.reduce((s, n) => s + n.y, 0) / 4;
  const w = r1(rand(30, 60)), d = r1(rand(30, 60));
  const b: Building = { id: `block-${blockNo}`, kind: "block", x: r1(cx - w / 2), y: r1(cy - d / 2), w, d, h: r1(rand(8, 15)) };
  if (edges.every((e) => e.polyline.slice(1).every((q, i) => segRectDistance(e.polyline[i], q, b) >= 25))) { buildings.push(b); blockNo++; }
}
for (const t of buildings.filter((b) => b.kind === "tower")) {
  for (const e of edges) if (!e.resource && e.polyline.slice(1).some((q, i) => segRectDistance(e.polyline[i], q, t) < 1)) throw new Error(`${e.id} passes through ${t.id}`);
}

// ---- orders --------------------------------------------------------------------
const street = nodes.filter((n) => n.kind === "street");
const taken = new Set<string>([...kitchenNeighbours, ...CORRIDOR]);
const pick = (n: MapNode) => { taken.add(n.id); return n.id; };
const nearKitchen = street.filter((n) => !taken.has(n.id)).sort((a, b) => dist(a, kitchen) - dist(b, kitchen));
const house03 = pick(nearKitchen[0]), house05 = pick(nearKitchen[1]);
const house07 = pick(summit);
// #13: the shortest way there uses the corridor, and the detour would cost the most.
let house13 = ""; let bestGap = -1;
for (const n of street) {
  if (taken.has(n.id)) continue;
  const via = shortest("kitchen", n.id); const without = shortest("kitchen", n.id, CORRIDOR);
  const uses = via.path.some((v, i) => i > 0 && linkKey(via.path[i - 1], v) === linkKey(...CORRIDOR));
  if (uses && without.d - via.d > bestGap) { bestGap = without.d - via.d; house13 = n.id; }
}
if (!house13) throw new Error("no house lies across the corridor");
taken.add(house13);
const midHill = street.filter((n) => !taken.has(n.id) && n.z > 40 && n.z < 85);
const house20 = pick(midHill[Math.floor(rnd() * midHill.length)]);
const rest = street.filter((n) => !taken.has(n.id));
for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
const fixed: Record<number, string> = { 3: house03, 5: house05, 7: house07, 13: house13, 20: house20 };
const dishes = ["laksa", "pad see ew", "chicken katsu curry", "pho", "dumplings, twenty", "bibimbap", "mapo tofu", "butter chicken", "fried rice", "ramen",
  "green curry", "beef rendang", "char kway teow", "okonomiyaki", "kung pao chicken", "nasi goreng", "tonkatsu", "dan dan noodles", "pork belly bao", "hotpot for four"];
const ready = Array.from({ length: 20 }, (_, i) => Math.round(405 * i + rand(0, 180))).sort((a, b) => a - b);
const orders: Order[] = [];
let k = 0;
for (let i = 1; i <= 20; i++) {
  const id = `#${String(i).padStart(2, "0")}`;
  const node = fixed[i] ?? rest[k++].id;
  const weight = i === 20 ? 3.5 : r1(rand(0.3, 1.4));
  const promised = ready[i - 1] + (i === 7 ? 1500 : Math.round(rand(1800, 2700)));
  orders.push({ id, node, ready: ready[i - 1], weight, promised, label: dishes[i - 1] });
}

// ---- write -----------------------------------------------------------------------
const map: MapData = { version: 1, seed: SEED, world: WORLD, kitchen: "kitchen", nodes, edges, buildings };
const ordersData: OrdersData = { version: 1, orders };
writeFileSync("src/data/map.json", JSON.stringify(map, null, 2) + "\n");
writeFileSync("src/data/orders.json", JSON.stringify(ordersData, null, 2) + "\n");
const detour = shortest(CORRIDOR[0], CORRIDOR[1], CORRIDOR).d;
console.log(`map: ${nodes.length} nodes, ${edges.length} directed edges, ${buildings.length} buildings; corridor ${r1(corridorLen)} m, detour ${r1(detour)} m (${(detour / corridorLen).toFixed(2)}x)`);
const trackEdge = edges.find((e) => e.from === trackFrom.id && e.to === "summit")!;
const spiralEdge = edges.find((e) => e.from === spiralFrom.id && e.to === "summit")!;
console.log(`summit z ${summit.z}: track from ${trackFrom.id} ${trackEdge.length} m rise ${trackEdge.rise} (grade ${(trackEdge.rise / trackEdge.length).toFixed(2)}); spiral from ${spiralFrom.id} ${spiralEdge.length} m rise ${spiralEdge.rise} (grade ${(spiralEdge.rise / spiralEdge.length).toFixed(2)})`);
console.log(`orders: #03 ${house03}, #05 ${house05}, #07 ${house07} (z ${summit.z}), #13 ${house13} (detour gap ${r1(bestGap)} m), #20 ${house20}`);
