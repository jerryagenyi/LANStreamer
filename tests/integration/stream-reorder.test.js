/**
 * Integration test: POST /api/streams/reorder
 * Guards: Reorder route exists, accepts streamIds array, returns 200
 */
import request from 'supertest';
import app from '../../src/server.js';

describe('POST /api/streams/reorder', () => {
  it('returns 200 when streamIds is an array', async () => {
    const res = await request(app)
      .post('/api/streams/reorder')
      .set('Content-Type', 'application/json')
      .send({ streamIds: [] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('streamIds');
    expect(Array.isArray(res.body.streamIds)).toBe(true);
  });

  it('returns 400 when streamIds is not an array', async () => {
    const res = await request(app)
      .post('/api/streams/reorder')
      .set('Content-Type', 'application/json')
      .send({ streamIds: 'not-an-array' });

    expect(res.status).toBe(400);
  });
});
