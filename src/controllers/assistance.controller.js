/**
 * Assistance Controller
 */
const assistanceService = require('../services/assistance.service');
const { sendSuccess } = require('../utils/response.util');

async function requestAssistance(req, res, next) {
  try {
    const {
      jobId,
      customExamTitle,
      bookingDate,
      date,
      preferredSlotId,
      notes,
      isUrgent,
      urgencyReason,
    } = req.body;

    const result = await assistanceService.requestAssistance({
      userId: req.user.id,
      jobId,
      customExamTitle,
      bookingDate: bookingDate || date,
      preferredSlotId,
      notes,
      isUrgent,
      urgencyReason,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: result.message || 'Application assistance requested successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserRequests(req, res, next) {
  try {
    const { requests, meta } = await assistanceService.getUserAssistanceRequests(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assistance requests fetched successfully',
      data: { requests },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getRequestDetails(req, res, next) {
  try {
    const assistance = await assistanceService.getAssistanceRequestById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assistance details fetched successfully',
      data: { assistance },
    });
  } catch (error) {
    next(error);
  }
}

async function assignAgent(req, res, next) {
  try {
    const assistance = await assistanceService.assignAgent(req.params.id, req.body, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Agent assigned to assistance request successfully',
      data: { assistance },
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const assistance = await assistanceService.updateAssistanceStatus(req.params.id, req.body, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Assistance request status updated successfully',
      data: { assistance },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminAssistance(req, res, next) {
  try {
    const { requests, meta } = await assistanceService.listAdminAssistance(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin assistance requests fetched successfully',
      data: { requests },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestAssistance,
  getUserRequests,
  getRequestDetails,
  assignAgent,
  updateStatus,
  listAdminAssistance,
};
