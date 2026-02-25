const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const input = path.join(repoRoot, 'Growell (1).png');
    if (!fs.existsSync(input)) {
      console.error('Input file not found:', input);
      process.exit(1);
    }

    const outDir = path.join(repoRoot, 'src', 'assets');
    fs.mkdirSync(outDir, { recursive: true });
    const output = path.join(outDir, 'growell-icon-top.png');

    const img = sharp(input);
    const meta = await img.metadata();

    // Crop the top portion (keep top ~60% of the image)
    const cropHeightFraction = 0.60; // keep 60% of height from top (adjustable)
    const cropHeight = Math.max(50, Math.round(meta.height * cropHeightFraction));
    const cropWidth = meta.width; // keep full width to avoid cutting icon horizontally
    const left = 0;
    const top = 0;

    console.log({ width: meta.width, height: meta.height, cropWidth, cropHeight, left, top });

    await img
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .png({ compressionLevel: 9 })
      .toFile(output);

    console.log('Top-cropped logo written to', output);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
