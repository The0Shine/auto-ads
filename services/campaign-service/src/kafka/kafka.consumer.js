// =============================================================================
// Kafka Consumer — Campaign Service
// Listens for feedback events from platform adapters (facebook-adapter, etc.)
// and updates campaign status accordingly.
// =============================================================================

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'campaign-service-consumer',
  brokers:  [(process.env.KAFKA_BROKERS || 'kafka:9092')],
});

/**
 * Create and start the consumer.
 * @param {object} pool - pg Pool instance from index.js
 */
function createConsumer(pool) {
  const consumer = kafka.consumer({ groupId: 'campaign-service-group' });

  async function start() {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: 'campaign.status.changed', fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          let payload;
          try {
            payload = JSON.parse(message.value.toString());
          } catch {
            console.warn('[Consumer] Invalid JSON message on', topic);
            return;
          }

          if (topic === 'campaign.status.changed') {
            await handleStatusChanged(pool, payload);
          }
        },
      });

      console.log('[Kafka Consumer] campaign-service listening on campaign.status.changed');
    } catch (err) {
      // Non-fatal: app still works, just won't auto-update status from adapter events
      console.warn('[Kafka Consumer] Failed to start (non-fatal):', err.message);
    }
  }

  async function stop() {
    try { await consumer.disconnect(); } catch {}
  }

  return { start, stop };
}

// ─── Handlers ────────────────────────────────────────────────────────────

/**
 * Handle campaign.status.changed event published by platform adapters.
 * Payload (snake_case):
 *   { event_type, campaign_id, old_status, new_status, platform, timestamp }
 */
async function handleStatusChanged(pool, payload) {
  const { campaign_id, new_status, platform } = payload;

  if (!campaign_id || !new_status) {
    console.warn('[Consumer] campaign.status.changed missing campaign_id or new_status');
    return;
  }

  const allowed = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ERROR'];
  if (!allowed.includes(new_status)) {
    console.warn(`[Consumer] Ignoring unknown status transition → ${new_status}`);
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE campaigns
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status != $1
       RETURNING id, status`,
      [new_status, campaign_id]
    );

    if (result.rows.length > 0) {
      console.log(`[Consumer] Campaign ${campaign_id} status → ${new_status} (via ${platform})`);
    }
  } catch (err) {
    console.error('[Consumer] DB update failed:', err.message);
  }
}

module.exports = { createConsumer };
