/**
 * Main Server Entry Point
 * 
 * Demonstrates: Distributed System Coordination
 * 
 * This Node.js Express server runs on each exam node.
 * All 3 nodes are behind an Nginx load balancer.
 * 
 * Key features:
 * - Shared state via Redis (sessions, timers)
 * - RESTful API for exam operations
 * - Socket.IO for real-time timer sync
 * - Health check endpoint for load balancer
 * - Rate limiting per IP
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import redis from './db/redis.js';
import pool, { runMigration } from './db/postgres.js';
import authRoutes from './routes/auth.js';
import examsRoutes from './routes/exams.js';
import submissionsRoutes from './routes/submissions.js';
import teachersRoutes from './routes/teachers.js';
import classroomsRoutes from './routes/classrooms.js';
import classroomJoinRoutes from './routes/classroomJoin.js';
import examManagementRoutes from './routes/examManagement.js';
import analyticsRoutes from './routes/analytics.js';
import scoreboardRoutes from './routes/scoreboard.js';
import essayGradingRoutes from './routes/essayGrading.js';
import classroomChatRoutes from './routes/classroomChat.js';
import studentStatusRoutes from './routes/studentStatus.js';
import { verifyToken } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

const NODE_ID = process.env.NODE_ID || 'unknown';
const NODE_PORT = parseInt(process.env.NODE_PORT || '3001', 10);

// Trust proxy for correct IP detection behind Nginx
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/classrooms', classroomsRoutes);
app.use('/api/classroom-join', classroomJoinRoutes);
app.use('/api/classroom-chat', classroomChatRoutes);
app.use('/api/student-status', studentStatusRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/exam-management', examManagementRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scoreboard', scoreboardRoutes);
app.use('/api/essay-grading', essayGradingRoutes);

/**
 * Health Check Endpoint
 * 
 * Used by load balancer (Nginx) to determine node health.
 * If this returns non-200, Nginx removes the node from the upstream.
 * Demonstrates: Fault Tolerance & Health Monitoring
 */
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'ok',
    nodeId: NODE_ID,
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Socket.IO Connection Handler
 * 
 * Demonstrates: Real-time Distributed Synchronization
 * 
 * 1. Exam Timer Synchronization
 *    Students join a room per exam session to receive synchronized timer updates.
 *    Every second, emit remaining time from Redis so all students see the same countdown.
 *    Prevents cheating by relying on Redis time, not client time.
 * 
 * 2. Classroom Chat
 *    Real-time messaging in classrooms with user mentions.
 *    When a message is sent, broadcasts to all users in the classroom room.
 * 
 * 3. Student Online Status
 *    Tracks online/taking-exam status for students in real-time.
 *    Teachers see updates when students join/leave/start exam.
 */
