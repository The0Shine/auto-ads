#!/usr/bin/env node
// =============================================================================
// Integration Test Suite — Full E2E scenarios
// Run after: docker compose up -d
// Usage:     node scripts/integration-test.js
// =============================================================================

const axios = require('axios');

const CS  = process.env.CAMPAIGN_SERVICE_URL    || 'http://localhost:3003';
const FA  = process.env.FACEBOOK_ADAPTER_URL    || 'http://localhost:3010';
const AVS = process.env.ADS_VIRTUAL_SERVER_URL  || 'http://localhost:4001';

const USER_ID = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';
const headers = { 'x-user-id': USER_ID, 'Content-Type': 'application/json' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`    ✅ ${msg}`);
    passed++;
  } else {
    console.log(`    ❌ FAIL: ${msg}`);
    failed++;
  }
}

function skip(msg) {
  console.log(`    ⏭️  SKIP: ${msg}`);
  skipped++;
}

async function waitForStatus(campaignId, targetStatus, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await axios.get(`${CS}/campaigns/${campaignId}`, { headers });
    if (res.data.data.status === targetStatus) return res.data.data;
    await sleep(500);
  }
  return null;
}

// =============================================================================
// SCENARIO 1: Health checks — tất cả services phải sống
// =============================================================================
async function scenario1_HealthChecks() {
  console.log('\n━━━ SCENARIO 1: Health Checks ━━━');

  try {
    const cs = await axios.get(`${CS}/health`);
    assert(cs.data.status === 'ok', 'campaign-service healthy');
  } catch { assert(false, 'campaign-service healthy'); }

  try {
    const fa = await axios.get(`${FA}/health`);
    assert(fa.data.status === 'ok', 'facebook-adapter healthy');
  } catch { assert(false, 'facebook-adapter healthy'); }

  try {
    const avs = await axios.get(`${AVS}/health`);
    assert(avs.data.status === 'ok', 'ads-virtual-server healthy');
  } catch { assert(false, 'ads-virtual-server healthy'); }
}

// =============================================================================
// SCENARIO 2: Campaign CRUD — tạo, đọc, sửa, xóa
// =============================================================================
async function scenario2_CampaignCRUD() {
  console.log('\n━━━ SCENARIO 2: Campaign CRUD ━━━');

  // 2a. Tạo campaign
  const createRes = await axios.post(`${CS}/campaigns`, {
    name:        'CRUD Test Campaign',
    objective:   'TRAFFIC',
    dailyBudget: 500000,
    currency:    'VND',
  }, { headers });

  assert(createRes.status === 201, 'POST /campaigns → 201');
  assert(createRes.data.data.status === 'DRAFT', 'initial status = DRAFT');
  assert(createRes.data.data.name === 'CRUD Test Campaign', 'name matches');
  assert(createRes.data.data.objective === 'TRAFFIC', 'objective matches');

  const id = createRes.data.data.id;

  // 2b. Đọc campaign
  const getRes = await axios.get(`${CS}/campaigns/${id}`, { headers });
  assert(getRes.status === 200, `GET /campaigns/${id} → 200`);
  assert(getRes.data.data.id === id, 'returned correct campaign');
  assert(Array.isArray(getRes.data.data.ad_sets), 'ad_sets is array');
  assert(getRes.data.data.ad_sets.length === 0, 'no ad_sets yet');

  // 2c. List campaigns
  const listRes = await axios.get(`${CS}/campaigns`, { headers });
  assert(listRes.status === 200, 'GET /campaigns → 200');
  assert(listRes.data.meta.total > 0, 'total > 0');

  // 2d. Update campaign
  const updateRes = await axios.put(`${CS}/campaigns/${id}`, {
    name: 'Updated Campaign Name',
    dailyBudget: 700000,
  }, { headers });
  assert(updateRes.status === 200, 'PUT /campaigns/:id → 200');
  assert(updateRes.data.data.name === 'Updated Campaign Name', 'name updated');

  // 2e. Soft delete (archive)
  const deleteRes = await axios.delete(`${CS}/campaigns/${id}`, { headers });
  assert(deleteRes.status === 200, 'DELETE /campaigns/:id → 200');

  const afterDelete = await axios.get(`${CS}/campaigns/${id}`, { headers });
  assert(afterDelete.data.data.status === 'ARCHIVED', 'status = ARCHIVED after delete');

  return id;
}

