import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../src/server';

describe('GET /api/health', () => {
  it('should respond with a 200 status and a success message', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'OK', message: 'Server is running' });
  });
});

