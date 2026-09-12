/**
 * Notification Controller
 */
const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/response.util');
const { buildPaginationMeta, getPaginationParams } = require('../utils/pagination.util');

async function getUserNotifications(req, res, next) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const unreadOnly = req.query.unreadOnly === 'true';
    const { count, rows } = await notificationService.getUserNotifications(req.user.id, {
      page,
      limit,
      unreadOnly,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notifications fetched successfully',
      data: { notifications: rows },
      meta: buildPaginationMeta({ count, page, limit }),
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.id, req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification marked as read',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function triggerBroadcast(req, res, next) {
  try {
    const { type, title, message, channel } = req.body;
    const result = await notificationService.broadcastNotification({ type, title, message, channel });
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Broadcast notification dispatched successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function triggerUserNotification(req, res, next) {
  try {
    const { userId, type, title, message, channel } = req.body;
    const notification = await notificationService.sendNotification({
      userId,
      type,
      title,
      message,
      channel,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification sent successfully',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  triggerBroadcast,
  triggerUserNotification,
};
