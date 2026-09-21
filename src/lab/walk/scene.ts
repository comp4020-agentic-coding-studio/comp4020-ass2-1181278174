import * as THREE from 'three';
import type { SceneData } from '../model';
import { terrainScene } from '../scene-terrain';
import { loadAssets, release, roadSurface } from '../scene-assets';
import { sceneScenery, toScene } from '../visual-layout';
import { terrainHeight } from '../terrain';
import { projectLabel } from '../scene-labels';
import { courseFlight, coursePosition, FLIGHT_CLEARANCE, groundPosition, walkTargets, type Position } from './navigation';

/** The course trail reuses the Lab terrain and models, with a drone that follows the course uphill. */
export function createWalkScene(host: HTMLElement, data: SceneData, onRender: () => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#353e48');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(48, 1, 1, 6000);
  scene.add(new THREE.HemisphereLight(0xabb9d8, 0x4d5840, 1.1));
  const sun = new THREE.DirectionalLight(0xffbd77, 2.8);
  sun.position.set(-1100, 550, 800); scene.add(sun);
  scene.add(terrainScene(data), roadSurface(data));
  const scenery = sceneScenery(data), fallback = new THREE.Group();
  for (const building of scenery.buildings) {
    const x = building.x + building.w / 2, y = building.y + building.d / 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(building.w, building.h * 3, building.d), new THREE.MeshStandardMaterial({ color: building.kind === 'kitchen' ? '#b78731' : '#d9decd' }));
    box.position.set(...toScene(x, y, terrainHeight(x, y) + building.h / 2)); fallback.add(box);
  }
  for (const house of [...scenery.houses, ...scenery.homes]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(house.w, house.h * 3, house.d), new THREE.MeshStandardMaterial({ color: '#d9decd' }));
    box.position.set(...toScene(house.x, house.y, house.z + house.h / 2)); fallback.add(box);
  }
  scene.add(fallback);
  const kitchen = data.map.nodes.find(node => node.id === data.map.kitchen)!;
  const avatar = new THREE.Group(), airframe = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 25), new THREE.MeshStandardMaterial({ color: '#f4cf6c' }));
  airframe.add(body); avatar.add(airframe); scene.add(avatar);
  for (const x of [-27, 27]) for (const z of [-24, 24]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 60), new THREE.MeshStandardMaterial({ color: '#f4cf6c' }));
    arm.position.x = x; airframe.add(arm);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(26, 2, 4), new THREE.MeshStandardMaterial({ color: '#fffaf1' }));
    rotor.position.set(x, 7, z); rotor.userData.anchor = 'rotor_' + airframe.children.length; airframe.add(rotor);
  }
  const gate = new THREE.Mesh(new THREE.TorusGeometry(57, 3, 8, 64), new THREE.MeshBasicMaterial({ color: '#f4cf6c' }));
  gate.visible = false; scene.add(gate);
  const shadow = new THREE.Mesh(new THREE.RingGeometry(21, 25, 32), new THREE.MeshBasicMaterial({ color: '#f4cf6c', side: THREE.DoubleSide }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const padModels = new THREE.Group(); scene.add(padModels);
  let highlighted: string | undefined;
  for (let i = 0; i < 2; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 3, 24), new THREE.MeshStandardMaterial({ color: '#e5b63b' }));
    const x = kitchen.x + 50 + i * 48;
    pad.position.set(...toScene(x, kitchen.y, terrainHeight(x, kitchen.y) + 1)); padModels.add(pad);
  }
  const targets = walkTargets(data.map);
  const colors = { route: '#75bba1', energy: '#e3a27c', order: '#ebc56b', fleet: '#9da8e0', corridor: '#c09dcf' };
  const markers = new Map<string, THREE.Mesh>();
  for (const target of targets) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(target.week ? 20 : 27, target.week ? 25 : 32, 12, 32), new THREE.MeshStandardMaterial({ color: colors[target.stage], emissive: colors[target.stage], emissiveIntensity: .35 }));
    marker.position.set(...toScene(target.position.x, target.position.y, target.position.z + 4));
    scene.add(marker); markers.set(target.key, marker);
  }
  for (let segment = 0; segment < 11; segment++) {
    const points = Array.from({ length: 17 }, (_, i) => {
      const point = coursePosition(data.map, (segment + i / 16) / 11);
      return new THREE.Vector3(...toScene(point.x, point.y, point.z + 3));
    });
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 5, 6, false), new THREE.MeshStandardMaterial({ color: colors[targets[segment].stage], emissive: colors[targets[segment].stage], emissiveIntensity: .3 })));
  }
  const look = new THREE.Vector3(), desiredLook = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  let disposed = false, source: THREE.Object3D | undefined, first = true, flight = 0;
  let finishFlight: ((completed: boolean) => void) | undefined;
  let avatarPoint: Position = kitchen, clearance = FLIGHT_CLEARANCE;
  function render() { if (!disposed) { renderer.render(scene, camera); onRender(); } }
  function placeDrone(point: Position, lift = FLIGHT_CLEARANCE, moving = false) {
    const dx = point.x - avatarPoint.x, dy = point.y - avatarPoint.y;
    if (Math.hypot(dx, dy) > .01) avatar.rotation.y = Math.atan2(dx, -dy);
    avatarPoint = point; clearance = lift;
    const ground = groundPosition(point);
    avatar.position.set(...toScene(point.x, point.y, ground.z + lift));
    airframe.rotation.x = moving ? -.1 : 0;
    if (moving) airframe.traverse(object => {
      if (object.userData.anchor?.startsWith('rotor_')) object.rotation.y = performance.now() * .035;
    });
    shadow.position.set(...toScene(point.x, point.y, ground.z + .5));
    host.dataset.x = point.x.toFixed(2); host.dataset.y = point.y.toFixed(2);
    host.dataset.elevation = ground.z.toFixed(3); host.dataset.avatarHeight = avatar.position.y.toFixed(3);
    host.dataset.clearance = lift.toFixed(2);
  }
  function followCamera(position: THREE.Vector3) {
    // Look further down at the summit so the route below stays in view.
    const summit = Math.max(0, Math.min(1, (terrainHeight(avatarPoint.x, avatarPoint.y) - 80) / 85));
    desiredLook.copy(position).add(new THREE.Vector3(75, 60 - 160 * summit, -140 + 120 * summit));
    desiredCamera.copy(position).add(new THREE.Vector3(-140, 290 + 130 * summit, 520));
    desiredCamera.y = Math.max(desiredCamera.y, terrainHeight(avatarPoint.x - 140, avatarPoint.y - 520) * 3 + 180);
  }
  function move(point: Position, seconds = 0, snap = false) {
    const moving = Math.hypot(point.x - avatarPoint.x, point.y - avatarPoint.y) > .01;
    gate.visible = false;
    placeDrone(point, FLIGHT_CLEARANCE, moving); followCamera(avatar.position);
    const blend = snap || first ? 1 : 1 - Math.exp(-seconds * 9);
    camera.position.lerp(desiredCamera, blend); look.lerp(desiredLook, blend);
    camera.lookAt(look); camera.updateMatrixWorld(); first = false; render();
    return camera.position.distanceTo(desiredCamera) > .15 || look.distanceTo(desiredLook) > .15;
  }
  function cancelTravel() {
    cancelAnimationFrame(flight); flight = 0; delete host.dataset.flying;
    finishFlight?.(false); finishFlight = undefined;
  }
  function travel(point: Position | undefined, duration?: number, enter = false) {
    cancelTravel();
    const fromCamera = camera.position.clone(), fromLook = look.clone(), fromPoint = { ...avatarPoint };
    const fromClearance = clearance;
    const path = point ? courseFlight(data.map, fromPoint, point) : undefined;
    const milliseconds = duration ?? path?.duration ?? 700;
    const started = performance.now();
    gate.visible = !!point;
    if (point) {
      const gateway = groundPosition({ x: point.x, y: point.y + 90 });
      gate.position.set(...toScene(gateway.x, gateway.y, gateway.z + FLIGHT_CLEARANCE + 18));
    }
    host.dataset.flying = point ? enter ? 'entering' : 'climbing' : 'overview';
    return new Promise<boolean>(resolve => {
      finishFlight = resolve;
      const step = (now: number) => {
        if (disposed) { cancelTravel(); return; }
        const t = milliseconds ? Math.min(1, (now - started) / milliseconds) : 1;
        const ease = t * t * (3 - 2 * t);
        if (point && path) {
          const p = enter ? groundPosition({ x: fromPoint.x, y: fromPoint.y + 180 * ease }) : path.at(ease);
          const lift = enter ? fromClearance + 36 * ease : fromClearance + (FLIGHT_CLEARANCE - fromClearance) * ease;
          placeDrone(p, lift, t < 1 && milliseconds > 0);
          followCamera(avatar.position);
          // Establish the chase view, then travel with the drone instead of leaving it behind.
          const settle = Math.min(1, t * 4), blend = settle * settle * (3 - 2 * settle);
          camera.position.lerpVectors(fromCamera, desiredCamera, blend);
          look.lerpVectors(fromLook, desiredLook, blend);
        } else {
          camera.position.lerpVectors(fromCamera, new THREE.Vector3(1100, 1100, 1700), ease);
          look.lerpVectors(fromLook, new THREE.Vector3(0, 120, 0), ease);
        }
        camera.lookAt(look); camera.updateMatrixWorld(); render();
        if (t < 1) flight = requestAnimationFrame(step);
        else { flight = 0; delete host.dataset.flying; finishFlight = undefined; resolve(true); }
      };
      step(started);
    });
  }
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  });
  resize.observe(host);
  const width = host.clientWidth, height = host.clientHeight;
  renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); move(kitchen, 0, true);
  host.dataset.models = 'loading';
  void loadAssets(data).then(assets => {
    if (disposed) { release(assets.source); return; }
    source = assets.source;
    source.traverse(object => {
      const mesh = object as THREE.Mesh;
      for (const material of mesh.material ? Array.isArray(mesh.material) ? mesh.material : [mesh.material] : []) {
        if (material instanceof THREE.MeshStandardMaterial && /glass/i.test(material.name)) { material.emissive.set('#ffc074'); material.emissiveIntensity = .65; }
      }
    });
    fallback.visible = false; scene.add(assets.scenery);
    release(airframe); airframe.clear();
    const model = assets.clone('drone_L'); model.scale.setScalar(46);
    const bounds = new THREE.Box3().setFromObject(model); model.position.y -= bounds.min.y;
    airframe.add(model);
    release(padModels); padModels.clear();
    for (let i = 0; i < 2; i++) {
      const pad = assets.clone('charging_pad'), x = kitchen.x + 50 + i * 48;
      pad.scale.setScalar(40); pad.position.set(...toScene(x, kitchen.y, terrainHeight(x, kitchen.y))); padModels.add(pad);
    }
    host.dataset.models = 'loaded'; render();
  }).catch(() => { if (!disposed) host.dataset.models = 'fallback'; });
  return {
    move,
    overview: (duration = 800) => travel(undefined, duration),
    visit: (point: Position, duration?: number, enter = false) => travel(point, duration, enter),
    position: () => groundPosition(avatarPoint),
    drone: () => ({ ...avatarPoint, z: terrainHeight(avatarPoint.x, avatarPoint.y) + clearance }),
    cancelTravel,
    highlight(target?: ReturnType<typeof walkTargets>[number]) {
      if (target?.key === highlighted) return;
      highlighted = target?.key;
      for (const [key, marker] of markers) {
        marker.scale.setScalar(key === highlighted ? 1.4 : 1);
        (marker.material as THREE.MeshStandardMaterial).emissiveIntensity = key === highlighted ? 1 : .35;
      }
      host.dataset.highlightPlace = target?.key ?? '';
      render();
    },
    project(point: { x: number; y: number; z: number }, offset = 16) {
      return projectLabel(new THREE.Vector3(...toScene(point.x, point.y, point.z + offset)), camera, host.clientWidth, host.clientHeight);
    },
    dispose() {
      disposed = true; cancelTravel(); resize.disconnect(); release(scene); if (source) release(source);
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
