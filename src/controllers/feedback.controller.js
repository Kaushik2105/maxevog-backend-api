/**
 * Feedback Controller
 */
const feedbackService = require('../services/feedback.service');
const { sendSuccess } = require('../utils/response.util');

async function submitFeedback(req, res, next) {
  try {
    const feedback = await feedbackService.submitFeedback(req.user ? req.user.id : null, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Feedback submitted successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
}

async function getUserFeedbacks(req, res, next) {
  try {
    const feedbacks = await feedbackService.getUserFeedbacks(req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'User feedbacks fetched successfully',
      data: { feedbacks },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminFeedbacks(req, res, next) {
  try {
    const { feedbacks, meta } = await feedbackService.listAdminFeedbacks(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Feedback submissions fetched successfully',
      data: { feedbacks },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function respondToFeedback(req, res, next) {
  try {
    const feedback = await feedbackService.respondToFeedback(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Feedback response saved successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitFeedback,
  getUserFeedbacks,
  listAdminFeedbacks,
  respondToFeedback,
};
