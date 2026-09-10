# NextGoal

NextGoal brings jobs from configured company career boards into one searchable view, with daily refreshes and source-provided application destinations.

## What is included

- Search job titles, companies, and descriptions; filter by experience, degree, job type, location, company, ATS source, posting age, and remote location text.
- Responsive dark discovery interface with locally hosted Sora/Manrope fonts, URL-restorable search state, source labels, application destination hosts, loading/error/empty states, and saved jobs.
- Email/password accounts, optional Google sign-in through Supabase, and stored job preferences.
- Daily ingestion, application-link checks, duplicate handling, and confirmed-closed listing retirement.
- English-only public job content, private source originals, and a configurable translation/retry pipeline.

This is a configured-source aggregator. It does not search every job platform. A checked source or link does not guarantee an employer's identity or that a vacancy remains open when someone applies.

## Deploy on Vercel with a free backend

The prepared setup uses **Vercel for the frontend, Render Free for the API, Neon Free PostgreSQL, Upstash Free Redis, and GitHub Actions for daily maintenance**. Render runs with `APP_MODE=api`; its idle sleep does not stop the separate daily worker. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for exact settings, secrets, database migration/backfill, first import and free-tier limits. The repository changes do not create provider accounts or deploy a live service.

## Source coverage

| ATS | Configured board identifiers | Adapter |
| --- | --- | --- |
| Greenhouse | stripe, airbnb, coinbase, databricks, discord, vercel | Implemented |
| Lever | palantir | Implemented |
| Ashby | ramp, notion | Implemented |
| SmartRecruiters | Ubisoft2 | Implemented |
| Workday | None | Placeholder; not integrated |

There are **four implemented ATS adapters and ten configured boards**. The list is in `backend/src/scrapers/configured-boards.ts`; a board may move to a different ATS or become unavailable. Individual public-source checks during this revision identified outdated board identifiers and informed this list. `backend/scripts/probe-sources.ts` rechecks the configured adapters without writing to the database; it saves a small local inspection snapshot. This is separate from a full ingestion run against PostgreSQL/Redis. LinkedIn, Indeed, and Naukri are not integrated.

The read-only source check on **10 September 2026 at 09:55 UTC** succeeded for all ten boards, which reported **2,879 feed postings before application-level deduplication**. Its local snapshot contains twelve actual samples, up to three per ATS. Application pages were not independently verified by this probe, and no applications were submitted. These counts describe that inspection, not a deployed catalog or a live dashboard statistic.

The adapters use company-specific public posting endpoints, including the [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) and [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api). Application URLs come from the source response; the application remains on the employer or ATS website.

## Daily refresh and application links

