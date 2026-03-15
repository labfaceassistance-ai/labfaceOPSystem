const mysql = require('mysql2/promise');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../../.env.prod' });

// Configuration
const DB_CONFIG = {
    host: process.env.DB_HOST || 'mariadb',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'labface',
    port: parseInt(process.env.DB_PORT || '3306')
};

const MINIO_CONFIG = {
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
};

const PROFILE_BUCKET = 'labface-profiles';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'profiles');

console.log('Migration Config:', {
    dbHost: DB_CONFIG.host,
    minioHost: MINIO_CONFIG.endPoint,
    uploadsDir: UPLOADS_DIR
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

        // Ensure bucket exists
        const exists = await minioClient.bucketExists(PROFILE_BUCKET);
        if (!exists) {
            await minioClient.makeBucket(PROFILE_BUCKET, 'us-east-1');
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
        }

        // 2. Process directories in uploads/profiles/
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.log('No local uploads directory found. Nothing to migrate.');
            return;
        }

        const userDirs = fs.readdirSync(UPLOADS_DIR);
        for (const userId of userDirs) {
            const userDirPath = path.join(UPLOADS_DIR, userId);
            if (!fs.statSync(userDirPath).isDirectory()) continue;

            // Get the user_id (Student Number) from DB for this primary key ID
            const [userRows] = await connection.execute('SELECT user_id FROM users WHERE id = ?', [userId]);
            if (userRows.length === 0) {
                console.log(`Skipping directory ${userId}: User not found in database.`);
                continue;
            }
            const studentNumber = userRows[0].user_id;
            console.log(`Processing User ID ${userId} (Student Number: ${studentNumber})...`);

            const files = fs.readdirSync(userDirPath);
            for (const file of files) {
                const filePath = path.join(userDirPath, file);
                const fileExt = path.extname(file).toLowerCase();
                const fileName = path.basename(file, fileExt);

                // Check matches in DB
                const [profileMatches] = await connection.execute(
                    'SELECT id FROM users WHERE id = ? AND profile_picture LIKE ?',
                    [userId, `%${file}%`]
                );

                const [photoMatches] = await connection.execute(
                    'SELECT id, angle FROM face_photos WHERE user_id = ? AND photo_url LIKE ?',
                    [userId, `%${file}%`]
                );

                if (profileMatches.length === 0 && photoMatches.length === 0) {
                    console.log(`  File ${file} is not linked in DB. Skipping.`);
                    continue;
                }

                const buffer = fs.readFileSync(filePath);

                if (profileMatches.length > 0) {
                    const newObjectName = `${studentNumber}/profile${fileExt}`;
                    await minioClient.putObject(PROFILE_BUCKET, newObjectName, buffer, buffer.length, {
                        'Content-Type': file.endsWith('.png') ? 'image/png' : 'image/jpeg'
                    });
                    const newUrl = `/minio/${PROFILE_BUCKET}/${newObjectName}?v=${Date.now()}`;
                    await connection.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [newUrl, userId]);
                    console.log(`  Migrated Profile: ${file} -> ${newObjectName}`);
                }

                if (photoMatches.length > 0) {
                    for (const photo of photoMatches) {
                        const angle = photo.angle.toLowerCase();
                        const newObjectName = `${studentNumber}/face-${angle}${fileExt}`;
                        await minioClient.putObject(PROFILE_BUCKET, newObjectName, buffer, buffer.length, {
                            'Content-Type': file.endsWith('.png') ? 'image/png' : 'image/jpeg'
                        });
                        const newUrl = `/minio/${PROFILE_BUCKET}/${newObjectName}?v=${Date.now()}`;
                        await connection.execute('UPDATE face_photos SET photo_url = ? WHERE id = ?', [newUrl, photo.id]);
                        console.log(`  Migrated Face Photo (${angle}): ${file} -> ${newObjectName}`);
                    }
                }
            }
        }

        console.log('\nMigration Completed Successfully.');

    } catch (error) {
        console.error('Migration Failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
