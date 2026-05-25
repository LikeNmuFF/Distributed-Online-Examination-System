/**
 * Socket.IO Client Service
 * 
 * Demonstrates: Real-time Communication & Distributed Synchronization
 * 
 * Connects to the exam node for live timer updates.
 * All students in the same exam receive timer ticks simultaneously,
 * preventing clock skew attacks.
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost';

let socket = null;

export function initSocket() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✓ Socket.IO connected');
  });

  socket.on('disconnect', () => {
    console.log('✗ Socket.IO disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join an exam session room
 */
export function joinExam(sessionId, studentId, examId) {
  if (!socket?.connected) {
    initSocket();
  }
  
  socket.emit('join-exam', { sessionId, studentId, examId });
}

/**
 * Listen for timer updates
 */
export function onTimerTick(callback) {
  if (!socket) return;
  socket.on('timer:tick', callback);
}

/**
 * Listen for timer expiration
 */
export function onTimerExpired(callback) {
  if (!socket) return;
  socket.on('timer:expired', callback);
}

/**
 * Remove timer listeners
 */
export function offTimerTick(callback) {
  if (!socket) return;
  socket.off('timer:tick', callback);
}

/**
 * Get current socket ID (to show which node student is on)
 */
export function getSocketId() {
  return socket?.id || null;
}
