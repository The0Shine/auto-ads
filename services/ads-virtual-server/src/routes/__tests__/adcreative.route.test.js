const request = require('supertest');

jest.mock('../../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
jest.mock('../../timescale', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));

const app = require('../../app');

describe('POST /adcreatives', () => {
  it('returns { id } for valid body', async () => {
    const res = await request(app)
      .post('/adcreatives')
      .send({ name: 'Creative - Test Ad' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toMatch(/^\d+$/);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/adcreatives').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /adcreatives/:id', () => {
  it('returns stored creative', async () => {
    const created = await request(app)
      .post('/adcreatives')
      .send({ name: 'Creative - Stored' });

    const { id } = created.body;
    const res = await request(app).get(`/adcreatives/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/adcreatives/99999999999999');
    expect(res.status).toBe(404);
  });
});
