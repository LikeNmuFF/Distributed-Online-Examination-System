/**
 * Grade Worker Thread
 * 
 * Demonstrates: Parallel Computing - Data Parallelism
 * 
 * This worker runs in a separate thread and grades a single question.
 * Multiple workers run concurrently, one per question.
 * This is the Fork-Join model: fork workers for each question, join results.
 * 
 * Running one thread per question allows true parallelism on multi-core systems.
 */

import { workerData, parentPort } from 'worker_threads';

// Destructure worker data
const { answer, correct } = workerData;

// Grade the answer
const isCorrect = answer === correct ? 1 : 0;

// Send result back to parent thread
parentPort.postMessage({
  isCorrect,
  answer,
  correct,
});
