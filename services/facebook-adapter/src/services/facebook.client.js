// =============================================================================
// Facebook Marketing API Client
// Mock mode: calls ads-virtual-server (FB_MOCK_MODE=true)
// Real mode: calls Facebook Marketing API via facebook-nodejs-business-sdk
// =============================================================================

const axios  = require('axios');
const bizSdk = require('facebook-nodejs-business-sdk');

const AdAccount  = bizSdk.AdAccount;
const Campaign   = bizSdk.Campaign;
const AdSet      = bizSdk.AdSet;
const AdCreative = bizSdk.AdCreative;
const Ad         = bizSdk.Ad;

// ─── Objective mapping: internal → Facebook API ───────────────────────────
// FB Marketing API v20+: OUTCOME_* objectives only
// CONVERSIONS maps to OUTCOME_SALES (FB does not expose OUTCOME_CONVERSIONS)
const OBJECTIVE_MAP = {
  AWARENESS:   'OUTCOME_AWARENESS',
  TRAFFIC:     'OUTCOME_TRAFFIC',
  ENGAGEMENT:  'OUTCOME_ENGAGEMENT',
  LEADS:       'OUTCOME_LEADS',
  CONVERSIONS: 'OUTCOME_SALES',   // FB v20+: no OUTCOME_CONVERSIONS — use OUTCOME_SALES
  SALES:       'OUTCOME_SALES',
};

// Optimization goal per FB objective
const OPTIMIZATION_GOAL_MAP = {
  OUTCOME_AWARENESS:  'REACH',
  OUTCOME_TRAFFIC:    'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'POST_ENGAGEMENT',
  OUTCOME_LEADS:      'LEAD_GENERATION',
  OUTCOME_SALES:      'OFFSITE_CONVERSIONS',
};

// Billing event per FB objective
const BILLING_EVENT_MAP = {
  OUTCOME_AWARENESS:  'IMPRESSIONS',
  OUTCOME_TRAFFIC:    'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'IMPRESSIONS',
  OUTCOME_LEADS:      'IMPRESSIONS',
  OUTCOME_SALES:      'IMPRESSIONS',
};

// ─── Credentials helper ───────────────────────────────────────────────────

/**
 * Look up FB credentials for a workspace from platform_connections.
 * Falls back to env vars if not found.
 * @param {import('pg').Pool} pool
 * @param {string} workspaceId
 * @returns {{ accessToken: string, adAccountId: string }}
 */
async function getCredentialsForWorkspace(pool, workspaceId) {
  if (pool && workspaceId) {
    try {
      const result = await pool.query(
        `SELECT access_token, ad_accounts FROM platform_connections
         WHERE workspace_id = $1 AND platform = 'facebook' AND status = 'active'
         LIMIT 1`,
        [workspaceId]
      );
      if (result.rows[0]?.access_token) {
        const row = result.rows[0];
        // ad_accounts: [{id: 'act_xxx', name: '...', account_status: 1}, ...]
        let adAccounts = row.ad_accounts;
        if (typeof adAccounts === 'string') {
          try { adAccounts = JSON.parse(adAccounts); } catch { adAccounts = []; }
        }
        const adAccountId = adAccounts?.[0]?.id || process.env.FB_AD_ACCOUNT_ID;
        return { accessToken: row.access_token, adAccountId };
      }
    } catch (err) {
      console.warn('[FB] Could not fetch credentials from DB:', err.message);
    }
  }
  // Fallback to env vars
  return {
    accessToken: process.env.FB_ACCESS_TOKEN,
    adAccountId: process.env.FB_AD_ACCOUNT_ID,
  };
}

function initFacebookSDK(credentials) {
  const accessToken = credentials?.accessToken || process.env.FB_ACCESS_TOKEN;
  const adAccountId = credentials?.adAccountId || process.env.FB_AD_ACCOUNT_ID;
  if (!accessToken || !adAccountId) {
    throw new Error('FB_ACCESS_TOKEN and FB_AD_ACCOUNT_ID must be set (env or platform_connections)');
  }
  bizSdk.FacebookAdsApi.init(accessToken);
  return new AdAccount(adAccountId);
}

// ─── Campaign ─────────────────────────────────────────────────────────────

/**
 * Create a Facebook Campaign (always PAUSED → no cost)
 * @param {object} campaign - DB row from campaigns table (snake_case)
 * @returns {string} Facebook Campaign ID
 */
