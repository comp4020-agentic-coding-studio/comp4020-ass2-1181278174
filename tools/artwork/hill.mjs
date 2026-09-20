// Draws Slop Hill as flat two-ink shapes and writes the site's two images:
// the home hero (2560×1086 avif) and the link-preview card (1200×630 png).
// Run: node tools/artwork/hill.mjs
import sharp from "sharp";

const CREAM = "#f4ecdc";
const GOLD = "#b97d1c";
const DARK_GOLD = "#8a5c13";
const INK = "#2b2520";

function scene(W, H, withTitle) {
  const x = (f) => (f * W).toFixed(1);
  const y = (f) => (f * H).toFixed(1);
  // the hill: foot on the left, summit right of centre, a long fall to the right edge
  const hill = `M ${x(0)} ${y(0.80)} C ${x(0.18)} ${y(0.76)}, ${x(0.34)} ${y(0.58)}, ${x(0.46)} ${y(0.44)} S ${x(0.60)} ${y(0.28)}, ${x(0.64)} ${y(0.27)} S ${x(0.86)} ${y(0.46)}, ${x(1)} ${y(0.58)} L ${x(1)} ${y(1)} L ${x(0)} ${y(1)} Z`;
  const shade = `M ${x(0.64)} ${y(0.27)} S ${x(0.86)} ${y(0.46)}, ${x(1)} ${y(0.58)} L ${x(1)} ${y(1)} L ${x(0.64)} ${y(1)} Z`;
  // contour lines across the slope
  const contours = [0.36, 0.45, 0.54, 0.63, 0.72]
    .map((f) => `<path d="M ${x(0.05)} ${y(f + 0.12)} C ${x(0.35)} ${y(f + 0.02)}, ${x(0.55)} ${y(f - 0.04)}, ${x(0.95)} ${y(f + 0.06)}" fill="none" stroke="${CREAM}" stroke-opacity="0.55" stroke-width="${(H * 0.004).toFixed(1)}"/>`)
    .join("");
  const houses = [
    [0.22, 0.735], [0.30, 0.66], [0.37, 0.60], [0.52, 0.42], [0.57, 0.36],
    [0.72, 0.36], [0.80, 0.42], [0.90, 0.51],
  ].map(([fx, fy]) => `<rect x="${(fx * W - H * 0.012).toFixed(1)}" y="${(fy * H - H * 0.024).toFixed(1)}" width="${(H * 0.024).toFixed(1)}" height="${(H * 0.024).toFixed(1)}" fill="${INK}"/>`).join("");
  const s = H * 0.03;
  const summit = `<rect x="${(0.64 * W - s / 2).toFixed(1)}" y="${(0.27 * H - s).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${INK}"/>`;
  const kitchen = `<rect x="${x(0.08)}" y="${y(0.74)}" width="${(H * 0.07).toFixed(1)}" height="${(H * 0.055).toFixed(1)}" fill="${INK}"/><rect x="${(0.08 * W + H * 0.05).toFixed(1)}" y="${y(0.715)}" width="${(H * 0.012).toFixed(1)}" height="${(H * 0.03).toFixed(1)}" fill="${INK}"/>`;
  // the corridor: two towers on the slope with a gap between them
  const towers = `<rect x="${x(0.40)}" y="${y(0.36)}" width="${(W * 0.025).toFixed(1)}" height="${(H * 0.22).toFixed(1)}" fill="${INK}"/><rect x="${x(0.455)}" y="${y(0.34)}" width="${(W * 0.025).toFixed(1)}" height="${(H * 0.24).toFixed(1)}" fill="${INK}"/><line x1="${x(0.425)}" y1="${y(0.47)}" x2="${x(0.455)}" y2="${y(0.47)}" stroke="${CREAM}" stroke-width="${(H * 0.006).toFixed(1)}" stroke-dasharray="${(H * 0.012).toFixed(1)} ${(H * 0.008).toFixed(1)}"/>`;
  // two routes from the kitchen to the summit: the ridge (straight, steep) and the contour (long, gentle)
  const kx = 0.08 * W + H * 0.035, ky = 0.74 * H;
  const ridge = `<path d="M ${kx.toFixed(1)} ${ky.toFixed(1)} C ${x(0.30)} ${y(0.60)}, ${x(0.50)} ${y(0.38)}, ${x(0.64)} ${y(0.26)}" fill="none" stroke="${INK}" stroke-width="${(H * 0.008).toFixed(1)}"/>`;
  const contour = `<path d="M ${kx.toFixed(1)} ${ky.toFixed(1)} C ${x(0.35)} ${y(0.78)}, ${x(0.70)} ${y(0.66)}, ${x(0.86)} ${y(0.50)} S ${x(0.74)} ${y(0.30)}, ${x(0.64)} ${y(0.26)}" fill="none" stroke="${DARK_GOLD}" stroke-width="${(H * 0.008).toFixed(1)}" stroke-dasharray="${(H * 0.02).toFixed(1)} ${(H * 0.012).toFixed(1)}"/>`;
  const drone = (fx, fy, c) => {
    const r = H * 0.014, a = H * 0.028;
    const cx = fx * W, cy = fy * H;
    return `<line x1="${(cx - a).toFixed(1)}" y1="${(cy - a).toFixed(1)}" x2="${(cx + a).toFixed(1)}" y2="${(cy + a).toFixed(1)}" stroke="${c}" stroke-width="${(H * 0.006).toFixed(1)}"/><line x1="${(cx - a).toFixed(1)}" y1="${(cy + a).toFixed(1)}" x2="${(cx + a).toFixed(1)}" y2="${(cy - a).toFixed(1)}" stroke="${c}" stroke-width="${(H * 0.006).toFixed(1)}"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}"/>`;
  };
  const drones = drone(0.20, 0.52, INK) + drone(0.44, 0.24, DARK_GOLD);
  const title = withTitle
    ? `<text x="${x(0.05)}" y="${y(0.20)}" font-family="Helvetica, Arial, sans-serif" font-size="${(H * 0.11).toFixed(0)}" font-weight="700" fill="${INK}">Twenty Dinners, One Hill</text><text x="${x(0.05)}" y="${y(0.29)}" font-family="Helvetica, Arial, sans-serif" font-size="${(H * 0.05).toFixed(0)}" fill="${DARK_GOLD}">SLOP3969 · Slop University</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${CREAM}"/><path d="${hill}" fill="${GOLD}"/><path d="${shade}" fill="${DARK_GOLD}" fill-opacity="0.35"/>${contours}${towers}${contour}${ridge}${houses}${summit}${kitchen}${drones}${title}</svg>`;
}

await sharp(Buffer.from(scene(2560, 1086, false))).avif({ quality: 55 }).toFile("src/assets/images/hero-home.avif");
await sharp(Buffer.from(scene(1200, 630, true))).png({ compressionLevel: 9 }).toFile("src/assets/images/card.png");
console.log("wrote src/assets/images/hero-home.avif and src/assets/images/card.png");
