/**
 * Express Application Setup
 * Configures middleware, security policies, documentation endpoints, and router mounting.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const envConfig = require('./config/env.config');
const swaggerSpec = require('./config/swagger.config');
const apiV1Router = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { notFoundHandler, errorHandler, AppError } = require('./middleware/error.middleware');

const app = express();

// Trust reverse proxy (Render, Heroku, Cloudflare, Vercel) for express-rate-limit
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// Allowed origins list
const configuredOrigins = [
  envConfig.app.frontendUrl,
  'https://maxevog.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  ...(envConfig.app.allowedOrigins || []),
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/+$/, ''));

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');

      // In development or if origin matches allowed domains or vercel deployments
      const isAllowed =
        !envConfig.app.isProduction ||
        configuredOrigins.includes(cleanOrigin) ||
        cleanOrigin.includes('localhost') ||
        cleanOrigin.includes('127.0.0.1') ||
        /^https:\/\/maxevog.*\.vercel\.app$/.test(cleanOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new AppError(`Origin '${origin}' blocked by CORS policy`, 403), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: envConfig.app.env,
  });
});

// Swagger Documentation Endpoints
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Rate limiting on API routes
app.use('/api/', apiLimiter);

// Mount API v1
app.use('/api/v1', apiV1Router);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
