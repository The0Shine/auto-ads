const pool = require('../timescale');

async function insertMetrics(id, impressions, clicks, spend) {
  await pool.query(
    `INSERT INTO campaign_metrics 
     (campaign_id, impressions, clicks, spend)
     VALUES ($1, $2, $3, $4)`,
    [id, impressions, clicks, spend]
  );
}

function startMetricsSimulation(id) {
  setInterval(async () => {
    try {
      const imp = Math.floor(Math.random() * 100);
      const clk = Math.floor(Math.random() * 10);
      const spend = clk * 0.02;

      await insertMetrics(id, imp, clk, spend);

    } catch (err) {
      console.error('Metrics error:', err.message);
    }
  }, 3000);
}

async function getMetrics(id) {
  const res = await pool.query(
    `SELECT 
       COALESCE(SUM(impressions),0) as impressions,
       COALESCE(SUM(clicks),0) as clicks,
       COALESCE(SUM(spend),0) as spend
     FROM campaign_metrics
     WHERE campaign_id = $1`,
    [id]
  );

  return res.rows[0];
}

module.exports = {
  startMetricsSimulation,
  getMetrics
};