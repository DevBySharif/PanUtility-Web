# P1-D Launch Readiness Remediation

Date: 2026-08-25  
Repository: `D:\Websites\PanUtility-Web`  
Base HEAD: `6998963` (P1-B3)  
Scope: P1-D launch-readiness remediation only. No new tools, no Beta promotions, no social-downloader changes, no paid services.

## Original Blockers

The original audit (`docs/FULL_PRODUCTION_AUDIT.md`) identified these P0/P1 launch blockers:

| ID | Severity | Blocker |
|---|---|---|
| P0 | Critical | `.env.local` tracked in Git with Vercel OIDC token |
| P1 | High | Hidden/unknown route raw HTML shows indexable homepage metadata |
| P1 | High | CSP blob-worker console violations in image/color/PDF workflows |
| P1 | High | npm audit: 1 High, 2 Moderate advisories |
| P1 | Medium | E2E tests blocked by port 3000 conflict |
| P1 | Medium | Accessibility: small touch targets, unlabeled inputs |

## Secret / Environment Finding

- `.env.local` exists locally (last modified 2026-08-03, 1253 bytes)
- `.env.local` is **untracked** (`git ls-files .env*` returns only `.env.example`)
- `.env.local` is **ignored** by `.gitignore` (line 11: `.env.*`)
- No `.env.local` found in Git history (`git log --all -- .env.local` returns empty)
- `.gitignore` was hardened: changed `.env.local` / `.env.*.local` to broader `.env` / `.env.*` with `!.env.example`
- Only `.env.example` is tracked and contains placeholder values
- The file contains a Vercel OIDC variable. Vercel OIDC tokens are short-lived (hours). This file was last modified 2026-08-03 (22 days ago), so any token it contained is almost certainly expired.
- **Owner action:** The developer should verify whether the token needs rotation. Given the 22-day age and Vercel OIDC short lifetime, no reusable credential was verified in the tracked repository history.

## Raw Hidden-Route SEO Remediation

### Before

Hidden tool routes (`/tools/gif-maker`, `/tools/video-compressor`, `/tools/social-downloader`) and unknown routes (`/tools/not-a-real-tool`) served raw HTML identical to the homepage:

- Status: 200
- Title: `PanUtility - Universal Media & Format Workstation`
- Canonical: `https://panutility.vercel.app/`
- Robots: (none - default index)
- JSON-LD: `@type: WebSite` schema
- **Result:** Crawlers saw indexable homepage metadata for non-public tools

### After

- **Known hidden routes** (101 total: 30 beta + 51 coming-soon + 20 disabled): Generate static HTML during build with:
  - Status: 200
  - Title: `{tool.name} Unavailable - PanUtility`
  - Robots: `noindex, nofollow`
  - Self canonical: `https://panutility.vercel.app/tools/{tool.id}`
  - Truthful status label: "Beta preview" / "Coming soon" / "Temporarily unavailable"
  - No homepage `WebSite` schema leakage
- **Unknown routes** (`/tools/not-a-real-tool`): Return 404 with:
  - Status: 404
  - Title: `Page Not Found - PanUtility`
  - Robots: `noindex, nofollow`
  - No canonical URL
  - No homepage metadata leakage
- **Vercel SPA rewrite removed:** The `/tools/:path*` → `/index.html` rewrite was removed from `vercel.json`, so crawlers now receive the prerendered HTML instead of the SPA shell
- **Server 404 handling added:** `server.ts` production mode serves `404.html` for `/tools/*` and catch-all routes

## CSP Remediation

### Root Cause

`canvas-confetti` library attempts to create a Web Worker from a `blob:` URL. The production CSP had `script-src 'self'` but no `worker-src` directive, causing browsers to block the worker with a console error.

### Exact Fix

Added `worker-src 'self' blob:` to:
- `vercel.json` headers (both `/` and `/tools/(.*)` rules)
- `server.ts` middleware CSP header

### Why `blob:` is Necessary

`canvas-confetti` creates workers dynamically from Blob URLs for non-blocking animation. Blocking `blob:` workers would break the confetti effect on successful conversions. The `blob:` scope is limited to worker creation only.

### `unsafe-eval` Confirmation

`unsafe-eval` was **NOT** introduced. The CSP remains:
```
script-src 'self'
```
in production mode. `unsafe-inline` is only added in development mode for HMR.

## Dependency Remediation

### Before

| Severity | Count | Packages |
|---|---|---|
| Critical | 0 | — |
| High | 1 | `nanoid` (transitive via postcss) |
| Moderate | 2 | `dompurify` (transitive), `postcss` (direct) |
| Low | 0 | — |
| **Total** | **3** | |

### After (verified)

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |
| **Total** | **0** |

### Changes

- `postcss`: 8.5.18 → 8.5.26 (Moderate → resolved)
- `nanoid`: 3.3.15 → 3.3.18 (High → resolved)
- `dompurify`: 3.4.12 → 3.4.14 (Moderate → resolved)

## E2E Reliability

### Old Behavior

Playwright was configured to connect to port 3000 (`reuseExistingServer: false`). If any other process occupied port 3000, E2E tests would fail. The `start-production-test.mjs` script also defaulted to port 3000.

### New Behavior

