
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_ASSETS_DIR = path.resolve(__dirname, '../public/assets');
const TARGET_FILE = 'characters.jpg';
const OUTPUT_QUALITY = 80;
const MAX_WIDTH = 1920;

async function optimize() {
    const filePath = path.join(PUBLIC_ASSETS_DIR, TARGET_FILE);

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const backupPath = `${filePath}.bak`;
    console.log(`Backing up original to ${backupPath}`);
    fs.copyFileSync(filePath, backupPath);

    console.log(`Optimizing ${TARGET_FILE}...`);

    // Get metadata
    const metadata = await sharp(filePath).metadata();
    console.log(`Original size: ${metadata.width}x${metadata.height}`);

    // Compress in place (same format)
    const tempPath = `${filePath}.tmp.jpg`;

    await sharp(filePath)
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .jpeg({ quality: OUTPUT_QUALITY, mozjpeg: true })
        .toFile(tempPath);

    fs.renameSync(tempPath, filePath);

    const newMetadata = await sharp(filePath).metadata();
    console.log(`Optimized size: ${newMetadata.width}x${newMetadata.height}`);
    console.log(`Success! ${TARGET_FILE} has been optimized.`);

    // Also create a WebP version just in case
    const webpPath = filePath.replace('.jpg', '.webp');
    await sharp(filePath)
        .webp({ quality: OUTPUT_QUALITY })
        .toFile(webpPath);
    console.log(`Created WebP version at ${webpPath}`);
}

optimize().catch(console.error);
