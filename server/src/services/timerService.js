/**
 * Distributed Timer Service
 * 
 * Demonstrates: Distributed Synchronization & Shared State
 * 
 * Stores exam end-times in Redis so ALL nodes see the same clock.
 * Prevents cheating by:
 * 1. Making timer state shared across all nodes
 * 2. Syncing via Socket.IO every second
 * 3. Preventing students from switching nodes to reset timer
 * 
 * Redis acts as the "source of truth" for exam time.
 */

import redis from '../db/redis.js';

/**
 * Start a timer for an exam session
 * 
 * @param {string} sessionId - Unique exam session identifier
 * @param {number} durationSeconds - Exam duration in seconds
 */
export async function startTimer(sessionId, durationSeconds) {
  try {
    const endTime = Date.now() + durationSeconds * 1000;
    
    // Store end time in Redis with TTL = duration + 2 minutes buffer
    await redis.set(
      `timer:${sessionId}`,
      endTime.toString(),
      'EX',
      durationSeconds + 120
    );
    
    console.log(`⏱️  Timer started for session ${sessionId} (${durationSeconds}s)`);
    return endTime;
  } catch (error) {
    console.error(`Failed to start timer for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get remaining time for an exam session
 * 
 * @param {string} sessionId - Unique exam session identifier
 * @returns {number} Remaining milliseconds (0 if expired)
 */
export async function getRemainingTime(sessionId) {
  try {
    const endTimeStr = await redis.get(`timer:${sessionId}`);
    
    if (!endTimeStr) {
      return 0; // Timer expired or doesn't exist
    }
    
    const endTime = parseInt(endTimeStr, 10);
    const remaining = Math.max(0, endTime - Date.now());
    
    return remaining;
  } catch (error) {
    console.error(`Failed to get remaining time for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Check if exam session timer has expired
 * 
 * @param {string} sessionId - Unique exam session identifier
 * @returns {boolean} True if time is up
 */
export async function isExpired(sessionId) {
  try {
    const remaining = await getRemainingTime(sessionId);
    return remaining === 0;
  } catch (error) {
    console.error(`Failed to check expiration for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Extend timer for an exam session (for edge cases)
 * 
 * @param {string} sessionId - Unique exam session identifier
 * @param {number} additionalSeconds - Additional seconds to add
 */
export async function extendTimer(sessionId, additionalSeconds) {
  try {
    const endTimeStr = await redis.get(`timer:${sessionId}`);
    
    if (!endTimeStr) {
      throw new Error('Timer not found');
    }
    
    const currentEndTime = parseInt(endTimeStr, 10);
    const newEndTime = currentEndTime + additionalSeconds * 1000;
    
    await redis.set(
      `timer:${sessionId}`,
      newEndTime.toString(),
      'EX',
      Math.ceil((newEndTime - Date.now()) / 1000) + 120
    );
    
    console.log(`⏱️  Timer extended for session ${sessionId} (+${additionalSeconds}s)`);
    return newEndTime;
  } catch (error) {
    console.error(`Failed to extend timer for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Delete timer (called after submission)
 * 
 * @param {string} sessionId - Unique exam session identifier
 */
export async function deleteTimer(sessionId) {
  try {
    await redis.del(`timer:${sessionId}`);
    console.log(`⏱️  Timer deleted for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to delete timer for session ${sessionId}:`, error);
    throw error;
  }
}
