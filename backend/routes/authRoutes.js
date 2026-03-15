const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

// Migration: Add last_verified_period_id to users table if not exists
const ensureUserSchema = async () => {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'last_verified_period_id'");
        if (columns.length === 0) {
            console.log('Migrating users table: Adding last_verified_period_id column...');
            await pool.query("ALTER TABLE users ADD COLUMN last_verified_period_id INT DEFAULT NULL");
            console.log('Migration successful: last_verified_period_id added.');
        }
    } catch (err) {
        console.error('Migration error (last_verified_period_id):', err);
    }
};
ensureUserSchema();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const { uploadBase64ToMinio, deleteFromMinio } = require('../utils/minioHelper');
const axios = require('axios');
const FormData = require('form-data');

// Helper to save base64 image to MinIO
const saveBase64Image = async (base64Data, userId, type) => {
    try {
        return await uploadBase64ToMinio(base64Data, userId, type);
    } catch (error) {
        console.error('Error uploading to MinIO:', error);
        return null;
    }
};

// DEBUG ENDPOINT: List all courses
router.get('/debug-courses', async (req, res) => {
    try {
        const [courses] = await pool.query('SELECT * FROM courses');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate Face Quality (New Endpoint)
router.post('/validate-face-quality', async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ valid: false, error: 'No image provided' });

    try {
        const { validateFaceInImage } = require('../utils/faceValidation');
        const validation = await validateFaceInImage(image);
        res.json(validation);
    } catch (error) {
        console.error('Face validation error:', error);
        res.status(500).json({ valid: false, error: 'Server error during validation' });
    }
});

