# UX Contract

## Product context

NextGoal helps job seekers search configured career boards, save roles, and open source-provided application destinations. English (`en-IN`) is the active UI formatting locale, and public job title/description/location must be English-ready. Original source text is retained privately; company proper names and application URLs remain exact. Existing setup uses Indian locations and Asia/Kolkata scheduling, with international source coverage. Job dates use `frontend/lib/job-search.ts` and the browser timezone; the ingestion schedule is explicitly Asia/Kolkata. Accessibility target: WCAG 2.2 AA, pending browser verification rather than claimed certification.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
| --- | --- | --- | --- |
| Product promise and coverage | [README.md](README.md), current user request | Product brief / maintained setup | 2026-09-10 |
| Search, sorting and pagination | `backend/src/jobs/dto/job-filters.dto.ts`, `backend/src/jobs/jobs.service.ts` | API implementation evidence | 2026-09-10 |
| Authentication and saved-job access | `backend/src/auth`, `backend/src/users/users.controller.ts` | Server authorization evidence | 2026-09-10 |
| Stored preferences and saved relationships | `backend/prisma/schema.prisma` | Data schema | 2026-09-10 |
| Link checking and freshness | `backend/src/jobs/job-verification.service.ts`, `backend/src/scrapers` | Data lifecycle implementation evidence | 2026-09-10 |
| English-only publication | Current user request, `backend/prisma/schema.prisma`, `backend/src/jobs/public-job.ts`, `backend/src/translation` | Product decision / schema and API implementation evidence | 2026-09-10 |

The UI must follow server authorization; frontend visibility does not grant access. Billing, bulk lifecycle changes, uploads, hard deletion, and a new legal/retention policy are outside this revision. Existing terms are not a basis for inventing certification or regulatory claims. Future product work is separated in [IMPROVEMENTS.md](IMPROVEMENTS.md).

## Visual contract

[DESIGN.md](DESIGN.md) records the user-authorized futuristic redesign. Existing runtime CSS is canonical (Model B): `frontend/app/globals.css` → Tailwind semantic aliases → shared components. Dark is the single authored theme on all routes, with local Sora/Manrope fonts and no theme switch. Forced colors and reduced motion remain operable. Update the CSS owner, documentation and affected components in one change; verify mappings and computed styles rather than generating a second token system.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | JobFilters at `frontend/components/job-filters.tsx` | This contract + `.filter-select` | Native posting-age select; OS-owned popup accepted | Open popup, keyboard selection, narrow viewport |
| Form | AuthForm at `frontend/app/auth/auth-form.tsx`; shared Input/Label/Checkbox | Server DTOs + this contract | Sign-in/register; profile preference composition | Inline validation, field association, duplicate submit, recovery |
| Scrollbar | `frontend/app/globals.css` global baseline | DESIGN.md mapping | Document; inherited overflow regions | Computed styles, forced colors, keyboard scrolling |
| Toast | `frontend/components/ui/toaster.tsx`, `toast.tsx`, `use-toast.ts` | This contract + Radix Toast primitive | Default acknowledgment / destructive error | Live announcement, dismissal, no sole-copy errors |
| CRUD | `frontend/lib/api.ts`, user-scoped React Query consumers | Server users API + this contract | Save/unsave stays in list; preference save stays in profile | Server-confirmed success, failure retry, account switching |
| Search | Discovery page + JobFilters | Jobs API + this contract | Keyword, location, company, source, age, remote, experience, degree, type | URL restoration, IME, abort, pagination boundaries |
| List state | ResultState at `frontend/components/result-state.tsx` | This contract + `.result-state` | Loading / error / empty / no matches | Stable region, meaningful retry/reset action |
| Job display | `frontend/components/job-card.tsx` | Job API + this contract | Discovery / saved | Identical source/date/apply labels and save feedback |
| Decorative hero | Shared hero markup and CSS in the discovery route | DESIGN.md | Three orbital paths and central upward arrow, `aria-hidden` | No invented status/data; reduced motion; no obscured controls |

There is no table selection, bulk action, date picker, or authored listbox in scope. Posting-age selection is a relative filter, not a date input.

