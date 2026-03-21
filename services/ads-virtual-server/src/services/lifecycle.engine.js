const { updateCampaignStatus } = require('../models/campaign.repo');

function simulateLifecycle(id) {

  setTimeout(async () => {
    await updateCampaignStatus(id, 'ACTIVE');
    console.log(`[Lifecycle] ${id} → ACTIVE`);
  }, 5000);

  setTimeout(async () => {
    await updateCampaignStatus(id, 'COMPLETED');
    console.log(`[Lifecycle] ${id} → COMPLETED`);
  }, 30000);
}

module.exports = { simulateLifecycle };