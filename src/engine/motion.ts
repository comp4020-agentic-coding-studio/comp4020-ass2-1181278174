import type { DroneType, MapData } from "../data/schema.ts";
import { edgeEnergy, edgeTicks } from "./graph.ts";
/** A physical action, distinct from an algorithm expanding a search state. */
export interface Movement {
    kind: "move" | "hover" | "ground-wait";
    from: string;
    to: string;
    start: number;
    end: number;
    energy: number;
    edge?: string;
    resource?: string;
}
export function pathMovements(map: MapData, type: DroneType, path: string[], depart: number, payload: number): Movement[] {
    let tick = depart;
    return path.slice(1).map((to, i) => {
        const edge = map.edges.find(e => e.from === path[i] && e.to === to);
        if (!edge)
            throw new Error(`Not a legal directed edge: ${path[i]} → ${to}`);
        const start = tick;
        tick += edgeTicks(edge, type);
        return { kind: "move", from: path[i], to, start, end: tick, energy: edgeEnergy(edge, type, payload), edge: edge.id, resource: edge.resource };
    });
}
export function compactWaits(actions: Movement[]): Movement[] {
    const out: Movement[] = [];
    for (const a of actions) {
        const prev = out.at(-1);
        if (a.kind !== "move" && prev?.kind === a.kind && prev.to === a.from && prev.end === a.start) {
            prev.end = a.end;
            prev.energy += a.energy;
        }
        else
            out.push({ ...a });
    }
    return out;
}
