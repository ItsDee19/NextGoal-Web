# Verification record

Reviewed on 10 September 2026. Local checks used the bundled Node.js 24 runtime; use Node.js 22+ for the documented npm commands. This records observed results, not a production deployment. The current revision adds the dark responsive redesign and English-only publication pipeline; earlier UI evidence is identified separately below.

## Deployment preparation

The follow-up adds Vercel frontend configuration, a Render Free API blueprint, HTTP-only API mode, and an independent GitHub Actions daily maintenance workflow. [DEPLOYMENT.md](DEPLOYMENT.md) records provider setup, migrations/backfill, default-branch scheduling requirements and free-tier limits verified against official provider documentation on 10 September 2026. No hosting accounts, database services or live deployments were provisioned. Local deployment checks used Windows and the bundled Node.js 24 runtime; the deployment target is Node.js 22.

| Deployment preparation check | Result |
| --- | --- |
| Backend tests | Passed: 223 tests across 17 suites |
| Backend production build | Passed: `dist/main.js` generated; tests and development seed excluded from runtime output |
| API startup and HTTP behavior | Nine checks passed with the real Nest application and a mocked database: no Redis/collector/scheduler providers, health without database queries, exact CORS origins, and maintenance blocked |
| Worker failure cleanup | CLI configuration/argument failures and unreachable local test services exited with redacted errors and closed resources; no production services contacted |
| Frontend tests | Passed: 108 tests |
| Frontend production build and TypeScript | Passed: all 10 Next.js routes generated |
| Vercel API-origin validation | Confirmed missing origin fails with `VERCEL=1`; a valid public HTTPS origin is accepted |
| Deployment configuration syntax | Render/Actions YAML parsed; Vercel JSON and Node 22 package/lock metadata checked |

This follow-up does not redesign the UI; it extends the API request timeout to 90 seconds for Render's cold start without automatically repeating mutations. The automated and browser evidence below is the earlier UI/English-publication baseline, separate from deployment preparation.

The added `.github/workflows/build.yml` runs frontend/backend tests and builds on Linux with Node.js 22 for pushes and pull requests. It uses placeholder database/API configuration for checks and no live hosting secrets or database. Adding this workflow is not evidence that its remote run has passed.

## Earlier UI and English-publication automated baseline

| Check | Result |
| --- | --- |
| Backend Jest tests | Passed: 13 suites, 165 tests, including English publication and migration checks |
| Backend production build | Passed: final NestJS build |
| Frontend tests | Passed: 91 tests |
| Frontend TypeScript check | Passed in the final production build's type-checking phase |
| Final frontend production build | Passed: Next.js 14.2.35 generated all 10 routes with the dark redesign and toast fix |
| Premium strict UI audit | Dark-redesign pass: 0 findings; ignored local report `premium-audit.json` |
| Official DESIGN.md lint | Dark-redesign pass: 0 errors, 12 token-reference warnings. The warnings remain visible; runtime-owned tokens are mapped in DESIGN.md prose rather than frontmatter component references. |

Repeat the project checks from the repository root:

