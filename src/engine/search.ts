// Dijkstra and A* as one stepping search (docs/engine.md §3, weeks 2 and 3).
//
// One loop. h = 0 is Dijkstra. The goal is done when it is POPPED, not when it
// is generated. A better path to an already expanded node reopens it unless
// `reopenClosed` is false, which reproduces the classic wrong implementation
// the week 3 counterexample is built on. Every pop is recorded so a page can
// show the OPEN list one expansion at a time.

import type { WeightedGraph } from "./graph.ts";

export interface OpenEntry {
  node: string;
  g: number;
  h: number;
  f: number;
  parent?: string;
  /** Insertion order, the tie-break after f. */
  seq: number;
}

export interface Relaxation {
  to: string;
  newG: number;
  oldG?: number;
  /** false when the new path was not better, or the node was closed and reopening is off. */
  improved: boolean;
  reopened: boolean;
  skippedClosed: boolean;
}

export interface Step {
  n: number;
  popped: string;
  g: number;
  f: number;
  /** A queue entry whose g was already beaten; skipped, not expanded. */
  stale: boolean;
  relaxed: Relaxation[];
  open: OpenEntry[];
  closed: string[];
}

export interface SearchOptions {
  heuristic?: (id: string) => number;
  reopenClosed?: boolean;
  maxExpansions?: number;
}

export type SearchStatus = "found" | "no-solution" | "budget";

export interface SearchResult {
  status: SearchStatus;
  cost?: number;
  path?: string[];
  /** Effective expansions: stale pops are not counted. */
  expansions: number;
  queueOps: number;
  steps: Step[];
}

export class Searcher {
  private readonly h: (id: string) => number;
  private readonly reopen: boolean;
  private readonly budget: number;
  private open: OpenEntry[] = [];
  private readonly best = new Map<string, number>();
  private readonly parent = new Map<string, string>();
  private readonly closed = new Set<string>();
  private seq = 0;
  private expansions = 0;
  private queueOps = 0;
  private readonly steps: Step[] = [];
  private done: SearchResult | null = null;
  private readonly graph: WeightedGraph;
  private readonly goal: string;

  constructor(graph: WeightedGraph, start: string, goal: string, options: SearchOptions = {}) {
    this.graph = graph;
    this.goal = goal;
    this.h = options.heuristic ?? (() => 0);
    this.reopen = options.reopenClosed ?? true;
    this.budget = options.maxExpansions ?? Infinity;
    this.push(start, 0, undefined);
  }

  private push(node: string, g: number, parent: string | undefined): void {
    const h = this.h(node);
    this.open.push({ node, g, h, f: g + h, parent, seq: this.seq++ });
    this.best.set(node, g);
    if (parent !== undefined) this.parent.set(node, parent);
    this.queueOps++;
  }

  private pop(): OpenEntry {
    let k = 0;
    for (let i = 1; i < this.open.length; i++) {
      const a = this.open[i], b = this.open[k];
      if (a.f < b.f || (a.f === b.f && a.seq < b.seq)) k = i;
    }
    this.queueOps++;
    return this.open.splice(k, 1)[0];
  }

  private path(): string[] {
    const out: string[] = [];
    let cur: string | undefined = this.goal;
    while (cur !== undefined) {
      out.unshift(cur);
      cur = this.parent.get(cur);
    }
    return out;
  }

  private finish(status: SearchStatus, cost?: number): SearchResult {
    this.done = {
      status,
      ...(status === "found" ? { cost, path: this.path() } : {}),
      expansions: this.expansions,
      queueOps: this.queueOps,
      steps: this.steps,
    };
    return this.done;
  }

