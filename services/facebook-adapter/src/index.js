require('dotenv').config();
const express = require('express');
const { Pool }  = require('pg');
const { connectConsumer, disconnectConsumer } = require('./kafka/kafka.consumer');
const { connectProducer, disconnectProducer } = require('./kafka/kafka.producer');
const { getInsights } = require('./services/facebook.client');

const app = express();
app.use(express.json());

// ─── DB pool (for insights endpoint) ────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@postgres:5432/autoads',
});

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status:    'ok',
  service:   'facebook-adapter',
  timestamp: new Date().toISOString(),
}));

// ─── Insights proxy ──────────────────────────────────────────────────────────
// campaign-service calls GET /insights/:campaign_id (internal UUID)
// We look up the FB platform_id and forward to FB API (or mock)

app.get('/insights/:campaign_id', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const mapping = await pool.query(
      `SELECT platform_id FROM platform_mappings
       WHERE entity_type = 'CAMPAIGN'
         AND internal_id = $1
         AND platform    = 'facebook'`,
      [campaign_id]
    );

    if (mapping.rows.length === 0) {
      return res.status(404).json({ error: 'No Facebook mapping found for this campaign' });
    }

    const fb_campaign_id = mapping.rows[0].platform_id;
    // Pass internal UUID as second arg so mock mode queries ad_metrics correctly
    const data = await getInsights(fb_campaign_id, 'last_7d', campaign_id);
    res.json(data);
  } catch (err) {
    console.error('[Insights] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3010;

async function start() {
  try {
    await connectProducer();
    await connectConsumer();

    app.listen(PORT, () => {
      console.log(`📘 Facebook Adapter running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Facebook Adapter:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await disconnectConsumer();
  await disconnectProducer();
  await pool.end();
  process.exit(0);
});

start();
