CREATE DATABASE IF NOT EXISTS labface;
USE labface;

-- Ensure generic user from environment has permissions
-- MariaDB handles user creation via environment variables, this just ensures permissions
GRANT ALL PRIVILEGES ON labface.* TO 'labface_user'@'%';
FLUSH PRIVILEGES;

-- ==================== 1. CORE TABLES ====================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL, -- Student Number or Professor ID
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Initial/Legacy password
    admin_password_hash VARCHAR(255),
    student_password_hash VARCHAR(255),
    professor_password_hash VARCHAR(255),
    approval_status VARCHAR(20) DEFAULT 'pending',
    role VARCHAR(255) NOT NULL, -- Comma separated roles: student, professor, admin
    course VARCHAR(50), -- For students (Legacy)
    year_level INT, -- For students (Legacy)
    face_embeddings JSON, -- Storing vector as JSON array (Legacy/Center)
    profile_picture VARCHAR(255),
    id_photo VARCHAR(255),
    certificate_of_registration VARCHAR(255),
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    privacy_policy_version VARCHAR(20),
    privacy_policy_accepted_at DATETIME,
    consent_status VARCHAR(20) DEFAULT 'pending',
    verified_by INT, -- Admin who approved
    verified_at DATETIME,
    last_verified_period_id INT, -- Tracks the academic period when student data was last verified
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== 2. ACADEMIC & CLASS MANAGEMENT ====================

-- Academic Periods Table
CREATE TABLE IF NOT EXISTS academic_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_period (school_year, semester)
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(150) NOT NULL,
    professor_id INT NOT NULL,
    academic_period_id INT,
    school_year VARCHAR(20), -- Legacy support
    semester VARCHAR(20),    -- Legacy support
    section VARCHAR(50),
    schedule_json JSON, -- { "day": "Monday", "start": "08:00", "end": "11:00" }
    course_id INT,       -- Link to courses table
    year_level INT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Class Cancellations Table
CREATE TABLE IF NOT EXISTS class_cancellations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    session_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- ==================== 3. STUDENT DATA ====================

-- Students Table (Detailed Profile)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    course_id INT,
    year_level INT,
    section VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT, -- Can be NULL if not registered yet
    student_number VARCHAR(50), -- For manual entry support
    student_name VARCHAR(150),  -- For manual entry support
    batch_group INT, -- Optional: 1, 2, etc.
    dropped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_enrollment (class_id, student_id),
    INDEX (class_id),
    INDEX (student_id)
);

