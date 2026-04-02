// =============================================================================
// Targeting Routes — proxy FB Marketing API search endpoints
// Token priority: platform_connections DB → env FB_ACCESS_TOKEN → mock
// =============================================================================

const router = require('express').Router();
const axios  = require('axios');

const FB_BASE  = 'https://graph.facebook.com/v24.0';
const MOCK_URL = () => process.env.MOCK_FB_URL || 'http://ads-virtual-server:4001';

// ── Get FB token for user from platform_connections table ────────────────────
async function getToken(req) {
  const userId = req.headers['x-user-id'];
  if (userId) {
    try {
      const db     = req.app.locals.db;
      const result = await db.query(
        `SELECT access_token FROM platform_connections
         WHERE user_id = $1 AND platform = 'facebook' AND status = 'active'
         LIMIT 1`,
        [userId]
      );
      if (result.rows[0]?.access_token) return result.rows[0].access_token;
    } catch { /* fall through */ }
  }
  return process.env.FB_ACCESS_TOKEN || null;
}

const useMock = (token) => !token && process.env.FB_MOCK_MODE === 'true';

// ─── GET /targeting/interests?q=fashion&limit=10 ─────────────────────────────

router.get('/interests', async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q is required' });

  const token = await getToken(req);

  try {
    if (useMock(token)) {
      const mock = [
        { id: '6003107902433', name: 'Fashion',        audience_size_lower_bound: 500000000 },
        { id: '6003348604161', name: 'Online shopping', audience_size_lower_bound: 200000000 },
        { id: '6002714895372', name: 'E-commerce',      audience_size_lower_bound: 150000000 },
        { id: '6003139266461', name: 'Technology',      audience_size_lower_bound: 700000000 },
        { id: '6003960786498', name: 'Food and drink',  audience_size_lower_bound: 800000000 },
        { id: '6003531876252', name: 'Travel',          audience_size_lower_bound: 400000000 },
        { id: '6003129265647', name: 'Sports',          audience_size_lower_bound: 600000000 },
        { id: '6003768065641', name: 'Beauty',          audience_size_lower_bound: 300000000 },
      ];
      return res.json({ success: true, data: mock.filter(i => i.name.toLowerCase().includes(q.toLowerCase())) });
    }

    const fbRes = await axios.get(`${FB_BASE}/search`, {
      params: { type: 'adinterest', q, limit, access_token: token },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ success: false, error: err.response?.data?.error?.message || err.message });
  }
});

// ─── GET /targeting/locations?q=hanoi&type=city|region|country&limit=10 ──────

router.get('/locations', async (req, res) => {
  const { q, type = 'city', limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q is required' });

  const token = await getToken(req);

  try {
    if (useMock(token)) {
      const mockCities = [
        { key: '2590028', name: 'Hà Nội',       type: 'city', country_code: 'VN', region: 'Hanoi' },
        { key: '2590105', name: 'Hồ Chí Minh',  type: 'city', country_code: 'VN', region: 'Ho Chi Minh City' },
        { key: '2590074', name: 'Đà Nẵng',       type: 'city', country_code: 'VN', region: 'Da Nang' },
        { key: '2927559', name: 'Quận Ba Đình',  type: 'subcity', country_code: 'VN', region: 'Hanoi' },
        { key: '2927562', name: 'Quận Hai Bà Trưng', type: 'subcity', country_code: 'VN', region: 'Hanoi' },
      ];
      const mockCountries = [
        { key: 'VN', name: 'Vietnam',        type: 'country', country_code: 'VN' },
        { key: 'US', name: 'United States',  type: 'country', country_code: 'US' },
        { key: 'JP', name: 'Japan',          type: 'country', country_code: 'JP' },
        { key: 'SG', name: 'Singapore',      type: 'country', country_code: 'SG' },
        { key: 'TH', name: 'Thailand',       type: 'country', country_code: 'TH' },
        { key: 'KR', name: 'South Korea',    type: 'country', country_code: 'KR' },
        { key: 'GB', name: 'United Kingdom', type: 'country', country_code: 'GB' },
        { key: 'AU', name: 'Australia',      type: 'country', country_code: 'AU' },
      ];
      const pool = type === 'country' ? mockCountries : mockCities;
      return res.json({ success: true, data: pool.filter(l => l.name.toLowerCase().includes(q.toLowerCase())) });
    }

    const fbRes = await axios.get(`${FB_BASE}/search`, {
      params: { type: 'adgeolocation', q, location_types: JSON.stringify([type]), limit, access_token: token },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ success: false, error: err.response?.data?.error?.message || err.message });
  }
});

// ─── GET /targeting/images ────────────────────────────────────────────────────

router.get('/images', async (req, res) => {
  const token = await getToken(req);
  const adAccountId = process.env.FB_AD_ACCOUNT_ID;

  try {
    if (useMock(token)) {
      const mockRes = await axios.get(`${MOCK_URL()}/adimages`);
      return res.json({ success: true, data: mockRes.data.data || [] });
    }

    const fbRes = await axios.get(`${FB_BASE}/${adAccountId}/adimages`, {
      params: { fields: 'hash,name,url,width,height,created_time', limit: 20, access_token: token },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ success: false, error: err.response?.data?.error?.message || err.message });
  }
});

// ─── POST /targeting/images ───────────────────────────────────────────────────

router.post('/images', async (req, res) => {
  const { url, name } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });

  const token = await getToken(req);

  try {
    if (useMock(token)) {
      const mockRes = await axios.post(`${MOCK_URL()}/adimages`, { url, name });
      const first   = Object.values(mockRes.data.images || {})[0] || {};
      return res.json({ success: true, data: { hash: first.hash, url: first.url } });
    }

    return res.status(501).json({ success: false, error: 'Real image upload: use facebook-adapter directly' });
  } catch (err) {
    res.status(err.response?.status || 500).json({ success: false, error: err.message });
  }
});

module.exports = router;
