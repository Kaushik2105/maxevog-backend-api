/**
 * Job Tracking & Personal Application Tracker Service
 * Manages Tracked Jobs, Candidate Application Lifecycle (Tracked -> In Progress -> Applied -> Expired),
 * and the Deadline Center with urgency calculations.
 */
const { Op } = require('sequelize');
const { TrackedJob, Job } = require('../models');
const { TRACKED_JOB_STATUSES } = require('../models/trackedJob.model');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

/**
 * Track a recruitment for a candidate
 * @param {string} userId
 * @param {string} jobId
 */
async function trackJob(userId, jobId) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new Error('Recruitment not found');
  }

  const [record, created] = await TrackedJob.findOrCreate({
    where: { userId, jobId },
    defaults: {
      status: TRACKED_JOB_STATUSES.TRACKED,
      deadlineAt: job.applicationLastDate,
      remindersCancelled: false,
    },
  });

  if (!created && record.deadlineAt !== job.applicationLastDate) {
    record.deadlineAt = job.applicationLastDate;
    await record.save();
  }

  logger.info(`[JobTracker] User ${userId} tracked recruitment ${jobId} (created: ${created})`);

  return {
    trackedJob: record,
    created,
    message: created
      ? 'Recruitment added to your Tracked Jobs. You will receive deadline alerts.'
      : 'Job is already in your tracking list.',
  };
}

/**
 * Untrack a recruitment
 * @param {string} userId
 * @param {string} jobId
 */
async function untrackJob(userId, jobId) {
  const deletedCount = await TrackedJob.destroy({
    where: { userId, jobId },
  });

  logger.info(`[JobTracker] User ${userId} untracked recruitment ${jobId}`);

  return {
    success: true,
    untracked: deletedCount > 0,
    message: 'Recruitment removed from your tracking list.',
  };
}

/**
 * Update candidate-controlled application status
 * When marked 'APPLIED', all future reminders are automatically cancelled.
 * @param {string} userId
 * @param {string} jobId
 * @param {string} status - 'TRACKED' | 'IN_PROGRESS' | 'APPLIED'
 * @param {string} [notes]
 */
async function updateApplicationStatus(userId, jobId, status, notes = undefined) {
  const trackedJob = await TrackedJob.findOne({
    where: { userId, jobId },
  });

  if (!trackedJob) {
    throw new Error('Tracked job not found');
  }

  trackedJob.status = status;
  if (notes !== undefined) {
    trackedJob.notes = notes;
  }

  if (status === TRACKED_JOB_STATUSES.APPLIED) {
    trackedJob.appliedAt = new Date();
    trackedJob.remindersCancelled = true; // Reminders stop immediately upon submission
    logger.info(`[JobTracker] User ${userId} submitted application for job ${jobId}. Reminders cancelled.`);
  } else if (trackedJob.remindersCancelled && (status === TRACKED_JOB_STATUSES.TRACKED || status === TRACKED_JOB_STATUSES.IN_PROGRESS)) {
    // Re-enable reminders if user toggles back from applied
    trackedJob.remindersCancelled = false;
    trackedJob.appliedAt = null;
  }

  await trackedJob.save();

  return {
    trackedJob,
    message:
      status === TRACKED_JOB_STATUSES.APPLIED
        ? 'Application marked as submitted! Congratulations. Deadline reminders stopped.'
        : `Status updated to ${status}.`,
  };
}

/**
 * Get candidate tracked jobs
 * @param {string} userId
 * @param {object} query
 */