// Register Student
router.post('/register/student', async (req, res) => {
    let { studentId, firstName, middleName, lastName, email, password, course, yearLevel, section, facePhotos, profilePicture, certificateOfRegistration } = req.body;

    // Sanitize Middle Name
    if (middleName) {
        const lower = middleName.toLowerCase().replace(/[\s\.]/g, '');
        if (['na', 'n/a', 'none', '-', 'null'].includes(lower)) {
            middleName = '';
        }
    }

    let connection;
    try {
        // Block fraud Student IDs
        if (studentId.startsWith('0000-00000')) {
            return res.status(400).json({
                message: 'Invalid Student ID. Cannot use dummy ID starting with 0000-00000.'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if user exists by user_id
        const [existingById] = await connection.query('SELECT * FROM users WHERE user_id = ?', [studentId]);

        // Check if email is already used by a DIFFERENT user
        const [existingByEmail] = await connection.query('SELECT * FROM users WHERE email = ? AND user_id != ?', [email, studentId]);

        let targetUser = null;

        if (existingByEmail.length > 0) {
            // Email exists on another account.
            const matchedUser = existingByEmail[0];
            const matchedRoles = matchedUser.role ? matchedUser.role.split(',').map(r => r.trim()) : [];

            // If existing user is Admin or Professor (and not already Student), allow merging
            // If they are already a student with a DIFFERENT ID, that's a problem (duplicate student account).
            if (matchedRoles.includes('student')) {
                await connection.rollback();
                return res.status(400).json({ message: 'Email already registered to another Student account.' });
            }

            // Target for merge is the user found by email
            targetUser = matchedUser;
        } else if (existingById.length > 0) {
            targetUser = existingById[0];
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Verify Certificate of Registration if provided
        let corPath = null;
        let extractedSection = null;

        if (certificateOfRegistration) {
            const verificationService = require('../services/verificationService');

            // Verify COR using OCR
            const corVerification = await verificationService.verifyStudentDocuments(
                { studentId, firstName, middleName, lastName, course, yearLevel },
                certificateOfRegistration
            );

            if (!corVerification.valid) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Certificate of Registration verification failed',
                    reason: corVerification.reason,
                    details: corVerification.details
                });
            }

            // Extract section from COR if not provided
            if (!section && corVerification.details.extractedSection) {
                extractedSection = corVerification.details.extractedSection;
            }

            // Save COR image
            try {
                corPath = await saveBase64Image(certificateOfRegistration, studentId, 'cor');
            } catch (error) {
                console.error('Error saving COR:', error);
                await connection.rollback();
                return res.status(500).json({ message: 'Failed to save COR image' });
            }
        }

        // Save profile picture if provided
        let profilePicPath = null;
        if (profilePicture) {
            try {
                // Delete old profile picture if merging/updating
                if (targetUser && targetUser.profile_picture) {
                    await deleteFromMinio(targetUser.profile_picture).catch(e => console.error('Delete old profile pic error:', e));
                }
                profilePicPath = await saveBase64Image(profilePicture, studentId, 'profile');
            } catch (error) {
                console.error('Error saving profile picture:', error);
                await connection.rollback();
                return res.status(500).json({ message: 'Failed to save profile picture' });
            }
        }

        let userId;

        if (targetUser) {
            // User exists (by ID or Email) - add student role and password
            const existingUser = targetUser;
            userId = existingUser.id;

            // Check if we are merging into an account with a DIFFERENT user_id (e.g. Admin 'admin' becomes Student '2023-01')
            if (existingUser.user_id !== studentId) {
                console.log(`Merging user ${existingUser.user_id} into new Student ID ${studentId}`);
                // Update user_id to the new Student ID so enrollments work
                await connection.query('UPDATE users SET user_id = ? WHERE id = ?', [studentId, userId]);
            }

            // Check if already has student role (double check in case logic flows here)
            const roles = existingUser.role ? existingUser.role.split(',').map(r => r.trim()) : [];
            if (roles.includes('student')) {
                // Check approval status
                if (existingUser.approval_status === 'approved') {
                    await connection.rollback();
                    return res.status(400).json({
                        message: 'User already registered as student',
                        canReport: false
                    });
                } else if (existingUser.approval_status === 'pending') {
                    await connection.rollback();
                    return res.status(400).json({
                        message: 'Your student registration is pending admin approval. Please wait or contact support.',
                        canReport: true  // Allow reporting if they didn't register
                    });
                } else if (existingUser.approval_status === 'rejected') {
                    // Allow re-registration for rejected users
                    await connection.query(
                        'UPDATE users SET student_password_hash = ?, profile_picture = ?, approval_status = ?, updated_at = NOW() WHERE id = ?',
                        [hashedPassword, profilePicPath || existingUser.profile_picture, 'pending', userId]
                    );

                    // Create notification
                    await connection.query(
                        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
                        [userId, 'Registration Resubmitted', 'Your student registration has been resubmitted for admin approval.']
                    );

                    await connection.commit();
                    return res.status(200).json({
                        message: 'Your registration has been resubmitted for approval'
                    });
                }
            }

            // Warn if Professor tries to be Student? (Admin can be both)
            // Allow it if they are Admin. If they are Professor only, warn?
            // User prompt: "multi role same to professor i have admin but i cant register as professor"
            // And "im admin and i cant register as a student"
            // So Admin needs to be able to add Student/Professor roles.
            // We won't block existing roles.

            // Add student role
            const newRoles = [...new Set([...roles, 'student'])].join(','); // Use Set to avoid duplicates

            // Update existing user with student password and role
            await connection.query(
                'UPDATE users SET student_password_hash = ?, role = ?, certificate_of_registration = ?, approval_status = ? WHERE id = ?',
                [hashedPassword, newRoles, corPath || existingUser.certificate_of_registration, 'approved', userId] // Auto-approve if merging? Or keep existing status? Let's say approved for Student part if Admin?
                // Actually, strict 'approved' might be risky. But let's assume if they have account they are trusted OR they need approval.
                // Reverting to 'approved' based on original code for new students.
            );

            // Update profile picture if provided
            if (profilePicPath) {
                await connection.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicPath, userId]);
            }
        } else {
            // New user - create account
            const [result] = await connection.query(
                'INSERT INTO users (user_id, first_name, middle_name, last_name, email, password_hash, student_password_hash, role, profile_picture, certificate_of_registration, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [studentId, firstName, middleName, lastName, email, hashedPassword, hashedPassword, 'student', profilePicPath, corPath, 'approved']
            );
            userId = result.insertId;
        }


        // Improved course search: Case insensitive and loose matching
        let debugLog = `[${new Date().toISOString()}] Searching for course: "${course}"\n`;

        // 1. Exact match (Code or Name)
        let [courses] = await connection.query('SELECT id FROM courses WHERE code = ? OR name = ?', [course, course]);
        debugLog += `Exact match results: ${courses.length}\n`;

        if (courses.length === 0) {
            // 2. Case-insensitive and Trimmed match
            [courses] = await connection.query('SELECT id FROM courses WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) OR TRIM(LOWER(code)) = TRIM(LOWER(?))', [course, course]);
            debugLog += `Case-insensitive match results: ${courses.length}\n`;
        }

        if (courses.length === 0) {
            // 3. Loose matching with LIKE
            [courses] = await connection.query('SELECT id FROM courses WHERE name LIKE ? OR code LIKE ?', [`%${course}%`, `%${course}%`]);
            debugLog += `Loose match results: ${courses.length}\n`;
        }

        // 4. Dynamic Auto-Creation (The "Just Work" Logic)
        if (courses.length === 0) {
            debugLog += `Course not found. Dynamically creating: "${course}"\n`;

            // Generate a code (Acronym or first 5 chars)
            const courseAcronyms = {
                'Bachelor of Science in Information Technology': 'BSIT',
                'Bachelor of Science in Office Administration': 'BSOA',
                'Diploma in Information Technology': 'DIT'
            };

            let code = courseAcronyms[course];
            if (!code) {
                // Fallback: Generate acronym from words
                code = course.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase();
                if (code.length < 2) code = course.substring(0, 5).toUpperCase();
            }

            try {
                // Try to insert
                const [insertRes] = await connection.query('INSERT INTO courses (code, name) VALUES (?, ?)', [code, course]);
                courseId = insertRes.insertId;
                debugLog += `Successfully auto-created course "${course}" with ID: ${courseId}\n`;
            } catch (insErr) {
                // If code already exists (UNIQUE constraint), just fetch that ID
                if (insErr.code === 'ER_DUP_ENTRY') {
                    const [existing] = await connection.query('SELECT id FROM courses WHERE code = ?', [code]);
                    if (existing.length > 0) {
                        courseId = existing[0].id;
                        debugLog += `Course code "${code}" already exists. Linked to ID: ${courseId}\n`;
                    } else {
                        throw insErr;
                    }
                } else {
                    throw insErr;
                }
            }
        } else {
            courseId = courses[0].id; // Pick first match
        }

        // Save debug log to file
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(__dirname, '../uploads', 'registration_debug.log');
            fs.appendFileSync(logPath, debugLog + '-------------------\n');
        } catch (logErr) {
            console.error('Failed to write debug log:', logErr);
        }

        // Check if student record already exists
        const [existingStudent] = await connection.query('SELECT * FROM students WHERE user_id = ?', [userId]);
        const finalSection = section || extractedSection;

        if (existingStudent.length === 0) {
            // Insert into students table
            await connection.query(
                'INSERT INTO students (user_id, course_id, year_level, section) VALUES (?, ?, ?, ?)',
                [userId, courseId, yearLevel, finalSection]
            );
        } else {
            // Update existing student record
            await connection.query(
                'UPDATE students SET course_id = ?, year_level = ?, section = ? WHERE user_id = ?',
                [courseId, yearLevel, finalSection, userId]
            );
        }

        // AUTO-LINK ENROLLMENTS: connect existing class enrollments to this new user (late registration)
        await connection.query(
            'UPDATE enrollments SET student_id = ? WHERE student_number = ? AND student_id IS NULL',
            [userId, studentId]
        );

        // Save face photos if provided
        if (facePhotos && typeof facePhotos === 'object') {
            // Validate that all face photos contain actual faces
            const { validateFacePhotos } = require('../utils/faceValidation');
            const validation = await validateFacePhotos(facePhotos);

            if (!validation.valid) {
                await connection.rollback();
                return res.status(400).json({
                    message: validation.error,
                    invalidAngles: validation.invalidAngles
                });
            }

            // Delete existing face photos from MinIO and database
            const [existingPhotos] = await connection.query('SELECT photo_url FROM face_photos WHERE user_id = ?', [userId]);
            for (const photo of existingPhotos) {
                if (photo.photo_url) {
                    await deleteFromMinio(photo.photo_url).catch(e => console.error('Delete old face photo error:', e));
                }
            }
            await connection.query('DELETE FROM face_photos WHERE user_id = ?', [userId]);

            // --- GENERATE EMBEDDINGS FOR ALL ANGLES ---
            for (const [angle, base64Data] of Object.entries(facePhotos)) {
                try {
                    // 1. Save Photo to MinIO/Local
                    const photoPath = await saveBase64Image(base64Data, studentId, `face-${angle}`);

                    // 2. Generate Embedding via AI Service
                    let embeddingJson = null;
                    if (base64Data) {
                        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                        const form = new FormData();
                        form.append('file', buffer, { filename: 'face.jpg', contentType: 'image/jpeg' });

                        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
                        try {
                            const aiResponse = await axios.post(`${aiServiceUrl}/api/generate-embedding`, form, {
                                headers: { ...form.getHeaders() }
                            });
                            if (aiResponse.data.embedding) {
                                embeddingJson = JSON.stringify(aiResponse.data.embedding);
                            }
                        } catch (aiErr) {
                            console.warn(`Embedding generation failed for ${angle}:`, aiErr.message);
                        }
                    }

                    // 3. Save to face_photos table (with embedding)
                    if (photoPath) {
                        await connection.query(
                            'INSERT INTO face_photos (user_id, photo_url, angle, embedding) VALUES (?, ?, ?, ?)',
                            [userId, photoPath, angle, embeddingJson]
                        );
                    }

                    // 4. Update Main User Embedding (Prefer Center, fallback to others)
                    if (angle === 'center' && embeddingJson) {
                        await connection.query(
                            'UPDATE users SET facenet_embedding = ? WHERE id = ?',
                            [embeddingJson, userId]
                        );
                    }

                } catch (error) {
                    console.error(`Error processing face photo ${angle}:`, error);
                    await connection.rollback();
                    return res.status(500).json({ message: `Failed to save face photo for angle ${angle}` });
                }
            }
        }

        // Log verification for audit trail
        if (certificateOfRegistration) {
            const verificationService = require('../services/verificationService');
            // Note: logVerification often runs independently, but ideally should be part of transaction or run after commit. 
            // Since it uses its own connection usually, we can run it after commit, or ignore for now as it's audit log.
            // For safety, we keep it here but catching errors won't rollback main transaction if we wanted, but let's keep it strict.
            await verificationService.logVerification(
                userId,
                'cor',
                'pass',
                { studentId, firstName, lastName },
                0.9,
                'Auto-approved after COR verification'
            );
        }


        // Create Welcome Notification (only for new users)
        const [existingNotif] = await connection.query('SELECT * FROM notifications WHERE user_id = ? AND title = ?', [userId, 'Welcome to LabFace']);
        if (existingNotif.length === 0) {
            await connection.query(
                'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
                [userId, 'Welcome to LabFace', 'Your student account has been successfully created. Welcome to the platform!']
            );
        }

        await connection.commit();
        res.status(201).json({ message: existingById.length > 0 ? 'Student role added successfully' : 'Student registered successfully' });
    } catch (err) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Register Professor
