// =============================================================================
// Auth Service — Express.js Entry Point
// =============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('./middleware/error');

const app = express();

// ─── Database Pool ──────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads',
  max: 20,
  idleTimeoutMillis: 30000,
});

// Test DB connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err.message));

// Make pool available to routes
app.locals.db = pool;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});

module.exports = app;
