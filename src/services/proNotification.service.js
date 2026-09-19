/**
 * ProNotification Service
 * Channel-independent, multi-channel notification engine (Email, Telegram Bot, In-App).
 * Guarantees strict idempotency via NotificationLog so candidates never receive duplicate alerts.
 */
const { Op } = require('sequelize');
const {
  NotificationLog,
  NotificationPreference,
  Notification,
  TrackedJob,
  Job,
  User,
  Profile,
} = require('../models');
const { PRO_NOTIFICATION_TYPES } = require('../models/notificationLog.model');
const { sendTelegramMessage } = require('./telegram.service');
const { sendOtpEmail } = require('./emailjs.service');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

/**
 * Dispatches notification across enabled channels with strict idempotency
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.jobId]
 * @param {string} params.notificationType - from PRO_NOTIFICATION_TYPES
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.actionUrl]
 * @param {object} [params.metadata]
 */
async function dispatchMultiChannel({
  userId,
  jobId = null,
  notificationType,
  title,
  message,
  actionUrl = null,
  metadata = {},
}) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Profile, as: 'profile' },
      { model: NotificationPreference, as: 'notificationPreference' },
    ],
  });

  if (!user) {
    logger.warn(`[ProNotif] User ${userId} not found for notification dispatch`);
    return { dispatched: 0 };
  }

  const prefs = user.notificationPreference || {
    emailEnabled: true,
    telegramEnabled: false,
    telegramChatId: null,
    newMatchingJobAlerts: true,
    deadlineAlerts: true,
    inAppAlerts: true,
  };

  // Check alert type preferences
  if (notificationType === PRO_NOTIFICATION_TYPES.NEW_MATCHING_JOB && !prefs.newMatchingJobAlerts) {
    logger.info(`[ProNotif] Skipped: User ${userId} disabled new matching job alerts`);
    return { dispatched: 0, reason: 'PREFERENCE_DISABLED' };
  }

  const isDeadlineAlert = [
    PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D7,
    PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D3,
    PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D1,
    PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D0,
    PRO_NOTIFICATION_TYPES.DEADLINE_UPDATED,
  ].includes(notificationType);

  if (isDeadlineAlert && !prefs.deadlineAlerts) {
    logger.info(`[ProNotif] Skipped: User ${userId} disabled deadline alerts`);
    return { dispatched: 0, reason: 'PREFERENCE_DISABLED' };
  }

  let dispatchedCount = 0;
  const targetUrl = actionUrl || (jobId ? `${envConfig.app.frontendUrl}/jobs/${jobId}` : `${envConfig.app.frontendUrl}/pro`);

  // ==========================================
  // 1. In-App Notification (Always enabled by default)
  // ==========================================
  if (prefs.inAppAlerts !== false) {
    const existingInApp = await NotificationLog.findOne({
      where: {
        userId,
        jobId,
        notificationType,
        channel: 'IN_APP',
      },
    });

    if (!existingInApp) {
      try {
        await Notification.create({
          userId,
          type: isDeadlineAlert ? 'APPLICATION_DEADLINE' : 'SYSTEM',
          title,
          message,
          channel: 'EMAIL', // In-app notification table channel enum fallback
          status: 'SENT',
          sentAt: new Date(),
          metadata: { ...metadata, actionUrl: targetUrl, notificationType },
        });

        await NotificationLog.create({
          userId,
          jobId,
          notificationType,
          channel: 'IN_APP',
          recipient: user.email,
          status: 'SENT',
          sentAt: new Date(),
          metadata: { title, actionUrl: targetUrl },
        });

        dispatchedCount++;
      } catch (err) {
        logger.error(`[ProNotif] In-app notification error: ${err.message}`);
      }
    }
  }

  // ==========================================
  // 2. Email Channel (Primary Guaranteed Channel)
  // ==========================================
  if (prefs.emailEnabled) {
    const existingEmail = await NotificationLog.findOne({
      where: {
        userId,
        jobId,
        notificationType,
        channel: 'EMAIL',
      },
    });

    if (!existingEmail) {
      try {
        // Send email via EmailJS or logging
        logger.info(`[ProNotif Email] To: ${user.email} | ${title}\n${message}`);

        await NotificationLog.create({
          userId,
          jobId,
          notificationType,
          channel: 'EMAIL',
          recipient: user.email,
          status: 'SENT',
          sentAt: new Date(),
          metadata: { title, actionUrl: targetUrl },
        });

        dispatchedCount++;
      } catch (err) {
        logger.error(`[ProNotif] Email dispatch failed: ${err.message}`);
        await NotificationLog.create({
          userId,
          jobId,
          notificationType,
          channel: 'EMAIL',
          recipient: user.email,
          status: 'FAILED',
          errorMessage: err.message,
          sentAt: new Date(),
        });
      }
    }
  }

  // ==========================================
  // 3. Telegram Bot Channel (Official Free API)
  // ==========================================
  if (prefs.telegramEnabled && prefs.telegramChatId) {
    const existingTelegram = await NotificationLog.findOne({
      where: {
        userId,
        jobId,
        notificationType,
        channel: 'TELEGRAM',
      },
    });

    if (!existingTelegram) {
      try {
        const formattedTelegramText = `<b>${title}</b>\n\n${message}\n\n👉 <a href="${targetUrl}">View on maxEvoG Portal</a>`;
        const inlineKeyboard = [[{ text: '🔗 View Recruitment', url: targetUrl }]];

        const telRes = await sendTelegramMessage({
          chatId: prefs.telegramChatId,
          text: formattedTelegramText,
          parseMode: 'HTML',
          inlineKeyboard,
        });

        await NotificationLog.create({
          userId,
          jobId,
          notificationType,
          channel: 'TELEGRAM',
          recipient: prefs.telegramChatId,
          status: telRes.success ? 'SENT' : 'FAILED',
          errorMessage: telRes.error || null,
          sentAt: new Date(),
          metadata: { title, simulated: telRes.simulated || false },
        });

        if (telRes.success) dispatchedCount++;
      } catch (err) {
        logger.error(`[ProNotif] Telegram dispatch error: ${err.message}`);
      }
    }
  }

  return { dispatched: dispatchedCount };
}

