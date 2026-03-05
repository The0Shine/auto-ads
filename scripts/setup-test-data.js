/**
 * Step 1: Setup Test Data
 * This script creates a test user, workspace, and a draft campaign in the database.
 */
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://autoads:autoads_dev@127.0.0.1:5433/autoads',
});

async function setup() {
  const userId = uuidv4();
  const workspaceId = uuidv4();
  const campaignId = uuidv4();
  const adSetId = uuidv4();

  try {
    console.log('--- Setting up Test Data ---');

    // 1. Create User
    await pool.query(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, 'hashed_pwd', 'Test User')",
      [userId, `test_${Date.now()}@example.com`]
    );
    console.log(`✅ Created User: ${userId}`);

    // 2. Create Workspace
    await pool.query(
      "INSERT INTO workspaces (id, name, owner_id) VALUES ($1, 'Test Workspace', $2)",
      [workspaceId, userId]
    );
    console.log(`✅ Created Workspace: ${workspaceId}`);

    // 3. Create Campaign (DRAFT)
    const campaignResult = await pool.query(
      `INSERT INTO campaigns (id, workspace_id, created_by, name, objective, status, platforms)
       VALUES ($1, $2, $3, 'Test FB Campaign', 'TRAFFIC', 'DRAFT', '["facebook"]')
       RETURNING *`,
      [campaignId, workspaceId, userId]
    );
    console.log(`✅ Created Campaign: ${campaignId}`);

    // 4. Create Ad Set
    await pool.query(
      `INSERT INTO ad_sets (id, campaign_id, name, status, budget, budget_type)
       VALUES ($1, $2, 'Test Ad Set 1', 'ACTIVE', 100, 'DAILY')`,
      [adSetId, campaignId]
    );
    console.log(`✅ Created Ad Set: ${adSetId}`);

    console.log('\n--- SETUP COMPLETE ---');
    console.log(`CAMPAIGN_ID=${campaignId}`);
    console.log(`USER_ID=${userId}`);
    console.log('\nCopy the CAMPAIGN_ID and USER_ID to run the distribution test.');

  } catch (err) {
    console.error('❌ Setup failed:', err);
  } finally {
    await pool.end();
  }
}

setup();
