// The same radial hill as tools/data/build-map.ts; no scenario data is regenerated.
export function terrainHeight(x: number, y: number) { const d = Math.hypot(x - 1240, y - 1460); return 120 * Math.exp(-d * d / (2 * 650 * 650)) + 45 * Math.max(0, 1 - d / 200); }
export function contourRadius(height: number) { let low = 0, high = 3000; for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (terrainHeight(1240 + mid, 1460) > height)
        low = mid;
    else
        high = mid;
} return (low + high) / 2; }
