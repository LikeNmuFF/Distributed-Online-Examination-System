import express from 'express';
import { verifyToken, requireTeacher, requireStudent } from '../middleware/auth.js';
import { requireOwnsExam, requireCanAccessExam } from '../middleware/authorization.js';
import postgres from '../db/postgres.js';

const router = express.Router();

/**
 * POST /api/exams/teacher/create
 * Teacher creates a new exam and sets ownership
 */
router.post('/teacher/create', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { title, description, category, duration_seconds, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question required' });
    }

    // Create exam
    const examResult = await postgres.query(
      'INSERT INTO exams (title, description, category, duration_seconds) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, description || '', category || 'quiz', duration_seconds || 1800]
    );

    const examId = examResult.rows[0].id;

    // Insert questions
    for (const q of questions) {
      const questionType = q.question_type || 'multiple_choice';
      if (questionType === 'multiple_choice') {
        await postgres.query(
          `INSERT INTO questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_option)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [examId, q.question_text, questionType, q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || '', q.correct_option || 'A']
        );
      } else {
        await postgres.query(
          `INSERT INTO questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_option, options_json, correct_answer)
           VALUES ($1, $2, $3, '', '', '', '', '', $4, $5)`,
          [examId, q.question_text, questionType, JSON.stringify(q.options_json || {}), JSON.stringify(q.correct_answer)]
        );
      }
    }

    // Set teacher ownership
    await postgres.query(
      'INSERT INTO exam_ownership (exam_id, teacher_id) VALUES ($1, $2)',
      [examId, req.user.id]
    );

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

/**
 * PUT /api/exams/:examId
 * Teacher updates their exam
 */
router.put('/:examId', verifyToken, requireTeacher, requireOwnsExam, async (req, res) => {
  try {
    const examId = req.params.examId;
    const { title, description, duration_seconds } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (duration_seconds !== undefined) {
      updates.push(`duration_seconds = $${paramCount}`);
      values.push(duration_seconds);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(examId);

    const result = await postgres.query(
      `UPDATE exams SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      success: true,
      exam: result.rows[0],
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

/**
 * DELETE /api/exams/:examId
 * Teacher deletes their exam
 */
router.delete('/:examId', verifyToken, requireTeacher, requireOwnsExam, async (req, res) => {
  try {
    const examId = req.params.examId;

    await postgres.query('DELETE FROM exams WHERE id = $1', [examId]);

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

/**
 * POST /api/exams/:examId/add-to-classroom/:classroomId
 * Teacher adds exam to one of their classrooms
 */
router.post('/:examId/add-to-classroom/:classroomId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { examId, classroomId } = req.params;

    // Auto-assign ownership if not already owned
    await postgres.query(
      'INSERT INTO exam_ownership (exam_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [examId, req.user.id]
    );

    // Verify teacher owns the classroom
    const classroomOwner = await postgres.query(
      'SELECT teacher_id FROM classrooms WHERE id = $1',
      [classroomId]
    );

    if (classroomOwner.rows.length === 0 || classroomOwner.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    // Add exam to classroom
    const result = await postgres.query(
      'INSERT INTO classroom_exams (classroom_id, exam_id) VALUES ($1, $2) RETURNING *',
      [classroomId, examId]
    );

    res.status(201).json({
      success: true,
      assignment: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This exam is already in the classroom' });
    }
    console.error('Add exam to classroom error:', error);
    res.status(500).json({ error: 'Failed to add exam to classroom' });
  }
});

/**
 * DELETE /api/exams/:examId/remove-from-classroom/:classroomId
 * Teacher removes exam from classroom
 */
router.delete('/:examId/remove-from-classroom/:classroomId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { examId, classroomId } = req.params;

    // Verify teacher owns the classroom
    const classroomOwner = await postgres.query(
      'SELECT teacher_id FROM classrooms WHERE id = $1',
      [classroomId]
    );

    if (classroomOwner.rows.length === 0 || classroomOwner.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    await postgres.query(
      'DELETE FROM classroom_exams WHERE classroom_id = $1 AND exam_id = $2',
      [classroomId, examId]
    );

    res.json({
      success: true,
      message: 'Exam removed from classroom',
    });
  } catch (error) {
    console.error('Remove exam from classroom error:', error);
    res.status(500).json({ error: 'Failed to remove exam from classroom' });
  }
});

/**
 * GET /api/exams/teacher/list
 * Returns ALL exams for teachers to browse when adding to classrooms
 */
router.get('/teacher/list', verifyToken, requireTeacher, async (req, res) => {
  try {
    const result = await postgres.query(
       `SELECT e.id, e.title, e.description, e.category, e.duration_seconds, e.created_at,
              COUNT(q.id)::int AS question_count,
              COUNT(ce.id)::int AS classroom_count
       FROM exams e
       LEFT JOIN questions q ON q.exam_id = e.id
       LEFT JOIN classroom_exams ce ON e.id = ce.exam_id
       GROUP BY e.id
       ORDER BY e.created_at DESC`
    );

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error('Get teacher exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

export default router;
