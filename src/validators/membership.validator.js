/**
 * Membership Validator
 */
const { body } = require('express-validator');

const purchaseMembershipValidator = [
  body('planId')
    .optional()
    .isIn(['QUARTERLY_99', 'YEARLY_349'])
    .withMessage('Valid planId required (QUARTERLY_99, YEARLY_349)'),
];

module.exports = {
  purchaseMembershipValidator,
};
