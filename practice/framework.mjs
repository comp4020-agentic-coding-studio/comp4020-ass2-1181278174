// Provided state-space driver. Students supply successor generation, not geometry or rendering.
export function stateSearch(start, goal, edges, reservations, neighbours, options = {}) {
  const { horizon = 20, budget = 20, waitNodes = ['P'], waitEnergy = 0 } = options;
  const key = s => `${s.node}|${s.phase}|${s.tick}`;
  const queue = [{ state: start, path: [start] }], best = new Map([[key(start), start.energy]]);
  let expansions = 0;
  while (queue.length) {
    queue.sort((a, b) => a.state.tick - b.state.tick || a.state.energy - b.state.energy);
    const { state, path } = queue.shift();
    if (state.energy !== best.get(key(state))) continue;
    if (state.node === goal.node && state.phase === goal.phase) return { status: 'found', path, arrival: state.tick, energy: state.energy, expansions };
    if (++expansions > 2000) return { status: 'budget', expansions };
    const next = neighbours(structuredClone(state), structuredClone(edges), structuredClone(reservations), {horizon,budget,waitNodes,waitEnergy});
    if (!Array.isArray(next)) throw Error('myNeighbours must return an array');
    for (const n of next) {
      // Reconstruct legality independently; a permissive student filter cannot waive a rule.
      const wait = n.node === state.node && n.phase === state.phase && n.tick === state.tick + 1 && waitNodes.includes(state.node) && n.energy === state.energy + waitEnergy;
      const move = edges.find(e => e.from === state.node && e.to === n.node && (!e.phase || e.phase === state.phase) && n.phase === (e.toPhase ?? state.phase) && n.tick === state.tick + e.ticks && n.energy === state.energy + e.energy && !reservations.some(r => r.resource === e.resource && Math.max(state.tick, r.start) < Math.min(n.tick, r.end)));
      if (!Number.isSafeInteger(n.tick) || !Number.isFinite(n.energy) || n.tick <= state.tick || n.energy < state.energy || (!wait && !move)) throw Error('Illegal successor from myNeighbours: ' + JSON.stringify(n));
      if (n.tick > horizon || n.energy > budget) continue;
      if (n.energy >= (best.get(key(n)) ?? Infinity)) continue;
      best.set(key(n), n.energy); queue.push({ state: n, path: [...path, n] });
    }
  }
  return { status: 'no-solution', expansions };
}

export function sameOrders(actual, expected) {
  const a = actual.flat().map(String).sort(), b = expected.map(String).sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) throw Error('Every order must occur exactly once');
}
