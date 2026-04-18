const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Ensure notifications table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('success', 'error', 'info', 'warning') DEFAULT 'info',
        category ENUM('attendance', 'class', 'system', 'security') DEFAULT 'system',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )

`).then(async () => {
    // Migration: Add type and category if they don't exist
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM notifications');
        const columnNames = columns.map(c => c.Field);
        if (!columnNames.includes('type')) {
            await pool.query("ALTER TABLE notifications ADD COLUMN type ENUM('success', 'error', 'info', 'warning') DEFAULT 'info'");
        }
        if (!columnNames.includes('category')) {
            await pool.query("ALTER TABLE notifications ADD COLUMN category ENUM('attendance', 'class', 'system', 'security') DEFAULT 'system'");
        }
    } catch (migErr) {
        console.error('Migration error for notifications:', migErr);
    }
}).catch(err => console.error('Error creating notifications table:', err));


// Get Notifications for a User
router.get('/:userId', async (req, res) => {
    console.log(`[NOTIFS] Fetching for user: ${req.params.userId}`);
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [req.params.userId]
        );
        res.json(notifications);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ error: err.message });
    }
});


// Update Notification (Mark as read or other)
router.patch('/:id/read', async (req, res) => {
    console.log(`[NOTIFS] Marking read ID: ${req.params.id}`);
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error("Error updating notification:", err);
        res.status(500).json({ error: err.message });
    }
});





// Mark All as Read
router.patch('/user/:userId/read-all', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.params.userId]);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error("Error marking all read:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete All for User
router.delete('/clear/:userId', async (req, res) => {
    try {
        await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.params.userId]);
        res.json({ message: 'All notifications deleted' });
    } catch (err) {
        console.error("Error clearing notifications:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Notification
router.delete('/:id/delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error("Error deleting notification:", err);
        res.status(500).json({ error: err.message });
    }
});




// Sync/Backfill Notifications (Special endpoint for existing data)
router.post('/sync/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // 1. Get all classes the student is enrolled in
        const [enrollments] = await pool.query(`
            SELECT c.id as class_id, c.subject_name 
            FROM enrollments e
            JOIN classes c ON e.class_id = c.id
            WHERE e.student_id = ?
        `, [userId]);

        let createdCount = 0;

        for (const env of enrollments) {
            // 2. Check if a notification already exists for this specific enrollment
            // We search for the class name in the message to avoid duplicates
            const [existing] = await pool.query(
                `SELECT id FROM notifications WHERE user_id = ? AND category = 'class' AND message LIKE ?`,
                [userId, `%${env.subject_name}%`]
            );

            if (existing.length === 0) {
                // 3. Create a backfill notification
                await pool.query(
                    'INSERT INTO notifications (user_id, title, message, type, category) VALUES (?, ?, ?, ?, ?)',
                    [userId, 'Class Enrollment Found', `You are currently enrolled in ${env.subject_name}.`, 'success', 'class']
                );
                createdCount++;
            }
        }

        res.json({ message: `Sync complete. Created ${createdCount} missing notifications.`, count: createdCount });
    } catch (err) {
        console.error("Error syncing notifications:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
