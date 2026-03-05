// =============================================================================
// API Gateway — JWT Auth Middleware
// =============================================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'autoads_dev_jwt_secret_32_chars_long';

/**
 * Middleware to verify JWT token and attach user info to request headers.
 * Downstream services receive user info via X-User-Id and X-User-Email headers.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.sub || decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-workspace-id'] = decoded.workspaceId || '';

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' },
    });
  }
}

module.exports = { authMiddleware };
