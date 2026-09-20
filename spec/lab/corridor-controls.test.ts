import { expect, it } from 'vitest';
import { defaultConfig } from '../../src/lab/model';
import { parseConfig } from '../../src/lab/input';
import { runExperiment } from '../../src/lab/compute';

const custom = (delay: number, route = 'pass') => parseConfig({ ...defaultConfig(9), arrangement: 'custom', corridorDelay: delay, corridorRoute: route });

it('keeps a one-second overlap when A departs four seconds later', () => {
  const run = runExperiment(custom(4));
  const a = run.scene!.events.find(e => e.drone === 'A' && e.resource === 'corridor')!;
  const b = run.scene!.events.find(e => e.drone === 'B' && e.resource === 'corridor')!;
  expect(run.status).toBe('diagnostic');
  expect(Math.min(a.end, b.end) - Math.max(a.start, b.start)).toBe(1);
});

it('allows touching intervals with a five-second ground delay, without charging hover energy', () => {
  const run = runExperiment(custom(5));
  const events = run.scene!.events;
  expect(run.status).toBe('verified');
  expect(events.find(e => e.drone === 'A' && e.resource === 'corridor')!.start).toBe(112);
  expect(events.find(e => e.drone === 'B' && e.resource === 'corridor')!.end).toBe(112);
  expect(events.find(e => e.drone === 'A' && e.kind === 'ground-wait')).toMatchObject({ from: 'kitchen', to: 'kitchen', start: 0, end: 5, energy: 0 });
  expect(events.some(e => e.drone === 'A' && e.kind === 'hover')).toBe(false);
  const before = runExperiment(defaultConfig(9));
  expect(run.metrics.find(m => m.key === 'A energy (J)')!.value).toBe(before.metrics.find(m => m.key === 'A energy (J)')!.value);
});

it('can combine a chosen delay with the legal route around the pass', () => {
  const run = runExperiment(custom(12, 'detour'));
  expect(run.status).toBe('verified');
  expect(run.scene!.events.some(e => e.drone === 'A' && e.resource === 'corridor')).toBe(false);
  expect(run.scene!.events.find(e => e.drone === 'A' && e.kind === 'move')!.start).toBe(12);
});

it('rejects invalid manual corridor settings', () => {
  for (const delay of [-1, 1.5, 601]) expect(() => custom(delay)).toThrow(/delay/i);
  expect(() => custom(0, 'shortcut')).toThrow(/route/i);
});
