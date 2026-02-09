# NextGoal - Job Aggregation Platform

A production-grade job discovery platform that aggregates real-time job listings from official company career pages.

![NextGoal](https://img.shields.io/badge/NextGoal-Job%20Aggregation-blue)
![NestJS](https://img.shields.io/badge/Backend-NestJS-red)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black)

## Features

- 🔐 **Authentication** - Email/password + Google OAuth
- 🔍 **Job Search** - Full-text search with real-time filtering
- 📋 **Smart Filters** - Experience level, degree, job type, location, company
- 💾 **Save Jobs** - Bookmark jobs for later review
- ⚙️ **Preferences** - Set your job preferences
- 🤖 **Auto-Scrape** - Aggregates jobs from multiple ATS platforms
- 📱 **Responsive** - Works on desktop and mobile

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT + Passport (Google OAuth)
- **Scraping**: Axios + Cheerio (Playwright for dynamic sites)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **State**: React Query + Context API
- **HTTP Client**: Axios

## Project Structure

```
NextGoal/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/              # JWT + Google OAuth
│   │   ├── users/             # User management
│   │   ├── jobs/              # Job CRUD & search
│   │   ├── scrapers/          # ATS scrapers
│   │   └── prisma/            # Database service
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       └── seed.ts            # Seed data
│
├── frontend/                   # Next.js 14 App
│   ├── app/                   # Pages (App Router)
│   ├── components/            # React components
│   └── lib/                   # Utilities & API client
│
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, for job queues)

### 1. Clone & Install

```bash
cd c:\Users\HP\NextGoal

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/nextgoal
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed sample data
npm run prisma:seed
```

### 4. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

```
Email: demo@example.com
Password: password123
```

## API Documentation

Swagger documentation is available at [http://localhost:3001/api/docs](http://localhost:3001/api/docs) when the backend is running.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login with email/password |
| `/auth/google` | GET | Initiate Google OAuth |
| `/jobs` | GET | List jobs with filters |
| `/jobs/:id` | GET | Get job details |
| `/jobs/stats` | GET | Get job statistics |
| `/users/me` | GET | Get current user profile |
| `/users/me/saved-jobs` | GET | Get saved jobs |
| `/scrapers/run` | POST | Trigger job scraping |

## Scraping Pipeline

The platform scrapes jobs from these ATS platforms:

| Platform | Method | API Type |
|----------|--------|----------|
| Greenhouse | REST API | Public |
| Lever | JSON Endpoint | Public |
| Ashby | GraphQL | Public |
| SmartRecruiters | REST API | Public |
| Workday | Browser Automation | Dynamic |

### Running Scrapers

```bash
# Manual scrape (via API)
curl -X POST http://localhost:3001/scrapers/run

# Scrape specific company
curl -X POST "http://localhost:3001/scrapers/company?source=greenhouse&companyId=stripe"
```

## Database Schema

```
Users
├── id (UUID)
├── email (unique)
├── password_hash
├── name
├── google_id
├── preferences (JSON)
└── created_at

Jobs
├── id (UUID)
├── title
├── company
├── location
├── job_type (internship, full-time)
├── experience_level (fresher, 1-3, 3-5, 5+)
├── degree_required (btech, ballb, llb, any)
├── description
├── apply_url
├── source
├── source_id
├── posted_date
├── last_verified
├── is_active
└── content_hash (unique, for deduplication)

SavedJobs (junction table)
├── user_id
├── job_id
└── saved_at
```

## Configuration Options

### Job Filters

| Filter | Values |
|--------|--------|
| Experience Level | fresher, 1-3, 3-5, 5+ |
| Degree | btech, ballb, llb, any |
| Job Type | internship, full-time |

### Job Expiration

Jobs are automatically marked as inactive if not verified within 7 days. This is handled by the `expireStaleJobs()` method.

## Building for Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm run start
```

## Docker Support (Optional)

Create a `docker-compose.yml` in the root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: nextgoal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run with: `docker-compose up -d`

## License

MIT

## Disclaimer

NextGoal is a job aggregator, not an employer. We collect publicly available job data from company career pages. Always verify opportunities directly with hiring companies.
