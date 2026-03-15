const sharp = require('sharp');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables for standalone execution
dotenv.config({ path: path.join(__dirname, '../../.env.prod') });

const { minioClient, PROFILE_BUCKET } = require('../utils/minioHelper');

const BUCKET = PROFILE_BUCKET;

async function compressImage(buffer, filename) {
    try {
        let pipeline = sharp(buffer);
        const isCOR = filename.toLowerCase().includes('cor.');

        if (isCOR) {
            // COR: High Quality
            pipeline = pipeline.resize(1600, null, { withoutEnlargement: true })
                .jpeg({ quality: 85, mozjpeg: true });
        } else {
            // Faces/ID: Low Quality
            pipeline = pipeline.resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60, mozjpeg: true });
        }

        return await pipeline.toBuffer();
    } catch (err) {
        console.error(`Error compressing ${filename}:`, err.message);
        return null;
    }
}

async function processBucket() {
    console.log(`[Migration] Starting compression for bucket: ${BUCKET}`);

    // Check connection
    try {
        await minioClient.bucketExists(BUCKET);
    } catch (e) {
        console.error(`[Migration] Cannot connect to MinIO. Ensure it's running. Error: ${e.message}`);
        process.exit(1);
    }

    const stream = minioClient.listObjects(BUCKET, '', true);
    let count = 0;
    let savings = 0;

    stream.on('data', async (obj) => {
        const filename = obj.name;
        // Basic filtering for images
        if (!filename.match(/\.(jpg|jpeg|png|webp)$/i)) return;

        console.log(`Processing: ${filename} (${(obj.size / 1024).toFixed(2)} KB)`);

        try {
            // 1. Download
            // Using callback approach for stream if needed, or getObject promise
            const dataStream = await minioClient.getObject(BUCKET, filename);
            const chunks = [];
            for await (const chunk of dataStream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // 2. Compress
            const compressedBuffer = await compressImage(buffer, filename);

            if (!compressedBuffer) return;

            // 3. Compare & Upload
            const savedBytes = buffer.length - compressedBuffer.length;

            // Overwrite if specific conditions met (always true for this migration)
            if (savedBytes > 0 || buffer.length > 500000) {
                await minioClient.putObject(
                    BUCKET,
                    filename,
                    compressedBuffer,
                    compressedBuffer.length,
                    { 'Content-Type': 'image/jpeg' }
                );
                savings += savedBytes;
                console.log(`  -> Optimized! Saved ${(savedBytes / 1024).toFixed(2)} KB`);
            } else {
                console.log(`  -> Skipped (Already optimized)`);
            }

            count++;
        } catch (err) {
            console.error(`  -> FAILED: ${err.message}`);
        }
    });

    stream.on('error', (err) => { console.error('Stream Error:', err); });
    stream.on('end', () => {
        console.log(`\n[Migration] Finished! Processed ${count} images.`);
        console.log(`[Migration] Total Storage Saved: ${(savings / 1024 / 1024).toFixed(2)} MB`);
        process.exit(0);
    });
}

// Start
processBucket();
