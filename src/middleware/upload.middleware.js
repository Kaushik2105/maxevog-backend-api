/**
 * File Upload Middleware
 * Uses Multer with in-memory storage buffer for processing before Cloudinary upload.
 */
const multer = require('multer');
const { AppError } = require('./error.middleware');

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type. Only JPEG, PNG, WEBP and PDF are permitted.', 400), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter,
});

module.exports = {
  uploadSingle: (fieldName) => upload.single(fieldName),
  uploadArray: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
};
