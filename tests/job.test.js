/**
 * Job & Recruitment Test Suite
 */
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Job / Recruitment Module', () => {
  let adminToken;
  let userToken;
  let createdJobId;

  beforeAll(async () => {
    // Setup Admin
    const adminUser = await User.create({
      email: 'admin.jobtest@example.com',
      passwordHash: await hashPassword('AdminPass@123'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // Setup Normal User
    const regularUser = await User.create({
      email: 'user.jobtest@example.com',
      passwordHash: await hashPassword('UserPass@123'),
      role: 'USER',
      status: 'ACTIVE',
    });
    userToken = generateToken({ id: regularUser.id, email: regularUser.email, role: regularUser.role });
  });

  it('should allow admin to create a new recruitment job', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Assistant Section Officer Recruitment 2026',
        organization: 'Ministry of External Affairs',
        department: 'General Cadre',
        applicationLastDate: '2026-12-31',
        vacancies: 250,
        applicationFee: 100,
        ageMin: 20,
        ageMax: 30,
        qualification: 'GRADUATE',
        state: 'Delhi',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.id).toBeDefined();
    createdJobId = res.body.data.job.id;
  });

  it('should prevent regular user from creating recruitment job with 403', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Unauthorized Job Attempt',
        organization: 'Some Org',
        applicationLastDate: '2026-12-31',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to publish job', async () => {
    const res = await request(app)
      .patch(`/api/v1/jobs/${createdJobId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isPublished: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.isPublished).toBe(true);
  });

  it('should list published jobs publicly with pagination metadata', async () => {
    const res = await request(app).get('/api/v1/jobs?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.currentPage).toBe(1);
  });

  it('should filter jobs by organization or search term', async () => {
    const res = await request(app).get('/api/v1/jobs?search=External');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.jobs[0].organization).toContain('Ministry of External Affairs');
  });

  it('should evaluate and return personalized eligible jobs for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/eligible/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    if (res.body.data.jobs.length > 0) {
      expect(res.body.data.jobs[0].eligibility).toBeDefined();
      expect(res.body.data.jobs[0].eligibility.status).toBeDefined();
    }
  });
});