- `playwright.config.ts`: Port defaults to `E2E_PORT` env var, falls back to 4173
- `scripts/start-production-test.mjs`: Uses `E2E_PORT` env var, falls back to 4173
- `reuseExistingServer: false` remains — no orphan server risk
- Port 3000 is left untouched

### Final Results

- E2E: **25/25 PASS** (consecutive run)
- Post-E2E port 4173: 0 orphan listeners

## Accessibility Remediation

Targeted fixes to image/PDF controls without redesigning the application:

### Image Converter (`ImageConverter.tsx`)
- Added `id="image-converter-file-input"` and `aria-label` to hidden file input
- Enlarged convert/download/trash icon buttons to `min-h-10 min-w-10` (40px)
- Added `focus:outline-none focus:ring-2` focus rings to all action buttons

### PDF Compiler (`PdfCompiler.tsx`)
- Added `id="pdf-compiler-file-input"` and `aria-label` to hidden file input
- Enlarged move-up/move-down/trash icon buttons to `min-h-10 min-w-10` (40px)
- Added focus rings to all action buttons

### Color Extractor (`ColorExtractor.tsx`)
- Added `id="color-extractor-file-input"` and `aria-label` to hidden file input

### Generic Utility Workspace (`GenericUtilityWorkspace.tsx`)
- Added `htmlFor` and `id` attributes to source text and output textareas
- Added `aria-label` to lorem paragraph count input
- Enlarged lorem paragraph count input target

### Toast (`Toast.tsx`)
- Added `aria-live="polite"` and `aria-atomic="false"` to toast container
- Added `role="alert"` for error toasts, `role="status"` for others
- Enlarged toast close button to `min-h-10 min-w-10`

## Functional Regression

All 12 Functional tools verified via unit tests and E2E:

| Tool | Route | E2E Result |
|---|---|---|
| Image Format Converter | `/tools/image-converter` | PASS (WebP download verified) |
| Color Palette Extractor | `/tools/color-extractor` | PASS (color swatches verified) |
| PDF Compiler | `/tools/pdf-compiler` | PASS (PDF download verified, %PDF signature) |
| Text Case Converter | `/tools/case-converter` | PASS |
| Word & Character Counter | `/tools/word-counter` | PASS |
| Lorem Ipsum Generator | `/tools/lorem-ipsum` | PASS |
| Duplicate Line Remover | `/tools/line-remover` | PASS |
| JSON Beautifier & Validator | `/tools/json-formatter` | PASS |
| Percentage Calculator | `/tools/percent-calc` | PASS |
| Friendly Bill & Tip Splitter | `/tools/tip-calc` | PASS |
| Polyhedral Dice Roller | `/tools/dice-roller` | PASS |
| Rock Paper Scissors vs. Computer | `/tools/rock-paper-scissors` | PASS |

## SEO Regression

- Sitemap: 13 URLs (homepage + 12 Functional tools) ✓
- 12 Functional tools: indexable with unique title, canonical, robots `index, follow` ✓
- 101 hidden tools: noindex, nofollow, self canonical, no homepage leakage ✓
- 404 page: noindex, nofollow, no canonical ✓
- robots.txt: points to `https://panutility.vercel.app/sitemap.xml` ✓

## Security Regression

- No `eval(`, `Function(`, `vm.Script`, `runInContext`, `unsafe-eval` in active source ✓
- Production CSP: `script-src 'self'`, no `unsafe-eval`, no `unsafe-inline` ✓
- `worker-src 'self' blob:` added (minimal, intentional) ✓
- `/api/transcribe`, `/api/resolve-social`, `/api/media-proxy`: return structured 410 ✓
- `/api/health`, `/api/readiness`: return 200 JSON ✓
- Source maps: 404 for `/server.cjs.map` and client `.map` files ✓
- HSTS, nosniff, referrer policy, permissions policy present ✓
- No tracked production secrets ✓

## Test Results

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities (Critical: 0, High: 0, Moderate: 0, Low: 0) |
| `typecheck` | PASS |
| `lint` | PASS |
| `test` | 277/277 PASS (17 files) |
| `build` | PASS (sitemap 13, 101 hidden pages, 404.html) |
| `test:e2e` | 25/25 PASS |
| `check` | PASS (277 tests + build) |

## Remaining P2/P3 Issues

### P2
- Color extractor tiny-image smoothing creates intermediate swatches for very small images
- PDF/image chunks are heavy; continue code-splitting
- GenericUtilityWorkspace is large and contains many beta branches

### P3
- Add richer content/schema only for truthful Functional tools
- Build browser-only tools with deterministic tests before exposing
- Add real Lighthouse/axe CI if desired

## Final Launch Verdict

**LAUNCH READY**

All P0/P1 launch blockers are resolved in the current local repository state:

- ✅ No tracked production secrets
- ✅ Hidden routes serve noindex HTML, not homepage metadata
- ✅ CSP worker-src blob: added without unsafe-eval
- ✅ 0 npm advisories
- ✅ E2E runs deterministically on port 4173
- ✅ Accessibility touch targets and labels improved
- ✅ 12/12 Functional tools pass
- ✅ 113 route IDs unchanged (12 Functional, 30 Beta, 51 Coming Soon, 20 Disabled)
- ✅ Sitemap remains 13 URLs
- ✅ Zero-cost architecture preserved
- ✅ social-downloader untouched
- ✅ No paid services added
