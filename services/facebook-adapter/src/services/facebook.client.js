// =============================================================================
// Facebook Marketing API Client
// =============================================================================

const bizSdk = require('facebook-nodejs-business-sdk');

const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;
const AdImage = bizSdk.AdImage;
const AdCreative = bizSdk.AdCreative;
const Ad = bizSdk.Ad;

// Objective mapping: internal → Facebook API
const OBJECTIVE_MAP = {
  AWARENESS:   'OUTCOME_AWARENESS',
  TRAFFIC:     'OUTCOME_TRAFFIC',
  ENGAGEMENT:  'OUTCOME_ENGAGEMENT',
  LEADS:       'OUTCOME_LEADS',
  CONVERSIONS: 'OUTCOME_SALES',
  SALES:       'OUTCOME_SALES',
};

// Optimization goal mapping per objective
const OPTIMIZATION_GOAL_MAP = {
  OUTCOME_AWARENESS:  'REACH',
  OUTCOME_TRAFFIC:    'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'POST_ENGAGEMENT',
  OUTCOME_LEADS:      'LEAD_GENERATION',
  OUTCOME_SALES:      'OFFSITE_CONVERSIONS',
};

// Billing event mapping
const BILLING_EVENT_MAP = {
  OUTCOME_AWARENESS:  'IMPRESSIONS',
  OUTCOME_TRAFFIC:    'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'IMPRESSIONS',
  OUTCOME_LEADS:      'IMPRESSIONS',
  OUTCOME_SALES:      'IMPRESSIONS',
};

function initFacebookSDK() {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const adAccountId = process.env.FB_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    throw new Error('FB_ACCESS_TOKEN and FB_AD_ACCOUNT_ID must be set in .env');
  }

  bizSdk.FacebookAdsApi.init(accessToken);
  return new AdAccount(adAccountId);
}

/**
 * Create a Facebook Campaign (always PAUSED → 0 cost)
 * @param {object} campaign - Internal campaign record from DB
 * @returns {string} Facebook Campaign ID
 */
async function createFacebookCampaign(campaign) {
  const adAccount = initFacebookSDK();

  const fbObjective = OBJECTIVE_MAP[campaign.objective] || 'OUTCOME_TRAFFIC';

  console.log(`[FB API] Creating campaign "${campaign.name}" with objective ${fbObjective}`);

  const result = await adAccount.createCampaign(
    [Campaign.Fields.id, Campaign.Fields.name],
    {
      [Campaign.Fields.name]:                 campaign.name,
      [Campaign.Fields.objective]:            fbObjective,
      [Campaign.Fields.status]:               Campaign.Status.paused, // ← PAUSED, no cost
      [Campaign.Fields.special_ad_categories]: [],
      is_adset_budget_sharing_enabled:        false, // budget set at ad set level
    }
  );

  const fbCampaignId = result.id;
  console.log(`[FB API] ✅ Campaign created: ${fbCampaignId}`);
  return fbCampaignId;
}

/**
 * Create a Facebook Ad Set (always PAUSED → 0 cost)
 * @param {object} adSet - Internal ad_set record from DB
 * @param {object} campaign - Internal campaign record (for budget/dates)
 * @param {string} fbCampaignId - ID of the parent Facebook Campaign
 * @returns {string} Facebook Ad Set ID
 */
async function createFacebookAdSet(adSet, campaign, fbCampaignId) {
  const adAccount = initFacebookSDK();

  const fbObjective = OBJECTIVE_MAP[campaign.objective] || 'OUTCOME_TRAFFIC';
  const optimizationGoal = OPTIMIZATION_GOAL_MAP[fbObjective];
  const billingEvent = BILLING_EVENT_MAP[fbObjective];

  // Budget handling:
  // For USD: multiply by 100 (cents). For VND: no minor unit, 1 VND = 1 unit.
  // FB minimum in VND account: 65,411 VND. We default to 70,000 VND (~$3).
  const rawBudget = parseFloat(adSet.budget || campaign.daily_budget || 0);
  // If budget looks like USD (< 1000), treat as USD and convert to VND (~24,000 per USD)
  // If budget looks like VND (>= 1000), use directly
  let dailyBudget;
  if (rawBudget < 100) {
    // Assume USD → convert to VND (approximate)
    dailyBudget = Math.max(70000, Math.round(rawBudget * 24000));
  } else {
    // Already VND
    dailyBudget = Math.max(70000, Math.round(rawBudget));
  }

  console.log(`[FB API] Creating ad set "${adSet.name}" under campaign ${fbCampaignId}`);

  const result = await adAccount.createAdSet(
    [AdSet.Fields.id, AdSet.Fields.name],
    {
      [AdSet.Fields.name]:              adSet.name,
      [AdSet.Fields.campaign_id]:       fbCampaignId,
      [AdSet.Fields.status]:            AdSet.Status.paused, // ← PAUSED, no cost
      [AdSet.Fields.optimization_goal]: optimizationGoal,
      [AdSet.Fields.billing_event]:     'IMPRESSIONS', // Standard billing, compatible with all objectives
      [AdSet.Fields.daily_budget]:      dailyBudget,
      [AdSet.Fields.bid_strategy]:      'LOWEST_COST_WITHOUT_CAP',
      [AdSet.Fields.targeting]: {
        geo_locations: { countries: ['VN'] }, // Default: Vietnam
        age_min: 18,
        age_max: 65,
      },
      // Start immediately (required by API)
      [AdSet.Fields.start_time]: new Date().toISOString(),
    }
  );

  const fbAdSetId = result.id;
  console.log(`[FB API] ✅ Ad Set created: ${fbAdSetId}`);
  return fbAdSetId;
}

