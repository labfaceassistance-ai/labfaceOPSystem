const pool = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting migration...');
        const connection = await pool.getConnection();

        const columns = [
            { name: 'privacy_policy_accepted', def: 'BOOLEAN DEFAULT FALSE' },
            { name: 'privacy_policy_version', def: 'VARCHAR(20) DEFAULT NULL' },
            { name: 'privacy_policy_accepted_at', def: 'DATETIME DEFAULT NULL' },
            { name: 'consent_status', def: "VARCHAR(20) DEFAULT 'pending'" }
        ];

        for (const col of columns) {
            const [rows] = await connection.query(`SHOW COLUMNS FROM users LIKE '${col.name}'`);
            if (rows.length === 0) {
                console.log(`Adding column: ${col.name}`);
                await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
            } else {
                console.log(`Column exists: ${col.name}`);
            }
        }

        console.log('Migration completed successfully.');
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
