// Generate numeric-style IDs matching real Facebook Marketing API format
// FB IDs are numeric strings like "23843012345678"
// We prefix with "mock_" to distinguish during development
function generateId() {
  const ts = Date.now().toString();
  const rand = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `${ts}${rand}`;
}

module.exports = { generateId };

lifecycle.engine.js;
const { updateCampaignStatus } = require("../models/campaign.repo");

function simulateLifecycle(id) {
  setTimeout(async () => {
    await updateCampaignStatus(id, "ACTIVE");
    console.log(`[Lifecycle] ${id} → ACTIVE`);
  }, 5000);

  setTimeout(async () => {
    await updateCampaignStatus(id, "COMPLETED");
    console.log(`[Lifecycle] ${id} → COMPLETED`);
  }, 30000);
}

module.exports = { simulateLifecycle };
