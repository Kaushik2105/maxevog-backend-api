/**
 * JWT Utility
 * Token generation and verification.
 */
const jwt = require('jsonwebtoken');
const envConfig = require('../config/env.config');

/**
 * Generate a JWT token
 * @param {object} payload - Claims to include in token (id, email, role)
 * @returns {string}
 */
function generateToken(payload) {
  return jwt.sign(payload, envConfig.jwt.secret, {
    expiresIn: envConfig.jwt.expiresIn,
  });
}

/**
 * Verify a JWT token
 * @param {string} token 
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  return jwt.verify(token, envConfig.jwt.secret);
}

module.exports = {
  generateToken,
  verifyToken,
};
