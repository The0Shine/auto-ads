// =============================================================================
// facebook.client.js — unit tests (mock mode)
// =============================================================================

const axios = require('axios');
jest.mock('axios');

beforeAll(() => {
  process.env.FB_MOCK_MODE  = 'true';
  process.env.MOCK_FB_URL   = 'http://localhost:4001';
});

afterEach(() => jest.clearAllMocks());

const {
  createFacebookCampaign,
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd,
  getInsights,
} = require('../facebook.client');

// ─── createFacebookCampaign ──────────────────────────────────────────────────

describe('createFacebookCampaign (mock)', () => {
  it('POSTs to /campaigns and returns id', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: '17100000000001', name: 'Test' } });

    const id = await createFacebookCampaign({ name: 'Test Campaign', objective: 'TRAFFIC' });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/campaigns',
      { name: 'Test Campaign' }
    );
    expect(id).toBe('17100000000001');
  });
});

// ─── createFacebookAdSet ─────────────────────────────────────────────────────

describe('createFacebookAdSet (mock)', () => {
  it('POSTs to /adsets with name and campaign_id', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: '17100000000002', name: 'Test AdSet' } });

    const id = await createFacebookAdSet(
      { name: 'Test AdSet', budget: 100 },
      { objective: 'TRAFFIC', daily_budget: 100 },
      '17100000000001'
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/adsets',
      { name: 'Test AdSet', campaign_id: '17100000000001' }
    );
    expect(id).toBe('17100000000002');
  });
});

// ─── createFacebookAdCreative ────────────────────────────────────────────────

describe('createFacebookAdCreative (mock)', () => {
  it('POSTs to /adcreatives and returns id', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: '17100000000003' } });

    const id = await createFacebookAdCreative({
      name:      'Test Ad',
      image_url: 'https://example.com/img.jpg',
      target_url: 'https://example.com',
      headline:  'Buy Now',
      message:   'Best deal ever',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/adcreatives',
      { name: 'Creative - Test Ad' }
    );
    expect(id).toBe('17100000000003');
  });
});

// ─── createFacebookAd ────────────────────────────────────────────────────────

describe('createFacebookAd (mock)', () => {
  it('POSTs to /ads with name, adset_id, creative', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: '17100000000004', name: 'Test Ad' } });

    const id = await createFacebookAd(
      { name: 'Test Ad' },
      '17100000000002',
      '17100000000003'
    );

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/ads',
      {
        name:     'Test Ad',
        adset_id: '17100000000002',
        creative: { creative_id: '17100000000003' },
      }
    );
    expect(id).toBe('17100000000004');
  });
});

// ─── getInsights ─────────────────────────────────────────────────────────────

describe('getInsights (mock)', () => {
  it('GETs /insights/:id and returns data object', async () => {
    const mockData = {
      data: [{
        impressions: '5000', clicks: '250', spend: '45.6789',
        reach: '4000', frequency: '1.25', ctr: '0.050000',
        date_start: '2026-03-14', date_stop: '2026-03-21',
      }],
      paging: { cursors: { before: '', after: '' } },
    };
    axios.get.mockResolvedValueOnce({ data: mockData });

    const result = await getInsights('17100000000001');

    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:4001/insights/17100000000001'
    );
    expect(result.data[0].impressions).toBe('5000');
    expect(result.paging).toBeDefined();
  });
});
