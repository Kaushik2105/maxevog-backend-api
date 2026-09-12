/**
 * Database Configuration
 * Manages Sequelize ORM instance, connection pooling, and connection health.
 */
const { Sequelize } = require('sequelize');
const path = require('path');
const envConfig = require('./env.config');

let sequelize;

if (envConfig.app.isTest) {
  // Test environment uses SQLite in-memory for fast isolation
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  });
} else if (envConfig.db.url) {
  const isPostgres =
    envConfig.db.url.startsWith('postgres://') ||
    envConfig.db.url.startsWith('postgresql://');

  const isLocalhost =
    envConfig.db.url.includes('localhost') ||
    envConfig.db.url.includes('127.0.0.1') ||
    envConfig.db.url.includes('::1');

  const forceSsl =
    envConfig.db.url.includes('sslmode=require') ||
    envConfig.db.url.includes('ssl=true');

  const disableSsl =
    envConfig.db.url.includes('sslmode=disable') ||
    envConfig.db.url.includes('ssl=false');

  const useSsl =
    isPostgres &&
    !disableSsl &&
    (forceSsl || (!isLocalhost && envConfig.app.isProduction));

  sequelize = new Sequelize(envConfig.db.url, {
    logging: envConfig.db.logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
} else {
  // SQLite fallback when DATABASE_URL is not set
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: envConfig.db.logging,
  });
}

/**
 * Test database connection and fallback to SQLite if primary connection fails and fallback is allowed
 */
async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Database connected successfully.');
    return sequelize;
  } catch (error) {
    if (envConfig.db.sqliteFallback && sequelize.getDialect() !== 'sqlite') {
      const fallbackPath = path.resolve(__dirname, '../../database.sqlite');
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: fallbackPath,
        logging: false,
      });
      await sequelize.authenticate();
      console.log('[DB] Database connected successfully (SQLite fallback).');
      return sequelize;
    }
    console.error('[DB] Database connection error:', error.message);
    throw error;
  }
}

module.exports = {
  sequelize,
  connectDatabase,
};
