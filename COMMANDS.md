# Important Commands

## 🚀 Running the System

### Start Everything
```bash
# Build all images and start all containers
docker-compose up --build

# Or just start (if already built)
docker-compose up

# Run in background
docker-compose up -d
```

### Access the System
```
Frontend:        http://localhost
API (direct):    http://localhost/api
Health check:    http://localhost/health
Backend Node 1:  http://localhost:3001
Backend Node 2:  http://localhost:3002
Backend Node 3:  http://localhost:3003
```

### Stop Everything
```bash
docker-compose down

# Remove volumes too (clean database)
docker-compose down -v
```

---

## 📊 Running Load Test

### Install Dependencies
```bash
cd load-test
npm install
```

### Run Test
```bash
npm start
```

### Output Shows
- Login timing
- Load distribution across nodes
- Grading timing
- Throughput statistics

---

## 🔍 Monitoring & Debugging

### View All Logs
```bash
docker-compose logs -f
```

### View Specific Service Logs
```bash
# Backend node
docker-compose logs -f exam-node-1
docker-compose logs -f exam-node-2
docker-compose logs -f exam-node-3

# Infrastructure
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f nginx
docker-compose logs -f client
```

### Check Container Status
```bash
docker-compose ps

# Expected output:
# NAME                COMMAND             STATUS
# distributed-exam-redis        "redis-server"      Up (healthy)
# distributed-exam-postgres     "postgres"          Up (healthy)
# distributed-exam-exam-node-1  "npm start"         Up (healthy)
# distributed-exam-exam-node-2  "npm start"         Up (healthy)
# distributed-exam-exam-node-3  "npm start"         Up (healthy)
# distributed-exam-nginx        "nginx"             Up
# distributed-exam-client       "nginx -g daemon"   Up
```

### Health Checks
```bash
# Check all nodes
curl http://localhost/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Expected response:
# {"status":"ok","nodeId":"1","uptime":123,"timestamp":"2024-05-16T10:30:00.000Z"}
```

---

## 🛠️ Fault Tolerance Testing

### Stop a Node (Simulate Crash)
```bash
# While students are taking an exam:
docker-compose stop exam-node-1

# Students will reconnect automatically to node 2 or 3
# Load balancer removes node from upstream
```

### Restart the Node
```bash
docker-compose start exam-node-1

# Load balancer adds it back
# Health check passes
```

### Test with Load Test
```bash
# Terminal 1: Start load test
cd load-test && npm start

# Terminal 2: Stop a node during test
docker-compose stop exam-node-1

# Observe: Load test continues without errors
# Submissions complete successfully
```

---

## 🗄️ Database Management

### Access PostgreSQL Directly
```bash
# Connect to database
docker-compose exec postgres psql -U exam_user -d exam_db

# Inside psql:
# \dt                           # List tables
# SELECT * FROM students;       # View students
# SELECT * FROM submissions;    # View submissions
# \q                            # Exit
```

### Access Redis
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Inside redis-cli:
# KEYS *                        # List all keys
# GET timer:*                   # View timers
# GET session:*                 # View sessions
# HGETALL session:1:1           # View specific session
# DBSIZE                        # Count keys
# FLUSHALL                      # Clear all (careful!)
```

### Reset Database
```bash
# Delete all data
docker-compose down -v

# Restart (schema will be recreated)
docker-compose up --build
```

---

## 📝 Development

### Build Images Only
```bash
docker-compose build
```

### Build Specific Image
```bash
docker-compose build exam-node-1
docker-compose build client
```

### Run Single Service
```bash
docker-compose up postgres
docker-compose up redis
```

### View Image Details
```bash
docker images
docker inspect exam-node-1
```

---

## 🔐 Accessing Services from Host

### Backend API
```bash
# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"test123"}'

# Get exams (with token)
curl http://localhost/api/exams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Direct to Node
```bash
# Bypass nginx, access node directly
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

---

## 🧪 Load Testing Details

### Run with Specific Concurrency
Edit `load-test/simulate.js`, change:
```javascript
const NUM_STUDENTS = 50;  // Change to 10, 100, 200, etc.
```

Then:
```bash
npm start
```

### Run Multiple Times
```bash
for i in {1..5}; do
  echo "Test $i:"
  npm start
  echo "---"
