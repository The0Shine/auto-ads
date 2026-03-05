/**
 * Step 2: Trigger Distribution
 * This script calls the campaign-service to trigger distribution to Facebook.
 */
const axios = require('axios');

const CAMPAIGN_SERVICE_URL = process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3003';
const CAMPAIGN_ID = process.argv[2];
const USER_ID = process.argv[3];

if (!CAMPAIGN_ID || !USER_ID) {
  console.error('Usage: node test-distribute.js <CAMPAIGN_ID> <USER_ID>');
  process.exit(1);
}

async function trigger() {
  try {
    console.log(`🚀 Triggering distribution for campaign: ${CAMPAIGN_ID}...`);

    const response = await axios.post(
      `${CAMPAIGN_SERVICE_URL}/campaigns/${CAMPAIGN_ID}/distribute`,
      {},
      {
        headers: { 'x-user-id': USER_ID }
      }
    );

    console.log('✅ Response from Campaign Service:', response.data);
    console.log('\nNow check the logs of your "facebook-adapter" to see the processing!');
  } catch (err) {
    console.error('❌ Trigger failed:', err.response ? err.response.data : err.message);
  }
}

trigger();