router.post('/register/professor', async (req, res) => {
    let { professorId, firstName, middleName, lastName, email, password, idPhoto, consentGiven, consentVersion, consentText } = req.body;

    // Sanitize Middle Name
    if (middleName) {
        const lower = middleName.toLowerCase().replace(/[\s\.]/g, '');
        if (['na', 'n/a', 'none', '-', 'null'].includes(lower)) {
            middleName = '';
        }
    }
    try {
        // Block fraud Professor IDs
        if (professorId === '00000') {
            return res.status(400).json({
                message: 'Invalid Professor ID. Cannot be 00000.'
            });
        }

        // Check if user exists by user_id
        const [existingById] = await pool.query('SELECT * FROM users WHERE user_id = ?', [professorId]);

        // Check if email is already used by a DIFFERENT user
        const [existingByEmail] = await pool.query('SELECT * FROM users WHERE email = ? AND user_id != ?', [email, professorId]);

        let targetUser = null;

        if (existingByEmail.length > 0) {
            const matchedUser = existingByEmail[0];
            const matchedRoles = matchedUser.role ? matchedUser.role.split(',').map(r => r.trim()) : [];

            if (matchedRoles.includes('professor')) {
                return res.status(400).json({ message: 'Email already registered to another Professor account.' });
            }

            // Allow merge
            targetUser = matchedUser;
        } else if (existingById.length > 0) {
            targetUser = existingById[0];
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save ID photo if provided
        let idPhotoPath = null;
        if (idPhoto) {
            console.log(`[Register] Received ID photo for ${professorId}. Length: ${idPhoto.length}`);

            // Delete old ID photo if merging/updating
            if (targetUser && targetUser.id_photo) {
                await deleteFromMinio(targetUser.id_photo).catch(e => console.error('Delete old ID photo error:', e));
            }

            idPhotoPath = await saveBase64Image(idPhoto, professorId, 'id-photo');
            console.log(`[Register] ID photo saved to: ${idPhotoPath}`);
        } else {
            console.log(`[Register] No ID photo received for ${professorId}`);
        }

        let userId;

        if (targetUser) {
            // User exists - add professor role and password
            const existingUser = targetUser;
            userId = existingUser.id;

            // Update user_id if differing (e.g. Admin becoming Professor)
            if (existingUser.user_id !== professorId) {
                console.log(`Merging user ${existingUser.user_id} into new Professor ID ${professorId}`);
                await pool.query('UPDATE users SET user_id = ? WHERE id = ?', [professorId, userId]);
            }

            // Check if already has professor role
            const roles = existingUser.role ? existingUser.role.split(',').map(r => r.trim()) : [];
            if (roles.includes('professor')) {
                // Check approval status
                if (existingUser.approval_status === 'approved') {
                    return res.status(400).json({
                        message: 'User already registered as professor',
                        canReport: false
                    });
                } else if (existingUser.approval_status === 'pending') {
                    return res.status(400).json({
                        message: 'Your professor registration is pending admin approval. Please wait or contact support.',
                        canReport: true  // Allow reporting if they didn't register
                    });
                } else if (existingUser.approval_status === 'rejected') {
                    // Allow re-registration for rejected users
                    await pool.query(
                        'UPDATE users SET professor_password_hash = ?, id_photo = ?, approval_status = ?, updated_at = NOW() WHERE id = ?',
                        [hashedPassword, idPhotoPath || existingUser.id_photo, 'pending', userId]
                    );

                    // Create notification
                    await pool.query(
                        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
                        [userId, 'Registration Resubmitted', 'Your professor registration has been resubmitted for admin approval.']
                    );

                    return res.status(200).json({
                        message: 'Your registration has been resubmitted for approval'
                    });
                }
            }

            // Warn if Student tries to be Professor? (Admin can be both)
            // Allow if Admin. If Student, we allow logic to proceed (maybe they graduated/TA).

            // Add professor role
            const newRoles = [...new Set([...roles, 'professor'])].join(',');

            // Update existing user with professor password and role
            await pool.query(
                'UPDATE users SET professor_password_hash = ?, role = ?, id_photo = ? WHERE id = ?',
                [hashedPassword, newRoles, idPhotoPath || existingUser.id_photo, userId]
            );
        } else {
            // New user - create account
            console.log('DEBUG: Inserting Professor with password_hash');
            const [result] = await pool.query(
                'INSERT INTO users (user_id, first_name, middle_name, last_name, email, password_hash, professor_password_hash, role, approval_status, id_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [professorId, firstName, middleName, lastName, email, hashedPassword, hashedPassword, 'professor', 'pending', idPhotoPath]
            );
            userId = result.insertId;
        }

        // Record Biometric Consent
        if (consentGiven) {
            await pool.query(`
                INSERT INTO consent_records (
                    user_id,
                    consent_type,
                    consent_given,
                    consent_text,
                    consent_version,
                    ip_address,
                    user_agent,
                    timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                professorId,
                'registration',
                true,
                consentText || 'Biometric data collection',
                consentVersion || '1.0',
                req.ip,
                req.headers['user-agent'] || ''
            ]);

            // Update user consent status
            await pool.query(`
                UPDATE users 
                SET consent_status = 'given'
                WHERE user_id = ?
            `, [professorId]);
        }

        // Create Welcome Notification (only for new users)
        const [existingNotif] = await pool.query('SELECT * FROM notifications WHERE user_id = ? AND title LIKE ?', [userId, 'Welcome to LabFace%']);
        if (existingNotif.length === 0) {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
                [userId, 'Welcome to LabFace', 'Your professor account has been successfully created. Please wait for Admin approval.']
            );
        }

        // Send email notification to Admin (only for new professor registrations)
        if (existingById.length === 0) {
            const { sendLabHeadNotification } = require('../utils/emailService');
            try {
                await sendLabHeadNotification(firstName, lastName, email, professorId);
            } catch (emailError) {
                console.error('Failed to send Admin notification:', emailError);
                // Don't fail registration if email fails
            }
        }

        res.status(201).json({ message: existingById.length > 0 ? 'Professor role added successfully' : 'Professor registered successfully' });
    } catch (err) {
        console.error("Professor Registration Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Login
// Login (General: Student/Professor)
router.post('/login', async (req, res) => {
    const { userId, password } = req.body;
    console.log('Login attempt:', req.body);

    if (!userId || !password) {
        return res.status(400).json({ message: 'User ID and password are required' });
    }

    try {
        // Join with students and courses tables for student data
        const [users] = await pool.query(`
            SELECT 
                u.*,
                s.year_level,
                s.section,
                c.code as course,
                c.name as course_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE u.user_id = ?
        `, [userId]);
        const { intendedRole } = req.body; // New: Receive intended role from frontend
        console.log('User found:', users.length > 0 ? 'Yes' : 'No');

        if (users.length === 0) return res.status(400).json({ message: 'User ID not found' });


        const user = users[0];
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];

        let authenticatedRole = null;

        // Strict Check: Check Student or Professor Password ONLY
        // We do NOT check admin password here. Admin must use /admin/login.

        // 1. Prioritized Role Matching
        if (intendedRole) {
            if (!roles.includes(intendedRole)) {
                return res.status(403).json({ message: `Access denied. You do not have the ${intendedRole} role.` });
            }

            if (intendedRole === 'student' && user.student_password_hash) {
                const isMatch = await bcrypt.compare(password, user.student_password_hash);
                if (isMatch) authenticatedRole = 'student';
            } else if (intendedRole === 'professor' && user.professor_password_hash) {
                const isMatch = await bcrypt.compare(password, user.professor_password_hash);
                if (isMatch) authenticatedRole = 'professor';
            }
        } else {
            // Fallback (Legacy/Unknown source): Original sequential check
            if (roles.includes('student') && user.student_password_hash) {
                const isStudent = await bcrypt.compare(password, user.student_password_hash);
                if (isStudent) authenticatedRole = 'student';
            }

            if (!authenticatedRole && roles.includes('professor') && user.professor_password_hash) {
                const isProf = await bcrypt.compare(password, user.professor_password_hash);
                if (isProf) authenticatedRole = 'professor';
            }
        }

        if (!authenticatedRole) {
            return res.status(400).json({ message: 'Incorrect password' });
        }


        // Check approval status
        if (user.approval_status === 'pending') {
            return res.status(403).json({
                message: 'Your account is pending approval. Please wait for the Laboratory Head to review your registration.',
                status: 'pending'
            });
        }

        if (user.approval_status === 'rejected') {
            return res.status(403).json({
                message: 'Your account registration was rejected. Please contact the Laboratory Head for more information.',
                status: 'rejected'
            });
        }

        // Issue Scoped Token: Role is ONLY the one they logged in with
        const token = jwt.sign(
            { id: user.id, role: authenticatedRole, userId: user.user_id }, // STRICT SCOPE
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                userId: user.user_id,
                role: authenticatedRole, // Strict Role
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                course: user.course,
                courseName: user.course_name,
                yearLevel: user.year_level,
                section: user.section,

                studentId: authenticatedRole === 'student' ? user.user_id : undefined,
                professorId: authenticatedRole === 'professor' ? user.user_id : undefined,
                profilePicture: user.profile_picture
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get Current User from Token
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Join with students and courses tables for student data
        const [users] = await pool.query(`
            SELECT 
                u.*,
                s.year_level,
                s.section,
                c.code as course,
                c.name as course_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE u.id = ?
        `, [decoded.id]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            userId: user.user_id,
            role: decoded.role, // Use role from JWT (STRICT SCOPE)
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            email: user.email,
            course: user.course,
            courseName: user.course_name,
            yearLevel: user.year_level,
            section: user.section,
            studentId: decoded.role === 'student' ? user.user_id : undefined,
            professorId: decoded.role === 'professor' ? user.user_id : undefined,
            profilePicture: user.profile_picture,
            lastVerifiedPeriodId: user.last_verified_period_id // Return verification status
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Token expired' });
        }
        console.error('Get Current User Error:', err);
        res.status(500).json({ message: err.message });
    }
});


// Check Availability
router.get('/check-availability', async (req, res) => {
    const { field, value, registeringAs, userId } = req.query;
    console.log(`[DEBUG] check-availability called: field=${field}, value=${value}, registeringAs=${registeringAs}, userId=${userId}`);

    if (!field || !value) {
        console.log('[DEBUG] Missing field or value');
        return res.status(400).json({ message: 'Field and value required' });
    }

    // Block fraud/dummy IDs
    if (field === 'userId') {
        // Block fraud Professor IDs
        if (registeringAs === 'professor' && value === '00000') {
            console.log('[DEBUG] Blocked fraud Professor ID: 00000');
            return res.json({
                available: false,
                canProceed: false,
                message: 'Invalid Professor ID. Cannot be 00000.'
            });
        }

        // Block fraud Student IDs
        if (registeringAs === 'student' && value.startsWith('0000-00000')) {
            console.log('[DEBUG] Blocked fraud Student ID starting with 0000-00000');
            return res.json({
                available: false,
                canProceed: false,
                message: 'Invalid Student ID. Cannot use dummy ID starting with 0000-00000.'
            });
        }
    }

    try {
        let query = '';
        if (field === 'email') {
            query = 'SELECT user_id, role, approval_status FROM users WHERE email = ?';
        } else if (field === 'userId') {
            query = 'SELECT user_id, role, approval_status FROM users WHERE user_id = ?';
        } else {
            console.log('[DEBUG] Invalid field:', field);
            return res.status(400).json({ message: 'Invalid field' });
        }

        console.log(`[DEBUG] Executing query: ${query} with value: ${value}`);
        const [existing] = await pool.query(query, [value]);
        console.log(`[DEBUG] Query result count: ${existing.length}`);

        if (existing.length === 0) {
            // User doesn't exist - available
            console.log('[DEBUG] User does not exist, returning available=true');
            return res.json({
                available: true,
                canProceed: true
            });
        }

        const user = existing[0];
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];
        console.log(`[DEBUG] User found. Roles: ${roles.join(',')}`);

        // If checking email
        if (field === 'email') {
            // If userId is provided and email belongs to the same user, allow it
            if (userId && user.user_id === userId) {
                // Same user - check if they can add the role
                if (registeringAs && roles.includes(registeringAs)) {
                    console.log('[DEBUG] Email same user, explicitly blocked role');
                    return res.json({
                        available: false,
                        canProceed: false,
                        message: `User already registered as ${registeringAs}`
                    });
                }

                // Same user, different role - allow
                console.log('[DEBUG] Email same user, allowed proceeds');
                return res.json({
                    available: false,
                    canProceed: true,
                    message: 'Email belongs to your account',
                    existingUserId: user.user_id
                });
            }

            // Different user - check if we can merge (i.e. existing user doesn't have the role yet)
            console.log('[DEBUG] Email conflict with different user - checking if mergeable');

            const existingRoles = user.role ? user.role.split(',').map(r => r.trim()) : [];
            if (registeringAs && existingRoles.includes(registeringAs)) {
                return res.json({
                    available: false,
                    canProceed: false,
                    message: `Email already registered to another ${registeringAs} account.`,
                    existingUserId: user.user_id
                });
            }

            // Allow proceed to enable merging
            return res.json({
                available: false,
                canProceed: true,
                message: 'Email belongs to an existing account. Registration will add the new role.',
                existingUserId: user.user_id
            });
        }

        // If checking userId and registeringAs is provided
        if (field === 'userId' && registeringAs) {
            // Check if user already has the role they're trying to register for
            if (roles.includes(registeringAs)) {
                console.log(`[DEBUG] UserId conflict, already has role ${registeringAs}`);
                return res.json({
                    available: false,
                    canProceed: false,
                    approval_status: user.approval_status, // Add approval status
                    message: `User already registered as ${registeringAs}`,
                    canReport: true // Allow reporting identity theft
                });
            }

            // Check if user is admin or has a different role (multi-role allowed)
            const isAdmin = roles.includes('admin');
            const hasOtherRole = roles.length > 0;

            if (isAdmin || hasOtherRole) {
                // Admin or existing user can add another role
                console.log('[DEBUG] UserId exists, but allowing multi-role addition');
                return res.json({
                    available: false,
                    canProceed: true,
                    message: `Adding ${registeringAs} role to existing account`,
                    existingRoles: roles
                });
            }
        }

        // Default: user exists
        console.log('[DEBUG] Default block: User ID already registered');
        res.json({
            available: false,
            canProceed: false,
            message: 'User ID already registered',
            canReport: true // Allow reporting identity theft
        });
    } catch (err) {
        console.error('[DEBUG] check-availability Error:', err);
        res.status(500).json({ message: err.message });
    }
});

const { sendOTP } = require('../utils/emailService');
const crypto = require('crypto');

// Ensure table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        PRIMARY KEY (email)
    )
`).catch(err => console.error('Error creating password_resets table:', err));

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'Email not found' });

        // Check if user has at least professor or student role for password reset
        const user = users[0];
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];
        if (!roles.includes('professor') && !roles.includes('student')) {
            return res.status(403).json({ message: 'Password reset is only available for professor and student accounts.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            'REPLACE INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        await sendOTP(email, otp);
        res.json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log('Verify OTP Request:', { email, otp });

    try {
        const [records] = await pool.query('SELECT * FROM password_resets WHERE email = ? AND otp = ?', [email, otp]);
        if (records.length === 0) return res.status(400).json({ message: 'Invalid OTP' });

        if (new Date() > new Date(records[0].expires_at)) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        console.log('OTP verified, fetching user data for email:', email);

        // Fetch user data to return for confirmation
        const [users] = await pool.query(`
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.role,
                s.year_level,
                s.section,
                c.code as course,
                c.name as course_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            WHERE u.email = ?
        `, [email]);

        console.log('User query result:', users);

        if (users.length === 0) {
            console.error('No user found for email:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        // Check if user has at least professor or student role for password reset
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];
        if (!roles.includes('professor') && !roles.includes('student')) {
            return res.status(403).json({ message: 'Password reset is only available for professor and student accounts.' });
        }

        console.log('Sending user data:', user);

        res.json({
            message: 'OTP verified',
            user: {
                userId: user.user_id,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                course: user.course,
                courseName: user.course_name,
                yearLevel: user.year_level
            }
        });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const [records] = await pool.query('SELECT * FROM password_resets WHERE email = ? AND otp = ?', [email, otp]);
        if (records.length === 0 || new Date() > new Date(records[0].expires_at)) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Check if user has at least professor or student role for password reset
        const [users] = await pool.query('SELECT role FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            const roles = users[0].role ? users[0].role.split(',').map(r => r.trim()) : [];
            if (!roles.includes('professor') && !roles.includes('student') && !roles.includes('admin')) {
                return res.status(403).json({ message: 'Password reset is only available for professor, student, and admin accounts.' });
            }

            // Determine which password hash to update based on role
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            let updateQuery;

            if (roles.includes('professor')) {
                updateQuery = 'UPDATE users SET professor_password_hash = ? WHERE email = ?';
            } else if (roles.includes('student')) {
                updateQuery = 'UPDATE users SET student_password_hash = ? WHERE email = ?';
            } else {
                return res.status(400).json({ message: 'Invalid role for password reset' });
            }

            await pool.query(updateQuery, [hashedPassword, email]);
            await pool.query('DELETE FROM password_resets WHERE email = ?', [email]);

            res.json({ message: 'Password reset successfully' });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change Password (Authenticated)
// Change Password (Authenticated)
router.post('/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword, targetRole } = req.body; // Added targetRole
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];

        // Determine which password hash to check and update
        let currentPasswordHash;
        let updateQuery;

        // Strict Role Targeting if provided
        let roleToUpdate = targetRole;

        // Fallback checks if no target provided (or generic update) - Prefer explicit targetRole!
        if (!roleToUpdate) {
            if (roles.includes('professor')) roleToUpdate = 'professor';
            else if (roles.includes('student')) roleToUpdate = 'student';
            else if (roles.includes('admin')) roleToUpdate = 'admin';
        }

        if (roleToUpdate === 'professor' && roles.includes('professor')) {
            currentPasswordHash = user.professor_password_hash;
            updateQuery = 'UPDATE users SET professor_password_hash = ? WHERE user_id = ?';
        } else if (roleToUpdate === 'student' && roles.includes('student')) {
            currentPasswordHash = user.student_password_hash;
            updateQuery = 'UPDATE users SET student_password_hash = ? WHERE user_id = ?';
        } else if (roleToUpdate === 'admin' && roles.includes('admin')) {
            currentPasswordHash = user.admin_password_hash;
            updateQuery = 'UPDATE users SET admin_password_hash = ? WHERE user_id = ?';
        } else {
            return res.status(400).json({ message: 'Invalid role or role not assigned to user' });
        }

        if (!currentPasswordHash) {
            return res.status(400).json({ message: 'Password not set for this role' });
        }

        const isMatch = await bcrypt.compare(currentPassword, currentPasswordHash);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

        // Strong Password Validation (Redundant if frontend does it, but good safety)
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(updateQuery, [hashedPassword, userId]);

        res.json({ message: 'Password changed successfully for ' + roleToUpdate + ' role.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Login Endpoint (separate from regular login)
// Admin Login Endpoint (separate from regular login)
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log(`[Admin Login] Attempt for email: ${email} from IP: ${ipAddress}`);

    // Helper to safely log login attempts without crashing
    const safeLogAttempt = async (success) => {
        try {
            await pool.query(
                'INSERT INTO admin_login_logs (email, success, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                [email, success, ipAddress, userAgent]
            );
        } catch (logLogErr) {
            console.error('[Admin Login] Failed to INSERT log:', logLogErr.message);
            // Non-blocking error
        }
    };

    try {
        // Find admin user by email - check if role includes 'admin'
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.warn(`[Admin Login] User not found: ${email}`);
            await safeLogAttempt(false);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if user has admin role
        const roles = user.role ? user.role.split(',').map(r => r.trim()) : [];
        console.log(`[Admin Login Debug] User found: ${email}, Roles: ${JSON.stringify(roles)}`);

        if (!roles.includes('admin')) {
            console.log('[Admin Login Debug] Role check failed: ' + JSON.stringify(roles));
            await safeLogAttempt(false);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password using admin_password_hash
        if (!user.admin_password_hash) {
            console.log('[Admin Login Debug] admin_password_hash missing');
            await safeLogAttempt(false);
            return res.status(401).json({ message: 'Admin password not set. Please contact support.' });
        }

        console.log('[Admin Login Debug] Verifying password...');
        const validPassword = await bcrypt.compare(password, user.admin_password_hash);
        console.log(`[Admin Login Debug] Password valid: ${validPassword}`);

        if (!validPassword) {
            console.log('[Admin Login Debug] Invalid password');
            await safeLogAttempt(false);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Log successful login
        await safeLogAttempt(true);

        // Generate token with shorter expiration for admin
        // STRICT SCOPE: Role is ONLY 'admin'
        const token = jwt.sign(
            { id: user.id, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: 'admin' // Force strict role
            }
        });
    } catch (err) {
        console.error('Admin Login Error:', err);
        // Ensure valid JSON response
        res.status(500).json({ error: err.message || 'Internal Login Error' });
    }
});

// Validate Certificate of Registration (without registration)

// DEBUG: Reset Password Route
router.get('/debug-reset-password', async (req, res) => {
    const { email, password } = req.query;
    if (!email || !password) return res.status(400).send('Missing email or password');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE users SET password_hash = ?, admin_password_hash = ?, student_password_hash = ?, professor_password_hash = ? WHERE email = ?',
            [hashedPassword, hashedPassword, hashedPassword, hashedPassword, email]
        );
        res.send(`Password updated for ${email} to ${password}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// DEBUG: Reset Password By ID Route
router.get('/debug-reset-password-by-id', async (req, res) => {
    const { userId, password } = req.query;
    if (!userId || !password) return res.status(400).send('Missing userId or password');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Try user_id string and int just in case
        const [result] = await pool.query(
            'UPDATE users SET password_hash = ?, admin_password_hash = ?, student_password_hash = ?, professor_password_hash = ? WHERE user_id = ?',
            [hashedPassword, hashedPassword, hashedPassword, hashedPassword, userId]
        );
        res.send(`Password updated for User ID ${userId} to ${password}. Changed: ${result.changedRows}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post('/validate-cor', async (req, res) => {
    const { studentId, firstName, middleName, lastName, course, yearLevel, certificateOfRegistration } = req.body;

    try {
        if (!certificateOfRegistration) {
            return res.status(400).json({
                valid: false,
                reason: 'No certificate provided'
            });
        }

        const verificationService = require('../services/verificationService');

        // Verify COR using OCR
        const result = await verificationService.verifyStudentDocuments(
            { studentId, firstName, middleName, lastName, course, yearLevel },
            certificateOfRegistration
        );

        // Include extracted section in response
        res.json({
            ...result,
            extractedSection: result.details?.extractedSection || null
        });
    } catch (error) {
        console.error('COR validation error:', error);
        res.status(500).json({
            valid: false,
            reason: 'Validation error: ' + error.message
        });
    }
});

// Report Identity Theft
router.post('/report-identity-theft', async (req, res) => {
    const { userId, reporterEmail, reporterName, description } = req.body;

    try {
        // Validate input
        if (!userId || !reporterEmail || !reporterName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create report in database
        await pool.query(
            'INSERT INTO identity_theft_reports (reported_user_id, reporter_email, reporter_name, description, status) VALUES (?, ?, ?, ?, ?)',
            [userId, reporterEmail, reporterName, description || 'No description provided', 'pending']
        );

        // Send email to admin
        try {
            // Fetch all admin emails
            const [admins] = await pool.query("SELECT email FROM users WHERE role LIKE '%admin%'");
            const adminEmails = admins.map(a => a.email);

            // Add default support email
            if (!adminEmails.includes('labfaceassistance@gmail.com')) {
                adminEmails.push('labfaceassistance@gmail.com');
            }

            const { sendIdentityTheftReport } = require('../utils/emailService');
            if (sendIdentityTheftReport) {
                await sendIdentityTheftReport(userId, reporterEmail, reporterName, description, adminEmails);
            }
        } catch (emailError) {
            console.error('Failed to send identity theft email:', emailError);
            // Continue even if email fails
        }

        res.json({
            success: true,
            message: 'Report submitted successfully. Admin will investigate and contact you via email.'
        });
    } catch (error) {
        console.error('Error submitting identity theft report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

module.exports = router;
