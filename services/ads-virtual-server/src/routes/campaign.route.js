const router = require('express').Router();
const { generateId } = require('../services/generator');
const { createCampaign } = require('../models/campaign.repo');
const { simulateLifecycle } = require('../services/lifecycle.engine');
const { startMetricsSimulation } = require('../services/metrics.engine');

router.post('/', async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'name required' });
    }

    // simulate latency giống Meta
    await new Promise(r => setTimeout(r, 200));

    // simulate rate limit
    if (Math.random() < 0.05) {
      return res.status(429).json({ error: 'Rate limit' });
    }

    const id = generateId('cmp');

    await createCampaign(id);

    simulateLifecycle(id);
    startMetricsSimulation(id);

    res.json({
      id,
      status: 'PAUSED'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;