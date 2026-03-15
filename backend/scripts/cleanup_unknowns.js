const dotenv = require('dotenv');
const path = require('path');

// Load environment variables for standalone execution
dotenv.config({ path: path.join(__dirname, '../../.env.prod') });

const { minioClient, SNAPSHOT_BUCKET } = require('../utils/minioHelper');

const BUCKET = 'labface-snapshots';

async function cleanupUnknowns() {
    console.log(`[Cleanup] Starting cleanup for bucket: ${BUCKET}`);

    try {
        console.log('[Cleanup] Listing buckets...');
        const buckets = await minioClient.listBuckets();
        console.log('[Cleanup] Available buckets:', buckets.map(b => b.name).join(', '));

        const bucketExists = await minioClient.bucketExists(BUCKET);
        if (!bucketExists) {
            console.error(`Bucket ${BUCKET} does not exist.`);
            return;
        }
    } catch (err) {
        console.error('Error connecting to MinIO:', err);
        return;
    }

    const stream = minioClient.listObjects(BUCKET, '', true);
    let deletedCount = 0;
    let errors = 0;

    // We can collect objects to delete them
    // MinIO removeObjects takes a list of names
    let objectsToDelete = [];

    stream.on('data', async (obj) => {
        // Filter for "unknown" in filename
        // Path format: attendance/SY/Sem/Class/Date/studentId_time.jpg
        // "unknown" might be the studentId part.

        if (obj.name.toLowerCase().includes('unknown')) {
            console.log(`Marking for deletion: ${obj.name}`);
            objectsToDelete.push(obj.name);
        }
    });

    stream.on('error', (err) => { console.error('Stream Error:', err); });

    stream.on('end', async () => {
        console.log(`[Cleanup] Found ${objectsToDelete.length} 'unknown' snapshots.`);

        if (objectsToDelete.length > 0) {
            // Delete in batches of 1000 if needed, but minio client updates usually handle list
            try {
                await minioClient.removeObjects(BUCKET, objectsToDelete);
                console.log(`[Cleanup] Successfully deleted ${objectsToDelete.length} files.`);
            } catch (e) {
                console.error('[Cleanup] Error deleting objects:', e);
            }
        } else {
            console.log('[Cleanup] No unknown snapshots found.');
        }
    });
}

cleanupUnknowns();