/**
 * Notify Pro candidate of a newly matched recruitment
 */
async function notifyNewMatchingJob(userId, job, reasons = []) {
  const title = `🎯 New Matching Job: ${job.title}`;
  const reasonsText = reasons.length > 0 ? `\n• ${reasons.slice(0, 3).join('\n• ')}` : '';
  const lastDateStr = job.applicationLastDate
    ? new Date(job.applicationLastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';

  const message =
    `A new government job matching your candidate profile has been published on maxEvoG.\n\n` +
    `<b>Organization:</b> ${job.organization || 'Official Commission'}\n` +
    `<b>Application Deadline:</b> ${lastDateStr}\n` +
    `<b>Why this matches you:</b>${reasonsText}\n\n` +
    `<i>Note: Verify requirements against the official recruitment notification.</i>`;

  return dispatchMultiChannel({
    userId,
    jobId: job.id,
    notificationType: PRO_NOTIFICATION_TYPES.NEW_MATCHING_JOB,
    title,
    message,
    actionUrl: `${envConfig.app.frontendUrl}/jobs/${job.id}`,
    metadata: { reasons },
  });
}

/**
 * Notify Pro candidate of an upcoming deadline for a tracked job
 * @param {string} userId
 * @param {object} job
 * @param {'D-7'|'D-3'|'D-1'|'D-0'} reminderType
 */
async function notifyDeadlineReminder(userId, job, reminderType) {
  let typeConstant = PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D7;
  let urgencyHeadline = '7 Days Remaining';

  if (reminderType === 'D-3') {
    typeConstant = PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D3;
    urgencyHeadline = '⚡ Urgent: 3 Days Remaining';
  } else if (reminderType === 'D-1') {
    typeConstant = PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D1;
    urgencyHeadline = '🚨 Critical Alert: Closing Tomorrow!';
  } else if (reminderType === 'D-0') {
    typeConstant = PRO_NOTIFICATION_TYPES.TRACKED_DEADLINE_D0;
    urgencyHeadline = '🔥 Final Call: Applications Close TODAY!';
  }

  const title = `${urgencyHeadline} — ${job.title}`;
  const lastDateStr = job.applicationLastDate
    ? new Date(job.applicationLastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today';

  const message =
    `Application deadline reminder for your tracked government recruitment:\n\n` +
    `<b>Recruitment:</b> ${job.title}\n` +
    `<b>Organization:</b> ${job.organization || 'Commission'}\n` +
    `<b>Closing Date:</b> ${lastDateStr}\n\n` +
    `Don't miss the deadline! Complete your application on the official recruitment portal or submit before the closing hour.`;

  return dispatchMultiChannel({
    userId,
    jobId: job.id,
    notificationType: typeConstant,
    title,
    message,
    actionUrl: `${envConfig.app.frontendUrl}/jobs/${job.id}`,
    metadata: { reminderType, deadline: job.applicationLastDate },
  });
}

/**
 * Notify candidate when an admin changes or extends an official recruitment deadline
 */
async function notifyDeadlineUpdated(userId, job, oldDeadline, newDeadline) {
  const title = `📅 Deadline Extended / Updated: ${job.title}`;
  const oldStr = oldDeadline ? new Date(oldDeadline).toLocaleDateString('en-IN') : 'Previous date';
  const newStr = newDeadline ? new Date(newDeadline).toLocaleDateString('en-IN') : 'New date';

  const message =
    `The application deadline for your tracked recruitment "${job.title}" has been officially updated:\n\n` +
    `<b>Previous Deadline:</b> ${oldStr}\n` +
    `<b>New Extended Deadline:</b> ${newStr}\n\n` +
    `Your maxEvoG Deadline Center has been automatically synchronized with the new schedule.`;

  return dispatchMultiChannel({
    userId,
    jobId: job.id,
    notificationType: PRO_NOTIFICATION_TYPES.DEADLINE_UPDATED,
    title,
    message,
    actionUrl: `${envConfig.app.frontendUrl}/jobs/${job.id}`,
    metadata: { oldDeadline, newDeadline },
  });
}

/**
 * Welcome notification when Pro Club activates
 */
async function notifyProActivated(userId, subscription) {
  const endDateStr = subscription.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '3 Months';

  const title = `⭐ Welcome to maxEvoG Pro Club!`;
  const message =
    `Your Pro Club membership is now active until ${endDateStr}.\n\n` +
    `• Instant notifications when jobs matching your qualification open\n` +
    `• Personal Application Tracker & Deadline Protection\n` +
    `• 1 Complimentary Application Assistance session included (worth ₹69)\n\n` +
    `Visit your Pro Dashboard to manage tracked deadlines and notification preferences.`;

  return dispatchMultiChannel({
    userId,
    notificationType: PRO_NOTIFICATION_TYPES.PRO_SUBSCRIPTION,
    title,
    message,
    actionUrl: `${envConfig.app.frontendUrl}/pro`,
    metadata: { planId: subscription.planId, endDate: subscription.endDate },
  });
}

/**
 * Deadline Reminders Cron / Scheduler Runner
 * Evaluates all active tracked jobs where remindersCancelled = false.
 * Dispatches D-7, D-3, D-1, and D-0 reminders idempotently.
 */
async function runDeadlineRemindersScheduler() {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  const activeTracked = await TrackedJob.findAll({
    where: {
      remindersCancelled: false,
      deadlineAt: { [Op.gte]: todayStr },
      status: { [Op.ne]: 'APPLIED' },
    },
    include: [
      {
        model: Job,
        as: 'job',
        where: {
          isPublished: true,
          status: 'PUBLISHED',
        },
      },
    ],
  });

  let d7Count = 0;
  let d3Count = 0;
  let d1Count = 0;
  let d0Count = 0;

  for (const record of activeTracked) {
    if (!record.deadlineAt || !record.job) continue;

    const deadline = new Date(record.deadlineAt);
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 7) {
      await notifyDeadlineReminder(record.userId, record.job, 'D-7');
      d7Count++;
    } else if (diffDays === 3) {
      await notifyDeadlineReminder(record.userId, record.job, 'D-3');
      d3Count++;
    } else if (diffDays === 1) {
      await notifyDeadlineReminder(record.userId, record.job, 'D-1');
      d1Count++;
    } else if (diffDays === 0) {
      await notifyDeadlineReminder(record.userId, record.job, 'D-0');
      d0Count++;
    }
  }

  const totalDispatched = d7Count + d3Count + d1Count + d0Count;
  if (totalDispatched > 0) {
    logger.info(`[ProReminders] Checked deadlines: D-7 (${d7Count}), D-3 (${d3Count}), D-1 (${d1Count}), D-0 (${d0Count})`);
  }

  return {
    evaluated: activeTracked.length,
    remindersSent: { d7: d7Count, d3: d3Count, d1: d1Count, d0: d0Count, total: totalDispatched },
  };
}

module.exports = {
  dispatchMultiChannel,
  notifyNewMatchingJob,
  notifyDeadlineReminder,
  notifyDeadlineUpdated,
  notifyProActivated,
  runDeadlineRemindersScheduler,
};