done
```

---

## 📦 Container Management

### Rebuild Everything from Scratch
```bash
docker-compose down -v  # Remove all containers and volumes
rm -rf node_modules     # Optional: remove dependencies
docker-compose up --build
```

### Clean Up Unused Docker Resources
```bash
# Remove unused images
docker image prune

# Remove unused containers
docker container prune

# Remove unused volumes
docker volume prune
```

### View Docker Disk Usage
```bash
docker system df
```

---

## 🚨 Troubleshooting Commands

### Check if Ports are In Use
```bash
# Check port 80 (nginx)
lsof -i :80

# Check port 5173 (frontend)
lsof -i :5173

# Check port 3001-3003 (backends)
lsof -i :3001
lsof -i :3002
lsof -i :3003

# Kill process on port 80 (if needed)
kill -9 $(lsof -t -i :80)
```

### Check Container Logs for Errors
```bash
# Search for errors
docker-compose logs | grep -i error
docker-compose logs | grep -i failed

# See last 100 lines
docker-compose logs --tail 100
```

### Verify Connectivity Between Containers
```bash
# Test if backend can reach Redis
docker-compose exec exam-node-1 \
  node -e "require('ioredis')('redis://redis:6379').ping(console.log)"

# Test if backend can reach PostgreSQL
docker-compose exec exam-node-1 \
  psql postgresql://exam_user:exam_password@postgres:5432/exam_db -c "SELECT 1"
```

---

## 📊 Performance Testing

### Measure Grading Speed
```bash
# View grading timing in logs
docker-compose logs exam-node-1 | grep "Graded"

# Expected: "Graded 10 questions in parallel (25ms)"
```

### Monitor CPU Usage
```bash
# Watch container stats
docker stats

# Or specific container
docker stats exam-node-1
```

### Monitor Memory Usage
```bash
docker-compose ps
# Shows memory usage per container
```

---

## 🎓 Code Review Commands

### View Code Structure
```bash
# Find all services
find server/src/services -type f

# Find all routes
find server/src/routes -type f

# Count lines of code
wc -l server/src/**/*.js
cloc server/src/
```

### Search for PDC Concepts
```bash
# Find parallel code
grep -r "worker_threads" server/src/

# Find Redis usage (distributed state)
grep -r "redis\." server/src/

# Find Socket.IO (real-time sync)
grep -r "socket\." server/src/

# Find queue code (message passing)
grep -r "submissionQueue" server/src/
```

---

## 🐛 Common Issues & Solutions

### "Port 80 already in use"
```bash
# Find what's using port 80
lsof -i :80

# Kill it (if safe)
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### "Database not initializing"
```bash
# Delete volume and restart
docker-compose down -v
docker-compose up --build
```

### "Redis connection refused"
```bash
# Check if Redis is running
docker-compose ps redis

# View Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### "Node won't start"
```bash
# Check node logs
docker-compose logs exam-node-1

# Check port availability
lsof -i :3001

# Rebuild
docker-compose down
docker-compose up --build
```

### "Frontend shows "Cannot GET /api/exams""
```bash
# Check if backend is healthy
curl http://localhost/health

# Check nginx logs
docker-compose logs nginx

# Verify nginx.conf syntax
docker-compose exec nginx nginx -t
```

---

## 📈 Performance Baseline

### Expected Timings
```
Single Student:
  Login:         50-100ms
  Start Exam:    20-50ms
  Get Questions: 10-20ms
  Submit:        20-30ms
  Grading:       30-50ms
  Total:         150-250ms

50 Students (parallel):
  All login:     100-200ms
  All start:     100-300ms
  All submit:    50-100ms
  All grade:     2-3s
  Total:         2.5-3.5s
```

---

## ✅ Pre-Demo Checklist

```bash
# 1. Start system
docker-compose up --build

# 2. Verify all healthy
docker-compose ps

# 3. Test login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"test123"}'

# 4. Test health checks
curl http://localhost/health
curl http://localhost:3001/health

# 5. Access frontend
open http://localhost

# 6. Ready for demo!
```

---

**Saved as `COMMANDS.md` for quick reference**
