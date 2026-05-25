# OpenCode Master Prompt
# Distributed Online Examination System
# Parallel & Distributed Computing — School Project

---

## YOUR ROLE

You are a senior software engineer and distributed systems architect helping a student
build a production-quality **Distributed Online Examination System** as a school project
for a Parallel and Distributed Computing course. Your job is to build the entire system
from scratch, write clean and well-commented code, and make sure every feature clearly
demonstrates PDC concepts that will impress the professor.

---

## PROJECT GOAL

Build a fully working **Distributed Online Examination System** where:

- Multiple students can take exams **simultaneously** across distributed nodes
- The system uses **parallel computing** to grade answers concurrently
- A **load balancer** distributes student traffic across 3 exam servers
- Exam sessions and timers are stored in **Redis** (shared distributed state)
- Submissions go through a **message queue** (Bull) so nothing is ever lost
- If one server crashes mid-exam, students **seamlessly reconnect** to another node
- Everything runs in **Docker** containers orchestrated with Docker Compose

---

## TECH STACK

- **Backend**: Node.js + Express (3 identical server instances)
- **Distributed State**: Redis (sessions, timers, locks)
- **Message Queue**: Bull (Redis-based async submission processing)
- **Parallel Grading**: Node.js `worker_threads` (one thread per question graded simultaneously)
- **Database**: PostgreSQL (students, exams, questions, submissions)
- **Load Balancer**: Nginx (least-connection algorithm)
- **Frontend**: React + Vite (single-page exam interface)
- **Real-time**: Socket.IO (live countdown timer synced across nodes)
- **Containers**: Docker + Docker Compose

---

## PROJECT STRUCTURE TO CREATE

```
distributed-exam-system/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── exams.js
│   │   │   └── submissions.js
│   │   ├── services/
│   │   │   ├── sessionService.js
│   │   │   ├── timerService.js
│   │   │   ├── graderService.js
│   │   │   ├── gradeWorker.js
│   │   │   └── queueService.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── rateLimiter.js
│   │   └── db/
│   │       ├── redis.js
│   │       ├── postgres.js
│   │       └── schema.sql
│   ├── package.json
│   └── Dockerfile
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── ExamList.jsx
│   │   │   ├── ExamRoom.jsx
│   │   │   └── Results.jsx
│   │   ├── components/
│   │   │   ├── Timer.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   └── NodeIndicator.jsx
│   │   └── services/
│   │       ├── api.js
│   │       └── socket.js
│   ├── package.json
│   └── Dockerfile
├── load-test/
│   └── simulate.js
└── docs/
    ├── architecture.md
    └── parallel-concepts.md
```

---

## BUILD INSTRUCTIONS — FOLLOW THIS ORDER EXACTLY

### STEP 1 — Docker Compose & Infrastructure

Create `docker-compose.yml` that spins up:
- `redis` — Redis 7 Alpine, port 6379
- `postgres` — Postgres 15 Alpine, port 5432, with env vars for DB/user/password
- `exam-node-1`, `exam-node-2`, `exam-node-3` — same Node.js image, ports 3001/3002/3003, env var `NODE_ID` set to 1/2/3
- `nginx` — load balancer, port 80, depends on all 3 nodes
- `client` — React frontend, port 5173

Create `nginx/nginx.conf` with:
- `upstream exam_nodes` using `least_conn` algorithm
- All 3 exam nodes listed
- Proxy `/api` to the upstream, `/socket.io` to the upstream with websocket upgrade headers
- Serve the React client for all other routes

---

### STEP 2 — Database Schema

Create `server/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER REFERENCES exams(id),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  exam_id INTEGER REFERENCES exams(id),
  answers JSONB NOT NULL,
  score INTEGER,
  total_questions INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW(),
  graded_at TIMESTAMP,
  node_id VARCHAR(10),
  UNIQUE(student_id, exam_id)
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  exam_id INTEGER REFERENCES exams(id),
  started_at TIMESTAMP DEFAULT NOW(),
  node_id VARCHAR(10)
);
```

Also seed the DB with:
- 3 sample student accounts (student1/student2/student3, password: `test123`)
- 1 sample exam titled "Parallel & Distributed Computing Midterm" with 10 multiple-choice questions about PDC concepts

---

### STEP 3 — Node.js Server

**`server/src/db/redis.js`**: Export a Redis client using `ioredis`, connecting to the `redis` service. Include reconnect logic.

**`server/src/db/postgres.js`**: Export a pg Pool connecting to the `postgres` service. Run schema.sql on startup.

**`server/src/middleware/auth.js`**: JWT middleware. Verify token from `Authorization: Bearer <token>` header. Attach `req.user` with `{ id, username }`.

**`server/src/routes/auth.js`**:
- `POST /api/auth/login` — validate credentials against DB, return JWT (expires 24h)
- `GET /api/auth/me` — return current user info

**`server/src/routes/exams.js`**:
- `GET /api/exams` — list all available exams
- `GET /api/exams/:id` — get exam details + questions (WITHOUT correct answers)
- `POST /api/exams/:id/start` — create exam session in Redis, start distributed timer

**`server/src/services/timerService.js`**:
```
startTimer(examSessionId, durationSeconds)
  → store endTime = Date.now() + duration*1000 in Redis key `timer:{examSessionId}`
  → set TTL to duration + 120 seconds

getRemainingTime(examSessionId)
  → fetch endTime from Redis
  → return Math.max(0, endTime - Date.now())

isExpired(examSessionId)
  → return remainingTime === 0
```

**`server/src/services/sessionService.js`**:
```
createSession(studentId, examId, nodeId)
  → store session in Redis hash `session:{studentId}:{examId}`
  → fields: nodeId, startedAt, status='active'

getSession(studentId, examId)
  → fetch from Redis

endSession(studentId, examId)
  → set status='completed' in Redis
```

