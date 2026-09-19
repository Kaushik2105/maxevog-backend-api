/**
 * Server Entrypoint
 * Bootstraps database connection, synchronizes schemas, and starts HTTP listener.
 */
const app = require('./app');
const envConfig = require('./config/env.config');
const { connectDatabase } = require('./config/database.config');
const { syncDatabase } = require('./models');
const { ensureAdminAccount } = require('./utils/adminSetup.util');
const logger = require('./utils/logger.util');

async function startServer() {
  try {
    // 1. Connect and initialize database
    await connectDatabase();

    // 2. Synchronize database tables
    await syncDatabase({ alter: false });

    // 3. Ensure master administrator account exists
    await ensureAdminAccount();

    // 4. Start HTTP & Socket.IO server
    const http = require('http');
    const { initSocket } = require('./services/socket.service');
    const baseUrl = envConfig.app.baseUrl;
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const server = httpServer.listen(envConfig.app.port, () => {
      logger.info(`Server running on port ${envConfig.app.port} (${envConfig.app.env})`);
      logger.info(`WebSocket real-time engine initialized`);
      logger.info(`Swagger Docs: ${baseUrl}/docs`);
      logger.info(`Health Check: ${baseUrl}/health`);

      // Initialize Pro Club Deadline Reminder scheduler
      if (!envConfig.app.isTest) {
        try {
          const { runDeadlineRemindersScheduler } = require('./services/proNotification.service');
          // Run on startup after 15 seconds
          setTimeout(() => {
            runDeadlineRemindersScheduler().catch((e) => logger.error(`[ProReminders] Initial run error: ${e.message}`));
          }, 15000);
          // Run every 6 hours
          setInterval(() => {
            runDeadlineRemindersScheduler().catch((e) => logger.error(`[ProReminders] Scheduled run error: ${e.message}`));
          }, 6 * 60 * 60 * 1000);
          logger.info(`[Pro Club] Automated deadline protection scheduler initialized.`);
        } catch (e) {
          logger.error(`[Pro Club] Scheduler initialization error: ${e.message}`);
        }
      }
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
