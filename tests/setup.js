/**
 * Jest Test Environment Setup
 * Initializes in-memory SQLite database and synchronizes schemas for isolated fast testing.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_automated_jest_testing_12345';
process.env.PORT = '5001';

const { sequelize, syncDatabase } = require('../src/models');

beforeAll(async () => {
  await syncDatabase({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
