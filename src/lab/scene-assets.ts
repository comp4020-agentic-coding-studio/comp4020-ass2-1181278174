import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { SceneData } from './model';
import { houseModels, toScene, visualLayout } from './visual-layout';
import { terrainHeight } from './terrain';

export function release(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    root.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) geometries.add(m.geometry); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(v => materials.add(v)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
export async function loadAssets(data: SceneData) {
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/slop-hill.glb`);
    const prototypes = new Map(gltf.scene.children.map(o => { o.position.set(0, 0, 0); return [o.name, o]; }));
    // Static houses share geometry/materials and are batched into a few draw calls.
    const buckets = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrices: THREE.Matrix4[] }>();
    function instance(name: string, x: number, y: number, z: number, w: number, h: number, d: number) {
        const root = prototypes.get(name)!;
        root.updateMatrixWorld(true);
        const transform = new THREE.Matrix4().compose(new THREE.Vector3(...toScene(x, y, z)), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
        root.traverse(o => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
            const key = mesh.geometry.uuid + ':' + (Array.isArray(mesh.material) ? mesh.material.map(m => m.uuid).join() : mesh.material.uuid);
            const bucket = buckets.get(key) ?? { geometry: mesh.geometry, material: mesh.material, matrices: [] };
            bucket.matrices.push(transform.clone().multiply(mesh.matrixWorld)); buckets.set(key, bucket);
        });
    }
    data.map.buildings.forEach((b, i) => { const x = b.x + b.w / 2, y = b.y + b.d / 2; instance(b.kind === 'kitchen' || b.kind === 'tower' ? b.kind : houseModels[i % 4], x, y, terrainHeight(x, y), b.w, b.h * 3, b.d); });
    visualLayout(data.map).houses.forEach(b => instance(b.model, b.x, b.y, b.z, b.w, b.h * 3, b.d));
    const scenery = new THREE.Group();
    for (const bucket of buckets.values()) { const m = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length); bucket.matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix)); scenery.add(m); }
    const clone = (name: string) => { const obj = prototypes.get(name)!.clone(true); obj.position.set(0, 0, 0); return obj; };
    return { scenery, clone, source: gltf.scene };
}

export function roadSurface(data: SceneData) {
    const vertices: number[] = [];
    for (const road of visualLayout(data.map).roads) for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i-1], b = road.points[i], dx = b[0]-a[0], dy = b[1]-a[1], length = Math.hypot(dx,dy), steps = Math.ceil(length/12);
        const nx = -dy / length * road.width/2, ny = dx / length * road.width/2;
        const point = (t: number, side: number) => { const x=a[0]+dx*t+nx*side, y=a[1]+dy*t+ny*side; const p=toScene(x,y,terrainHeight(x,y)); p[1]+=2; return p; };
        for (let j=0;j<steps;j++) { const a=point(j/steps,1), b=point(j/steps,-1), c=point((j+1)/steps,1), d=point((j+1)/steps,-1); vertices.push(...a,...b,...c,...b,...d,...c); }
    }
    const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.computeVertexNormals();
    return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#9da897',roughness:1,side:THREE.DoubleSide}));
}
