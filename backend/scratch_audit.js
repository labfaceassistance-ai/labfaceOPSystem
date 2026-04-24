require('dotenv').config({ path: '../.env' });
process.env.DB_HOST = '127.0.0.1';
const pool = require('./config/db');

async function audit() {
    try {
        const [rows] = await pool.query(`
            SELECT 
                date, 
                DAYNAME(date) as day_name, 
                WEEKDAY(date) as day_idx,
                COUNT(*) as count
            FROM sessions 
            GROUP BY date, day_name, day_idx
            ORDER BY date DESC 
            LIMIT 50
        `);
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

audit();
