// =============================================================================
// JWT Auth Middleware
// =============================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Access token required' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { message: 'Token expired' } });
    }
    return res.status(403).json({ success: false, error: { message: 'Invalid token' } });
  }
}

module.exports = { authenticateToken };
