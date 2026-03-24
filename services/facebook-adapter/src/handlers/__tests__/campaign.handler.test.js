// =============================================================================
// campaign.handler.js — unit tests
// =============================================================================

jest.mock('pg', () => {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  return { Pool: jest.fn(() => ({ query })) };
});

jest.mock('axios');

const axios = require('axios');

// Mock all FB client functions
jest.mock('../../services/facebook.client', () => ({
  createFacebookCampaign:   jest.fn().mockResolvedValue('fb_cmp_001'),
  createFacebookAdSet:      jest.fn().mockResolvedValue('fb_adset_001'),
  createFacebookAdCreative: jest.fn().mockResolvedValue('fb_creative_001'),
  createFacebookAd:         jest.fn().mockResolvedValue('fb_ad_001'),
}));

// Mock kafka producer
jest.mock('../../kafka/kafka.producer', () => ({
  publishEvent:      jest.fn().mockResolvedValue(true),
  connectProducer:   jest.fn(),
  disconnectProducer: jest.fn(),
}));

beforeAll(() => {
  process.env.FB_MOCK_MODE  = 'true';
  process.env.MOCK_FB_URL   = 'http://localhost:4001';
});

afterEach(() => jest.clearAllMocks());

const { handleDistribute } = require('../campaign.handler');
const {
  createFacebookCampaign,
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd,
} = require('../../services/facebook.client');
const { publishEvent } = require('../../kafka/kafka.producer');

// ─── Test payload ─────────────────────────────────────────────────────────────

const mockPayload = {
  event_type:  'campaign.distribute',
  campaign_id: 'uuid-campaign-1',
  campaign: {
    id:           'uuid-campaign-1',
    name:         'Test Campaign',
    objective:    'TRAFFIC',
    workspace_id: 'uuid-workspace-1',
    daily_budget: 500000,
  },
  ad_sets: [
    {
      id:   'uuid-adset-1',
      name: 'AdSet 1',
      budget: 200000,
      ads: [
        {
          id:              'uuid-ad-1',
          name:            'Ad 1',
          headline:        'Buy Now',
          body:            'Best deal ever',
          destination_url: 'https://example.com',
          media_urls:      ['https://example.com/img.jpg'],
          call_to_action:  'SHOP_NOW',
        },
      ],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('handleDistribute — happy path', () => {
  beforeEach(() => {
    // Mock simulate/metrics call
    axios.post.mockResolvedValue({ data: { ok: true } });
  });

  it('calls createFacebookCampaign with campaign object', async () => {
    await handleDistribute(mockPayload);
    expect(createFacebookCampaign).toHaveBeenCalledWith(mockPayload.campaign);
  });

  it('calls createFacebookAdSet with adset, campaign, fbCampaignId', async () => {
    await handleDistribute(mockPayload);
    expect(createFacebookAdSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'uuid-adset-1' }),
      mockPayload.campaign,
      'fb_cmp_001'
    );
  });

  it('maps DB fields correctly when calling createFacebookAdCreative', async () => {
    await handleDistribute(mockPayload);
    expect(createFacebookAdCreative).toHaveBeenCalledWith(
      expect.objectContaining({
        name:           'Ad 1',
        image_url:      'https://example.com/img.jpg',   // media_urls[0]
        target_url:     'https://example.com',           // destination_url
        headline:       'Buy Now',
        message:        'Best deal ever',                // body
        call_to_action: 'SHOP_NOW',
      })
    );
  });

  it('calls createFacebookAd with correct adset and creative IDs', async () => {
    await handleDistribute(mockPayload);
    expect(createFacebookAd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ad 1' }),
      'fb_adset_001',
      'fb_creative_001'
    );
  });

  it('publishes campaign.status.changed with new_status ACTIVE after success', async () => {
    await handleDistribute(mockPayload);
    expect(publishEvent).toHaveBeenCalledWith(
      'campaign.status.changed',
      'uuid-campaign-1',
      expect.objectContaining({
        event_type:  'campaign.status.changed',
        campaign_id: 'uuid-campaign-1',
        new_status:  'ACTIVE',
        platform:    'facebook',
      })
    );
  });

  it('triggers metrics simulation in mock mode', async () => {
    await handleDistribute(mockPayload);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:4001/simulate/metrics',
      expect.objectContaining({
        campaign_id:  'uuid-campaign-1',
        workspace_id: 'uuid-workspace-1',
        platform:     'facebook',
      })
    );
  });
});

describe('handleDistribute — ad_set with no ads', () => {
  const payloadNoAds = {
    ...mockPayload,
    ad_sets: [{ id: 'uuid-adset-2', name: 'AdSet No Ads', budget: 100000, ads: [] }],
  };

  it('skips createFacebookAdCreative and createFacebookAd', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    await handleDistribute(payloadNoAds);
    expect(createFacebookAdCreative).not.toHaveBeenCalled();
    expect(createFacebookAd).not.toHaveBeenCalled();
  });
});

describe('handleDistribute — media_urls as JSON string (double-serialized)', () => {
  it('safely parses stringified media_urls array', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });

    const payload = {
      ...mockPayload,
      ad_sets: [{
        ...mockPayload.ad_sets[0],
        ads: [{
          ...mockPayload.ad_sets[0].ads[0],
          media_urls: JSON.stringify(['https://example.com/img2.jpg']), // stringified
        }],
      }],
    };

    await handleDistribute(payload);
    expect(createFacebookAdCreative).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: 'https://example.com/img2.jpg' })
    );
  });
});

describe('handleDistribute — error path', () => {
  it('re-throws error so Kafka can retry', async () => {
    createFacebookCampaign.mockRejectedValueOnce(new Error('FB API error'));
    await expect(handleDistribute(mockPayload)).rejects.toThrow('FB API error');
  });
});
