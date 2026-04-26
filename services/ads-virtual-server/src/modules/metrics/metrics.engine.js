const pool = require("../../infrastructure/timescale");

// ==========================
// In-memory campaign state
// ==========================
const campaignState = {};
const STATE_TTL = 10 * 60 * 1000; // 10 phút

function initCampaignState(campaign_id) {
  if (!campaignState[campaign_id]) {
    campaignState[campaign_id] = {
      base_ctr: 0.01 + Math.random() * 0.03, // 1–4%
      base_cvr: 0.02 + Math.random() * 0.05, // 2–7%
      base_cpc: 0.1 + Math.random() * 0.4, // $0.1–0.5
      base_cpm: 5 + Math.random() * 10, // $5–15
      quality: Math.random(), // 0–1
      age: 0,
      lastUpdated: Date.now(),
      budget: 100 + Math.random() * 200, // giả lập budget
    };
  }
  return campaignState[campaign_id];
}

// ==========================
// Cleanup tránh memory leak
// ==========================
setInterval(() => {
  const now = Date.now();

  for (const [id, state] of Object.entries(campaignState)) {
    if (now - state.lastUpdated > STATE_TTL) {
      delete campaignState[id];
    }
  }
}, 60 * 1000);

// ==========================
// Safe DB query (retry)
// ==========================
async function safeQuery(query, params) {
  try {
    await pool.query(query, params);
  } catch (err) {
    console.error("[Metrics] DB error, retrying...", err.message);
    try {
      await pool.query(query, params);
    } catch (err2) {
      console.error("[Metrics] Retry failed:", err2.message);
    }
  }
}

// ==========================
// Insert metrics
// ==========================
async function insertMetrics(ctx) {
  const { campaign_id, workspace_id, ad_set_id, ad_id, platform } = ctx;

  const state = initCampaignState(campaign_id);
  state.age += 1;
  state.lastUpdated = Date.now();

  // ==========================
  // Decay (ad fatigue)
  // ==========================
  const decay = Math.max(0.5, 1 - state.age * 0.01);

  // ==========================
  // Impressions (scale theo quality)
  // ==========================
  const impressions = Math.floor(
    500 + state.quality * 1000 + Math.random() * 500,
  );

  // ==========================
  // CTR (bounded)
  // ==========================
  const raw_ctr = state.base_ctr * (0.7 + state.quality * 0.6) * decay;
  const ctr = Math.min(raw_ctr, 0.05); // max 5%

  const clicks = Math.floor(impressions * ctr);

  // ==========================
  // CVR
  // ==========================
  const raw_cvr = state.base_cvr * (0.7 + state.quality * 0.6);
  const cvr = Math.min(raw_cvr, 0.2); // max 20%

  const conversions = Math.min(Math.floor(clicks * cvr), clicks);

  // ==========================
  // CPC
  // ==========================
  const cpc = state.base_cpc * (0.8 + Math.random() * 0.4);
  const spend = parseFloat((clicks * cpc).toFixed(4));

  // Budget constraint
  if (state.budget <= 0) return;
  state.budget -= spend;

  // ==========================
  // Revenue
  // ==========================
  const value_per_conversion = 5 + Math.random() * 20;
  const revenue = parseFloat((conversions * value_per_conversion).toFixed(4));

  // ==========================
  // Reach & Frequency
  // ==========================
  const reach = Math.max(
    Math.floor(impressions * (0.7 + Math.random() * 0.2)),
    Math.floor(impressions * 0.5),
  );

  const frequency = reach > 0 ? impressions / reach : 0;

  // ==========================
  // Derived metrics
  // ==========================
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  // ==========================
  // Insert DB
  // ==========================
  await safeQuery(
    `INSERT INTO ad_metrics
     (time, workspace_id, campaign_id, ad_set_id, ad_id, platform,
      impressions, clicks, conversions, spend, revenue,
      reach, frequency, ctr, cpc, cpm, cpa, roas)
     VALUES
     (NOW(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17)`,
    [
      workspace_id,
      campaign_id,
      ad_set_id || null,
      ad_id || null,
      platform,
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      reach,
      frequency,
      ctr,
      cpc,
      cpm,
      cpa,
      roas,
    ],
  );
}

// ==========================
// Start simulation
// ==========================
function startMetricsSimulation(ctx) {
  const intervalId = setInterval(async () => {
    try {
      await insertMetrics(ctx);
    } catch (err) {
      console.error("[Metrics] Insert error:", err.message);
    }
  }, 3000);

  // auto stop (dev safety)
  setTimeout(() => clearInterval(intervalId), 30000);
}

// ==========================
// Aggregate metrics
// ==========================
async function getMetrics(campaign_id) {
  const res = await pool.query(
    `SELECT
       COALESCE(SUM(impressions), 0) AS impressions,
       COALESCE(SUM(clicks), 0) AS clicks,
       COALESCE(SUM(conversions), 0) AS conversions,
       COALESCE(SUM(spend), 0) AS spend,
       COALESCE(SUM(revenue), 0) AS revenue,
       COALESCE(SUM(reach), 0) AS reach,
       COALESCE(AVG(frequency), 0) AS frequency,
       COALESCE(AVG(ctr), 0) AS ctr,
       COALESCE(AVG(cpc), 0) AS cpc,
       COALESCE(AVG(cpm), 0) AS cpm,
       COALESCE(AVG(cpa), 0) AS cpa,
       COALESCE(AVG(roas), 0) AS roas
     FROM ad_metrics
     WHERE campaign_id = $1`,
    [campaign_id],
  );

  return res.rows[0];
}

module.exports = {
  insertMetrics,
  startMetricsSimulation,
  getMetrics,
};
