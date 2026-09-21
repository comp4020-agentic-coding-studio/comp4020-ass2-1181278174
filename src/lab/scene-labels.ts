import { Vector3, type Camera } from 'three';

export interface LabelBox { x: number; y: number; width: number; height: number }

/** Project the actual anchor; never pin an off-screen place to the viewport edge. */
export function projectLabel(point: Vector3, camera: Camera, width: number, height: number) {
    const view = point.clone().applyMatrix4(camera.matrixWorldInverse);
    const p = point.clone().project(camera);
    if (view.z >= 0 || ![p.x, p.y, p.z].every(Number.isFinite) ||
        Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1) return;
    return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
}

/** Labels may move a short distance, but a leader always returns to their anchor. */
export function placeLabel(anchor: { x: number; y: number }, width: number, height: number,
    viewport: { width: number; height: number }, occupied: LabelBox[]) {
    if (width > viewport.width - 12 || height > viewport.height - 12) return;
    const x = Math.max(6, Math.min(viewport.width - width - 6, anchor.x - width / 2));
    for (const offset of [-height - 12, 12, -2 * height - 20, height + 20]) {
        const y = anchor.y + offset;
        if (y < 6 || y + height > viewport.height - 6) continue;
        if (occupied.some(b => x < b.x + b.width + 5 && x + width + 5 > b.x &&
            y < b.y + b.height + 5 && y + height + 5 > b.y)) continue;
        return { x, y, width, height,
            lineX: Math.max(x + 4, Math.min(x + width - 4, anchor.x)),
            lineY: anchor.y < y ? y : y + height };
    }
}
