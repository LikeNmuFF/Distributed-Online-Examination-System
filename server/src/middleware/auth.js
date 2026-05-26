import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token for both student and teacher roles
 * @param {number} userId - User ID
 * @param {string} username - Username
 * @param {string} userType - 'student' or 'teacher'
 * @param {boolean} isAdmin - Whether user is admin (legacy field)
 */
export function generateToken(userId, username, userType = 'student', isAdmin = false) {
  return jwt.sign({ 
    id: userId, 
    username, 
    userType: userType || 'student',
    isAdmin: isAdmin || false 
  }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { 
      id: decoded.id, 
      username: decoded.username, 
      userType: decoded.userType || 'student',
      isAdmin: decoded.isAdmin || false
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware to require teacher role
 */
export function requireTeacher(req, res, next) {
  if (!req.user || req.user.userType !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  next();
}

/**
 * Middleware to require student role
 */
export function requireStudent(req, res, next) {
  if (!req.user || req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
}

export const JWT_CONFIG = { secret: JWT_SECRET, expiry: JWT_EXPIRY };