The installed audit tool recognizes only its fixed standard capability names. `premium-ui.json` therefore requires the five applicable standard rows; Search, List state, Job display and Decorative hero remain additional project-owned contracts above and require browser verification.

## Component behavior

| Component | Default | Hover / focus | Active / selected | Disabled / busy | Error |
| --- | --- | --- | --- | --- | --- |
| Button / ButtonLink / icon action | Button owns actions; ButtonLink in `frontend/components/ui/button.tsx` renders Next.js Link with shared `buttonVariants` | Visible color/border feedback and focus ring; icon has accessible name | Selection uses an explicit state/label | No duplicate handler; keep geometry; announce pending work | Inline context persists; toast supplements |
| Input / password | Real label; password masked; appropriate autocomplete | Focus ring; no hover-only help | User text retained | Disable only the pending operation as needed | `aria-invalid`, existing described error, first invalid field focus |
| Checkbox | Shared Radix primitive and clickable label | Keyboard focus and visible hover | Checkmark plus state | Disabled remains non-interactive | Group context explains invalid selection |
| Search | Clear action when nonempty | Clear returns focus to input | Committed search drives URL | Results own pending state; typing remains usable | ResultState preserves filters and offers retry |
| Job list | Shared JobCard and result range | Only controls/links are interactive | Saved state comes from the user's server data | Pending card action disabled | Keep job visible on failed mutation |

## Dataset navigation

- Discovery uses server pagination, default 20 results. A `limit` URL parameter restores a page size from 1 to 100; there is no visible page-size selector. No infinite scroll or unbounded replacement feed.
- Committed search, applicable filters, page and limit are URL-restorable. Search changes reset page to 1; clamp/refetch an out-of-range page. Backend ordering is authoritative and no unsupported client sort is implied.
- Keyword search waits 300ms, remains IME-safe, and cancels superseded requests. Clear and explicit Enter act immediately after composition finishes. A late response must not replace newer results.
- Browser back/forward restores committed search state. Normal document scrolling is the owner; filter changes do not impose a viewport-height scrolling shell.
- Differentiate empty catalog, no matching filters, request failure, and loading. Retry retains search input. Reset removes only discovery filters. Unknown posting dates do not satisfy posting-age filters.
- Remote currently matches normalized location text. Preferences are stored, not automatically applied as ranking; additional professional categories remain future work.
- Public list/detail/saved/stats/filter queries admit only active English-ready jobs before pagination or counting. Untranslated or uncertain listings must not leak through a secondary view, empty-state sample or hidden data payload.

## English publication

Public `title`, `description` and `location` are the English-ready presentation fields. `originalTitle`, `originalDescription`, `originalLocation` and internal language/provider/error/retry metadata remain server-private and must not be serialized in job APIs. The public allowlist may expose `isTranslated` and `translatedAt` as presentation provenance; “English translation” appears only for an actually translated record. Company names and application URLs are preserved, and the external application page may use another language.

Confidently English listings can become ready without an external provider. Foreign or uncertain text remains stored for translation/retry when a provider is missing or unavailable; do not drop originals or show them raw as fallback. Only successful ready output enters public discovery. The pipeline supports configured translation providers, but their existence does not mean credentials, network access or live translation have been verified. Existing records require the migration and backfill workflow; do not label legacy rows ready by default.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Search/filter | Input, Enter, checkbox/select | Search request; cancel stale work | Current list and restored URL | Updated range/count | Keep filters; Retry or reset | Remain on control; Clear focuses input |
| Save/unsave job | JobCard button | Disable that mutation | Same list | Server-confirmed saved state + toast | Inline error + toast; retained card and retry | Keep action focus when card stays; logical list target when removed |
| Save preferences | Profile save action | Disable duplicate save | Same profile | Saved acknowledgment | Preserve edits and inline error | Keep save/context focus |
| Sign in/register | AuthForm | Disable duplicate submission | Internal destination/home | Authenticated navigation | Preserve nonsecret input; inline field/form errors | First invalid field, otherwise form error context |
| Google sign-in | Configured OAuth action | Provider redirect/exchange | Validated internal destination | Authenticated navigation | Inline error and retry/sign-in route | Follow route navigation |
| Apply | JobCard external anchor | Browser navigation | Source-provided destination | Clearly labeled destination host | Invalid/unavailable destination is disabled with reason | Native link behavior |
| Cancel/back/sign out | Navigation/provider action | Clear session-dependent state when signing out | Chosen internal route | Signed-out controls | Auth errors are visible and recoverable | Logical route heading/navigation |

