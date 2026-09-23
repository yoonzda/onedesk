import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcPath = path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity-ide', 'brain', 'b03186fb-b2e5-45f0-af96-a288f644c6c9', 'logo_opt4_arrowhex_1788325847638.jpg');
const outDir = path.join(process.cwd(), 'public');

async function processLogo() {
  const image = sharp(srcPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  console.log(`Processing image ${width}x${height}, channels: ${channels}`);

  // Helper to create transparent recolored buffers
  function createRecolored(colorTransform) {
    const buf = Buffer.from(data);
    for (let i = 0; i < buf.length; i += channels) {
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];

      // Calculate whiteness
      // Background is clean white (r,g,b all > 230)
      const minVal = Math.min(r, g, b);
      const maxVal = Math.max(r, g, b);
      const brightness = (r + g + b) / 3;

      if (brightness > 242 && (maxVal - minVal) < 15) {
        // Fully transparent
        buf[i + 3] = 0;
      } else if (brightness > 215 && (maxVal - minVal) < 25) {
        // Anti-aliased edge
        const alpha = Math.max(0, Math.min(255, Math.floor((242 - brightness) / 27 * 255)));
        buf[i + 3] = alpha;
        colorTransform(buf, i, r, g, b);
      } else {
        // Foreground pixel
        buf[i + 3] = 255;
        colorTransform(buf, i, r, g, b);
      }
    }
    return sharp(buf, { raw: { width, height, channels } }).trim().png();
  }

  // 1. Original Blue with Transparent Background
  await createRecolored((buf, i, r, g, b) => {
    // Keep original RGB
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
  }).toFile(path.join(outDir, 'logo4_original.png'));

  // 2. Deep Indigo & Violet
  await createRecolored((buf, i, r, g, b) => {
    const intensity = 1 - (r + g + b) / (3 * 255);
    // Indigo / Violet gradient
    buf[i] = Math.min(255, Math.floor(r * 0.9 + 50));     // R
    buf[i + 1] = Math.min(255, Math.floor(g * 0.6 + 10)); // G
    buf[i + 2] = Math.min(255, Math.floor(b * 1.05));     // B
  }).toFile(path.join(outDir, 'logo4_indigo.png'));

  // 3. Emerald & Teal
  await createRecolored((buf, i, r, g, b) => {
    // Swap blue to rich emerald cyan
    buf[i] = Math.min(255, Math.floor(r * 0.2));
    buf[i + 1] = Math.min(255, Math.floor(b * 0.85 + 20));
    buf[i + 2] = Math.min(255, Math.floor(b * 0.75 + 40));
  }).toFile(path.join(outDir, 'logo4_teal.png'));

  // 4. Sleek Monochrome Slate Dark
  await createRecolored((buf, i, r, g, b) => {
    // Grayscale luxury metallic
    const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
    buf[i] = Math.floor(gray * 0.75);
    buf[i + 1] = Math.floor(gray * 0.8);
    buf[i + 2] = Math.floor(gray * 0.9);
  }).toFile(path.join(outDir, 'logo4_mono.png'));

  // 5. Warm Coral / Sunset Amber
  await createRecolored((buf, i, r, g, b) => {
    // Vibrant Sunset Coral
    buf[i] = Math.min(255, Math.floor(b * 0.95 + 40));
    buf[i + 1] = Math.min(255, Math.floor(g * 0.45 + 20));
    buf[i + 2] = Math.min(255, Math.floor(r * 0.3));
  }).toFile(path.join(outDir, 'logo4_coral.png'));

  console.log('All 5 transparent PNGs generated successfully in public directory!');
}

processLogo().catch(console.error);
