const router = require("express").Router();
const { getMetrics } = require("../modules/metrics/metrics.engine");

// GET /:id — Insights (mirrors FB: GET /{campaign-id}/insights)
// FB returns all numeric values as STRINGS — we do the same
router.get("/:id", async (req, res) => {
  try {
    const m = await getMetrics(req.params.id);

    const impressions = Number(m.impressions) || 0;
    const clicks = Number(m.clicks) || 0;
    const spend = Number(m.spend) || 0;
    const reach = Number(m.reach) || 0;
    const conversions = Number(m.conversions) || 0;
    const revenue = Number(m.revenue) || 0;

    // Derived — guard divide-by-zero
    const frequency = reach > 0 ? impressions / reach : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    // date_start / date_stop: last 7 days window (default FB preset)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const fmt = (d) => d.toISOString().slice(0, 10);

    res.json({
      data: [
        {
          // All numeric values returned as strings — identical to FB Marketing API
          impressions: String(impressions),
          clicks: String(clicks),
          spend: spend.toFixed(4),
          reach: String(reach),
          conversions: String(conversions),
          frequency: frequency.toFixed(2),
          ctr: ctr.toFixed(6),
          cpc: cpc.toFixed(4),
          cpm: cpm.toFixed(4),
          cpa: cpa.toFixed(4),
          roas: roas.toFixed(4),
          date_start: fmt(weekAgo),
          date_stop: fmt(today),
          cost_per_action_type:
            conversions > 0
              ? [
                  {
                    action_type: "offsite_conversion.fb_pixel_purchase",
                    value: cpa.toFixed(4),
                  },
                ]
              : [],
        },
      ],
      paging: { cursors: { before: "", after: "" } },
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
