// =============================================================================
// Campaign Routes — CRUD + Lifecycle + Kafka Events
// =============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { publishEvent, TOPICS } = require('../kafka/kafka.producer');

const router = express.Router();

// ─── POST / — Tạo Campaign ─────────────────────────────────────────────────

router.post('/', [
  body('name').isString().notEmpty().withMessage('Campaign name is required'),
  body('objective').isIn(['AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS', 'CONVERSIONS', 'SALES']),
  body('totalBudget').optional().isNumeric(),
  body('dailyBudget').optional().isNumeric(),
  body('currency').optional().isString(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const db = req.app.locals.db;
    const userId = req.headers['x-user-id'];

    if (!userId) {
      throw new AppError('User ID required (x-user-id header)', 401);
    }

    const { name, description, objective, totalBudget, dailyBudget, currency, startDate, endDate, targeting, settings } = req.body;

    // platforms mặc định là facebook (vì chỉ hỗ trợ FB)
    const platforms = ['facebook'];

    const result = await db.query(
      `INSERT INTO campaigns (id, workspace_id, created_by, name, description, objective, status, total_budget, daily_budget, currency, start_date, end_date, platforms, targeting, settings)
       VALUES (gen_random_uuid(), $1, $1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        name, description || null, objective,
        totalBudget || null, dailyBudget || null, currency || 'USD',
        startDate || null, endDate || null,
        JSON.stringify(platforms),
        JSON.stringify(targeting || {}),
        JSON.stringify(settings || {}),
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET / — List Campaigns ────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = req.headers['x-user-id'];
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let whereClauses = ['created_by = $1'];
    const params = [userId];

    if (status) {
      params.push(status.toUpperCase());
      whereClauses.push(`status = $${params.length}`);
    }

    const whereSQL = whereClauses.join(' AND ');

    // Count total
    const countResult = await db.query(`SELECT COUNT(*) FROM campaigns WHERE ${whereSQL}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Paginate
    params.push(limit, offset);
    const result = await db.query(
      `SELECT * FROM campaigns WHERE ${whereSQL} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id — Chi tiết Campaign + Ad Sets ────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const campaign = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (campaign.rows.length === 0) throw new AppError('Campaign not found', 404);

    // Get ad sets
    const adSets = await db.query('SELECT * FROM ad_sets WHERE campaign_id = $1 ORDER BY created_at', [id]);

    // Get ads for each ad set
    const adSetIds = adSets.rows.map(as => as.id);
    let ads = [];
    if (adSetIds.length > 0) {
      const adsResult = await db.query(
        `SELECT a.*, c.name as creative_name, c.type as creative_type, c.headline, c.body as creative_body, c.media_urls
         FROM ads a LEFT JOIN creatives c ON a.creative_id = c.id
         WHERE a.ad_set_id = ANY($1) ORDER BY a.created_at`,
        [adSetIds]
      );
      ads = adsResult.rows;
    }

    // Nest ads inside ad sets
    const adSetsWithAds = adSets.rows.map(adSet => ({
      ...adSet,
      ads: ads.filter(ad => ad.ad_set_id === adSet.id),
    }));

    // Get platform mappings
    const mappings = await db.query(
      "SELECT * FROM platform_mappings WHERE entity_type = 'CAMPAIGN' AND internal_id = $1",
      [id]
    );

    res.json({
      success: true,
      data: {
        ...campaign.rows[0],
        ad_sets: adSetsWithAds,
        platform_mappings: mappings.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id — Update Campaign ────────────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new AppError('Campaign not found', 404);
    if (!['DRAFT', 'PAUSED'].includes(existing.rows[0].status)) {
      throw new AppError('Can only edit campaigns in DRAFT or PAUSED status', 400);
    }

    const { name, description, objective, totalBudget, dailyBudget, startDate, endDate, targeting, settings } = req.body;

    const result = await db.query(
      `UPDATE campaigns SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        objective = COALESCE($3, objective),
        total_budget = COALESCE($4, total_budget),
        daily_budget = COALESCE($5, daily_budget),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        targeting = COALESCE($8, targeting),
        settings = COALESCE($9, settings),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        name || null, description || null, objective || null,
        totalBudget || null, dailyBudget || null,
        startDate || null, endDate || null,
        targeting ? JSON.stringify(targeting) : null,
        settings ? JSON.stringify(settings) : null,
        id,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/distribute — Push lên Facebook qua Kafka ────────────────────

router.post('/:id/distribute', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const campaign = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (campaign.rows.length === 0) throw new AppError('Campaign not found', 404);
    if (!['DRAFT', 'PAUSED'].includes(campaign.rows[0].status)) {
      throw new AppError('Campaign must be in DRAFT or PAUSED status to distribute', 400);
    }

    // Get ad sets with ads
    const adSets = await db.query('SELECT * FROM ad_sets WHERE campaign_id = $1', [id]);
    if (adSets.rows.length === 0) {
      throw new AppError('Campaign must have at least 1 ad set before distributing', 400);
    }

    // Update status → DISTRIBUTING
    await db.query("UPDATE campaigns SET status = 'DISTRIBUTING', updated_at = NOW() WHERE id = $1", [id]);

    // Publish event to Kafka
    const distributed = await publishEvent(TOPICS.CAMPAIGN_DISTRIBUTE, id, {
      eventType: 'campaign.distribute',
      campaignId: id,
      campaign: campaign.rows[0],
      adSets: adSets.rows,
    });

    res.json({
      success: true,
      data: {
        message: distributed ? 'Distribution event published' : 'Distribution queued (Kafka offline)',
        campaignId: id,
        status: 'DISTRIBUTING',
        adSetsCount: adSets.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/pause ───────────────────────────────────────────────────────

router.post('/:id/pause', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const existing = await db.query('SELECT status FROM campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new AppError('Campaign not found', 404);
    if (!['ACTIVE', 'DISTRIBUTING', 'PARTIALLY_ACTIVE'].includes(existing.rows[0].status)) {
      throw new AppError('Campaign is not active', 400);
    }

    const result = await db.query(
      "UPDATE campaigns SET status = 'PAUSED', updated_at = NOW() WHERE id = $1 RETURNING *", [id]
    );

    await publishEvent(TOPICS.CAMPAIGN_PAUSE, id, {
      eventType: 'campaign.pause',
      campaignId: id,
    });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/resume ──────────────────────────────────────────────────────

router.post('/:id/resume', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const existing = await db.query('SELECT status FROM campaigns WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new AppError('Campaign not found', 404);
    if (existing.rows[0].status !== 'PAUSED') {
      throw new AppError('Campaign is not paused', 400);
    }

    const result = await db.query(
      "UPDATE campaigns SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *", [id]
    );

    await publishEvent(TOPICS.CAMPAIGN_RESUME, id, {
      eventType: 'campaign.resume',
      campaignId: id,
    });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id — Soft delete (archive) ───────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.query(
      "UPDATE campaigns SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 RETURNING id", [id]
    );
    if (result.rows.length === 0) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: { message: 'Campaign archived', id } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/status — Platform sync status ───────────────────────────────

router.get('/:id/status', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const campaign = await db.query('SELECT id, name, status FROM campaigns WHERE id = $1', [id]);
    if (campaign.rows.length === 0) throw new AppError('Campaign not found', 404);

    const mappings = await db.query(
      "SELECT * FROM platform_mappings WHERE internal_id = $1 AND entity_type = 'CAMPAIGN'", [id]
    );

    res.json({
      success: true,
      data: {
        campaign: campaign.rows[0],
        platforms: mappings.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