For the free deployment, `.github/workflows/daily-jobs.yml` runs maintenance at **20:47 UTC daily / 02:17 Asia/Kolkata the following day**. It connects directly to PostgreSQL and Redis, without depending on the HTTP API staying awake. GitHub schedules require the workflow on the default branch, may be delayed, and can be disabled after 60 days of repository inactivity. [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

The combined local/always-on mode retains a full source refresh at **02:00 Asia/Kolkata every day** and link verification at **03:00 Asia/Kolkata**. Startup and hourly recovery checks at minute 30 run a catch-up when no refresh has completed or its completion is at least 24 hours old. Redis stores the completion timestamp and coordinates a renewable lock to keep full refreshes from running concurrently. Source failures are reported per board; check those outcomes rather than assuming a completed run means every source succeeded. A completed attempt, including a partial failure, advances the recovery timestamp; individual failing boards currently wait for the next full run.

The verifier validates the URL and destination, then checks the response. Timeouts, rate limits, and temporary server failures are inconclusive; repeated definitive missing/closed responses can deactivate a job. A listing's check timestamp describes a check attempt. It is not an employer verification badge or a guaranteed successful application. Removing a listing solely because a provider is temporarily unreachable would discard valid opportunities, so source health and freshness need monitoring.

Use one scheduling approach for a deployment. `APP_MODE=api` disables the in-process maintenance work and Redis connection; it is the Render configuration. `APP_MODE=combined` is the default when the variable is omitted and needs a continuously running NestJS process for its own schedule. [NestJS task scheduling](https://docs.nestjs.com/techniques/task-scheduling).

## English publication and translation

Public job titles, descriptions and locations must pass the English publication checks. Company proper names and application URLs remain unchanged; the external application page may use another language. Original source text is retained in private database fields and excluded from public APIs. Public lists, details, saved jobs, counts and filter values include only active, English-ready records. Translated records can display an “English translation” label and translation timestamp.

`TRANSLATION_PROVIDER=none` is the default. It publishes confidently English content without a translation service. Foreign or uncertain content stays privately queued, with its originals preserved; it is neither deleted nor shown raw as a fallback. Configure one of these providers to process the queued content:

| Backend setting | Configuration |
| --- | --- |
| `TRANSLATION_PROVIDER=libretranslate` | Set `LIBRETRANSLATE_URL` to the service base URL, without `/translate`; set `LIBRETRANSLATE_API_KEY` if the service requires it. |
| `TRANSLATION_PROVIDER=google` | Set `GOOGLE_TRANSLATE_API_KEY` for the configured Google Cloud Translation Basic v2 service/account. |

Enabling a provider permits translation calls during ingestion and backfill. Successful English output is cached by source-content fingerprint. Incomplete or unconfirmed output remains private for retry. Combined mode retries up to 1,000 due active queued records at startup and **04:00 Asia/Kolkata daily**. The separate Actions worker includes due translation retries in its `all` run. Failed attempts use persisted retry delays from one hour to 24 hours. A missing provider leaves records queued with a 24-hour retry delay. These delays do not imply an hourly translation worker. Configure provider credentials on the worker for the free deployment; the hosting tiers do not include unlimited free translation.

Existing databases require migration **`20260910000000_english_job_publication`** and a backfill. The migration preserves the old source text and marks existing jobs pending, so they stay out of public results until processed. After setting the provider and applying migrations, run from `backend`:

```bash
npm run jobs:translate -- --all --force
```

`--all` processes all active queued records; `--force` bypasses their retry delay. For a bounded run, use `--limit=1000` instead of `--all`. Inspect the returned ready/pending/failed counts. With provider `none`, the same backfill makes confidently English records ready and retains the remainder privately. The backfill needs PostgreSQL but has no Redis dependency or HTTP listener.

No live translation provider or database was configured during this revision. Full multilingual-source coverage depends on configuring a provider and completing this migration/backfill; the pipeline alone does not establish translation quality or complete coverage.

## Local setup

The project uses Next.js 14.2.35/React 18 for the frontend, NestJS for the API, PostgreSQL with Prisma 5, and Redis with Bull for maintenance. Combined local mode needs Redis; `APP_MODE=api` serves HTTP without it. The Compose file starts the local database and Redis; it does not deploy the application.

Use Node.js 22 or newer with the resolved dependencies, PostgreSQL 15+, and Redis 7+. Confirm `node --version` in the same terminal used for npm commands; this revision's local checks used the bundled Node.js 24 runtime. Start from the repository root:

```bash
git clone https://github.com/ItsDee19/NextGoal-Web.git
cd NextGoal-Web
docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`. For PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Configure the database URLs and a strong random JWT secret. `DIRECT_URL` is the direct PostgreSQL connection used by the Prisma schema; it can equal `DATABASE_URL` for local PostgreSQL. Keep secrets out of source control. The database password and open ports in Compose are local development defaults.

Install and initialize the backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run jobs:translate -- --all --force
npm run start:dev
```

The committed migrations initialize or update the schema. The English backfill is a no-op on an empty database; on an existing database it processes retained jobs under the configured publication policy. Use `npx prisma migrate dev --name descriptive_name` only when authoring a new migration against a development database.

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API defaults to [http://localhost:3001](http://localhost:3001), with [Swagger documentation](http://localhost:3001/api/docs). An empty database shows an empty search state until real jobs are ingested.

### Optional Google sign-in

Create/configure a Supabase project with Google enabled. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the backend, and the matching `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the frontend. Use a public anonymous/publishable key in frontend configuration, never a service-role key. Register the frontend callback `/auth/callback` in the allowed redirect URLs. Restart the applications after changing environment files.

Without these settings, email/password authentication remains available. The OAuth token is exchanged through `POST /auth/supabase`; the project does not implement `/auth/google` or use NextAuth.

### Optional development demo account

The seed is disabled by default and refuses to run with `NODE_ENV=production`. To create the development-only `demo@example.com` / `password123` account in PowerShell:

```powershell
cd backend
$env:ALLOW_DEMO_SEED = 'true'
npm run prisma:seed
Remove-Item Env:ALLOW_DEMO_SEED
```

It creates **no job listings**. It also retires the eight known fabricated fixture jobs from the old seed. Do not use the demo account on a public deployment; existing production databases seeded by the old version need those fixture jobs retired before launch.

## API overview

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/jobs` | GET | Public search with filters and pagination |
| `/jobs/:id` | GET | Job detail data |
| `/jobs/stats` | GET | Active English-ready counts, source breakdown, recent additions and latest stored check time |
| `/jobs/filters` | GET | Available filter values |
| `/auth/register` | POST | Email/password registration |
| `/auth/login` | POST | Email/password sign-in |
| `/auth/supabase` | POST | Exchange a verified Supabase access token |
| `/users/me` | GET | Current user's profile; bearer token required |
| `/users/me/preferences` | PUT | Update stored preferences; bearer token required |
| `/users/me/saved-jobs` | GET | Current user's saved jobs |
| `/users/me/saved-jobs/:jobId` | POST / DELETE | Save or unsave a job |
| `/health` | GET | HTTP service health; does not establish catalog freshness |

Array filters accept repeated query parameters, for example `source=greenhouse&source=lever`. `postedWithin` accepts `24h`, `7d`, or `30d`; `remote=true` matches remote location labels. Jobs without a supplied posting date do not match a posting-age filter. Remote location text and inferred experience/degree labels are limited metadata, not complete professional-category classification.

`APP_MODE=api` disables HTTP maintenance: `/scrapers/*` is absent and `POST /jobs/verify-all` returns 404. Use `npm run jobs:maintain -- --operation=all` from `backend`, with the worker's database/Redis/provider environment settings, or the **Daily job refresh** Actions workflow. Operations are `all`, `refresh`, `translate`, and `verify`; `all` performs them in refresh/translation/verification order. The worker does not require a user's browser or login token. It reports an unsuccessful exit for source or processing failures while allowing later stages to finish. Pending translation with provider `none` is expected. Inspect aggregate success/failure counts before claiming full coverage; investigate individual board failures in a controlled local run without exposing credentials or provider responses in public workflow logs.

In combined mode, `/scrapers/run`, `/scrapers/company`, `/scrapers/verify` and `/jobs/verify-all` require both a bearer login token and an `X-Maintenance-Secret` header matching a configured `MAINTENANCE_SECRET` of at least 32 characters. Missing or short configuration disables those mutations with 404. A normal authenticated user alone cannot invoke maintenance. These routes are optional operator tools; the daily schedule and CLI do not require this HTTP secret.

## Production and verification

Build each application from its own directory:

```bash
npm run build
```

Start the backend with `npm run start:prod`; Vercel manages the frontend deployment. Set the frontend's `NEXT_PUBLIC_API_URL` to the deployed backend HTTPS origin and the backend's `FRONTEND_URL` to the deployed frontend origin. Multiple explicitly trusted frontend origins can be comma-separated. Apply committed database migrations with `npx prisma migrate deploy` before deploying schema-dependent code, then run the English backfill when upgrading an existing catalog. Render Free setup uses the local migration procedure in [DEPLOYMENT.md](DEPLOYMENT.md); builds and daily maintenance do not apply migrations automatically. [Prisma deployment reference](https://docs.prisma.io/docs/cli/migrate/deploy).

For the free setup, the Render API can sleep while GitHub Actions refreshes the catalog. Configure the database and worker secrets, merge the workflow into the default branch, run the first import manually, and verify scheduled completion. If you instead use combined mode, its in-process scheduler and queue worker require a continuously running backend. Hosting only the frontend never refreshes the job catalog.

Focused backend checks:

```bash
cd backend
npm test -- --runInBand
npm run build
```

Frontend checks:

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

See [VERIFICATION.md](VERIFICATION.md) for recorded test results, browser checks, public-source probes, and outstanding integration checks. Live PostgreSQL/Redis integration, translation configuration/backfill, OAuth configuration, and two consecutive daily runs require a configured environment. A successful build or unit test is not proof that a deployed scheduler is running. See [IMPROVEMENTS.md](IMPROVEMENTS.md) for deployment readiness, a prioritized feature roadmap, effort estimates, and measurable acceptance criteria. [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md) record the shared design and interaction rules.

`.github/workflows/build.yml` runs tests and builds for both applications on Linux/Node.js 22 on pushes and pull requests, without a live database or deployment credentials. It is separate from the daily workflow that processes jobs using configured repository secrets.
