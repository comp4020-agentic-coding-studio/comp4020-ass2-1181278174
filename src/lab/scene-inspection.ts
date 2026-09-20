import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { SceneData } from './model';
import { routePoints } from './replay';
import { terrainHeight } from './terrain';
import { toScene } from './visual-layout';

/** A screen-space stroke stays readable when the camera fits a different viewport. */
export function readableLine(points: THREE.Vector3[],color:string,width:number) {
    const geometry=new LineGeometry().setPositions(points.flatMap(p=>p.toArray()));
    const material=new LineMaterial({color,depthTest:false,depthWrite:false});
    material.linewidth=width;
    const line=new Line2(geometry,material);line.computeLineDistances();line.renderOrder=8;return line;
}

/** Frame all points, including their elevation, for either a landscape or portrait canvas. */
export function fitInspection(camera:THREE.PerspectiveCamera,points:THREE.Vector3[],top=false) {
    const box=new THREE.Box3().setFromPoints(points),sphere=box.getBoundingSphere(new THREE.Sphere());
    const halfVertical=THREE.MathUtils.degToRad(camera.fov/2),halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect);
    const distance=Math.max(90,sphere.radius)/Math.sin(Math.min(halfVertical,halfHorizontal)) * 1.2;
    camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(...(top?[0,1,.001]:[.5,1.4,.85])).normalize(),distance);
    camera.lookAt(sphere.center);camera.updateMatrixWorld();return sphere.center;
}

/** W1 tests building footprints, so the proposed connection is drawn on the ground. */
export function blockInspection(data:SceneData,path:string[],blocked:string[]) {
    const group=new THREE.Group();
    const points=routePoints(data,path).map(p=>new THREE.Vector3(...toScene(p.x,p.y,terrainHeight(p.x,p.y)+1.5)));
    if(points.length>1)group.add(readableLine(points,'#e42f96',5));
    for(const point of points.filter((_,i)=>i===0||i===points.length-1)) {
        const marker=new THREE.Mesh(new THREE.SphereGeometry(5,12,8),new THREE.MeshBasicMaterial({color:'#e42f96',depthTest:false}));
        marker.position.copy(point);marker.renderOrder=9;group.add(marker);
    }
    const frame=[...points];
    for(const b of data.map.buildings.filter(b=>blocked.includes(b.id))) {
        const x=b.x+b.w/2,y=b.y+b.d/2,z=terrainHeight(x,y);
        const box=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h*3,b.d),new THREE.MeshBasicMaterial({color:'#d43d30',transparent:true,opacity:.55,depthWrite:false}));
        box.position.set(...toScene(x,y,z+b.h/2));box.renderOrder=6;box.userData.building=b.id;group.add(box);
        const edges=new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),new THREE.LineBasicMaterial({color:'#8e211c',depthTest:false}));
        edges.position.copy(box.position);edges.renderOrder=7;group.add(edges);
        for(const dx of [-b.w/2,b.w/2])for(const dy of [-b.d/2,b.d/2])for(const dz of [0,b.h+8])
            frame.push(new THREE.Vector3(...toScene(x+dx,y+dy,z+dz)));
    }
    // Leave headroom for endpoint and obstacle labels.
    frame.push(...points.map(p=>p.clone().add(new THREE.Vector3(0,65,0))));
    return {group,frame};
}
