# Deploy NextGoal with free hosting tiers

Use **Vercel for the frontend, Render Free for the API, Neon Free for PostgreSQL, and Upstash Free for Redis**. GitHub Actions runs the daily maintenance job independently of the web API, so Render sleeping does not stop ingestion.

This setup is suitable for a personal project or a low-traffic preview. No hosting account, database, secret, or live deployment was provisioned as part of the repository changes.

## Services and limits

Limits checked on 10 September 2026; confirm the selected plans before creating services.

| Component | Recommended service | Relevant free-tier limit |
| --- | --- | --- |
| Next.js frontend | Vercel Hobby | Free for personal, non-commercial use; commercial use requires an eligible paid plan. [Vercel Hobby](https://vercel.com/docs/plans/hobby) |
| NestJS API | Render Free Web Service | Sleeps after 15 minutes without inbound traffic; waking takes about one minute. Each workspace receives 750 free instance hours per month, with separate bandwidth/build limits. [Render free services](https://render.com/docs/free) |
| Job/account database | Neon Free PostgreSQL | 0.5 GB storage and 100 CU-hours per project per month. Monitor storage, especially retained source text and translation cache. [Neon pricing](https://neon.com/pricing) |
| Worker coordination | Upstash Redis Free | 256 MB and 500,000 commands per month. Only the short-lived maintenance runner uses Redis in this setup. [Upstash pricing](https://upstash.com/pricing/redis) |
| Daily maintenance | GitHub Actions | Standard hosted runners are free for public repositories; private repositories have a plan-dependent minute allowance. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |

Use Neon instead of Render's free PostgreSQL offering: Render's free database expires after 30 days. Render also limits unusually high service-initiated network traffic, so the bulk source fetching runs in Actions. These tiers have limits and no guarantee of uninterrupted service; they do not establish that every listing can be translated without cost. [Render free services](https://render.com/docs/free)

## 1. Choose the deployment branch

The prepared changes are on `codex/job-discovery-refresh`. **Review and merge them into `main`, the repository's default branch, before following the complete setup.** The Render Blueprint leaves its branch unset, which uses the repository's default branch; Vercel should also use `main` for production. No merge has been performed by these configuration changes. [Render Blueprint branch selection](https://render.com/docs/blueprint-spec#branch)

For an early preview, manually select `codex/job-discovery-refresh` in the Render service and Vercel project. The default-branch requirement below still applies to automatic daily maintenance.

**Daily scheduled Actions run only from the default branch.** Merge `.github/workflows/daily-jobs.yml` and its backend code into `main` before relying on automatic refreshes. Creating a deployment from the feature branch alone does not activate the schedule. [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## 2. Create the data services

1. Create a Neon project on the Free plan, selecting a region near the Render API region.
2. In Neon's connection dialog, copy the PostgreSQL **pooled** connection string for `DATABASE_URL` and the **direct/non-pooled** connection string for `DIRECT_URL`. Both must reference the same database and branch. Preserve the supplied TLS query parameters. The runtime uses the pooled URL; Prisma migrations use the direct URL. [Prisma PostgreSQL connections](https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
3. Create and claim an Upstash Redis database in your account on the Free plan. Copy its TLS Redis connection URL, beginning `rediss://`, for the worker's `REDIS_URL`. Use the Redis connection URL rather than the REST API URL/token.

Enter secrets directly into the relevant provider dashboards or a local ignored environment file. Database passwords, JWT secrets, Redis credentials and translation keys must not be committed or placed in frontend environment variables.

## 3. Initialize or upgrade PostgreSQL

Run these commands locally from the `backend` directory with Node.js 22+. First copy `.env.example` to `.env` if necessary and set `DATABASE_URL` and `DIRECT_URL` to the intended Neon database. For a new database:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run jobs:translate -- --all --force
```

For an existing catalog, take a database backup before applying migrations and confirm that the selected database is the one you intend to update. The English-publication migration preserves original text and marks existing records pending. The backfill makes confidently English records public and processes other records only if a translation provider is configured. An empty database has nothing to backfill; the first maintenance run imports real jobs.

The Render build and daily workflow deliberately do not apply migrations. Repeat `npx prisma migrate deploy` before deploying a revision with new migrations. Render Free has no shell or one-off jobs, and its pre-deploy command requires paid compute, so use this local procedure. [Render free features](https://render.com/docs/free), [Render deploy commands](https://render.com/docs/deploys#pre-deploy-command)

Do not run the development demo seed against a public deployment.

## 4. Deploy the API on Render

After merging the changes, create a Render Blueprint from this repository and use the root `render.yaml`. Confirm its API service deploys the branch containing these changes. It defines only the API web service; Neon and Upstash are configured separately.

For manual setup, create a **Web Service** with these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | `backend` |
| Instance type | Free |
| Node version | 22 |
| Build command | `npm ci --include=dev && npm run prisma:generate && npm run build` |
| Start command | `npm run start:prod` |
| Health check path | `/health` |

Set these environment variables in Render:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_MODE` | `api` |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | Neon pooled PostgreSQL URL |
| `DIRECT_URL` | Neon direct PostgreSQL URL |
| `JWT_SECRET` | A strong, newly generated random secret of at least 32 characters; the Blueprint generates one |
| `FRONTEND_URL` | Your Vercel site's HTTPS origin, for example `https://your-project.vercel.app`; replace the example with your actual project domain |
| `JWT_EXPIRES_IN` | `7d`, or your chosen token lifetime |
| `ALLOW_DEMO_SEED` | `false` |

Render provides `PORT`; the server listens on it. `APP_MODE=api` keeps ingestion, translation scheduling, queue workers and Redis connections out of the HTTP service. The public API exposes search, authentication, profile and saved-job routes; maintenance runs through the separate CLI worker. The only application modes are `api` and `combined`; an omitted `APP_MODE` defaults to `combined`, so keep the explicit `api` setting on Render.

`FRONTEND_URL` accepts a comma-separated list of exact HTTPS origins with no trailing slash or path. Use the domain from an existing Vercel project, or your intended project domain during initial setup. After Vercel assigns the final project URL, update this value to match it. Add your custom domain or a specific trusted preview origin when needed; do not use `*` or allow every Vercel subdomain.

Copy the successful service's HTTPS URL, such as `https://your-api.onrender.com`, for the frontend. Open `/health` on that origin; it returns `{"status":"ok","service":"nextgoal-api"}` when the HTTP service is running. This is a liveness check with no database query. Prisma connects during application startup, but `/health` does not establish current database readiness, catalog freshness or successful translation.

## 5. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel. Set **Framework Preset: Next.js**, **Root Directory: `frontend`**, and **Node.js Version: 22.x**. The included `frontend/vercel.json` supplies the install/build settings. Leave the output directory at the Next.js default.

Set `NEXT_PUBLIC_API_URL` to the Render API's HTTPS origin, without an API path, credentials, query, or fragment. It must be the backend URL, not the Vercel site URL. A Vercel build rejects missing or invalid API configuration instead of silently using localhost.

Set this variable in each Vercel environment you use, including Preview if you deploy previews. Public Next.js variables are included during the build; redeploy the frontend after changing them. The browser calls Render directly, so its exact Vercel origin must be in Render's `FRONTEND_URL` allowlist. [Vercel environment variables](https://vercel.com/docs/environment-variables)

Deploy, copy the final Vercel origin, and confirm the Render allowlist matches it. After inactivity, the frontend allows up to 90 seconds for API requests while Render starts. If startup or a request still fails, use the displayed retry action; account and save requests are not automatically repeated.

### Optional Google sign-in

Email/password sign-in works without Supabase. To enable Google sign-in, configure a Supabase project and Google provider, then set:

| Location | Variables |
| --- | --- |
| Render | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Use the matching public anonymous/publishable key; never put a service-role key in Vercel public variables. Add `https://your-actual-frontend-domain/auth/callback` to Supabase's allowed redirect URLs and configure the Google provider callback requested by Supabase. Redeploy the frontend after changing its environment values.

## 6. Enable daily job fetching

The workflow `.github/workflows/daily-jobs.yml` runs at **20:47 UTC daily**, which is **02:17 Asia/Kolkata the following day**. It runs the worker directly against Neon and Upstash; it does not ping the sleeping Render API or require a user's session.

In the GitHub repository, open **Settings → Secrets and variables → Actions** and configure the worker values described below. Use the same Neon database and the Upstash Redis URL from step 2.

| Repository secret | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection |
| `DIRECT_URL` | Neon direct PostgreSQL connection |
| `REDIS_URL` | Upstash TLS Redis connection (`rediss://...`) |
| `LIBRETRANSLATE_URL` | Optional LibreTranslate service base URL |
| `LIBRETRANSLATE_API_KEY` | Optional LibreTranslate credential |
| `GOOGLE_TRANSLATE_API_KEY` | Optional Google Cloud Translation Basic v2 credential |

Set repository variable `TRANSLATION_PROVIDER` to `none`, `libretranslate`, or `google`. Omitting it selects `none`. Configure only the credentials for the provider you choose.

After the workflow exists on the default branch, open the repository's **Actions** tab, select **Daily job refresh**, and choose **Run workflow** with operation `all` for the first import. The other operations are `refresh`, `verify`, and `translate`. `all` runs refresh, translation retries, then link verification. Stages continue after another stage fails, but source/record/translation/verification errors fail the overall job so they remain visible. Pending translation with provider `none` is expected and does not itself fail the run.

Inspect the aggregate result summary; a partial source failure does not mean the entire catalog is fresh. Worker output avoids raw source records, provider responses and credentials. Investigate a failed board in a controlled local run when more detail is required. The workflow has a 180-minute timeout and prevents overlapping workflow runs. Its optional `force_translation` input retries queued translations early, up to 1,000 records. For an operator-run maintenance command from `backend`, using the same worker environment values:

```bash
npm run jobs:maintain -- --operation=all
```

The CLI also accepts `--force-translation` and `--translation-limit=1000`. It opens neither an HTTP listener nor in-process schedules, and needs no `JWT_SECRET`, `FRONTEND_URL` or user token. Use the dedicated bulk backfill in step 7 when upgrading an existing catalog.

The schedule is best effort: GitHub can delay or drop scheduled runs during load and disables schedules in public repositories after 60 days without repository activity. Check Actions history, re-enable a disabled workflow when needed, and verify two consecutive daily runs. This free setup cannot guarantee an exact 24-hour refresh interval. [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## 7. Configure English translation if required

With `TRANSLATION_PROVIDER=none`, native English jobs can be published. Foreign or uncertain jobs remain private with their source text preserved. No untranslated fallback is published, and company proper names and application destinations remain unchanged.

To publish translated jobs, configure your own Google Cloud Translation account or a reachable LibreTranslate service in the worker secrets. Google may require billing; self-hosting LibreTranslate needs additional compute. The hosting tiers above do not include an unlimited free translation service. After configuring a provider, run the documented English backfill with that provider's environment settings to process existing queued records immediately:

```bash
npm run jobs:translate -- --all --force
```

This command requires PostgreSQL and the provider configuration but not Redis or a running HTTP API. Translation retry delays and publication rules are described in [README.md](README.md#english-publication-and-translation).

## Launch checks and troubleshooting

1. Verify `/health`, then `/jobs?limit=1` and `/jobs/stats` on the Render API. An empty catalog before the first import is expected.
2. Complete one manual `all` workflow run and inspect the aggregate refresh, verification and translation counts. Confirm that jobs appear in the frontend.
3. Test account registration/sign-in, saving/removing a job, profile preferences, filtering and a source-provided application link from the Vercel domain. Test Google sign-in only if configured.
4. Confirm that ordinary users cannot invoke maintenance through the deployed API, and that no development demo account or fixture jobs are exposed.
5. Inspect two consecutive daily runs and monitor Neon storage/compute, Upstash commands, Render usage and translation usage.

| Symptom | Check |
| --- | --- |
| Vercel build rejects API configuration | Set the real HTTPS `NEXT_PUBLIC_API_URL` for the selected environment and redeploy. |
| Browser reports a network/CORS error | Wait for Render's cold start; check its logs and the exact frontend origin in `FRONTEND_URL`. |
| API starts but database queries fail | Confirm the Neon database is available, both URLs reference it, TLS parameters are intact, and committed migrations were applied. |
| No jobs after setup | Run `all`, inspect failed boards and confirm the worker and API use the same database. |
| Non-English jobs are missing | Configure a translation provider and run the backfill; private pending records are intentional. |
| No daily Action runs | Confirm the workflow is on the default branch, Actions is enabled, secrets are present, and the schedule has not been disabled for inactivity. |

See [VERIFICATION.md](VERIFICATION.md) for repository-level checks and the integrations still requiring a configured environment. [IMPROVEMENTS.md](IMPROVEMENTS.md) tracks operational monitoring, rate limiting and longer-term features.
