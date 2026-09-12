/**
 * Role Constants
 */
const ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ALL_ROLES,
};
