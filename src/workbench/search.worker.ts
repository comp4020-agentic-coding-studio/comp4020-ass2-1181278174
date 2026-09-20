import map from "../data/map.json";
import orders from "../data/orders.json";
import fleet from "../data/fleet.json";
import type { SearchState } from "./search-case";

const nodes = new Map(map.nodes.map((n) => [n.id, n]));
const distance = (a: string, b: string, dimensions: number) => {
  const p = nodes.get(a), q = nodes.get(b);
  if (!p || !q) throw new Error("Unknown waypoint");
  return Math.hypot(p.x - q.x, p.y - q.y, dimensions === 3 ? p.z - q.z : 0);
};
self.onmessage = (event: MessageEvent<SearchState>) => {
  try {
    const body = event.data.custom ?? "return Math.floor(dist3d(node, goal) / speed);";
    if (typeof body !== "string" || body.length > 10000) throw new Error("Function exceeds 10 000 characters");
    const fn = new Function("node", "goal", "dist2d", "dist3d", "speed", body);
    const values: Record<string, number> = {};
    for (const node of map.nodes) {
      const value = fn(node.id, orders.orders[2].node, (a: string, b: string) => distance(a, b, 2), (a: string, b: string) => distance(a, b, 3), fleet.types.find((t) => t.id === "L")!.speed);
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`h(${node.id}) must be a finite, non-negative number`);
      values[node.id] = value;
    }
    self.postMessage({ ok: true, values });
  } catch (error) { self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
};