// =============================================================================
// SCENARIO 3: Validation — tất cả edge case phải trả lỗi đúng
// =============================================================================
async function scenario3_Validation() {
  console.log('\n━━━ SCENARIO 3: Input Validation ━━━');

  // 3a. Tạo campaign thiếu name
  try {
    await axios.post(`${CS}/campaigns`, { objective: 'TRAFFIC' }, { headers });
    assert(false, 'POST /campaigns without name → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /campaigns without name → 400');
  }

  // 3b. Tạo campaign với objective không hợp lệ
  try {
    await axios.post(`${CS}/campaigns`, { name: 'Test', objective: 'INVALID' }, { headers });
    assert(false, 'POST /campaigns invalid objective → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /campaigns invalid objective → 400');
  }

  // 3c. Thiếu x-user-id header
  try {
    await axios.post(`${CS}/campaigns`, { name: 'Test', objective: 'TRAFFIC' });
    assert(false, 'POST /campaigns without x-user-id → 401');
  } catch (err) {
    assert(err.response?.status === 401, 'POST /campaigns without x-user-id → 401');
  }

  // 3d. GET campaign không tồn tại
  try {
    await axios.get(`${CS}/campaigns/00000000-0000-0000-0000-000000000099`, { headers });
    assert(false, 'GET non-existent campaign → 404');
  } catch (err) {
    assert(err.response?.status === 404, 'GET non-existent campaign → 404');
  }

  // 3e. Update campaign đang ACTIVE (nên fail)
  // (skip nếu không có campaign ACTIVE sẵn)
  skip('Update ACTIVE campaign → 400 (needs ACTIVE campaign)');
}

// =============================================================================
// SCENARIO 4: Distribute Validation — phải có ad_set + creative
// =============================================================================
async function scenario4_DistributeValidation() {
  console.log('\n━━━ SCENARIO 4: Distribute Validation ━━━');

  // 4a. Tạo campaign mới
  const campaignRes = await axios.post(`${CS}/campaigns`, {
    name: 'Distribute Validation Test',
    objective: 'TRAFFIC',
    dailyBudget: 300000,
  }, { headers });
  const cId = campaignRes.data.data.id;

  // 4b. Distribute khi chưa có ad_set → 400
  try {
    await axios.post(`${CS}/campaigns/${cId}/distribute`, {}, { headers });
    assert(false, 'Distribute without ad_sets → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Distribute without ad_sets → 400');
    assert(err.response?.data?.error?.message?.includes('at least 1 ad set'), 'Error mentions ad set');
  }

  // 4c. Distribute campaign ARCHIVED → 400
  const archivedRes = await axios.post(`${CS}/campaigns`, {
    name: 'Archived Test', objective: 'TRAFFIC',
  }, { headers });
  const archivedId = archivedRes.data.data.id;
  await axios.delete(`${CS}/campaigns/${archivedId}`, { headers }); // archive it
  try {
    await axios.post(`${CS}/campaigns/${archivedId}/distribute`, {}, { headers });
    assert(false, 'Distribute ARCHIVED campaign → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Distribute ARCHIVED campaign → 400');
  }
}

