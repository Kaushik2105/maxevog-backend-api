/**
 * Daily Assistance Limit Service
 * Manages daily capacity governance for 1-on-1 application assistance.
 * Replaces fixed time slots with flexible daily workload control.
 */
const { Op } = require('sequelize');
const { DailyAssistanceLimit, AssistanceRequest } = require('../models');
const { AppError } = require('../middleware/error.middleware');

const GLOBAL_DEFAULT_DAILY_LIMIT = 10;

/**
 * Get daily assistance availability and remaining capacity for a range of dates
 * @param {string} startDate - YYYY-MM-DD (defaults to today)
 * @param {number} days - Number of days to inspect (default 14)
 */
async function getDailyAvailability(startDate, days = 14) {
  const start = startDate ? new Date(startDate) : new Date();
  const dateStrings = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dateStrings.push(d.toISOString().split('T')[0]);
  }

  // Fetch all custom limit rows configured for these dates
  const limitRows = await DailyAssistanceLimit.findAll({
    where: {
      date: {
        [Op.in]: dateStrings,
      },
    },
  });

  const limitsByDate = {};
  limitRows.forEach((row) => {
    limitsByDate[row.date] = row;
  });

  // Calculate live non-urgent bookings for each date
  const bookingsCounts = await AssistanceRequest.findAll({
    attributes: [
      'bookingDate',
      [AssistanceRequest.sequelize.fn('COUNT', AssistanceRequest.sequelize.col('id')), 'count'],
    ],
    where: {
      bookingDate: {
        [Op.in]: dateStrings,
      },
      status: {
        [Op.notIn]: ['CANCELLED', 'REJECTED'],
      },
      isUrgent: false,
    },
    group: ['bookingDate'],
    raw: true,
  });

  const countsByDate = {};
  bookingsCounts.forEach((b) => {
    countsByDate[b.bookingDate] = parseInt(b.count, 10) || 0;
  });

  const result = dateStrings.map((dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const customConfig = limitsByDate[dateStr];
    const dailyLimit = customConfig ? customConfig.dailyLimit : GLOBAL_DEFAULT_DAILY_LIMIT;
    const isClosed = customConfig ? customConfig.isClosed : false;
    const bookedCount = countsByDate[dateStr] || (customConfig ? customConfig.bookedCount : 0);
    const remaining = isClosed ? 0 : Math.max(0, dailyLimit - bookedCount);
    const isFull = isClosed || remaining <= 0;

    return {
      date: dateStr,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      dailyLimit,
      bookedCount,
      remaining,
      isFull,
      isClosed,
    };
  });

  return result;
}

/**
 * Verify and reserve capacity on a specific date for a normal booking
 */
async function checkAndReserveDailyCapacity(bookingDate, transaction) {
  if (!bookingDate) {
    throw new AppError('A valid booking date is required for assisted applications', 400);
  }

  // 1. Get or initialize date limit
  let [limitRow] = await DailyAssistanceLimit.findOrCreate({
    where: { date: bookingDate },
    defaults: {
      date: bookingDate,
      dailyLimit: GLOBAL_DEFAULT_DAILY_LIMIT,
      bookedCount: 0,
      isClosed: false,
    },
    transaction,
  });

  if (limitRow.isClosed) {
    const err = new AppError('Assistance bookings are closed for this date. Please choose another date or submit an Urgent Request.', 400);
    err.capacityFull = true;
    throw err;
  }

  // 2. Count actual active non-urgent bookings
  const currentCount = await AssistanceRequest.count({
    where: {
      bookingDate,
      status: {
        [Op.notIn]: ['CANCELLED', 'REJECTED'],
      },
      isUrgent: false,
    },
    transaction,
  });

  if (currentCount >= limitRow.dailyLimit) {
    const err = new AppError(
      `Daily capacity limit of ${limitRow.dailyLimit} applications has been reached for ${bookingDate}. Please choose another date or submit an Urgent / Priority Assistance Request.`,
      400
    );
    err.capacityFull = true;
    err.dailyLimit = limitRow.dailyLimit;
    err.currentBooked = currentCount;
    throw err;
  }

  // Update cached bookedCount
  limitRow.bookedCount = currentCount + 1;
  await limitRow.save({ transaction });

  return limitRow;
}

/**
 * Admin: Update capacity limit or close a specific date
 */
async function updateDailyLimit({ date, dailyLimit, isClosed }) {
  if (!date) {
    throw new AppError('Target date is required', 400);
  }

  const [limitRow] = await DailyAssistanceLimit.findOrCreate({
    where: { date },
    defaults: {
      date,
      dailyLimit: dailyLimit !== undefined ? parseInt(dailyLimit, 10) : GLOBAL_DEFAULT_DAILY_LIMIT,
      isClosed: Boolean(isClosed),
    },
  });

  if (dailyLimit !== undefined) {
    limitRow.dailyLimit = Math.max(1, parseInt(dailyLimit, 10));
  }
  if (isClosed !== undefined) {
    limitRow.isClosed = Boolean(isClosed);
  }

  await limitRow.save();
  return limitRow;
}

module.exports = {
  GLOBAL_DEFAULT_DAILY_LIMIT,
  getDailyAvailability,
  checkAndReserveDailyCapacity,
  updateDailyLimit,
};
