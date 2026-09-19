/**
 * Telegram Bot API Delivery Service
 * Communicates with the official Telegram Bot API to dispatch instant recruitment alerts and deadline reminders.
 * Supports Markdown formatting and direct links to maxEvoG recruitments.
 */
const https = require('https');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger.util');

/**
 * Send a message via Telegram Bot API
 * @param {object} params
 * @param {string} params.chatId - Candidate's Telegram chat ID
 * @param {string} params.text - Message content (HTML or Markdown)
 * @param {string} [params.parseMode='HTML'] - Formatting mode ('HTML' or 'MarkdownV2')
 * @param {Array} [params.inlineKeyboard] - Optional inline keyboard buttons
 * @returns {Promise<{ success: boolean, simulated?: boolean, messageId?: number }>}
 */
async function sendTelegramMessage({ chatId, text, parseMode = 'HTML', inlineKeyboard = null }) {
  const token = envConfig.notifications.telegramBotToken;

  if (!chatId) {
    logger.warn('[Telegram] Skipping dispatch: chatId is missing');
    return { success: false, error: 'Chat ID required' };
  }

  // Simulation mode if token is not set
  if (!token) {
    logger.info(`[Telegram Dev Simulation] To Chat: ${chatId}\nMessage:\n${text}`);
    return {
      success: true,
      simulated: true,
      messageId: Math.floor(Math.random() * 100000),
    };
  }

  const postData = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: false,
    reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            logger.info(`[Telegram] Message sent to chat ${chatId}`);
            resolve({ success: true, messageId: parsed.result?.message_id });
          } else {
            logger.error(`[Telegram API Error] ${parsed.description || body}`);
            resolve({ success: false, error: parsed.description || body });
          }
        } catch (e) {
          logger.error(`[Telegram Parse Error] ${e.message}`);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (err) => {
      logger.error(`[Telegram Network Error] ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      logger.error('[Telegram Timeout] Dispatch timed out');
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Generates a direct connection link for candidates
 * @param {string} verificationCode
 * @returns {string|null}
 */
function getTelegramBotLink(verificationCode) {
  const username = envConfig.notifications.telegramBotUsername;
  if (!username) return null;
  return `https://t.me/${username}?start=link_${verificationCode}`;
}

module.exports = {
  sendTelegramMessage,
  getTelegramBotLink,
};