Opening Apply never marks a job as applied. No application-submission or employer-authenticity guarantee is inferred from a click or a link check.

## Navigation, overlays and feedback

Discovery, saved jobs, profile, auth and terms share the dark navigation, typography, controls and feedback system. Desktop discovery has a 232px filter rail, a two-card result grid above 1160px and three compact information cards below results. At 900px filters become an initially collapsed native inline disclosure; phone search and cards stack. Keep primary touch actions 48px high and icon actions 44px. Long titles wrap and important values remain available without hover. Focus must remain visible around navigation and any sticky element.

The two-column hero's orbital graphic is decorative and excluded from the accessibility tree. It must not intercept pointer/keyboard actions, imply live source telemetry, or replace the factual source list. Reduced-motion users receive the same content without entry or interaction animation.

No app modal is required for routine reversible save/unsave. Do not use native `alert`, `confirm` or `prompt`. If an irreversible operation is introduced later, adopt one shared accessible dialog with focus management before implementing that operation.

Toaster uses the shared Radix viewport fixed at the lower right on every screen size, z-index 100, maximum width 420px, safe-area bottom spacing and one visible toast. The viewport ignores pointer events; toast children receive them, so an empty overlay cannot block navigation or the mobile menu. Each toast has an always-visible 44px “Dismiss notification” control, and its text reserves room for that control. Keep keyboard focus visible and header actions operable while a toast is present. The provider owns timing, dismissal and announcement. Toasts acknowledge events; field/card errors remain inline. There is no custom toast delivery guarantee or retry queue. Unsaved profile edits have an inline notice and a page-unload warning; an in-app navigation interception dialog is not implemented.

## Async and resilience

Mutations are pessimistic: update saved UI only after server confirmation, invalidate the appropriate query, and preserve values on failure. Saved queries use `['saved-jobs', user.id]`; profile data must also be scoped to the current account. Clear private cached data when auth changes. Never display the previous user's saved jobs while the next account loads.

The API layer forwards abort signals for search. Pending ownership is per query/mutation; a spinner does not certify a background refresh. Offline failures remain explicit with retry; no queued writes, offline auto-save, version-conflict merge, or multi-tab live synchronization is promised. Expired sessions must reach a recoverable sign-in state without pretending a mutation succeeded. Never persist passwords, OAuth tokens in URLs, or secrets in error/toast text.

## Validation and permissions

Product forms use `noValidate` and own field/form errors while retaining semantic types and autocomplete. Validate on submit, focus the first invalid field, expose `aria-invalid` and described error text, and preserve editable values. Password visibility is an accessible show/hide action; paste and password managers remain usable. OAuth is optional and unavailable configuration is explained rather than starting a broken flow.

Saved jobs and preference actions require the current authenticated user; browsing and source application links remain public. Backend guards are authoritative. Admin operations are absent from the product UI, and UI concealment does not resolve the maintenance API permission limitation recorded in IMPROVEMENTS.md. No clipboard handling or sensitive copy workflow is implemented.

## Verification

Run the real commands in [premium-ui.json](premium-ui.json): backend tests/build and frontend tests/typecheck/build. Run the installed skill's strict project audit and DESIGN lint separately; neither proves runtime UX.

Browser checks must compare discovery and saved jobs, then profile, terms and both auth variants. Exercise loading, empty, no matches, failure/retry, save/unsave, session switching, query restoration, IME/Enter/Clear, keyboard-only focus, native select open state, and narrow screens at the defined breakpoints. Check local-font load/fallback, dark contrast, reduced motion, forced colors, long text and 200% reflow. Verify that foreign/uncertain source text cannot surface through public lists, details, saved jobs, counts or filter values. No Storybook, automated frontend E2E suite or accessibility certification is claimed; record actual browser evidence and remaining deployment-dependent checks in the task validation report. Earlier light-theme screenshots do not validate this redesign.
