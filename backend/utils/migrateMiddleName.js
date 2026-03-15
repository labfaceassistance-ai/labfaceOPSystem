const pool = require('../config/db');

const migrateMiddleName = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Starting migration: Making middle_name optional...');

        // Check if column exists and is not null
        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'middle_name'");

        if (columns.length > 0) {
            const column = columns[0];
            if (column.Null === 'NO') {
                console.log('Column middle_name is currently NOT NULL. Modifying...');
                await connection.query("ALTER TABLE users MODIFY COLUMN middle_name VARCHAR(255) NULL DEFAULT NULL");
                console.log('Successfully modified middle_name to allow NULL.');
            } else {
                console.log('Column middle_name already allows NULL. No action needed.');
            }
        } else {
            console.log('Column middle_name does not exist (unexpected).');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
};

migrateMiddleName();
