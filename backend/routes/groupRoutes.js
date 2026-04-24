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

        // UNASSIGN students from any existing groups in this class first (Exclusive Membership)
        await connection.query(
            `DELETE sgm FROM student_group_members sgm
             INNER JOIN student_groups sg ON sgm.group_id = sg.id
             WHERE sgm.enrollment_id IN (?) AND sg.class_id = ?`,
            [enrollmentIds, classId]
        );

        // Create Group
        const [groupResult] = await connection.query(
            'INSERT INTO student_groups (class_id, name, capacity) VALUES (?, ?, ?)',
            [classId, name, req.body.capacity || null]
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

// Get Pending Requests for a Class
router.get('/class/:classId/requests', async (req, res) => {
    try {
        const { classId } = req.params;
        const [requests] = await pool.query(`
            SELECT 
                br.*,
                CONCAT(u1.first_name, ' ', u1.last_name) as requester_name,
                CONCAT(u2.first_name, ' ', u2.last_name) as target_student_name,
                sg.name as target_group_name
            FROM batch_requests br
            JOIN users u1 ON br.requester_id = u1.id
            LEFT JOIN users u2 ON br.target_student_id = u2.id
            JOIN student_groups sg ON br.target_group_id = sg.id
            WHERE br.class_id = ? AND br.status IN ('pending_peer', 'pending_professor')
            ORDER BY br.created_at DESC
        `, [classId]);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Action a Request (Approve/Reject)
router.post('/requests/:requestId/:action', async (req, res) => {
    const { requestId, action } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get request details
        const [requests] = await connection.query('SELECT * FROM batch_requests WHERE id = ?', [requestId]);
        if (requests.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Request not found" });
        }
        const request = requests[0];

        // 2. Resolve Enrollment ID for the requester (since requester_id is a User ID)
        const [enrollments] = await connection.query(
            'SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?',
            [request.class_id, request.requester_id]
        );
        
        if (enrollments.length === 0) {
            connection.release();
            return res.status(404).json({ error: "Requester enrollment not found" });
        }
        const enrollmentId = enrollments[0].id;

        if (action === 'reject') {
            await connection.query('UPDATE batch_requests SET status = "rejected" WHERE id = ?', [requestId]);
        } else {
            // APPROVE logic
            if (request.request_type === 'join') {
                // Remove from old groups in this class
                await connection.query(`
                    DELETE gm FROM student_group_members gm
                    JOIN student_groups sg ON gm.group_id = sg.id
                    WHERE sg.class_id = ? AND gm.enrollment_id = ?
                `, [request.class_id, enrollmentId]);

                // Add to new group
                await connection.query('INSERT INTO student_group_members (group_id, enrollment_id) VALUES (?, ?)', 
                    [request.target_group_id, enrollmentId]);
            } else if (request.request_type === 'swap') {
                // Find requester's CURRENT group
                const [requesterGroups] = await connection.query(`
                    SELECT sgm.group_id FROM student_group_members sgm
                    JOIN student_groups sg ON sgm.group_id = sg.id
                    WHERE sg.class_id = ? AND sgm.enrollment_id = ?
                `, [request.class_id, enrollmentId]);

                if (requesterGroups.length === 0) {
                    throw new Error("Requester is not currently in a group");
                }
                const oldGroupId = requesterGroups[0].group_id;

                // Resolve Target Student Enrollment ID
                const [targetEnrollments] = await connection.query(
                    'SELECT id FROM enrollments WHERE class_id = ? AND student_id = ?',
                    [request.class_id, request.target_student_id]
                );
                
                if (targetEnrollments.length === 0) {
                    throw new Error("Target student enrollment not found");
                }
                const targetEnrollmentId = targetEnrollments[0].id;

                // Perform SWAP
                // 1. Move requester to target group
                await connection.query('UPDATE student_group_members SET group_id = ? WHERE group_id = ? AND enrollment_id = ?',
                    [request.target_group_id, oldGroupId, enrollmentId]);
                
                // 2. Move target student to requester's old group
                await connection.query('UPDATE student_group_members SET group_id = ? WHERE group_id = ? AND enrollment_id = ?',
                    [oldGroupId, request.target_group_id, targetEnrollmentId]);
            }
            
            await connection.query('UPDATE batch_requests SET status = "approved" WHERE id = ?', [requestId]);
        }

        await connection.commit();
        res.json({ message: `Request ${action}ed successfully` });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
