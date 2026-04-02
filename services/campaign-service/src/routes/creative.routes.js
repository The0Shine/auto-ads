// =============================================================================
// Creative Routes — CRUD + MinIO file upload
// =============================================================================

const express = require('express');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { uploadFile, deleteFile, extractKey } = require('../lib/storage');

const router = express.Router();

// multer: store in memory (buffer), max 20MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(`File type not allowed: ${file.mimetype}`, 400));
  },
});

// ─── POST /upload — Upload file lên MinIO ──────────────────────────────────
// multipart/form-data: file=<binary>
// Returns: { url, key, size, mimetype }

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded (field name: file)' });

    const userId    = req.headers['x-user-id'] || 'anonymous';
    const ext       = req.file.originalname.split('.').pop().toLowerCase();
    const key       = `${userId}/${uuidv4()}.${ext}`;
    const publicUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);

    res.json({
      success: true,
      data: {
        url:      publicUrl,
        key,
        size:     req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST / — Tạo Creative ─────────────────────────────────────────────────

router.post('/', [
  body('name').isString().notEmpty(),
  body('type').isIn(['IMAGE', 'VIDEO', 'CAROUSEL', 'COLLECTION', 'TEXT']),
  body('headline').optional({ values: 'null' }).isString(),
  body('body').optional({ values: 'null' }).isString(),
  body('callToAction').optional({ values: 'null' }).isString(),
  body('destinationUrl').optional({ values: 'null' }).isURL(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
    }

    const db = req.app.locals.db;
    const userId = req.headers['x-user-id'];

    const { name, type, headline, body: bodyText, callToAction, destinationUrl, metadata } = req.body;
    const mediaUrls   = req.body.mediaUrls    || req.body.media_urls    || [];
    const thumbnailUrl = req.body.thumbnailUrl || req.body.thumbnail_url || null;

    const result = await db.query(
      `INSERT INTO creatives (id, workspace_id, created_by, name, type, headline, body, call_to_action, destination_url, media_urls, thumbnail_url, metadata)
       VALUES (gen_random_uuid(), $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        name, type,
        headline || null, bodyText || null,
        callToAction || null, destinationUrl || null,
        JSON.stringify(mediaUrls || []),
        thumbnailUrl || null,
        JSON.stringify(metadata || {}),
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET / — List Creatives ────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const userId = req.headers['x-user-id'];
    const type = req.query.type;

    let sql = 'SELECT * FROM creatives WHERE created_by = $1';
    const params = [userId];

    if (type) {
      params.push(type.toUpperCase());
      sql += ` AND type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';
    const result = await db.query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id — Chi tiết Creative ──────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM creatives WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Creative not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id — Update Creative ────────────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { name, headline, body: bodyText, callToAction, destinationUrl, mediaUrls, thumbnailUrl } = req.body;

    // If new mediaUrls provided, delete old files from MinIO
    if (mediaUrls) {
      const old = await db.query('SELECT media_urls, thumbnail_url FROM creatives WHERE id = $1', [req.params.id]);
      if (old.rows.length > 0) {
        const oldUrls = old.rows[0].media_urls || [];
        for (const url of oldUrls) {
          const key = extractKey(url);
          if (key) deleteFile(key).catch(() => {});
        }
      }
    }

    const result = await db.query(
      `UPDATE creatives SET
        name = COALESCE($1, name),
        headline = COALESCE($2, headline),
        body = COALESCE($3, body),
        call_to_action = COALESCE($4, call_to_action),
        destination_url = COALESCE($5, destination_url),
        media_urls = COALESCE($6, media_urls),
        thumbnail_url = COALESCE($7, thumbnail_url),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        name || null, headline || null, bodyText || null,
        callToAction || null, destinationUrl || null,
        mediaUrls ? JSON.stringify(mediaUrls) : null,
        thumbnailUrl || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) throw new AppError('Creative not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id ────────────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const db = req.app.locals.db;

    // Delete associated files from MinIO
    const existing = await db.query('SELECT media_urls, thumbnail_url FROM creatives WHERE id = $1', [req.params.id]);
    if (existing.rows.length > 0) {
      const { media_urls, thumbnail_url } = existing.rows[0];
      for (const url of (media_urls || [])) {
        const key = extractKey(url);
        if (key) deleteFile(key).catch(() => {});
      }
      if (thumbnail_url) {
        const key = extractKey(thumbnail_url);
        if (key) deleteFile(key).catch(() => {});
      }
    }

    // Block delete if creative is used by any ads
    const usedBy = await db.query(
      `SELECT a.name, c.name AS campaign_name
       FROM ads a
       JOIN ad_sets ads ON a.ad_set_id = ads.id
       JOIN campaigns c ON ads.campaign_id = c.id
       WHERE a.creative_id = $1 LIMIT 5`,
      [req.params.id]
    );
    if (usedBy.rows.length > 0) {
      const names = usedBy.rows.map(r => `"${r.name}" (${r.campaign_name})`).join(', ');
      throw new AppError(`Creative đang được dùng bởi: ${names}. Xóa ad trước.`, 409);
    }

    const result = await db.query('DELETE FROM creatives WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Creative not found', 404);
    res.json({ success: true, data: { message: 'Creative deleted' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
