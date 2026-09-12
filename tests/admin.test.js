/**
 * Admin Dashboard & Analytics Test Suite
 */
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Admin Dashboard & Analytics Module', () => {
  let adminToken;
  let regularToken;
  let targetUser;

  beforeAll(async () => {
    const admin = await User.create({
      email: 'master.admin@example.com',
      passwordHash: await hashPassword('Admin@12345'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    targetUser = await User.create({
      email: 'regular.applicant@example.com',
      passwordHash: await hashPassword('User@12345'),
      role: 'USER',
      status: 'ACTIVE',
    });
    regularToken = generateToken({ id: targetUser.id, email: targetUser.email, role: targetUser.role });
  });

  it('should return overview dashboard statistics for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
    expect(res.body.data.applications).toBeDefined();
    expect(res.body.data.assistance).toBeDefined();
    expect(res.body.data.revenue).toBeDefined();
  });

  it('should return user growth graph data with date timeline', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/user-growth?period=30d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('30d');
    expect(Array.isArray(res.body.data.data)).toBe(true);
    if (res.body.data.data.length > 0) {
      expect(res.body.data.data[0].date).toBeDefined();
      expect(res.body.data.data[0].totalUsers).toBeDefined();
    }
  });

  it('should allow admin to suspend an abusive user account', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('SUSPENDED');

    // Suspended user cannot login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: targetUser.email, password: 'User@12345' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toContain('suspended');
  });

  it('should block regular users from accessing admin routes with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to create a new desk agent user', async () => {
    const res = await request(app)
      .post('/api/v1/admin/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Officer Vikram Singh',
        email: 'agent.vikram@recruitment.gov.in',
        password: 'AgentPassword@123',
        phone: '9876543210',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent.email).toBe('agent.vikram@recruitment.gov.in');
    expect(res.body.data.agent.role).toBe('AGENT');
    expect(res.body.data.agent.profile.fullName).toBe('Officer Vikram Singh');
  });
});
