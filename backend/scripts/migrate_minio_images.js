const mysql = require('mysql2/promise');
const Minio = require('minio');
require('dotenv').config({ path: '../.env.prod' }); // Try loading from parent dir if running from scripts/

// Configuration
const DB_CONFIG = {
    host: process.env.DB_HOST || 'mariadb',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'labface'
};

const MINIO_CONFIG = {
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
};

const PROFILE_BUCKET = 'labface-profiles';

console.log('Migration Config:', {
    dbHost: DB_CONFIG.host,
    minioHost: MINIO_CONFIG.endPoint,
    minioPort: MINIO_CONFIG.port
});

async function migrate() {
    let connection;
    let minioClient;

    try {
        // 1. Initialize Connections
        console.log('Connecting to Database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected to Database.');

        console.log('Connecting to MinIO...');
        minioClient = new Minio.Client(MINIO_CONFIG);
        console.log('Connected to MinIO.');

        // 2. Migrate User Profile Pictures
        console.log('\n--- Migrating User Profile Pictures ---');
        const [users] = await connection.execute(
            "SELECT id, user_id, profile_picture FROM users WHERE profile_picture IS NOT NULL AND profile_picture LIKE '%/minio/%'"
        );

        for (const user of users) {
            await processImage(minioClient, connection, 'users', user.id, user.user_id, user.profile_picture, 'profile');
        }

        // 3. Migrate Face Photos
        console.log('\n--- Migrating Face Photos ---');
        const [photos] = await connection.execute(
            "SELECT id, user_id, photo_url, angle FROM face_photos WHERE photo_url IS NOT NULL AND photo_url LIKE '%/minio/%'"
        );

        for (const photo of photos) {
            // Retrieve user_id string from users table if needed, but face_photos has user_id as INT (foreign key)
            // Wait, standard schema has user_id as INT in face_photos referencing users.id. 
            // We need the string user_id (Student Number) for the folder name.

            const [userRows] = await connection.execute('SELECT user_id FROM users WHERE id = ?', [photo.user_id]);
            if (userRows.length === 0) {
                console.warn(`Skipping photo ${photo.id}: User ${photo.user_id} not found.`);
                continue;
            }
            const studentNumber = userRows[0].user_id;

            // Determine type/angle
            let type = `face-${photo.angle || 'unknown'}`;
            // Handle center/front explicitly if needed, or just use angle

            await processImage(minioClient, connection, 'face_photos', photo.id, studentNumber, photo.photo_url, type);
        }

        console.log('\nMigration Completed Successfully.');

    } catch (error) {
        console.error('Migration Failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

async function processImage(minioClient, connection, tableName, recordId, studentId, oldUrl, type) {
    try {
        // Parse Old URL
        // Example: /minio/labface-profiles/2022-00330-LQ-0/profile-2022-00330-LQ-0-1739502392476.png
        // or absolute: https://labface.site/minio/labface-profiles/...

        let pathPart = oldUrl;
        if (oldUrl.startsWith('http')) {
            try {
                const urlObj = new URL(oldUrl);
                pathPart = urlObj.pathname; // /minio/labface-profiles/...
            } catch (e) {
                console.warn(`Invalid URL format: ${oldUrl}`);
                return;
            }
        }

        const parts = pathPart.split('/');
        // Expecting: ['', 'minio', 'bucket', '...']
        const bucketIndex = parts.indexOf(PROFILE_BUCKET);
        if (bucketIndex === -1) {
            console.warn(`Skipping ${oldUrl}: Not in ${PROFILE_BUCKET}`);
            return;
        }

        const objectName = parts.slice(bucketIndex + 1).join('/'); // 2022-00330-LQ-0/profile-....png

        // Check if already migrated (simple check: filename is type.ext)
        const filename = parts[parts.length - 1];
        if (filename.match(new RegExp(`^${type}\\.[a-zA-Z0-9]+$`))) {
            console.log(`Skipping ${studentId}: Already in new format.`);
            return;
        }

        console.log(`Processing: ${objectName} -> ${studentId}/${type}...`);

        // Download
        let dataStream;
        try {
            dataStream = await minioClient.getObject(PROFILE_BUCKET, objectName);
        } catch (err) {
            console.error(`Failed to download ${objectName}: ${err.message}`);
            return;
        }

        // Stream to Buffer
        const buffers = [];
        for await (const chunk of dataStream) {
            buffers.push(chunk);
        }
        const buffer = Buffer.concat(buffers);

        // Determine Extension
        const ext = filename.split('.').pop();
        const newObjectName = `${studentId}/${type}.${ext}`;

        // Upload New
        await minioClient.putObject(PROFILE_BUCKET, newObjectName, buffer);

        // Update DB
        const newUrl = `/minio/${PROFILE_BUCKET}/${newObjectName}?v=${Date.now()}`;
        const updateQuery = tableName === 'users'
            ? "UPDATE users SET profile_picture = ? WHERE id = ?"
            : "UPDATE face_photos SET photo_url = ? WHERE id = ?";

        await connection.execute(updateQuery, [newUrl, recordId]);

        // Delete Old
        // Be careful not to delete if old == new (though we checked that above)
        if (objectName !== newObjectName) {
            await minioClient.removeObject(PROFILE_BUCKET, objectName);
            console.log(`  Moved to ${newObjectName}`);
        }

    } catch (error) {
        console.error(`  Error processing ${studentId} (${type}):`, error.message);
    }
}

migrate();
