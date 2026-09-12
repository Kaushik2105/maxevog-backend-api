/**
 * Swagger / OpenAPI Specification
 * Configures interactive Swagger documentation at /docs.
 */
const swaggerJsdoc = require('swagger-jsdoc');
const envConfig = require('./env.config');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Government Recruitment & Application Assistance Platform API (V1)',
    version: '1.0.0',
    description: `
V1 REST API for Indian government recruitment discovery, personalized candidate matching, application assistance sessions, and administrative oversight.

### Key Architectural Tenets:
- **Zero Sensitive Credential Storage**: OTPs, PINs, bank credentials, and passwords are NEVER accepted, stored, or logged.
- **Candidate Consent**: Final application submission strictly requires applicant authorization.
- **Secure Authentication**: Bearer JWT tokens for authorization.
    `,
  },
  servers: [
    {
      url: `http://localhost:${envConfig.app.port}`,
      description: 'Local Development Server',
    },
    {
      url: '/api/v1',
      description: 'API v1 Base Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token obtained from /api/v1/auth/login in the format: Bearer <token>',
      },
    },
    schemas: {
      StandardSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['USER', 'ADMIN', 'AGENT'] },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          avatarUrl: { type: 'string', format: 'uri' },
          dob: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
          mobileNumber: { type: 'string' },
          state: { type: 'string' },
          category: { type: 'string', enum: ['GENERAL', 'OBC', 'SC', 'ST', 'EWS'] },
          educationLevel: { type: 'string' },
          degree: { type: 'string' },
          profileCompletionPercentage: { type: 'integer', example: 85 },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          organization: { type: 'string' },
          department: { type: 'string' },
          applicationLastDate: { type: 'string', format: 'date' },
          vacancies: { type: 'integer' },
          applicationFee: { type: 'number', example: 100 },
          state: { type: 'string' },
          isPublished: { type: 'boolean' },
          isFeatured: { type: 'boolean' },
        },
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
          applicationNumber: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'INTERESTED',
              'ASSISTANCE_REQUESTED',
              'PAYMENT_PENDING',
              'PAYMENT_COMPLETED',
              'SCHEDULED',
              'IN_PROGRESS',
              'VERIFICATION_REQUIRED',
              'READY_FOR_REVIEW',
              'SUBMISSION_AUTHORIZED',
              'SUBMITTED',
              'ADMIT_CARD_AVAILABLE',
              'EXAM_COMPLETED',
              'RESULT_AVAILABLE',
              'COMPLETED',
              'CANCELLED',
            ],
          },
          submissionAuthorizedAt: { type: 'string', format: 'date-time' },
          submittedAt: { type: 'string', format: 'date-time' },
          receiptUrl: { type: 'string', format: 'uri' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
