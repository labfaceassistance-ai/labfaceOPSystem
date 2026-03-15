const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Create a new student group
router.post('/', async (req, res) => {
    const { classId, name, enrollmentIds } = req.body;

    if (!classId || !name || !enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields or invalid enrollmentIds' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Create Group
        const [groupResult] = await connection.query(
            'INSERT INTO student_groups (class_id, name) VALUES (?, ?)',
            [classId, name]
        );
        const groupId = groupResult.insertId;

        // Add Members
        const values = enrollmentIds.map(id => [groupId, id]);
        await connection.query(
            'INSERT INTO student_group_members (group_id, enrollment_id) VALUES ?',
            [values]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            groupId,
            name,
            memberCount: enrollmentIds.length
        });
    } catch (err) {
        await connection.rollback();
        console.error('Create group error:', err);
        res.status(500).json({ error: 'Failed to create group', details: err.message });
    } finally {
        connection.release();
    }
});

// Get all groups for a class
router.get('/class/:classId', async (req, res) => {
    try {
        const [groups] = await pool.query(
            'SELECT * FROM student_groups WHERE class_id = ? ORDER BY created_at DESC',
            [req.params.classId]
        );

        // Fetch members for each group
        for (let group of groups) {
            const [members] = await pool.query(
                'SELECT enrollment_id FROM student_group_members WHERE group_id = ?',
                [group.id]
            );
            group.enrollmentIds = members.map(m => m.enrollment_id);
        }

        res.json(groups);
    } catch (err) {
        console.error('Get groups error:', err);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Delete a group
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM student_groups WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Group deleted' });
    } catch (err) {
        console.error('Delete group error:', err);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

module.exports = router;
