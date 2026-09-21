import { expect, it } from 'vitest';
import map from '../src/data/map.json';
import { stops, signs, hillStops, hillSections } from '../src/data/hill-stops';

it('anchors exactly twelve weeks and six sections to existing map nodes', () => {
  expect(stops.map(s => s.week)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  expect(signs.map(s => s.section).sort()).toEqual(['Assessment', 'Lab', 'Lectures', 'People', 'Policies', 'Tutorials']);
  for (const stop of [...stops, ...signs]) {
    expect(map.nodes.some(n => n.id === stop.node), stop.href).toBe(true);
  }
  expect(hillStops).toBe(stops);
  expect(hillSections).toBe(signs);
});