**`server/src/services/gradeWorker.js`** (worker thread script):
```js
const { workerData, parentPort } = require('worker_threads');
const { answer, correct } = workerData;
parentPort.postMessage(answer === correct ? 1 : 0);
```

**`server/src/services/graderService.js`**:
```
gradeParallel(answers, answerKey)
  → for each question, spawn a Worker thread running gradeWorker.js
  → Promise.all() all threads
  → return { score, total, breakdown[] }
```
This is the KEY PARALLEL COMPUTING feature — add a comment block explaining it.

**`server/src/services/queueService.js`**:
```
- Create Bull queue 'exam-submissions'
- processor: fetch answer key from DB, call gradeParallel(), save results to submissions table
- addSubmission(studentId, examId, answers, nodeId) → add job to queue
- getJobStatus(jobId) → return job state
```

**`server/src/routes/submissions.js`**:
- `POST /api/exams/:id/submit` — check timer not expired, check no duplicate, add to queue, return jobId
- `GET /api/submissions/:jobId/status` — poll grading job status
- `GET /api/submissions/my` — list student's graded submissions

**`server/src/index.js`**:
- Express app with CORS, JSON body parser
- Mount all routes
- Set up Socket.IO server
- Socket event: on connection, student can join room `exam:{examSessionId}`
- Every 1 second, emit `timer:tick` to room with remaining time from Redis
- Expose `GET /health` → return `{ status: 'ok', nodeId, uptime, timestamp }`

---

### STEP 4 — React Frontend

**Design**: Clean, minimal, professional. Use Tailwind CSS.

**`Login.jsx`**: Simple form. Username + password. On submit, POST to `/api/auth/login`, store JWT in memory (not localStorage). Redirect to ExamList.

**`ExamList.jsx`**: Show available exams as cards. Each card: exam title, description, duration. "Start Exam" button → navigates to ExamRoom.

**`ExamRoom.jsx`** (most important page):
- On mount: call `/api/exams/:id/start` to get session, connect Socket.IO
- Show large countdown timer at top (synced via Socket.IO `timer:tick`)
- Render questions one at a time with A/B/C/D radio buttons (or all at once — your choice)
- Show progress: "Question 3 of 10"
- When timer hits 0 OR student clicks Submit → POST to `/api/exams/:id/submit`
- Show "Submitting and grading..." loading state while polling job status
- Redirect to Results when grading is done

**`NodeIndicator.jsx`**: Small badge in top-right corner showing which node the student is connected to (fetch from `/health` or include in session response). This visually demonstrates distribution.

**`Results.jsx`**: Show score (e.g. "7 / 10"), percentage, which answers were right/wrong, time taken, and which node processed the submission.

**`Timer.jsx`**: Accepts `remainingMs` prop. Shows `MM:SS` format. Turns red when < 60 seconds.

---

### STEP 5 — Load Test Script

**`load-test/simulate.js`** (Node.js script using `axios` + `socket.io-client`):

Simulate 50 concurrent students:
1. All login simultaneously (student1, student2, student3 — cycle through)
2. All start the same exam simultaneously
3. Each answers all questions (random answers) with a 500ms delay between questions
4. All submit simultaneously

Log:
- How many students connected to each node (demonstrates load balancing)
- Total time for all submissions to be graded
- Any errors or failures (demonstrates fault tolerance)

---

### STEP 6 — Documentation

**`docs/architecture.md`**:
A clear explanation of the system architecture with an ASCII diagram. Sections:
1. Overview
2. Load Balancing (Nginx, least-connection)
3. Distributed Session State (Redis)
4. Parallel Grading (worker_threads)
5. Message Queue (Bull)
6. Fault Tolerance (health checks, session recovery)
7. How to run the system

**`docs/parallel-concepts.md`**:
Explicitly map each system feature to PDC theory — for the school report:

| Feature | PDC Concept | Theory Reference |
|---|---|---|
| 3 exam nodes | Distributed System | Client-Server / P2P distribution |
| Nginx least-conn | Load Balancing | Work distribution algorithms |
| Redis shared state | Distributed Shared Memory | DSM / Tuple spaces |
| worker_threads grading | Data Parallelism | Fork-Join model |
| Bull queue | Task Parallelism | Producer-Consumer pattern |
| Node crash recovery | Fault Tolerance | Replication / Failover |
| Socket.IO timer sync | Distributed Synchronization | Clock synchronization |

---

## CODE QUALITY REQUIREMENTS

- **Every file must have a header comment** explaining what it does and which PDC concept it demonstrates (if applicable)
- **All async functions use async/await** with proper try/catch
- **Environment variables** for all config (Redis URL, Postgres URL, JWT secret, NODE_ID)
- **No hardcoded ports or IPs** — everything from env or Docker Compose
- **README.md** at the root with:
  - Project description
  - How to run: `docker-compose up --build`
  - How to run the load test
  - How to access the app (http://localhost)
  - Default student credentials

---

## WHAT MAKES THIS PROJECT EXCELLENT (for the professor)

1. **It actually works** — `docker-compose up` and the whole thing runs
2. **Parallelism is real** — worker_threads genuinely grade in parallel, not fake
3. **Distribution is visible** — NodeIndicator shows students on different servers
4. **Fault tolerance is testable** — professor can `docker stop exam-node-1` and students stay connected
5. **Load test proves the point** — numbers show traffic spread across nodes
6. **Code is clean and commented** — links every feature to PDC theory
7. **Docs explain the concepts** — ready to copy into the school report

---

## START NOW

Begin with Step 1 (Docker Compose + Nginx). After each step, confirm the files were
created correctly before moving to the next step. If you encounter a dependency issue,
resolve it before continuing. Do not skip steps.
