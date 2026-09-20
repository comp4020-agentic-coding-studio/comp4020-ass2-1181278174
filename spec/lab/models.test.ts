import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('exported Blender library', () => {
    it('ships the named prototypes and every independently animated drone anchor', () => {
        const bytes = readFileSync('public/models/slop-hill.glb');
        expect(bytes.subarray(0, 4).toString()).toBe('glTF');
        expect(bytes.readUInt32LE(8)).toBe(bytes.length);
        expect(bytes.length).toBeLessThan(1_200_000);
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        const manifest = JSON.parse(readFileSync('public/models/manifest.json', 'utf8'));
        const roots = gltf.scenes[gltf.scene].nodes.map((i: number) => gltf.nodes[i]);
        expect(roots.map((n: any) => n.name).sort()).toEqual([...manifest.roots].sort());
        expect(gltf.images ?? []).toHaveLength(0);
        const anchors = (n: any): string[] => [n.extras?.anchor, ...(n.children ?? []).flatMap((i: number) => anchors(gltf.nodes[i]))].filter(Boolean);
        for (const name of ['drone_L', 'drone_H'])
            expect(anchors(roots.find((n: any) => n.name === name))).toEqual(expect.arrayContaining(manifest.droneAnchors));
    });
});
