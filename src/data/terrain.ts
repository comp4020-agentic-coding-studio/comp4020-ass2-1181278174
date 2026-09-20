// Slop Hill's height, in one place. The map generator writes each node's z
// from this function; the map drawing reads it back for contour lines. The
// constants belong to the terrain, not to the map file: `world` in map.json
// carries the summit and its height, this file the shape around it.

export interface Summit {
  summit: [number, number];
  summitHeight: number;
}

/** Metres; the spread of the hill's main slope. */
export const SIGMA = 650;
/** Metres the hilltop rises above the main slope within KNOB_RADIUS of the summit. */
export const KNOB = 45;
export const KNOB_RADIUS = 200;

/** Height at horizontal distance d from the summit. Decreases with d. */
export function heightAt(world: Summit, d: number): number {
  return world.summitHeight * Math.exp(-(d * d) / (2 * SIGMA * SIGMA)) + KNOB * Math.max(0, 1 - d / KNOB_RADIUS);
}

export function hill(world: Summit, x: number, y: number): number {
  return heightAt(world, Math.hypot(x - world.summit[0], y - world.summit[1]));
}

/** The distance from the summit at which the ground is `h` metres high, or null above the summit. */
export function contourRadius(world: Summit, h: number): number | null {
  if (h <= 0 || h >= heightAt(world, 0)) return null;
  let lo = 0, hi = 10 * SIGMA;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (heightAt(world, mid) > h) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
