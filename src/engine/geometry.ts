// Is a straight connection a legal edge? A street segment must not pass
// through a building footprint (docs/course.md, week 1). Footprints are
// axis-aligned rectangles; the segment is sampled finely enough that no
// building on this map (the smallest is 30 m) can slip between samples.

import type { Building } from "../data/schema.ts";

export function segmentHitsRect(p: [number, number], q: [number, number], b: Building): boolean {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const steps = Math.max(2, Math.ceil(len / 5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.d) return true;
  }
  return false;
}

/** The buildings a polyline passes through; empty means the connection is legal. */
export function blockedBy(polyline: [number, number][], buildings: Building[]): Building[] {
  const hits: Building[] = [];
  for (const b of buildings) {
    for (let i = 1; i < polyline.length; i++) {
      if (segmentHitsRect(polyline[i - 1], polyline[i], b)) {
        hits.push(b);
        break;
      }
    }
  }
  return hits;
}
