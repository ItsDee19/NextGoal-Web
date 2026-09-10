# NextGoal improvement plan

Repository review: 10 September 2026. Estimates below are planning ranges for one engineer familiar with this codebase, including focused tests and review. They exclude provider approval delays, ongoing operations, and hosting costs.

## Product scope and coverage

The useful promise is **one searchable view of jobs from configured company career boards, refreshed daily, with an application destination supplied by the source**. Coverage should be expanded and measured explicitly; the repository does not search every job platform or discover every employer automatically.

| Source | Configured board identifiers | Scope |
| --- | --- | --- |
| Greenhouse | stripe, airbnb, coinbase, databricks, discord, vercel | 6 boards |
| Lever | palantir | 1 board |
| Ashby | ramp, notion | 2 boards |
| SmartRecruiters | Ubisoft2 | 1 board |
| Workday | None | Placeholder; no working ingestion |

This is **four implemented ATS adapters and ten configured boards**, based on `backend/src/scrapers/configured-boards.ts`. Individual public-source checks identified stale identifiers in the original eleven-board list; this revision updates the configured set. `backend/scripts/probe-sources.ts` can repeat adapter checks without database writes. Configuration and a successful source request do not prove that a production ingestion run completed. General job marketplaces such as LinkedIn, Indeed, and Naukri are not integrated.

The final read-only probe on 10 September 2026 at 09:55 UTC succeeded for 10/10 boards and reported 2,879 feed postings before application-level deduplication. It stored twelve real samples for inspection; it did not write database jobs, independently verify application pages, or submit applications.

The APIs are company-board scoped: Greenhouse lists board jobs and exposes the source URL; Ashby supplies separate job and application URLs. These support expanding a source registry, but do not imply a universal cross-platform search API. [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api).

## Scope of this revision

The accompanying implementation work covers daily ingestion reliability, source-provided application links and their verification, clearer freshness and source information, and a responsive search interface. Search adds ATS source, posting age, and remote filters alongside the existing experience, degree, job type, location, and company filters. Search state can be restored from the URL; saving jobs is kept in sync across views.

The setup examples are corrected, Google sign-in is optional when Supabase is unconfigured, preferences responses omit authentication fields, and the development seed no longer invents live listings. These changes do not themselves deploy a service or establish that a production refresh has completed.

The follow-up features below are proposals. In particular, a source-management UI, normalized professional categories, email alerts, application tracking, and personalized ranking are not delivered by this revision.

## P0: establish deployment readiness

| Work | Repository evidence / practical outcome | Effort | Dependencies and acceptance |
| --- | --- | --- | --- |
| Deploy and prove the daily refresh | Scheduling lives inside the NestJS backend; the existing Compose file starts only PostgreSQL and Redis. Run a persistent backend with durable database/queue services, environment secrets, and migrations. | 1–2 days | Hosting credentials and deployment target. Observe two consecutive scheduled runs, then a restart/recovery; compare source counts and last successful completion. |
| Restrict operations and limit abuse | Manual scrape/verify routes can consume outbound requests and worker time. Require an operator role or a dedicated scheduler credential; add rate limits to authentication and expensive routes. | 1–2 days | Agreed operator access model. A normal newly registered user cannot trigger maintenance; repeated login attempts are throttled. |
| Add a run ledger and alerts | Console logs and per-job timestamps cannot establish whether all sources refreshed. Store run/source status, start/end times, received/added/updated/failed counts, and last error. | 2–3 days | Durable storage and deployed worker. Alert on no successful daily completion for >26 hours, repeated source failures, or abrupt coverage loss. Do not label partial ingestion as a fully refreshed catalog. |
| Exercise the deployed integration | Unit tests cannot validate real migrations, Redis coordination, source pagination, authentication cookies, or OAuth redirects. Add a staging smoke workflow for search, save/unsave, login, one ingestion run, and failed-source recovery. | 1–2 days | Staging PostgreSQL/Redis, configured Supabase if OAuth is enabled, and representative source responses. No duplicate run or fabricated active demo listing after restart. |
| Review dependencies and session handling | This revision updates the original Next.js 14.1.0 pin to 14.2.35; browser JavaScript still manages bearer-token cookies. No full account recovery or token-revocation flow exists. | 2–4 days | Continue assessing package advisories against the resolved lockfiles with build/smoke checks. Decide a secure session/refresh strategy, test logout and expiry, and validate OAuth account linking. |

