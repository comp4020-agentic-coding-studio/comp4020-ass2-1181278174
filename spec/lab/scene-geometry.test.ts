import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3, type Line } from 'three';
import { defaultConfig } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { flightNetwork, release } from '../../src/lab/scene-assets';
import { blockInspection, fitInspection } from '../../src/lab/scene-inspection';
import { toScene } from '../../src/lab/visual-layout';
it('places the network contour at the actual distance-interpolated height',()=>{
    const scene=runExperiment(defaultConfig(4)).scene!, network=flightNetwork(scene);
    try {
        const line=network.children.find(o=>o.userData.edge==='s-5-3>summit') as Line;
        // Measured canonical height at the second bend: the unequal segments matter.
        expect(line.geometry.attributes.position.getY(2)/3-3).toBeCloseTo(140.23805156810724,4);
    } finally {release(network);}
});
it('keeps the W1 network inside its ten-node teaching block',()=>{
    const data=runExperiment(defaultConfig(1)).scene!,network=flightNetwork(data);
    try {
        const allowed=new Set(data.focusNodes);
        const edges=network.children.map(o=>data.map.edges.find(e=>e.id===o.userData.edge)!);
        expect(edges.length).toBeGreaterThan(0);
        expect(edges.every(e=>allowed.has(e.from)&&allowed.has(e.to))).toBe(true);
    } finally {release(network);}
});
it('fits the whole W1 block and its blocked connection in both canvas shapes',()=>{
    const data=runExperiment(defaultConfig(1)).scene!;
    const block=data.map.nodes.filter(n=>data.focusNodes!.includes(n.id)).map(n=>new Vector3(...toScene(n.x,n.y,n.z+12)));
    const inspection=blockInspection(data,['s-1-1','s-2-2'],['block-2']);
    try {
        for(const aspect of [543/391,326/330])for(const points of [block,inspection.frame])for(const top of [false,true]) {
            const camera=new PerspectiveCamera(43,aspect,1,10000);
            fitInspection(camera,points,top);
            for(const point of points) {
                const screen=point.clone().project(camera);
                expect(Math.abs(screen.x)).toBeLessThan(.9);
                expect(Math.abs(screen.y)).toBeLessThan(.9);
                expect(screen.z).toBeGreaterThan(-1);
                expect(screen.z).toBeLessThan(1);
            }
        }
    } finally {release(inspection.group);}
});
