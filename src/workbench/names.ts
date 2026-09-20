// Names for places as the pages show them. The data keeps its ids (s-3-2,
// block-4); the reader sees a street-directory grid: columns lettered from
// the west, rows numbered from the north, so the corridor runs C4 → D4.

import type { MapData } from "../data/schema.ts";
import mapJson from "../data/map.json";

const GRID_ID = /^s-(\d+)-(\d+)$/;
const rows = 1 + Math.max(...(mapJson as MapData).nodes.map((n) => Number(GRID_ID.exec(n.id)?.[1] ?? -1)));

export function placeName(id: string): string {
  const m = GRID_ID.exec(id);
  if (m) return `${String.fromCharCode(65 + Number(m[2]))}${rows - Number(m[1])}`;
  if (id === "kitchen") return "Kitchen";
  if (id === "summit") return "Summit";
  return id;
}

export const routeText = (path: string[]): string => path.map(placeName).join(" → ");

export function buildingName(id: string): string {
  if (id === "tower-n") return "the north tower";
  if (id === "tower-s") return "the south tower";
  if (id === "kitchen") return "the kitchen";
  const ridge = /^ridge-(s-\d+-\d+)$/.exec(id);
  if (ridge) return `the ridge at ${placeName(ridge[1])}`;
  const block = /^block-(\d+)$/.exec(id);
  if (block) return `building ${block[1]}`;
  return id;
}