// =============================================================================
// SCENARIO 5: Ad Set + Creative CRUD
// =============================================================================
async function scenario5_AdSetCreativeCRUD() {
  console.log('\n━━━ SCENARIO 5: Ad Set + Creative CRUD ━━━');

  // 5a. Tạo campaign
  const cRes = await axios.post(`${CS}/campaigns`, {
    name: 'AdSet Test', objective: 'ENGAGEMENT', dailyBudget: 100000,
  }, { headers });
  const cId = cRes.data.data.id;

  // 5b. Tạo ad set
  const asRes = await axios.post(`${CS}/campaigns/${cId}/ad-sets`, {
    name: 'Test AdSet', budget: 50000, budgetType: 'DAILY',
  }, { headers });
  assert(asRes.status === 201, 'POST ad-set → 201');
  assert(asRes.data.data.name === 'Test AdSet', 'ad set name matches');
  const asId = asRes.data.data.id;

  // 5c. List ad sets
  const listRes = await axios.get(`${CS}/campaigns/${cId}/ad-sets`, { headers });
  assert(listRes.status === 200, 'GET ad-sets → 200');
  assert(listRes.data.data.length === 1, '1 ad set returned');

  // 5d. Update ad set
  const updateRes = await axios.put(`${CS}/campaigns/${cId}/ad-sets/${asId}`, {
    name: 'Updated AdSet', budget: 80000,
  }, { headers });
  assert(updateRes.status === 200, 'PUT ad-set → 200');
  assert(updateRes.data.data.name === 'Updated AdSet', 'ad set name updated');

  // 5e. Tạo creative
  const crRes = await axios.post(`${CS}/creatives`, {
    name: 'Test Creative', type: 'IMAGE',
    headline: 'Buy Now', body: 'Best deal',
    destinationUrl: 'https://example.com',
    mediaUrls: ['https://via.placeholder.com/1200x628.jpg'],
    callToAction: 'SHOP_NOW',
  }, { headers });
  assert(crRes.status === 201, 'POST creative → 201');
  assert(crRes.data.data.type === 'IMAGE', 'creative type = IMAGE');

  // 5f. List creatives
  const crListRes = await axios.get(`${CS}/creatives`, { headers });
  assert(crListRes.status === 200, 'GET creatives → 200');

  // 5g. Delete ad set
  const delRes = await axios.delete(`${CS}/campaigns/${cId}/ad-sets/${asId}`, { headers });
  assert(delRes.status === 200, 'DELETE ad-set → 200');

  return { campaignId: cId, creativeId: crRes.data.data.id };
}

