const request = require('supertest');

jest.mock('../../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../timescale', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

// Mock getMetrics to return controlled values
jest.mock('../../services/metrics.engine', () => ({
  insertMetrics:          jest.fn(),
  startMetricsSimulation: jest.fn(),
  getMetrics: jest.fn().mockResolvedValue({
    impressions: '5000',
    clicks:      '250',
    conversions: '12',
    spend:       '45.6789',
    revenue:     '137.0367',
    reach:       '4000',
    frequency:   '1.25',
    ctr:         '0.050000',
    cpc:         '0.182716',
    cpm:         '9.135780',
    cpa:         '3.806575',
    roas:        '3.003200',
  }),
}));

const app = require('../../app');

describe('GET /insights/:id', () => {
  const campaignId = '17100000000000099';

  it('returns all required fields matching FB Marketing API shape', async () => {
    const res = await request(app).get(`/insights/${campaignId}`);
    expect(res.status).toBe(200);

    const row = res.body.data[0];

    // All numeric values must be strings (FB API convention)
    expect(typeof row.impressions).toBe('string');
    expect(typeof row.clicks).toBe('string');
    expect(typeof row.spend).toBe('string');
    expect(typeof row.reach).toBe('string');
    expect(typeof row.frequency).toBe('string');
    expect(typeof row.ctr).toBe('string');
    expect(typeof row.cpc).toBe('string');
    expect(typeof row.cpm).toBe('string');
    expect(typeof row.cpa).toBe('string');
    expect(typeof row.roas).toBe('string');

    // date fields present in YYYY-MM-DD format
    expect(row.date_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.date_stop).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // paging cursor present
    expect(res.body.paging).toBeDefined();
    expect(res.body.paging.cursors).toBeDefined();
  });

  it('cost_per_action_type present when conversions > 0', async () => {
    const res = await request(app).get(`/insights/${campaignId}`);
    expect(res.body.data[0].cost_per_action_type).toBeInstanceOf(Array);
    expect(res.body.data[0].cost_per_action_type.length).toBeGreaterThan(0);
  });
});