async function getTrackedJobs(userId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = { userId };

  if (query.status) {
    where.status = query.status;
  }

  const { count, rows } = await TrackedJob.findAndCountAll({
    where,
    include: [
      {
        model: Job,
        as: 'job',
      },
    ],
    order: [
      ['deadlineAt', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
  });

  const today = new Date(new Date().toISOString().split('T')[0]);

  const mapped = rows.map((record) => {
    let daysRemaining = null;
    let isExpired = false;

    if (record.deadlineAt) {
      const deadline = new Date(record.deadlineAt);
      daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining < 0;
    }

    // Auto-adjust status if expired and not submitted
    let displayStatus = record.status;
    if (isExpired && record.status !== TRACKED_JOB_STATUSES.APPLIED) {
      displayStatus = TRACKED_JOB_STATUSES.EXPIRED;
    }

    return {
      id: record.id,
      jobId: record.jobId,
      status: displayStatus,
      rawStatus: record.status,
      deadlineAt: record.deadlineAt,
      daysRemaining,
      isExpired,
      remindersCancelled: record.remindersCancelled,
      appliedAt: record.appliedAt,
      notes: record.notes,
      createdAt: record.createdAt,
      job: record.job,
    };
  });

  return {
    trackedJobs: mapped,
    meta: buildPaginationMeta({ count, page, limit }),
  };
}

/**
 * Get Deadline Center items ordered by urgency (closest deadline first)
 * @param {string} userId
 */
async function getDeadlineCenter(userId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  const trackedList = await TrackedJob.findAll({
    where: {
      userId,
      deadlineAt: { [Op.ne]: null },
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
    order: [['deadlineAt', 'ASC']],
  });

  const deadlineItems = trackedList.map((item) => {
    const deadline = new Date(item.deadlineAt);
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyLevel = 'UPCOMING';
    let urgencyColor = 'var(--color-primary)';

    if (diffDays <= 0) {
      urgencyLevel = 'EXPIRED_OR_TODAY';
      urgencyColor = 'var(--color-danger)';
    } else if (diffDays === 1) {
      urgencyLevel = 'CRITICAL_D1';
      urgencyColor = '#DC2626'; // Deep Red
    } else if (diffDays <= 3) {
      urgencyLevel = 'URGENT_D3';
      urgencyColor = '#EA580C'; // Bright Orange
    } else if (diffDays <= 7) {
      urgencyLevel = 'APPROACHING_D7';
      urgencyColor = '#D97706'; // Amber / Yellow
    }

    return {
      id: item.id,
      jobId: item.jobId,
      title: item.job?.title,
      organization: item.job?.organization,
      deadlineAt: item.deadlineAt,
      daysRemaining: Math.max(0, diffDays),
      isExpired: diffDays < 0,
      isDeadlineDay: diffDays === 0,
      status: item.status,
      remindersCancelled: item.remindersCancelled,
      urgencyLevel,
      urgencyColor,
      appliedAt: item.appliedAt,
      officialApplicationUrl: item.job?.officialApplicationUrl || item.job?.officialNotificationUrl,
    };
  });

  // Sort with most urgent active items first
  deadlineItems.sort((a, b) => {
    if (a.status === TRACKED_JOB_STATUSES.APPLIED && b.status !== TRACKED_JOB_STATUSES.APPLIED) return 1;
    if (a.status !== TRACKED_JOB_STATUSES.APPLIED && b.status === TRACKED_JOB_STATUSES.APPLIED) return -1;
    return a.daysRemaining - b.daysRemaining;
  });

  return {
    deadlines: deadlineItems,
    counts: {
      total: deadlineItems.length,
      urgentCount: deadlineItems.filter((i) => i.daysRemaining <= 3 && i.status !== TRACKED_JOB_STATUSES.APPLIED).length,
      submittedCount: deadlineItems.filter((i) => i.status === TRACKED_JOB_STATUSES.APPLIED).length,
    },
  };
}

/**
 * When an admin updates or extends an official recruitment deadline,
 * automatically update all candidate tracking records and notify them.
 * @param {string} jobId
 * @param {string} newDeadline - YYYY-MM-DD
 */
async function syncUpdatedJobDeadline(jobId, newDeadline) {
  const trackedRecords = await TrackedJob.findAll({
    where: { jobId },
    include: [{ model: Job, as: 'job' }],
  });

  if (!trackedRecords || trackedRecords.length === 0) return { updatedCount: 0 };

  const proNotificationService = require('./proNotification.service');
  let updatedCount = 0;

  for (const record of trackedRecords) {
    const oldDeadline = record.deadlineAt;
    if (oldDeadline !== newDeadline) {
      record.deadlineAt = newDeadline;
      await record.save();
      updatedCount++;

      // Notify candidate of deadline extension / update
      proNotificationService.notifyDeadlineUpdated(record.userId, record.job, oldDeadline, newDeadline).catch((err) => {
        logger.error(`[JobTracker] Deadline update notification error for user ${record.userId}: ${err.message}`);
      });
    }
  }

  logger.info(`[JobTracker] Synced updated deadline (${newDeadline}) for ${updatedCount} candidates tracking job ${jobId}`);
  return { updatedCount };
}

module.exports = {
  trackJob,
  untrackJob,
  updateApplicationStatus,
  getTrackedJobs,
  getDeadlineCenter,
  syncUpdatedJobDeadline,
};
