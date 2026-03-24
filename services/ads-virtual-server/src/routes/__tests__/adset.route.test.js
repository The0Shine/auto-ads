const request = require('supertest');

// Mock pg pool — virtual server uses in-memory store, no real DB needed
jest.mock('../../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../timescale', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const app = require('../../app');

describe('POST /adsets', () => {
  it('returns { id, name } for valid body', async () => {
    const res = await request(app)
      .post('/adsets')
      .send({ name: 'Test AdSet', campaign_id: '17100000000000001' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Test AdSet');
    // ID must be numeric string (like FB)
    expect(res.body.id).toMatch(/^\d+$/);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/adsets')
      .send({ campaign_id: '17100000000000001' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when campaign_id is missing', async () => {
    const res = await request(app)
      .post('/adsets')
      .send({ name: 'Test AdSet' });
    expect(res.status).toBe(400);
  });
});

describe('GET /adsets/:id', () => {
  it('returns stored adset after creation', async () => {
    const created = await request(app)
      .post('/adsets')
      .send({ name: 'Stored AdSet', campaign_id: '17100000000000002' });

    const { id } = created.body;
    const res = await request(app).get(`/adsets/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.name).toBe('Stored AdSet');
    expect(res.body.status).toBe('PAUSED');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/adsets/99999999999999');
    expect(res.status).toBe(404);
  });
});
