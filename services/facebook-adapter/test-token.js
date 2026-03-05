require('dotenv').config();
const bizSdk = require('facebook-nodejs-business-sdk');
const AdAccount = bizSdk.AdAccount;

const accessToken = process.env.FB_ACCESS_TOKEN;
const accountId = process.env.FB_AD_ACCOUNT_ID;

const api = bizSdk.FacebookAdsApi.init(accessToken);
api.setDebug(true);

console.log('Testing Facebook Marketing API connection...');
console.log('Access Token exists:', !!accessToken);
console.log('Ad Account ID:', accountId);

const account = new AdAccount(accountId);

async function testConnection() {
  try {
    const fields = ['name', 'account_status', 'currency'];
    console.log('Fetching ad account details...');
    const result = await account.read(fields);
    console.log('\n✅ Successfully connected to Facebook API!');
    console.log('Ad Account Details:', result._data);
  } catch (error) {
    console.error('\n❌ Failed to connect to Facebook API.');
    console.error('Error Details:', error.response?.error || error.message);
  }
}

testConnection();
