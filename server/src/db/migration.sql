-- Migration: Add is_admin column, category, question_type, and seed additional exams
-- This runs on every server start and is idempotent

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Fix correct_option type from CHAR(1) to VARCHAR(5) to support empty string
ALTER TABLE questions ALTER COLUMN correct_option TYPE VARCHAR(5);
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_option_check;
ALTER TABLE questions ADD CONSTRAINT questions_correct_option_check CHECK (correct_option IN ('A', 'B', 'C', 'D', 'T', 'F', ''));
UPDATE students SET is_admin = TRUE WHERE username = 'student1';

ALTER TABLE exams ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'quiz';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'multiple_choice';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options_json JSONB DEFAULT '{}';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer JSONB;

-- Insert exams that don't already exist
INSERT INTO exams (title, description, duration_seconds) VALUES
  ('Data Structures & Algorithms',
   'Test your knowledge of fundamental data structures and algorithmic paradigms including trees, graphs, sorting, and dynamic programming.',
   1800)
ON CONFLICT DO NOTHING;

INSERT INTO exams (title, description, duration_seconds) VALUES
  ('Operating Systems',
   'Covers process management, memory management, file systems, and concurrency in modern operating systems.',
   1800)
ON CONFLICT DO NOTHING;

INSERT INTO exams (title, description, duration_seconds) VALUES
  ('Computer Networks',
   'Examines network layers, protocols, routing, and security fundamentals in distributed communication.',
   1800)
ON CONFLICT DO NOTHING;

INSERT INTO exams (title, description, duration_seconds) VALUES
  ('Database Management Systems',
   'Assesses understanding of relational databases, SQL, normalization, transactions, and query optimization.',
   1800)
ON CONFLICT DO NOTHING;

-- Insert questions for each exam using subqueries for correct exam_id
-- Exam 2: Data Structures & Algorithms
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the time complexity of binary search on a sorted array?', 'O(n)', 'O(log n)', 'O(n^2)', 'O(1)', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the time complexity%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which data structure uses LIFO (Last In First Out) principle?', 'Queue', 'Stack', 'Linked List', 'Tree', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which data structure uses LIFO%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a hash table''s average time complexity for lookups?', 'O(n)', 'O(1)', 'O(log n)', 'O(n^2)', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a hash table%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which algorithm is used to find the shortest path in a weighted graph?', 'Breadth-First Search', 'Dijkstra''s algorithm', 'QuickSort', 'Merge Sort', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which algorithm is used%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What property makes a binary search tree valid?', 'Root is always the largest', 'Left child < parent < right child', 'All leaves are at same depth', 'Each node has exactly two children', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What property makes a binary search%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which sorting algorithm has the best worst-case time complexity?', 'Bubble Sort', 'Merge Sort', 'Quick Sort', 'Selection Sort', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which sorting algorithm has the best%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a priority queue typically implemented with?', 'Array', 'Heap', 'Linked List', 'Hash Table', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a priority queue%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does DFS stand for in graph traversal?', 'Direct Fast Search', 'Depth-First Search', 'Data Format Standard', 'Distributed File System', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does DFS stand for%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which data structure is optimal for implementing a breadth-first search?', 'Stack', 'Queue', 'Array', 'Hash Set', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which data structure is optimal%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the space complexity of merge sort?', 'O(1)', 'O(n)', 'O(log n)', 'O(n^2)', 'B'
FROM exams e WHERE e.title = 'Data Structures & Algorithms' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the space complexity of merge sort%');

-- Exam 3: Operating Systems
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a process in operating systems?', 'A file being read', 'A program in execution', 'A memory address', 'A system call', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a process in operating%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which scheduling algorithm assigns the CPU to the process with the smallest execution time?', 'Round Robin', 'Shortest Job First', 'First Come First Serve', 'Priority Scheduling', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which scheduling algorithm assigns%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a deadlock in operating systems?', 'A system crash', 'Two or more processes waiting indefinitely for resources held by each other', 'A memory leak', 'An invalid system call', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a deadlock in operating%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which memory management scheme allows processes to be larger than physical memory?', 'Paging', 'Virtual memory', 'Segmentation', 'Fixed partitioning', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which memory management scheme allows%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a mutex used for?', 'Monitoring CPU usage', 'Mutual exclusion in concurrent programming', 'Managing files', 'Network communication', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a mutex used for%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the role of a system call interface?', 'Direct hardware access', 'Bridge between user space and kernel space', 'File compression', 'Process creation only', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the role of a system call%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which page replacement algorithm replaces the page that will not be used for the longest time?', 'FIFO', 'Optimal Page Replacement', 'LRU', 'Clock Algorithm', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which page replacement algorithm replaces%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a race condition?', 'A hardware malfunction', 'Multiple threads accessing shared data without synchronization', 'Network latency', 'Disk fragmentation', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a race condition%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does a semaphore with count N allow?', 'N processes to run simultaneously', 'Up to N processes to access a resource concurrently', 'N interrupts per second', 'N files to be open', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does a semaphore with count%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'In the context of threads, what is concurrency?', 'Running on multiple CPUs at once', 'Multiple threads making progress in overlapping time periods', 'Single-thread execution', 'Parallel hardware', 'B'
FROM exams e WHERE e.title = 'Operating Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'In the context of threads%');

