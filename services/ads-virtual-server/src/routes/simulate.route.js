const router = require('express').Router();
const { startMetricsSimulation } = require('../services/metrics.engine');

// POST /simulate/metrics
// Called by facebook-adapter after distribute succeeds (mock mode only).
// Receives internal UUIDs so metrics are written with correct campaign_id,
// workspace_id, ad_set_id — matching what AI Optimizer queries from ad_metrics.
//
// Note: campaign status transitions (DISTRIBUTING → ACTIVE) are handled by
// the handler publishing campaign.status.changed to Kafka. No lifecycle
// simulation needed here.
router.post('/metrics', async (req, res) => {
  try {
    const { campaign_id, workspace_id, platform = 'facebook', ad_sets = [] } = req.body;

    if (!campaign_id)  return res.status(400).json({ error: 'campaign_id required' });
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' });

    // Start one simulation loop per ad_set/ad combination
    // If no ad_sets provided, simulate at campaign level only
    if (ad_sets.length === 0) {
      startMetricsSimulation({ campaign_id, workspace_id, platform });
    } else {
      for (const adSet of ad_sets) {
        const ads = adSet.ads || [];
        if (ads.length === 0) {
          startMetricsSimulation({ campaign_id, workspace_id, ad_set_id: adSet.ad_set_id, platform });
        } else {
          for (const ad of ads) {
            startMetricsSimulation({
              campaign_id,
              workspace_id,
              ad_set_id: adSet.ad_set_id,
              ad_id: ad.ad_id,
              platform,
            });
          }
        }
      }
    }

    res.json({ ok: true, campaign_id, simulations_started: Math.max(1, ad_sets.reduce((n, as) => n + Math.max(1, (as.ads || []).length), 0)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
