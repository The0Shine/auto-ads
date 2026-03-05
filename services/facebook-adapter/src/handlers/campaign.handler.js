// =============================================================================
// Campaign Handler — Facebook Adapter
// =============================================================================

const { Pool } = require('pg');
const { 
  createFacebookCampaign, 
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd
} = require('../services/facebook.client');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads',
});

async function handleDistribute(payload) {
  const { campaign, adSets } = payload;
  const campaignId = campaign.id;

  console.log(`[Facebook] Processing distribution for campaign: ${campaignId}`);

  let fbCampaignId = null;

  try {
    // 1. Create Campaign on Facebook (status: PAUSED → no cost)
    fbCampaignId = await createFacebookCampaign(campaign);

    // 2. Save Campaign platform mapping
    try {
      await pool.query(
        `INSERT INTO platform_mappings (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
         VALUES ('CAMPAIGN', $1, 'facebook', $2, 'SYNCED', NOW())
         ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET
         platform_id = $2, sync_status = 'SYNCED', last_synced_at = NOW()`,
        [campaignId, fbCampaignId]
      );
    } catch (dbErr) {
      console.warn(`[Facebook-DB] Could not save Campaign mapping (DB might be down)`);
    }

    // 3. Create each Ad Set on Facebook (status: PAUSED → no cost)
    for (const adSet of adSets) {
      const fbAdSetId = await createFacebookAdSet(adSet, campaign, fbCampaignId);

      try {
        await pool.query(
          `INSERT INTO platform_mappings (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
           VALUES ('AD_SET', $1, 'facebook', $2, 'SYNCED', NOW())
           ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET
           platform_id = $2, sync_status = 'SYNCED', last_synced_at = NOW()`,
          [adSet.id, fbAdSetId]
        );
      } catch (dbErr) {
        console.warn(`[Facebook-DB] Could not save Ad Set mapping`);
      }
      // 4. Create Ads under this Ad Set
      if (adSet.ads && adSet.ads.length > 0) {
        for (const ad of adSet.ads) {
          // Create Creative first
          const fbCreativeId = await createFacebookAdCreative(ad);
          
          // Then create Ad
          const fbAdId = await createFacebookAd(ad, fbAdSetId, fbCreativeId);

          try {
            await pool.query(
              `INSERT INTO platform_mappings (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
               VALUES ('AD', $1, 'facebook', $2, 'SYNCED', NOW())
               ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET
               platform_id = $2, sync_status = 'SYNCED', last_synced_at = NOW()`,
              [ad.id, fbAdId]
            );
          } catch (dbErr) {
            console.warn(`[Facebook-DB] Could not save Ad mapping`);
          }
        }
      }
    }

    console.log(`[Facebook] ✅ Successfully distributed campaign ${campaignId} → FB Campaign ${fbCampaignId}`);

  } catch (err) {
    console.error(`[Facebook] ❌ Error distributing campaign ${campaignId}:`, err.message);

    // Record error in platform_mappings if campaign was already created
    if (fbCampaignId) {
      await pool.query(
        `UPDATE platform_mappings SET sync_status = 'ERROR', error_message = $1
         WHERE internal_id = $2 AND platform = 'facebook'`,
        [err.message, campaignId]
      ).catch(() => {}); // Ignore secondary failure
    }

    throw err; // Re-throw so Kafka knows to retry
  }
}

module.exports = { handleDistribute };
