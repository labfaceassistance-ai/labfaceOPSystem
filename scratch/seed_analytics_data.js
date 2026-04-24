const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
    host: process.env.DB_HOST || 'mariadb', 
    user: process.env.DB_USER || 'labface_user',
    password: process.env.DB_PASSWORD || 'a2e3dc6092635226d79d98290e712664717223fd7d31b207',
    database: process.env.DB_NAME || 'labface'
};

async function seed() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to database.');

        // 1. Get or Create Professor
        const [profRows] = await connection.query('SELECT id FROM users WHERE user_id = ?', ['12345']);
        let professorId;
        if (profRows.length === 0) {
            console.log('Creating Professor Jayricko Ocampo (12345)...');
            const [result] = await connection.query(
                'INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['12345', 'Jayricko', 'Ocampo', 'jayricko.test@example.com', '$2a$10$qo0ptr2fs4j9eTbZ7KzFluLuHtaw0Ln.fQn8P05Eu22IzVt12ildO', 'professor', 'approved']
            );
            professorId = result.insertId;
        } else {
            professorId = profRows[0].id;
            // Ensure they have the professor role
            await connection.query('UPDATE users SET role = "professor,admin" WHERE id = ?', [professorId]);
        }

        // --- NEW: CLEANUP PHASE ---
        console.log('Cleaning up existing test data for Professor 12345...');
        const [existingClasses] = await connection.query('SELECT id FROM classes WHERE professor_id = ?', [professorId]);
        if (existingClasses.length > 0) {
            const classIds = existingClasses.map(c => c.id);
            const idList = classIds.join(',');
            
            // Delete in order of foreign key dependency
            await connection.query(`DELETE FROM attendance_logs WHERE session_id IN (SELECT id FROM sessions WHERE class_id IN (${idList}))`);
            await connection.query(`DELETE FROM sessions WHERE class_id IN (${idList})`);
            await connection.query(`DELETE FROM enrollments WHERE class_id IN (${idList})`);
            await connection.query(`DELETE FROM classes WHERE id IN (${idList})`);
            console.log(`Removed ${existingClasses.length} existing classes and related data.`);
        }
        // --- END CLEANUP ---

        // 2. Get or Create Academic Period
        const [periodRows] = await connection.query('SELECT id FROM academic_periods WHERE is_active = 1 LIMIT 1');
        let periodId;
        if (periodRows.length === 0) {
            const [result] = await connection.query(
                'INSERT INTO academic_periods (school_year, semester, is_active, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
                ['2025-2026', 'First Semester', 1, '2025-06-01', '2025-11-01']
            );
            periodId = result.insertId;
        } else {
            periodId = periodRows[0].id;
        }

        const subjects = [
            { code: 'CS101', name: 'Introduction to Computing' },
            { code: 'CS102', name: 'Computer Programming 1' },
            { code: 'CS201', name: 'Data Structures' },
            { code: 'CS301', name: 'Software Engineering' },
            { code: 'CS401', name: 'Artificial Intelligence' }
        ];

        const sections = ['BSIT-1A', 'BSIT-1B', 'BSIT-2A', 'BSOA-3A', 'DIT-1C'];

        for (let i = 0; i < 5; i++) {
            const subject = subjects[i];
            const section = sections[i];
            const studentCount = 30 + Math.floor(Math.random() * 15); // 30 to 45 students
            const sessionCount = 8 + Math.floor(Math.random() * 5); // 8 to 12 sessions

            console.log(`Seeding Class: ${subject.code} - ${section} (${studentCount} students, ${sessionCount} sessions)`);

            // 3. Create Class
            const [classResult] = await connection.query(
                'INSERT INTO classes (subject_code, subject_name, professor_id, academic_period_id, section, course_id, year_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [subject.code, subject.name, professorId, periodId, section, 1, Math.floor(Math.random() * 4) + 1]
            );
            const classId = classResult.insertId;

            // 4. Create Students & Enroll them
            const studentIds = [];
            for (let s = 0; s < studentCount; s++) {
                const s_uid = `STU-${i}-${s}-${Math.floor(Math.random() * 10000)}`;
                const [stuResult] = await connection.query(
                    'INSERT INTO users (user_id, first_name, last_name, email, password_hash, role, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [s_uid, `Student_${i}_${s}`, `Surname_${i}_${s}`, `${s_uid}@student.test.com`, 'hash', 'student', 'approved']
                );
                const stuId = stuResult.insertId;
                studentIds.push(stuId);

                await connection.query(
                    'INSERT INTO enrollments (class_id, student_id, student_number, student_name) VALUES (?, ?, ?, ?)',
                    [classId, stuId, s_uid, `Student_${i}_${s} Surname_${i}_${s}`]
                );
            }

            // 5. Create Sessions & Attendance
            for (let j = 0; j < sessionCount; j++) {
                const date = new Date();
                date.setDate(date.getDate() - (sessionCount - j) * 7); // Spread over weeks
                const dateStr = date.toISOString().split('T')[0];

                const [sessResult] = await connection.query(
                    'INSERT INTO sessions (class_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
                    [classId, dateStr, '08:00:00', '11:00:00', 'completed']
                );
                const sessionId = sessResult.insertId;

                for (const stuId of studentIds) {
                    // Random attendance logic
                    const isLastThree = j >= sessionCount - 3;
                    const isTargetStudent = studentIds.indexOf(stuId) < 2; // Force for first two students

                    let status = 'present';
                    const rand = Math.random();
                    
                    if (isTargetStudent && isLastThree) {
                        status = 'absent'; // Force consecutive absences
                    } else {
                        if (rand < 0.1) status = 'absent';
                        else if (rand < 0.2) status = 'late';
                        else if (rand < 0.25) status = 'excused';
                    }

                    await connection.query(
                        'INSERT INTO attendance_logs (session_id, student_id, status, time_in) VALUES (?, ?, ?, ?)',
                        [sessionId, stuId, status, (status === 'present' || status === 'late') ? `${dateStr} 08:20:00` : null]
                    );
                }
            }
        }

        console.log('Successfully seeded dummy analytics data.');
    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
