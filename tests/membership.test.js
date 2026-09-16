/**
 * Membership Test Suite
 */
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const { generateToken } = require('../src/utils/jwt.util');
const { hashPassword } = require('../src/utils/password.util');

describe('Membership Module', () => {
  let userToken;
  let userId;
  let paymentId;

  beforeAll(async () => {
    const user = await User.create({
      email: 'member.test@example.com',
      passwordHash: await hashPassword('Member@12345'),
      role: 'USER',
      status: 'ACTIVE',
    });
    userId = user.id;
    userToken = generateToken({ id: user.id, email: user.email, role: user.role });
  });

  it('should report no active membership initially', async () => {
    const res = await request(app)
      .get('/api/v1/membership')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasActiveMembership).toBe(false);
  });

  it('should allow student to purchase quarterly membership plan (₹249)', async () => {
    const res = await request(app)
      .post('/api/v1/membership/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ planId: 'QUARTERLY_249' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.membership.amount).toBe(249);
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.totalAmount).toBe(249);
    paymentId = res.body.data.payment.id;
  });

  it('should activate membership upon successful payment verification', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${paymentId}/verify`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ success: true, transactionId: 'TXN_MEMBER_99_TEST' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.status).toBe('SUCCESS');

    // Verify membership is now active
    const checkRes = await request(app)
      .get('/api/v1/membership')
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.hasActiveMembership).toBe(true);
    expect(checkRes.body.data.membership.status).toBe('ACTIVE');
    expect(checkRes.body.data.membership.endDate).toBeDefined();
  });
});
