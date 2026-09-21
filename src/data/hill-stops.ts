import map from './map.json';
import orders from './orders.json';

export type HillStage = 'route' | 'energy' | 'order' | 'fleet' | 'corridor';
export function stageForWeek(week: number): HillStage {
  return week <= 3 ? 'route' : week === 4 ? 'energy' : week <= 6 ? 'order' : week <= 8 ? 'fleet' : 'corridor';
}
const home = (id: string) => orders.orders.find(o => o.id === id)!.node;
const passage = map.edges.find(e => e.resource === 'corridor')!;
// A shared node stays canonical; the hub derives the passage midpoint from its edge.
const weeks = [
  [home('#03'), 'Kitchen block', 'w01-one-order'],
  [map.kitchen, 'Kitchen · Dijkstra', 'w02-dijkstra'],
  [map.kitchen, 'Kitchen · A*', 'w03-a-star'],
  [home('#07'), '#07 on the hilltop', 'w04-back-with-battery'],
  [home('#05'), 'Six homes · deadlines', 'w05-many-orders'],
  [home('#05'), 'Six homes · one swap', 'w06-one-swap'],
  [map.kitchen, 'Charging pads · fleet', 'w07-which-drone'],
  [map.kitchen, 'Charging pads · queue', 'w08-charging-pads'],
  [passage.from, 'Corridor · conflict', 'w09-same-place'],
  [passage.from, 'Corridor · reservations', 'w10-searching-in-time'],
  [home('#13'), '#13 across the corridor', 'w11-routes-changed'],
  [home('#07'), 'Hilltop · twenty dinners', 'w12-twenty-dinners'],
];
export const stops = weeks.map(([node, title, slug], i) => ({
  week: i + 1, node, stage: stageForWeek(i + 1), title, href: `/sessions/${slug}/`,
}));
export const signs = [
  ['Lectures', '/lectures/'], ['Tutorials', '/sessions/'], ['Assessment', '/assessments/'],
  ['People', '/people/'], ['Policies', '/policies/'], ['Lab', '/lab/'],
].map(([section, href]) => ({ section, node: map.kitchen, href }));

// Keep the existing course components on the same shared contract.
export const hillStops = stops;
export const hillSections = signs;