-- Student Groups Table
CREATE TABLE IF NOT EXISTS student_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Student Group Members Table
CREATE TABLE IF NOT EXISTS student_group_members (
    group_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    PRIMARY KEY (group_id, enrollment_id),
    FOREIGN KEY (group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

-- ==================== 4. FACE RECOGNITION & FILES ====================

-- Face Photos Table
CREATE TABLE IF NOT EXISTS face_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    angle VARCHAR(20), -- center, left, right, up, down
    embedding JSON,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== 5. SESSIONS & ATTENDANCE ====================

-- Sessions Table (Tracks active class sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    type ENUM('regular', 'makeup') DEFAULT 'regular',
    status ENUM('active', 'completed') DEFAULT 'active',
    late_threshold_minutes INT DEFAULT 15,
    session_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Attendance Logs Table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT,
    enrollment_id INT,
    time_in DATETIME,
    time_out DATETIME,
    status ENUM('present', 'late', 'absent', 'left', 'excused') NOT NULL,
    snapshot_url VARCHAR(255), -- MinIO URL
    recognition_method VARCHAR(50), -- face, manual, qr
    confidence_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX (session_id),
    INDEX (student_id),
    INDEX (enrollment_id),
    INDEX (status),
    INDEX (created_at)
);

-- ==================== 6. LOGS & NOTIFICATIONS ====================

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    category VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin Actions Table
CREATE TABLE IF NOT EXISTS admin_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id INT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin Login Logs Table
CREATE TABLE IF NOT EXISTS admin_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Two Factor Logs Table
CREATE TABLE IF NOT EXISTS two_factor_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Logs Table (Web)
CREATE TABLE IF NOT EXISTS session_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(100), -- Web session ID
    action VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== 7. SECURITY & COMPLIANCE ====================

-- Identity Theft Reports Table
CREATE TABLE IF NOT EXISTS identity_theft_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reported_user_id INT NOT NULL,
    reporter_email VARCHAR(150) NOT NULL,
    reporter_name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, investigated, resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Verification Logs Table
CREATE TABLE IF NOT EXISTS verification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- cor, id, face
    status VARCHAR(20) NOT NULL, -- pass, fail
    data_snapshot JSON,
    confidence FLOAT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Consent Records Table
CREATE TABLE IF NOT EXISTS consent_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- Using user_id string as user might not be created yet 
    consent_type VARCHAR(50) NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_text TEXT,
    consent_version VARCHAR(20),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (email)
);

-- ==================== 8. SEED DATA ====================

-- Seed Courses
INSERT IGNORE INTO courses (code, name) VALUES 
('BSIT', 'Bachelor of Science in Information Technology'),
('BSOA', 'Bachelor of Science in Office Administration'),
('DIT', 'Diploma in Information Technology');

-- Seed Admins
-- Passwords: Glason_27, Manza_814, Echowecho#31, Cl0ckworkLu!1aby, Andie_2026
INSERT IGNORE INTO users 
(user_id, first_name, middle_name, last_name, email, password_hash, admin_password_hash, role, approval_status) 
VALUES 
('2022-00322-LQ-0', 'Glason Nel', 'Duenas', 'Garganta', 'glasonnel.duenasgarganta@gmail.com', '$2a$10$qo0ptr2fs4j9eTbZ7KzFluLuHtaw0Ln.fQn8P05Eu22IzVt12ildO', '$2a$10$qo0ptr2fs4j9eTbZ7KzFluLuHtaw0Ln.fQn8P05Eu22IzVt12ildO', 'admin', 'approved'),
('2022-00330-LQ-0', 'John Lloyd', 'Suni', 'Manzanero', 'johnlloydmanzanero814@gmail.com', '$2a$10$6WhuDd/vuwJKNnU2ZvKZLu6HvppLuELOwSW2pdn4GvECa2sO3qmgq', '$2a$10$6WhuDd/vuwJKNnU2ZvKZLu6HvppLuELOwSW2pdn4GvECa2sO3qmgq', 'admin', 'approved'),
('2022-00305-LQ-0', 'Jayricko', 'Antiola', 'Ocampo', 'jayrickoantiolaocampo@gmail.com', '$2a$10$fZMSn..CvkT2aRbwpAkQr..ty00L6rFPjKquR.OqoqBpZlIQ3rAAi', '$2a$10$fZMSn..CvkT2aRbwpAkQr..ty00L6rFPjKquR.OqoqBpZlIQ3rAAi', 'admin', 'approved'),
('2022-00306-LQ-0', 'Ashley Marie', 'Paraiso', 'Avila', 'ashleyparaiso.avila7704@gmail.com', '$2a$10$xmNzBrrWew..gqRIUjnvbugbdCbM/dw7eHZscaj00ftVVMCtREvra', '$2a$10$xmNzBrrWew..gqRIUjnvbugbdCbM/dw7eHZscaj00ftVVMCtREvra', 'admin', 'approved'),
('12079', 'Marie Andrea', '', 'Zurbano', 'andienesswatty@gmail.com', '$2a$10$cQEkuxSPLZ7SO6vRX8UGrOmvq8Tegn5Ido5/KWLWqvzN0JaytZGtC', '$2a$10$cQEkuxSPLZ7SO6vRX8UGrOmvq8Tegn5Ido5/KWLWqvzN0JaytZGtC', 'admin', 'approved');
