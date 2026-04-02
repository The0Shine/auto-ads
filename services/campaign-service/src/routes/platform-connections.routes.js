// =============================================================================
// Platform Connections Routes — read-only, used by frontend to check FB status
// =============================================================================

const router = require('express').Router();

// ─── GET /platform-connections ───────────────────────────────────────────────
// Returns current user's platform connections (no token exposed)

router.get('/', async (req, res, next) => {
  try {
    const db     = req.app.locals.db;
    const userId = req.headers['x-user-id'];

    const result = await db.query(
      `SELECT platform, platform_user_id, ad_accounts, scopes, status,
              token_expires_at, created_at, updated_at
       FROM platform_connections
       WHERE user_id = $1 ORDER BY platform`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
