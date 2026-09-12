/**
 * Notification Service
 * Manages email, telegram, and in-app notifications with preference checks.
 */
const { Notification, NotificationPreference, User } = require('../models');
const {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} = require('../constants/notification.constant');
const logger = require('../utils/logger.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Send notification to a specific user
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.channel]
 * @param {object} [params.metadata]
 */
async function sendNotification({
  userId,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  channel = NOTIFICATION_CHANNELS.EMAIL,
  metadata = {},
}) {
  const user = await User.findByPk(userId, {
    include: [{ model: NotificationPreference, as: 'notificationPreference' }],
  });

  if (!user) {
    throw new AppError('User not found for notification dispatch', 404);
  }

  const prefs = user.notificationPreference;

  // Verify user preferences
  if (prefs) {
    if (channel === NOTIFICATION_CHANNELS.EMAIL && !prefs.emailEnabled) {
      logger.info(`Notification skipped: User ${userId} disabled email notifications`);
      return null;
    }
    if (channel === NOTIFICATION_CHANNELS.TELEGRAM && !prefs.telegramEnabled) {
      logger.info(`Notification skipped: User ${userId} disabled telegram notifications`);
      return null;
    }
    if (type === NOTIFICATION_TYPES.APPLICATION_DEADLINE && !prefs.deadlineAlerts) {
      return null;
    }
    if (type === NOTIFICATION_TYPES.ADMIT_CARD_AVAILABLE && !prefs.admitCardAlerts) {
      return null;
    }
    if (type === NOTIFICATION_TYPES.EXAM_REMINDER && !prefs.examAlerts) {
      return null;
    }
    if (type === NOTIFICATION_TYPES.RESULT_AVAILABLE && !prefs.resultAlerts) {
      return null;
    }
  }

  // Create notification record
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    channel,
    status: NOTIFICATION_STATUSES.SENT,
    sentAt: new Date(),
    metadata,
  });

  logger.info(`[Notification] Sent ${type} via ${channel} to user: ${user.email}`);

  return notification;
}

/**
 * Broadcast notification to all active users (Admin trigger)
 */
async function broadcastNotification({ type, title, message, channel = NOTIFICATION_CHANNELS.EMAIL }) {
  const users = await User.findAll({ where: { status: 'ACTIVE' }, attributes: ['id', 'email'] });
  const results = [];

  for (const user of users) {
    try {
      const notif = await sendNotification({
        userId: user.id,
        type,
        title,
        message,
        channel,
      });
      if (notif) results.push(notif);
    } catch (err) {
      logger.error(`Error sending broadcast to user ${user.id}: ${err.message}`);
    }
  }

  return { dispatched: results.length, totalRecipients: users.length };
}

/**
 * Get user notifications with pagination
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
  const where = { userId };
  if (unreadOnly) {
    where.readAt = null;
  }

  const offset = (page - 1) * limit;

  return Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
}

/**
 * Mark a single notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.readAt = new Date();
  notification.status = NOTIFICATION_STATUSES.READ;
  await notification.save();

  return notification;
}

/**
 * Mark all user notifications as read
 */
async function markAllNotificationsAsRead(userId) {
  const [affectedCount] = await Notification.update(
    { readAt: new Date(), status: NOTIFICATION_STATUSES.READ },
    { where: { userId, readAt: null } }
  );

  return { markedRead: affectedCount };
}

module.exports = {
  sendNotification,
  broadcastNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
