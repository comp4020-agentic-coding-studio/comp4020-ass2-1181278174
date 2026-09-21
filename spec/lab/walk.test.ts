import { expect, it } from 'vitest';
import { canonical } from '../../src/lab/model';
import { advance, coursePosition, groundPosition, nearbyTarget, walkTargets, WALK_SPEED } from '../../src/lab/walk/navigation';
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

it('places twelve weeks progressively uphill and keeps only two assignment milestones', () => {
  const targets = walkTargets(canonical.map), weeks = targets.filter(target => target.week);
  expect(targets).toHaveLength(14);
  expect(weeks.map(target => target.week)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  expect(targets.slice(12).map(target => target.href)).toEqual(['/assessments/assignment-1/', '/assessments/assignment-2/']);
  for (let i = 1; i < weeks.length; i++) expect(weeks[i].position.z).toBeGreaterThan(weeks[i - 1].position.z);
  const kitchen = canonical.map.nodes.find(node => node.id === canonical.map.kitchen)!;
  expect(weeks[0].position.x).toBeCloseTo(kitchen.x);
  expect(weeks[0].position.y).toBeCloseTo(kitchen.y);
  expect(weeks[11].position.x).toBe(canonical.map.world.summit[0]);
  expect(weeks[11].position.y).toBe(canonical.map.world.summit[1]);
  for (const target of targets) expect(nearbyTarget(target.position, targets)).toBe(target);
  for (let i = 0; i <= 100; i++) {
    const point = coursePosition(canonical.map, i / 100);
    expect(point.z).toBe(terrainHeight(point.x, point.y));
    expect(point.x).toBeGreaterThan(0); expect(point.x).toBeLessThan(canonical.map.world.width);
    expect(point.y).toBeGreaterThan(0); expect(point.y).toBeLessThan(canonical.map.world.height);
  }
});
