# Government Recruitment & Application Assistance Platform — V1 Backend

Production-ready, highly modular REST API backend built with **Node.js, Express.js, PostgreSQL, and Sequelize ORM**. Designed specifically for launching the Indian government recruitment and application assistance service with complete security, zero-credential storage, and administrative oversight.

---

## 🏗️ Architecture & Strict Layered Separation

The backend is strictly isolated in the `/backend` folder and follows clean architecture principles:

```text
backend/
├── src/
│   ├── app.js                          # Express app configuration & middleware pipeline
│   ├── server.js                       # Server startup & DB synchronization
│   ├── config/
│   │   ├── env.config.js               # Centralized environment variable parser
│   │   ├── database.config.js          # PostgreSQL / SQLite Sequelize connection & pool
│   │   ├── cloudinary.config.js        # Cloudinary SDK config for avatars and documents
│   │   └── swagger.config.js           # OpenAPI 3.0 specification for /docs
│   ├── constants/                      # Enums, statuses, and role definitions
│   ├── utils/                          # Helper functions (JWT, bcrypt, pagination, eligibility)
│   ├── middleware/                     # Auth, admin authorization, multer uploads, rate limiting
│   ├── validators/                     # express-validator schemas for all incoming payloads
│   ├── models/                         # Sequelize models with associations & indexes
│   ├── services/                       # Pure business logic and domain workflows
│   ├── controllers/                    # Request/response handling & orchestration
│   ├── routes/                         # REST API endpoints & route mounting
│   └── seeders/                        # Master admin and demo data seeders
└── tests/                              # Comprehensive Jest + Supertest test suite
```

---

## 🔒 Security & Core Tenets

1. **Zero Credential Storage (Non-Negotiable)**:
   - The platform **NEVER** captures, accepts, logs, or stores OTPs, bank OTPs, UPI PINs, ATM PINs, card numbers, CVVs, or third-party passwords.
   - All session workflows treat applicant authentication as an applicant-controlled step (`VERIFICATION_REQUIRED`).
2. **Explicit Candidate Authorization**:
   - Applications cannot transition to `SUBMITTED` until the student explicitly issues final authorization via `PATCH /api/v1/applications/:id/authorize-submission`.
3. **Cloudinary Asset Storage**:
   - Student avatars, resumes, government notifications, and final application submission receipts are securely uploaded to Cloudinary, and only verified secure URLs are stored in the database.
4. **Clean Configuration Boundary**:
   - All credentials and environment variables are strictly loaded in `config/env.config.js`. Modules never read `process.env` directly.
5. **Robust Database Support**:
   - Native PostgreSQL with connection pooling for production.
   - Built-in zero-friction SQLite fallback for automated tests (`npm test`) and instant offline local evaluation.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= v18.x (tested on v22.x)
- **PostgreSQL** >= 14 (or use built-in SQLite fallback)

### 2. Installation
Navigate into the `backend/` directory and install dependencies:
```bash
cd backend
npm install
```

### 3. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env
```
Edit `.env` to configure your PostgreSQL credentials and Cloudinary API keys:
```env
PORT=5000
NODE_ENV=development

DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gov_recruitment_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_SQLITE_FALLBACK=true

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Database Seeding
Seed the initial master admin account:
```bash
npm run seed:admin
```
*(The secure randomly generated password will be displayed once in your console output)*

Seed realistic demo recruitment data (jobs, time slots, agents, mock applicants):
```bash
npm run seed:demo
```

### 5. Running the Application
Development server (with hot-reload):
```bash
npm run dev
```

Production server:
```bash
npm start
```

---

## 📚 API Documentation (Swagger)

Interactive Swagger UI is available at:
👉 **`http://localhost:5000/docs`**

Raw OpenAPI 3.0 specification JSON:
👉 **`http://localhost:5000/docs.json`**

Health check:
👉 **`http://localhost:5000/health`**

---

## 🧪 Automated Testing

The backend includes automated test suites covering authentication, role permissions, job filtering, eligibility matching, assistance scheduling, membership, admin metrics, and zero-credential leak prevention:

```bash
npm test
```

---

## 📡 API Endpoints Overview

### Authentication (`/api/v1/auth`)
- `POST /register`: Register a new applicant
- `POST /login`: Authenticate and obtain JWT
- `GET  /me`: Get current authenticated user profile
- `POST /logout`: Invalidate session
- `POST /change-password`: Update account password

### User & Profile (`/api/v1/users`)
- `GET /profile`: Get candidate profile
- `PUT /profile`: Update profile fields, upload avatar/resume to Cloudinary
- `GET /preferences`: Get notification preferences
- `PUT /preferences`: Update notification channels & alerts

### Recruitment Jobs (`/api/v1/jobs` & `/api/v1/admin/jobs`)
- `GET    /`: Browse published jobs with search, category, and state filters
- `GET    /eligible/me`: Personalized eligible jobs matching candidate profile
- `GET    /:id`: Recruitment details with associated results & admit cards
- `POST   /`: Admin create new recruitment
- `PUT    /:id`: Admin update recruitment
- `PATCH  /:id/publish`: Admin toggle publish status
- `PATCH  /:id/archive`: Admin archive job
- `DELETE /:id`: Admin delete job

### Results & Admit Cards (`/api/v1/results` & `/api/v1/admit-cards`)
- `GET    /`: Public list of published examination results / admit cards
- `GET    /:id`: Detailed result cutoff / admit card instructions
- `POST   /`: Admin publish results or admit cards

### Assistance Requests & Time Slots (`/api/v1/assistance` & `/api/v1/time-slots`)
- `GET    /time-slots`: Available time slots for booking
- `POST   /assistance`: Request assistance with selected slot (Calculates ₹50 fee + official fee)
- `GET    /assistance`: User's assistance history
- `PATCH  /assistance/:id/assign-agent`: Admin assigns agent and Google Meet URL
- `PATCH  /assistance/:id/status`: Agent/Admin updates session progress

### Application Tracking (`/api/v1/applications`)
- `POST  /`: Track a government recruitment
- `GET   /`: List candidate's tracked applications
- `GET   /:id`: Application tracking details
- `PATCH /:id/authorize-submission`: **Student explicitly authorizes final submission**
- `POST  /:id/complete-submission`: Agent submits with official application number and uploads receipt document
- `PATCH /:id/status`: Controlled status lifecycle updates

### Membership Subscriptions (`/api/v1/membership`)
- `GET  /`: Current membership status
- `POST /purchase`: Purchase quarterly membership (₹99 / 3 months)
- `GET  /history`: User transaction history
- `GET  /admin/paid-members`: Admin list of active paid subscribers
- `GET  /admin/stats`: Membership subscription statistics

### Feedback & Complaints (`/api/v1/feedback`)
- `POST /`: Submit feedback, bug report, or assistance complaint
- `GET  /my`: User's feedback history
- `GET  /admin/list`: Admin review feedback
- `PATCH /admin/:id`: Admin respond and close feedback

### Admin Dashboard & Analytics (`/api/v1/admin`)
- `GET /dashboard/overview`: Real-time KPI metrics (users, applications, assistance, revenue, complaints)
- `GET /dashboard/user-growth?period=30d`: Daily user acquisition graph data for frontend charts
- `GET /dashboard/application-stats`: Distribution of applications across lifecycle states
- `GET /users`: List and search registered users
- `PATCH /users/:id/status`: Suspend or activate user accounts
