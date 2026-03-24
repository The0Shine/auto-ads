// =============================================================================
// kafka.consumer.js — unit tests
// =============================================================================

const { createConsumer } = require('../kafka.consumer');

// Mock KafkaJS
jest.mock('kafkajs', () => {
  const eachMessageHandler = { fn: null };

  const consumer = {
    connect:    jest.fn().mockResolvedValue(undefined),
    subscribe:  jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    run: jest.fn(({ eachMessage }) => {
      eachMessageHandler.fn = eachMessage;
      return Promise.resolve();
    }),
    _trigger: eachMessageHandler, // expose for tests
  };

  return {
    Kafka: jest.fn(() => ({ consumer: jest.fn(() => consumer) })),
    _consumer: consumer,
  };
});

const { _consumer } = require('kafkajs');

describe('createConsumer — handleStatusChanged', () => {
  let pool;

  beforeEach(() => {
    pool = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'uuid-campaign-1', status: 'ACTIVE' }] }) };
    jest.clearAllMocks();
  });

  async function triggerMessage(payload) {
    const { start } = createConsumer(pool);
    await start();
    await _consumer._trigger.fn({
      topic:   'campaign.status.changed',
      message: { value: Buffer.from(JSON.stringify(payload)) },
    });
  }

  it('updates campaign status to ACTIVE when new_status=ACTIVE', async () => {
    await triggerMessage({
      event_type:  'campaign.status.changed',
      campaign_id: 'uuid-campaign-1',
      old_status:  'DISTRIBUTING',
      new_status:  'ACTIVE',
      platform:    'facebook',
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE campaigns'),
      ['ACTIVE', 'uuid-campaign-1']
    );
  });

  it('updates campaign status to PAUSED', async () => {
    await triggerMessage({
      event_type:  'campaign.status.changed',
      campaign_id: 'uuid-campaign-1',
      new_status:  'PAUSED',
      platform:    'facebook',
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE campaigns'),
      ['PAUSED', 'uuid-campaign-1']
    );
  });

  it('ignores unknown new_status values', async () => {
    await triggerMessage({
      event_type:  'campaign.status.changed',
      campaign_id: 'uuid-campaign-1',
      new_status:  'UNKNOWN_STATUS',
      platform:    'facebook',
    });

    expect(pool.query).not.toHaveBeenCalled();
  });

  it('ignores invalid JSON messages without crashing', async () => {
    const { start } = createConsumer(pool);
    await start();
    await _consumer._trigger.fn({
      topic:   'campaign.status.changed',
      message: { value: Buffer.from('not-json') },
    });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
