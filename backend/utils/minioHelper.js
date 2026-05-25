console.error('DEBUG: Loading minioHelper.js');
const Minio = require('minio');

const endpointStr = process.env.MINIO_ENDPOINT || 'minio';
const configuredPort = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : undefined;
const useSSL = process.env.MINIO_USE_SSL === 'true';

console.error('DEBUG: MinIO Helper Init - Raw Endpoint:', process.env.MINIO_ENDPOINT);
console.error('DEBUG: MinIO Helper Init - Resolved EndpointStr:', endpointStr);
console.error('DEBUG: MinIO Helper Init - Use SSL:', useSSL);

function parseEndpoint(rawEndpoint) {
    const defaultPort = useSSL ? 443 : 9000;

    if (!rawEndpoint) {
        return { endPoint: 'minio', port: configuredPort || defaultPort, useSSL };
    }

    if (/^https?:\/\//i.test(rawEndpoint)) {
        const parsed = new URL(rawEndpoint);
        return {
            endPoint: parsed.hostname,
            port: parseInt(parsed.port || String(configuredPort || (parsed.protocol === 'https:' ? 443 : 80)), 10),
            useSSL: parsed.protocol === 'https:'
        };
    }

    if (rawEndpoint.includes(':') && !rawEndpoint.includes('/')) {
        const [host, portPart] = rawEndpoint.split(':');
        return {
            endPoint: host,
            port: parseInt(portPart, 10) || configuredPort || defaultPort,
            useSSL
        };
    }

    return {
        endPoint: rawEndpoint,
        port: configuredPort || defaultPort,
        useSSL
    };
}

const { endPoint, port } = parseEndpoint(endpointStr);
console.error(`DEBUG: MinIO Configuration - Host: ${endPoint}, Port: ${port}, SSL: ${useSSL}`);

// Initialize MinIO client
let minioClient;
try {
    console.error('DEBUG: Creating MinIO Client...');
    minioClient = new Minio.Client({
        endPoint: endPoint,
        port: port,
        useSSL: useSSL,
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
const EXCUSE_BUCKET = 'labface-excuses';

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
        console.log(`[MinIO] Original Data: ${mimeType}, Size: ${buffer.length} bytes`);

        const isPdf = mimeType === 'application/pdf';
        let ext = mimeType.split('/')[1] || (isPdf ? 'pdf' : 'jpg');
        let contentType = isPdf ? 'application/pdf' : 'image/jpeg';

        if (!isPdf) {
            // IMAGE OPTIMIZATION (Strict & Compress)
            try {
                const sharp = require('sharp');
                // Resize to max 800x800 and Compress to JPEG quality 70
                const compressedBuffer = await sharp(buffer)
                    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 70, mozjpeg: true })
                    .toBuffer();

                console.log(`[MinIO] Compressed Image: ${compressedBuffer.length} bytes (Saved ${((buffer.length - compressedBuffer.length) / buffer.length * 100).toFixed(1)}%)`);
                buffer = compressedBuffer;
                ext = 'jpg';
                contentType = 'image/jpeg';
            } catch (sharpError) {
                console.warn('[MinIO] Sharp optimization failed/skipped:', sharpError.message);
            }
        }

        const filename = `${userId}/${type}.${ext}`;

        await minioClient.putObject(
            PROFILE_BUCKET,
            filename,
            buffer,
            buffer.length,
            { 'Content-Type': contentType }
        );

        console.log(`[MinIO] Upload successful: ${filename}`);

        const publicUrl = `/api/minio/${PROFILE_BUCKET}/${filename}?v=${Date.now()}`;
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
        let contentType = 'application/octet-stream';
        const ext = filename.split('.').pop().toLowerCase();
        
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'pdf') contentType = 'application/pdf';

        // Check if bucket exists
        const bucketExists = await minioClient.bucketExists(bucket);
        if (!bucketExists) {
            console.log(`[MinIO] Bucket ${bucket} does not exist. Creating...`);
            await minioClient.makeBucket(bucket, 'us-east-1');
            
            // Set public policy
            const policy = {
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${bucket}/*`]
                }]
            };
            await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
        }

        await minioClient.putObject(
            bucket,
            filename,
            buffer,
            buffer.length,
            { 'Content-Type': contentType }
        );

        return `/api/minio/${bucket}/${filename}`;
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

/**
 * Standardize image URL to use proxy /api/minio/ prefix
 * @param {string} url - Original URL or path from DB
 * @param {string} defaultBucket - Bucket if only a filename is provided
 * @returns {string} - Fixed proxy URL
 */
function standardizeImageUrl(url, defaultBucket = PROFILE_BUCKET) {
    if (!url) return url;

    // 1. Handle full URLs from MinIO directly (e.g. http://minio:9000/bucket/file)
    if (url.includes('minio:9000') || url.includes('minio:9002')) {
        try {
            const urlObj = new URL(url);
            return `/api/minio${urlObj.pathname}`;
        } catch (e) {
            // Fallback for malformed URLs
            return url;
        }
    }

    // 2. Already starts with /api/minio/
    if (url.startsWith('/api/minio/')) return url;

    // 3. Absolute URL or path containing /minio/ but missing /api
    // This catches https://labface.site/minio/bucket/... and /minio/bucket/...
    if (url.includes('/minio/')) {
        const parts = url.split('/minio/');
        // Reconstruct as /api/minio/ + the remaining path
        return '/api/minio/' + parts[parts.length - 1];
    }

    // 4. Absolute HTTP(S) URL to external source (not our minio)
    if (url.startsWith('http')) return url;

    // 5. Bare filename or relative path
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    
    // If it contains a slash, assume it's bucket/path
    if (cleanPath.includes('/')) {
        return `/api/minio/${cleanPath}`;
    }

    // Bare filename - assume default bucket
    return `/api/minio/${defaultBucket}/${cleanPath}`;
}

module.exports = {
    minioClient,
    uploadBase64ToMinio,
    uploadBufferToMinio,
    deleteFromMinio,
    standardizeImageUrl,
    PROFILE_BUCKET,
    SNAPSHOT_BUCKET,
    EXCUSE_BUCKET,
    /**
     * Get an object from MinIO as a stream
     */
    getObjectStream: async (bucket, objectName) => {
        return await minioClient.getObject(bucket, objectName);
    },

    /**
     * Get an object from MinIO as a Buffer
     */
    getObjectBuffer: async (bucket, objectName) => {
        const stream = await minioClient.getObject(bucket, objectName);
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    },

    /**
     * Get an object from MinIO as a Base64 string
     */
    getObjectAsBase64: async (url) => {
        if (!url) return null;
        try {
            // Parse bucket and objectName from URL (e.g. /api/minio/labface-profiles/student123/cor.jpg)
            let cleanUrl = url.split('?')[0];
            if (cleanUrl.startsWith('/api/minio/')) cleanUrl = cleanUrl.substring(11);
            else if (cleanUrl.startsWith('/minio/')) cleanUrl = cleanUrl.substring(7);

            const parts = cleanUrl.split('/');
            const bucket = parts[0];
            const objectName = parts.slice(1).join('/');

            const stream = await minioClient.getObject(bucket, objectName);
            const chunks = [];
            
            return new Promise((resolve, reject) => {
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const ext = objectName.split('.').pop().toLowerCase();
                    const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
                    resolve(`data:${mime};base64,${buffer.toString('base64')}`);
                });
            });
        } catch (error) {
            console.error('[MinIO] Get Base64 error:', error);
            return null;
        }
    }
};
