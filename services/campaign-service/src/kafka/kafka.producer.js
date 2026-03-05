// =============================================================================
// Kafka Producer — Campaign Service
// =============================================================================

const { Kafka } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');

const kafka = new Kafka({
  clientId: 'campaign-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 1000, retries: 5 },
});

const producer = kafka.producer();
let isConnected = false;

async function connectProducer() {
  try {
    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka producer connected');
  } catch (err) {
    console.warn('⚠️ Kafka producer failed to connect:', err.message);
    console.warn('   Campaign events will be logged but not published');
  }
}

async function publishEvent(topic, key, payload) {
  const message = {
    key: String(key),
    value: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    }),
  };

  if (!isConnected) {
    console.log(`[Kafka OFF] Would publish to "${topic}":`, message.key);
    return false;
  }

  try {
    await producer.send({
      topic,
      messages: [message],
    });
    console.log(`[Kafka] Published to "${topic}": ${message.key}`);
    return true;
  } catch (err) {
    console.error(`[Kafka] Failed to publish to "${topic}":`, err.message);
    return false;
  }
}

async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka producer disconnected');
  }
}

// Kafka Topics
const TOPICS = {
  CAMPAIGN_DISTRIBUTE: 'campaign.distribute',
  CAMPAIGN_PAUSE: 'campaign.pause',
  CAMPAIGN_RESUME: 'campaign.resume',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status.changed',
  CAMPAIGN_UPDATED: 'campaign.updated',
};

module.exports = { connectProducer, publishEvent, disconnectProducer, TOPICS };