```bash
npm --prefix backend test -- --runInBand
npm --prefix backend run build
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

DESIGN lint used `npx -p @google/design.md designmd lint DESIGN.md`. The installed frontend-design-premium skill's `scripts/audit_project.py` ran against this repository with `--mode strict`. These static checks do not prove browser accessibility or backend integrations.

The backend suite executes the committed migration SQL in an isolated PGlite process. It verifies preservation of multilingual originals, nulls, company names, application links, verification state and saved associations; pending publication defaults; and translation-cache uniqueness. This is SQL migration evidence, separate from applying the migration and running the Prisma backfill against a live PostgreSQL deployment.

## Browser checks

The current dark redesign passed phone checks at 320px and 390px with no horizontal overflow, and the desktop result grid displayed two card columns at 1440px. At 390px, checks confirmed initially collapsed filters, a 48px search action, 14px job descriptions and two visible English-translation labels. Search, source, company and posting-age filters composed correctly; Browser Back restored the query. Guest authentication return, saving a job, the saved view's English-translation label and unchanged application destination, and removal through the empty state also passed. The shortlist header adapts to narrow widths, and profile heading/fields fit the phone viewport.

QA identified the toast viewport intercepting the mobile menu after save/remove. The shared viewport now sits at the lower right, ignores pointer events outside toast children and provides an always-visible 44px dismissal control. On the final production build, saving a job, leaving its notification visible and opening the mobile menu passed; the dismissal target measured 44 × 44px. Earlier light-theme screenshots are not evidence for this redesign.

The current ignored preview fixture has twelve real source samples, including two manually reviewed English translations of French titles. The original snapshot is unchanged. This demonstrates the intended presentation only: no translation-provider call or database backfill ran, and the preview API is not the backend publication policy.

### Earlier interaction regression baseline

Browser QA used a production Next.js build with an ignored local preview API. It served twelve real public-feed samples, with temporary synthetic login and saved-job state held in memory. A visible notice identifies the preview. Sample source-fetch timestamps are not treated as application-link verification; the preview leaves `lastVerified` null. It did not exercise the NestJS backend or a live database.

Verified at desktop width 1270px and mobile width 390px, with no horizontal overflow:

- Search and location submission, filters, URL restoration, pagination, and Clear returning focus.
- Loading, request failure/retry, empty results, and filter-reset recovery.
- Guest save action leading to authentication with an internal return destination.
- Invalid login/registration fields and safe OAuth-error return handling.
- Save/remove behavior, private-cache clearing across authentication changes, and mutation-error recovery.

Earlier interaction checks also passed: rapid Greenhouse/Lever/Ashby selections retained all three checked states and URL values; company typing preserved a trailing space and the multiword value “New York”; keyword “Engineer”, location “London”, company and sources combined correctly and restored after reload. Browser Back was not exercised during that earlier baseline; it passed on the current dark redesign as recorded above.

The intended local preview is the frontend at `http://127.0.0.1:3100`, using the temporary memory API at port 3101. These are development processes, not deployed services. The preview must not be used as a production data or authentication fallback.

## Public-source checks

The read-only source probe completed at **2026-09-10 09:55 UTC**: **10/10 configured boards across four ATS adapters succeeded**, reporting **2,879 feed postings before application-level deduplication**. The local `artifacts/live-jobs.json` snapshot contains twelve actual samples, up to three per source. This check did not write database jobs or submit applications.

A separate bounded application-link probe made exactly four GET requests at approximately **10:01 UTC**:

| Source / employer | Result |
| --- | --- |
| Ashby / Notion | HTTP 200; verifier returned valid |
| Lever / Palantir | HTTP 200; verifier returned valid |
| SmartRecruiters / Ubisoft | HTTP 200; verifier returned valid |
| Greenhouse / Coinbase | HTTP 302; inconclusive because the redirect was not followed under the four-request cap |

The local report is `artifacts/application-link-probe.json`. HTTP reachability does not prove employer identity, current hiring status, or successful application submission. No applications were submitted.

An English-policy check at **2026-09-10 11:00 UTC** assessed the original twelve source samples: **10 English-ready, 2 French listings requiring translation, 0 uncertain**. The local `artifacts/english-language-probe.json` records this classification; it used neither a translation provider nor database calls. It does not establish readiness for all 2,879 feed postings. The two manually translated titles in the browser preview are separate presentation fixtures, not outputs of this check.

## Integration checks still required

PostgreSQL/Redis integration, a deployed ingestion run, configured Google/Supabase OAuth, two consecutive scheduled daily runs, and account flows using real backend accounts were not verified. Neither the new English migration/backfill nor a live Google/LibreTranslate request was exercised against a configured database/service. Provider `none` publishes confidently English records and retains foreign/uncertain originals privately; multilingual-source coverage requires a configured provider and completed backfill.

Provision the deployment environment and complete these checks before relying on the service. Deploy the public service with `APP_MODE=api`, which omits HTTP maintenance routes, and exercise the independent worker through its configured workflow. See [DEPLOYMENT.md](DEPLOYMENT.md) for the free hosting setup, [README.md](README.md) for translation behavior and [IMPROVEMENTS.md](IMPROVEMENTS.md) for remaining operational work. Work targets the feature branch `codex/job-discovery-refresh`; this report does not establish a merge to `main` or a live deployment.
