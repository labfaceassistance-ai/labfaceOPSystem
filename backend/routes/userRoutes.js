const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { uploadBase64ToMinio, deleteFromMinio, PROFILE_BUCKET, standardizeImageUrl, SNAPSHOT_BUCKET } = require('../utils/minioHelper');

// Configure Multer (Memory Storage for MinIO)
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Ensure columns exist
const ensureColumns = async () => {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM users");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('profile_picture')) {
            await pool.query("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)");
            console.log("Added profile_picture column");
        }
        if (!columnNames.includes('course')) {
            await pool.query("ALTER TABLE users ADD COLUMN course VARCHAR(100)");
            console.log("Added course column");
        }
        if (!columnNames.includes('year_level')) {
            await pool.query("ALTER TABLE users ADD COLUMN year_level VARCHAR(20)");
            console.log("Added year_level column");
        }
    } catch (err) {
        console.error("Error checking columns:", err);
    }
};
ensureColumns();

// Middleware to verify JWT (simplified for now)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });
    // In real app, verify with jwt.verify
    next();
};

// Get Profile
router.get('/profile/:id', async (req, res) => {
    try {
        // Join with students and courses tables for student data
        const [users] = await pool.query(`
            SELECT 
                u.id, u.user_id, u.first_name, u.middle_name, u.last_name, u.email, u.role, 
                u.profile_picture,
                s.year_level,
                s.section,
                c.code as course,
                c.name as course_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE u.id = ?
        `, [req.params.id]);

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        const role = user.role ? user.role.toLowerCase() : '';

        res.json({
            id: user.id,
            userId: user.user_id,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role,
            course: user.course,
            courseName: user.course_name,
            yearLevel: user.year_level,
            section: user.section,
            profilePicture: standardizeImageUrl(user.profile_picture),
            studentId: role.includes('student') ? user.user_id : undefined,
            professorId: role.includes('professor') ? user.user_id : undefined,
            schoolId: user.user_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile
router.put('/profile/:id', async (req, res) => {
    const { firstName, lastName, email, course, yearLevel, section } = req.body;
    console.log(`Updating profile for user ${req.params.id}:`, req.body);

    try {
        // Update users table
        await pool.query(
            'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
            [firstName || null, lastName || null, email || null, req.params.id]
        );

        // Update students table if course, yearLevel, or section provided
        if (course || yearLevel || section) {
            // Check if user is a student
            // Check if user is a student (Multi-role support)
            const [roleCheck] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
            const role = roleCheck.length > 0 ? (roleCheck[0].role || "").toLowerCase() : '';
            if (role.includes('student')) {
                // Get course_id if course is provided
                let courseId = null;
                if (course) {
                    const [courses] = await pool.query('SELECT id FROM courses WHERE code = ?', [course]);
                    if (courses.length > 0) {
                        courseId = courses[0].id;
                    }
                }

                // Update or insert into students table
                const [existing] = await pool.query('SELECT * FROM students WHERE user_id = ?', [req.params.id]);
                if (existing.length > 0) {
                    // Update existing record
                    const updates = [];
                    const values = [];
                    if (courseId) {
                        updates.push('course_id = ?');
                        values.push(courseId);
                    }
                    if (yearLevel) {
                        updates.push('year_level = ?');
                        values.push(yearLevel);
                    }
                    if (section) {
                        updates.push('section = ?');
                        values.push(section);
                    }
                    if (updates.length > 0) {
                        values.push(req.params.id);
                        await pool.query(`UPDATE students SET ${updates.join(', ')} WHERE user_id = ?`, values);
                    }
                } else if (courseId && (yearLevel || section)) {
                    // Insert new record
                    await pool.query(
                        'INSERT INTO students (user_id, course_id, year_level, section) VALUES (?, ?, ?, ?)',
                        [req.params.id, courseId, yearLevel, section]
                    );
                }
            }
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Upload Profile Picture (Converted to MinIO)
router.post('/profile/:id/upload-photo', memoryUpload.single('profilePicture'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        // Get user_id string for MinIO path
        const [users] = await pool.query('SELECT user_id FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const studentNumber = users[0].user_id;

        // Convert buffer to base64 for MinIO helper
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Delete old profile picture if it exists
        if (users[0].profile_picture) {
            await deleteFromMinio(users[0].profile_picture).catch(e => console.error('Failed to delete old profile pic:', e));
        }

        // Upload to MinIO
        const profilePictureUrl = await uploadBase64ToMinio(base64Image, studentNumber, 'profile');

        await pool.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePictureUrl, req.params.id]);
        res.json({ message: 'Profile picture uploaded successfully', profilePicture: standardizeImageUrl(profilePictureUrl) });
    } catch (err) {
        console.error("Upload Photo Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Face Enrollment Photos
router.get('/profile/:id/face-photos', async (req, res) => {
    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS face_photos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                angle VARCHAR(20) NOT NULL,
                photo_url VARCHAR(255) NOT NULL,
                embedding JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Check for columns dynamically
        let hasDeletedAt = false;
        try {
            const [columns] = await pool.query("SHOW COLUMNS FROM face_photos");
            const columnNames = columns.map(c => c.Field);

            if (!columnNames.includes('deleted_at')) {
                // Try adding it
                try {
                    await pool.query("ALTER TABLE face_photos ADD COLUMN deleted_at TIMESTAMP NULL");
                    hasDeletedAt = true;
                } catch (alterErr) {
                    console.error("Failed to add deleted_at column:", alterErr.message);
                }
            } else {
                hasDeletedAt = true;
            }

            if (!columnNames.includes('embedding')) {
                try {
                    await pool.query("ALTER TABLE face_photos ADD COLUMN embedding JSON");
                } catch (alterErr) {
                    console.error("Failed to add embedding column:", alterErr.message);
                }
            }
        } catch (err) {
            console.error("Error checking columns:", err);
            // If checking columns fails, assume basic schema
        }

        // Construct query based on schema capability
        let query = 'SELECT * FROM face_photos WHERE user_id = ?';
        if (hasDeletedAt) {
            query += ' AND deleted_at IS NULL';
        }

        const [photos] = await pool.query(query, [req.params.id]);
        const standardizedPhotos = photos.map(p => ({
            ...p,
            photo_url: standardizeImageUrl(p.photo_url)
        }));
        res.json(standardizedPhotos);
    } catch (err) {
        console.error("Get Face Photos Error:", err);
        // Fallback: If error is strictly about missing column "deleted_at" and we messed up flag
        if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('deleted_at')) {
            try {
                const [photos] = await pool.query('SELECT * FROM face_photos WHERE user_id = ?', [req.params.id]);
                return res.json(photos);
            } catch (retryErr) {
                return res.status(500).json({ error: retryErr.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
});

// Soft Delete Face Photo
router.delete('/profile/:id/face-photos/:photoId', async (req, res) => {
    try {
        await pool.query(
            'UPDATE face_photos SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
            [req.params.photoId, req.params.id]
        );
        res.json({ message: 'Photo deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restore Face Photo
router.post('/profile/:id/face-photos/:photoId/restore', async (req, res) => {
    try {
        await pool.query(
            'UPDATE face_photos SET deleted_at = NULL WHERE id = ? AND user_id = ?',
            [req.params.photoId, req.params.id]
        );
        res.json({ message: 'Photo restored' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload Face Enrollment Photo (Converted to MinIO)
router.post('/profile/:id/upload-face-photo', memoryUpload.single('facePhoto'), async (req, res) => {
    const { angle, skipTraining } = req.body;
    console.log(`[DEBUG] Face Upload Request (MinIO) - User: ${req.params.id}, Angle: ${angle}, File:`, {
        filename: req.file?.originalname,
        size: req.file?.size,
        mimetype: req.file?.mimetype
    });

    if (!req.file || !angle) {
        return res.status(400).json({ message: 'File and angle are required' });
    }

    try {
        // Get user_id string for MinIO path
        const [users] = await pool.query('SELECT user_id FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        const studentNumber = users[0].user_id;

        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Only validate face if NOT in batch edit mode (skipTraining)
        if (!skipTraining || skipTraining === 'false') {
            // Validate that the image contains a face
            const { validateFaceInImage } = require('../utils/faceValidation');
            const validation = await validateFaceInImage(base64Image);

            if (!validation.valid) {
                return res.status(400).json({
                    message: validation.error || 'No face detected in the uploaded image'
                });
            }
        }

        // Upload to MinIO
        const photoUrl = await uploadBase64ToMinio(base64Image, studentNumber, `face-${angle.toLowerCase()}`);

        // 1. Generate Embedding IMMEDIATELY
        let embeddingJson = null;
        const normalizedAngle = angle.toLowerCase();
        const shouldSkipTraining = skipTraining === 'true' || skipTraining === true;

        if (!shouldSkipTraining) {
            try {
                // Use the buffer directly for embedding generation
                let fileBuffer = req.file.buffer;

                // ENHANCEMENT: Improve image quality before generating embedding
                try {
                    console.log(`Enhancing image quality for ${angle} photo...`);
                    const enhanceForm = new FormData();
                    enhanceForm.append('file', fileBuffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

                    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
                    const enhanceResponse = await axios.post(`${aiServiceUrl}/api/enhance-image`, enhanceForm, {
                        headers: { ...enhanceForm.getHeaders() },
                        responseType: 'arraybuffer'
                    });

                    // Use enhanced image for embedding
                    fileBuffer = Buffer.from(enhanceResponse.data);
                    console.log(`Image enhanced for ${angle}.`);
                } catch (enhanceErr) {
                    console.warn(`Enhancement failed for ${angle}, using original: ${enhanceErr.message}`);
                }

                const form = new FormData();
                form.append('file', fileBuffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

                // ENSEMBLE EMBEDDINGS: Generate 5 embeddings from augmented images
                console.log(`Generating ensemble embeddings for ${angle} photo (MinIO)...`);
                const aiResponse = await axios.post(`${aiServiceUrl}/api/generate-ensemble-embeddings`, form, {
                    headers: { ...form.getHeaders() }
                });

                if (aiResponse.data.embeddings && aiResponse.data.embeddings.length > 0) {
                    embeddingJson = JSON.stringify(aiResponse.data.embeddings);
                    console.log(`Generated ${aiResponse.data.count} ensemble embeddings for ${angle}.`);
                } else {
                    console.warn(`No embeddings generated for ${angle}, falling back to single embedding`);
                    const singleResponse = await axios.post(`${aiServiceUrl}/api/generate-embedding`, form, {
                        headers: { ...form.getHeaders() }
                    });
                    if (singleResponse.data.embedding) {
                        embeddingJson = JSON.stringify([singleResponse.data.embedding]);
                    }
                }
            } catch (aiError) {
                console.error('Failed to generate embedding during upload:', aiError.message);
            }
        }

        // 2. Save to face_photos (WITH EMBEDDING)
        const [existing] = await pool.query('SELECT * FROM face_photos WHERE user_id = ? AND angle = ?', [req.params.id, angle]);

        if (existing.length > 0) {
            // Delete old face photo from MinIO
            if (existing[0].photo_url) {
                await deleteFromMinio(existing[0].photo_url).catch(e => console.error('Failed to delete old face photo:', e));
            }

            await pool.query(
                'UPDATE face_photos SET photo_url = ?, embedding = ?, deleted_at = NULL WHERE id = ?',
                [photoUrl, embeddingJson, existing[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO face_photos (user_id, angle, photo_url, embedding) VALUES (?, ?, ?, ?)',
                [req.params.id, angle, photoUrl, embeddingJson]
            );
        }

        // 3. Update Main User Embedding (Legacy/Fallback) if Front/Center
        if ((normalizedAngle === 'front') && embeddingJson) {
            await pool.query(
                'UPDATE users SET face_embeddings = ? WHERE id = ?',
                [embeddingJson, req.params.id]
            );
        }

        res.json({ message: 'Face photo uploaded and processed to MinIO', photoUrl });
    } catch (err) {
        console.error("Upload Face Photo Error:", err);
        res.status(500).json({ error: err.message });
    }
});



// Endpoint to explicitly trigger model training (embedding generation)
// This now acts as a "Repair/Sync" function that processes ALL photos for the user
router.post('/profile/:id/train-model', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log(`Starting model training/verification for user ${userId}...`);

        // 1. Get ALL active photos for the user
        const [photos] = await pool.query(
            "SELECT * FROM face_photos WHERE user_id = ? AND deleted_at IS NULL",
            [userId]
        );

        if (photos.length === 0) {
            return res.status(400).json({ message: 'No face photos available to train.' });
        }

        let successCount = 0;
        let failCount = 0;
        let errors = [];

        // 2. Verify embeddings exist for photos (they are generated during upload-face-photo now)
        for (const photo of photos) {
            if (photo.embedding) {
                // Feature parity: Ensure the 'front' angle is synced to the users table
                const angle = photo.angle.toLowerCase();
                if (angle === 'front') {
                    await pool.query(
                        'UPDATE users SET face_embeddings = ? WHERE id = ?',
                        [JSON.stringify(photo.embedding), userId]
                    );
                }
                successCount++;
            } else {
                errors.push(`Photo ${photo.id} (${photo.angle}) is missing an embedding.`);
                failCount++;
            }
        }

        console.log(`Training/Verification complete. Success: ${successCount}, Failed: ${failCount}`);

        if (successCount === 0) {
            return res.status(500).json({
                message: 'No valid embeddings found. Please re-upload your face photos.',
                details: errors
            });
        }

        res.json({
            message: `Model trained successfully. Verified ${successCount} photos.`,
            stats: { success: successCount, failed: failCount },
            details: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Training error:", error);
        res.status(500).json({ message: error.message || 'Failed to train model' });
    }
});

// Get current academic settings (Accessible to all users)
router.get('/academic-settings', async (req, res) => {
    try {
        const [settings] = await pool.query(`
            SELECT 
                id,
                school_year as schoolYear,
                semester,
                effective_date as effectiveDate,
                is_active as isCurrent,
                start_date as startDate,
                end_date as endDate,
                created_at as updatedAt
            FROM academic_periods
            WHERE effective_date <= NOW()
            ORDER BY effective_date DESC
            LIMIT 1
        `);

        if (settings.length === 0) {
            return res.status(404).json({ message: 'No current academic settings found' });
        }

        res.json(settings[0]);
    } catch (error) {
        console.error('Error fetching academic settings:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
