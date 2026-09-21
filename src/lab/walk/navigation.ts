import type { MapData } from '../../data/schema';
import { stops, signs } from '../../data/hill-stops';
import { terrainHeight } from '../terrain';

export interface Position { x: number; y: number }
export const WALK_SPEED = 170;
export const OPEN_RADIUS = 210;
export const groundPosition = (point: Position) => ({ ...point, z: terrainHeight(point.x, point.y) });

/** Diagonals cover the same distance as straight walking; map edges are hard limits. */
export function advance(position: Position, keys: ReadonlySet<string>, seconds: number, map: MapData) {
  const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const y = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
  const length = Math.hypot(x, y) || 1, distance = WALK_SPEED * Math.min(.05, Math.max(0, seconds));
  const clamp = (value: number, limit: number) => Math.max(16, Math.min(limit - 16, value));
  return groundPosition({ x: clamp(position.x + x / length * distance, map.world.width), y: clamp(position.y + y / length * distance, map.world.height) });
}

/** Canonical places define the stops; two weeks at one place stand side by side. */
export function walkTargets(map: MapData) {
  const nodes = new Map(map.nodes.map(node => [node.id, node]));
  const corridor = map.edges.find(edge => edge.resource === 'corridor')!;
  const a = nodes.get(corridor.from)!, b = nodes.get(corridor.to)!;
  return [
    ...stops.map(stop => {
      const node = nodes.get(stop.node)!;
      const place = stop.week === 9 || stop.week === 10 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        : stop.week === 7 || stop.week === 8 ? { x: node.x + 50 + (stop.week - 7) * 48, y: node.y } : node;
      const pair = [[2, 3], [4, 12], [5, 6], [9, 10]].find(weeks => weeks.includes(stop.week));
      const point = { x: place.x + (pair ? pair[0] === stop.week ? -30 : 30 : 0), y: place.y };
      return { ...stop, key: `week-${stop.week}`, label: `Week ${stop.week} · ${stop.title}`, position: groundPosition(point) };
    }),
    ...signs.map((sign, index) => {
      const kitchen = nodes.get(sign.node)!;
      return { ...sign, key: `section-${index}`, label: sign.section, week: 0, stage: 'route' as const, title: sign.section,
        position: groundPosition({ x: kitchen.x + (index - 2.5) * 34, y: kitchen.y - 90 }) };
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
