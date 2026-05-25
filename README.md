# Distributed Online Examination System

A production-grade **Distributed Online Examination System** built with Node.js, React, PostgreSQL, and Redis to demonstrate Parallel and Distributed Computing principles.

## 🎯 Project Overview

This system showcases key PDC concepts:

- **Parallelism**: Multiple exam takers handled simultaneously across 3 distributed nodes
- **Parallel Grading**: All exam answers graded in parallel using `worker_threads`
- **Distributed State**: Redis stores sessions, timers, and submissions across all nodes
- **Load Balancing**: Nginx distributes traffic using least-connection algorithm
- **Message Queue**: Bull queue prevents submission loss under peak load
- **Fault Tolerance**: Students seamlessly reconnect if a node crashes
- **Real-time Sync**: Socket.IO synchronizes exam timers across all nodes

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Nginx Load Balancer                   │
│   (Least-Conn: distributes students)    │
└──────────────┬──────────────────────────┘
       ┌───────┴───────────┬─────────────┐
  ┌────▼─────┐ ┌──────▼────┐ ┌────▼──────┐
  │ Node 1   │ │  Node 2   │ │  Node 3   │
  │ :3001    │ │  :3002    │ │  :3003    │
  └────┬─────┘ └──────┬────┘ └────┬──────┘
       └───────┬──────────────────┘
         ┌─────▼────────┐
         │ Redis Cluster│
         │ (State)      │
         └─────┬────────┘
         ┌─────▼────────┐
         │ PostgreSQL   │
         │ (Persistence)│
         └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- npm or yarn

### Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# The system will be available at:
# - Frontend: http://localhost
# - API: http://localhost/api
# - Health: http://localhost/health
```

### Default Credentials

```
Username: student1, student2, or student3
Password: test123
```

## 📁 Project Structure

```
distributed-exam-system/
├── docker-compose.yml          # Service orchestration
├── nginx/
│   └── nginx.conf              # Load balancer config (least-conn)
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── index.js            # Main Express app + Socket.IO
│   │   ├── routes/             # API endpoints
│   │   │   ├── auth.js         # Login
│   │   │   ├── exams.js        # Exam CRUD
│   │   │   └── submissions.js  # Answer submission
│   │   ├── services/           # Business logic
│   │   │   ├── sessionService.js      # Redis sessions
│   │   │   ├── timerService.js        # Distributed timer
│   │   │   ├── graderService.js       # Parallel grading
│   │   │   ├── gradeWorker.js         # Worker thread
│   │   │   └── queueService.js        # Bull queue
│   │   ├── middleware/         # Auth, rate limiting
│   │   └── db/
│   │       ├── redis.js        # Redis client
│   │       ├── postgres.js     # PostgreSQL client
│   │       └── schema.sql      # Database schema
│   ├── package.json
│   └── Dockerfile
├── client/                     # React frontend
│   ├── src/
│   │   ├── pages/              # Login, ExamList, ExamRoom, Results
│   │   ├── components/         # Timer, etc.
│   │   ├── services/           # API, Socket.IO
│   │   └── index.css           # Tailwind styles
│   ├── package.json
│   └── Dockerfile
├── load-test/
│   └── simulate.js             # Concurrent user simulator
└── docs/
    ├── architecture.md         # Detailed architecture
    └── parallel-concepts.md    # PDC concepts explained
