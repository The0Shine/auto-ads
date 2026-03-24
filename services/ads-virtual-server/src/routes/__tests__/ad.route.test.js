const request = require('supertest');

jest.mock('../../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../timescale', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const app = require('../../app');

describe('POST /ads', () => {
  it('returns { id, name } for valid body', async () => {
    const res = await request(app).post('/ads').send({
      name:     'Test Ad',
      adset_id: '17100000000000003',
      creative: { creative_id: '17100000000000004' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Test Ad');
    expect(res.body.id).toMatch(/^\d+$/);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/ads').send({
      adset_id: '17100000000000003',
      creative: { creative_id: '17100000000000004' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when adset_id is missing', async () => {
    const res = await request(app).post('/ads').send({
      name:    'Test Ad',
      creative: { creative_id: '17100000000000004' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when creative is missing', async () => {
    const res = await request(app).post('/ads').send({
      name:     'Test Ad',
      adset_id: '17100000000000003',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /ads/:id', () => {
  it('returns stored ad', async () => {
    const created = await request(app).post('/ads').send({
      name:     'Stored Ad',
      adset_id: '17100000000000005',
      creative: { creative_id: '17100000000000006' },
    });

    const { id } = created.body;
    const res = await request(app).get(`/ads/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.status).toBe('PAUSED');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/ads/99999999999999');
    expect(res.status).toBe(404);
  });
});
