/**
 * Authentication Test Suite
 */
const request = require('supertest');
const app = require('../src/app');

describe('Authentication Module', () => {
  const testUser = {
    email: 'applicant.test@example.com',
    password: 'Password@123',
    fullName: 'Test Applicant',
    mobileNumber: '9876543210',
  };

  it('should register a new applicant user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Zero sensitive leak
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject duplicate email registration with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid/weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'weak.pass@example.com',
        password: 'weak',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate registered user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword@999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return current user profile on GET /auth/me with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    const token = loginRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.profile).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject unauthenticated request to /auth/me with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should send registration OTP via /auth/send-otp', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({
        email: 'otp.candidate@example.com',
        fullName: 'OTP Candidate',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('otp.candidate@example.com');
  });

  it('should verify OTP and register candidate via /auth/verify-otp-register', async () => {
    // 1. Send OTP
    const otpRes = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({
        email: 'verified.candidate@example.com',
        fullName: 'Verified Candidate',
      });
    const otpCode = otpRes.body.data.devOtp;

    // 2. Verify & Register
    const regRes = await request(app)
      .post('/api/v1/auth/verify-otp-register')
      .send({
        email: 'verified.candidate@example.com',
        password: 'Password@987',
        fullName: 'Verified Candidate',
        otp: otpCode,
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.email).toBe('verified.candidate@example.com');
    expect(regRes.body.data.token).toBeDefined();
  });

  it('should authenticate via Google OAuth /auth/google and save avatar/name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        email: 'google.applicant@example.com',
        fullName: 'Google Aspirant',
        avatarUrl: 'https://lh3.googleusercontent.com/a/avatar-test',
        googleId: 'google-sub-123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('google.applicant@example.com');
    expect(res.body.data.user.profile.avatarUrl).toBe('https://lh3.googleusercontent.com/a/avatar-test');
    expect(res.body.data.token).toBeDefined();
  });
});