io.on('connection', (socket) => {
  console.log(`⚡ Socket.IO client connected: ${socket.id} on Node ${NODE_ID}`);

  // ===== EXAM TIMER ROOM =====
  socket.on('join-exam', async (data) => {
    const { sessionId, studentId, examId } = data;
    const room = `exam:${sessionId}`;
    
    socket.join(room);
    console.log(`📍 Student ${studentId} joined room ${room} on Node ${NODE_ID}`);
    
    // Start emitting timer ticks every second
    const timerInterval = setInterval(async () => {
      try {
        const endTime = await redis.get(`timer:${sessionId}`);
        if (!endTime) {
          clearInterval(timerInterval);
          socket.to(room).emit('timer:expired');
          return;
        }
        
        const remainingMs = Math.max(0, parseInt(endTime) - Date.now());
        io.to(room).emit('timer:tick', {
          remainingMs,
          timestamp: Date.now(),
        });
        
        if (remainingMs === 0) {
          clearInterval(timerInterval);
          io.to(room).emit('timer:expired');
        }
      } catch (error) {
        console.error(`Timer error for session ${sessionId}:`, error);
      }
    }, 1000);

    socket.on('disconnect', () => {
      clearInterval(timerInterval);
      console.log(`✗ Socket.IO client disconnected: ${socket.id} on Node ${NODE_ID}`);
    });
  });

  // ===== CLASSROOM CHAT ROOM =====
  socket.on('join-classroom-chat', (data) => {
    const { classroomId, userId, username } = data;
    const room = `classroom:${classroomId}`;
    
    socket.join(room);
    console.log(`💬 User ${username} (${userId}) joined classroom chat ${room}`);
    
    // Notify others that user joined
    socket.to(room).emit('user-joined', {
      userId,
      username,
      timestamp: new Date().toISOString()
    });
  });

  // Handle new messages in chat
  socket.on('classroom-message', (data) => {
    const { classroomId, message } = data;
    const room = `classroom:${classroomId}`;
    
    console.log(`📨 Message in classroom ${classroomId}: "${message.message_text}"`);
    
    // Broadcast to all users in this classroom
    io.to(room).emit('message-received', message);
  });

  socket.on('leave-classroom-chat', (data) => {
    const { classroomId, userId, username } = data;
    const room = `classroom:${classroomId}`;
    
    socket.leave(room);
    console.log(`👋 User ${username} (${userId}) left classroom chat ${room}`);
    
    // Notify others that user left
    socket.to(room).emit('user-left', {
      userId,
      username,
      timestamp: new Date().toISOString()
    });
  });

  // ===== STUDENT ONLINE STATUS =====
  socket.on('student-online', (data) => {
    const { classroomId, studentId, username, sessionId } = data;
    const room = `classroom-status:${classroomId}`;
    
    socket.join(room);
    console.log(`🟢 Student ${username} (${studentId}) is online in classroom ${classroomId}`);
    
    // Broadcast to teacher
    io.to(room).emit('student-status-update', {
      studentId,
      username,
      status: 'online',
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('student-exam-start', (data) => {
    const { classroomId, studentId, username, examId, examTitle, sessionId } = data;
    const room = `classroom-status:${classroomId}`;
    
    console.log(`📝 Student ${username} (${studentId}) started exam "${examTitle}" in classroom ${classroomId}`);
    
    // Broadcast to teacher
    io.to(room).emit('student-status-update', {
      studentId,
      username,
      status: 'taking_exam',
      examId,
      examTitle,
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('student-exam-end', (data) => {
    const { classroomId, studentId, username, sessionId } = data;
    const room = `classroom-status:${classroomId}`;
    
    console.log(`✅ Student ${username} (${studentId}) finished exam in classroom ${classroomId}`);
    
    // Broadcast to teacher
    io.to(room).emit('student-status-update', {
      studentId,
      username,
      status: 'online',
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('student-offline', (data) => {
    const { classroomId, studentId, username, sessionId } = data;
    const room = `classroom-status:${classroomId}`;
    
    socket.leave(room);
    console.log(`🔴 Student ${username} (${studentId}) is offline in classroom ${classroomId}`);
    
    // Broadcast to teacher
    io.to(room).emit('student-status-update', {
      studentId,
      username,
      status: 'offline',
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  // Join classroom status room (for teachers)
  socket.on('join-classroom-status', (data) => {
    const { classroomId } = data;
    const room = `classroom-status:${classroomId}`;
    
    socket.join(room);
    console.log(`👨‍🏫 Teacher joined status room for classroom ${classroomId}`);
  });

  socket.on('leave-classroom-status', (data) => {
    const { classroomId } = data;
    const room = `classroom-status:${classroomId}`;
    
    socket.leave(room);
    console.log(`👨‍🏫 Teacher left status room for classroom ${classroomId}`);
  });
});

/**
 * Initialize and Start Server
 */
async function start() {
  try {
    // Apply any pending migrations (idempotent)
    await runMigration();
    
    // Start HTTP server
    httpServer.listen(NODE_PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════╗`);
      console.log(`║ Distributed Exam Node ${NODE_ID} Running ║`);
      console.log(`╚═══════════════════════════════════════════╝`);
      console.log(`Server running on http://localhost:${NODE_PORT}`);
      console.log(`Health check: http://localhost:${NODE_PORT}/health`);
      console.log(`\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(async () => {
    await redis.quit();
    await pool.end();
    process.exit(0);
  });
});
