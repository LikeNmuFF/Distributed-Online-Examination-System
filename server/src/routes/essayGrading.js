import express from 'express';
import { verifyToken, requireTeacher } from '../middleware/auth.js';
import postgres from '../db/postgres.js';

const router = express.Router();

/**
 * GET /api/essay-grading/pending
 * Fetch all submissions with pending essay answers for the teacher's exams
 */
router.get('/pending', verifyToken, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.user.id;

    const result = await postgres.query(
      `SELECT s.id, s.student_id, s.exam_id, s.answers, s.score, s.total_questions,
              s.submitted_at, s.graded_at,
              st.username AS student_name,
              e.title AS exam_title, e.category
       FROM submissions s
       JOIN students st ON st.id = s.student_id
       JOIN exams e ON e.id = s.exam_id
       JOIN exam_ownership eo ON eo.exam_id = s.exam_id
       WHERE eo.teacher_id = $1
         AND s.answers->'breakdown' @> '[{"isCorrect": "pending"}]'::jsonb
       ORDER BY s.submitted_at DESC`,
      [teacherId]
    );

    const submissions = result.rows.map(row => {
      const answersData = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
      const breakdown = answersData?.breakdown || [];
      const essayQuestions = breakdown.filter(
        b => b.type === 'essay' && b.isCorrect === 'pending'
      );

      return {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        examId: row.exam_id,
        examTitle: row.exam_title,
        category: row.category,
        score: row.score,
        totalQuestions: row.total_questions,
        submittedAt: row.submitted_at,
        gradedAt: row.graded_at,
        breakdown,
        essayQuestions: essayQuestions.map(eq => ({
          questionIndex: eq.questionIndex,
          type: eq.type,
          value: eq.value,
          expected: eq.expected,
        })),
      };
    });

    res.json({ submissions });
  } catch (error) {
    console.error('Fetch pending essays error:', error);
    res.status(500).json({ error: 'Failed to fetch pending essays' });
  }
});

/**
 * POST /api/essay-grading/:submissionId/grade
 * Grade a specific essay question in a submission
 * Body: { questionIndex: number, score: 0 | 1 }
 */
router.post('/:submissionId/grade', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { questionIndex, score } = req.body;

    if (questionIndex === undefined || ![0, 1].includes(score)) {
      return res.status(400).json({ error: 'questionIndex and score (0 or 1) required' });
    }

    const subResult = await postgres.query(
      `SELECT s.*, eo.teacher_id
       FROM submissions s
       JOIN exam_ownership eo ON eo.exam_id = s.exam_id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const sub = subResult.rows[0];
    if (sub.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this exam' });
    }

    const answersData = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
    const breakdown = answersData?.breakdown || [];

    if (!breakdown[questionIndex] || breakdown[questionIndex].type !== 'essay') {
      return res.status(400).json({ error: 'Invalid question index or not an essay question' });
    }

    if (breakdown[questionIndex].isCorrect !== 'pending') {
      return res.status(409).json({ error: 'This essay has already been graded' });
    }

    breakdown[questionIndex].isCorrect = score;
    breakdown[questionIndex].gradedBy = req.user.id;
    breakdown[questionIndex].gradedAt = new Date().toISOString();

    answersData.breakdown = breakdown;

    const newScore = breakdown.reduce((sum, b) => {
      if (b.isCorrect === 'pending') return sum;
      return sum + (b.isCorrect || 0);
    }, 0);
    const hasPending = breakdown.some(b => b.isCorrect === 'pending');

    await postgres.query(
      `UPDATE submissions
       SET answers = $1, score = $2, graded_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(answersData), newScore, submissionId]
    );

    res.json({
      success: true,
      score: newScore,
      totalQuestions: sub.total_questions,
      gradedBy: req.user.id,
      gradedAt: new Date().toISOString(),
      pendingRemaining: hasPending,
    });
  } catch (error) {
    console.error('Grade essay error:', error);
    res.status(500).json({ error: 'Failed to grade essay' });
  }
});

export default router;
