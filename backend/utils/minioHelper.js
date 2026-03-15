console.error('DEBUG: Loading minioHelper.js');
const Minio = require('minio');

const endpointStr = process.env.MINIO_ENDPOINT || 'minio';
console.error('DEBUG: MinIO Helper Init - Raw Endpoint:', process.env.MINIO_ENDPOINT);
console.error('DEBUG: MinIO Helper Init - Resolved EndpointStr:', endpointStr);

let endPoint, port;
if (endpointStr.includes(':')) {
    const parts = endpointStr.split(':');
    endPoint = parts[0];
    port = parseInt(parts[1], 10);
} else {
    endPoint = endpointStr;
    port = 9000;
}
console.error(`DEBUG: MinIO Configuration - Host: ${endPoint}, Port: ${port}`);

// Initialize MinIO client
let minioClient;
try {
    console.error('DEBUG: Creating MinIO Client...');
    minioClient = new Minio.Client({
        endPoint: endPoint,
        port: port,
        useSSL: false,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });
    console.error('DEBUG: MinIO Client created successfully');
} catch (error) {
    console.error('DEBUG: Failed to create MinIO Client:', error);
    process.exit(1);
}

const PROFILE_BUCKET = 'labface-profiles';
const SNAPSHOT_BUCKET = 'labface-snapshots';

/**
 * Upload base64 image to MinIO
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} userId - User ID for filename
 * @param {string} type - Type of image (profile, face-front, face-left, etc.)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
async function uploadBase64ToMinio(base64Data, userId, type) {
    try {
        console.log(`[MinIO] Starting upload for ${type} (User: ${userId})`);

        // Check if bucket exists, create if not
        const bucketExists = await minioClient.bucketExists(PROFILE_BUCKET);
        if (!bucketExists) {
            console.log(`[MinIO] Bucket ${PROFILE_BUCKET} does not exist. Creating...`);
            await minioClient.makeBucket(PROFILE_BUCKET, 'us-east-1');
            console.log(`[MinIO] Bucket ${PROFILE_BUCKET} created successfully.`);

            const policy = {
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${PROFILE_BUCKET}/*`]
                }]
            };
            await minioClient.setBucketPolicy(PROFILE_BUCKET, JSON.stringify(policy));
            console.log(`[MinIO] Public read policy set for ${PROFILE_BUCKET}.`);
        }

        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data format');
        }

        const mimeType = matches[1];
        let buffer = Buffer.from(matches[2], 'base64');
        console.log(`[MinIO] Original Image: ${mimeType}, Size: ${buffer.length} bytes`);

        // IMAGE OPTIMIZATION (Strict & Compress)
        let ext = mimeType.split('/')[1] || 'jpg';
        try {
            const sharp = require('sharp');
            // Resize to max 600x600 and Compress to JPEG quality 60
            // This ensures consistent size (~20-40KB) and format
            const compressedBuffer = await sharp(buffer)
                .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60, mozjpeg: true })
                .toBuffer();

            console.log(`[MinIO] Compressed Image: ${compressedBuffer.length} bytes (Saved ${((buffer.length - compressedBuffer.length) / buffer.length * 100).toFixed(1)}%)`);
            buffer = compressedBuffer;
            ext = 'jpg'; // Always JPEG after compression
        } catch (sharpError) {
            console.warn('[MinIO] Sharp optimization failed/skipped:', sharpError.message);
            // Fallback to original buffer
        }

        const filename = `${userId}/${type}.${ext}`;

        await minioClient.putObject(
            PROFILE_BUCKET,
            filename,
            buffer,
            buffer.length,
            { 'Content-Type': 'image/jpeg' } // Force JPEG content type
        );

        console.log(`[MinIO] Upload successful: ${filename}`);

        const publicUrl = `/minio/${PROFILE_BUCKET}/${filename}?v=${Date.now()}`;
        return publicUrl;
    } catch (error) {
        console.error('[MinIO] Upload error:', error);
        throw error;
    }
}

/**
 * Upload buffer to MinIO
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Filename
 * @param {string} bucket - Bucket name (default: PROFILE_BUCKET)
 * @returns {Promise<string>} - Public URL of uploaded image
 */
async function uploadBufferToMinio(buffer, filename, bucket = PROFILE_BUCKET) {
    try {
        await minioClient.putObject(
            bucket,
            filename,
            buffer,
            buffer.length,
            { 'Content-Type': 'image/jpeg' }
        );

        return `/minio/${bucket}/${filename}`;
    } catch (error) {
        console.error('MinIO upload error:', error);
        throw error;
    }
}

/**
 * Delete object from MinIO
 * @param {string} url - Full URL of the object
 * @returns {Promise<void>}
 */
async function deleteFromMinio(url) {
    if (!url) return;
    try {
        console.log(`[MinIO] Attempting to delete: ${url}`);

        // Handle URLs like: /minio/labface-profiles/student123/profile.jpg?v=1739750000000
        // 1. Remove query parameters
        let cleanUrl = url.split('?')[0];

        // 2. Remove leading '/minio/' if present
        if (cleanUrl.startsWith('/minio/')) {
            cleanUrl = cleanUrl.substring(7);
        }

        // 3. Split into bucket and filename
        // The first part is the bucket, the rest is the object name (filename)
        const parts = cleanUrl.split('/');
        if (parts.length < 2) {
            console.warn(`[MinIO] Invalid URL format for deletion: ${url}`);
            return;
        }

        const bucket = parts[0];
        const objectName = parts.slice(1).join('/'); // Rejoin the rest in case of folders

        await minioClient.removeObject(bucket, objectName);
        console.log(`[MinIO] Deleted object: ${bucket}/${objectName}`);
    } catch (error) {
        console.error('[MinIO] Delete error:', error.message);
        // Don't throw if file already gone
        if (error.code === 'NoSuchKey') return;
        throw error;
    }
}

module.exports = {
    minioClient,
    uploadBase64ToMinio,
    uploadBufferToMinio,
    deleteFromMinio,
    PROFILE_BUCKET,
    SNAPSHOT_BUCKET
};