/**
 * Upload an image from a URL to Facebook Ad Account and get its hash
 * @param {object} adAccount - The initialized AdAccount instance
 * @param {string} imageUrl - URL of the image to upload
 * @returns {string} Image hash from Facebook
 */
async function uploadImageFromUrl(adAccount, imageUrl) {
  console.log(`[FB API] Uploading image from URL: ${imageUrl}`);
  
  const axios = require('axios');
  const FormData = require('form-data');
  const fs = require('fs/promises');
  const { createReadStream } = require('fs');
  const path = require('path');
  
  // 1. Download image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');

  // 2. Save temporarily
  const tempFilename = `tmp-img-${Date.now()}.jpg`;
  const tempPath = path.join(__dirname, '..', '..', tempFilename);
  await fs.writeFile(tempPath, buffer);
  
  try {
    // 3. Upload via Graph API
    const token = process.env.FB_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v24.0/${adAccount.id}/adimages`;
    
    const form = new FormData();
    form.append('access_token', token);
    form.append('filename', createReadStream(tempPath));
    
    const res = await axios.post(url, form, { headers: form.getHeaders() });
    const hash = res.data.images[tempFilename].hash;
    
    console.log(`[FB API] ✅ Image uploaded, hash: ${hash}`);
    return hash;
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

/**
 * Create a Facebook Ad Creative
 * @param {object} adDetails - Internal Ad record from DB mixed with Content
 * @returns {string} Facebook Ad Creative ID
 */
async function createFacebookAdCreative(adDetails) {
  const adAccount = initFacebookSDK();
  const pageId = process.env.FB_PAGE_ID;

  if (!pageId) {
    throw new Error('FB_PAGE_ID must be set in .env to create an Ad Creative');
  }

  console.log(`[FB API] Creating Ad Creative for Ad "${adDetails.name}"`);

  // Default fallback image if none provided
  const imageUrl = adDetails.image_url || 'https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/test/resources/test-image.png';
  let imageHash;
  try {
    imageHash = await uploadImageFromUrl(adAccount, imageUrl);
  } catch (err) {
    console.warn(`[FB API] Failed to upload image, using placeholder. Error: ${err.message}`);
    // If upload fails, try to proceed without image_hash, but it might fail the creative creation.
  }

  // Link Data for New Post
  const linkData = {
    link: adDetails.target_url || 'https://example.com',
    message: adDetails.headline || 'Default Ad Headline',
    name: adDetails.name || 'Ad Name',
  };

  if (imageHash) {
    linkData.image_hash = imageHash;
  } else {
      linkData.picture = imageUrl; // fallback
  }

  // If we have an existing post ID, we use object_story_id instead of object_story_spec
  let creativeParams;
  if (adDetails.existing_post_id) {
    console.log(`[FB API] Using existing Post ID: ${adDetails.existing_post_id}`);
    creativeParams = {
      name: `Creative - ${adDetails.name || Date.now()}`,
      object_story_id: adDetails.existing_post_id
    };
  } else {
    creativeParams = {
      name: `Creative - ${adDetails.name || Date.now()}`,
      object_story_spec: {
        page_id: pageId,
        link_data: linkData
      }
    };
  }

  const result = await adAccount.createAdCreative(
    [AdCreative.Fields.id],
    creativeParams
  );

  console.log(`[FB API] ✅ Ad Creative created: ${result.id}`);
  return result.id;
}

/**
 * Create a Facebook Ad (connected to Ad Set and Creative, PAUSED)
 * @param {object} adDetails - Internal Ad record
 * @param {string} fbAdSetId - Facebook ID of the parent Ad Set
 * @param {string} fbCreativeId - Facebook ID of the linked Creative
 * @returns {string} Facebook Ad ID
 */
async function createFacebookAd(adDetails, fbAdSetId, fbCreativeId) {
  const adAccount = initFacebookSDK();

  console.log(`[FB API] Creating Ad "${adDetails.name}" under Ad Set ${fbAdSetId}`);

  const result = await adAccount.createAd(
    [Ad.Fields.id, Ad.Fields.name],
    {
      [Ad.Fields.name]: adDetails.name || `Ad - ${Date.now()}`,
      [Ad.Fields.adset_id]: fbAdSetId,
      [Ad.Fields.creative]: { creative_id: fbCreativeId },
      [Ad.Fields.status]: Ad.Status.paused, // ← PAUSED, no cost
    }
  );

  console.log(`[FB API] ✅ Ad created: ${result.id}`);
  return result.id;
}

module.exports = { 
  createFacebookCampaign, 
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd
};
