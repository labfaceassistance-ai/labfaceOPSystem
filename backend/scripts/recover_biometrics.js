const pool = require('../config/db');
const { minioClient, PROFILE_BUCKET } = require('../utils/minioHelper');
const axios = require('axios');
const FormData = require('form-data');
const stream = require('stream');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

async function recoverBiometrics() {
    console.log('=== Starting Biometric Data Recovery ===');
    console.log(`AI Service URL: ${AI_SERVICE_URL}`);

    try {
        // 1. Find face photos missing embeddings
        const [brokenPhotos] = await pool.query(
            "SELECT id, user_id, angle, photo_url FROM face_photos WHERE embedding IS NULL AND deleted_at IS NULL"
        );

        console.log(`Found ${brokenPhotos.length} photos missing embeddings.`);

        let repairCount = 0;
        let errorCount = 0;

        for (const photo of brokenPhotos) {
            try {
                console.log(`[Photo ${photo.id}] Processing for User ${photo.user_id} (${photo.angle})...`);

                // Parse MinIO URL (format: /api/minio/labface-profiles/userId/face-angle.jpg?v=...)
                let cleanUrl = photo.photo_url.split('?')[0];
                if (cleanUrl.startsWith('/api/minio/')) {
                    cleanUrl = cleanUrl.substring(11); // Remove prefix
                }

                const parts = cleanUrl.split('/');
                if (parts.length < 2) {
                    console.warn(`[Photo ${photo.id}] Invalid URL format: ${photo.photo_url}`);
                    continue;
                }

                const bucket = parts[0];
                const objectName = parts.slice(1).join('/');

                // Fetch from MinIO
                const dataStream = await minioClient.getObject(bucket, objectName);
                
                // Convert stream to Buffer
                const chunks = [];
                for await (const chunk of dataStream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                // Send to AI Service
                const form = new FormData();
                form.append('file', buffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

                const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/generate-embedding`, form, {
                    headers: { ...form.getHeaders() },
                    timeout: 10000
                });

                if (aiResponse.data.embedding) {
                    const embeddingJson = JSON.stringify([aiResponse.data.embedding]); // Wrap in array to match new ensemble format
                    
                    await pool.query(
                        "UPDATE face_photos SET embedding = ? WHERE id = ?",
                        [embeddingJson, photo.id]
                    );
                    
                    console.log(`[Photo ${photo.id}] ✅ Successfully generated and saved embedding.`);
                    repairCount++;
                } else {
                    console.warn(`[Photo ${photo.id}] ❌ AI service returned no embedding.`);
                    errorCount++;
                }

            } catch (err) {
                console.error(`[Photo ${photo.id}] ❌ Error:`, err.response?.data?.error || err.message);
                errorCount++;
            }
        }

        console.log(`\nMaintenance Complete: ${repairCount} photos repaired, ${errorCount} failed.`);

        // 2. Sync to Users Table
        console.log('\n=== Syncing embeddings to users table ===');
        
        // Sync 'front' angle (the primary angle) to users.face_embeddings
        const [syncRes] = await pool.query(`
            UPDATE users u
            JOIN face_photos fp ON u.id = fp.user_id
            SET u.face_embeddings = fp.embedding
            WHERE fp.angle = 'front' 
            AND fp.embedding IS NOT NULL
            AND fp.deleted_at IS NULL
            AND (u.face_embeddings IS NULL OR u.face_embeddings != fp.embedding)
        `);

        console.log(`Synced face_embeddings for ${syncRes.affectedRows} users.`);

        console.log('\n=== Recovery Process Finished ===');

    } catch (error) {
        console.error('Critical Error during recovery:', error);
    } finally {
        process.exit();
    }
}

recoverBiometrics();
