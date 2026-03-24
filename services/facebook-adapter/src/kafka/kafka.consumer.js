// =============================================================================
// Kafka Consumer — Facebook Adapter
// =============================================================================

const { Kafka } = require('kafkajs');
const { handleDistribute } = require('../handlers/campaign.handler');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');

const kafka = new Kafka({
  clientId: 'facebook-adapter',
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: 'facebook-adapter-group' });

async function connectConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ['campaign.distribute'], fromBeginning: false });

    // consumer.run() returns a promise that never settles (runs indefinitely)
    // so we must NOT await it — otherwise the startup hangs.
    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        let payload;
        try {
          payload = JSON.parse(message.value.toString());
        } catch {
          console.warn('[Facebook-Kafka] Invalid JSON message, skipping');
          return;
        }

        const eventType = payload.event_type || payload.eventType;
        console.log(`[Facebook-Kafka] Received event: ${eventType} on topic: ${topic}`);

        if (topic === 'campaign.distribute' || eventType === 'campaign.distribute') {
          const platforms = payload.campaign?.platforms || [];
          if (platforms.includes('facebook')) {
            try {
              await handleDistribute(payload);
            } catch (err) {
              console.error(`[Facebook-Kafka] handleDistribute failed: ${err.message}`);
            }
          } else {
            console.log(`[Facebook-Kafka] Skipping — platforms: ${JSON.stringify(platforms)}`);
          }
        }
      },
    });

    console.log('✅ Facebook Kafka consumer connected & subscribed');
  } catch (err) {
    console.warn('⚠️ Facebook Kafka consumer failed to connect:', err.message);
  }
}

async function disconnectConsumer() {
  try {
    await consumer.disconnect();
  } catch {}
}

module.exports = { connectConsumer, disconnectConsumer };
