/**
 * Membership Validator
 */
const { body } = require('express-validator');

const purchaseMembershipValidator = [
  body('planId')
    .optional()
    .isIn(['QUARTERLY_99', 'YEARLY_349', 'QUARTERLY_249', 'YEARLY_499'])
    .withMessage('Valid planId required (QUARTERLY_249, YEARLY_499)'),
];

module.exports = {
  purchaseMembershipValidator,
};
