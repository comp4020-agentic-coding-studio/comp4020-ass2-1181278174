import type { MapData } from '../data/schema';
import { contourRadius, terrainHeight } from './terrain';

export const elevationBands = [
  [0, '#d9e4c2'], [30, '#bfd19b'], [45, '#a3bc7f'], [60, '#91a96c'],
  [75, '#a4ae71'], [90, '#bdb27b'], [105, '#cdb582'], [120, '#bd9468'],
  [135, '#aa7954'], [150, '#eee0b9'],
] as const;

/** The existing blocked crossing belt, with its corridor and end crossings left open. */
export function ridgeSections(map: MapData) {
  const south=map.buildings.find(b=>b.id==='ridge-s-2-2')!;
  const north=map.buildings.find(b=>b.id==='ridge-s-4-2')!;
  const towers=map.buildings.filter(b=>b.kind==='tower').sort((a,b)=>a.y-b.y);
  return [
    [[south.x+south.w/2,south.y],[towers[0].x+25,towers[0].y],[towers[0].x+25,towers[0].y+towers[0].d]],
    [[towers[1].x+25,towers[1].y],[towers[1].x+25,towers[1].y+towers[1].d],[north.x+north.w/2,north.y+north.d]],
  ];
}

/** Shared contour bands use the same height field as the route model. */
export function landscapeSvg(map:MapData,pt:(x:number,y:number)=>string,sx:number,sy:number,local=false) {
  const center=pt(1240,1460).split(',');
  const contours=elevationBands.slice(1).map(([z,color])=>{
    const r=contourRadius(z);
    return `<ellipse cx="${center[0]}" cy="${center[1]}" rx="${r*sx}" ry="${r*sy}" fill="${color}" stroke="#596343" stroke-opacity=".4" stroke-width=".8"/>`;
  }).join('');
  const ridge=local?'':ridgeSections(map).map(points=>`<polyline points="${points.map(p=>pt(p[0],p[1])).join(' ')}" fill="none" stroke="#67533b" stroke-width="${Math.max(8,60*sx)}" stroke-linecap="round"/><polyline points="${points.map(p=>pt(p[0],p[1])).join(' ')}" fill="none" stroke="#d5bc8e" stroke-width="${Math.max(2,18*sx)}" stroke-dasharray="3 4"/>`).join('');
  return `<g data-terrain-bands><rect width="720" height="510" fill="${elevationBands[0][1]}"/>${contours}</g><g data-ridge>${ridge}</g>`;
}

export function landscapeLabels(pt:(x:number,y:number)=>string) {
  const label=(text:string,x:number,y:number,size=16)=>`<text x="${pt(x,y).split(',')[0]}" y="${pt(x,y).split(',')[1]}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#493b28" stroke="#fff8e6" stroke-width="4" paint-order="stroke">${text}</text>`;
  return `<g data-landmarks>${label('SLOP HILL · 165 m',1240,1850,20)}${label('RIDGE',760,1250)}${label('PASS · one drone',855,920)}${label('Kitchen lowlands',280,180,14)}${label('North way round',880,1540,12)}${label('South way round',830,470,12)}</g><g transform="translate(438 486)"><text x="0" y="-9" font-size="11" fill="#493b28">Elevation · low → hilltop</text>${elevationBands.map(([,c],i)=>`<rect x="${i*22}" y="0" width="22" height="8" fill="${c}"/>`).join('')}</g>`;
}

export function terrainShade(x:number,y:number) {
  const z=terrainHeight(x,y);
  return elevationBands.filter(b=>b[0]<=z).at(-1)![1];
}
