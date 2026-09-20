// The graph the search runs on, and the one place edge time and energy are
// computed from geometry, a drone type and a payload (docs/engine.md §1).

import type { DroneType, MapData, MapEdge, MapNode } from "../data/schema.ts";

export interface Neighbour {
  to: string;
  cost: number;
  edge?: string;
}

export interface WeightedGraph {
  nodeIds(): string[];
  neighbours(from: string): Neighbour[];
}

/** Ticks to fly an edge: cruise time, or longer when the climb rate binds. */
export function edgeTicks(edge: MapEdge, type: DroneType): number {
  const cruise = edge.length / type.speed;
  const climb = Math.max(edge.rise, 0) / type.maxClimb;
  return Math.ceil(Math.max(cruise, climb));
}

/** Joules to fly an edge with a payload: cruise power for the cruise time,
 *  climb power for any time the climb limit adds, and lift for the rise.
 *  Descent adds nothing and refunds nothing. */
export function edgeEnergy(edge: MapEdge, type: DroneType, payloadKg = 0): number {
  const cruise = edge.length / type.speed;
  const climb = Math.max(edge.rise, 0) / type.maxClimb;
  const cruiseW = type.cruiseW * (1 + type.payloadFactor * payloadKg);
  const extra = Math.max(0, climb - cruise);
  return Math.round(cruiseW * cruise + type.climbW * extra + type.liftJPerM * Math.max(edge.rise, 0));
}

export function hoverEnergy(type: DroneType, ticks: number): number {
  return Math.round(type.hoverW * ticks);
}

export interface MapGraph extends WeightedGraph {
  node(id: string): MapNode;
  edge(id: string): MapEdge;
}

/** The map as a weighted graph for one drone type, costed in ticks or joules. */
export function fromMap(map: MapData, type: DroneType, cost: "time" | "energy", payloadKg = 0): MapGraph {
  const nodes = new Map(map.nodes.map((n) => [n.id, n]));
  const edges = new Map(map.edges.map((e) => [e.id, e]));
  const out = new Map<string, Neighbour[]>();
  for (const e of map.edges) {
    const c = cost === "time" ? edgeTicks(e, type) : edgeEnergy(e, type, payloadKg);
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, cost: c, edge: e.id });
    out.set(e.from, list);
  }
  return {
    nodeIds: () => [...nodes.keys()],
    neighbours: (from) => out.get(from) ?? [],
    node: (id) => {
      const n = nodes.get(id);
      if (!n) throw new Error(`no node ${id}`);
      return n;
    },
    edge: (id) => {
      const e = edges.get(id);
      if (!e) throw new Error(`no edge ${id}`);
      return e;
    },
  };
}

/** A small directed graph given as a list of edges, for the teaching examples. */
export function fromEdges(edges: { from: string; to: string; cost: number }[]): WeightedGraph {
  const ids = new Set<string>();
  const out = new Map<string, Neighbour[]>();
  for (const e of edges) {
    ids.add(e.from);
    ids.add(e.to);
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, cost: e.cost });
    out.set(e.from, list);
  }
  return { nodeIds: () => [...ids], neighbours: (from) => out.get(from) ?? [] };
}

/** Straight-line distance over the drone's speed, floored to whole ticks: a
 *  lower bound on the time to the goal, and consistent with edgeTicks. */
export function straightLineTicks(graph: MapGraph, type: DroneType, goal: string): (id: string) => number {
  const g = graph.node(goal);
  return (id) => {
    const n = graph.node(id);
    return Math.floor(Math.hypot(n.x - g.x, n.y - g.y) / type.speed);
  };
}

export interface BiNeighbour {
  to: string;
  time: number;
  energy: number;
  edge?: string;
}

/** A graph whose edges carry both a time and an energy, for label search. */
export interface BiGraph {
  nodeIds(): string[];
  neighbours(from: string): BiNeighbour[];
}

/** The map for one drone type and payload, each edge costed in ticks and joules. */
export function fromMapTimeEnergy(map: MapData, type: DroneType, payloadKg = 0): BiGraph {
  const ids = map.nodes.map((n) => n.id);
  const out = new Map<string, BiNeighbour[]>();
  for (const e of map.edges) {
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, time: edgeTicks(e, type), energy: edgeEnergy(e, type, payloadKg), edge: e.id });
    out.set(e.from, list);
  }
  return { nodeIds: () => ids, neighbours: (from) => out.get(from) ?? [] };
}

/** A small (time, energy) graph given as a list of edges, for the teaching examples. */
export function fromBiEdges(edges: { from: string; to: string; time: number; energy: number }[]): BiGraph {
  const ids = new Set<string>();
  const out = new Map<string, BiNeighbour[]>();
  for (const e of edges) {
    ids.add(e.from);
    ids.add(e.to);
    const list = out.get(e.from) ?? [];
    list.push({ to: e.to, time: e.time, energy: e.energy });
    out.set(e.from, list);
  }
  return { nodeIds: () => [...ids], neighbours: (from) => out.get(from) ?? [] };
}
