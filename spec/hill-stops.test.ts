import { expect, it } from 'vitest';
import map from '../src/data/map.json';
import { hillStops, hillSections } from '../src/data/hill-stops';

it('anchors exactly twelve weeks and six sections to existing map nodes', () => {
  expect(hillStops.map(s => s.week)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  expect(hillSections.map(s => s.section).sort()).toEqual(['Assessment', 'Lab', 'Lectures', 'People', 'Policies', 'Tutorials']);
  for (const stop of [...hillStops, ...hillSections]) {
    expect(map.nodes.some(n => n.id === stop.node), stop.href).toBe(true);
  }
});
