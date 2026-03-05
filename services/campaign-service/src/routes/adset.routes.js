// =============================================================================
// Ad Set Routes — CRUD (nested under /campaigns/:campaignId/ad-sets)
// =============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();

// ─── POST /:campaignId/ad-sets — Tạo Ad Set ────────────────────────────────

router.post('/:campaignId/ad-sets', [
  body('name').isString().notEmpty(),
  body('budget').optional().isNumeric(),
  body('budgetType').optional().isIn(['DAILY', 'LIFETIME']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const db = req.app.locals.db;
    const { campaignId } = req.params;

    // Verify campaign exists
    const campaign = await db.query('SELECT id FROM campaigns WHERE id = $1', [campaignId]);
    if (campaign.rows.length === 0) throw new AppError('Campaign not found', 404);

    const { name, budget, budgetType, bidStrategy, bidAmount, targeting, placements, schedule, optimizationGoal } = req.body;

    const result = await db.query(
      `INSERT INTO ad_sets (id, campaign_id, name, status, budget, budget_type, bid_strategy, bid_amount, targeting, placements, schedule, optimization_goal)
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        campaignId, name,
        budget || null, budgetType || 'DAILY',
        bidStrategy || null, bidAmount || null,
        JSON.stringify(targeting || {}), JSON.stringify(placements || {}),
        JSON.stringify(schedule || {}), optimizationGoal || null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:campaignId/ad-sets — List Ad Sets ───────────────────────────────

router.get('/:campaignId/ad-sets', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { campaignId } = req.params;

    const result = await db.query(
      'SELECT * FROM ad_sets WHERE campaign_id = $1 ORDER BY created_at', [campaignId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:campaignId/ad-sets/:id — Update Ad Set ──────────────────────────

router.put('/:campaignId/ad-sets/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id, campaignId } = req.params;
    const { name, budget, budgetType, bidStrategy, bidAmount, targeting, placements, schedule, status } = req.body;

    const result = await db.query(
      `UPDATE ad_sets SET
        name = COALESCE($1, name),
        budget = COALESCE($2, budget),
        budget_type = COALESCE($3, budget_type),
        bid_strategy = COALESCE($4, bid_strategy),
        bid_amount = COALESCE($5, bid_amount),
        targeting = COALESCE($6, targeting),
        placements = COALESCE($7, placements),
        schedule = COALESCE($8, schedule),
        status = COALESCE($9, status),
        updated_at = NOW()
       WHERE id = $10 AND campaign_id = $11 RETURNING *`,
      [
        name || null, budget || null, budgetType || null,
        bidStrategy || null, bidAmount || null,
        targeting ? JSON.stringify(targeting) : null,
        placements ? JSON.stringify(placements) : null,
        schedule ? JSON.stringify(schedule) : null,
        status || null, id, campaignId,
      ]
    );

    if (result.rows.length === 0) throw new AppError('Ad Set not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:campaignId/ad-sets/:id ────────────────────────────────────────

router.delete('/:campaignId/ad-sets/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id, campaignId } = req.params;

    const result = await db.query(
      'DELETE FROM ad_sets WHERE id = $1 AND campaign_id = $2 RETURNING id', [id, campaignId]
    );
    if (result.rows.length === 0) throw new AppError('Ad Set not found', 404);

    res.json({ success: true, data: { message: 'Ad Set deleted' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
