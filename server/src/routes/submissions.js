/**
 * Submissions Routes
 * 
 * POST /api/submissions/exams/:id/submit - Submit exam answers
 * GET /api/submissions/:jobId/status - Poll job status
 * GET /api/submissions/my - List student's graded submissions
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';
import postgres from '../db/postgres.js';
import {
  addSubmission,
  getJobStatus,
} from '../services/queueService.js';
import {
  getRemainingTime,
  isExpired,
} from '../services/timerService.js';
import {
  getSession,
  deleteSession,
} from '../services/sessionService.js';

const router = express.Router();

/**
 * POST /api/submissions/exams/:id/submit
 * 
 * Demonstrates: Message Queue Pattern + Async Processing
 * 
 * When a student submits:
 * 1. Verify timer hasn't expired
 * 2. Check no duplicate submission
 * 3. Add to Bull queue for grading
 * 4. Return job ID for polling
 * 
 * Queue processor will:
 * 1. Grade answers in parallel (worker_threads)
 * 2. Save results to database
 * 3. Update job status
 */
router.post('/exams/:id/submit', verifyToken, submissionLimiter, async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    const studentId = req.user.id;
    const { answers, sessionId } = req.body;
    const nodeId = process.env.NODE_ID || 'unknown';

    // Validate input
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Check session exists and is active
    const session = await getSession(studentId, examId);
    if (!session || session.status !== 'active') {
      return res.status(400).json({ error: 'No active exam session' });
    }

    // Check timer hasn't expired
    const remaining = await getRemainingTime(sessionId);
    if (remaining === 0) {
      return res.status(400).json({ error: 'Exam time is up' });
    }

    // Check no duplicate submission
    const existingResult = await postgres.query(
      'SELECT id FROM submissions WHERE student_id = $1 AND exam_id = $2',
      [studentId, examId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Submission already exists for this exam' });
    }

    // Add to queue
    const jobId = await addSubmission(
      studentId,
      examId,
      answers,
      nodeId,
      sessionId
    );

    res.json({
      success: true,
      jobId,
      message: 'Exam submitted for grading. Poll the job status to see results.',
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

/**
 * GET /api/submissions/:jobId/status
 * 
 * Poll the job status to check if grading is complete
 * Client polls this endpoint every 500ms until status = 'completed'
 */
router.get('/:jobId/status', verifyToken, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(jobStatus);
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

/**
 * GET /api/submissions/my
 * 
 * List all graded submissions for the current student
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await postgres.query(
      `SELECT id, exam_id, score, total_questions, submitted_at, graded_at, node_id
       FROM submissions 
       WHERE student_id = $1 
       ORDER BY submitted_at DESC
       LIMIT 50`,
      [studentId]
    );

    const submissions = result.rows.map((row) => ({
      id: row.id,
      examId: row.exam_id,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: row.score && row.total_questions 
        ? Math.round((row.score / row.total_questions) * 100)
        : null,
      submittedAt: row.submitted_at,
      gradedAt: row.graded_at,
      nodeId: row.node_id,
    }));

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;
