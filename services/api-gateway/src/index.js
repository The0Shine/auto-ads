// =============================================================================
// Auto-Ads Platform — API Gateway
// Proxy: Auth Service, Campaign Service
// =============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));

// Body parser moved down after proxy routes

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use(limiter);

// ─── Service URLs ────────────────────────────────────────────────────────────

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const CAMPAIGN_SERVICE = process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3003';

// ─── Auth Routes — Public ───────────────────────────────────────────────────

app.use(createProxyMiddleware({
  pathFilter: '/api/v1/auth',
  target: AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/v1/auth': '/auth' },
  logger: console,
}));

// ─── Campaign & Creative Routes — Protected ──────────────────────────────────

// 1. Run auth middleware first
app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/v1/campaigns') ||
    req.path.startsWith('/api/v1/creatives') ||
    req.path.startsWith('/api/v1/targeting')
  ) {
    return authMiddleware(req, res, next);
  }
  next();
});

// 2. Proxy
app.use(createProxyMiddleware({
  pathFilter: ['/api/v1/campaigns', '/api/v1/creatives', '/api/v1/targeting'],
  target: CAMPAIGN_SERVICE,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/campaigns': '/campaigns',
    '^/api/v1/creatives': '/creatives',
    '^/api/v1/targeting': '/targeting',
  },
  logger: console,
}));

// ─── Health Check & Local Routes ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.use(express.json({ limit: '10mb' })); // Body parser for local endpoints only

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` },
  });
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`   Auth Service:     ${AUTH_SERVICE}`);
  console.log(`   Campaign Service: ${CAMPAIGN_SERVICE}`);
});
