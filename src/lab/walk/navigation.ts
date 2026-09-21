import type { MapData } from '../../data/schema';
import { stops } from '../../data/hill-stops';
import { terrainHeight } from '../terrain';

export interface Position { x: number; y: number }
export const WALK_SPEED = 170;
export const OPEN_RADIUS = 100;
export const FLIGHT_CLEARANCE = 22;
export const groundPosition = (point: Position) => ({ ...point, z: terrainHeight(point.x, point.y) });

/** Diagonals cover the same distance as straight walking; map edges are hard limits. */
export function advance(position: Position, keys: ReadonlySet<string>, seconds: number, map: MapData) {
  const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const y = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
  const length = Math.hypot(x, y) || 1, distance = WALK_SPEED * Math.min(.05, Math.max(0, seconds));
  const clamp = (value: number, limit: number) => Math.max(16, Math.min(limit - 16, value));
  return groundPosition({ x: clamp(position.x + x / length * distance, map.world.width), y: clamp(position.y + y / length * distance, map.world.height) });
}

/** A course trail climbs the existing hill; it is not a delivery route. */
export function coursePosition(map: MapData, progress: number) {
  const kitchen = map.nodes.find(node => node.id === map.kitchen)!;
  const [sx, sy] = map.world.summit, t = Math.max(0, Math.min(1, progress));
  const radius = Math.hypot(kitchen.x - sx, kitchen.y - sy) * (1 - t);
  const angle = Math.atan2(kitchen.y - sy, kitchen.x - sx) + Math.sin(t * Math.PI * 3) * .24;
  return groundPosition({ x: sx + radius * Math.cos(angle), y: sy + radius * Math.sin(angle) });
}

/** Join the course trail from the drone's current position without teleporting. */
export function courseFlight(map: MapData, from: Position, to: Position) {
  const [sx, sy] = map.world.summit;
  const start = coursePosition(map, 0), radius = Math.hypot(start.x - sx, start.y - sy);
  const progress = (p: Position) => Math.max(0, Math.min(1, 1 - Math.hypot(p.x - sx, p.y - sy) / radius));
  const a = progress(from), b = progress(to), join = coursePosition(map, a), leave = coursePosition(map, b);
  return {
    duration: Math.min(3600, 1000 + Math.hypot(to.x - from.x, to.y - from.y) * 1.6),
    at(fraction: number) {
      const t = Math.max(0, Math.min(1, fraction)), p = coursePosition(map, a + (b - a) * t);
      const x = p.x + (from.x - join.x) * (1 - t) + (to.x - leave.x) * t;
      const y = p.y + (from.y - join.y) * (1 - t) + (to.y - leave.y) * t;
      return groundPosition({ x: Math.max(16, Math.min(map.world.width - 16, x)), y: Math.max(16, Math.min(map.world.height - 16, y)) });
    },
  };
}

export function walkTargets(map: MapData) {
  return [
    ...stops.map(stop => ({ ...stop, key: `week-${stop.week}`, label: `Week ${stop.week}`,
      position: coursePosition(map, (stop.week - 1) / 11) })),
    ...([1, 2] as const).map(assignment => {
      const point = coursePosition(map, assignment === 1 ? .5 : 1);
      return { key: `assignment-${assignment}`, week: 0, node: map.kitchen,
        title: `Assignment ${assignment}`, label: `Assignment ${assignment}`,
        stage: assignment === 1 ? 'order' as const : 'corridor' as const,
        href: `/assessments/assignment-${assignment}/`, position: groundPosition({ x: point.x + 105, y: point.y - 25 }) };
    }),
  ];
}

export function nearbyTarget<T extends { position: Position }>(position: Position, targets: T[], preferred?: T): T | undefined {
  const within = targets.map(target => ({ target, distance: Math.hypot(position.x - target.position.x, position.y - target.position.y) }))
    .filter(candidate => candidate.distance <= OPEN_RADIUS).sort((a, b) => a.distance - b.distance);
  // Shared locations retain the chosen week instead of changing while the camera settles.
  if (preferred && within.some(candidate => candidate.target === preferred && candidate.distance <= (within[0]?.distance ?? 0) + 1)) return preferred;
  return within[0]?.target;
}
