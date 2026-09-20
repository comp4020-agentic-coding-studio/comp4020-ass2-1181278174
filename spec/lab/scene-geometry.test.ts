import { expect, it } from 'vitest';
import type { Line } from 'three';
import { defaultConfig } from '../../src/lab/model';
import { runExperiment } from '../../src/lab/compute';
import { flightNetwork, release } from '../../src/lab/scene-assets';
it('places the network contour at the actual distance-interpolated height',()=>{
    const scene=runExperiment(defaultConfig(4)).scene!, network=flightNetwork(scene);
    try {
        const line=network.children.find(o=>o.userData.edge==='s-5-3>summit') as Line;
        // Measured canonical height at the second bend: the unequal segments matter.
        expect(line.geometry.attributes.position.getY(2)/3-3).toBeCloseTo(140.23805156810724,4);
    } finally {release(network);}
});
