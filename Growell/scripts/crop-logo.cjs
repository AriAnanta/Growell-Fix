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
    const output = path.join(outDir, 'growell-icon.png');

    const img = sharp(input);
    const meta = await img.metadata();

    // Crop area: keep left 38% of the width (adjustable)
    const cropFraction = 0.38;
    const cropWidth = Math.max(40, Math.round(meta.width * cropFraction));
    const cropHeight = meta.height;

    console.log({ width: meta.width, height: meta.height, cropWidth, cropHeight });

    await img
      .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
      .png({ compressionLevel: 9 })
      .toFile(output);

    console.log('Cropped logo written to', output);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
