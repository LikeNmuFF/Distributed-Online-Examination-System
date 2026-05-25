/**
 * Redis Client Module
 * 
 * Demonstrates: Distributed State Management
 * 
 * Provides a Redis connection for:
 * - Distributed session storage (survives node crashes)
 * - Synchronized timers across all exam nodes
 * - Real-time locks for exam submissions
 * - Message queue backing (Bull uses Redis)
 * 
 * Redis is a core component that ensures all nodes
 * share the same state, preventing cheating and ensuring consistency.
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
});

redis.on('connect', () => {
  console.log(`✓ Redis connected (${process.env.NODE_ID || 'unknown'})`);
});

redis.on('error', (err) => {
  console.error('✗ Redis connection error:', err);
});

redis.on('reconnecting', () => {
  console.log(`⟳ Redis reconnecting (${process.env.NODE_ID || 'unknown'})`);
});

export default redis;