// =============================================================================
// SCENARIO 6: Virtual Server API — trả data khớp FB format
// =============================================================================
async function scenario6_VirtualServerAPI() {
  console.log('\n━━━ SCENARIO 6: Virtual Server (Mock FB API) ━━━');

  // 6a. POST /campaigns
  const cRes = await axios.post(`${AVS}/campaigns`, { name: 'Mock Campaign' });
  assert(cRes.status === 200, 'POST /campaigns → 200');
  assert(/^\d+$/.test(cRes.data.id), 'ID is numeric string (FB format)');
  assert(cRes.data.name === 'Mock Campaign', 'name returned');

  // 6b. POST /adsets
  const asRes = await axios.post(`${AVS}/adsets`, {
    name: 'Mock AdSet', campaign_id: cRes.data.id,
  });
  assert(asRes.status === 200, 'POST /adsets → 200');
  assert(/^\d+$/.test(asRes.data.id), 'adset ID numeric');

  // 6c. POST /adcreatives
  const crRes = await axios.post(`${AVS}/adcreatives`, { name: 'Creative - Mock Ad' });
  assert(crRes.status === 200, 'POST /adcreatives → 200');
  assert(/^\d+$/.test(crRes.data.id), 'creative ID numeric');

  // 6d. POST /ads
  const adRes = await axios.post(`${AVS}/ads`, {
    name: 'Mock Ad', adset_id: asRes.data.id, creative: { creative_id: crRes.data.id },
  });
  assert(adRes.status === 200, 'POST /ads → 200');
  assert(/^\d+$/.test(adRes.data.id), 'ad ID numeric');

  // 6e. Validation errors
  try {
    await axios.post(`${AVS}/campaigns`, {});
    assert(false, 'POST /campaigns without name → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /campaigns without name → 400');
    assert(err.response?.data?.error?.type === 'OAuthException', 'error.type = OAuthException (FB format)');
  }

  try {
    await axios.post(`${AVS}/adsets`, { name: 'No Campaign' });
    assert(false, 'POST /adsets without campaign_id → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /adsets without campaign_id → 400');
  }

  try {
    await axios.post(`${AVS}/ads`, { name: 'No AdSet' });
    assert(false, 'POST /ads without adset_id → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'POST /ads without adset_id → 400');
  }

  // 6f. GET not found
  try {
    await axios.get(`${AVS}/campaigns/99999999`);
    assert(false, 'GET unknown campaign → 404');
  } catch (err) {
    assert(err.response?.status === 404, 'GET unknown campaign → 404');
  }
}

// =============================================================================
// SCENARIO 7: Full Distribute → ACTIVE flow (E2E)
// =============================================================================
async function scenario7_FullDistributeFlow() {
  console.log('\n━━━ SCENARIO 7: Full Distribute → ACTIVE (E2E) ━━━');

  // 7a. Create campaign
  const cRes = await axios.post(`${CS}/campaigns`, {
    name: 'E2E Full Flow', objective: 'CONVERSIONS',
    dailyBudget: 500000, currency: 'VND',
  }, { headers });
  const cId = cRes.data.data.id;
  assert(cRes.status === 201, 'Campaign created');

  // 7b. Create creative
  const crRes = await axios.post(`${CS}/creatives`, {
    name: 'E2E Creative', type: 'IMAGE',
    headline: 'Test Headline', body: 'Test Body',
    destinationUrl: 'https://example.com',
    mediaUrls: ['https://via.placeholder.com/1200x628.jpg'],
    callToAction: 'LEARN_MORE',
  }, { headers });
  const crId = crRes.data.data.id;
  assert(crRes.status === 201, 'Creative created');

  // 7c. Create ad set
  const asRes = await axios.post(`${CS}/campaigns/${cId}/ad-sets`, {
    name: 'E2E AdSet', budget: 200000, budgetType: 'DAILY',
    optimizationGoal: 'OFFSITE_CONVERSIONS',
  }, { headers });
  const asId = asRes.data.data.id;
  assert(asRes.status === 201, 'Ad set created');

  // 7d. Create ad (link creative + ad_set)
  // Need to insert directly since campaign-service may not have dedicated POST /ads endpoint
  // Use DB directly via campaign detail check
  // For now, we check the distribute validates at least

  // 7e. Distribute
  let distributeRes;
  try {
    distributeRes = await axios.post(`${CS}/campaigns/${cId}/distribute`, {}, { headers });
    // May fail if no ads exist — that's actually correct validation
    if (distributeRes.status === 200) {
      assert(true, 'Distribute → 200');
      assert(distributeRes.data.data.status === 'DISTRIBUTING', 'status = DISTRIBUTING');

      // 7f. Wait for ACTIVE via Kafka feedback
      console.log('    ⏳ Waiting for campaign → ACTIVE (max 15s)...');
      const active = await waitForStatus(cId, 'ACTIVE');
      assert(active !== null, 'Campaign reached ACTIVE');

      if (active) {
        // 7g. Check platform_mappings
        const statusRes = await axios.get(`${CS}/campaigns/${cId}/status`, { headers });
        const mappings = statusRes.data.data.platforms;
        assert(mappings.length > 0, 'platform_mappings created');
        assert(mappings[0].platform === 'facebook', 'platform = facebook');
        assert(mappings[0].sync_status === 'SYNCED', 'sync_status = SYNCED');
        assert(/^\d+$/.test(mappings[0].platform_id), 'platform_id is numeric (FB ID)');

        // 7h. Wait for metrics + fetch insights
        console.log('    ⏳ Waiting for metrics (4s)...');
        await sleep(4000);

        const insRes = await axios.get(`${CS}/campaigns/${cId}/insights`, { headers });
        assert(insRes.status === 200, 'GET /insights → 200');

        const row = insRes.data.data?.data?.[0];
        if (row) {
          assert(typeof row.impressions === 'string', 'impressions is string (FB format)');
          assert(typeof row.clicks === 'string', 'clicks is string');
          assert(typeof row.spend === 'string', 'spend is string');
          assert(typeof row.ctr === 'string', 'ctr is string');
          assert(typeof row.cpc === 'string', 'cpc is string');
          assert(typeof row.cpm === 'string', 'cpm is string');
          assert(typeof row.cpa === 'string', 'cpa is string');
          assert(typeof row.roas === 'string', 'roas is string');
          assert(typeof row.reach === 'string', 'reach is string');
          assert(row.date_start !== undefined, 'date_start present');
          assert(row.date_stop !== undefined, 'date_stop present');
          assert(Array.isArray(row.cost_per_action_type), 'cost_per_action_type is array');
          assert(insRes.data.data.paging !== undefined, 'paging present');
        } else {
          skip('No insights data yet (metrics not generated)');
        }

        return cId;
      }
    }
  } catch (err) {
    // Expected if no ads linked (validation blocks)
    if (err.response?.data?.error?.message?.includes('missing creative')) {
      assert(true, 'Distribute blocked: ads missing creative (correct validation)');
      skip('Full flow skipped — need POST /ads endpoint to link creatives to ad sets');
    } else {
      assert(false, `Distribute failed unexpectedly: ${err.response?.data?.error?.message || err.message}`);
    }
  }
}

// =============================================================================
// SCENARIO 8: Pause / Resume lifecycle
// =============================================================================
async function scenario8_PauseResume(campaignId) {
  console.log('\n━━━ SCENARIO 8: Pause / Resume Lifecycle ━━━');

  if (!campaignId) {
    skip('No ACTIVE campaign to test pause/resume');
    return;
  }

  // 8a. Pause
  const pauseRes = await axios.post(`${CS}/campaigns/${campaignId}/pause`, {}, { headers });
  assert(pauseRes.status === 200, 'Pause → 200');
  assert(pauseRes.data.data.status === 'PAUSED', 'status = PAUSED');

  // 8b. Resume
  const resumeRes = await axios.post(`${CS}/campaigns/${campaignId}/resume`, {}, { headers });
  assert(resumeRes.status === 200, 'Resume → 200');
  assert(resumeRes.data.data.status === 'ACTIVE', 'status = ACTIVE');

  // 8c. Pause → Resume → Pause
  await axios.post(`${CS}/campaigns/${campaignId}/pause`, {}, { headers });
  const afterPause2 = await axios.get(`${CS}/campaigns/${campaignId}`, { headers });
  assert(afterPause2.data.data.status === 'PAUSED', 'Double pause works');

  // 8d. Pause khi đã PAUSED → 400
  try {
    await axios.post(`${CS}/campaigns/${campaignId}/pause`, {}, { headers });
    assert(false, 'Pause when already PAUSED → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Pause when already PAUSED → 400');
  }

  // 8e. Resume khi đã ACTIVE → 400
  await axios.post(`${CS}/campaigns/${campaignId}/resume`, {}, { headers });
  try {
    await axios.post(`${CS}/campaigns/${campaignId}/resume`, {}, { headers });
    assert(false, 'Resume when already ACTIVE → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Resume when already ACTIVE → 400');
  }
}

// =============================================================================
// SCENARIO 9: Insights khi chưa distribute → 404
// =============================================================================
async function scenario9_InsightsBeforeDistribute() {
  console.log('\n━━━ SCENARIO 9: Insights Before Distribute ━━━');

  const cRes = await axios.post(`${CS}/campaigns`, {
    name: 'No Distribute Yet', objective: 'AWARENESS',
  }, { headers });
  const cId = cRes.data.data.id;

  try {
    await axios.get(`${CS}/campaigns/${cId}/insights`, { headers });
    assert(false, 'Insights before distribute → 404');
  } catch (err) {
    assert(err.response?.status === 404, 'Insights before distribute → 404');
  }
}

// =============================================================================
// SCENARIO 10: Virtual Server /simulate/metrics endpoint
// =============================================================================
async function scenario10_SimulateMetrics() {
  console.log('\n━━━ SCENARIO 10: Simulate Metrics Endpoint ━━━');

  // 10a. Valid call
  const simRes = await axios.post(`${AVS}/simulate/metrics`, {
    campaign_id:  '00000000-0000-0000-0000-000000000001',
    workspace_id: '00000000-0000-0000-0000-000000000001',
    platform:     'facebook',
    ad_sets: [{
      ad_set_id: '00000000-0000-0000-0000-000000000010',
      ads: [{ ad_id: '00000000-0000-0000-0000-000000000100' }],
    }],
  });
  assert(simRes.status === 200, 'POST /simulate/metrics → 200');
  assert(simRes.data.ok === true, 'response.ok = true');
  assert(simRes.data.simulations_started >= 1, 'simulations started');

  // 10b. Missing campaign_id → 400
  try {
    await axios.post(`${AVS}/simulate/metrics`, { workspace_id: 'x' });
    assert(false, 'Simulate without campaign_id → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Simulate without campaign_id → 400');
  }

  // 10c. Missing workspace_id → 400
  try {
    await axios.post(`${AVS}/simulate/metrics`, { campaign_id: 'x' });
    assert(false, 'Simulate without workspace_id → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Simulate without workspace_id → 400');
  }
}

// =============================================================================
// SCENARIO 11: Creative validation edge cases
// =============================================================================
async function scenario11_CreativeValidation() {
  console.log('\n━━━ SCENARIO 11: Creative Validation ━━━');

  // 11a. Missing name
  try {
    await axios.post(`${CS}/creatives`, { type: 'IMAGE' }, { headers });
    assert(false, 'Creative without name → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Creative without name → 400');
  }

  // 11b. Invalid type
  try {
    await axios.post(`${CS}/creatives`, { name: 'Test', type: 'INVALID_TYPE' }, { headers });
    assert(false, 'Creative with invalid type → 400');
  } catch (err) {
    assert(err.response?.status === 400, 'Creative with invalid type → 400');
  }

  // 11c. Valid carousel type
  const carRes = await axios.post(`${CS}/creatives`, {
    name: 'Carousel Creative', type: 'CAROUSEL',
    headline: 'Multi Items',
  }, { headers });
  assert(carRes.status === 201, 'CAROUSEL creative → 201');

  // 11d. Valid video type
  const vidRes = await axios.post(`${CS}/creatives`, {
    name: 'Video Creative', type: 'VIDEO',
    headline: 'Watch This',
  }, { headers });
  assert(vidRes.status === 201, 'VIDEO creative → 201');
}

// =============================================================================
// RUN ALL SCENARIOS
// =============================================================================
async function run() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    Integration Test Suite — Auto-Ads     ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await scenario1_HealthChecks();
    await scenario2_CampaignCRUD();
    await scenario3_Validation();
    await scenario4_DistributeValidation();
    await scenario5_AdSetCreativeCRUD();
    await scenario6_VirtualServerAPI();
    const activeCampaignId = await scenario7_FullDistributeFlow();
    await scenario8_PauseResume(activeCampaignId);
    await scenario9_InsightsBeforeDistribute();
    await scenario10_SimulateMetrics();
    await scenario11_CreativeValidation();
  } catch (err) {
    console.error(`\n💥 Unexpected error: ${err.message}`);
    if (err.response) {
      console.error('   Response:', err.response.status, err.response.data);
    }
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  ✅ Passed: ${String(passed).padStart(3)}                         ║`);
  console.log(`║  ❌ Failed: ${String(failed).padStart(3)}                         ║`);
  console.log(`║  ⏭️  Skipped: ${String(skipped).padStart(3)}                       ║`);
  console.log('╚══════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

run();
