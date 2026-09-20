import { it, expect } from 'vitest';
import { canonical } from '../../src/lab/model';
import { distanceToSegment, toScene, visualLayout } from '../../src/lab/visual-layout';
it('decorations leave every flight edge, address and original obstacle clear',()=>{
  const before=JSON.stringify(canonical), {houses}=visualLayout(canonical.map);
  expect(houses).toHaveLength(22);
  for(const h of houses) {
    const radius=Math.hypot(h.w,h.d)/2;
    for(const e of canonical.map.edges) for(let i=1;i<e.polyline.length;i++) expect(distanceToSegment(h.x,h.y,e.polyline[i-1],e.polyline[i])).toBeGreaterThanOrEqual(radius+18);
    for(const n of canonical.map.nodes) expect(Math.hypot(h.x-n.x,h.y-n.y)).toBeGreaterThanOrEqual(radius+30);
    for(const b of canonical.map.buildings) expect(h.x+h.w/2+20>b.x&&h.x-h.w/2-20<b.x+b.w&&h.y+h.d/2+20>b.y&&h.y-h.d/2-20<b.y+b.d).toBe(false);
  }
  expect(JSON.stringify(canonical)).toBe(before);
});
it('street drawing never duplicates directed pairs or implies the corridor is a road',()=>{
  const a=visualLayout(canonical.map), b=visualLayout(canonical.map);
  expect(a).toEqual(b);
  const paths=a.roads.map(r=>JSON.stringify([...r.points].sort((a,b)=>a[0]-b[0]||a[1]-b[1])));
  expect(new Set(paths).size).toBe(paths.length);
  expect(a.roads.some(r=>r.id.includes('summit'))).toBe(false);
  expect(a.roads.some(r=>r.id.includes('s-3-2>s-3-3'))).toBe(false);
});
it('presentation scaling has one east/north/elevation transform',()=>{
  expect(toScene(1000,1000,50)).toEqual([0,150,0]);
  expect(toScene(1100,1200,0)).toEqual([100,0,-200]);
});
