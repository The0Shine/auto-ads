const router = require('express').Router();
const { generateId } = require('../services/generator');

// In-memory store
const store = new Map();

async function simulateFB(res) {
  await new Promise(r => setTimeout(r, 200));
  if (Math.random() < 0) {
    res.status(429).json({ error: { message: 'User request limit reached', type: 'OAuthException', code: 17 } });
    return false;
  }
  return true;
}

// POST / — Create Ad (mirrors FB: POST /act_{id}/ads)
router.post('/', async (req, res) => {
  try {
    if (!await simulateFB(res)) return;

    const { name, adset_id, creative } = req.body;
    if (!name)      return res.status(400).json({ error: { message: 'name is required', type: 'OAuthException', code: 100 } });
    if (!adset_id)  return res.status(400).json({ error: { message: 'adset_id is required', type: 'OAuthException', code: 100 } });
    if (!creative)  return res.status(400).json({ error: { message: 'creative is required', type: 'OAuthException', code: 100 } });

    const id = generateId();

    store.set(id, {
      id,
      name,
      adset_id,
      creative,
      status: 'PAUSED',
      created_time: new Date().toISOString(),
    });

    // FB API returns [id, name] as requested by adapter
    res.json({ id, name });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /:id — Read Ad
router.get('/:id', async (req, res) => {
  const ad = store.get(req.params.id);
  if (!ad) return res.status(404).json({ error: { message: 'Invalid ad ID', type: 'OAuthException', code: 100 } });
  res.json(ad);
});

module.exports = router;
