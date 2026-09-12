/**
 * Database Configuration
 * Manages Sequelize ORM instance, connection pooling, and connection health.
 */
const { Sequelize } = require('sequelize');
const path = require('path');
const envConfig = require('./env.config');

let sequelize;

if (envConfig.app.isTest) {
  // Test environment uses SQLite in-memory for zero external dependencies and fast isolation
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  });
} else if (envConfig.db.url) {
  sequelize = new Sequelize(envConfig.db.url, {
    dialect: envConfig.db.dialect,
    logging: envConfig.db.logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: envConfig.app.isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
} else if (envConfig.db.dialect === 'postgres') {
  sequelize = new Sequelize(
    envConfig.db.name,
    envConfig.db.user,
    envConfig.db.password,
    {
      host: envConfig.db.host,
      port: envConfig.db.port,
      dialect: 'postgres',
      logging: envConfig.db.logging,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
} else {
  // SQLite fallback
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: envConfig.db.logging,
  });
}

/**
 * Test database connection and fallback to SQLite if PostgreSQL fails and fallback is allowed
 */
async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log(`[DB] Successfully connected via ${sequelize.getDialect()} database.`);
    return sequelize;
  } catch (error) {
    if (envConfig.db.sqliteFallback && sequelize.getDialect() !== 'sqlite') {
      console.warn(`[DB] PostgreSQL connection failed (${error.message}). Falling back to local SQLite...`);
      const fallbackPath = path.resolve(__dirname, '../../database.sqlite');
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: fallbackPath,
        logging: false,
      });
      await sequelize.authenticate();
      console.log('[DB] Fallback SQLite database connected successfully.');
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