async function createFacebookCampaign(campaign, credentials) {
  if (process.env.FB_MOCK_MODE === 'true') {
    const res = await axios.post(
      `${process.env.MOCK_FB_URL}/campaigns`,
      { name: campaign.name }
    );
    console.log('[MOCK FB] Campaign created:', res.data.id);
    return res.data.id;
  }

  const adAccount   = initFacebookSDK(credentials);
  const fbObjective = OBJECTIVE_MAP[campaign.objective] || 'OUTCOME_TRAFFIC';
  console.log(`[FB API] Creating campaign "${campaign.name}" objective=${fbObjective}`);

  const result = await adAccount.createCampaign(
    [Campaign.Fields.id, Campaign.Fields.name],
    {
      [Campaign.Fields.name]:                  campaign.name,
      [Campaign.Fields.objective]:             fbObjective,
      [Campaign.Fields.status]:                Campaign.Status.paused,
      [Campaign.Fields.special_ad_categories]: [],
      is_adset_budget_sharing_enabled:         false,
    }
  );
  console.log(`[FB API] ✅ Campaign created: ${result.id}`);
  return result.id;
}

// ─── AdSet ────────────────────────────────────────────────────────────────

/**
 * Create a Facebook Ad Set (always PAUSED → no cost)
 * @param {object} adSet      - DB row from ad_sets table (snake_case)
 * @param {object} campaign   - DB row from campaigns table (snake_case)
 * @param {string} fbCampaignId
 * @returns {string} Facebook AdSet ID
 */
async function createFacebookAdSet(adSet, campaign, fbCampaignId, credentials) {
  // ── Build targeting from DB (fallback to Vietnam defaults) ────────────────
  const dbTargeting = adSet.targeting || {};
  const targeting = _buildFbTargeting(dbTargeting);

  // ── Bid strategy from DB (fallback to LOWEST_COST_WITHOUT_CAP) ───────────
  const BID_STRATEGY_MAP = {
    LOWEST_COST:              'LOWEST_COST_WITHOUT_CAP',
    LOWEST_COST_WITHOUT_CAP:  'LOWEST_COST_WITHOUT_CAP',
    COST_CAP:                 'COST_CAP',
    BID_CAP:                  'LOWEST_COST_WITH_BID_CAP',
    TARGET_CPA:               'COST_CAP',
    MINIMIZE_COST:            'LOWEST_COST_WITHOUT_CAP',
  };
  const bidStrategy = BID_STRATEGY_MAP[adSet.bid_strategy] || 'LOWEST_COST_WITHOUT_CAP';

  // ── Budget ────────────────────────────────────────────────────────────────
  const rawBudget = parseFloat(adSet.budget || campaign.daily_budget || 0);
  // currency stored in campaign.currency (default USD). VND account minimum 70,000.
  const isVND = (campaign.currency || 'USD') === 'VND';
  const dailyBudget = isVND
    ? Math.max(70000, Math.round(rawBudget))
    : Math.max(70000, Math.round(rawBudget * 24000));

  if (process.env.FB_MOCK_MODE === 'true') {
    const res = await axios.post(
      `${process.env.MOCK_FB_URL}/adsets`,
      {
        name:          adSet.name,
        campaign_id:   fbCampaignId,
        targeting,
        bid_strategy:  bidStrategy,
        daily_budget:  dailyBudget,
        start_time:    campaign.start_date || new Date().toISOString(),
        end_time:      campaign.end_date   || null,
      }
    );
    console.log('[MOCK FB] AdSet created:', res.data.id);
    return res.data.id;
  }

  const adAccount        = initFacebookSDK(credentials);
  const fbObjective      = OBJECTIVE_MAP[campaign.objective] || 'OUTCOME_TRAFFIC';
  const optimizationGoal = adSet.optimization_goal || OPTIMIZATION_GOAL_MAP[fbObjective];
  const billingEvent     = BILLING_EVENT_MAP[fbObjective];

  console.log(`[FB API] Creating adset "${adSet.name}" targeting=${JSON.stringify(targeting)} bid=${bidStrategy}`);

  const params = {
    [AdSet.Fields.name]:              adSet.name,
    [AdSet.Fields.campaign_id]:       fbCampaignId,
    [AdSet.Fields.status]:            AdSet.Status.paused,
    [AdSet.Fields.optimization_goal]: optimizationGoal,
    [AdSet.Fields.billing_event]:     billingEvent,
    [AdSet.Fields.daily_budget]:      dailyBudget,
    [AdSet.Fields.bid_strategy]:      bidStrategy,
    [AdSet.Fields.targeting]:         targeting,
    [AdSet.Fields.start_time]:        campaign.start_date || new Date().toISOString(),
  };

  // bid_amount only needed for COST_CAP / BID_CAP strategies
  if (adSet.bid_amount && bidStrategy !== 'LOWEST_COST_WITHOUT_CAP') {
    params[AdSet.Fields.bid_amount] = Math.round(parseFloat(adSet.bid_amount));
  }

  if (campaign.end_date) {
    params[AdSet.Fields.end_time] = campaign.end_date;
  }

  const result = await adAccount.createAdSet([AdSet.Fields.id, AdSet.Fields.name], params);
  console.log(`[FB API] ✅ AdSet created: ${result.id}`);
  return result.id;
}

