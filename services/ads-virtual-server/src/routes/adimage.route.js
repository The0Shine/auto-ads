// =============================================================================
// Mock FB Ad Images — mirrors POST/GET /act_{id}/adimages
// Real FB: upload image → get hash → use hash in AdCreative
// Mock:    accept URL → generate hash → store → return hash
// =============================================================================

const router  = require('express').Router();
const crypto  = require('crypto');

// In-memory store: hash → image record
const store = new Map();

// POST / — Upload image, get hash (mirrors FB: POST /act_{id}/adimages)
// Accepts: { url, name }  (mock: we receive URL instead of binary file)
router.post('/', async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({
      error: { message: 'url is required', type: 'OAuthException', code: 100 },
    });

    // Generate deterministic hash from URL (same URL → same hash, like FB)
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const imgName = name || `img-${Date.now()}.jpg`;

    if (!store.has(hash)) {
      store.set(hash, {
        hash,
        name:         imgName,
        url,
        width:        1200,
        height:       628,
        created_time: new Date().toISOString(),
        id:           `mock_adaccount:${hash}`,
      });
    }

    // FB returns: { images: { filename: { hash, url, ... } } }
    res.json({
      images: {
        [imgName]: {
          hash,
          url,
          width:  1200,
          height: 628,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET / — List uploaded images (mirrors FB: GET /act_{id}/adimages)
router.get('/', (req, res) => {
  const data = Array.from(store.values()).map(img => ({
    hash:         img.hash,
    name:         img.name,
    url:          img.url,
    width:        img.width,
    height:       img.height,
    created_time: img.created_time,
    id:           img.id,
  }));

  res.json({
    data,
    paging: { cursors: { before: '', after: '' } },
  });
});

// GET /:hash — Get single image by hash
router.get('/:hash', (req, res) => {
  const img = store.get(req.params.hash);
  if (!img) return res.status(404).json({
    error: { message: 'Invalid image hash', type: 'OAuthException', code: 100 },
  });
  res.json(img);
});

module.exports = router;
