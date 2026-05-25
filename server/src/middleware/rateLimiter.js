/**
 * Rate Limiter Middleware
 * 
 * Demonstrates: Resource Protection & Load Management
 * 
 * Prevents DDoS and abuse by limiting requests per IP.
 * Essential for distributed systems handling many concurrent users.
 */

import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Don't rate-limit health checks
    return req.path === '/health';
  },
});

/**
 * Stricter rate limiter for auth endpoints (login)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Stricter rate limiter for submission endpoints
 */
export const submissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 submissions per minute
  message: 'Too many submissions, please try again later.',
});
