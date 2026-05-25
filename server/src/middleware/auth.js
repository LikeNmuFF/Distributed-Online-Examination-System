import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const JWT_EXPIRY = '24h';

export function generateToken(studentId, username, isAdmin = false) {
  return jwt.sign({ id: studentId, username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username, isAdmin: decoded.isAdmin || false };
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

export const JWT_CONFIG = { secret: JWT_SECRET, expiry: JWT_EXPIRY };
