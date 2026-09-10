---
version: alpha
name: NextGoal
description: A dark job discovery workspace with orbital source imagery and readable English listings.
colors:
  primary: "#A6B4FF"
  primaryForeground: "#101528"
  foreground: "#ECF2FF"
  background: "#090D17"
  surface: "#101827"
  secondary: "#182236"
  muted: "#182236"
  mutedForeground: "#A0AEC6"
  accent: "#1C2947"
  cyan: "#72E5EE"
  border: "#2A3650"
  danger: "#FF929E"
  success: "#78DBB8"
  scrollbarThumb: "#435474"
  scrollbarHover: "#667C9E"
  scrollbarActive: "#A6B4FF"
typography:
  display:
    fontFamily: "Sora, Trebuchet MS, sans-serif"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
rounded:
  DEFAULT: "18px"
  sm: "14px"
  md: "16px"
  lg: "18px"
  control: "16px"
  card: "20px"
  tag: "6px"
  brand: "12px"
  navigation: "12px"
spacing:
  page-max: "88rem"
  page-gutter: "2.5rem"
  page-gutter-laptop: "2rem"
  page-gutter-tablet: "1.25rem"
  page-gutter-mobile: "1rem"
  discovery-gap: "1.65rem"
components:
  button: {}
  button-link: {}
  input: {}
  checkbox: {}
  job-card: {}
  job-filters: {}
  result-state: {}
  toaster: {}
  auth-form: {}
---

# NextGoal Design System

## Overview

### Creative North Star

A career navigation instrument: openings from several boards converge toward one next step. Three orbital paths surround a central upward arrow in the hero, expressing aggregation without pretending to show telemetry. Deep navy surfaces, periwinkle actions and a restrained cyan accent create the requested futuristic direction. English job content and clear application destinations remain the practical purpose.

This is the user-authorized dark redesign of 10 September 2026. It intentionally replaces the earlier light palette and system-font treatment; the updated runtime and contracts must be verified together before reusing earlier visual-QA results.

### Product context and register

- **Audience and task:** job seekers comparing role requirements and application sources across configured company boards.
- **Market evidence:** existing Indian location preferences and an Asia/Kolkata refresh schedule inform setup; employer coverage is international. There is no confirmed country-exclusive audience or Japan-market scope.
- **Language:** English interface and English-ready public job title/description/location, with `en-IN` date/number formatting and sentence case. Keep company proper names and application URLs exact. Original source text is retained privately for the translation workflow; never publish raw foreign or uncertain text as a fallback.
- **Usage:** recurring desktop searches and phone review, with enough density to compare jobs without turning the screen into a dashboard of metrics.
- **Register:** product application throughout `/`, `/saved`, `/profile`, and authentication; the discovery heading introduces the task rather than a separate marketing funnel.
- **Signature and restraint:** orbital paths and the upward arrow carry expression. Keep readable dark cards, familiar controls and factual source information quiet around them. The compact platform strip names real supported sources.
- **Anti-references:** dense science-fiction HUDs, fake activity/status counters, glowing text, full-screen particle fields, fabricated company logos, safety badges without evidence, and tiny low-contrast data labels.

**Token ownership: Model B.** [frontend/app/globals.css](frontend/app/globals.css) owns runtime values and component recipes. [frontend/tailwind.config.js](frontend/tailwind.config.js) adapts semantic CSS variables into utilities consumed by shared components. This file mirrors accepted values and records rationale; it does not generate CSS. Hex colors above are the rendered 8-bit equivalents of the canonical HSL variables. Changes update the CSS owner, affected adapter/primitive, and this file together.

## Colors

Periwinkle `primary` marks actions, current navigation and focus, with dark `primaryForeground` on filled buttons. Pale `foreground` is the reading color; `mutedForeground` carries supporting metadata without fading into the navy background. Ink-glass `surface` and `border` separate controls/cards from `background`. `accent` supports selection/source labels, while `cyan` belongs to restrained orbital and decorative accents. `danger` and `success` accompany descriptive text; they do not certify a listing.

Dark is the only authored theme on discovery, saved jobs, profile, authentication and terms. There is no theme switch or separate light-screen exception. Forced-colors mode returns scrollbars to system colors and retains operable boundaries. Information must never depend on color alone.

## Typography

Display uses locally hosted variable Sora with Trebuchet MS/sans-serif fallback; body uses locally hosted variable Manrope with Arial/sans-serif fallback. The font binaries are `frontend/public/fonts/Sora-Latin.woff2` and `Manrope-Latin.woff2`, exposed at weights 400–800 with `font-display: optional`. Their accompanying `Sora-OFL.txt` and `Manrope-OFL.txt` preserve the SIL Open Font License 1.1 notices and source authorship: the Sora Project Authors and the Manrope Project Authors. Ship these license files with the fonts. Runtime font loading uses local assets, not a Google Fonts network request; optional loading keeps a stable fallback when the local font cannot load promptly.

The hero gets a large responsive Sora heading with deliberate line breaks and restrained tracking. Job content, form labels and primary controls use a readable 14–16px Manrope baseline; source and timestamp utility captions intentionally use a more compact size when legibility is preserved. Phone text-entry fields use 16px. Keep line-height and text measure comfortable, allow font fallback, and reserve geometry while fonts load.

Job titles and employer names may wrap. Do not uppercase body copy; the small category eyebrow is the intentional exception. Preserve numbers and source dates as data, with visible labels distinguishing posted from checked.

## Layout

The page uses document scrolling and an 88rem maximum width including gutters. The hero places the career message and orbital visual in two columns, followed by a compact real-platform strip. Desktop discovery uses a 232px filter rail and a flexible results area. Above 1160px, job cards form a two-column grid; at 1160px and below they form one column. Three compact information cards sit below the results rather than occupying a permanent third rail.

