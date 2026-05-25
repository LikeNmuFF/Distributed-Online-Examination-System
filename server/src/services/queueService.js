/**
 * Queue Service - Bull-based Async Submission Processing
 * 
 * Demonstrates: Asynchronous Parallel Processing & Message Queue Pattern
 * 
 * WHY QUEUES?
 * - Submissions can arrive faster than we can grade them
 * - Queue prevents lost submissions and overload
 * - Decouples submission from grading
 * - Enables parallel grading of multiple submissions
 * - Survives node crashes (persisted in Redis)
 * 
 * FLOW:
 * 1. Student submits exam -> add to queue -> return jobId
 * 2. Queue processor grades in parallel -> save results
 * 3. Student polls jobId for status -> get results
 */

import Queue from 'bull';
import redis from '../db/redis.js';
import postgres from '../db/postgres.js';
import { gradeParallel } from './graderService.js';
import { endSession, deleteSession } from './sessionService.js';

// Create Bull queue for exam submissions
const submissionQueue = new Queue('exam-submissions', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: false,
  },
});

/**
 * Process submissions from the queue
 * 
 * Demonstrates: Parallel grading + persistent result storage
 */
submissionQueue.process(async (job) => {
  const { studentId, examId, answers, nodeId, sessionId } = job.data;

  try {
    console.log(`🔄 Processing submission ${job.id}: student ${studentId}, exam ${examId}`);

    // Fetch answer key from database
    const result = await postgres.query(
      `SELECT id, correct_option FROM questions WHERE exam_id = $1 ORDER BY id ASC`,
      [examId]
    );

    const answerKey = result.rows.map((row) => row.correct_option);

    // PARALLEL GRADING: Grade all answers concurrently
    const gradeResult = await gradeParallel(answers, answerKey);

    // Save submission results to database
    const insertResult = await postgres.query(
      `INSERT INTO submissions (student_id, exam_id, answers, score, total_questions, graded_at, node_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (student_id, exam_id) DO UPDATE 
       SET answers = $3, score = $4, total_questions = $5, graded_at = NOW(), node_id = $6
       RETURNING id, score, total_questions`,
      [
        studentId,
        examId,
        JSON.stringify({ answers, breakdown: gradeResult.breakdown }),
        gradeResult.score,
        gradeResult.total,
        nodeId,
      ]
    );

    // End session
    await endSession(studentId, examId);

    console.log(
      `✓ Submission graded: student ${studentId}, score ${gradeResult.score}/${gradeResult.total}`
    );

    return {
      submissionId: insertResult.rows[0].id,
      score: gradeResult.score,
      total: gradeResult.total,
      percentage: gradeResult.percentage,
      gradingDuration: gradeResult.gradingDuration,
      breakdown: gradeResult.breakdown,
    };
  } catch (error) {
    console.error(`✗ Failed to process submission ${job.id}:`, error);
    throw error;
  }
});

/**
 * Event handlers
 */
submissionQueue.on('completed', (job) => {
  console.log(`✓ Job completed: ${job.id}`);
});

submissionQueue.on('failed', (job, err) => {
  console.error(`✗ Job failed: ${job.id}, error: ${err.message}`);
});

/**
 * Add a submission to the queue
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 * @param {Array} answers - Student's answers
 * @param {string} nodeId - Node ID processing the submission
 * @param {string} sessionId - Session ID
 * @returns {Promise<string>} Job ID
 */
export async function addSubmission(
  studentId,
  examId,
  answers,
  nodeId,
  sessionId
) {
  try {
    const job = await submissionQueue.add(
      {
        studentId,
        examId,
        answers,
        nodeId,
        sessionId,
      },
      {
        jobId: `submission-${studentId}-${examId}-${Date.now()}`,
      }
    );

    console.log(`📤 Submission queued: job ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('Failed to queue submission:', error);
    throw error;
  }
}

/**
 * Get job status
 * 
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
export async function getJobStatus(jobId) {
  try {
    const job = await submissionQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;

    return {
      jobId,
      state,
      progress,
      result,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    };
  } catch (error) {
    console.error(`Failed to get job status: ${jobId}`, error);
    throw error;
  }
}

/**
 * Remove old jobs from queue (cleanup)
 */
export async function cleanupQueue() {
  try {
    const completedCount = await submissionQueue.clean(60000, 'completed'); // Keep 1 min
    const failedCount = await submissionQueue.clean(3600000, 'failed'); // Keep 1 hour
    console.log(`🧹 Cleaned up queue: ${completedCount} completed, ${failedCount} failed`);
  } catch (error) {
    console.error('Failed to cleanup queue:', error);
  }
}

export default submissionQueue;
