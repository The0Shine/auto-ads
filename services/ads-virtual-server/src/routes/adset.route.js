const router = require('express').Router();
const { generateId } = require('../services/generator');

// In-memory store (matches FB API: keyed by platform ID)
const store = new Map();

async function simulateFB(res) {
  await new Promise(r => setTimeout(r, 200));
  if (Math.random() < 0.05) {
    res.status(429).json({ error: { message: 'User request limit reached', type: 'OAuthException', code: 17 } });
    return false;
  }
  return true;
}

// POST / — Create AdSet (mirrors FB: POST /act_{id}/adsets)
router.post('/', async (req, res) => {
  try {
    if (!await simulateFB(res)) return;

    const {
      name, campaign_id,
      targeting, bid_strategy, daily_budget,
      optimization_goal, billing_event,
      start_time, end_time,
      bid_amount,
    } = req.body;

    if (!name)        return res.status(400).json({ error: { message: 'name is required', type: 'OAuthException', code: 100 } });
    if (!campaign_id) return res.status(400).json({ error: { message: 'campaign_id is required', type: 'OAuthException', code: 100 } });

    const id = generateId();

    store.set(id, {
      id,
      name,
      campaign_id,
      status:            'PAUSED',
      targeting:         targeting         || { geo_locations: { countries: ['VN'] }, age_min: 18, age_max: 65 },
      bid_strategy:      bid_strategy      || 'LOWEST_COST_WITHOUT_CAP',
      daily_budget:      daily_budget      || null,
      optimization_goal: optimization_goal || null,
      billing_event:     billing_event     || null,
      bid_amount:        bid_amount        || null,
      start_time:        start_time        || new Date().toISOString(),
      end_time:          end_time          || null,
      created_time:      new Date().toISOString(),
    });

    // FB returns only requested fields — adapter requests [id, name]
    res.json({ id, name });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// GET /:id — Read AdSet
router.get('/:id', async (req, res) => {
  const adset = store.get(req.params.id);
  if (!adset) return res.status(404).json({ error: { message: 'Invalid adset ID', type: 'OAuthException', code: 100 } });
  res.json(adset);
});

module.exports = router;
