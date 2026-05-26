/**
 * Student Online Status Routes
 * 
 * Tracks which students are currently online/taking exams in classrooms.
 * Teachers can see real-time status of all their students.
 */

import express from 'express';
import pool from '../db/postgres.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/student-status/join-classroom
 * Register student as online in classroom
 * 
 * Body: {
 *   classroomId: number,
 *   sessionId: string (unique session identifier)
 * }
 */
router.post('/join-classroom', verifyToken, async (req, res) => {
  const { classroomId, sessionId } = req.body;
  const studentId = req.user.id;

  if (!classroomId || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Check if student is approved member
      const memberCheck = await client.query(
        `SELECT 1 FROM classroom_members 
         WHERE classroom_id = $1 AND student_id = $2 AND status = 'approved'`,
        [classroomId, studentId]
      );

      if (memberCheck.rows.length === 0) {
        client.release();
        return res.status(403).json({ error: 'Not an approved member of this classroom' });
      }

      // Insert or update session
      await client.query(
        `INSERT INTO classroom_student_sessions (classroom_id, student_id, session_id, status)
         VALUES ($1, $2, $3, 'online')
         ON CONFLICT (session_id) DO UPDATE SET 
           last_activity = NOW(),
           status = EXCLUDED.status`,
        [classroomId, studentId, sessionId]
      );

      client.release();
      res.json({ success: true, message: 'Joined classroom' });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({ error: 'Failed to join classroom' });
  }
});

/**
 * POST /api/student-status/leave-classroom
 * Unregister student from classroom
 * 
 * Body: {
 *   sessionId: string
 * }
 */
router.post('/leave-classroom', verifyToken, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session ID' });
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query(
        `DELETE FROM classroom_student_sessions WHERE session_id = $1`,
        [sessionId]
      );

      client.release();
      res.json({ success: true, message: 'Left classroom' });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Leave classroom error:', error);
    res.status(500).json({ error: 'Failed to leave classroom' });
  }
});

/**
 * POST /api/student-status/start-exam
 * Mark student as taking an exam
 * 
 * Body: {
 *   classroomId: number,
 *   sessionId: string,
 *   examId: number
 * }
 */
router.post('/start-exam', verifyToken, async (req, res) => {
  const { classroomId, sessionId, examId } = req.body;
  const studentId = req.user.id;

  if (!classroomId || !sessionId || !examId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Update session status
      await client.query(
        `UPDATE classroom_student_sessions 
         SET status = 'taking_exam', exam_id = $2, last_activity = NOW()
         WHERE classroom_id = $1 AND student_id = $3 AND session_id = $4`,
        [classroomId, examId, studentId, sessionId]
      );

      client.release();
      res.json({ success: true, message: 'Exam started' });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  }
});

/**
 * POST /api/student-status/end-exam
 * Mark student as no longer taking an exam
 * 
 * Body: {
 *   sessionId: string
 * }
 */
router.post('/end-exam', verifyToken, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session ID' });
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE classroom_student_sessions 
         SET status = 'online', exam_id = NULL, last_activity = NOW()
         WHERE session_id = $1`,
        [sessionId]
      );

      client.release();
      res.json({ success: true, message: 'Exam ended' });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('End exam error:', error);
    res.status(500).json({ error: 'Failed to end exam' });
  }
});

/**
 * GET /api/student-status/classroom/:classroomId
 * Get all online students in a classroom (teacher only)
 */
router.get('/classroom/:classroomId', verifyToken, async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;

  try {
    const client = await pool.connect();
    
    try {
      // Check if user is the teacher
      const teacherCheck = await client.query(
        `SELECT 1 FROM classrooms WHERE id = $1 AND teacher_id = $2`,
        [classroomId, userId]
      );

      if (teacherCheck.rows.length === 0) {
        client.release();
        return res.status(403).json({ error: 'Not the teacher of this classroom' });
      }

      // Get all online students
      const result = await client.query(
        `SELECT css.id, css.student_id, css.status, css.exam_id, css.joined_at, 
                css.last_activity, s.username, e.title as exam_title
         FROM classroom_student_sessions css
         JOIN students s ON css.student_id = s.id
         LEFT JOIN exams e ON css.exam_id = e.id
         WHERE css.classroom_id = $1 AND css.status IN ('online', 'taking_exam')
         ORDER BY css.joined_at DESC`,
        [classroomId]
      );

      client.release();
      res.json({ success: true, onlineStudents: result.rows });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Get online students error:', error);
    res.status(500).json({ error: 'Failed to fetch online students' });
  }
});

/**
 * POST /api/student-status/heartbeat
 * Update last activity timestamp (keeps session alive)
 * 
 * Body: {
 *   sessionId: string
 * }
 */
router.post('/heartbeat', verifyToken, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session ID' });
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query(
        `UPDATE classroom_student_sessions 
         SET last_activity = NOW()
         WHERE session_id = $1`,
        [sessionId]
      );

      client.release();
      res.json({ success: true });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

export default router;
