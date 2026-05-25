import express from 'express';
import postgres from '../db/postgres.js';
import { verifyToken, requireTeacher, requireStudent } from '../middleware/auth.js';
import { requireOwnsClassroom, requireApprovedClassroomMember } from '../middleware/authorization.js';

const router = express.Router();

/**
 * Generate a random unique join code
 */
function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * POST /api/classrooms/create
 * Teacher creates a new classroom
 */
router.post('/create', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Classroom name required' });
    }

    let joinCode = generateJoinCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure unique join code
    while (attempts < maxAttempts) {
      const existing = await postgres.query(
        'SELECT id FROM classrooms WHERE join_code = $1',
        [joinCode]
      );
      if (existing.rows.length === 0) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique join code' });
    }

    const result = await postgres.query(
      `INSERT INTO classrooms (teacher_id, name, description, join_code) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, description, join_code, created_at`,
      [req.user.id, name.trim(), description || null, joinCode]
    );

    res.status(201).json({
      success: true,
      classroom: result.rows[0],
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

/**
 * PUT /api/classrooms/:classroomId
 * Teacher updates a classroom
 */
router.put('/:classroomId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { name, description } = req.body;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(classroomId);

    const result = await postgres.query(
      `UPDATE classrooms SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      success: true,
      classroom: result.rows[0],
    });
  } catch (error) {
    console.error('Update classroom error:', error);
    res.status(500).json({ error: 'Failed to update classroom' });
  }
});

/**
 * DELETE /api/classrooms/:classroomId
 * Teacher deletes a classroom
 */
router.delete('/:classroomId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    await postgres.query('DELETE FROM classrooms WHERE id = $1', [classroomId]);

    res.json({
      success: true,
      message: 'Classroom deleted successfully',
    });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({ error: 'Failed to delete classroom' });
  }
});

/**
 * GET /api/classrooms/:classroomId/members
 * Get classroom members with approval status
 */
router.get('/:classroomId/members', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const result = await postgres.query(
      `SELECT cm.id, s.id as student_id, s.username, cm.status, cm.joined_at, cm.approved_at
       FROM classroom_members cm
       JOIN students s ON cm.student_id = s.id
       WHERE cm.classroom_id = $1
       ORDER BY CASE WHEN cm.status = 'pending' THEN 0 ELSE 1 END, cm.joined_at DESC`,
      [classroomId]
    );

    res.json({
      members: result.rows,
    });
  } catch (error) {
    console.error('Fetch members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * POST /api/classrooms/:classroomId/members/:studentId/approve
 * Teacher approves a student's join request
 */
router.post('/:classroomId/members/:studentId/approve', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    // Update membership status
    const result = await postgres.query(
      `UPDATE classroom_members 
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE classroom_id = $2 AND student_id = $3
       RETURNING *`,
      [req.user.id, classroomId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json({
      success: true,
      membership: result.rows[0],
    });
  } catch (error) {
    console.error('Approve member error:', error);
    res.status(500).json({ error: 'Failed to approve member' });
  }
});

/**
 * POST /api/classrooms/:classroomId/members/:studentId/reject
 * Teacher rejects a student's join request
 */
router.post('/:classroomId/members/:studentId/reject', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    // Update membership status
    const result = await postgres.query(
      `UPDATE classroom_members 
       SET status = 'rejected', approved_by = $1, approved_at = NOW()
       WHERE classroom_id = $2 AND student_id = $3
       RETURNING *`,
      [req.user.id, classroomId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    res.json({
      success: true,
      membership: result.rows[0],
    });
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({ error: 'Failed to reject member' });
  }
});

/**
 * DELETE /api/classrooms/:classroomId/members/:studentId
 * Teacher removes a student from classroom
 */
router.delete('/:classroomId/members/:studentId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    await postgres.query(
      'DELETE FROM classroom_members WHERE classroom_id = $1 AND student_id = $2',
      [classroomId, studentId]
    );

    res.json({
      success: true,
      message: 'Student removed from classroom',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * GET /api/classrooms/:classroomId/exams
 * Get exams in a classroom
 */
router.get('/:classroomId/exams', verifyToken, async (req, res) => {
  try {
    const { classroomId } = req.params;

    // For students: verify they're approved in this classroom
    if (req.user && req.user.userType === 'student') {
      const memberCheck = await postgres.query(
        'SELECT status FROM classroom_members WHERE classroom_id = $1 AND student_id = $2',
        [classroomId, req.user.id]
      );

      if (memberCheck.rows.length === 0 || memberCheck.rows[0].status !== 'approved') {
        return res.status(403).json({ error: 'You do not have access to this classroom' });
      }
    }

    const result = await postgres.query(
      `SELECT e.id, e.title, e.description, e.category, e.duration_seconds, ce.created_at
       FROM classroom_exams ce
       JOIN exams e ON ce.exam_id = e.id
       WHERE ce.classroom_id = $1
       ORDER BY ce.created_at DESC`,
      [classroomId]
    );

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error('Fetch classroom exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

export default router;
