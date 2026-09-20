import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneData } from './model.ts';
import { fleetAt, routePoints } from './replay.ts';
import { terrainHeight } from './terrain.ts';
export function mountScene(host: HTMLElement, data: SceneData, onSelect: (node: string) => void) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf1e6');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3D Slop Hill; use the named camera buttons and evidence table for keyboard access');
    renderer.domElement.setAttribute('role', 'img');
    const camera = new THREE.PerspectiveCamera(43, 1, 1, 10000), controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 170;
    controls.maxDistance = 4400;
    controls.maxPolarAngle = Math.PI * .49;
    const to3 = (x: number, y: number, z: number) => new THREE.Vector3(x - 1000, z * 3, 1000 - y);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x637557, 2.5));
    const sun = new THREE.DirectionalLight(0xfff5dd, 2.5);
    sun.position.set(-500, 1700, 800);
    scene.add(sun);
    const surface = new THREE.PlaneGeometry(2000, 2000, 64, 64);
    surface.rotateX(-Math.PI / 2);
    const pos = surface.attributes.position;
    for (let i = 0; i < pos.count; i++)
        pos.setY(i, terrainHeight(pos.getX(i) + 1000, 1000 - pos.getZ(i)) * 3);
    surface.computeVertexNormals();
    scene.add(new THREE.Mesh(surface, new THREE.MeshStandardMaterial({ color: '#c0cca3', roughness: 1, flatShading: false })));
    const nodes = new Map(data.map.nodes.map(n => [n.id, n]));
    const drawLine = (pts: THREE.Vector3[], color: string, width = 1) => { const geometry = new THREE.BufferGeometry().setFromPoints(pts); const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: width })); scene.add(line); return line; };
    for (const e of data.map.edges) {
        const a = nodes.get(e.from)!, b = nodes.get(e.to)!;
        drawLine(e.polyline.map(([x, y], i) => to3(x, y, a.z + (b.z - a.z) * i / Math.max(1, e.polyline.length - 1) + 3)), e.resource ? '#c0780b' : '#879c85');
    }
    const boxes: {
        id: string;
        mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
        color: THREE.Color;
    }[] = [];
    for (const b of data.map.buildings) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h * 3, b.d), new THREE.MeshStandardMaterial({ color: b.kind === 'tower' ? '#617260' : b.kind === 'kitchen' ? '#b78731' : '#d9decd', roughness: .9 }));
        box.position.copy(to3(b.x + b.w / 2, b.y + b.d / 2, terrainHeight(b.x + b.w / 2, b.y + b.d / 2) + b.h / 2));
        scene.add(box);
        boxes.push({ id: b.id, mesh: box, color: box.material.color.clone() });
    }
    for (const r of data.routes.slice(0, 30)) {
        const points = r.path.flatMap((id, i) => { const n = nodes.get(id); if (!n)
            return []; if (!i)
            return [to3(n.x, n.y, n.z + 12)]; const edge = data.map.edges.find(e => e.from === r.path[i - 1] && e.to === id), prev = nodes.get(r.path[i - 1])!; return edge ? edge.polyline.slice(1).map(([x, y], j) => to3(x, y, prev.z + (n.z - prev.z) * (j + 1) / (edge.polyline.length - 1) + 12)) : [to3(n.x, n.y, n.z + 12)]; });
        if (points.length > 1) {
            const curve = new THREE.CurvePath<THREE.Vector3>();
            for (let i = 1; i < points.length; i++)
                curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(2, points.length * 4), 5, 5, false), new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: .9, depthTest: false }));
            tube.renderOrder = 3;
            scene.add(tube);
        }
    }
    const clickable: THREE.Object3D[] = [], textures: THREE.Texture[] = [], labels: {
        el: HTMLElement;
        point: THREE.Vector3;
    }[] = [];
    const overlay = document.createElement('div');
    overlay.className = 'lab-scene-labels';
    host.append(overlay);
    function label(text: string, x: number, y: number, z: number, node?: string) { const el = document.createElement(node ? 'button' : 'span'); el.textContent = text; el.className = 'lab-scene-label'; if (node) {
        el.setAttribute('type', 'button');
        el.setAttribute('aria-label', 'Inspect ' + text);
        el.addEventListener('click', () => onSelect(node));
    } overlay.append(el); labels.push({ el, point: to3(x, y, z) }); return el; }
    const kitchen = nodes.get(data.map.kitchen)!;
    label('KITCHEN', kitchen.x, kitchen.y, kitchen.z + 40, data.map.kitchen);
    label(data.orders.some(o => o.id === '#07') ? 'SUMMIT · #07 · 165m' : 'SUMMIT · 165m', 1240, 1460, 195, data.orders.find(o => o.id === '#07')?.node);
    const corridor = data.map.edges.find(e => e.resource === 'corridor')!;
    const ca = nodes.get(corridor.from)!, cb = nodes.get(corridor.to)!;
    label('CORRIDOR · 1', (ca.x + cb.x) / 2, (ca.y + cb.y) / 2, (ca.z + cb.z) / 2 + 55);
    for (const o of data.orders) {
        const n = nodes.get(o.node)!;
        const marker = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 26, 12), new THREE.MeshStandardMaterial({ color: '#007f78' }));
        marker.position.copy(to3(n.x, n.y, n.z + 24));
        marker.userData.node = n.id;
        clickable.push(marker);
        scene.add(marker);
        if (o.id !== '#07' && (data.orders.length <= 3 || ['#13', '#20'].includes(o.id)))
            label(o.id, n.x, n.y, n.z + 22, n.id);
    }
    const pads = new THREE.Group();
    for (let i = 0; i < (data.pads ?? 2); i++) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 3, 24), new THREE.MeshBasicMaterial({ color: '#e5b63b' }));
        pad.position.copy(to3(kitchen.x + 50 + i * 48, kitchen.y, kitchen.z + 3));
        pads.add(pad);
    }
    scene.add(pads);
    const drones = new Map<string, THREE.Group>();
    for (const id of new Set(data.events.map(e => e.drone))) {
        const group = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: id === 'A' ? '#08796f' : id === 'B' ? '#bc4c25' : '#57489c' });
        group.add(new THREE.Mesh(new THREE.BoxGeometry(22, 8, 13), mat));
        for (const x of [-16, 16])
            for (const z of [-16, 16]) {
                const rotor = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 2, 12), mat);
                rotor.position.set(x, 0, z);
                group.add(rotor);
            }
        if (data.droneTypes?.[id] === 'H')
            group.scale.setScalar(1.5);
        scene.add(group);
        drones.set(id, group);
    }
    let selected: THREE.Line | undefined;
    const render = () => { renderer.render(scene, camera); const placed: {
        x: number;
        y: number;
        w: number;
        h: number;
    }[] = []; for (const item of labels) {
        const p = item.point.clone().project(camera);
        item.el.hidden = p.z > 1 || p.z < -1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
        const x = (p.x + 1) / 2 * host.clientWidth, w = item.el.offsetWidth, h = item.el.offsetHeight;
        let y = (1 - p.y) / 2 * renderer.domElement.clientHeight;
        for (let pass = 0; pass < 6; pass++)
            if (placed.some(a => Math.abs(a.x - x) < (a.w + w) / 2 + 4 && Math.abs(a.y - y) < Math.max(a.h, h) + 4))
                y -= h + 7;
        placed.push({ x, y, w, h });
        item.el.style.left = x + 'px';
        item.el.style.top = y + 'px';
    } };
    const size = () => { const w = Math.max(200, host.clientWidth), h = Math.max(330, Math.min(500, w * .72)); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); };
    const resize = new ResizeObserver(size);
    resize.observe(host);
    controls.addEventListener('change', render);
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: PointerEvent) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)
        return; const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects(clickable)[0]; if (hit?.object.userData.node)
        onSelect(hit.object.userData.node); };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onClick);
    function view(name: string) { const targets: Record<string, [
        number,
        number,
        number,
        number
    ]> = { overview: [1000, 1000, 70, 2500], kitchen: [kitchen.x, kitchen.y, kitchen.z, 900], hilltop: [1240, 1460, 165, 1050], corridor: [(ca.x + cb.x) / 2, (ca.y + cb.y) / 2, (ca.z + cb.z) / 2, 900] }; const [x, y, z, d] = targets[name] ?? targets.overview; controls.target.copy(to3(x, y, z)); camera.position.copy(controls.target).add(new THREE.Vector3(d * .65, d * .75, d * .8)); controls.update(); render(); }
    function select(path: string[], blocked: string[] = []) { for (const box of boxes)
        box.mesh.material.color.copy(blocked.includes(box.id) ? new THREE.Color('#d44b44') : box.color); if (selected) {
        scene.remove(selected);
        selected.geometry.dispose();
        (selected.material as THREE.Material).dispose();
    } const pts = routePoints(data, path).map(n => to3(n.x, n.y, n.z + 23)); if (pts.length === 1)
        pts.push(pts[0].clone().add(new THREE.Vector3(0, 100, 0))); selected = pts.length ? drawLine(pts, '#f02d95', 5) : undefined; render(); }
    function time(t: number) { for (const state of fleetAt(data, t)) {
        const p = state.position;
        drones.get(state.drone)?.position.copy(to3(p.x, p.y, p.z + 22));
    } render(); }
    size();
    view(data.focusNodes ? 'kitchen' : 'overview');
    time(0);
    return { view, select, time, dispose() { resize.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onClick); scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry)
            mesh.geometry.dispose(); if (mesh.material)
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
                material.dispose(); }); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); overlay.remove(); } };
}
