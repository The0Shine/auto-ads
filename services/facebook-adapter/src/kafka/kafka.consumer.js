// =============================================================================
// Kafka Consumer — Facebook Adapter
// =============================================================================

const { Kafka } = require('kafkajs');
const { handleDistribute } = require('../handlers/campaign.handler');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');

const kafka = new Kafka({
  clientId: 'facebook-adapter',
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: 'facebook-adapter-group' });

async function connectConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ['campaign.distribute'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const payload = JSON.parse(message.value.toString());
        console.log(`[Facebook-Kafka] Received event: ${payload.eventType}`);

        if (payload.eventType === 'campaign.distribute') {
          // Only process if 'facebook' is in the target platforms
          if (payload.campaign.platforms.includes('facebook')) {
            await handleDistribute(payload);
          }
        }
      },
    });

    console.log('✅ Facebook Kafka consumer connected & subscribed');
  } catch (err) {
    console.warn('⚠️ Facebook Kafka consumer failed to connect:', err.message);
  }
}

module.exports = { connectConsumer };
