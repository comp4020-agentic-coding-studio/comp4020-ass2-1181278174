import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';

describe('the experiment says what was actually checked', () => {
  it('counts the available block routes in its caption', () => {
    const run = runExperiment(defaultConfig(1));
    const table = run.tables.find(t => t.id === 'routes')!;
    expect(table.title).toContain(String(table.rows.length));
  });
  it('starts the three-drone tutorial with three drones', () => {
    const run = runExperiment(defaultConfig(7));
    expect(Object.keys(run.assignment!)).toHaveLength(3);
    expect(run.check?.complete).toBe(true);
  });
  it('distinguishes exact enumeration from a swap guarantee', () => {
    const input = defaultConfig(6);
    input.method = 'exact';
    const run = runExperiment(input);
    expect(run.objective?.lateness).toBe(46);
    expect(run.summary).toContain('Exact optimum');
    expect(run.summary).not.toContain('only a local optimum');
  });
  it('does not describe a FIFO result as a local optimum', () => {
    const input = defaultConfig(5);
    input.method = 'fifo';
    expect(runExperiment(input).summary).not.toContain('local optimum');
  });
});