/**
 * Build Facebook-compatible targeting object from DB targeting JSONB.
 * Falls back to safe defaults when fields are missing.
 */
function _buildFbTargeting(t) {
  const targeting = {};

  // ── Geo ──────────────────────────────────────────────────────────────────
  const geo = {};
  const countries = t.countries || t.geo?.countries || ['VN'];
  geo.countries = countries;
  if (t.cities?.length)   geo.cities   = t.cities;
  if (t.regions?.length)  geo.regions  = t.regions;
  targeting.geo_locations = geo;

  // ── Demographics ─────────────────────────────────────────────────────────
  targeting.age_min = t.age_min || 18;
  targeting.age_max = t.age_max || 65;
  if (t.genders?.length) targeting.genders = t.genders;   // [1]=Male [2]=Female

  // ── Interests ─────────────────────────────────────────────────────────────
  // t.interests: [{id, name}] from FB search API
  if (t.interests?.length) targeting.interests = t.interests;

  // ── Placements ───────────────────────────────────────────────────────────
  if (t.publisher_platforms?.length)  targeting.publisher_platforms  = t.publisher_platforms;
  if (t.facebook_positions?.length)   targeting.facebook_positions   = t.facebook_positions;
  if (t.instagram_positions?.length)  targeting.instagram_positions  = t.instagram_positions;
  if (t.device_platforms?.length)     targeting.device_platforms     = t.device_platforms;

  // ── Custom audiences ─────────────────────────────────────────────────────
  if (t.custom_audiences?.length)          targeting.custom_audiences          = t.custom_audiences;
  if (t.excluded_custom_audiences?.length) targeting.excluded_custom_audiences = t.excluded_custom_audiences;

  return targeting;
}

// ─── AdCreative ──────────────────────────────────────────────────────────

/**
 * Upload image from URL to FB Ad Account, return image hash
 */
