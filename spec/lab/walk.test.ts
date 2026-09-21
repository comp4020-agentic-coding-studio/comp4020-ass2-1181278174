import { expect, it } from 'vitest';
import { canonical } from '../../src/lab/model';
import { advance, groundPosition, nearbyTarget, walkTargets, WALK_SPEED } from '../../src/lab/walk/navigation';
import { terrainHeight } from '../../src/lab/terrain';
import { supportsWalking } from '../../src/lab/walk/availability';

it.each([
  ['desktop mouse', true, true, false, 0, true],
  ['desktop keyboard without pointer reporting', true, false, false, 0, true],
  ['desktop mouse and touchscreen', true, true, true, 10, true],
  ['desktop mouse with touch points only', true, true, false, 10, true],
  ['touch-only tablet', true, false, true, 10, false],
  ['narrow mouse and touchscreen', false, true, true, 10, false],
  ['narrow non-touch browser', false, true, false, 0, false],
] as const)('offers walking for %s only when desktop controls fit', (_name, wide, fine, coarse, touchPoints, expected) => {
  expect(supportsWalking({ wide, fine, coarse, touchPoints })).toBe(expected);
});

it('keeps walking on the terrain and within all four map edges', () => {
  const map = canonical.map;
  for (const [start, key] of [[{ x: 17, y: 17 }, 'a'], [{ x: 17, y: 17 }, 's'], [{ x: 1983, y: 1983 }, 'd'], [{ x: 1983, y: 1983 }, 'w']] as const) {
    const point = advance(start, new Set([key]), 1, map);
    expect(point.x).toBeGreaterThanOrEqual(16); expect(point.x).toBeLessThanOrEqual(map.world.width - 16);
    expect(point.y).toBeGreaterThanOrEqual(16); expect(point.y).toBeLessThanOrEqual(map.world.height - 16);
    expect(point.z).toBe(terrainHeight(point.x, point.y));
  }
  const summit = groundPosition({ x: 1240, y: 1460 });
  expect(summit.z).toBe(165);
  expect(advance(summit, new Set(['s']), .05, map).z).toBeLessThan(summit.z);
});

it('normalizes diagonal movement and caps resumed-frame distance', () => {
  const origin = { x: 1000, y: 1000 };
  const straight = advance(origin, new Set(['w']), .05, canonical.map);
  const diagonal = advance(origin, new Set(['w', 'd']), .05, canonical.map);
  expect(Math.hypot(diagonal.x - origin.x, diagonal.y - origin.y)).toBeCloseTo(straight.y - origin.y);
  expect(advance(origin, new Set(['w']), 100, canonical.map).y - origin.y).toBeCloseTo(WALK_SPEED * .05);
  expect(advance(origin, new Set(['w', 's']), .05, canonical.map).y).toBe(origin.y);
});

it('opens a nearby canonical destination and derives corridor and pad positions from the map', () => {
  const targets = walkTargets(canonical.map), kitchen = canonical.map.nodes.find(node => node.id === canonical.map.kitchen)!;
  expect(targets).toHaveLength(18);
  expect(nearbyTarget(targets[1].position, targets)?.week).toBe(2);
  expect(nearbyTarget(targets[2].position, targets)?.week).toBe(3);
  expect(nearbyTarget({ x: 1900, y: 100 }, targets)).toBeUndefined();
  const corridor = canonical.map.edges.find(edge => edge.resource === 'corridor')!;
  const a = canonical.map.nodes.find(node => node.id === corridor.from)!, b = canonical.map.nodes.find(node => node.id === corridor.to)!;
  expect((targets[8].position.x + targets[9].position.x) / 2).toBe((a.x + b.x) / 2);
  expect(targets[8].position.y).toBe((a.y + b.y) / 2);
  expect(targets[6].position.x).toBe(kitchen.x + 50);
  expect(targets[7].position.x).toBe(kitchen.x + 98);
  expect(nearbyTarget(targets[3].position, targets)?.week).toBe(4);
});