At 900px and below, filters become an initially collapsed inline disclosure and discovery becomes one column; the decorative orbital visual is hidden and the career text retains priority. No modal drawer or scroll lock is needed. Phone search fields and information cards stack. Gutters reduce from 2.5rem to 2rem at 1160px, 1.25rem at 900px and 1rem at 600px. Primary touch actions target 48px height and icon actions 44px, with unclipped focus rings and wrapped long job titles.

Results use server pagination. Loading/error/empty content uses the shared 380px-minimum ResultState region; result headings retain a 43px minimum height. No fake jobs fill unused space. The document reserves scrollbar space, and controls retain their dimensions while busy.

## Elevation & Depth

Hierarchy comes from distinct dark surfaces, visible edge contrast and spacing. The orbital hero owns the expressive edge light and glow. Restrained brand-mark and search-panel glow are intentional exceptions; ordinary job cards use borders and state changes without luminous outlines or scaling. Toast elevation belongs to the shared feedback primitive. Avoid making every surface transparent or heavily blurred.

## Shapes

Job cards, desktop search and filter panels use 20px corners; shared controls use 16px. The root `--radius` is 18px: Tailwind `rounded-lg` resolves to 18px, `rounded-md` to 16px and `rounded-sm` to 14px. Recipe variants are 18px for the phone search panel, 24px for account panels and 10px for the native select trigger. Tags use 6px, while the brand mark and navigation pills use 12px. The orbital paths supply the curved signature; routine cards and forms remain stable rectangles. Preserve practical hit areas around compact tags and company initials.

## Components

### Canonical mapping

| Document token / rule | Runtime owner | Adapter and consumers |
| --- | --- | --- |
| primary, primaryForeground, foreground, background, surface | `--primary`, `--primary-foreground`, `--foreground`, `--background`, `--card` | Tailwind semantic colors; Button/ButtonLink, Input, cards, navigation |
| secondary, muted, mutedForeground, accent, border | matching variables; `--muted-foreground` | Tailwind semantic colors; metadata, labels, fields |
| danger, success | `--destructive`, `--success` | destructive Button/Toast; success text recipes |
| cyan | `--cyan` | decorative orbital accent; no implied job status |
| dark foreground on filled actions | `--primary-foreground`, `--destructive-foreground` | shared Button and Toast |
| focus and input boundary | `--ring: var(--primary)`, `--input: var(--border)` | global focus, shared Input/Checkbox/Button |
| display/body typography | `--font-display`, `--font-body` | `.display-font`, `.hero h1`, document body |
| control radius | `--radius` | Tailwind `lg`, `md`, `sm`; shared controls |
| card/control radius, page width/gutters/gap | `.job-card`, shared control recipes, `.site-container`, `.discovery-grid`, `.opportunities-list` | direct canonical component recipes; responsive media rules |
| scrollbarThumb/Hover/Active and background track | `--scrollbar-thumb`, `--scrollbar-hover`, `--scrollbar-active`, `--scrollbar-track` | global standard properties and WebKit fallback; all app scroll regions |

The drift gate is DESIGN lint plus comparison of this map against computed CSS and representative controls. No token generator or automated drift test is configured; do not claim one ran.

### States, controls, and feedback

[UX-CONTRACT.md](UX-CONTRACT.md) owns interactions. Button/ButtonLink/Input/Checkbox/Toaster are shared primitives; JobCard, JobFilters, ResultState, and AuthForm own recurring product compositions. ButtonLink is exported from `frontend/components/ui/button.tsx`, reuses `buttonVariants`, and renders Next.js Link for navigation; Button owns actions. Default/hover/focus/selected/disabled/busy/error states must be recognizable without layout jumps. Use an app-owned spinner for pending work; do not introduce skeletons unless explicitly selected as a shared pattern.

Button emphasis is solid, outline, ghost or link; intent is brand, neutral or destructive. Primary actions use periwinkle with dark text; secondary navigation is quieter. Destructive styling is reserved for consequential actions. Busy controls keep their width and are unavailable for duplicate submission. Inputs use real labels and inline error text. Native `postedWithin` select popup geometry and keyboard handling are deliberately OS-owned; its trigger uses `.filter-select` and the authored dark color scheme.

### Iconography, motion, and content

Lucide line icons are the shared family. Use 16–20px glyphs inside suitably sized controls and an accessible name for every icon-only action. Company initials are neutral fallbacks, never invented logos. The upward arrow belongs to the brand and the decorative hero. The orbital visual is `aria-hidden`; it contains no invented live signal, listing count or freshness claim.

Motion is limited to a 500ms eased entry and 160ms interaction feedback. Avoid continuous orbiting, ambient motion, pulsing status simulations and scaling cards. Reduced-motion mode removes entry motion, transitions and smooth scrolling.

Use “Search jobs”, “Save job”, “Saved”, “Apply”, and “Last checked” consistently. Display the ATS source and application host; neither is a safety certification. No fabricated listing totals, positions, timestamps, testimonials, or application success claims. Charts are not part of this interface.

Public listing content must be English-ready before display. Private originals support translation and retries; a missing or unavailable translation service must not produce a raw foreign-language fallback. Preserve company proper names and application URLs. The public `isTranslated` flag can show “English translation”; the external application page may remain in another language. Do not claim all translations are configured or live merely because the pipeline exists.

## Do's and Don'ts

- **Do:** keep results and application destinations easy to compare, including on a phone.
- **Do:** change shared semantic tokens and primitives together, then compare discovery with saved jobs and account pages.
- **Don't:** treat a check attempt as employer verification or invent content to fill the screen.
- **Don't:** copy screen-local controls or substitute decorative motion for useful feedback.