async function uploadImageFromUrl(adAccount, imageUrl, accessToken) {
  const FormData = require('form-data');
  const fs       = require('fs/promises');
  const { createReadStream } = require('fs');
  const path     = require('path');

  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer   = Buffer.from(response.data, 'binary');
  const tempPath = path.join(__dirname, '..', '..', `tmp-img-${Date.now()}.jpg`);
  await fs.writeFile(tempPath, buffer);

  try {
    const token = accessToken || process.env.FB_ACCESS_TOKEN;
    const url   = `https://graph.facebook.com/v24.0/${adAccount.id}/adimages`;
    const form  = new FormData();
    form.append('access_token', token);
    form.append('filename', createReadStream(tempPath));
    const res  = await axios.post(url, form, { headers: form.getHeaders() });
    const hash = res.data.images[path.basename(tempPath)].hash;
    console.log(`[FB API] ✅ Image uploaded, hash: ${hash}`);
    return hash;
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

/**
 * Create a Facebook Ad Creative
 * @param {object} adDetails - mapped fields (image_url, target_url, headline, message, name)
 * @returns {string} Facebook AdCreative ID
 */
async function createFacebookAdCreative(adDetails, credentials) {
  if (process.env.FB_MOCK_MODE === 'true') {
    const res = await axios.post(
      `${process.env.MOCK_FB_URL}/adcreatives`,
      { name: `Creative - ${adDetails.name || Date.now()}` }
    );
    console.log('[MOCK FB] AdCreative created:', res.data.id);
    return res.data.id;
  }

  const adAccount = initFacebookSDK(credentials);
  const pageId    = process.env.FB_PAGE_ID;
  if (!pageId) throw new Error('FB_PAGE_ID must be set to create an Ad Creative');

  console.log(`[FB API] Creating AdCreative for "${adDetails.name}"`);

  // Fallback image if none provided
  const imageUrl = adDetails.image_url ||
    'https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/test/resources/test-image.png';

  let imageHash;
  try {
    imageHash = await uploadImageFromUrl(adAccount, imageUrl, credentials?.accessToken);
  } catch (err) {
    console.warn(`[FB API] Image upload failed, using picture fallback: ${err.message}`);
  }

  const linkData = {
    link:    adDetails.target_url || 'https://example.com',
    message: adDetails.message    || adDetails.headline || '',
    name:    adDetails.name       || 'Ad',
  };
  if (imageHash) {
    linkData.image_hash = imageHash;
  } else {
    linkData.picture = imageUrl;
  }

  let creativeParams;
  if (adDetails.existing_post_id) {
    creativeParams = {
      name:             `Creative - ${adDetails.name || Date.now()}`,
      object_story_id:  adDetails.existing_post_id,
    };
  } else {
    creativeParams = {
      name:               `Creative - ${adDetails.name || Date.now()}`,
      object_story_spec:  { page_id: pageId, link_data: linkData },
    };
  }

  const result = await adAccount.createAdCreative([AdCreative.Fields.id], creativeParams);
  console.log(`[FB API] ✅ AdCreative created: ${result.id}`);
  return result.id;
}

// ─── Ad ──────────────────────────────────────────────────────────────────

/**
 * Create a Facebook Ad (always PAUSED → no cost)
 * @param {object} adDetails   - mapped fields (name)
 * @param {string} fbAdSetId
 * @param {string} fbCreativeId
 * @returns {string} Facebook Ad ID
 */
async function createFacebookAd(adDetails, fbAdSetId, fbCreativeId, credentials) {
  if (process.env.FB_MOCK_MODE === 'true') {
    const res = await axios.post(
      `${process.env.MOCK_FB_URL}/ads`,
      {
        name:      adDetails.name || `Ad - ${Date.now()}`,
        adset_id:  fbAdSetId,
        creative:  { creative_id: fbCreativeId },
      }
    );
    console.log('[MOCK FB] Ad created:', res.data.id);
    return res.data.id;
  }

  const adAccount = initFacebookSDK(credentials);
  console.log(`[FB API] Creating Ad "${adDetails.name}" under AdSet ${fbAdSetId}`);

  const result = await adAccount.createAd(
    [Ad.Fields.id, Ad.Fields.name],
    {
      [Ad.Fields.name]:     adDetails.name || `Ad - ${Date.now()}`,
      [Ad.Fields.adset_id]: fbAdSetId,
      [Ad.Fields.creative]: { creative_id: fbCreativeId },
      [Ad.Fields.status]:   Ad.Status.paused,
    }
  );
  console.log(`[FB API] ✅ Ad created: ${result.id}`);
  return result.id;
}

// ─── Insights ────────────────────────────────────────────────────────────

/**
 * Fetch campaign insights from FB (or mock)
 * @param {string} fbCampaignId - platform_id from platform_mappings
 * @param {string} datePreset   - FB date_preset (default: last_7d)
 * @returns {object} { data: [...], paging: {} }
 */
/**
 * Fetch campaign insights.
 * @param {string} fbCampaignId      - FB platform ID (used in real mode)
 * @param {string} datePreset
 * @param {string} internalCampaignId - Internal UUID (used in mock mode for ad_metrics lookup)
 */
async function getInsights(fbCampaignId, datePreset = 'last_7d', internalCampaignId = null, credentials = null) {
  if (process.env.FB_MOCK_MODE === 'true') {
    // Mock mode: ad_metrics is keyed by internal UUID, not FB ID
    const queryId = internalCampaignId || fbCampaignId;
    const res = await axios.get(`${process.env.MOCK_FB_URL}/insights/${queryId}`);
    console.log('[MOCK FB] Insights fetched for internal_id:', queryId);
    return res.data;
  }

  const token = credentials?.accessToken || process.env.FB_ACCESS_TOKEN;
  if (!token) throw new Error('FB_ACCESS_TOKEN must be set (env or platform_connections)');

  const res = await axios.get(
    `https://graph.facebook.com/v24.0/${fbCampaignId}/insights`,
    {
      params: {
        access_token: token,
        fields: [
          'impressions', 'clicks', 'spend', 'reach', 'frequency',
          'ctr', 'cpc', 'cpm', 'conversions', 'cost_per_action_type',
          'date_start', 'date_stop',
        ].join(','),
        date_preset: datePreset,
      },
    }
  );
  return res.data;
}

module.exports = {
  getCredentialsForWorkspace,
  createFacebookCampaign,
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd,
  getInsights,
};
