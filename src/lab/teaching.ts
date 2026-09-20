import { defaultConfig } from './model';

export const teachingActions: Record<number, { action: string; observe: string }> = {
  1: { action: 'Inspect a blocked connection', observe: 'Locate the proposed edge and the building it crosses. A shorter illegal connection is not a route.' },
  2: { action: 'Try stopping at discovery', observe: 'Compare returned cost 10 with 2. The first discovered goal is not the cheapest route.' },
  3: { action: 'Allow the node to reopen', observe: 'Compare cost 5 with 4 and inspect the improved route through B→A.' },
  4: { action: 'Try keeping only the fastest label', observe: 'The wrong rule discards the slower prefix that can return within the battery budget.' },
  5: { action: 'Try earliest deadline first', observe: 'Both canonical plans have zero lateness. Compare the final-return time and explain the tie on lateness.' },
  6: { action: 'Check all 720 sequences', observe: 'Compare the swap result (48,55) with the exact result (46,51), in symbolic time units.' },
  7: { action: 'Give the hotpot to a light drone', observe: 'Inspect #20: its 3.5 kg payload exceeds the light drone limit of 1.5 kg.' },
  8: { action: 'Compare one charging pad', observe: 'The fleet and orders stay fixed; pad capacity changes. This is a model comparison, so inspect the queue before judging the totals.' },
  9: { action: 'Let A wait for B', observe: 'A waits 5 seconds. The corridor intervals then touch without overlapping; hovering adds energy.' },
  10: { action: 'Plan B before A', observe: 'Compare the recorded waits under the same tasks and budgets. A priority change need not improve the objective.' },
  11: { action: 'Try feedback on the assignment', observe: 'Inspect the accepted move and the 120-candidate stopping reason. A valid budget-limited plan is not a proven optimum.' },
  12: { action: 'Compare the greedy plan', observe: 'Compare the recomputed 20/20 reference with the greedy plan, then select a late order and trace its cause.' },
};

/** Published demonstrations are reproducible inputs, never prerecorded outcomes. */
export function demonstrationInput(week: number, changed = false) {
  const c = defaultConfig(week);
  if (week === 11) c.method = 'independent';
  if (!changed) return c;
  if (week === 2) c.diagnostic = true;
  if (week === 3) c.diagnostic = false;
  if (week === 4) c.strategies.dominates.preset = 'time';
  if (week === 5) c.method = 'greedy';
  if (week === 6) c.method = 'exact';
  if (week === 8) c.scenario.pads = 1;
  if (week === 9) c.arrangement = 'wait';
  if (week === 10) c.strategies.priority.preset = 'reverse';
  if (week === 11) c.method = 'feedback';
  if (week === 12) c.method = 'greedy';
  return c;
}
