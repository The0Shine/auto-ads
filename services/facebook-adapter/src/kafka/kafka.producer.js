// =============================================================================
// Kafka Producer — Facebook Adapter
// Publishes status feedback events back to campaign-service
// =============================================================================

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'facebook-adapter',
  brokers:  [(process.env.KAFKA_BROKERS || 'kafka:9092')],
});

const producer = kafka.producer();
let connected  = false;

async function connectProducer() {
  try {
    await producer.connect();
    connected = true;
    console.log('[Kafka Producer] facebook-adapter connected');
  } catch (err) {
    console.warn('[Kafka Producer] Connection failed (non-fatal):', err.message);
  }
}

/**
 * Publish an event to a Kafka topic.
 * Snake_case keys throughout — matches DB convention.
 * @param {string} topic
 * @param {string} key   - usually campaign_id (UUID)
 * @param {object} value - event payload (snake_case)
 */
async function publishEvent(topic, key, value) {
  if (!connected) {
    console.warn(`[Kafka Producer] Not connected — skipping event: ${topic}`);
    return false;
  }
  try {
    await producer.send({
      topic,
      messages: [{ key: String(key), value: JSON.stringify(value) }],
    });
    return true;
  } catch (err) {
    console.error(`[Kafka Producer] Failed to publish to ${topic}:`, err.message);
    return false;
  }
}

async function disconnectProducer() {
  if (connected) await producer.disconnect();
}

module.exports = { connectProducer, publishEvent, disconnectProducer };
