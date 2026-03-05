require('dotenv').config({ path: require('path').join(__dirname, '../services/facebook-adapter/.env') });
const bizSdk = require('facebook-nodejs-business-sdk');

const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;

async function test() {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const adAccountId = process.env.FB_AD_ACCOUNT_ID;
  console.log('Access Token (first 20):', accessToken?.substring(0, 20));
  console.log('Ad Account ID:', adAccountId);

  bizSdk.FacebookAdsApi.init(accessToken);
  const adAccount = new AdAccount(adAccountId);

  try {
    console.log('\n--- Creating campaign ---');
    const result = await adAccount.createCampaign(
      [Campaign.Fields.id, Campaign.Fields.name],
      {
        name: 'AutoAds Test Campaign',
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
      }
    );
    const fbCampaignId = result.id;
    console.log('✅ Campaign created:', fbCampaignId, result.name);

    console.log('\n--- Creating Ad Set ---');
    const adSetResult = await adAccount.createAdSet(
      [AdSet.Fields.id, AdSet.Fields.name],
      {
        name: 'AutoAds Test Ad Set',
        campaign_id: fbCampaignId,
        status: 'PAUSED',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        daily_budget: 70000,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: { countries: ['VN'] },
          age_min: 18,
          age_max: 65,
        },
        start_time: new Date(Date.now() + 60000).toISOString(), // 1 min from now
      }
    );
    console.log('✅ Ad Set created:', adSetResult.id, adSetResult.name);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('API Response:', JSON.stringify(err.response, null, 2));
    }
  }
}

test();
