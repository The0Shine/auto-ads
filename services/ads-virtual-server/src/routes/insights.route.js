const router = require('express').Router();
const { getMetrics } = require('../services/metrics.engine');

router.get('/:id', async (req, res) => {
  try {
    const m = await getMetrics(req.params.id);

    res.json({
      data: [
        {
          impressions: Number(m.impressions),
          clicks: Number(m.clicks),
          spend: Number(m.spend).toFixed(2),
          ctr: m.impressions ? m.clicks / m.impressions : 0
        }
      ]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;