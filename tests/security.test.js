/**
 * Security & Zero-Credential Leakage Test Suite
 */
const request = require('supertest');
const app = require('../src/app');

describe('Security & Zero-Credential Enforcement', () => {
  it('should never expose passwordHash in registration response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'security.check@example.com',
        password: 'SecurePass@123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('should prevent role escalation attempts during registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'hacker.attempt@example.com',
        password: 'HackerPass@123',
        role: 'ADMIN', // Sneaky role escalation attempt
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER'); // Always forced to USER
  });

  it('should reject malformed or forged JWT tokens with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer forged.invalid.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 200 on health check without disclosing system internals', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('should allow CORS requests from maxevog.vercel.app and set access-control-allow-origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://maxevog.vercel.app');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://maxevog.vercel.app');
  });

  it('should allow CORS requests from Vercel preview deployments', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://maxevog-dev.vercel.app');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://maxevog-dev.vercel.app');
  });
});