  /** One pop. Returns the step, or null once the search has finished. */
  step(): Step | null {
    if (this.done) return null;
    if (this.open.length === 0) {
      this.finish("no-solution");
      return null;
    }
    const entry = this.pop();
    const stale = entry.g > (this.best.get(entry.node) ?? Infinity);
    const relaxed: Relaxation[] = [];
    if (!stale) {
      if (entry.node === this.goal) {
        this.expansions++;
        this.record(entry, stale, relaxed);
        this.finish("found", entry.g);
        return this.steps[this.steps.length - 1];
      }
      if (this.expansions >= this.budget) {
        this.open.push(entry);
        this.finish("budget");
        return null;
      }
      this.expansions++;
      this.closed.add(entry.node);
      for (const nb of this.graph.neighbours(entry.node)) {
        const newG = entry.g + nb.cost;
        const oldG = this.best.get(nb.to);
        const wasClosed = this.closed.has(nb.to);
        if (wasClosed && !this.reopen) {
          relaxed.push({ to: nb.to, newG, oldG, improved: false, reopened: false, skippedClosed: true });
          continue;
        }
        if (oldG === undefined || newG < oldG) {
          if (wasClosed) this.closed.delete(nb.to);
          this.push(nb.to, newG, entry.node);
          relaxed.push({ to: nb.to, newG, oldG, improved: true, reopened: wasClosed, skippedClosed: false });
        } else {
          relaxed.push({ to: nb.to, newG, oldG, improved: false, reopened: false, skippedClosed: false });
        }
      }
    }
    this.record(entry, stale, relaxed);
    return this.steps[this.steps.length - 1];
  }

  private record(entry: OpenEntry, stale: boolean, relaxed: Relaxation[]): void {
    this.steps.push({
      n: this.steps.length + 1,
      popped: entry.node,
      g: entry.g,
      f: entry.f,
      stale,
      relaxed,
      open: [...this.open].sort((a, b) => a.f - b.f || a.seq - b.seq).map((e) => ({ ...e })),
      closed: [...this.closed],
    });
  }

  run(): SearchResult {
    while (!this.done) this.step();
    return this.done;
  }

  result(): SearchResult | null {
    return this.done;
  }
}

export function search(graph: WeightedGraph, start: string, goal: string, options: SearchOptions = {}): SearchResult {
  return new Searcher(graph, start, goal, options).run();
}

/** Exact cost-to-go for every node, by searching from the goal over reversed edges. */
export function costToGo(graph: WeightedGraph, goal: string): Map<string, number> {
  const reversed = new Map<string, { to: string; cost: number }[]>();
  for (const id of graph.nodeIds()) {
    for (const nb of graph.neighbours(id)) {
      const list = reversed.get(nb.to) ?? [];
      list.push({ to: id, cost: nb.cost });
      reversed.set(nb.to, list);
    }
  }
  const rgraph: WeightedGraph = { nodeIds: () => graph.nodeIds(), neighbours: (id) => reversed.get(id) ?? [] };
  const out = new Map<string, number>();
  for (const id of graph.nodeIds()) {
    const r = search(rgraph, goal, id);
    if (r.status === "found") out.set(id, r.cost!);
  }
  return out;
}

/** h never overestimates the exact cost to the goal. */
export function admissible(graph: WeightedGraph, h: (id: string) => number, goal: string) {
  const exact = costToGo(graph, goal);
  const violations: { node: string; h: number; exact: number }[] = [];
  for (const [node, c] of exact) if (h(node) > c) violations.push({ node, h: h(node), exact: c });
  return { ok: violations.length === 0, violations };
}

/** h(u) ≤ cost(u, v) + h(v) on every edge. */
export function consistent(graph: WeightedGraph, h: (id: string) => number) {
  const violations: { from: string; to: string; h: number; cost: number; hTo: number }[] = [];
  for (const from of graph.nodeIds()) {
    for (const nb of graph.neighbours(from)) {
      if (h(from) > nb.cost + h(nb.to)) violations.push({ from, to: nb.to, h: h(from), cost: nb.cost, hTo: h(nb.to) });
    }
  }
  return { ok: violations.length === 0, violations };
}
