/**
 * EmailJS Delivery Service
 * Sends transactional emails (like registration OTPs) via EmailJS REST API.
 */
const https = require('https');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

/**
 * Send an OTP verification email
 * @param {object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.toName - Candidate name
 * @param {string} params.otp - 6-digit OTP code
 */
async function sendOtpEmail({ toEmail, toName = '', otp }) {
  const { serviceId, templateId, publicKey, privateKey } = envConfig.emailjs;
  const candidateName = (toName || '').trim();

  // If EmailJS credentials are not configured yet or during dev/tests, log cleanly and simulate
  if (!serviceId || !templateId || !publicKey) {
    logger.info(`[EmailJS Dev] OTP for ${toEmail}${candidateName ? ` (${candidateName})` : ''}: ${otp}`);
    return {
      success: true,
      simulated: true,
      otp,
      message: 'OTP processed in simulation mode',
    };
  }

  const payloadData = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      to_name: candidateName,
      toName: candidateName,
      name: candidateName,
      candidate_name: candidateName,
      otp: otp,
      passcode: otp,
      code: otp,
      reply_to: 'support@maxevog.in',
      app_name: 'maxEvoG Government Recruitment Portal',
    },
  };

  if (privateKey) {
    payloadData.accessToken = privateKey;
  }

  const postData = JSON.stringify(payloadData);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.emailjs.com',
      port: 443,
      path: '/api/v1.0/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logger.info(`[EmailJS] OTP email dispatched successfully to ${toEmail}`);
          resolve({ success: true, statusCode: res.statusCode, body: responseBody });
        } else {
          logger.error(`[EmailJS] API error ${res.statusCode}: ${responseBody}`);
          // Fallback gracefully in non-production
          if (!envConfig.app.isProduction) {
            logger.info(`[EmailJS Fallback] OTP for ${toEmail}: ${otp}`);
            resolve({ success: true, simulated: true, otp });
          } else {
            reject(new Error(`EmailJS API error: ${responseBody || res.statusCode}`));
          }
        }
      });
    });

    req.on('error', (err) => {
      logger.error(`[EmailJS] Network error: ${err.message}`);
      if (!envConfig.app.isProduction) {
        logger.info(`[EmailJS Fallback] OTP for ${toEmail}: ${otp}`);
        resolve({ success: true, simulated: true, otp });
      } else {
        reject(err);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      logger.error('[EmailJS] Request timed out');
      if (!envConfig.app.isProduction) {
        resolve({ success: true, simulated: true, otp });
      } else {
        reject(new Error('EmailJS dispatch timed out'));
      }
    });

    req.write(postData);
    req.end();
  });
}

module.exports = {
  sendOtpEmail,
};
