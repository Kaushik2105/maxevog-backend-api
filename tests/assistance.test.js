/**
 * Assistance Module Test Suite
 */
const request = require('supertest');
const app = require('../src/app');
const { User, Job, TimeSlot } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Assistance Request Module', () => {
  let studentToken;
  let adminToken;
  let agentUser;
  let slotId;
  let jobId;
  let createdAssistanceId;

  beforeAll(async () => {
    // Student
    const student = await User.create({
      email: 'student.assist@example.com',
      passwordHash: await hashPassword('Pass@12345'),
      role: 'USER',
      status: 'ACTIVE',
    });
    studentToken = generateToken({ id: student.id, email: student.email, role: student.role });

    // Admin
    const admin = await User.create({
      email: 'admin.assist@example.com',
      passwordHash: await hashPassword('Admin@12345'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    // Agent
    agentUser = await User.create({
      email: 'agent.assist@example.com',
      passwordHash: await hashPassword('Agent@12345'),
      role: 'AGENT',
      status: 'ACTIVE',
    });

    // Job
    const job = await Job.create({
      title: 'NABARD Assistant Manager 2026',
      organization: 'NABARD',
      applicationLastDate: '2026-11-20',
      applicationFee: 150.0,
      isPublished: true,
      status: 'PUBLISHED',
    });
    jobId = job.id;

    // Time Slot
    const slot = await TimeSlot.create({
      date: '2026-10-05',
      startTime: '11:00',
      endTime: '12:00',
      maxCapacity: 1,
      availableCapacity: 1,
      status: 'AVAILABLE',
    });
    slotId = slot.id;
  });

  it('should create an assistance request with official fee + ₹50 service fee', async () => {
    const res = await request(app)
      .post('/api/v1/assistance')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        jobId,
        preferredSlotId: slotId,
        notes: 'Need help with certificate format upload',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assistanceRequest).toBeDefined();
    expect(res.body.data.assistanceRequest.officialFee).toBe(150.0);
    expect(res.body.data.assistanceRequest.serviceFee).toBe(50.0);
    expect(res.body.data.assistanceRequest.totalAmount).toBe(200.0); // 150 + 50
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.totalAmount).toBe(200.0);
    createdAssistanceId = res.body.data.assistanceRequest.id;

    // Verify slot is now booked (capacity depleted)
    const updatedSlot = await TimeSlot.findByPk(slotId);
    expect(updatedSlot.availableCapacity).toBe(0);
    expect(updatedSlot.status).toBe('BOOKED');
  });

  it('should allow admin to assign an agent and Google Meet link to the session', async () => {
    const res = await request(app)
      .patch(`/api/v1/assistance/${createdAssistanceId}/assign-agent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        agentId: agentUser.id,
        meetingLink: 'https://meet.google.com/xyz-assist-session',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assistance.assignedAgentId).toBe(agentUser.id);
    expect(res.body.data.assistance.meetingLink).toBe('https://meet.google.com/xyz-assist-session');
    expect(res.body.data.assistance.status).toBe('ASSIGNED');
  });
});
