const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authentication
 * @param {string} id - User ID to encode in the token
 * @param {string} role - User role for authorization
 * @returns {string} JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    { expiresIn: '30d' }
  );
};

module.exports = generateToken; 