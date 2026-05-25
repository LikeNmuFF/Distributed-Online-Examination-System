import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import postgres from '../db/postgres.js';
import redis from '../db/redis.js';
import { startTimer } from '../services/timerService.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT e.id, e.title, e.description, e.category, e.duration_seconds,
       COUNT(q.id)::int AS question_count
       FROM exams e
       LEFT JOIN questions q ON q.exam_id = e.id
       GROUP BY e.id
       ORDER BY e.id ASC`
    );

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const examId = parseInt(req.params.id);

    const examResult = await postgres.query(
      'SELECT id, title, description, category, duration_seconds FROM exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];

    const questionsResult = await postgres.query(
      `SELECT id, question_text, question_type, option_a, option_b, option_c, option_d,
              options_json, correct_answer
       FROM questions WHERE exam_id = $1 ORDER BY id ASC`,
      [examId]
    );

    const questions = questionsResult.rows.map(q => ({
      ...q,
      options_json: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json,
      correct_answer: q.correct_answer ? (typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer) : null,
    }));

    res.json({
      exam,
      questions,
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

router.post('/create', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, duration_seconds, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question required' });
    }

    const examResult = await postgres.query(
      'INSERT INTO exams (title, description, category, duration_seconds) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, description || '', category || 'quiz', duration_seconds || 1800]
    );

    const examId = examResult.rows[0].id;

    for (const q of questions) {
      const questionType = q.question_type || 'multiple_choice';
      if (questionType === 'multiple_choice') {
        await postgres.query(
          `INSERT INTO questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_option)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [examId, q.question_text, questionType, q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || '', q.correct_option || 'A']
        );
      } else {
        const correctAnswer = questionType === 'true_false'
          ? q.correct_option || 'true'
          : (q.correct_answer || []);
        await postgres.query(
          `INSERT INTO questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_option, options_json, correct_answer)
           VALUES ($1, $2, $3, '', '', '', '', '', $4, $5)`,
          [examId, q.question_text, questionType, JSON.stringify(q.options_json || {}), JSON.stringify(correctAnswer)]
        );
      }
    }

    res.status(201).json({
      success: true,
      examId,
      message: 'Exam created successfully',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An exam with this title already exists' });
    }
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const studentId = req.user.id;
    const nodeId = process.env.NODE_ID || 'unknown';

    // For students, verify they have access to this exam through a classroom
    if (req.user.userType === 'student') {
      const accessCheck = await postgres.query(
        `SELECT ce.exam_id 
         FROM classroom_exams ce
         JOIN classroom_members cm ON ce.classroom_id = cm.classroom_id
         WHERE ce.exam_id = $1 AND cm.student_id = $2 AND cm.status = 'approved'`,
        [examId, studentId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this exam. Join a classroom with this exam first.' });
      }
    }

    const examResult = await postgres.query(
      'SELECT id, duration_seconds FROM exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examResult.rows[0];

    const existingSession = await redis.hgetall(
      `session:${studentId}:${examId}`
    );

    if (existingSession && existingSession.status === 'active') {
      return res.json({
        sessionId: existingSession.sessionId,
        nodeId: existingSession.nodeId,
        durationSeconds: exam.duration_seconds,
      });
    }

    const sessionId = `${studentId}_${examId}_${Date.now()}`;

    await redis.hset(`session:${studentId}:${examId}`, {
      sessionId,
      studentId,
      examId,
      nodeId,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    await redis.expire(
      `session:${studentId}:${examId}`,
      exam.duration_seconds + 3600
    );

    await startTimer(sessionId, exam.duration_seconds);

    res.json({
      sessionId,
      nodeId,
      durationSeconds: exam.duration_seconds,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  }
});

export default router;
