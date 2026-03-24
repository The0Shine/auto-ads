// =============================================================================
// Metrics Engine — writes to ad_metrics (TimescaleDB)
// Matches the full ad_metrics schema used by AI Optimizer
// =============================================================================

const pool = require('../timescale');

/**
 * Insert one metrics row into ad_metrics.
 * All derived fields (ctr, cpc, cpm, cpa, roas) are computed here
 * so the AI Optimizer can query them directly without re-computing.
 *
 * @param {object} ctx
 * @param {string} ctx.campaign_id   - internal UUID from campaigns table
 * @param {string} ctx.workspace_id  - internal UUID from workspaces table
 * @param {string} [ctx.ad_set_id]   - internal UUID from ad_sets table
 * @param {string} [ctx.ad_id]       - internal UUID from ads table
 * @param {string} ctx.platform      - 'facebook' | 'google' | 'tiktok'
 */
async function insertMetrics({ campaign_id, workspace_id, ad_set_id, ad_id, platform }) {
  // Simulate realistic ad performance values
  const impressions = Math.floor(Math.random() * 1000) + 50;   // 50-1050
  const clicks      = Math.floor(Math.random() * impressions * 0.05); // ~0-5% CTR
  const conversions = Math.floor(clicks * 0.05);               // ~5% of clicks convert
  const spend       = parseFloat((clicks * 0.15 + Math.random() * 2).toFixed(4)); // ~$0.15 CPC
  const revenue     = parseFloat((conversions * spend * 3).toFixed(4)); // ~3x ROAS
  const reach       = Math.floor(impressions * 0.8);           // reach ≈ 80% of impressions

  // Derived metrics — guard divide-by-zero
  const frequency = reach > 0       ? parseFloat((impressions / reach).toFixed(2))       : 0;
  const ctr       = impressions > 0 ? parseFloat((clicks / impressions).toFixed(6))      : 0;
  const cpc       = clicks > 0      ? parseFloat((spend / clicks).toFixed(4))             : 0;
  const cpm       = impressions > 0 ? parseFloat(((spend / impressions) * 1000).toFixed(4)) : 0;
  const cpa       = conversions > 0 ? parseFloat((spend / conversions).toFixed(4))        : 0;
  const roas      = spend > 0       ? parseFloat((revenue / spend).toFixed(4))            : 0;

  await pool.query(
    `INSERT INTO ad_metrics
     (time, workspace_id, campaign_id, ad_set_id, ad_id, platform,
      impressions, clicks, conversions, spend, revenue,
      reach, frequency, ctr, cpc, cpm, cpa, roas)
     VALUES
     (NOW(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17)`,
    [
      workspace_id, campaign_id, ad_set_id || null, ad_id || null, platform,
      impressions, clicks, conversions, spend, revenue,
      reach, frequency, ctr, cpc, cpm, cpa, roas,
    ]
  );
}

/**
 * Start repeating metrics simulation every 3 seconds.
 * Called by simulate.route.js after distribute, with full context.
 */
function startMetricsSimulation(ctx) {
  const intervalId = setInterval(async () => {
    try {
      await insertMetrics(ctx);
    } catch (err) {
      console.error('[Metrics] Insert error:', err.message);
    }
  }, 3000);

  // Auto-stop after 30s to avoid infinite growth in dev
  setTimeout(() => clearInterval(intervalId), 30000);
}

/**
 * Aggregate metrics for a campaign from ad_metrics.
 * Returns totals + pre-computed averages for the insights endpoint.
 */
async function getMetrics(campaign_id) {
  const res = await pool.query(
    `SELECT
       COALESCE(SUM(impressions), 0)              AS impressions,
       COALESCE(SUM(clicks), 0)                   AS clicks,
       COALESCE(SUM(conversions), 0)              AS conversions,
       COALESCE(SUM(spend), 0)                    AS spend,
       COALESCE(SUM(revenue), 0)                  AS revenue,
       COALESCE(SUM(reach), 0)                    AS reach,
       COALESCE(AVG(frequency), 0)                AS frequency,
       COALESCE(AVG(ctr), 0)                      AS ctr,
       COALESCE(AVG(cpc), 0)                      AS cpc,
       COALESCE(AVG(cpm), 0)                      AS cpm,
       COALESCE(AVG(cpa), 0)                      AS cpa,
       COALESCE(AVG(roas), 0)                     AS roas
     FROM ad_metrics
     WHERE campaign_id = $1`,
    [campaign_id]
  );
  return res.rows[0];
}

module.exports = { insertMetrics, startMetricsSimulation, getMetrics };
