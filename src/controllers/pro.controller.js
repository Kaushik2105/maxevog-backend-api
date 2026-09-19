/**
 * Pro Club Controller
 * Handles all candidate Pro Club operations:
 * Status, Activation, Matched Jobs, Tracking, Deadline Center, and Notification Preferences.
 */
const crypto = require('crypto');
const proSubscriptionService = require('../services/proSubscription.service');
const jobMatchingService = require('../services/jobMatching.service');
const jobTrackingService = require('../services/jobTracking.service');
const userService = require('../services/user.service');
const { getTelegramBotLink } = require('../services/telegram.service');
const { sendSuccess } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Get candidate's Pro Club status and profile completion
 */
async function getStatus(req, res, next) {
  try {
    const statusData = await proSubscriptionService.getProStatus(req.user.id);
    const profile = await userService.getProfile(req.user.id);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Pro status retrieved successfully',
      data: {
        ...statusData,
        profileCompletionPercentage: profile.profileCompletionPercentage || 0,
        isProfileIncomplete: (profile.profileCompletionPercentage || 0) < 80,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Activate Pro Club (Instant 3-Month activation for V1)
 */
async function activate(req, res, next) {
  try {
    const result = await proSubscriptionService.activateProClub(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get personalized matched jobs feed
 */
async function getMatchedJobs(req, res, next) {
  try {
    const { matches, meta } = await jobMatchingService.getCandidateMatchedJobs(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Personalized matched jobs fetched successfully',
      data: { matches },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Re-evaluate candidate matches against current profile
 */
async function syncMatches(req, res, next) {
  try {
    const result = await jobMatchingService.matchAllJobsForCandidate(req.user.id);
    const { matches, meta } = await jobMatchingService.getCandidateMatchedJobs(req.user.id, { limit: 10 });
    return sendSuccess(res, {
      statusCode: 200,
      message: `Profile evaluation complete. Found ${result.matches} matching recruitments.`,
      data: { matches, totalMatched: result.matches },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get candidate tracked recruitments
 */
async function getTracked(req, res, next) {
  try {
    const { trackedJobs, meta } = await jobTrackingService.getTrackedJobs(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Tracked applications fetched successfully',
      data: { trackedJobs },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Track a recruitment
 */
async function trackJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const result = await jobTrackingService.trackJob(req.user.id, jobId);
    return sendSuccess(res, {
      statusCode: 201,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Untrack a recruitment
 */
async function untrackJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const result = await jobTrackingService.untrackJob(req.user.id, jobId);
    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update candidate application status
 */
async function updateTrackedStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const { status, notes } = req.body;

    if (!['TRACKED', 'IN_PROGRESS', 'APPLIED'].includes(status)) {
      throw new AppError('Invalid application status. Allowed: TRACKED, IN_PROGRESS, APPLIED', 400);
    }

    const result = await jobTrackingService.updateApplicationStatus(req.user.id, jobId, status, notes);
    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Deadline Center items ordered by urgency
 */
async function getDeadlines(req, res, next) {
  try {
    const deadlineData = await jobTrackingService.getDeadlineCenter(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Deadline Center schedule fetched successfully',
      data: deadlineData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get notification preferences and Telegram connection status
 */
async function getPreferences(req, res, next) {
  try {
    const prefs = await userService.getPreferences(req.user.id);
    let connectCode = prefs.telegramVerificationCode;

    if (!connectCode) {
      connectCode = crypto.randomBytes(6).toString('hex');
      prefs.telegramVerificationCode = connectCode;
      await prefs.save();
    }

    const botLink = getTelegramBotLink(connectCode);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification preferences fetched successfully',
      data: {
        preferences: prefs,
        telegram: {
          connected: Boolean(prefs.telegramEnabled && prefs.telegramChatId),
          chatId: prefs.telegramChatId,
          connectCode,
          botLink,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update notification channels and alert toggles
 */
async function updatePreferences(req, res, next) {
  try {
    const updated = await userService.updatePreferences(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Notification preferences updated successfully',
      data: { preferences: updated },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Connect Telegram channel using Chat ID
 */
async function connectTelegram(req, res, next) {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      throw new AppError('Telegram Chat ID is required', 400);
    }

    const prefs = await userService.updatePreferences(req.user.id, {
      telegramEnabled: true,
      telegramChatId: String(chatId).trim(),
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Telegram alerts successfully connected to your account!',
      data: { preferences: prefs },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disconnect Telegram channel
 */
async function disconnectTelegram(req, res, next) {
  try {
    const prefs = await userService.updatePreferences(req.user.id, {
      telegramEnabled: false,
      telegramChatId: null,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Telegram alerts disconnected.',
      data: { preferences: prefs },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  activate,
  getMatchedJobs,
  syncMatches,
  getTracked,
  trackJob,
  untrackJob,
  updateTrackedStatus,
  getDeadlines,
  getPreferences,
  updatePreferences,
  connectTelegram,
  disconnectTelegram,
};
