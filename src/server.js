/**
 * Server Entrypoint
 * Bootstraps database connection, synchronizes schemas, and starts HTTP listener.
 */
const app = require('./app');
const envConfig = require('./config/env.config');
const { connectDatabase } = require('./config/database.config');
const { syncDatabase } = require('./models');
const logger = require('./utils/logger.util');

async function startServer() {
  try {
    // 1. Connect and initialize database
    await connectDatabase();

    // 2. Synchronize database tables (in dev/test)
    if (!envConfig.app.isProduction) {
      await syncDatabase({ alter: false });
    }

    // 3. Start Express server
    const server = app.listen(envConfig.app.port, () => {
      logger.info(`========================================================`);
      logger.info(`  Government Recruitment Platform Backend (V1) is Running`);
      logger.info(`  Port: ${envConfig.app.port}`);
      logger.info(`  Environment: ${envConfig.app.env}`);
      logger.info(`  Swagger Docs: http://localhost:${envConfig.app.port}/docs`);
      logger.info(`  Health Check: http://localhost:${envConfig.app.port}/health`);
      logger.info(`========================================================`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Received shutdown signal; closing HTTP server cleanly...');
      server.close(() => {
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Fatal startup error:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
