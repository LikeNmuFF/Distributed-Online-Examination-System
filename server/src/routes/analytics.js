import express from 'express';
import { verifyToken, requireTeacher, requireStudent } from '../middleware/auth.js';
import postgres from '../db/postgres.js';

const router = express.Router();

/**
 * GET /api/analytics/classrooms/:classroomId/performance
 * Teacher views class performance summary
 */
router.get('/classrooms/:classroomId/performance', verifyToken, requireTeacher, async (req, res) => {
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

    // Get class statistics
    const statsResult = await postgres.query(
      `SELECT 
        COUNT(DISTINCT cm.student_id) as total_students,
        COUNT(DISTINCT CASE WHEN cm.status = 'approved' THEN cm.student_id END) as approved_students,
        COUNT(DISTINCT ce.exam_id) as total_exams
       FROM classroom_members cm
       LEFT JOIN classroom_exams ce ON cm.classroom_id = ce.classroom_id
       WHERE cm.classroom_id = $1`,
      [classroomId]
    );

    // Get exam performance
    const examPerformance = await postgres.query(
      `SELECT 
        e.id,
        e.title,
        COUNT(DISTINCT s.id) as students_attempted,
        AVG(s.score::float / s.total_questions * 100) as average_score,
        MIN(s.score::float / s.total_questions * 100) as min_score,
        MAX(s.score::float / s.total_questions * 100) as max_score,
        COUNT(CASE WHEN s.score::float / s.total_questions >= 0.5 THEN 1 END) as pass_count
       FROM classroom_exams ce
       JOIN exams e ON ce.exam_id = e.id
       LEFT JOIN submissions s ON e.id = s.exam_id
       LEFT JOIN classroom_members cm ON cm.classroom_id = $1 AND cm.student_id = s.student_id AND cm.status = 'approved'
       WHERE ce.classroom_id = $1
       GROUP BY e.id, e.title
       ORDER BY e.id`,
      [classroomId]
    );

    res.json({
      statistics: statsResult.rows[0],
      examPerformance: examPerformance.rows,
    });
  } catch (error) {
    console.error('Get class performance error:', error);
    res.status(500).json({ error: 'Failed to fetch class performance' });
  }
});

/**
 * GET /api/analytics/classrooms/:classroomId/exam/:examId/results
 * Teacher views detailed results for an exam in a classroom
 */
router.get('/classrooms/:classroomId/exam/:examId/results', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { classroomId, examId } = req.params;

    // Verify teacher owns this classroom
    const classroomCheck = await postgres.query(
      'SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );

    if (classroomCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    // Get exam info
    const examResult = await postgres.query(
      'SELECT * FROM exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Get student results for this exam from this classroom
    const resultsResult = await postgres.query(
      `SELECT 
        s.id as student_id,
        s.username,
        sub.id as submission_id,
        sub.score,
        sub.total_questions,
        (sub.score::float / sub.total_questions * 100) as percentage,
        sub.submitted_at,
        sub.graded_at
       FROM submissions sub
       JOIN students s ON sub.student_id = s.id
       JOIN classroom_members cm ON s.id = cm.student_id
       WHERE sub.exam_id = $1 
       AND cm.classroom_id = $2 
       AND cm.status = 'approved'
       ORDER BY sub.submitted_at DESC`,
      [examId, classroomId]
    );

    res.json({
      exam: examResult.rows[0],
      results: resultsResult.rows,
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ error: 'Failed to fetch exam results' });
  }
});

/**
 * GET /api/analytics/student/performance
 * Student views their performance summary
 */
router.get('/student/performance', verifyToken, requireStudent, async (req, res) => {
  try {
    // Get student's overall performance
    const overallResult = await postgres.query(
      `SELECT 
        COUNT(DISTINCT classroom_id) as classrooms_enrolled,
        COUNT(DISTINCT exam_id) as exams_completed,
        AVG(score::float / total_questions * 100) as average_score
       FROM submissions
       WHERE student_id = $1`,
      [req.user.id]
    );

    // Get performance by classroom
    const byClassroomResult = await postgres.query(
      `SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT ce.exam_id) as exams_in_classroom,
        COUNT(DISTINCT sub.id) as exams_taken,
        AVG(sub.score::float / sub.total_questions * 100) as average_score
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.id
       LEFT JOIN classroom_exams ce ON c.id = ce.classroom_id
       LEFT JOIN submissions sub ON ce.exam_id = sub.exam_id AND sub.student_id = $1
       WHERE cm.student_id = $1 AND cm.status = 'approved'
       GROUP BY c.id, c.name
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    // Get recent submissions
    const recentResult = await postgres.query(
      `SELECT 
        sub.id,
        sub.exam_id,
        e.title as exam_title,
        sub.score,
        sub.total_questions,
        (sub.score::float / sub.total_questions * 100) as percentage,
        sub.submitted_at
       FROM submissions sub
       JOIN exams e ON sub.exam_id = e.id
       WHERE sub.student_id = $1
       ORDER BY sub.submitted_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({
      overall: overallResult.rows[0],
      byClassroom: byClassroomResult.rows,
      recentSubmissions: recentResult.rows,
    });
  } catch (error) {
    console.error('Get student performance error:', error);
    res.status(500).json({ error: 'Failed to fetch student performance' });
  }
});

/**
 * GET /api/analytics/student/exams/:examId
 * Student views their detailed performance on an exam
 */
router.get('/student/exams/:examId', verifyToken, requireStudent, async (req, res) => {
  try {
    const { examId } = req.params;

    // Get submission details
    const submissionResult = await postgres.query(
      `SELECT 
        sub.id,
        sub.score,
        sub.total_questions,
        (sub.score::float / sub.total_questions * 100) as percentage,
        sub.submitted_at,
        sub.graded_at,
        sub.answers
       FROM submissions sub
       WHERE sub.exam_id = $1 AND sub.student_id = $2
       LIMIT 1`,
      [examId, req.user.id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No submission found for this exam' });
    }

    const submission = submissionResult.rows[0];

    // Get exam and questions
    const examResult = await postgres.query(
      `SELECT id, title, description, duration_seconds FROM exams WHERE id = $1`,
      [examId]
    );

    const questionsResult = await postgres.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option
       FROM questions WHERE exam_id = $1 ORDER BY id ASC`,
      [examId]
    );

    // Calculate details per question
    const answers = submission.answers || {};
    const questionDetails = questionsResult.rows.map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      },
      correct_option: q.correct_option,
      student_answer: answers[q.id] || null,
      is_correct: answers[q.id] === q.correct_option,
    }));

    res.json({
      exam: examResult.rows[0],
      submission: {
        id: submission.id,
        score: submission.score,
        total_questions: submission.total_questions,
        percentage: submission.percentage,
        submitted_at: submission.submitted_at,
        graded_at: submission.graded_at,
      },
      questions: questionDetails,
    });
  } catch (error) {
    console.error('Get exam details error:', error);
    res.status(500).json({ error: 'Failed to fetch exam details' });
  }
});

export default router;
