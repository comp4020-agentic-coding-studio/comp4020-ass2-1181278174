import { MOUSE } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type PickPointer = { pointerId: number; button: number; clientX: number; clientY: number };

/** A drag, cancellation or multi-touch gesture must never become a house selection. */
export function pickGesture() {
    const pointers = new Set<number>();
    let start: PickPointer | undefined, moved = false;
    return {
        start(event: PickPointer) {
            pointers.add(event.pointerId);
            if (pointers.size === 1) { start = event; moved = event.button !== 0; }
            else moved = true;
        },
        move(event: PickPointer) {
            if (start?.pointerId === event.pointerId &&
                Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 6) moved = true;
        },
        end(event: PickPointer) {
            this.move(event);
            const pick = pointers.size === 1 && start?.pointerId === event.pointerId && !moved;
            pointers.delete(event.pointerId);
            if (!pointers.size) start = undefined;
            return pick;
        },
        cancel() { pointers.clear(); start = undefined; moved = true; }
    };
}

export function sceneNavigation(host: HTMLElement, canvas: HTMLCanvasElement, controls: OrbitControls,
    manual: () => void, reset: () => void, pick: (event: PointerEvent, target: EventTarget | null) => void) {
    const controller = new AbortController(), { signal } = controller;
    const toolbar = document.createElement('div');
    toolbar.className = 'lab-scene-navigation';
    toolbar.innerHTML = `<div role="group" aria-label="3D camera controls"><button type="button" data-navigation="rotate" aria-pressed="true">Rotate</button><button type="button" data-navigation="move" aria-pressed="false">Move</button><button type="button" data-navigation="in" aria-label="Zoom in">+</button><button type="button" data-navigation="out" aria-label="Zoom out">−</button></div><span data-navigation-help>Drag to rotate · Shift/right-drag to move · Scroll to zoom</span>`;
    host.append(toolbar);
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D Slop Hill. Arrow keys move; Shift and arrow keys rotate; plus and minus zoom; Home resets the view.');
    controls.cursorStyle = 'grab';
    controls.screenSpacePanning = true;
    const manualStart = () => manual();
    controls.addEventListener('start', manualStart);
    // OrbitControls listens on the host so a label cannot swallow a drag or wheel.
    toolbar.addEventListener('pointerdown', event => event.stopPropagation(), { signal });
    toolbar.addEventListener('wheel', event => event.stopPropagation(), { signal });
    toolbar.addEventListener('click', event => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!button) return;
        manual();
        const action = button.dataset.navigation;
        if (action === 'in') controls.dollyOut(.8);
        else if (action === 'out') controls.dollyIn(.8);
        else {
            controls.mouseButtons.LEFT = action === 'move' ? MOUSE.PAN : MOUSE.ROTATE;
            toolbar.querySelectorAll('[aria-pressed]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
            toolbar.querySelector('[data-navigation-help]')!.textContent = action === 'move'
                ? 'Drag to move · Scroll to zoom · Choose Rotate to orbit'
                : 'Drag to rotate · Shift/right-drag to move · Scroll to zoom';
        }
    }, { signal });
    canvas.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_', 'Home'].includes(event.key)) return;
        manual();
        if (event.key.startsWith('Arrow')) return; // OrbitControls handles pan / Shift + orbit.
        event.preventDefault();
        if (event.key === 'Home') reset();
        else if (event.key === '+' || event.key === '=') controls.dollyOut(.8);
        else controls.dollyIn(.8);
    }, { signal });
    controls.listenToKeyEvents(canvas);
    const gesture = pickGesture();
    let target: EventTarget | null = null;
    host.addEventListener('pointerdown', event => {
        gesture.start(event); target = event.target;
        canvas.focus({ preventScroll: true });
    }, { signal });
    host.addEventListener('pointermove', event => gesture.move(event), { signal });
    host.addEventListener('pointerup', event => { if (gesture.end(event)) pick(event, target); }, { signal });
    host.addEventListener('pointercancel', () => gesture.cancel(), { signal });
    host.addEventListener('lostpointercapture', () => gesture.cancel(), { signal });
    return { toolbar, dispose() { controller.abort(); controls.removeEventListener('start', manualStart); toolbar.remove(); } };
}
