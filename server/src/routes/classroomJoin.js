import express from 'express';
import postgres from '../db/postgres.js';
import { verifyToken, requireStudent } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/classroom-join/request
 * Student submits a request to join a classroom using join code
 */
router.post('/request', verifyToken, requireStudent, async (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode || joinCode.trim().length === 0) {
      return res.status(400).json({ error: 'Join code required' });
    }

    // Find classroom by join code
    const classroomResult = await postgres.query(
      'SELECT id, name, teacher_id FROM classrooms WHERE join_code = $1',
      [joinCode.toUpperCase()]
    );

    if (classroomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    const classroom = classroomResult.rows[0];

    // Check if student already has a membership request
    const existingMembership = await postgres.query(
      'SELECT id, status FROM classroom_members WHERE classroom_id = $1 AND student_id = $2',
      [classroom.id, req.user.id]
    );

    if (existingMembership.rows.length > 0) {
      const status = existingMembership.rows[0].status;
      if (status === 'approved') {
        return res.status(400).json({ error: 'You are already a member of this classroom' });
      } else if (status === 'pending') {
        return res.status(400).json({ error: 'Your request is already pending' });
      } else if (status === 'rejected') {
        return res.status(400).json({ error: 'Your request was rejected. Contact the teacher.' });
      }
    }

    // Create membership request (pending approval)
    const result = await postgres.query(
      `INSERT INTO classroom_members (classroom_id, student_id, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING id, classroom_id, student_id, status, joined_at`,
      [classroom.id, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Join request submitted. Waiting for teacher approval.',
      request: {
        id: result.rows[0].id,
        classroomId: result.rows[0].classroom_id,
        classroomName: classroom.name,
        status: result.rows[0].status,
        joinedAt: result.rows[0].joined_at,
      },
    });
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({ error: 'Failed to submit join request' });
  }
});

/**
 * GET /api/classroom-join/my-requests
 * Student views their pending/approved/rejected join requests
 */
router.get('/my-requests', verifyToken, requireStudent, async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT cm.id, c.id as classroom_id, c.name as classroom_name, c.description, 
              cm.status, cm.joined_at, cm.approved_at, t.username as teacher_name
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.id
       JOIN teachers t ON c.teacher_id = t.id
       WHERE cm.student_id = $1
       ORDER BY CASE WHEN cm.status = 'pending' THEN 0 ELSE 1 END, cm.joined_at DESC`,
      [req.user.id]
    );

    const pending = result.rows.filter(r => r.status === 'pending');
    const approved = result.rows.filter(r => r.status === 'approved');
    const rejected = result.rows.filter(r => r.status === 'rejected');

    res.json({
      pending,
      approved,
      rejected,
    });
  } catch (error) {
    console.error('Fetch join requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * GET /api/classroom-join/my-classrooms
 * Student views their approved classrooms
 */
router.get('/my-classrooms', verifyToken, requireStudent, async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT c.id, c.name, c.description, c.join_code, c.created_at, t.username as teacher_name,
              COUNT(ce.exam_id) as exam_count
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.id
       JOIN teachers t ON c.teacher_id = t.id
       LEFT JOIN classroom_exams ce ON c.id = ce.classroom_id
       WHERE cm.student_id = $1 AND cm.status = 'approved'
       GROUP BY c.id, t.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({
      classrooms: result.rows,
    });
  } catch (error) {
    console.error('Fetch my classrooms error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

/**
 * DELETE /api/classroom-join/:classroomId
 * Student leaves/withdraws from a classroom
 */
router.delete('/:classroomId', verifyToken, requireStudent, async (req, res) => {
  try {
    const { classroomId } = req.params;

    const result = await postgres.query(
      'DELETE FROM classroom_members WHERE classroom_id = $1 AND student_id = $2 RETURNING *',
      [classroomId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json({
      success: true,
      message: 'You have left the classroom',
    });
  } catch (error) {
    console.error('Leave classroom error:', error);
    res.status(500).json({ error: 'Failed to leave classroom' });
  }
});

export default router;
