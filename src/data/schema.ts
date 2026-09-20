// The shape of the canonical data. Five ideas: a map (nodes, directed edges,
// buildings), the orders, the fleet, the pads and the rules. Everything the
// engine computes — edge time and energy, timetables, occupancy — is derived
// from these files and the formulas in src/engine; nothing here is a result.

export interface MapNode {
  id: string;
  /** Metres east and north of the south-west corner; metres above the foot. */
  x: number;
  y: number;
  z: number;
  kind: "street" | "kitchen";
  /** A drone may hold position here (in the air, at hover power). */
  wait?: boolean;
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  /** Horizontal length in metres along the polyline. */
  length: number;
  /** z(to) − z(from), metres; positive when climbing. */
  rise: number;
  polyline: [number, number][];
  /** A shared resource this edge occupies; both directions of the corridor share one. */
  resource?: string;
}

export interface Building {
  id: string;
  kind: "tower" | "block" | "kitchen";
  /** Axis-aligned footprint: south-west corner, width (east) and depth (north), height. */
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
}

export interface MapData {
  version: 1;
  seed: number;
  world: { width: number; height: number; summit: [number, number]; summitHeight: number };
  kitchen: string;
  nodes: MapNode[];
  edges: MapEdge[];
  buildings: Building[];
}

export interface Order {
  id: string;
  node: string;
  /** Ticks after 18:00 when the dish is ready. */
  ready: number;
  /** Kilograms. */
  weight: number;
  /** Promised delivery tick; lateness is measured against this. */
  promised: number;
  label: string;
}

export interface OrdersData {
  version: 1;
  orders: Order[];
}

export interface DroneType {
  id: "L" | "H";
  label: string;
  speed: number;
  /** Fastest sustained climb, m/s. An edge steeper than the drone can climb at cruise slows it down. */
  maxClimb: number;
  payloadKg: number;
  batteryJ: number;
  /** Power at cruise, unloaded, watts; loaded power is cruiseW × (1 + payloadFactor × kg). */
  cruiseW: number;
  payloadFactor: number;
  /** Power while climb-limited, watts. */
  climbW: number;
  /** Energy per metre of rise on top of the time-based terms, joules. */
  liftJPerM: number;
  hoverW: number;
}

export interface FleetData {
  version: 1;
  types: DroneType[];
  drones: { id: string; type: "L" | "H" }[];
}

export interface RulesData {
  version: 1;
  tick: { seconds: 1 };
  evening: { start: "18:00"; end: "21:00"; cutoff: "21:30"; endTick: number; cutoffTick: number };
  /** Fraction of the battery that must remain when the drone lands. */
  reserveFraction: number;
  loadingTicks: number;
  serviceTicks: number;
  turnaroundTicks: number;
  /** Seconds to charge from empty to full; the effective rate is batteryJ / chargeTicks. */
  chargeTicks: number;
  resources: Record<string, { capacity: number }>;
  objective: ["lateness", "allReturned", "energy"];
}