-- Exam 4: Computer Networks
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which layer of the OSI model handles routing?', 'Data Link Layer', 'Network Layer', 'Transport Layer', 'Application Layer', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which layer of the OSI model%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What protocol is used for reliable data delivery?', 'UDP', 'TCP', 'IP', 'HTTP', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What protocol is used for reliable data%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a subnet mask used for?', 'Encrypting data packets', 'Determining network and host portions of an IP address', 'Compressing network traffic', 'Assigning IP addresses dynamically', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a subnet mask used for%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does DNS stand for?', 'Data Network System', 'Domain Name System', 'Digital Network Service', 'Dynamic Node Switching', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does DNS stand for%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which protocol is used for secure web browsing?', 'HTTP', 'HTTPS', 'FTP', 'SMTP', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which protocol is used for secure web%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the maximum hop count in OSPF?', '15', 'No fixed limit (uses cost metric)', '32', '64', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the maximum hop count in OSPF%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does a MAC address identify?', 'A network connection globally', 'A network interface controller uniquely', 'An IP address', 'A web domain', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does a MAC address identify%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the purpose of a firewall?', 'Speed up network traffic', 'Filter incoming and outgoing network traffic based on security rules', 'Assign IP addresses', 'Route packets between networks', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the purpose of a firewall%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'Which protocol is used for sending emails?', 'HTTP', 'SMTP', 'FTP', 'TCP', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'Which protocol is used for sending emails%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is latency in networking?', 'Bandwidth capacity', 'Time delay in data transmission', 'Data packet size', 'Network protocol version', 'B'
FROM exams e WHERE e.title = 'Computer Networks' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is latency in networking%');

-- Exam 5: Database Management Systems
INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a primary key in a relational database?', 'The first column in a table', 'A unique identifier for each row in a table', 'A foreign table reference', 'An indexed column', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a primary key in a relational%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does SQL stand for?', 'Simple Query Language', 'Structured Query Language', 'Standard Question Language', 'Sequential Query Logic', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does SQL stand for%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is database normalization?', 'Making databases run faster', 'Organizing data to reduce redundancy and dependency', 'Compressing database files', 'Encrypting sensitive data', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is database normalization%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is an ACID property in transactions?', 'A hardware requirement', 'Atomicity, Consistency, Isolation, Durability', 'A programming language', 'A network protocol', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is an ACID property%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does a JOIN operation do in SQL?', 'Deletes a table', 'Combines rows from two or more tables based on related columns', 'Creates a new database', 'Updates existing records', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does a JOIN operation%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a foreign key?', 'A key for encryption', 'A field that references the primary key of another table', 'The main key of a table', 'An alternate key', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a foreign key%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is an index in database?', 'A table constraint', 'A data structure that speeds up data retrieval', 'A type of query', 'A backup file', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is an index in database%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is a transaction in DBMS?', 'A user login event', 'A sequence of operations performed as a single logical unit of work', 'A database backup', 'A network request', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is a transaction in DBMS%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What does the GROUP BY clause do?', 'Sorts query results', 'Groups rows with same values into summary rows', 'Filters rows based on conditions', 'Joins two tables', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What does the GROUP BY clause do%');

INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
SELECT e.id, 'What is the purpose of a view in SQL?', 'To store data permanently', 'To provide a virtual table based on a query result', 'To index a table', 'To enforce referential integrity', 'B'
FROM exams e WHERE e.title = 'Database Management Systems' AND NOT EXISTS (SELECT 1 FROM questions q WHERE q.exam_id = e.id AND q.question_text LIKE 'What is the purpose of a view in SQL%');

-- ===== MIGRATION v3: REAL-TIME CHAT AND STUDENT ONLINE STATUS =====
-- Add support for classroom chat messaging and real-time student status tracking

-- 1. CLASSROOM_MESSAGES TABLE
-- Stores all messages sent in a classroom with support for mentioning users
CREATE TABLE IF NOT EXISTS classroom_messages (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  mentioned_users JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CLASSROOM_STUDENT_SESSIONS TABLE
-- Tracks which students are currently online in a classroom
CREATE TABLE IF NOT EXISTS classroom_student_sessions (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'taking_exam', 'offline')),
  joined_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  UNIQUE(classroom_id, student_id, session_id)
);

-- ===== INDICES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom_id ON classroom_messages(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_sender_id ON classroom_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_created_at ON classroom_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_classroom_student_sessions_classroom_id ON classroom_student_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_student_sessions_student_id ON classroom_student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_student_sessions_status ON classroom_student_sessions(status);
CREATE INDEX IF NOT EXISTS idx_classroom_student_sessions_joined_at ON classroom_student_sessions(joined_at);
