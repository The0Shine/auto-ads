// =============================================================================
// Auth Routes — Register, Login, Refresh, Profile, Logout
// =============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/error');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'autoads_dev_jwt_secret_32_chars_long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7');

// ─── Helper: Generate Tokens ────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function generateRefreshToken(db, userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + JWT_REFRESH_EXPIRES_DAYS);

  await db.query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (gen_random_uuid(), $1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── POST /auth/register ────────────────────────────────────────────────────

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').optional().isString().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const { email, password, fullName } = req.body;
    const db = req.app.locals.db;

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'user', 'active')
       RETURNING *`,
      [email, passwordHash, fullName || null]
    );

    const user = result.rows[0];

    // Auto-create a default workspace for this user (workspace_id = user.id)
    await db.query(
      `INSERT INTO workspaces (id, name, owner_id)
       VALUES ($1, $2, $1)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, `${fullName || email.split('@')[0]}'s Workspace`]
    );
    await db.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $1, 'owner')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(db, user.id);

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/login ───────────────────────────────────────────────────────

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const { email, password } = req.body;
    const db = req.app.locals.db;

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check status
    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(db, user.id);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/refresh-token ───────────────────────────────────────────────

router.post('/refresh-token', [
  body('refreshToken').isString().notEmpty(),
], async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const db = req.app.locals.db;

    // Find valid refresh token
    const result = await db.query(
      `SELECT rt.*, u.* FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const row = result.rows[0];

    // Delete old refresh token (rotation)
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    // Generate new tokens
    const user = { id: row.user_id, email: row.email, role: row.role };
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(db, user.id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /auth/me ───────────────────────────────────────────────────────────

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({ success: true, data: sanitizeUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { refreshToken } = req.body;

    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2', [refreshToken, req.user.userId]);
    } else {
      // Remove all refresh tokens for this user
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.userId]);
    }

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
