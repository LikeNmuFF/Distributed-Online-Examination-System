import express from 'express';
import postgres from '../db/postgres.js';

const router = express.Router();

/**
 * GET /api/scoreboard
 * Public endpoint - no auth required
 * Returns all student scores organized by classroom and exam
 */
router.get('/', async (req, res) => {
  try {
    const classroomFilter = req.query.classroom;
    const examFilter = req.query.exam;

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (classroomFilter) {
      conditions.push(`c.id = $${paramIndex}`);
      params.push(classroomFilter);
      paramIndex++;
    }

    if (examFilter) {
      conditions.push(`e.id = $${paramIndex}`);
      params.push(examFilter);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await postgres.query(
      `SELECT 
        s.id as student_id,
        s.username as student_name,
        c.id as classroom_id,
        c.name as classroom_name,
        e.id as exam_id,
        e.title as exam_title,
        sub.score,
        sub.total_questions,
        ROUND((sub.score::float / NULLIF(sub.total_questions, 0) * 100)::numeric, 1) as percentage,
        sub.submitted_at,
        sub.graded_at,
        t.username as teacher_name
       FROM submissions sub
       JOIN students s ON sub.student_id = s.id
       JOIN classroom_members cm ON s.id = cm.student_id AND cm.status = 'approved'
       JOIN classrooms c ON cm.classroom_id = c.id
       JOIN classroom_exams ce ON c.id = ce.classroom_id AND ce.exam_id = sub.exam_id
       JOIN exams e ON sub.exam_id = e.id
       JOIN teachers t ON c.teacher_id = t.id
       ${whereClause}
       ORDER BY c.name, e.title, percentage DESC`,
      params
    );

    res.json({
      scores: result.rows,
    });
  } catch (error) {
    console.error('Scoreboard error:', error);
    res.status(500).json({ error: 'Failed to fetch scoreboard' });
  }
});

/**
 * GET /api/scoreboard/classrooms
 * Public - lists all classrooms with stats for filtering
 */
router.get('/classrooms', async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT 
        c.id,
        c.name,
        t.username as teacher_name,
        COUNT(DISTINCT cm.student_id) as student_count,
        COUNT(DISTINCT ce.exam_id) as exam_count,
        COUNT(DISTINCT sub.id) as submission_count
       FROM classrooms c
       JOIN teachers t ON c.teacher_id = t.id
       LEFT JOIN classroom_members cm ON c.id = cm.classroom_id AND cm.status = 'approved'
       LEFT JOIN classroom_exams ce ON c.id = ce.classroom_id
       LEFT JOIN submissions sub ON ce.exam_id = sub.exam_id
       GROUP BY c.id, t.id
       ORDER BY c.name`
    );

    res.json({
      classrooms: result.rows,
    });
  } catch (error) {
    console.error('Scoreboard classrooms error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

/**
 * GET /api/scoreboard/exams
 * Public - lists all exams with stats for filtering
 */
router.get('/exams', async (req, res) => {
  try {
    const result = await postgres.query(
      `SELECT 
        e.id,
        e.title,
        COUNT(DISTINCT sub.id) as submission_count,
        ROUND(AVG(sub.score::float / NULLIF(sub.total_questions, 0) * 100)::numeric, 1) as avg_percentage
       FROM exams e
       LEFT JOIN submissions sub ON e.id = sub.exam_id
       GROUP BY e.id
       ORDER BY e.title`
    );

    res.json({
      exams: result.rows,
    });
  } catch (error) {
    console.error('Scoreboard exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

export default router;
