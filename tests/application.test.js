/**
 * Application Tracking Test Suite
 */
const request = require('supertest');
const app = require('../src/app');
const { User, Job } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Application Tracking Module', () => {
  let studentToken;
  let studentId;
  let agentToken;
  let testJobId;
  let createdApplicationId;

  beforeAll(async () => {
    // Student
    const student = await User.create({
      email: 'applicant.apptest@example.com',
      passwordHash: await hashPassword('Pass@12345'),
      role: 'USER',
      status: 'ACTIVE',
    });
    studentId = student.id;
    studentToken = generateToken({ id: student.id, email: student.email, role: student.role });

    // Agent
    const agent = await User.create({
      email: 'agent.apptest@example.com',
      passwordHash: await hashPassword('AgentPass@123'),
      role: 'AGENT',
      status: 'ACTIVE',
    });
    agentToken = generateToken({ id: agent.id, email: agent.email, role: agent.role });

    // Test Job
    const job = await Job.create({
      title: 'Inspector of Posts 2026',
      organization: 'India Post',
      applicationLastDate: '2026-11-30',
      isPublished: true,
      status: 'PUBLISHED',
    });
    testJobId = job.id;
  });

  it('should allow student to track a job application', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ jobId: testJobId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('INTERESTED');
    createdApplicationId = res.body.data.application.id;
  });

  it('should list applications for the authenticated applicant', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.applications[0].job).toBeDefined();
  });

  it('should allow student to explicitly authorize final submission', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdApplicationId}/authorize-submission`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('SUBMISSION_AUTHORIZED');
    expect(res.body.data.application.submissionAuthorizedAt).toBeDefined();
  });

  it('should allow agent/admin to complete submission with government application number', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${createdApplicationId}/complete-submission`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        applicationNumber: 'IP-2026-987654',
        examDate: '2026-12-15',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('SUBMITTED');
    expect(res.body.data.application.applicationNumber).toBe('IP-2026-987654');
    expect(res.body.data.application.submittedAt).toBeDefined();
  });
});
