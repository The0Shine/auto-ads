const pool = require("../../infrastructure/postgres");

async function createCampaign(platformId) {
  await pool.query(
    `INSERT INTO platform_mappings 
     (entity_type, internal_id, platform, platform_id, platform_status, sync_status)
     VALUES ('CAMPAIGN', gen_random_uuid(), 'facebook', $1, 'PAUSED', 'SYNCED')`,
    [platformId],
  );
}

async function updateCampaignStatus(platformId, status) {
  await pool.query(
    `UPDATE platform_mappings
     SET platform_status = $1, updated_at = NOW()
     WHERE platform_id = $2`,
    [status, platformId],
  );
}

module.exports = {
  createCampaign,
  updateCampaignStatus,
};
