const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyUpdates() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'labface_user',
        password: process.env.DB_PASSWORD || 'a2e3dc6092635226d79d98290e712664717223fd7d31b207',
        database: process.env.DB_NAME || 'labface'
    });

    try {
        console.log('Applying database updates for Batch Swap system...');

        // 1. Add capacity column to student_groups if it doesn't exist
        const [columns] = await connection.query('SHOW COLUMNS FROM student_groups LIKE "capacity"');
        if (columns.length === 0) {
            await connection.query('ALTER TABLE student_groups ADD COLUMN capacity INT DEFAULT NULL');
            console.log('Added capacity column to student_groups.');
        } else {
            console.log('Capacity column already exists.');
        }

        // 1b. Add auto_close column to sessions if it doesn't exist
        const [autoCloseCols] = await connection.query('SHOW COLUMNS FROM sessions LIKE "auto_close"');
        if (autoCloseCols.length === 0) {
            await connection.query('ALTER TABLE sessions ADD COLUMN auto_close TINYINT(1) DEFAULT 1');
            console.log('Added auto_close column to sessions (Default: 1).');
        }

        // 2. Create batch_requests table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS batch_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                requester_id INT NOT NULL,
                target_group_id INT NOT NULL,
                request_type ENUM('join', 'swap') NOT NULL,
                target_student_id INT DEFAULT NULL,
                status ENUM('pending_peer', 'pending_professor', 'approved', 'rejected', 'cancelled') DEFAULT 'pending_peer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (target_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (target_student_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Batch requests table verified/created.');

        console.log('Database updates completed successfully.');
    } catch (err) {
        console.error('Error applying updates:', err);
    } finally {
        await connection.end();
    }
}

applyUpdates();
