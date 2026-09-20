import { canonical, type SceneData } from './model';
import type { MapData } from '../data/schema';
import { terrainHeight } from './terrain';

export const VISUAL_ELEVATION = 3;
export const toScene = (x: number, y: number, z: number): [number, number, number] => [x - 1000, z * VISUAL_ELEVATION, 1000 - y];
export const houseModels = ['house_small', 'house_gable', 'house_terrace', 'house_apartment'] as const;
export type HouseModel = typeof houseModels[number];
export interface VisualHouse { id: string; model: HouseModel; x: number; y: number; w: number; d: number; h: number; z: number }
export const distanceToSegment = (x: number, y: number, a: number[], b: number[]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
function halton(index: number, base: number) {
  let fraction = 1, value = 0;
  while (index > 0) { fraction /= base; value += fraction * (index % base); index = Math.floor(index/base); }
  return value;
}
export function visualLayout(map: MapData) {
  const houses: VisualHouse[] = [], seen = new Set<string>();
  for (let i = 1; houses.length < 22 && i < 1000; i++) {
    const x = 90 + halton(i, 2) * 1820, y = 90 + halton(i, 3) * 1820;
    const w = 32 + (i % 3) * 5, d = 28 + (i % 2) * 6, radius = Math.hypot(w,d)/2;
    if (map.nodes.some(n => Math.hypot(n.x-x,n.y-y) < radius + 30)) continue;
    if (map.edges.some(e => e.polyline.slice(1).some((b,j) => distanceToSegment(x,y,e.polyline[j],b) < radius + 18))) continue;
    if (map.buildings.some(b => x+w/2+20>b.x&&x-w/2-20<b.x+b.w&&y+d/2+20>b.y&&y-d/2-20<b.y+b.d)) continue;
    if (houses.some(b => Math.hypot(x-b.x,y-b.y) < radius + Math.hypot(b.w,b.d)/2 + 20)) continue;
    houses.push({id:`decor-${houses.length+1}`,model:houseModels[houses.length%4],x,y,w,d,h:10+i%6,z:terrainHeight(x,y)});
  }
  const roads = map.edges.filter(e => {
    if (!e.from.startsWith('s-') || !e.to.startsWith('s-') || e.resource) return false;
    const key = [e.from,e.to].sort().join('|');
    if (seen.has(key)) return false; seen.add(key); return true;
  }).map(e => ({ id:`street-${e.id}`, points:e.polyline, width:12 }));
  return { houses, roads };
}

/** The W1 drawing is a local crop of the unchanged canonical map. */
export function displayArea(data:SceneData) {
  const points=data.focusNodes?.map(id=>data.map.nodes.find(n=>n.id===id)!).filter(Boolean);
  return points?.length ? {left:Math.max(0,Math.min(...points.map(n=>n.x))-80),right:Math.min(data.map.world.width,Math.max(...points.map(n=>n.x))+80),bottom:Math.max(0,Math.min(...points.map(n=>n.y))-80),top:Math.min(data.map.world.height,Math.max(...points.map(n=>n.y))+80)} : {left:0,right:data.map.world.width,bottom:0,top:data.map.world.height};
}
export function sceneScenery(data:SceneData) {
  const area=displayArea(data),layout=visualLayout(data.map),focus=data.focusNodes?new Set(data.focusNodes):undefined;
  const homes=customerHomes(data.map);
  const visible=(x:number,y:number,w:number,d:number)=>x+w>=area.left&&x<=area.right&&y+d>=area.bottom&&y<=area.top;
  const localEdges=new Set(data.map.edges.filter(e=>!focus||focus.has(e.from)&&focus.has(e.to)).map(e=>'street-'+e.id));
  return {buildings:data.map.buildings.filter(b=>visible(b.x,b.y,b.w,b.d)),houses:layout.houses.filter(b=>visible(b.x-b.w/2,b.y-b.d/2,b.w,b.d)&&homes.every(h=>Math.hypot(h.x-b.x,h.y-b.y)>Math.hypot(h.w+b.w,h.d+b.d)/2+12)),homes:homes.filter(h=>visible(h.x-h.w/2,h.y-h.d/2,h.w,h.d)),roads:layout.roads.filter(r=>localEdges.has(r.id))};
}

/** A home sits beside its existing delivery point; its path is a visual doorstep link. */
export function customerHomes(map:MapData) {
  const homes:(VisualHouse&{node:string;order:string})[]=[];
  for(const [index,order] of canonical.orders.entries()) {
    const node=map.nodes.find(n=>n.id===order.node);if(!node)continue;
    const w=32,d=26,radius=Math.hypot(w,d)/2;
    let position:{x:number;y:number}|undefined;
    for(const distance of [48,65,85,110,140]) {
      for(let i=0;i<24;i++) {
        const angle=(i+index%6)*Math.PI/12,x=node.x+Math.cos(angle)*distance,y=node.y+Math.sin(angle)*distance;
        if(x-w/2<0||y-d/2<0||x+w/2>map.world.width||y+d/2>map.world.height)continue;
        if(map.edges.some(e=>e.polyline.slice(1).some((b,j)=>distanceToSegment(x,y,e.polyline[j],b)<radius+8)))continue;
        if(map.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<radius+8))continue;
        if(map.buildings.some(b=>x+w/2+8>b.x&&x-w/2-8<b.x+b.w&&y+d/2+8>b.y&&y-d/2-8<b.y+b.d))continue;
        if(homes.some(h=>Math.hypot(h.x-x,h.y-y)<radius+Math.hypot(h.w,h.d)/2+10))continue;
        position={x,y};break;
      }
      if(position)break;
    }
    if(!position)throw new Error('No clear visual home position for '+order.id);
    homes.push({id:'home-'+order.id.slice(1),order:order.id,node:order.node,model:houseModels[index%4],...position,w,d,h:12,z:terrainHeight(position.x,position.y)});
  }
  return homes;
}