Nest schedules are registered when the application boots, so deployment must keep the process running. Process-local overlap protection is insufficient by itself for multiple backend replicas; exercise the chosen queue/lock strategy under two workers. [NestJS task scheduling](https://docs.nestjs.com/techniques/task-scheduling).

Apply committed migrations in the deployment pipeline with the installed Prisma version's `migrate deploy` command, and generate the client separately. [Prisma migration deployment](https://docs.prisma.io/docs/cli/migrate/deploy).

## P1: improve matching and user value

| Feature | Why it matters / evidence | Effort | Dependencies and acceptance |
| --- | --- | --- | --- |
| Editable source registry | The ten boards are stored in a shared code configuration. Store employer name, ATS, board identifier, approved application hosts, enabled state, owner, and source health. Add/import boards without a code release. | 3–5 days | P0 run ledger and operator access. Adding a board runs a connection test and reports actual job count; a broken board can be paused. |
| Stable job identity | `generateContentHash()` uses title/company/location, so two requisitions with those same fields can overwrite one another and a renamed role can become a duplicate. Make source + board + source job ID the ingestion identity, with separate cross-source equivalence. | 2–4 days | Schema migration and adapter IDs. A renamed requisition updates in place; two different requisitions with the same title both remain available. Preserve existing saved-job relationships during migration. |
| Professional categories and better metadata | There is no category field. Degree and experience labels are partly inferred from title/description, and remote filtering initially relies on location text. Add department/category, structured work mode/country, salary currency/period, and an explicit unknown value. | 4–7 days | Schema migration and adapter mapping. Distinguish source-provided versus inferred values; ambiguous jobs remain discoverable. Backfill a reviewed sample before enabling hard category filters. |
| Preferences that affect discovery | `User.preferences` stores JSON and the profile edits it, but the discovery feed does not use it for ranking. Provide an explicit “Use my preferences” action and explain which filters were applied. | 2–3 days | Normalized filter contract. Persist preferences, apply them consistently, and allow a quick return to all results without hiding jobs silently. |
| Saved searches and daily digests | The current model saves individual jobs only. Let users save a filter set and opt into a daily summary of newly discovered matching jobs. | 3–5 days | Email provider, verified addresses, run ledger, notification preferences/unsubscribe. Deduplicate by user/job and send only after ingestion completes; retries must not send a second digest. |
| Application tracker | `SavedJob` records only `userId`, `jobId`, and `savedAt`. Add user-controlled states such as saved, applied, interviewing, offer, and closed, with notes and dates. | 3–4 days | User-scoped tracker model and UI. Clicking the external application link must not automatically mark a job as applied. |
| Report a broken or misleading listing | Users currently have no structured way to flag a wrong destination or a closed role. Add reason-based reports, triage, and source rechecks. | 2–3 days | Operator access and verification history. Preserve the original source evidence, acknowledge the report, and avoid automatic deletion from a single report. |

## P2: expand after the core is measured

| Work | Effort | Prerequisite / success measure |
| --- | --- | --- |
| Workday adapter, then other approved sources | 5–10 days per materially different integration | Confirm the specific employer endpoints and allowed access. Implement fixtures, pagination, source identity, application URL validation, error handling, and source health before advertising support. |
| Ranked search and scale improvements | 3–6 days | Measure query latency and match quality first. Add PostgreSQL full-text/trigram indexes and ranking with representative data, then prove useful matches and predictable pagination. Current substring search is not a dedicated full-text index. |
| Shareable job details and search discovery | 3–5 days | A `/jobs/:id` API exists; a dedicated public job-detail page and job-specific metadata are follow-ups. Show source, dates, status, and application destination; avoid indexing inactive listings as open jobs. |

## Measures to track

- **Freshness:** last successful full run, age per source, and percentage of active listings checked in the last 24 hours.
- **Coverage:** working/configured boards and published jobs per source; distinguish an empty board from a failed request.
- **Link quality:** definitive closed responses, uncertain checks, invalid destinations rejected, and user-reported broken links. “Link checked” does not verify an employer's identity or guarantee a vacancy remains open.
- **Discovery:** successful searches, zero-result rate, applied filters, saves, and voluntary reported applications. An outbound click is only a click.

Live PostgreSQL, Redis, configured OAuth, and a production deployment were not available for this repository review. Deployment execution and genuine application completion remain checks for the configured environment, not claims inferred from the UI or unit tests.
