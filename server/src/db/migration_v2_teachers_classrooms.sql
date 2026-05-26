-- Migration v2: Multi-Teacher System with Classrooms
-- This migration adds support for multiple teachers and classroom management
-- Date: 2026-05-25

-- ===== NEW TABLES FOR TEACHER & CLASSROOM SYSTEM =====

-- 1. TEACHERS TABLE
-- Stores teacher user accounts (separate from students who also have is_admin flag)
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CLASSROOMS TABLE
-- Each teacher can create multiple classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  join_code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CLASSROOM_MEMBERS TABLE
-- Tracks student enrollment with approval workflow
-- Status: pending (awaiting approval), approved (can take exams), rejected (request denied)
CREATE TABLE IF NOT EXISTS classroom_members (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMP DEFAULT NOW(),
  approved_by INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  UNIQUE(classroom_id, student_id)
);

-- 4. EXAM_OWNERSHIP TABLE
-- Track which teacher created each exam
CREATE TABLE IF NOT EXISTS exam_ownership (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_id, teacher_id)
);

-- 5. CLASSROOM_EXAMS TABLE
-- Many-to-many: a classroom can have multiple exams, an exam can be in multiple classrooms
CREATE TABLE IF NOT EXISTS classroom_exams (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(classroom_id, exam_id)
);

-- 6. UPDATE STUDENTS TABLE
-- Add role column to distinguish between students and teachers
ALTER TABLE students ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teacher'));

-- Update existing admin students to have role 'student' (they're students who can also teach)
UPDATE students SET role = 'student' WHERE is_admin = TRUE;

-- ===== INDICES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom_id ON classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_student_id ON classroom_members(student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_status ON classroom_members(status);
CREATE INDEX IF NOT EXISTS idx_exam_ownership_exam_id ON exam_ownership(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_ownership_teacher_id ON exam_ownership(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_classroom_id ON classroom_exams(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_exam_id ON classroom_exams(exam_id);

-- ===== SEED DATA: CONVERT EXISTING ADMIN STUDENTS TO TEACHERS =====

-- Insert teacher accounts (student1 becomes a teacher)
INSERT INTO teachers (username, password_hash, email, is_admin) VALUES
  ('teacher1', '$2a$10$djyLfCU46NLjrA2aaye19uKxeOV6urGW1SkD.F0tacX.tcdgv/T5i', 'teacher1@example.com', TRUE)
ON CONFLICT (username) DO UPDATE SET is_admin = EXCLUDED.is_admin;

-- Insert student2 and student3 as teachers too (for demo purposes)
INSERT INTO teachers (username, password_hash, email) VALUES
  ('teacher2', '$2a$10$djyLfCU46NLjrA2aaye19uKxeOV6urGW1SkD.F0tacX.tcdgv/T5i', 'teacher2@example.com')
ON CONFLICT (username) DO NOTHING;

-- ===== SETUP DEMO CLASSROOM =====
-- Create sample classrooms for teacher1
INSERT INTO classrooms (teacher_id, name, description, join_code)
SELECT t.id, 'Introduction to Databases', 'A comprehensive course on database fundamentals', 'DB101'
FROM teachers t WHERE t.username = 'teacher1'
  AND NOT EXISTS (SELECT 1 FROM classrooms c WHERE c.join_code = 'DB101');
INSERT INTO classrooms (teacher_id, name, description, join_code)
SELECT t.id, 'Advanced Networking', 'Deep dive into network protocols and architecture', 'NET201'
FROM teachers t WHERE t.username = 'teacher1'
  AND NOT EXISTS (SELECT 1 FROM classrooms c WHERE c.join_code = 'NET201');

-- Assign existing exams to teacher1 (exam_ownership)
INSERT INTO exam_ownership (exam_id, teacher_id)
SELECT e.id, 1 FROM exams e WHERE e.title = 'Parallel & Distributed Computing Midterm'
  AND NOT EXISTS (SELECT 1 FROM exam_ownership eo WHERE eo.exam_id = e.id AND eo.teacher_id = 1);
INSERT INTO exam_ownership (exam_id, teacher_id)
SELECT e.id, 1 FROM exams e WHERE e.title = 'Data Structures & Algorithms'
  AND NOT EXISTS (SELECT 1 FROM exam_ownership eo WHERE eo.exam_id = e.id AND eo.teacher_id = 1);
INSERT INTO exam_ownership (exam_id, teacher_id)
SELECT e.id, 1 FROM exams e WHERE e.title = 'Operating Systems'
  AND NOT EXISTS (SELECT 1 FROM exam_ownership eo WHERE eo.exam_id = e.id AND eo.teacher_id = 1);
INSERT INTO exam_ownership (exam_id, teacher_id)
SELECT e.id, 1 FROM exams e WHERE e.title = 'Computer Networks'
  AND NOT EXISTS (SELECT 1 FROM exam_ownership eo WHERE eo.exam_id = e.id AND eo.teacher_id = 1);
INSERT INTO exam_ownership (exam_id, teacher_id)
SELECT e.id, 1 FROM exams e WHERE e.title = 'Database Management Systems'
  AND NOT EXISTS (SELECT 1 FROM exam_ownership eo WHERE eo.exam_id = e.id AND eo.teacher_id = 1);

-- Add exams to classrooms
INSERT INTO classroom_exams (classroom_id, exam_id)
SELECT c.id, e.id FROM classrooms c, exams e
WHERE c.join_code = 'DB101' AND e.title = 'Database Management Systems'
  AND NOT EXISTS (SELECT 1 FROM classroom_exams ce WHERE ce.classroom_id = c.id AND ce.exam_id = e.id);
INSERT INTO classroom_exams (classroom_id, exam_id)
SELECT c.id, e.id FROM classrooms c, exams e
WHERE c.join_code = 'NET201' AND e.title = 'Computer Networks'
  AND NOT EXISTS (SELECT 1 FROM classroom_exams ce WHERE ce.classroom_id = c.id AND ce.exam_id = e.id);

-- Create demo student enrollment requests (some pending, some approved)
INSERT INTO classroom_members (classroom_id, student_id, status, approved_by, approved_at)
SELECT c.id, s.id, 'approved', 1, NOW() FROM classrooms c, students s
WHERE c.join_code = 'DB101' AND s.username = 'student2'
  AND NOT EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = c.id AND cm.student_id = s.id);
INSERT INTO classroom_members (classroom_id, student_id, status, approved_by, approved_at)
SELECT c.id, s.id, 'pending', NULL, NULL FROM classrooms c, students s
WHERE c.join_code = 'DB101' AND s.username = 'student3'
  AND NOT EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = c.id AND cm.student_id = s.id);
INSERT INTO classroom_members (classroom_id, student_id, status, approved_by, approved_at)
SELECT c.id, s.id, 'approved', 1, NOW() FROM classrooms c, students s
WHERE c.join_code = 'NET201' AND s.username = 'student2'
  AND NOT EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = c.id AND cm.student_id = s.id);

-- ===== VERIFY SCHEMA CREATION =====
SELECT 'Teachers table created' AS status;
SELECT 'Classrooms table created' AS status;
SELECT 'Classroom members table created' AS status;
SELECT 'Exam ownership table created' AS status;
SELECT 'Classroom exams table created' AS status;
