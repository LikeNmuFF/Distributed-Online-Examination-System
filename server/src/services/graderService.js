/**
 * Grader Service - Parallel Answer Grading
 * 
 * Demonstrates: PARALLEL COMPUTING - Data Parallelism with Fork-Join Model
 * 
 * KEY FEATURE: This service grades all questions in parallel using worker_threads.
 * 
 * Traditional (sequential) approach:
 *   For each question:
 *     Check if answer matches key
 *     Total time = question1 + question2 + ... + questionN
 * 
 * Parallel approach (this implementation):
 *   Spawn N worker threads (one per question)
 *   All threads grade simultaneously
 *   Total time = max(question1, question2, ..., questionN)
 * 
 * For 10 questions on a 4-core system:
 *   Sequential: ~10ms (1ms per question)
 *   Parallel: ~3ms (all 10 spread across 4 cores)
 * 
 * This is the FORK-JOIN pattern:
 * - FORK: Create worker threads for each question
 * - PROCESS: All threads work in parallel
 * - JOIN: Collect all results and merge
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRADE_WORKER_PATH = path.join(__dirname, 'gradeWorker.js');

/**
 * Grade all answers in parallel
 * 
 * Spawns one worker thread per question and waits for all to complete.
 * 
 * @param {Array} answers - Student's answers [A, B, C, ...]
 * @param {Array} answerKey - Correct answers [A, B, C, ...]
 * @returns {Promise<Object>} { score, total, breakdown }
 */
export async function gradeParallel(answers, answerKey) {
  const startTime = Date.now();

  try {
    if (answers.length !== answerKey.length) {
      throw new Error('Answer count mismatch');
    }

    // FORK: Create a worker promise for each question
    const workerPromises = answers.map((answer, index) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(GRADE_WORKER_PATH, {
          workerData: {
            answer,
            correct: answerKey[index],
          },
        });

        // Set timeout to prevent hanging workers
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error(`Worker timeout for question ${index + 1}`));
        }, 5000);

        worker.on('message', (result) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            questionIndex: index,
            isCorrect: result.isCorrect,
            studentAnswer: result.answer,
            correctAnswer: result.correct,
          });
        });

        worker.on('error', (error) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(error);
        });
      });
    });

    // JOIN: Wait for all workers to complete
    const breakdown = await Promise.all(workerPromises);

    // Calculate score
    const score = breakdown.reduce((sum, item) => sum + item.isCorrect, 0);
    const total = breakdown.length;

    const duration = Date.now() - startTime;

    console.log(
      `✓ Graded ${total} questions in parallel (${duration}ms, score: ${score}/${total})`
    );

    return {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      breakdown,
      gradingDuration: duration,
    };
  } catch (error) {
    console.error('Parallel grading error:', error);
    throw error;
  }
}

/**
 * Grade answers sequentially (for testing/comparison)
 * Shows why parallel is better
 */
export async function gradeSequential(answers, answerKey) {
  const startTime = Date.now();

  const breakdown = answers.map((answer, index) => ({
    questionIndex: index,
    isCorrect: answer === answerKey[index] ? 1 : 0,
    studentAnswer: answer,
    correctAnswer: answerKey[index],
  }));

  const score = breakdown.reduce((sum, item) => sum + item.isCorrect, 0);
  const total = breakdown.length;
  const duration = Date.now() - startTime;

  console.log(
    `✓ Graded ${total} questions sequentially (${duration}ms, score: ${score}/${total})`
  );

  return {
    score,
    total,
    percentage: Math.round((score / total) * 100),
    breakdown,
    gradingDuration: duration,
  };
}
