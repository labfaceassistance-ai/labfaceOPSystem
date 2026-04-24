const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugHeatmap() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'labface_user',
        password: process.env.DB_PASSWORD || 'a2e3dc6092635226d79d98290e712664717223fd7d31b207',
        database: process.env.DB_NAME || 'labface'
    });

    try {
        console.log('Debugging Heatmap Data...');
        
        // Let's check for professor Jayricko (2022-00305-LQ-0)
        const [prof] = await connection.query('SELECT id FROM users WHERE user_id = "2022-00305-LQ-0"');
        if (prof.length === 0) {
            console.log('Professor not found');
            return;
        }
        const profId = prof[0].id;
        
        const [classes] = await connection.query('SELECT id FROM classes WHERE professor_id = ?', [profId]);
        const classIds = classes.map(c => c.id);
        
        if (classIds.length === 0) {
            console.log('No classes found for this professor');
            return;
        }

        const [rows] = await connection.query(`
            SELECT
                s.id as session_id,
                s.date,
                DAYNAME(s.date) as day_name,
                WEEKDAY(s.date) as weekday_val,
                HOUR(s.start_time) as hour_val,
                s.start_time,
                COUNT(al.id) as absent_count
            FROM attendance_logs al
            JOIN sessions s ON al.session_id = s.id
            WHERE s.class_id IN (${classIds.join(',')})
            AND al.status = 'Absent'
            GROUP BY s.id, s.date, s.start_time
        `);

        console.log('Heatmap Raw Rows:');
        console.table(rows);

    } catch (err) {
        console.error('Debug error:', err);
    } finally {
        await connection.end();
    }
}

debugHeatmap();
