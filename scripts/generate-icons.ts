import sharp from "sharp";
import fs from "fs";
import path from "path";
import toIco from "to-ico";

const SVG_PATH = path.resolve(__dirname, "../public/icon.svg");
const ICONS_DIR = path.resolve(__dirname, "../src-tauri/icons");
const ICONSET_DIR = path.resolve(__dirname, "../icon.iconset");

// Clean old icons
[ICONS_DIR, ICONSET_DIR].forEach((dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
});

// Load SVG buffer
const svgBuffer = fs.readFileSync(SVG_PATH);

// Helper: generate rounded rect mask
async function createRoundedMask(size: number, radius: number): Promise<Buffer> {
  const svgMask = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`;
  return await sharp(Buffer.from(svgMask)).png().toBuffer();
}

async function generateIcon(size: number, outputPath: string, radiusRatio = 0.2225, paddingRatio = 0.1) {
  // macOS icon guidelines:
  // - Icon content should occupy ~80% of the canvas (10% padding on each side)
  // - Corner radius should be ~22.25% of the icon size (matching macOS standard)
  const padding = Math.round(size * paddingRatio);
  const contentSize = size - padding * 2;
  const radius = Math.round(size * radiusRatio);

  // Create rounded rect mask for the full canvas size
  const maskBuffer = await createRoundedMask(size, radius);

  // Resize the SVG to the content size (smaller than canvas)
  const resizedIcon = await sharp(svgBuffer)
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Create a transparent canvas of full size and composite the icon centered
  const iconBuffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .png()
    .composite([
      {
        input: resizedIcon,
        gravity: "centre",
      },
    ])
    .png()
    .toBuffer();

  // Apply rounded corners mask
  const rounded = await sharp(iconBuffer)
    .composite([
      {
        input: maskBuffer,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(outputPath, rounded);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  // Generate standard Tauri icons
  await generateIcon(32, path.join(ICONS_DIR, "32x32.png"));
  await generateIcon(128, path.join(ICONS_DIR, "128x128.png"));
  await generateIcon(256, path.join(ICONS_DIR, "128x128@2x.png"));

  // Generate iconset for .icns
  const iconsetSizes = [
    { size: 16, suffix: "16x16" },
    { size: 32, suffix: "16x16@2x" },
    { size: 32, suffix: "32x32" },
    { size: 64, suffix: "32x32@2x" },
    { size: 128, suffix: "128x128" },
    { size: 256, suffix: "128x128@2x" },
    { size: 256, suffix: "256x256" },
    { size: 512, suffix: "256x256@2x" },
    { size: 512, suffix: "512x512" },
    { size: 1024, suffix: "512x512@2x" },
  ];

  for (const { size, suffix } of iconsetSizes) {
    await generateIcon(size, path.join(ICONSET_DIR, `icon_${suffix}.png`));
  }

  // Use iconutil to generate .icns (macOS only)
  try {
    const { execSync } = require("child_process");
    execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${path.join(ICONS_DIR, "icon.icns")}"`);
    console.log("Generated icon.icns");
  } catch (e) {
    console.warn("iconutil not available, skipping .icns generation. You can generate it on macOS.");
  }

  // Generate .ico with all standard Windows sizes (16, 24, 32, 48, 64, 128, 256)
  try {
    const largestPng = fs.readFileSync(path.join(ICONSET_DIR, "icon_512x512.png"));
    const icoBuffer = await toIco(largestPng, { resize: true, sizes: [16, 24, 32, 48, 64, 128, 256] });
    fs.writeFileSync(path.join(ICONS_DIR, "icon.ico"), icoBuffer);
    console.log("Generated icon.ico");
  } catch (e) {
    console.warn("Failed to generate .ico:", e);
  }

  console.log("\nIcon generation complete!");
}

main().catch(console.error);
