/**
 * Logger Utility
 * Safe, centralized logging with automatic redaction of sensitive data.
 * Zero leaks for passwords, OTPs, PINs, tokens, and bank credentials.
 */

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'otp',
  'pin',
  'upipin',
  'atmpin',
  'cvv',
  'token',
  'authorization',
  'secret',
  'apikey',
  'credentials',
];

/**
 * Recursively sanitize objects to remove sensitive values from logs
 * @param {any} data 
 * @returns {any}
 */
function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

const logger = {
  info: (message, meta) => {
    if (meta) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  },
  warn: (message, meta) => {
    if (meta) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    }
  },
  error: (message, meta) => {
    if (meta) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    }
  },
};

module.exports = logger;
