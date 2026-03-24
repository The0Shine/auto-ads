// =============================================================================
// Targeting Routes — proxy FB Marketing API search endpoints
// Allows frontend to search interests, locations, and list uploaded images
// without exposing FB access token to the client.
// =============================================================================

const router = require('express').Router();
const axios  = require('axios');

const FB_BASE    = 'https://graph.facebook.com/v24.0';
const TOKEN      = () => process.env.FB_ACCESS_TOKEN;
const AD_ACCOUNT = () => process.env.FB_AD_ACCOUNT_ID;
const MOCK_MODE  = () => process.env.FB_MOCK_MODE === 'true';
const MOCK_URL   = () => process.env.MOCK_FB_URL || 'http://ads-virtual-server:4001';

// ─── GET /targeting/interests?q=fashion&limit=10 ─────────────────────────────
// Search FB interest categories by keyword
router.get('/interests', async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q (search query) is required' });

  try {
    if (MOCK_MODE()) {
      // Mock: return sample interests matching query
      const mockInterests = [
        { id: '6003107902433', name: 'Fashion', topic: 'Shopping and fashion', audience_size_lower_bound: 500000000 },
        { id: '6003348604161', name: 'Online shopping', topic: 'Shopping and fashion', audience_size_lower_bound: 200000000 },
        { id: '6002714895372', name: 'E-commerce', topic: 'Business and industry', audience_size_lower_bound: 150000000 },
        { id: '6003139266461', name: 'Technology', topic: 'Technology', audience_size_lower_bound: 700000000 },
        { id: '6003960786498', name: 'Food and drink', topic: 'Food and drink', audience_size_lower_bound: 800000000 },
        { id: '6003531876252', name: 'Travel', topic: 'Travel', audience_size_lower_bound: 400000000 },
        { id: '6003129265647', name: 'Sports', topic: 'Sports and fitness', audience_size_lower_bound: 600000000 },
        { id: '6003768065641', name: 'Beauty', topic: 'Beauty and fashion', audience_size_lower_bound: 300000000 },
      ];
      const filtered = mockInterests.filter(i =>
        i.name.toLowerCase().includes(q.toLowerCase())
      );
      return res.json({ success: true, data: filtered });
    }

    const fbRes = await axios.get(`${FB_BASE}/search`, {
      params: { type: 'adinterest', q, limit, access_token: TOKEN() },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    const fbErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({
      success: false,
      error: fbErr?.message || err.message,
    });
  }
});

// ─── GET /targeting/locations?q=hanoi&type=city&limit=10 ─────────────────────
// Search FB geo locations: city, region, country, zip
router.get('/locations', async (req, res) => {
  const { q, type = 'city', limit = 10 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q (search query) is required' });

  try {
    if (MOCK_MODE()) {
      const mockLocations = [
        { key: '2590028', name: 'Hà Nội', type: 'city', country_code: 'VN', region: 'Hanoi' },
        { key: '2590105', name: 'Hồ Chí Minh', type: 'city', country_code: 'VN', region: 'Ho Chi Minh City' },
        { key: '2590074', name: 'Đà Nẵng', type: 'city', country_code: 'VN', region: 'Da Nang' },
        { key: '2927559', name: 'Quận Ba Đình', type: 'subcity', country_code: 'VN', region: 'Hanoi' },
        { key: '2927562', name: 'Quận Hai Bà Trưng', type: 'subcity', country_code: 'VN', region: 'Hanoi' },
      ];
      const filtered = mockLocations.filter(l =>
        l.name.toLowerCase().includes(q.toLowerCase())
      );
      return res.json({ success: true, data: filtered });
    }

    const fbRes = await axios.get(`${FB_BASE}/search`, {
      params: {
        type:           'adgeolocation',
        q,
        location_types: JSON.stringify([type]),
        limit,
        access_token:   TOKEN(),
      },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    const fbErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({
      success: false,
      error: fbErr?.message || err.message,
    });
  }
});

// ─── GET /targeting/images ────────────────────────────────────────────────────
// List images already uploaded to FB Ad Account (or mock)
// Users can select existing image_hash when creating AdCreative
router.get('/images', async (req, res) => {
  const { limit = 20 } = req.query;

  try {
    if (MOCK_MODE()) {
      const mockRes = await axios.get(`${MOCK_URL()}/adimages`);
      return res.json({ success: true, data: mockRes.data.data || [] });
    }

    const fbRes = await axios.get(`${FB_BASE}/${AD_ACCOUNT()}/adimages`, {
      params: {
        fields:       'hash,name,url,width,height,created_time',
        limit,
        access_token: TOKEN(),
      },
    });
    res.json({ success: true, data: fbRes.data.data });
  } catch (err) {
    const fbErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({
      success: false,
      error: fbErr?.message || err.message,
    });
  }
});

// ─── POST /targeting/images ───────────────────────────────────────────────────
// Upload an image by URL → get back image_hash for use in AdCreative
router.post('/images', async (req, res) => {
  const { url, name } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url is required' });

  try {
    if (MOCK_MODE()) {
      const mockRes = await axios.post(`${MOCK_URL()}/adimages`, { url, name });
      const images = mockRes.data.images || {};
      const first  = Object.values(images)[0] || {};
      return res.json({ success: true, data: { hash: first.hash, url: first.url } });
    }

    // Real mode: download image then upload to FB (reuse existing util in facebook.client.js)
    // For now proxy through facebook-adapter's internal logic would require a new endpoint.
    // Return error prompting to use facebook-adapter directly.
    return res.status(501).json({
      success: false,
      error: 'Real image upload not proxied here — use facebook-adapter directly',
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

module.exports = router;
