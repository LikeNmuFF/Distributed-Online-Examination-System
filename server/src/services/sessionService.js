/**
 * Session Service
 * 
 * Demonstrates: Distributed Session Management
 * 
 * Manages exam sessions in Redis so they survive node crashes.
 * Sessions track:
 * - Which node the student is connected to
 * - When the session started
 * - Current session status (active, completed, etc.)
 */

import redis from '../db/redis.js';

/**
 * Create a new exam session
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 * @param {string} nodeId - Current node ID
 * @returns {Promise<string>} Session ID
 */
export async function createSession(studentId, examId, nodeId) {
  try {
    const sessionId = `${studentId}_${examId}_${Date.now()}`;

    await redis.hset(`session:${studentId}:${examId}`, {
      sessionId,
      studentId,
      examId,
      nodeId,
      startedAt: new Date().toISOString(),
      status: 'active',
    });

    // Set TTL for 2 hours
    await redis.expire(`session:${studentId}:${examId}`, 7200);

    console.log(`✓ Session created: ${sessionId} on node ${nodeId}`);
    return sessionId;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

/**
 * Get exam session details
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 * @returns {Promise<Object>} Session data or null if not found
 */
export async function getSession(studentId, examId) {
  try {
    const session = await redis.hgetall(`session:${studentId}:${examId}`);

    if (!session || Object.keys(session).length === 0) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      studentId: parseInt(session.studentId),
      examId: parseInt(session.examId),
      nodeId: session.nodeId,
      startedAt: session.startedAt,
      status: session.status,
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    throw error;
  }
}

/**
 * Update session status
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 * @param {string} status - New status
 */
export async function updateSessionStatus(studentId, examId, status) {
  try {
    const key = `session:${studentId}:${examId}`;
    const session = await redis.hgetall(key);

    if (Object.keys(session).length === 0) {
      throw new Error('Session not found');
    }

    await redis.hset(key, 'status', status);

    if (status === 'completed') {
      await redis.hset(key, 'completedAt', new Date().toISOString());
    }

    console.log(`✓ Session ${session.sessionId} status updated to: ${status}`);
  } catch (error) {
    console.error('Failed to update session status:', error);
    throw error;
  }
}

/**
 * End a session (mark as completed)
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 */
export async function endSession(studentId, examId) {
  try {
    await updateSessionStatus(studentId, examId, 'completed');
  } catch (error) {
    console.error('Failed to end session:', error);
    throw error;
  }
}

/**
 * Delete a session (after submission processed)
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 */
export async function deleteSession(studentId, examId) {
  try {
    await redis.del(`session:${studentId}:${examId}`);
    console.log(`✓ Session deleted for student ${studentId}, exam ${examId}`);
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

/**
 * Check if student is currently in an exam
 * 
 * @param {number} studentId - Student ID
 * @param {number} examId - Exam ID
 * @returns {Promise<boolean>}
 */
export async function isSessionActive(studentId, examId) {
  try {
    const session = await getSession(studentId, examId);
    return session && session.status === 'active';
  } catch (error) {
    console.error('Failed to check session active:', error);
    throw error;
  }
}
