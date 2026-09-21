import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { placeLabel, projectLabel } from '../../src/lab/scene-labels';
import { pickGesture } from '../../src/lab/scene-navigation';

it('keeps label anchors aligned after orbiting, panning and resizing the camera', () => {
    const camera = new PerspectiveCamera(43, 2, 1, 10000), home = new Vector3(80, 30, -60);
    for (const [width, height] of [[1082, 500], [326, 330]]) {
        camera.aspect = width / height; camera.updateProjectionMatrix();
        for (const offset of [[400, 250, 450], [-350, 100, -300], [1, 700, 1]]) {
            camera.position.copy(home).add(new Vector3(...offset)); camera.lookAt(home); camera.updateMatrixWorld();
            expect(projectLabel(home, camera, width, height)).toEqual({ x: expect.closeTo(width / 2), y: expect.closeTo(height / 2) });
        }
    }
});

it('hides offscreen and behind-camera labels instead of pinning them to an edge', () => {
    const camera = new PerspectiveCamera(43, 2, 1, 1000); camera.updateMatrixWorld();
    for (const point of [[0, 0, 10], [1000, 0, -10], [0, 0, -.5], [0, 0, -2000]])
        expect(projectLabel(new Vector3(...point), camera, 800, 400)).toBeUndefined();
});

it('connects displaced labels to their own anchor and hides labels with no nearby space', () => {
    const viewport = { width: 390, height: 330 }, anchor = { x: 170, y: 150 };
    const first = placeLabel(anchor, 120, 24, viewport, [])!;
    const second = placeLabel(anchor, 120, 24, viewport, [first])!;
    expect(first.y + first.height).toBeLessThan(anchor.y);
    expect(second.y).toBeGreaterThan(anchor.y);
    expect(second.lineX).toBe(anchor.x); expect(second.lineY).toBe(second.y);
    expect(placeLabel(anchor, 120, 24, viewport, [{ x: 0, y: 0, ...viewport }])).toBeUndefined();
    expect(placeLabel(anchor, 400, 24, viewport, [])).toBeUndefined();
});

const pointer = (x: number, button = 0, pointerId = 1) => ({ clientX: x, clientY: 30, pointerId, button });

it('selects only a left click, never a right pan or a drag that returns to its start', () => {
    const gesture = pickGesture();
    gesture.start(pointer(20)); expect(gesture.end(pointer(22))).toBe(true);
    gesture.start(pointer(20, 2)); expect(gesture.end(pointer(20, 2))).toBe(false);
    gesture.start(pointer(20)); gesture.move(pointer(80)); expect(gesture.end(pointer(20))).toBe(false);
});

it('does not select after cancellation, a pinch, or an unpaired pointer release', () => {
    const gesture = pickGesture();
    gesture.start(pointer(20)); gesture.cancel(); expect(gesture.end(pointer(20))).toBe(false);
    gesture.start(pointer(20)); gesture.start(pointer(40, 0, 2));
    expect(gesture.end(pointer(40, 0, 2))).toBe(false); expect(gesture.end(pointer(20))).toBe(false);
    expect(gesture.end(pointer(20))).toBe(false);
});
