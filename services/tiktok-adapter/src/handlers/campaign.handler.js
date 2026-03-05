// =============================================================================
// Campaign Handler — TikTok Adapter
// =============================================================================

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@localhost:5432/autoads',
});

async function handleDistribute(payload) {
  const { campaign, adSets } = payload;
  const campaignId = campaign.id;

  console.log(`[TikTok] Processing distribution for campaign: ${campaignId}`);

  try {
    // 1. Giả lập gọi TikTok Marketing API
    // Thực tế sẽ dùng axios gọi https://business-api.tiktok.com/open_api/v1.3/campaign/create/
    console.log(`[TikTok API] Creating campaign: ${campaign.name}`);
    const tiktokCampaignId = `tt_camp_${Math.floor(Math.random() * 1000000)}`;

    // 2. Lưu platform mapping cho Campaign
    await pool.query(
      `INSERT INTO platform_mappings (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
       VALUES ('CAMPAIGN', $1, 'tiktok', $2, 'SYNCED', NOW())
       ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET 
       platform_id = $2, sync_status = 'SYNCED', last_synced_at = NOW()`,
      [campaignId, tiktokCampaignId]
    );

    // 3. Xử lý từng Ad Set
    for (const adSet of adSets) {
      console.log(`[TikTok API] Creating ad set: ${adSet.name}`);
      const tiktokAdSetId = `tt_as_${Math.floor(Math.random() * 1000000)}`;

      await pool.query(
        `INSERT INTO platform_mappings (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
         VALUES ('AD_SET', $1, 'tiktok', $2, 'SYNCED', NOW())
         ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET 
         platform_id = $2, sync_status = 'SYNCED', last_synced_at = NOW()`,
        [adSet.id, tiktokAdSetId]
      );
    }

    // 4. Cập nhật status Campaign (giả sử thành công)
    // Thực tế có thể push ngược lại Kafka event "campaign.status.changed"
    console.log(`[TikTok] Successfully distributed campaign ${campaignId}`);

  } catch (err) {
    console.error(`[TikTok] Error distributing campaign ${campaignId}:`, err);
    
    await pool.query(
      `UPDATE platform_mappings SET sync_status = 'ERROR', error_message = $1 
       WHERE internal_id = $2 AND platform = 'tiktok'`,
      [err.message, campaignId]
    );
  }
}

module.exports = { handleDistribute };
