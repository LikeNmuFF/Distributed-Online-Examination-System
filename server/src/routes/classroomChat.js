/**
 * Classroom Chat Routes
 * 
 * Provides real-time messaging functionality for classrooms.
 * Students can send messages and mention teachers/other students using @mention syntax.
 * Teachers can see all messages in their classrooms in real-time.
 */

import express from 'express';
import pool from '../db/postgres.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/classroom-chat/messages
 * Send a message in a classroom
 * 
 * Body: {
 *   classroomId: number,
 *   messageText: string,
 *   mentionedUserIds: number[] (optional, IDs of mentioned users)
 * }
 */
router.post('/messages', verifyToken, async (req, res) => {
  const { classroomId, messageText, mentionedUserIds = [] } = req.body;
  const userId = req.user.id;

  if (!classroomId || !messageText || messageText.trim().length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // Verify user is a member of the classroom
      const memberCheck = await client.query(
        `SELECT 1 FROM classroom_members 
         WHERE classroom_id = $1 AND student_id = $2 AND status = 'approved'`,
        [classroomId, userId]
      );

      if (memberCheck.rows.length === 0) {
        // Also check if user is the teacher
        const teacherCheck = await client.query(
          `SELECT 1 FROM classrooms WHERE id = $1 AND teacher_id = $2`,
          [classroomId, userId]
        );

        if (teacherCheck.rows.length === 0) {
          client.release();
          return res.status(403).json({ error: 'Not a member of this classroom' });
        }
      }

      // Insert message
      const result = await client.query(
        `INSERT INTO classroom_messages (classroom_id, sender_id, message_text, mentioned_users)
         VALUES ($1, $2, $3, $4)
         RETURNING id, classroom_id, sender_id, message_text, mentioned_users, created_at`,
        [classroomId, userId, messageText.trim(), JSON.stringify(mentionedUserIds)]
      );

      const message = result.rows[0];
      
      // Fetch sender details from students or teachers
      const senderResult = await client.query(
        `SELECT id, username FROM students WHERE id = $1
         UNION ALL
         SELECT id, username FROM teachers WHERE id = $1`,
        [userId]
      );

      const messageData = {
        ...message,
        sender: senderResult.rows[0] || { id: userId, username: 'Unknown' },
        mentioned_users: mentionedUserIds
      };

      client.release();
      res.status(201).json({ success: true, message: messageData });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/classroom-chat/messages/:classroomId
 * Get all messages for a classroom (with pagination)
 * 
 * Query params:
 *   - limit: number (default 50, max 200)
 *   - offset: number (default 0)
 */
router.get('/messages/:classroomId', verifyToken, async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const client = await pool.connect();
    
    try {
      // Verify user is a member of the classroom
      const memberCheck = await client.query(
        `SELECT 1 FROM classroom_members 
         WHERE classroom_id = $1 AND student_id = $2 AND status = 'approved'`,
        [classroomId, userId]
      );

      if (memberCheck.rows.length === 0) {
        // Also check if user is the teacher
        const teacherCheck = await client.query(
          `SELECT 1 FROM classrooms WHERE id = $1 AND teacher_id = $2`,
          [classroomId, userId]
        );

        if (teacherCheck.rows.length === 0) {
          client.release();
          return res.status(403).json({ error: 'Not a member of this classroom' });
        }
      }

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM classroom_messages WHERE classroom_id = $1`,
        [classroomId]
      );
      const total = parseInt(countResult.rows[0].total);

      // Get messages with sender info from either students or teachers
      const result = await client.query(
        `SELECT cm.id, cm.classroom_id, cm.sender_id, cm.message_text, cm.mentioned_users, cm.created_at,
                COALESCE(s.username, t.username) AS username
         FROM classroom_messages cm
         LEFT JOIN students s ON cm.sender_id = s.id
         LEFT JOIN teachers t ON cm.sender_id = t.id
         WHERE cm.classroom_id = $1
         ORDER BY cm.created_at DESC
         LIMIT $2 OFFSET $3`,
        [classroomId, limit, offset]
      );

      // Transform to include sender object
      const messages = result.rows.map(row => ({
        id: row.id,
        classroom_id: row.classroom_id,
        sender_id: row.sender_id,
        message_text: row.message_text,
        mentioned_users: Array.isArray(row.mentioned_users) ? row.mentioned_users : JSON.parse(row.mentioned_users || '[]'),
        created_at: row.created_at,
        sender: {
          id: row.sender_id,
          username: row.username || 'Unknown'
        }
      }));

      client.release();
      res.json({ 
        success: true, 
        messages: messages.reverse(), // Return in ascending order (oldest first)
        total,
        limit,
        offset
      });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * GET /api/classroom-chat/members/:classroomId
 * Get classroom members for mention suggestions
 */
router.get('/members/:classroomId', verifyToken, async (req, res) => {
  const { classroomId } = req.params;
  const userId = req.user.id;

  try {
    const client = await pool.connect();
    
    try {
      // Verify user is a member of the classroom
      const memberCheck = await client.query(
        `SELECT 1 FROM classroom_members 
         WHERE classroom_id = $1 AND student_id = $2 AND status = 'approved'`,
        [classroomId, userId]
      );

      if (memberCheck.rows.length === 0) {
        // Also check if user is the teacher
        const teacherCheck = await client.query(
          `SELECT 1 FROM classrooms WHERE id = $1 AND teacher_id = $2`,
          [classroomId, userId]
        );

        if (teacherCheck.rows.length === 0) {
          client.release();
          return res.status(403).json({ error: 'Not a member of this classroom' });
        }
      }

      // Get approved members and the teacher
      const result = await client.query(
        `SELECT s.id, s.username, 'member' as role
         FROM classroom_members cm
         JOIN students s ON cm.student_id = s.id
         WHERE cm.classroom_id = $1 AND cm.status = 'approved'
         UNION ALL
         SELECT t.id, t.username, 'teacher' as role
         FROM classrooms c
         JOIN teachers t ON c.teacher_id = t.id
         WHERE c.id = $1`,
        [classroomId]
      );

      client.release();
      res.json({ success: true, members: result.rows });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * DELETE /api/classroom-chat/messages/:messageId
 * Delete a message (sender or teacher only)
 */
router.delete('/messages/:messageId', verifyToken, async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  try {
    const client = await pool.connect();
    
    try {
      // Get message details
      const messageResult = await client.query(
        `SELECT cm.id, cm.classroom_id, cm.sender_id, c.teacher_id
         FROM classroom_messages cm
         JOIN classrooms c ON cm.classroom_id = c.id
         WHERE cm.id = $1`,
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: 'Message not found' });
      }

      const message = messageResult.rows[0];

      // Check if user is sender or teacher
      if (message.sender_id !== userId && message.teacher_id !== userId) {
        client.release();
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }

      // Delete message
      await client.query(
        `DELETE FROM classroom_messages WHERE id = $1`,
        [messageId]
      );

      client.release();
      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
