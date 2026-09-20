import type { MapData } from "../data/schema";
import { esc } from "./html";
import { routeColor } from "./minimap";
export interface ProfileRoute { path: string[]; label: string; cls: string }
export function profileSvg(map: MapData, routes: ProfileRoute[], width = 720): string {
  const W = Math.max(240, Math.round(width)), H = 210, left = 42, right = W - 15;
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  const series = routes.map((r) => {
    let distance = 0;
    return { ...r, points: r.path.map((id, i) => {
      if (i) distance += map.edges.find((e) => e.from === r.path[i - 1] && e.to === id)!.length;
      return { distance, height: nodes.get(id)!.z };
    }) };
  });
  const maxD = Math.ceil(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.distance))) / 100) * 100;
  const maxH = Math.ceil(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.height))) / 20) * 20;
  const x = (d: number) => left + d / maxD * (right - left), y = (h: number) => 160 - h / maxH * 130;
  const grid = [0, maxH / 2, maxH].map((h) => `<line x1="${left}" x2="${right}" y1="${y(h)}" y2="${y(h)}" stroke="#d5d1c8"/><text x="${left - 7}" y="${y(h) + 4}" text-anchor="end" font-size="11" fill="#514b43">${h}</text>`).join("");
  const lines = series.map((s, i) => `<polyline points="${s.points.map((p) => `${x(p.distance)},${y(p.height)}`).join(" ")}" fill="none" stroke="${routeColor(s.cls, i)}" stroke-width="3" ${i % 2 ? 'stroke-dasharray="8 5"' : ""}><title>${esc(s.label)}</title></polyline>`).join("");
  const ticks = [0, maxD / 2, maxD].map((d, i) => `<text x="${x(d)}" y="178" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}" font-size="11" fill="#514b43">${d}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="height-profile" role="img" aria-label="Outbound elevation profiles. Both start at the kitchen; the horizontal axis measures distance along each route, and the vertical axis is elevation in metres."><text x="${left}" y="16" font-size="12" fill="#29251f">Elevation (m)</text>${grid}${lines}${ticks}<text x="${W / 2}" y="203" text-anchor="middle" font-size="11" fill="#514b43">Distance along outbound route (m)</text></svg>`;
}
export function elevationProfile(map: MapData, routes: ProfileRoute[]): string {
  return `<div data-profile="${esc(JSON.stringify(routes))}">${profileSvg(map, routes)}</div>`;
}
