// Function bodies can also be pasted into the matching Lab slot.
// Start with these working baselines, then improve or diagnose them.
export function h(node, goal, state) { return 0; } // TODO: prove a useful lower bound.
export function dominates(a, b) {
  return a.time <= b.time && a.energy <= b.energy && (a.time < b.time || a.energy < b.energy);
}
export function withinBudget(label, budget) { return label.energy <= budget; }
export function orderKey(order, state) { return order.promised; }
export function objective(plan) { return [plan.lateness, plan.allReturned, plan.energy]; }
export function assignCost(drone, order, state) { return state.predicted; } // TODO: account for actual waits.
export function priority(tasks, state) { return tasks.map(t => t.drone).sort(); }

// W2/W3: implement your own search here, using the edge-list contract in README.
// The reference engine is deliberately available separately for comparison.
export function mySearch(edges, source, goal, heuristic = () => 0) {
  throw new Error('Implement OPEN, best distances, parents, relaxation and reopening.');
}
// W10: propose wait/move successors; test the whole occupancy interval.
export function myNeighbours(state, edges, reservations) {
  throw new Error('Generate legal (node, phase, tick, energy) successors.');
}
