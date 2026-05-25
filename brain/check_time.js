const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkTime() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'mariadb',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query('SELECT id, time_in, created_at FROM attendance_logs ORDER BY id DESC LIMIT 5');
        console.log('Database Results:');
        console.log(JSON.stringify(rows, null, 2));
        
        const [now] = await pool.query('SELECT NOW() as now');
        console.log('DB NOW():', now[0].now);
        
        console.log('Node new Date():', new Date().toISOString());
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTime();
