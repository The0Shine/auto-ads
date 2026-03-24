const router = require('express').Router();
const { generateId } = require('../services/generator');

// In-memory store
const store = new Map();

async function simulateFB(res) {
  await new Promise(r => setTimeout(r, 200));
  if (Math.random() < 0.05) {
    res.status(429).json({ error: { message: 'User request limit reached', type: 'OAuthException', code: 17 } });
    return false;
  }
  return true;
}

// POST / — Create Campaign (mirrors FB: POST /act_{id}/campaigns)
// The handler (campaign.handler.js) triggers metrics + lifecycle separately
// via POST /simulate/metrics — so this route ONLY creates and returns an ID.
router.post('/', async (req, res) => {
  try {
    if (!await simulateFB(res)) return;

    if (!req.body.name) {
      return res.status(400).json({ error: { message: 'name is required', type: 'OAuthException', code: 100 } });
    }

    const id = generateId();

    store.set(id, {
      id,
      name: req.body.name,
      status: 'PAUSED',
      created_time: new Date().toISOString(),
    });

    // FB API returns [id, name] when those fields are requested
    res.json({ id, name: req.body.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /:id — Read Campaign
router.get('/:id', async (req, res) => {
  const campaign = store.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: { message: 'Invalid campaign ID', type: 'OAuthException', code: 100 } });
  res.json(campaign);
});

module.exports = router;
