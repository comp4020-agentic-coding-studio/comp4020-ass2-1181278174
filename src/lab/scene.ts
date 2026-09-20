import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { corridorAt } from './replay-inspection';
import type { SceneData } from './model.ts';
import { fleetAt, padSchedule, routePoints } from './replay.ts';
import { terrainHeight } from './terrain.ts';
import { toScene, visualLayout } from './visual-layout';
import { flightNetwork, loadAssets, release, roadSurface } from './scene-assets';
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
    const to3 = (x: number, y: number, z: number) => new THREE.Vector3(...toScene(x, y, z));
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
    const graph=flightNetwork(data); scene.add(graph); graph.visible=!!data.focusNodes;
    scene.add(roadSurface(data));
    const boxes: {
        id: string;
        mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
        color: THREE.Color;
    }[] = [];
    const fallback = new THREE.Group(); scene.add(fallback);
    for (const b of data.map.buildings) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h * 3, b.d), new THREE.MeshStandardMaterial({ color: b.kind === 'tower' ? '#617260' : b.kind === 'kitchen' ? '#b78731' : '#d9decd', roughness: .9 }));
        box.position.copy(to3(b.x + b.w / 2, b.y + b.d / 2, terrainHeight(b.x + b.w / 2, b.y + b.d / 2) + b.h / 2));
        fallback.add(box);
        boxes.push({ id: b.id, mesh: box, color: box.material.color.clone() });
    }
    for (const b of visualLayout(data.map).houses) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h * 3, b.d), new THREE.MeshStandardMaterial({color:'#d9decd', roughness:1}));
        box.position.copy(to3(b.x,b.y,b.z+b.h/2)); fallback.add(box);
    }
    const routeObjects: {order?: string; object: THREE.Object3D}[] = [];
    for (const r of data.routes) {
        const points = routePoints(data,r.displayPath??r.path).map(p=>to3(p.x,p.y,p.z+12));
        if (points.length < 2) continue;
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), r.dashed
            ? new THREE.LineDashedMaterial({color:r.color,dashSize:18,gapSize:14,depthTest:false})
            : new THREE.LineBasicMaterial({color:r.color,depthTest:false}));
        line.computeLineDistances(); line.renderOrder=3; scene.add(line); routeObjects.push({order:r.order,object:line});
        const i=Math.max(1,Math.floor(points.length/2)), delta=points[i].clone().sub(points[i-1]);
        const arrow=new THREE.ArrowHelper(delta.clone().normalize(),points[i-1].clone().lerp(points[i],.5),Math.min(50,delta.length()),r.color,20,12);
        scene.add(arrow); routeObjects.push({order:r.order,object:arrow});
    }
    let focusedOrder=data.routes.find(r=>r.order)?.order, showAll=false;
    function layers(network: boolean, all: boolean, order=focusedOrder) { graph.visible=network; showAll=all; focusedOrder=order;
        routeObjects.forEach(r=>r.object.visible=showAll||!r.order||r.order===focusedOrder); render(); }
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
    if (data.orders.length === 1 && data.orders[0].id === '#07') {
        label('RIDGE · short, steep', 1260, 1315, terrainHeight(1260,1315)+30);
        label('CONTOUR · longer, gentler', 1490, 1610, terrainHeight(1490,1610)+30);
    }
    const corridorLabel=label('CORRIDOR · 1', (ca.x + cb.x) / 2, (ca.y + cb.y) / 2, (ca.z + cb.z) / 2 + 55);
    const passage=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(cb.x-ca.x,cb.y-ca.y),75,55),new THREE.MeshBasicMaterial({color:'#c79726',transparent:true,opacity:.15,depthWrite:false}));
    passage.position.copy(to3((ca.x+cb.x)/2,(ca.y+cb.y)/2,(ca.z+cb.z)/2+20)); passage.rotation.y=Math.atan2(cb.y-ca.y,cb.x-ca.x); scene.add(passage);
    for (const o of data.orders) {
        const n = nodes.get(o.node)!;
        const marker = new THREE.Mesh(new THREE.RingGeometry(13, 18, 20), new THREE.MeshBasicMaterial({ color: '#007f78', side: THREE.DoubleSide }));
        marker.rotation.x=-Math.PI/2; marker.position.copy(to3(n.x, n.y, n.z + 2));
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
    const padLabels = data.events.some(e=>e.phase==='charge') ? pads.children.map((_,i)=>label(`PAD ${i+1} · free`,kitchen.x+50+i*48,kitchen.y,kitchen.z+25)) : [];
    const drones = new Map<string, THREE.Group>();
    const droneLabels = new Map<string, typeof labels[number]>();
    for (const id of new Set(data.events.map(e => e.drone))) {
        const group = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: id === 'A' ? '#08796f' : id === 'B' ? '#bc4c25' : '#57489c' });
        group.add(new THREE.Mesh(new THREE.BoxGeometry(22, 8, 13), mat));
        for (const x of [-16, 16])
            for (const z of [-16, 16]) {
                const rotor = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 3), mat);
                rotor.position.set(x, 0, z); rotor.userData.anchor='rotor_'+group.children.length;
                group.add(rotor);
            }
        const parcel=new THREE.Mesh(new THREE.BoxGeometry(8,6,8), new THREE.MeshStandardMaterial({color:'#c3925d'})); parcel.position.y=-4; parcel.userData.anchor='parcel'; group.add(parcel);
        label(id,kitchen.x,kitchen.y,kitchen.z+20); droneLabels.set(id,labels.at(-1)!);
        if (data.droneTypes?.[id] === 'H')
            group.scale.setScalar(1.5);
        scene.add(group);
        drones.set(id, group);
    }
    let selected: THREE.Line | undefined, disposed=false, currentTime=0, followed: string | undefined;
    const highlights = new THREE.Group(); scene.add(highlights);
    let assetSource: THREE.Object3D | undefined;
    const render = () => { if (disposed) return; renderer.render(scene, camera); host.dataset.drawCalls=String(renderer.info.render.calls); host.dataset.triangles=String(renderer.info.render.triangles); const placed: {
        x: number;
        y: number;
        w: number;
        h: number;
    }[] = []; for (const item of labels) {
        const p = item.point.clone().project(camera);
        item.el.hidden = p.z > 1 || p.z < -1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
        const w = item.el.offsetWidth, h = item.el.offsetHeight, x = Math.max(w/2+6, Math.min(host.clientWidth-w/2-6, (p.x+1)/2*host.clientWidth));
        const baseY=Math.max(h/2+8,Math.min(renderer.domElement.clientHeight-h/2-8,(1-p.y)/2*renderer.domElement.clientHeight));
        let y=baseY, fitted=false;
        for(let pass=0;pass<12;pass++) {
            y=baseY+(pass===0?0:Math.ceil(pass/2)*(h+7)*(pass%2?-1:1));
            if(y<h/2+6||y>renderer.domElement.clientHeight-h/2-6) continue;
            if(!placed.some(a=>Math.abs(a.x-x)<(a.w+w)/2+4&&Math.abs(a.y-y)<(a.h+h)/2+5)) { fitted=true; break; }
        }
        item.el.hidden ||= !fitted;
        if(!item.el.hidden) placed.push({x,y,w,h});
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
    ]> = { overview: [1000, 1000, 70, 2500], mission: [850, 1130, 85, 1750], kitchen: [kitchen.x, kitchen.y, kitchen.z, 900], hilltop: [1240, 1460, 165, 1050], corridor: [(ca.x + cb.x) / 2, (ca.y + cb.y) / 2, (ca.z + cb.z) / 2, 900] }; const [x, y, z, d] = targets[name] ?? targets.overview; controls.target.copy(to3(x, y, z)); camera.position.copy(controls.target).add(new THREE.Vector3(d * .65, d * .75, d * .8)); controls.update(); render(); }
    function select(path: string[], blocked: string[] = []) {
        release(highlights); highlights.clear();
        for (const box of boxes) if (blocked.includes(box.id)) {
            const outline = new THREE.Mesh(box.mesh.geometry.clone(), new THREE.MeshBasicMaterial({color:'#d44b44',wireframe:true,depthTest:false}));
            outline.position.copy(box.mesh.position); outline.scale.setScalar(1.06); highlights.add(outline);
        }
        if (selected) { scene.remove(selected); release(selected); }
        const pts=routePoints(data,path).map(n=>to3(n.x,n.y,n.z+23));
        if (pts.length===1) pts.push(pts[0].clone().add(new THREE.Vector3(0,100,0)));
        selected=pts.length?drawLine(pts,'#f02d95',5):undefined; render();
    }
    function follow(id?: string) {
        followed=matchMedia('(prefers-reduced-motion: reduce)').matches?undefined:id;
        if(followed) { const target=drones.get(followed)?.position; if(target) { controls.target.copy(target); camera.position.copy(target).add(new THREE.Vector3(220,280,350)); } }
        time(currentTime);
    }
    function time(t: number) {
        currentTime=t;
        const states=fleetAt(data,t);
        for (const [i,state] of states.entries()) {
            const p=state.position, drone=drones.get(state.drone)!;
            const offset=!state.airborne&&state.event.from===data.map.kitchen ? {x:30+i*40,y:-35} : {x:0,y:0};
            let point=to3(p.x+offset.x,p.y+offset.y,p.z+(state.airborne?22:3));
            if(state.pad!==undefined&&state.pad>=0) point=to3(kitchen.x+50+state.pad*48,kitchen.y,kitchen.z+5);
            // An isolated outward leg stops in the air; it does not invent service or landing.
            if(data.legOnly&&state.phase==='leg complete'&&state.event.phase==='out') point=to3(p.x,p.y,p.z+22);
            drone.position.copy(point); drone.rotation.y=p.heading;
            drone.traverse(o=>{ const anchor=o.userData.anchor as string|undefined;
                if(anchor==='parcel') o.visible=state.parcel;
                if(anchor?.startsWith('rotor_')) o.rotation.y=state.rotorAngle;
            });
            const caption=droneLabels.get(state.drone)!;
            caption.point.copy(point).add(new THREE.Vector3(0,45,0));
            caption.el.textContent=`${state.drone} · ${state.phase}`;
            caption.el.dataset.drone=state.drone; caption.el.dataset.phase=state.phase; caption.el.dataset.parcel=String(state.parcel);
            if(followed===state.drone) { const delta=point.clone().sub(controls.target); controls.target.copy(point); camera.position.add(delta); controls.update(); }
        }
        const corridor=corridorAt(data,t);
        passage.material.color.set(corridor.color); passage.material.opacity=['closed','conflict'].includes(corridor.state)?.4:.15;
        corridorLabel.textContent=`CORRIDOR · ${corridor.state==='closed'?'CLOSED':corridor.state==='conflict'?'CONFLICT':corridor.occupants.map(e=>e.drone).join(', ')||'free'}`;
        host.dataset.corridorState=corridor.state;
        const charging=padSchedule(data).filter(p=>p.event.start<=t&&t<p.event.end);
        padLabels.forEach((el,i)=>{ const owner=charging.find(p=>p.pad===i)?.event.drone; el.textContent=`PAD ${i+1} · ${owner?'charging '+owner:'free'}`; });
        render();
    }
    host.dataset.models='loading';
    void loadAssets(data).then(assets=>{
        if (disposed) { release(assets.source); return; }
        assetSource=assets.source; fallback.visible=false; scene.add(assets.scenery);
        pads.children.forEach(pad=>{ pad.visible=false; const model=assets.clone('charging_pad'); model.scale.set(40,40,40); model.position.copy(pad.position); scene.add(model); });
        for (const [id,group] of drones) { release(group); group.clear(); const model=assets.clone(data.droneTypes?.[id]==='H'?'drone_H':'drone_L'); model.scale.setScalar(22); group.add(model); }
        host.dataset.models='loaded'; host.dataset.buildings=String(data.map.buildings.length+visualLayout(data.map).houses.length); time(currentTime);
    }).catch(()=>{ if (!disposed) host.dataset.models='fallback'; });
    size();
    layers(!!data.focusNodes,false);
    view(data.focusNodes ? 'kitchen' : data.legOnly || data.orders.length === 2 ? 'corridor' : data.orders.length === 1 && data.orders[0].id === '#07' && host.clientWidth>=500 ? 'mission' : 'overview');
    time(0);
    return { view, select, time, layers, follow, dispose() { disposed=true; resize.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onClick); release(scene); if (assetSource) release(assetSource); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); overlay.remove(); } };
}
