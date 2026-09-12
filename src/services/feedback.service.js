/**
 * Feedback & Suggestions Service
 * Handles applicant feedback, bug reports, and assistance complaints.
 */
const { Feedback, User, Profile } = require('../models');
const { FEEDBACK_STATUSES } = require('../constants/feedback.constant');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { AppError } = require('../middleware/error.middleware');

/**
 * Submit feedback or complaint
 */
async function submitFeedback(userId, { type, subject, message, rating = null }) {
  return Feedback.create({
    userId,
    type,
    subject,
    message,
    rating,
    status: FEEDBACK_STATUSES.OPEN,
  });
}

/**
 * Get user feedback submissions
 */
async function getUserFeedbacks(userId) {
  return Feedback.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Admin: List feedback submissions
 */
async function listAdminFeedbacks(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.type) {
    where.type = query.type;
  }

  const { count, rows } = await Feedback.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        include: [{ model: Profile, as: 'profile', attributes: ['fullName', 'mobileNumber'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { feedbacks: rows, meta: buildPaginationMeta({ count, page, limit }) };
}

/**
 * Admin: Update feedback status and provide administrative response
 */
async function respondToFeedback(id, { status, adminResponse }) {
  const feedback = await Feedback.findByPk(id);
  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  if (status) feedback.status = status;
  if (adminResponse !== undefined) feedback.adminResponse = adminResponse;

  await feedback.save();
  return feedback;
}

module.exports = {
  submitFeedback,
  getUserFeedbacks,
  listAdminFeedbacks,
  respondToFeedback,
};
