/**
 * Admin Pro Club Controller
 * Management endpoints for Pro Club analytics, subscribers, notification audits, and manual engine triggers.
 */
const proSubscriptionService = require('../services/proSubscription.service');
const proNotificationService = require('../services/proNotification.service');
const jobMatchingService = require('../services/jobMatching.service');
const { NotificationLog, TrackedJob, ProJobMatch, Job, User, Profile } = require('../models');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { sendSuccess } = require('../utils/response.util');

/**
 * Get overall Pro Club ecosystem statistics
 */
async function getStats(req, res, next) {
  try {
    const subStats = await proSubscriptionService.getAdminProStats();
    const totalTracked = await TrackedJob.count();
    const totalMatchesGenerated = await ProJobMatch.count();
    const totalNotificationsSent = await NotificationLog.count({ where: { status: 'SENT' } });
    const failedNotifications = await NotificationLog.count({ where: { status: 'FAILED' } });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Pro Club analytics fetched successfully',
      data: {
        subscribers: subStats,
        trackedJobsCount: totalTracked,
        matchesGeneratedCount: totalMatchesGenerated,
        notifications: {
          sent: totalNotificationsSent,
          failed: failedNotifications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List Pro subscribers with pagination
 */
async function listSubscribers(req, res, next) {
  try {
    const result = await proSubscriptionService.listAdminProSubscribers(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Pro subscribers fetched successfully',
      data: { subscribers: result.subscribers },
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List notification delivery audit logs
 */
async function listNotificationLogs(req, res, next) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const where = {};

    if (req.query.channel) where.channel = req.query.channel;
    if (req.query.status) where.status = req.query.status;
    if (req.query.notificationType) where.notificationType = req.query.notificationType;

    const { count, rows } = await NotificationLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email'],
          include: [{ model: Profile, as: 'profile', attributes: ['fullName', 'mobileNumber'] }],
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'organization', 'applicationLastDate'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification logs fetched successfully',
      data: { logs: rows },
      meta: buildPaginationMeta({ count, page, limit }),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger deadline reminders check
 */
async function triggerDeadlineReminders(req, res, next) {
  try {
    const result = await proNotificationService.runDeadlineRemindersScheduler();
    return sendSuccess(res, {
      statusCode: 200,
      message: `Deadline reminder check executed successfully. Evaluated ${result.evaluated} tracked recruitments.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger matching for a recruitment
 */
async function triggerJobMatching(req, res, next) {
  try {
    const { jobId } = req.params;
    const result = await jobMatchingService.matchJobForProCandidates(jobId);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Job matching evaluated successfully. Created ${result.matchesCreated} new candidate matches.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  listSubscribers,
  listNotificationLogs,
  triggerDeadlineReminders,
  triggerJobMatching,
};
