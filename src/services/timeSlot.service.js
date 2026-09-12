/**
 * Time Slot Service
 * Manages appointment time slots and concurrency-safe capacity allocation.
 */
const { Op } = require('sequelize');
const { TimeSlot } = require('../models');
const { TIME_SLOT_STATUSES } = require('../constants/assistance.constant');
const { AppError } = require('../middleware/error.middleware');

/**
 * List available future time slots for users
 */
async function listAvailableSlots(date = null) {
  const today = new Date().toISOString().split('T')[0];
  const where = {
    status: TIME_SLOT_STATUSES.AVAILABLE,
    availableCapacity: { [Op.gt]: 0 },
    date: date ? date : { [Op.gte]: today },
  };

  return TimeSlot.findAll({
    where,
    order: [
      ['date', 'ASC'],
      ['startTime', 'ASC'],
    ],
  });
}

/**
 * Admin: List all slots with pagination
 */
async function listAdminSlots(query = {}) {
  const where = {};
  if (query.date) {
    where.date = query.date;
  }
  if (query.status) {
    where.status = query.status;
  }

  return TimeSlot.findAll({
    where,
    order: [
      ['date', 'ASC'],
      ['startTime', 'ASC'],
    ],
  });
}

/**
 * Admin: Create a new time slot
 */
async function createSlot(data) {
  const maxCapacity = data.maxCapacity || 1;
  return TimeSlot.create({
    ...data,
    maxCapacity,
    availableCapacity: maxCapacity,
    status: TIME_SLOT_STATUSES.AVAILABLE,
  });
}

/**
 * Admin: Update slot
 */
async function updateSlot(id, data) {
  const slot = await TimeSlot.findByPk(id);
  if (!slot) {
    throw new AppError('Time slot not found', 404);
  }

  await slot.update(data);
  return slot;
}

/**
 * Admin: Delete slot
 */
async function deleteSlot(id) {
  const slot = await TimeSlot.findByPk(id);
  if (!slot) {
    throw new AppError('Time slot not found', 404);
  }

  await slot.destroy();
  return { deleted: true };
}

/**
 * Concurrency-safe slot reservation
 */
async function reserveSlot(slotId, transaction) {
  const slot = await TimeSlot.findByPk(slotId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!slot) {
    throw new AppError('Selected time slot does not exist', 404);
  }

  if (slot.availableCapacity <= 0 || slot.status !== TIME_SLOT_STATUSES.AVAILABLE) {
    throw new AppError('Selected time slot is already fully booked', 400);
  }

  slot.availableCapacity -= 1;
  if (slot.availableCapacity === 0) {
    slot.status = TIME_SLOT_STATUSES.BOOKED;
  }

  await slot.save({ transaction });
  return slot;
}

/**
 * Release reserved slot upon cancellation
 */
async function releaseSlot(slotId, transaction) {
  const slot = await TimeSlot.findByPk(slotId, { transaction });
  if (slot) {
    slot.availableCapacity += 1;
    if (slot.status === TIME_SLOT_STATUSES.BOOKED && slot.availableCapacity > 0) {
      slot.status = TIME_SLOT_STATUSES.AVAILABLE;
    }
    await slot.save({ transaction });
  }
}

module.exports = {
  listAvailableSlots,
  listAdminSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  reserveSlot,
  releaseSlot,
};
