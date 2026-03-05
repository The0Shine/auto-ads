// =============================================================================
// Campaign Service — Express.js Entry Point
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const campaignRoutes = require('./routes/campaign.routes');
const adSetRoutes = require('./routes/adset.routes');
const creativeRoutes = require('./routes/creative.routes');
const { connectProducer, disconnectProducer } = require('./kafka/kafka.producer');
const { errorHandler } = require('./middleware/error');

const app = express();

// ─── Database Pool ──────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads',
  max: 20,
});

pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err.message));

app.locals.db = pool;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'campaign-service', timestamp: new Date().toISOString() });
});

app.use('/campaigns', campaignRoutes);
app.use('/campaigns', adSetRoutes);          // /:campaignId/ad-sets/*
app.use('/creatives', creativeRoutes);

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3003;

async function start() {
  // Connect Kafka producer (non-blocking)
  connectProducer().catch(() => {});

  app.listen(PORT, () => {
    console.log(`📢 Campaign Service running on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down Campaign Service...');
  await disconnectProducer();
  await pool.end();
  process.exit(0);
});

start();

module.exports = app;
