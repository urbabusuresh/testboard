/**
 * Authentication Middleware for Prisma-based routes
 * Lightweight JWT verification without Sequelize dependency
 */

const jwt = require('jsonwebtoken');
const { defaultDangerKey } = require('../routes/users/authSettings');

/**
 * Verify user is signed in
 * Sets req.userId and req.user for authenticated requests
 */
function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization');
  const secretKey = process.env.SECRET_KEY || defaultDangerKey;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role || 'viewer'
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Verify user has admin role
 * Must be called after authenticateToken
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Verify user has manager or admin role
 * Must be called after authenticateToken
 */
function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const allowedRoles = ['admin', 'administrator', 'manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManager
};
