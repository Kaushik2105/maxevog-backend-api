/**
 * Membership Constants
 */
const MEMBERSHIP_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
});

const ALL_MEMBERSHIP_STATUSES = Object.freeze(Object.values(MEMBERSHIP_STATUSES));

const MEMBERSHIP_PLANS = Object.freeze({
  QUARTERLY: {
    id: 'QUARTERLY_249',
    name: 'Quarterly Plan',
    durationMonths: 3,
    price: 249,
  },
  YEARLY: {
    id: 'YEARLY_499',
    name: 'Yearly Plan',
    durationMonths: 12,
    price: 499,
  },
});

module.exports = {
  MEMBERSHIP_STATUSES,
  ALL_MEMBERSHIP_STATUSES,
  MEMBERSHIP_PLANS,
};
