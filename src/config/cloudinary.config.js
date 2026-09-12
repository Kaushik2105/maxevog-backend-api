/**
 * Cloudinary Configuration
 * Configures Cloudinary SDK for storing user avatars and uploaded documents.
 */
const { v2: cloudinary } = require('cloudinary');
const envConfig = require('./env.config');

if (envConfig.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: envConfig.cloudinary.cloudName,
    api_key: envConfig.cloudinary.apiKey,
    api_secret: envConfig.cloudinary.apiSecret,
    secure: true,
  });
}

module.exports = cloudinary;
