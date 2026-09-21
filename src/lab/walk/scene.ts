import * as THREE from 'three';
import type { SceneData } from '../model';
import { terrainScene } from '../scene-terrain';
import { loadAssets, release, roadSurface } from '../scene-assets';
import { sceneScenery, toScene } from '../visual-layout';
import { terrainHeight } from '../terrain';
import { projectLabel } from '../scene-labels';
import type { Position } from './navigation';

/** A fixed third-person camera over the same terrain and model set as the Lab. */
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
  const avatar = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 20), new THREE.MeshStandardMaterial({ color: '#f4cf6c' }));
  body.position.y = 7; avatar.add(body); scene.add(avatar);
  const shadow = new THREE.Mesh(new THREE.RingGeometry(21, 25, 32), new THREE.MeshBasicMaterial({ color: '#f4cf6c', side: THREE.DoubleSide }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const padModels = new THREE.Group(); scene.add(padModels);
  for (let i = 0; i < 2; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 3, 24), new THREE.MeshStandardMaterial({ color: '#e5b63b' }));
    const x = kitchen.x + 50 + i * 48;
    pad.position.set(...toScene(x, kitchen.y, terrainHeight(x, kitchen.y) + 1)); padModels.add(pad);
  }
  const look = new THREE.Vector3(), desiredLook = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  let disposed = false, source: THREE.Object3D | undefined, first = true;
  function render() { if (!disposed) { renderer.render(scene, camera); onRender(); } }
  function move(point: Position, seconds = 0, snap = false) {
    const elevation = terrainHeight(point.x, point.y), position = new THREE.Vector3(...toScene(point.x, point.y, elevation));
    avatar.position.copy(position).add(new THREE.Vector3(0, 2, 0));
    shadow.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    desiredLook.copy(position).add(new THREE.Vector3(0, 80, -85));
    desiredCamera.copy(position).add(new THREE.Vector3(0, 430, 570));
    // The camera also clears the ground when walking back down the far side of the hill.
    desiredCamera.y = Math.max(desiredCamera.y, terrainHeight(point.x, point.y - 570) * 3 + 180);
    const blend = snap || first ? 1 : 1 - Math.exp(-seconds * 9);
    camera.position.lerp(desiredCamera, blend); look.lerp(desiredLook, blend);
    camera.lookAt(look); camera.updateMatrixWorld(); first = false; render();
    return camera.position.distanceTo(desiredCamera) > .15 || look.distanceTo(desiredLook) > .15;
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
    release(avatar); avatar.clear();
    const model = assets.clone('drone_L'); model.scale.setScalar(26);
    const bounds = new THREE.Box3().setFromObject(model); model.position.y -= bounds.min.y;
    avatar.add(model);
    release(padModels); padModels.clear();
    for (let i = 0; i < 2; i++) {
      const pad = assets.clone('charging_pad'), x = kitchen.x + 50 + i * 48;
      pad.scale.setScalar(40); pad.position.set(...toScene(x, kitchen.y, terrainHeight(x, kitchen.y))); padModels.add(pad);
    }
    host.dataset.models = 'loaded'; render();
  }).catch(() => { if (!disposed) host.dataset.models = 'fallback'; });
  return {
    move,
    project(point: { x: number; y: number; z: number }) {
      return projectLabel(new THREE.Vector3(...toScene(point.x, point.y, point.z + 16)), camera, host.clientWidth, host.clientHeight);
    },
    dispose() {
      disposed = true; resize.disconnect(); release(scene); if (source) release(source);
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
