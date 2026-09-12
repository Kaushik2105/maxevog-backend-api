/**
 * Time Slot Controller
 */
const timeSlotService = require('../services/timeSlot.service');
const { sendSuccess } = require('../utils/response.util');

async function listAvailableSlots(req, res, next) {
  try {
    const slots = await timeSlotService.listAvailableSlots(req.query.date);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Available time slots fetched successfully',
      data: { slots },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminSlots(req, res, next) {
  try {
    const slots = await timeSlotService.listAdminSlots(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin time slots fetched successfully',
      data: { slots },
    });
  } catch (error) {
    next(error);
  }
}

async function createSlot(req, res, next) {
  try {
    const slot = await timeSlotService.createSlot(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Time slot created successfully',
      data: { slot },
    });
  } catch (error) {
    next(error);
  }
}

async function updateSlot(req, res, next) {
  try {
    const slot = await timeSlotService.updateSlot(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Time slot updated successfully',
      data: { slot },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSlot(req, res, next) {
  try {
    await timeSlotService.deleteSlot(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Time slot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAvailableSlots,
  listAdminSlots,
  createSlot,
  updateSlot,
  deleteSlot,
};
