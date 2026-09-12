/**
 * Date Utility
 * Safe date calculations, age estimation, and period adjustments.
 */

/**
 * Calculate age in completed years from Date of Birth
 * @param {string|Date} dob 
 * @returns {number|null}
 */
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Check if a given date is in the past
 * @param {string|Date} date 
 * @returns {boolean}
 */
function isDateExpired(date) {
  if (!date) return false;
  const d = new Date(date);
  return d.getTime() < Date.now();
}

/**
 * Add days to a date
 * @param {Date|string} date 
 * @param {number} days 
 * @returns {Date}
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add months to a date
 * @param {Date|string} date 
 * @param {number} months 
 * @returns {Date}
 */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

module.exports = {
  calculateAge,
  isDateExpired,
  addDays,
  addMonths,
};
