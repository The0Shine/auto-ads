// =============================================================================
// Campaign Handler — Facebook Adapter
// Consumes campaign.distribute Kafka events and creates entities on Facebook
// (or ads-virtual-server in mock mode).
// =============================================================================

const axios  = require('axios');
const { Pool } = require('pg');
const {
  getCredentialsForWorkspace,
  createFacebookCampaign,
  createFacebookAdSet,
  createFacebookAdCreative,
  createFacebookAd,
} = require('../services/facebook.client');
const { publishEvent } = require('../kafka/kafka.producer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@postgres:5432/autoads',
});

// ─── Helpers ─────────────────────────────────────────────────────────────

async function upsertMapping(entity_type, internal_id, platform_id) {
  try {
    await pool.query(
      `INSERT INTO platform_mappings
         (entity_type, internal_id, platform, platform_id, sync_status, last_synced_at)
       VALUES ($1, $2, 'facebook', $3, 'SYNCED', NOW())
       ON CONFLICT (entity_type, internal_id, platform) DO UPDATE SET
         platform_id    = $3,
         sync_status    = 'SYNCED',
         last_synced_at = NOW()`,
      [entity_type, internal_id, platform_id]
    );
  } catch (err) {
    console.warn(`[Facebook-DB] Could not upsert mapping for ${entity_type} ${internal_id}:`, err.message);
  }
}

// ─── Field mapping ───────────────────────────────────────────────────────
// DB columns (snake_case) → facebook.client.js expected field names
// This mapping is permanent: DB naming ≠ FB API naming, always need this layer.
//
// DB (creatives table)   →  facebook.client param
// ─────────────────────────────────────────────────
// media_urls (JSONB [])  →  image_url  (first element)
// destination_url        →  target_url
// headline               →  headline   (same ✓)
// body                   →  message
// call_to_action         →  call_to_action (same ✓)
// name (ads table)       →  name       (same ✓)

function mapAdToCreativeParams(ad) {
  // media_urls arrives from Kafka as a JS array (JSONB parsed by pg)
  // or as a string if double-serialized — handle both safely
  let mediaUrls = ad.media_urls;
  if (typeof mediaUrls === 'string') {
    try { mediaUrls = JSON.parse(mediaUrls); } catch { mediaUrls = []; }
  }

  return {
    name:           ad.name,
    image_url:      Array.isArray(mediaUrls) ? mediaUrls[0] || null : null,
    target_url:     ad.destination_url   || null,
    headline:       ad.headline          || null,
    message:        ad.body              || null,
    call_to_action: ad.call_to_action    || null,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────

async function handleDistribute(payload) {
  // Kafka payload now uses snake_case throughout (matches DB convention)
  const { campaign, ad_sets } = payload;
  const campaign_id = campaign.id;

  console.log(`[Facebook] Distributing campaign: ${campaign_id}`);

  // Fetch FB credentials from DB (workspace token) or fall back to env vars
  const credentials = await getCredentialsForWorkspace(pool, campaign.workspace_id);

  let fb_campaign_id = null;

  try {
    // 1. Create Campaign on Facebook (PAUSED → no cost)
    fb_campaign_id = await createFacebookCampaign(campaign, credentials);
    await upsertMapping('CAMPAIGN', campaign_id, fb_campaign_id);

    // 2. Create each Ad Set
    for (const adSet of ad_sets) {
      const fb_ad_set_id = await createFacebookAdSet(adSet, campaign, fb_campaign_id, credentials);
      await upsertMapping('AD_SET', adSet.id, fb_ad_set_id);

      // 3. Create Ads (and their Creatives) under this Ad Set
      if (adSet.ads && adSet.ads.length > 0) {
        for (const ad of adSet.ads) {
          // Map DB fields → facebook.client expected params
          const creativeParams = mapAdToCreativeParams(ad);

          const fb_creative_id = await createFacebookAdCreative(creativeParams, credentials);
          // No platform_mappings entry for creatives — FB doesn't expose creative IDs
          // in the same way; we store ad-level mapping only

          const fb_ad_id = await createFacebookAd(creativeParams, fb_ad_set_id, fb_creative_id, credentials);
          await upsertMapping('AD', ad.id, fb_ad_id);
        }
      }
    }

    // 4. Trigger metrics simulation (mock mode only)
    if (process.env.FB_MOCK_MODE === 'true') {
      try {
        await axios.post(`${process.env.MOCK_FB_URL}/simulate/metrics`, {
          campaign_id:  campaign_id,
          workspace_id: campaign.workspace_id,
          platform:     'facebook',
          ad_sets: ad_sets.map(as => ({
            ad_set_id: as.id,
            ads: (as.ads || []).map(a => ({ ad_id: a.id })),
          })),
        });
      } catch (err) {
        console.warn('[Facebook] Metrics simulation trigger failed (non-fatal):', err.message);
      }
    }

    // 5. Publish status feedback → campaign-service will update status to ACTIVE
    await publishEvent('campaign.status.changed', campaign_id, {
      event_type:  'campaign.status.changed',
      campaign_id: campaign_id,
      old_status:  'DISTRIBUTING',
      new_status:  'ACTIVE',
      platform:    'facebook',
      timestamp:   new Date().toISOString(),
    });

    console.log(`[Facebook] ✅ Campaign ${campaign_id} → FB ${fb_campaign_id} — DONE`);

  } catch (err) {
    console.error(`[Facebook] ❌ Error distributing campaign ${campaign_id}:`, err.message);

    if (fb_campaign_id) {
      await pool.query(
        `UPDATE platform_mappings
         SET sync_status = 'ERROR', error_message = $1, updated_at = NOW()
         WHERE internal_id = $2 AND platform = 'facebook'`,
        [err.message, campaign_id]
      ).catch(() => {});
    }

    throw err; // re-throw so Kafka retries
  }
}

module.exports = { handleDistribute };
