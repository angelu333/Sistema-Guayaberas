// scripts/generate-icons.mjs
// Genera todos los tamaños de ícono PWA desde la imagen fuente
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_IMAGE = join(__dirname, "../src_icon.jpg");
const OUTPUT_DIR = join(__dirname, "../public/icons");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: "cover", position: "center" })
      .png()
      .toFile(outputPath);
    console.log(`✓ Generado: icon-${size}x${size}.png`);
  }

  console.log(`\n✅ Todos los íconos generados en /public/icons/`);
}

generateIcons().catch(console.error);
