import express from 'express';
import bcryptjs from 'bcryptjs';
import pool from '../db/redis.js';
import postgres from '../db/postgres.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await postgres.query(
      'SELECT id, username, password_hash, is_admin FROM students WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const student = result.rows[0];

    const passwordMatch = await bcryptjs.compare(password, student.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(student.id, student.username, 'student', student.is_admin);

    res.json({
      success: true,
      token,
      user: {
        id: student.id,
        username: student.username,
        isAdmin: student.is_admin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const existing = await postgres.query(
      'SELECT id FROM students WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    const result = await postgres.query(
      'INSERT INTO students (username, password_hash, is_admin) VALUES ($1, $2, FALSE) RETURNING id, username, is_admin',
      [username, passwordHash]
    );

    const student = result.rows[0];
    const token = generateToken(student.id, student.username, 'student', false);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: student.id,
        username: student.username,
        isAdmin: false,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await postgres.query(
      'SELECT id, username, is_admin FROM students WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        isAdmin: result.rows[0].is_admin,
        userType: 'student',
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

export default router;
