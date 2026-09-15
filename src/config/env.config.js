/**
 * Environment Configuration
 * Centralized loader and validator for all environment variables.
 * All application modules must consume configuration via this file.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envConfig = Object.freeze({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    baseUrl: process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 5000}`,
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  db: {
    url: process.env.DATABASE_URL || null,
    sqliteFallback: process.env.DB_SQLITE_FALLBACK === 'true' || process.env.NODE_ENV === 'test',
    logging: process.env.NODE_ENV === 'development' && process.env.DB_LOGGING === 'true' ? console.log : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secure_gov_recruitment_jwt_secret_key_v1_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  admin: {
    email: (process.env.ADMIN_EMAIL || 'karmakark1267@gmail.com').trim().toLowerCase(),
    initialPassword: (process.env.ADMIN_INITIAL_PASSWORD || 'Maxevog@2026').trim(),
  },
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID || '',
    templateId: process.env.EMAILJS_TEMPLATE_ID || '',
    publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
    privateKey: process.env.EMAILJS_PRIVATE_KEY || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    isConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  },
  notifications: {
    emailProvider: process.env.EMAIL_PROVIDER || 'mock',
    emailApiKey: process.env.EMAIL_API_KEY || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  business: {
    defaultAssistanceFee: parseFloat(process.env.DEFAULT_ASSISTANCE_FEE) || 69,
    defaultMembershipFee: parseFloat(process.env.DEFAULT_MEMBERSHIP_FEE) || 209,
  },
});

module.exports = envConfig;
