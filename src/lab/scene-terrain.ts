import * as THREE from 'three';
import type { SceneData } from './model';
import { displayArea, toScene } from './visual-layout';
import { elevationBands, terrainShade } from './landscape';
import { contourRadius, terrainHeight } from './terrain';

export function terrainScene(data:SceneData) {
  const group=new THREE.Group(),area=displayArea(data);
  const surface=new THREE.PlaneGeometry(area.right-area.left,area.top-area.bottom,80,80);
  surface.rotateX(-Math.PI/2);
  surface.translate((area.left+area.right)/2-1000,0,1000-(area.bottom+area.top)/2);
  const pos=surface.attributes.position,colors:number[]=[];
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i)+1000,y=1000-pos.getZ(i);
    pos.setY(i,terrainHeight(x,y)*3);
    colors.push(...new THREE.Color(terrainShade(x,y)).toArray());
  }
  surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));surface.computeVertexNormals();
  group.add(new THREE.Mesh(surface,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));
  if(data.focusNodes)return group;
  for(const [z] of elevationBands.slice(1)) {
    const r=contourRadius(z),vertices:number[]=[];
    for(let i=0;i<180;i++) {
      const a=i*Math.PI/90,b=(i+1)*Math.PI/90;
      const p=[1240+r*Math.cos(a),1460+r*Math.sin(a)],q=[1240+r*Math.cos(b),1460+r*Math.sin(b)];
      if([...p,...q].some(v=>v<0||v>2000))continue;
      vertices.push(...toScene(p[0],p[1],z+.8),...toScene(q[0],q[1],z+.8));
    }
    const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#6f6448',transparent:true,opacity:.48})));
  }
  // A cut edge makes the height of the unchanged hill legible in an oblique view.
  const sides:number[]=[];
  for(const [a,b] of [[[0,0],[2000,0]],[[2000,0],[2000,2000]],[[2000,2000],[0,2000]],[[0,2000],[0,0]]]) {
    for(let i=0;i<80;i++) {
      const p=[a[0]+(b[0]-a[0])*i/80,a[1]+(b[1]-a[1])*i/80],q=[a[0]+(b[0]-a[0])*(i+1)/80,a[1]+(b[1]-a[1])*(i+1)/80];
      const top=toScene(p[0],p[1],terrainHeight(...p as [number,number])),next=toScene(q[0],q[1],terrainHeight(...q as [number,number]));
      const base=toScene(p[0],p[1],-9),end=toScene(q[0],q[1],-9);
      sides.push(...top,...base,...next,...base,...end,...next);
    }
  }
  const sideGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sideGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(sideGeometry,new THREE.MeshStandardMaterial({color:'#987451',side:THREE.DoubleSide,roughness:1})));
  return group;
}
