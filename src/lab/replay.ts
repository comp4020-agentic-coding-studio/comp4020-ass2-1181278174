import type { FlightEvent, SceneData } from './model.ts';
export function positionAt(scene: SceneData, event: FlightEvent, tick: number) {
    const a = scene.map.nodes.find(n => n.id === event.from)!, b = scene.map.nodes.find(n => n.id === event.to)!;
    const fraction = Math.max(0, Math.min(1, (tick - event.start) / (event.end - event.start)));
    const edge = event.kind === 'move' ? scene.map.edges.find(e => e.from === a.id && e.to === b.id) : undefined;
    const points = edge?.polyline ?? [[a.x, a.y], [b.x, b.y]];
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = lengths.reduce((s, n) => s + n, 0);
    let remaining = fraction * total, x = a.x, y = a.y;
    for (let i = 0; i < lengths.length; i++) {
        if (remaining <= lengths[i] || i === lengths.length - 1) {
            const f = lengths[i] ? remaining / lengths[i] : 0;
            x = points[i][0] + (points[i + 1][0] - points[i][0]) * f;
            y = points[i][1] + (points[i + 1][1] - points[i][1]) * f;
            break;
        }
        remaining -= lengths[i];
    }
    return { x, y, z: a.z + (b.z - a.z) * fraction, fraction };
}
export function fleetAt(scene: SceneData, tick: number) {
    return [...new Set(scene.events.map(e => e.drone))].map(drone => {
        const own = scene.events.filter(e => e.drone === drone).sort((a, b) => a.start - b.start);
        const event = own.find(e => e.start <= tick && e.end > tick) ?? own.filter(e => e.end <= tick).at(-1) ?? own[0];
        const position = positionAt(scene, event, tick);
        const flown = own.filter(e => e.order === event.order);
        let energyUsed = flown.reduce((sum, e) => sum + e.energy * Math.max(0, Math.min(1, (tick - e.start) / (e.end - e.start))), 0);
        const charge = flown.find(e => e.phase === 'charge');
        if (charge && tick >= charge.start)
            energyUsed *= 1 - Math.max(0, Math.min(1, (tick - charge.start) / (charge.end - charge.start)));
        return { drone, event, position, energyUsed };
    });
}
export function routePoints(scene: SceneData, path: string[]) {
    return path.flatMap((id, i) => { const n = scene.map.nodes.find(n => n.id === id); if (!n)
        return []; if (!i)
        return [{ x: n.x, y: n.y, z: n.z }]; const previous = scene.map.nodes.find(n => n.id === path[i - 1])!, edge = scene.map.edges.find(e => e.from === previous.id && e.to === id); return edge ? edge.polyline.slice(1).map(([x, y], j) => ({ x, y, z: previous.z + (n.z - previous.z) * (j + 1) / (edge.polyline.length - 1) })) : [{ x: n.x, y: n.y, z: n.z }]; });
}
