/**
 * Pro Club V1 Test Suite
 * Validates candidate subscription lifecycle, 3-month quarterly validity,
 * deterministic job matching, job tracking, deadline reminders cancellation,
 * 1 free application assistance credit consumption, and admin controls.
 */
const request = require('supertest');
const app = require('../src/app');
const { User, Profile, Job } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Pro Club V1 Module', () => {
  let userToken;
  let userId;
  let adminToken;
  let adminId;
  let testJob;

  beforeAll(async () => {
    // 1. Create candidate user with complete profile
    const user = await User.create({
      email: 'pro.candidate@example.com',
      passwordHash: await hashPassword('ProPass@12345'),
      role: 'USER',
      status: 'ACTIVE',
    });
    userId = user.id;
    userToken = generateToken({ id: user.id, email: user.email, role: user.role });

    await Profile.create({
      userId: user.id,
      fullName: 'Pro Aspirant Candidate',
      dob: '2000-05-15', // Age ~24-26
      gender: 'MALE',
      category: 'OBC',
      educationLevel: 'GRADUATE',
      degree: 'B.Tech / B.E. (Bachelor of Technology / Engineering)',
      branch: 'Computer Science & Engineering (CSE)',
      state: 'Delhi',
      profileCompletionPercentage: 90,
    });

    // 2. Create admin user
    const admin = await User.create({
      email: 'pro.admin@example.com',
      passwordHash: await hashPassword('AdminPass@12345'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminId = admin.id;
    adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

    // 3. Create published test recruitment
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // D-7
    testJob = await Job.create({
      title: 'Senior Systems Engineer (Recruitment 2026)',
      organization: 'National Informatics Centre',
      department: 'Ministry of Electronics and IT',
      qualification: 'GRADUATE',
      eligibleDegrees: ['B.Tech / B.E. (Bachelor of Technology / Engineering)'],
      eligibleBranches: ['Computer Science & Engineering (CSE)'],
      ageMin: 18,
      ageMax: 30,
      applicationLastDate: deadline,
      applicationFee: 100,
      isPublished: true,
      status: 'PUBLISHED',
    });
  });

  it('should report no active Pro Club status initially', async () => {
    const res = await request(app)
      .get('/api/v1/pro/status')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPro).toBe(false);
    expect(res.body.data.assistanceCredits.available).toBe(false);
  });

  it('should activate 3-month Pro Club with 1 free assistance credit', async () => {
    const res = await request(app)
      .post('/api/v1/pro/activate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPro).toBe(true);
    expect(res.body.data.subscription.status).toBe('ACTIVE');
    expect(res.body.data.assistanceCredits.total).toBe(1);
    expect(res.body.data.assistanceCredits.remaining).toBe(1);
    expect(res.body.data.assistanceCredits.available).toBe(true);

    // Verify 3-month validity in dates
    const start = new Date(res.body.data.subscription.startDate);
    const end = new Date(res.body.data.subscription.endDate);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    expect(diffMonths).toBe(3);
  });

  it('should reflect Pro status in current user session', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.isProMember).toBe(true);
    expect(res.body.data.user.assistanceCredits.available).toBe(true);
  });

  it('should match eligible recruitments with reasons and disclaimer', async () => {
    // Sync matches
    const syncRes = await request(app)
      .post('/api/v1/pro/matches/sync')
      .set('Authorization', `Bearer ${userToken}`);

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);

    // Fetch matched feed
    const matchRes = await request(app)
      .get('/api/v1/pro/matches')
      .set('Authorization', `Bearer ${userToken}`);

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.success).toBe(true);
    expect(matchRes.body.data.matches.length).toBeGreaterThan(0);

    const firstMatch = matchRes.body.data.matches[0];
    expect(firstMatch.reasons).toBeDefined();
    expect(firstMatch.reasons.length).toBeGreaterThan(0);
    expect(firstMatch.disclaimer).toContain('official recruitment notification remains the final authority');
  });

  it('should track a job and display it in tracked list & Deadline Center', async () => {
    // Track test job
    const trackRes = await request(app)
      .post(`/api/v1/pro/tracked/${testJob.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(trackRes.status).toBe(201);
    expect(trackRes.body.success).toBe(true);
    expect(trackRes.body.data.trackedJob.status).toBe('TRACKED');

    // Verify Deadline Center has the tracked job
    const deadlineRes = await request(app)
      .get('/api/v1/pro/deadlines')
      .set('Authorization', `Bearer ${userToken}`);

    expect(deadlineRes.status).toBe(200);
    expect(deadlineRes.body.success).toBe(true);
    expect(deadlineRes.body.data.deadlines.length).toBeGreaterThan(0);

    const trackedItem = deadlineRes.body.data.deadlines.find((d) => d.jobId === testJob.id);
    expect(trackedItem).toBeDefined();
    expect(trackedItem.daysRemaining).toBeDefined();
  });

  it('should cancel future reminders when candidate submits application', async () => {
    const updateRes = await request(app)
      .patch(`/api/v1/pro/tracked/${testJob.id}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'APPLIED', notes: 'Submitted via NIC online portal' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.trackedJob.status).toBe('APPLIED');
    expect(updateRes.body.data.trackedJob.remindersCancelled).toBe(true);
  });

  it('should consume the 1 free application assistance credit (₹0 service fee)', async () => {
    // Request assistance for test job
    const assistRes = await request(app)
      .post('/api/v1/assistance/book')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        jobId: testJob.id,
        bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

    expect(assistRes.status).toBe(201);
    expect(assistRes.body.success).toBe(true);
    expect(assistRes.body.data.serviceFee).toBe(0); // ₹0 due to free Pro credit!

    // Verify that credit is now consumed
    const checkProRes = await request(app)
      .get('/api/v1/pro/status')
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkProRes.status).toBe(200);
    expect(checkProRes.body.data.assistanceCredits.remaining).toBe(0);
    expect(checkProRes.body.data.assistanceCredits.available).toBe(false);
  });

  it('should allow candidate to configure notification channels and connect Telegram', async () => {
    const prefsRes = await request(app)
      .get('/api/v1/pro/preferences')
      .set('Authorization', `Bearer ${userToken}`);

    expect(prefsRes.status).toBe(200);
    expect(prefsRes.body.data.preferences).toBeDefined();

    // Connect Telegram Chat ID
    const connectRes = await request(app)
      .post('/api/v1/pro/telegram/connect')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ chatId: '123456789' });

    expect(connectRes.status).toBe(200);
    expect(connectRes.body.data.preferences.telegramEnabled).toBe(true);
    expect(connectRes.body.data.preferences.telegramChatId).toBe('123456789');
  });

  it('should provide admin analytics and subscriber directory', async () => {
    const statsRes = await request(app)
      .get('/api/v1/admin/pro/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.subscribers.activeSubscribers).toBeGreaterThan(0);
    expect(statsRes.body.data.subscribers.assistanceCredits.totalConsumed).toBeGreaterThan(0);

    const subscribersRes = await request(app)
      .get('/api/v1/admin/pro/subscribers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(subscribersRes.status).toBe(200);
    expect(subscribersRes.body.data.subscribers.length).toBeGreaterThan(0);

    // Trigger deadline check
    const reminderRes = await request(app)
      .post('/api/v1/admin/pro/trigger-reminders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reminderRes.status).toBe(200);
    expect(reminderRes.body.data.evaluated).toBeDefined();
  });
});
