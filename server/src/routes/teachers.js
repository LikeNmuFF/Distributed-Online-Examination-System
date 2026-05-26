import express from 'express';
import postgres from '../db/postgres.js';
import { verifyToken, requireTeacher, generateToken } from '../middleware/auth.js';
import bcryptjs from 'bcryptjs';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/teachers/register
 * Register a new teacher account
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if username already exists in teachers table
    const existing = await postgres.query(
      'SELECT id FROM teachers WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    const result = await postgres.query(
      'INSERT INTO teachers (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, passwordHash, email || null]
    );

    const teacher = result.rows[0];
    const token = generateToken(teacher.id, teacher.username, 'teacher', false);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: teacher.id,
        username: teacher.username,
        email: teacher.email,
        userType: 'teacher',
      },
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/teachers/login
 * Login teacher account
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await postgres.query(
      'SELECT id, username, password_hash, email FROM teachers WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const teacher = result.rows[0];

    const passwordMatch = await bcryptjs.compare(password, teacher.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(teacher.id, teacher.username, 'teacher', false);

    res.json({
      success: true,
      token,
      user: {
        id: teacher.id,
        username: teacher.username,
        email: teacher.email,
        userType: 'teacher',
      },
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/teachers/me
 * Get current teacher profile
 */
router.get('/me', verifyToken, requireTeacher, async (req, res) => {
  try {
    const result = await postgres.query(
      'SELECT id, username, email FROM teachers WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        userType: 'teacher',
      },
    });
  } catch (error) {
    console.error('Teacher me error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher info' });
  }
});

/**
 * GET /api/teachers/classrooms
 * Get all classrooms for current teacher
 */
router.get('/classrooms', verifyToken, requireTeacher, async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT c.id, c.name, c.description, c.join_code, c.created_at,
              COUNT(cm.id) as member_count,
              SUM(CASE WHEN cm.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
              SUM(CASE WHEN cm.status = 'pending' THEN 1 ELSE 0 END) as pending_count
       FROM classrooms c
       LEFT JOIN classroom_members cm ON c.id = cm.classroom_id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({
      classrooms: result.rows,
    });
  } catch (error) {
    console.error('Fetch classrooms error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

/**
 * GET /api/teachers/classrooms/:classroomId
 * Get specific classroom with detailed member list
 */
router.get('/classrooms/:classroomId', verifyToken, requireTeacher, async (req, res) => {
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

    const classroom = classroomCheck.rows[0];

    // Get members
    const membersResult = await postgres.query(
      `SELECT cm.id, s.id as student_id, s.username, cm.status, cm.joined_at, cm.approved_at
       FROM classroom_members cm
       JOIN students s ON cm.student_id = s.id
       WHERE cm.classroom_id = $1
       ORDER BY cm.status DESC, cm.joined_at DESC`,
      [classroomId]
    );

    // Get exams in classroom
    const examsResult = await postgres.query(
      `SELECT e.id, e.title, e.description, e.category, e.duration_seconds, ce.created_at,
              COUNT(q.id)::int AS question_count
       FROM classroom_exams ce
       JOIN exams e ON ce.exam_id = e.id
       LEFT JOIN questions q ON q.exam_id = e.id
       WHERE ce.classroom_id = $1
       GROUP BY e.id, ce.created_at
       ORDER BY ce.created_at DESC`,
      [classroomId]
    );

    res.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        description: classroom.description,
        join_code: classroom.join_code,
        created_at: classroom.created_at,
      },
      members: membersResult.rows,
      exams: examsResult.rows,
    });
  } catch (error) {
    console.error('Fetch classroom error:', error);
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
});

export default router;
