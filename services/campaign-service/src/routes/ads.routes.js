// =============================================================================
// Ads Routes — CRUD (nested under /campaigns/:campaignId/ad-sets/:adSetId/ads)
// =============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();

// ─── POST /:campaignId/ad-sets/:adSetId/ads — Tạo Ad ──────────────────────

router.post('/:campaignId/ad-sets/:adSetId/ads', [
  body('name').isString().notEmpty(),
  body('creativeId').isUUID(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const db = req.app.locals.db;
    const { campaignId, adSetId } = req.params;
    const { name, creativeId } = req.body;

    // Verify ad set belongs to campaign
    const adSetCheck = await db.query(
      'SELECT id FROM ad_sets WHERE id = $1 AND campaign_id = $2',
      [adSetId, campaignId]
    );
    if (adSetCheck.rows.length === 0) throw new AppError('Ad Set not found in this campaign', 404);

    // Verify creative exists
    const creativeCheck = await db.query('SELECT id FROM creatives WHERE id = $1', [creativeId]);
    if (creativeCheck.rows.length === 0) throw new AppError('Creative not found', 404);

    const result = await db.query(
      `INSERT INTO ads (ad_set_id, creative_id, name)
       VALUES ($1, $2, $3) RETURNING *`,
      [adSetId, creativeId, name]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:campaignId/ad-sets/:adSetId/ads — List Ads ──────────────────────

router.get('/:campaignId/ad-sets/:adSetId/ads', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { adSetId } = req.params;

    const result = await db.query(
      `SELECT a.*, c.name AS creative_name, c.type AS creative_type,
              c.headline, c.body AS creative_body, c.media_urls
       FROM ads a
       LEFT JOIN creatives c ON c.id = a.creative_id
       WHERE a.ad_set_id = $1
       ORDER BY a.created_at DESC`,
      [adSetId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:campaignId/ad-sets/:adSetId/ads/:id — Xóa Ad ─────────────────

router.delete('/:campaignId/ad-sets/:adSetId/ads/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id, adSetId } = req.params;

    const result = await db.query(
      'DELETE FROM ads WHERE id = $1 AND ad_set_id = $2 RETURNING id',
      [id, adSetId]
    );
    if (result.rows.length === 0) throw new AppError('Ad not found', 404);

    res.json({ success: true, data: { message: 'Ad deleted' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
