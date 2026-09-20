import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tutorialMarking } from '../src/lib/assessment-plan';

interface Node {
  id: string;
  type: string;
  meta: { weight?: number; week?: number };
}
const { nodes } = JSON.parse(readFileSync(resolve('dist/api/index.json'), 'utf8')) as { nodes: Node[] };
const html = (id: string) => readFileSync(resolve('dist', id, 'index.html'), 'utf8');

describe('weekly tutorial assessment', () => {
  it('publishes weekly participation alongside the two assignments, totalling 100%', () => {
    const assessments = nodes.filter(node => node.type === 'assessments');
    expect(Object.fromEntries(assessments.map(node => [node.id, node.meta.weight]))).toEqual({
      'assessments/tutorial-participation': tutorialMarking.weight,
      'assessments/assignment-1': 30,
      'assessments/assignment-2': 50,
    });
    expect(assessments.reduce((total, node) => total + (node.meta.weight ?? 0), 0)).toBe(100);
  });

  it('gives every one of the twelve tutorials the same marking rule and a link to it', () => {
    const sessions = nodes.filter(node => node.type === 'sessions');
    expect(sessions).toHaveLength(tutorialMarking.weeks);
    for (const session of sessions) {
      const page = html(session.id);
      expect(page, session.id).toContain('1 attendance point + 1 participation point');
      expect(page, session.id).toContain('/assessments/tutorial-participation/');
      expect(page, session.id).not.toContain('These tutorial records are ungraded');
    }
    expect(tutorialMarking.attendancePoints + tutorialMarking.participationPoints).toBe(tutorialMarking.pointsPerWeek);
    expect(tutorialMarking.weeks * tutorialMarking.pointsPerWeek).toBe(24);
  });

  it('keeps all lecture, tutorial and assessment destinations in the server-rendered timeline', () => {
    const home = html('');
    const chart = home.slice(home.indexOf('aria-labelledby="semester-title"'), home.indexOf('How participation is marked'));
    expect(chart).toContain('Every tutorial counts');
    for (const node of nodes.filter(node => ['lectures', 'sessions', 'assessments'].includes(node.type))) {
      expect(chart, node.id).toContain(`/${node.id}/`);
    }
  });
});
