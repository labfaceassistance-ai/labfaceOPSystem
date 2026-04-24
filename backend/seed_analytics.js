require('dotenv').config({ path: '../.env' });
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
const pool = require('./config/db');

async function seed() {
    try {
        console.log('--- STARTING CLEAN & REALISTIC SEEDING ---');

        // 1. Cleanup old analytics data
        console.log('Cleaning up old sessions and logs...');
        await pool.query('DELETE FROM attendance_logs');
        await pool.query('DELETE FROM sessions');

        // 2. Get classes and enrollments
        const [classes] = await pool.query('SELECT id, subject_name FROM classes');
        const [enrollments] = await pool.query('SELECT id, student_id, class_id FROM enrollments');

        if (classes.length === 0 || enrollments.length === 0) {
            console.error('Missing classes or enrollments. Cannot seed.');
            process.exit(1);
        }

        // 3. Categorize students globally for the entire professor
        const uniqueStudentIds = [...new Set(enrollments.map(e => e.student_id))];
        console.log(`Found ${uniqueStudentIds.length} total students.`);

        const droppedCount = 15;
        const atRiskCount = 20;

        // Shuffle students to pick targets
        const shuffled = uniqueStudentIds.sort(() => 0.5 - Math.random());
        const droppedTargets = new Set(shuffled.slice(0, droppedCount));
        const atRiskTargets = new Set(shuffled.slice(droppedCount, droppedCount + atRiskCount));

        console.log(`Targeting: ${droppedCount} Drops, ${atRiskCount} Risks, ${uniqueStudentIds.length - droppedCount - atRiskCount} Healthy students.`);

        // 4. Generate 12 past sessions per class
        const sessionDates = [];
        const now = new Date();
        let count = 0;
        let offset = 1;
        while (count < 12) {
            const d = new Date();
            d.setDate(now.getDate() - offset);
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                sessionDates.push(d.toISOString().split('T')[0]);
                count++;
            }
            offset++;
        }
        sessionDates.reverse(); // Chronological

        for (const cls of classes) {
            const classEnrollments = enrollments.filter(e => e.class_id === cls.id);
            if (classEnrollments.length === 0) continue;

            console.log(`Seeding Class: ${cls.subject_name}...`);

            for (let i = 0; i < sessionDates.length; i++) {
                const date = sessionDates[i];
                
                // Create session
                const [sessionResult] = await pool.query(
                    'INSERT INTO sessions (class_id, date, start_time, end_time, type, status, monitoring_ended_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [cls.id, date, '08:00:00', '11:00:00', 'regular', 'completed', `${date} 11:00:00`]
                );
                const sessionId = sessionResult.insertId;

                // Create attendance for each student in this class
                for (const enr of classEnrollments) {
                    let status = 'Present';
                    
                    if (droppedTargets.has(enr.student_id)) {
                        // Drops: Absent for the last 6 sessions consecutively
                        if (i >= sessionDates.length - 6) {
                            status = 'Absent';
                        } else {
                            status = Math.random() > 0.8 ? 'Late' : 'Present';
                        }
                    } else if (atRiskTargets.has(enr.student_id)) {
                        // At Risk: 40% chance of absence to keep rate around 60%
                        const r = Math.random();
                        if (r < 0.40) status = 'Absent';
                        else if (r < 0.60) status = 'Late';
                        else status = 'Present';
                    } else {
                        // Healthy: 95% attendance
                        const r = Math.random();
                        if (r < 0.05) status = 'Absent';
                        else if (r < 0.15) status = 'Late';
                        else status = 'Present';
                    }

                    await pool.query(
                        'INSERT INTO attendance_logs (session_id, student_id, enrollment_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
                        [sessionId, enr.student_id, enr.id, status, `${date} 08:05:00`]
                    );
                }
            }
        }

        console.log('--- RE-SEEDING COMPLETE ---');
        console.log('Targets achieved: 15 Dropped, 20 At Risk.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