```

## 📊 Key Features & PDC Concepts

### 1. Parallel Grading (Fork-Join Model)

```javascript
// graderService.js
// Spawn one worker thread per question
// All threads grade simultaneously → faster results
const grades = await gradeParallel(studentAnswers, answerKey);
// Sequential: 10ms × 10 questions = 100ms
// Parallel: 10ms (all at once) on multi-core = 10-30ms
```

**PDC Concept**: Data Parallelism, Fork-Join pattern

### 2. Distributed Timer (Shared State)

```javascript
// timerService.js
// Timer stored in Redis, not in-memory
// Prevents cheating by switching nodes
const endTime = await redis.get(`timer:${sessionId}`);
```

**PDC Concept**: Distributed Shared Memory, Clock Synchronization

### 3. Load Balancing (Least-Conn)

```nginx
# nginx/nginx.conf
upstream exam_nodes {
    least_conn;  # Route to server with fewest connections
    server exam-node-1:3001;
    server exam-node-2:3002;
    server exam-node-3:3003;
}
```

**PDC Concept**: Work Distribution, Load Balancing Algorithms

### 4. Message Queue (Task Parallelism)

```javascript
// queueService.js
// Submissions queued, processed asynchronously
// Prevents overload and data loss
const job = await submissionQueue.add({
  studentId,
  examId,
  answers,
});
```

**PDC Concept**: Task Parallelism, Producer-Consumer, Message Passing

### 5. Fault Tolerance (Session Persistence)

```javascript
// sessionService.js
// Sessions stored in Redis, survive node crashes
// Students seamlessly reconnect to another node
const session = await redis.hgetall(`session:${studentId}:${examId}`);
```

**PDC Concept**: Fault Tolerance, Replication, Session Persistence

### 6. Real-time Synchronization (Socket.IO)

```javascript
// index.js
// Every node broadcasts timer ticks
// All students in same exam see identical countdown
socket.to(room).emit("timer:tick", { remainingMs });
```

**PDC Concept**: Distributed Synchronization, Real-time Communication

## 🧪 Load Testing

### Simulate 50 Concurrent Students

```bash
cd load-test
npm install
node simulate.js
```

This will:

1. Login 50 students (cycling through student1/2/3)
2. All start the same exam simultaneously
3. All answer randomly and submit
4. Show distribution across nodes
5. Report total grading time

**Expected Output**:

```
✓ 50 students logged in
✓ Node 1: 18 students, Node 2: 16 students, Node 3: 16 students
✓ All submissions completed in 2.3s
✓ Average grading time per student: 45ms
```

## 🔍 Monitoring & Debugging

### Check Node Health

```bash
curl http://localhost/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f exam-node-1
docker-compose logs -f redis
docker-compose logs -f postgres
```

### Test Fault Tolerance

```bash
# Stop a node (students will reconnect to another)
docker-compose stop exam-node-1

# Verify load balancer redirects traffic to nodes 2 & 3
curl http://localhost/health  # Should work

# Bring it back
docker-compose start exam-node-1
```

## 📚 For School Report

### How to Explain Each Feature

| Feature               | How to Explain                                                    | Evidence                                          |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| **Parallelism**       | "Multiple students take exams simultaneously across 3 nodes"      | Load test output showing 50 concurrent students   |
| **Parallel Grading**  | "Answers graded in parallel using worker_threads (fork-join)"     | Code in graderService.js, timing comparisons      |
| **Distributed State** | "Timers & sessions stored in Redis, shared across all nodes"      | timerService.js, sessionService.js                |
| **Load Balancing**    | "Nginx uses least-conn to distribute traffic evenly"              | nginx.conf, load test output                      |
| **Message Queue**     | "Submissions queued in Bull to prevent loss under load"           | queueService.js, no submissions lost in load test |
| **Fault Tolerance**   | "Sessions survive node crashes, students reconnect automatically" | Demo: docker stop exam-node-1, student continues  |
| **Real-time Sync**    | "Socket.IO broadcasts timer ticks every second to all nodes"      | index.js, Timer.jsx component                     |

## 🛠️ Development

### Local Development (without Docker)

```bash
# Terminal 1: Start PostgreSQL and Redis
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=exam_password postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2: Start backend
cd server
npm install
NODE_ID=1 NODE_PORT=3001 npm start

# Terminal 3: Start frontend
cd client
npm install
npm run dev
```

## 📖 API Documentation

### Authentication

- **POST /api/auth/login** — Login with credentials
- **GET /api/auth/me** — Get current user

### Exams

- **GET /api/exams** — List all exams
- **GET /api/exams/:id** — Get exam details + questions
- **POST /api/exams/:id/start** — Start exam (create session + timer)

### Submissions

- **POST /api/submissions/exams/:id/submit** — Submit answers
- **GET /api/submissions/:jobId/status** — Poll grading status
- **GET /api/submissions/my** — List student's submissions

## 🔒 Security

- JWT tokens for authentication
- Password hashing with bcryptjs
- Rate limiting per IP (10 logins/15min, 5 submissions/min)
- SQL injection prevention (parameterized queries)
- CORS configured
- Session timeout (2 hours)

## 🚨 Troubleshooting

### "Connection refused"

- Check all services are running: `docker-compose ps`
- Wait for containers to be healthy: `docker-compose logs`

### "Database not initialized"

- Delete postgres volume: `docker-compose down -v`
- Restart: `docker-compose up --build`

### "Socket.IO not connecting"

- Check nginx routing for `/socket.io` path
- Browser console should show connection attempts

### "Submissions not grading"

- Check Redis is running: `docker-compose logs redis`
- Check Bull queue: `docker-compose logs exam-node-1 | grep queue`

## 📜 License

MIT

---

**Built for**: Automata Theory and Formal Language
**Version**: 1.0.0  
**Author**: Klein, Erica Joy, Robert, Rhafael, Christelle Joy, Michelle, Romarie, Saima, Patrick Lance, Kurt
