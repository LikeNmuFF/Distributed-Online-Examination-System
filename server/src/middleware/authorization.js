import postgres from '../db/postgres.js';

/**
 * Middleware to verify teacher owns a specific classroom
 */
export async function requireOwnsClassroom(req, res, next) {
  try {
    if (!req.user || req.user.userType !== 'teacher') {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const classroomId = req.params.classroomId || req.body.classroomId;
    if (!classroomId) {
      return res.status(400).json({ error: 'Classroom ID required' });
    }

    const result = await postgres.query(
      'SELECT teacher_id FROM classrooms WHERE id = $1',
      [classroomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    if (result.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    req.classroom = result.rows[0];
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Middleware to verify teacher owns a specific exam
 */
export async function requireOwnsExam(req, res, next) {
  try {
    if (!req.user || req.user.userType !== 'teacher') {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const examId = req.params.examId || req.body.examId;
    if (!examId) {
      return res.status(400).json({ error: 'Exam ID required' });
    }

    const result = await postgres.query(
      'SELECT teacher_id FROM exam_ownership WHERE exam_id = $1',
      [examId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found or you do not own it' });
    }

    if (result.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this exam' });
    }

    req.exam = result.rows[0];
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Middleware to verify student is approved member of a classroom
 */
export async function requireApprovedClassroomMember(req, res, next) {
  try {
    if (!req.user || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    const classroomId = req.params.classroomId || req.body.classroomId;
    if (!classroomId) {
      return res.status(400).json({ error: 'Classroom ID required' });
    }

    const result = await postgres.query(
      'SELECT status FROM classroom_members WHERE classroom_id = $1 AND student_id = $2',
      [classroomId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this classroom' });
    }

    if (result.rows[0].status !== 'approved') {
      return res.status(403).json({ error: 'Your membership is not approved yet' });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Middleware to verify student can access exam from their classroom
 */
export async function requireCanAccessExam(req, res, next) {
  try {
    if (!req.user || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    const examId = req.params.examId || req.body.examId;
    if (!examId) {
      return res.status(400).json({ error: 'Exam ID required' });
    }

    // Check if student has access to this exam through an approved classroom
    const result = await postgres.query(
      `SELECT ce.exam_id 
       FROM classroom_exams ce
       JOIN classroom_members cm ON ce.classroom_id = cm.classroom_id
       WHERE ce.exam_id = $1 AND cm.student_id = $2 AND cm.status = 'approved'`,
      [examId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this exam' });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}
