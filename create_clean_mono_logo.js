import sharp from 'sharp';
import path from 'path';

const srcPath = path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity-ide', 'brain', 'b03186fb-b2e5-45f0-af96-a288f644c6c9', 'logo_opt4_arrowhex_1788325847638.jpg');
const outPath = path.join(process.cwd(), 'public', 'logo_mono.png');

async function createUltraCleanMonochromeLogo() {
  const image = sharp(srcPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  console.log(`Processing ultra-clean monochrome logo ${width}x${height}`);

  const buf = Buffer.from(data);

  for (let i = 0; i < buf.length; i += channels) {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];

    const brightness = (r + g + b) / 3;
    const isWhiteBg = (r > 232 && g > 232 && b > 232);

    if (isWhiteBg) {
      // 100% transparent background
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = 0;
    } else {
      // Calculate symbol grayscale luminance
      // Blue channel was strong in original, calculate perceived darkness
      // Closer to 0 is darker symbol part, higher is lighter highlight
      const darkness = 1 - (brightness / 255);
      
      // Calculate clean edge alpha (anti-aliasing)
      let alpha = 255;
      if (brightness > 190) {
        // Soft edge falloff
        alpha = Math.max(0, Math.min(255, Math.floor(((232 - brightness) / 42) * 255)));
      }

      // Pure monochrome slate value: Deep rich charcoal to light metallic platinum
      // Dark areas -> 20 (almost black/dark slate)
      // Light highlight areas -> 190 (light platinum gray)
      const monoVal = Math.floor(25 + (1 - darkness) * 160);

      buf[i] = monoVal;
      buf[i + 1] = monoVal;
      buf[i + 2] = monoVal;
      buf[i + 3] = alpha;
    }
  }

  // Save with sharp, trimmed, crisp edges
  await sharp(buf, { raw: { width, height, channels } })
    .trim()
    .png()
    .toFile(outPath);

  console.log('Ultra-clean monochrome logo saved successfully at:', outPath);
}

createUltraCleanMonochromeLogo().catch(console.error);
