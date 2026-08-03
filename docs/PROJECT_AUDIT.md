# PanUtility-Web project audit

## P1-B3 Calculator & Game Tools Production Quality — 2026-08-04

P1-B3 is complete: the four functional Calculator/Game tools (Percentage Calculator, Tip
Calculator, Polyhedral Dice Roller, Rock Paper Scissors vs. Computer) are
production-quality and fully verified. This is the third P1-B sub-milestone (P1-B1 image
tools; P1-B2 text tools).

What changed:
- `src/lib/toolTransforms.ts` — shared numeric standards (`parseFiniteNumber`,
  `formatResult`) and rejection-sampling randomness (`secureIntInRange`); `rollDie` and
  `playRockPaperScissors` now use it. See `P1B3_CALCULATOR_GAMES_REPORT.md`.
- `src/components/GenericUtilityWorkspace.tsx` — percent/tip/dice/RPS UI and handlers
  (dedicated inputs, validation with `role="alert"`, `aria-live` results, resets, truthful
  entertainment/computer-opponent copy, `noValidate` forms so React messages drive
  validation).
- `src/toolsData.ts` — SEO/copy truthfulness fixes for percent/dice/RPS (route IDs
  unchanged).
- `tests/functional-tools.test.tsx` (+9 deterministic tests), new
  `tests/games-workspace.test.tsx` (19 UI-level tests), and `tests/e2e/catalog.spec.ts`
  (+7 Playwright tests).

Verification (clean rebuild): typecheck, lint, and `npm run check` pass; `npm run test`
passes 275/275 across 17 files (was 247 / 16); Playwright passes 21/21 (was 14); all
client, server, and combined production builds pass; the sitemap remains 13 URLs /
12 indexable tools. `npm audit --json` reports 1 pre-existing moderate (dev-only
`postcss <=8.5.22`), 0 high, 0 critical.

Confirmed untouched: image tools, text tools, SEO/prerendering, public-visibility
selectors, API/security, `social-downloader`, unrelated Beta/Disabled tools, route IDs,
and the enforced status totals (12 functional / 30 beta / 51 coming-soon / 20 disabled =
113 routes). Zero-cost production mode is unchanged.

## P1-B2 Text & Writing Tools Production Quality — 2026-08-04

P1-B2 is complete: the five shared text/code transform tools (Case Converter, Word
Counter, Lorem Ipsum, Duplicate Line Remover, JSON Formatter) are production-quality and
fully verified. This is the second P1-B sub-milestone (P1-B1 covered the image tools;
P1-B3 is not started).

What changed:
- `src/lib/toolTransforms.ts` and `src/components/GenericUtilityWorkspace.tsx` — the
  transform library and its text-tool wiring (see `P1B2_TEXT_TOOLS_REPORT.md`). The
  pre-existing in-flight diffs in these two files were completed, extended, and verified
  here rather than reverted.
- `tests/functional-tools.test.tsx` (+28 deterministic tests) and new
  `tests/text-tools-workspace.test.tsx` (7 UI-level tests).

Verification (clean rebuild): typecheck, lint, and `npm run check` pass; `npm run test`
passes 247/247 across 16 files (was 210 / 15); Playwright passes 14/14; all client, server,
and combined production builds pass; the sitemap remains 13 URLs / 12 indexable tools.
`npm audit --json` reports 1 pre-existing moderate (dev-only `postcss <=8.5.22`), 0 high,
0 critical.

Confirmed untouched: image tools, SEO/prerendering, public-visibility selectors,
API/security, `social-downloader`, unrelated Beta/Disabled tools, route IDs, and the
enforced status totals (12 functional / 30 beta / 51 coming-soon / 20 disabled = 113
routes). Zero-cost production mode is unchanged.

## P1-A & P1-A2 Production Technical SEO & Prerendering — 2026-08-03

Technical SEO foundation (P1-A) and live production rendering verification with build-time static HTML prerendering (P1-A2) are complete and fully verified on `https://panutility.vercel.app`.

Key Highlights:
- **Build-Time Static Prerenderer:** `scripts/prerender.ts` generates static HTML files in `dist/tools/{toolId}/index.html` for all 42 indexable tools and updates `dist/index.html` with rich homepage metadata and structured data.
- **Sitemap & Robots:** Exactly 43 canonical `https://panutility.vercel.app/` URLs in `public/sitemap.xml`; `robots.txt` points directly to sitemap.
- **Structured Data:** Homepage contains `WebSite` and `Organization` JSON-LD; Tool pages contain `WebApplication` and `BreadcrumbList` JSON-LD.
- **Raw HTML Verification:** Verified live using HTTP GET fetches (`scratch/check_raw_html.mjs`). Raw HTML responses contain unique title, meta description, canonical link, `index, follow` directive, Open Graph, Twitter Cards, JSON-LD schemas, `<h1>` heading, and related tools internal links.
- **Hydration Safety:** Zero console warnings or duplicate head/JSON-LD tags upon React hydration.
- **Catalog Totals Preserved:** Exactly 113 routes (12 functional, 30 beta, 51 coming soon, 20 disabled). Audio Transcriber, Social Downloader, and Video Splitter remain disabled. Zero-cost architecture preserved.
- **Verification Results:** 14 passed Vitest test files (135 tests), clean builds, ESLint 0 errors, TypeScript 0 errors, and 17/17 live deployment checks passed (`verify-deployment.mjs`).

## Zero-cost production update — 2026-08-03

The public production catalog now deliberately disables Audio Transcriber. This removes the only paid/server-backed tool from the free deployment: no Gemini key, Redis, database, rate-limit secret, custom domain, or paid service is required to boot. The route remains stable but has no component key, is non-indexable, and displays a truthful unavailable state. `/api/transcribe` returns safe structured `410 FEATURE_DISABLED`; health and readiness remain 200 for browser-local tools.

Current catalog totals are 12 functional, 30 beta, 51 coming soon, and 20 disabled (113 total). Social Downloader and Video Splitter remain disabled; P1 has not started.

## P0-C final local verification — 2026-08-03

P0-C deterministic local work is complete and the milestone remains **Partial** only because no owner-accessible Vercel deployment URL was available for the non-paid post-deployment verifier. Zero-cost final results: TypeScript 0 errors, ESLint 0 errors, Vitest 112/112, Playwright 11/11 against the production bundle, client/server/combined builds passed, aggregate check passed, and npm audit reported 0 vulnerabilities. The client build retains a non-failing 637.35 kB main-chunk warning, tracked as performance/maintainability work rather than a P0 deployment blocker.

Production now uses centralized validated configuration, exact API-only CORS, a required shared atomic TTL limiter for transcription, HMAC-derived client identities, Vercel-specific client IP handling, safe health/readiness endpoints, platform-compatible upload limits, production security/cache headers, a tested CSP, non-public server artifacts, CI checks, and a non-paid deployment verifier. Exact commands, architecture, changed files, and the remaining deployment-access blocker are recorded in `P0_C_DEPLOYMENT_REPORT.md`.

## P0-C deployment-readiness update — 2026-08-03

Local production readiness now includes a shared TTL rate-limit adapter with fail-closed production policy, HMAC client identities, centralized environment validation, safe health/readiness, Vercel-compatible 4.25 MiB JSON/3 MiB audio limits, exact production origins, production caching/CSP tests, aligned transcription UI, CI checks, and a non-paid deployment verifier. Actual Vercel verification remains pending because no authenticated deployment URL was available; the milestone is therefore Partial.

## P0-B security update — 2026-08-03

The historical API findings below were addressed in P0-B and hardened further in P0-C. Remote provider/player JavaScript execution, SaveFrom/SnapSave/Cobalt/ytdl paths, remote transcription URLs, and arbitrary media proxying are removed. Social downloader is disabled. Transcription now uses strict upload validation, 3 MiB decoded/4.25 MiB JSON limits, a 20-second provider timeout, five requests per HMAC-derived client identity per 15 minutes in a required production shared store, exact origin and method/content-type policy, safe structured errors, request IDs, and redacted structured logs. See `P0_B_SECURITY_REPORT.md`, `P0_C_DEPLOYMENT_REPORT.md`, and `API_SECURITY_MODEL.md`.

Final gates pass: 75/75 Vitest tests, 8/8 Playwright tests, strict TypeScript, ESLint, client/server/combined production builds, ordered `npm run check`, and `npm audit` with zero vulnerabilities. The server bundle decreased from 28.4 kB to 12.7 kB after resolver removal. The main client entry is 638.77 kB / 177.08 kB gzip; its >500 kB performance warning remains unrelated to API security.

## P0-A implementation update — 2026-08-03

The original findings below remain the historical audit. P0-A now enforces the audited maturity classifications through a 113-entry typed registry, truthful unavailable-route guards, registry-derived sitemap/SEO/privacy labels, and lazy component loading. Fake behavior is unreachable from unavailable routes; the risky video splitter implementation was not repaired or loaded.

Current verification: `npm install`, clean, TypeScript, ESLint, 33/33 Vitest tests, client build, server build, combined production build, 8/8 Playwright tests, and ordered `npm run check` all pass. The generated sitemap contains the root plus 44 indexable tools. Main JS decreased from 1,261.05/365.26 kB gzip to 639.00/177.11 kB gzip. Vite still warns that the main entry exceeds 500 kB.

P0-A does not resolve the API/SSRF/proxy/remote-code/rate-limit findings. Those remain the recommended P0-B scope. See `BASELINE_REPORT.md`, `TOOL_STATUS_POLICY.md`, `PRIVACY_PROCESSING_MATRIX.md`, and `TESTING.md` for the implemented baseline.

| Final command | Result |
|---|---|
| `npm install` | Exit 0; lockfile current |
| `npm run clean` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run test` | Exit 0; 33/33 tests |
| `npm run build:client` | Exit 0; 5,239 modules, 45 sitemap URLs |
| `npm run build:server` | Exit 0; 28.4 kB bundle, 47.2 kB map |
| `npm run build` | Exit 0 |
| `npm run test:e2e` | Exit 0; 8/8 tests (Chromium required permission outside the restricted process sandbox) |
| `npm run check` | Exit 0; ordered typecheck, lint, Vitest, production build |

## Historical audit (pre-P0-A)

Audit date: 2026-08-03. Scope: the complete 42-file tracked repository plus visible untracked/generated files in the checkout. No application files were changed. Tool-by-tool evidence is in `TOOL_INVENTORY.md`.

## Executive summary

PanUtility presents 113 production routes, but most are not product-complete. Eight routes have dedicated React components; the remaining 105 use a single 142 KB `GenericUtilityWorkspace.tsx`. That generic workspace contains a mixture of real small utilities, incomplete media operations, hard-coded simulations, and category-wide placeholder interfaces. The catalog and SEO copy repeatedly claim offline, secure, client-side processing even though transcription, social download, and QR generation transmit user data or URLs to servers/third parties.

The verified baseline established on 2026-08-03 makes all requested npm scripts portable in this Windows checkout by invoking tool entry points through Node instead of npm's generated `.bin` PATH. Production build, focused TypeScript checking, ESLint, deterministic unit smoke tests, and a production-server route smoke test now pass. The client bundle remains very large (1,261.05 KB minified / 365.26 KB gzip for the main JS chunk).

Highest-risk findings:

1. The default video splitter performs proportional byte slicing and calls the result a valid time-based clip. Most container outputs will be corrupted or start without required metadata/keyframes.
2. Server-side URL fetching/proxying has an SSRF filter that fails open on DNS errors, checks only one address, misses private/reserved IPv4 and IPv6 ranges, and does not revalidate redirects.
3. `/api/transcribe`, `/api/resolve-social`, `/api/media-proxy`, and the diagnostic `/api/test` behavior have no authentication, rate limiting, origin/CSRF policy, quotas, or robust payload/upstream bounds. They can create cost, bandwidth, and abuse exposure.
4. The server executes JavaScript fetched from SaveFrom and YouTube in Node `vm` contexts. `vm` is not a security boundary for hostile code, and this makes upstream compromise/parser drift a production risk.
5. API failures return stack traces to clients. The UI displays these for social downloader errors.
6. `scientific-calc` evaluates user text with `Function(...)`; `hash-generator` and `password-gen` make false security claims; EXIF and several finance/health tools fabricate or simulate results.
7. Sixty-eight catalog routes are UI only or broken. False success messages make this worse than an honest “not available” state.

## Repository architecture

- Front end: React 19, Vite 6, TypeScript, Tailwind Vite plugin, Motion, Lucide/Phosphor icons.
- Local server: Express in `server.ts`, with the API Express app imported from `api/index.ts`; Vite middleware in development and static `dist` serving in production.
- Vercel: `api/index.ts` is a 30-second function. `/api/:path*` rewrites to that function and `/tools/:path*` rewrites to the SPA shell.
- Routing: hand-rolled `window.history.pushState`/`popstate`; tool IDs come from `toolsData.ts`.
- Processing: canvas, Web Audio, MediaRecorder, FileReader, jsPDF, and gifshot in the browser; Gemini and social-media resolvers/proxy on the server.

The hand-rolled routing accepts only catalog IDs during initial navigation, but `activeToolObj` contains a fallback while `GenericUtilityWorkspace` is passed a non-null asserted lookup. Current route validation prevents that crash on load, though the type design does not enforce it.

## Verified project baseline (2026-08-03)

Dependencies were installed from lockfile v3 with npm 11.12.1 on Node 24.15.0. The final `npm ci --no-audit --no-fund` installed 367 packages and reported deprecation warnings for transitive `@humanwhocodes/config-array@0.12.3`, `@humanwhocodes/object-schema@2.0.3`, and `node-domexception@1.0.0`. ESLint tooling was added as development-only dependencies. A high-severity transitive PostCSS advisory (`GHSA-r28c-9q8g-f849`, affected `<=8.5.17`) was found and cleared by pinning the patched `postcss@^8.5.18`; the final `npm audit --json` reports zero vulnerabilities across 462 dependencies.

Final command results:

| Command | Result |
|---|---|
| `npm run dev` | Started Vite middleware and listened on `http://0.0.0.0:3000`; the verification command intentionally stopped after the startup timeout. |
| `npm run typecheck` | Passed, exit 0. TypeScript now checks only `src`, `api`, `server.ts`, and `vite.config.ts`. |
| `npm run lint` | Passed, exit 0. ESLint 9 flat configuration covers production TypeScript sources. Legacy unused-import, empty-catch, escape, explicit-`any`, CommonJS-require, and `prefer-const` cleanup is explicitly deferred so baseline linting does not alter application behavior. |
| `npm run test` | Passed, exit 0: 2/2 tests. Verifies 113 unique catalog IDs and required Vercel rewrites/function duration. |
| `npm run build` | Passed, exit 0. Runs typecheck, Vite client build, and the externalized Node server bundle. |
| `npm run test:e2e` | P0-C final result is recorded below. Boots `server-dist/server.cjs` on loopback and verifies representative routes, production headers/cache policy, and non-exposure of server artifacts. |
| `npm audit --json` | Passed, exit 0: 0 known vulnerabilities. |

The production build transformed 5,237 modules in about 31 seconds. Output remained 1.48 KB HTML, 87.91 KB CSS (13.72 KB gzip), and 1,261.05 KB main JS (365.26 KB gzip), plus supporting chunks. Vite still warns that the main chunk exceeds 500 KB. The server bundle is 28.4 KB with a 47.1 KB source map. This bundle-size warning is unresolved performance debt, not a build failure.

Minimal baseline changes were limited to scripts/configuration, dependency metadata, smoke tests, the `.ts` extension required by Node's native TypeScript development runner, and this audit. No UI or tool behavior was redesigned.

## Scripts and verification results

`package.json` scripts:

| Script | Command | Audit result |
|---|---|---|
| `dev` | `node --experimental-strip-types server.ts` | Passes startup verification without the `.bin` PATH issue. Uses Node's native TypeScript stripping; Node 22+ is therefore the supported development baseline. |
| `build` | direct Node entry points for `tsc`, Vite, and esbuild | Passes and includes type-checking before bundling. Avoids the Windows `&` PATH failure while retaining Vercel-compatible output. |
| `start` | `node server-dist/server.cjs` | Present; `/api/health` and `/api/readiness` provide liveness and dependency readiness. |
| `preview` | direct Node Vite entry point | Present and path-safe; still bypasses the Express APIs and is not a representative full-app preview. |
| `typecheck` | direct Node TypeScript entry point | Passes with targeted production-source include/exclude configuration. |
| `lint` | direct Node ESLint entry point | Passes with ESLint 9 flat configuration. |
| `test` | Node built-in test runner | Passes 2 deterministic baseline tests. |
| `test:e2e` | Node built-in test runner | Passes one production-server HTTP smoke test after a build. |

Direct production client build result:

- Vite 6.4.3: 5,237 modules transformed, build succeeded in about 32 seconds.
- Main JS: 1,261.05 KB minified / 365.26 KB gzip; Vite emitted the >500 KB warning.
- CSS: 87.91 KB / 13.72 KB gzip.
- Server esbuild bundle: succeeded, 28.4 KB plus 47.1 KB source map (dependencies externalized).

The current production build is type-gated. TypeScript and ESLint both complete successfully; stricter compiler settings and broader lint rules remain maintainability work rather than baseline blockers.

## Vercel and deployment findings

- `vercel.json` gives `api/index.ts` 30 seconds. Transcription base64 requests, external social resolvers, and long proxy downloads can exceed function/body/bandwidth constraints.
- The broad `/api/:path*` rewrite sends all API paths to the Express function, including `/api/test`; that test handler is exported separately and is likely unreachable through the rewrite as intended. If Vercel also exposes it by filesystem routing, it can fan out 15 third-party requests per invocation.
- The media proxy streams until upstream/end/client close but sets no upstream timeout, maximum bytes, allowed media MIME list, or domain allowlist.
- No security headers are configured (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, frame restrictions).
- No explicit caching policy exists for HTML, hashed assets, API responses, or media proxy content.
- SPA rewrites cover `/tools/*`; other unknown paths are not explicitly rewritten to `index.html` on Vercel.
- `server.ts` production SPA fallback uses Express 4 wildcard routing and serves `dist`; the Vercel path uses a different entry/deployment model, increasing local/production drift.

## API routes

### `POST /api/transcribe`

Accepts either base64 `audio` plus client-supplied MIME type or a remote `fileUrl`, then sends the content to Gemini 2.5 Flash. It returns generated timestamp text.

Findings: unauthenticated Gemini cost exposure; 50 MB Express JSON limit before base64 expansion is still large; no decoded-byte/duration/MIME/magic-byte limits; arbitrary remote fetch shares the SSRF weaknesses; remote response is fully buffered; no timeout/redirect revalidation; client MIME is trusted; no consent or retention disclosure; raw provider error text may be returned.

### `POST /api/resolve-social`

Attempts SaveFrom, two community Cobalt instances, SnapSave, `@distube/ytdl-core`, and a YouTube player-script VM fallback. Returns one URL plus metadata.

Findings: brittle unofficial services/scraping; hard-coded SaveFrom salt/timestamp constant; quality and container are not verified; response URL is trusted for the later proxy; executes remote scripts in `vm`; no rate limit; fetch timeouts are inconsistent; generic metadata scrape fetches user URL; copyright/platform-terms risk; 500 responses disclose stack traces.

### `GET /api/media-proxy`

Fetches a caller-provided URL and pipes it as an attachment.

Findings: SSRF/bandwidth-amplification risk; no allowlist tying URLs to server-issued resolver results; no signed/expiring token; no size/type/range/timeout bounds; redirects not revalidated; `Access-Control-Allow-Origin: *`; filename is encoded then inserted in a quoted header (not direct CRLF, but produces awkward encoded names); upstream errors become client-visible messages.

### `api/test.ts`

Hard-codes a YouTube video and sends concurrent requests to 15 community Cobalt instances. It is a diagnostic endpoint, not a test. It should not ship in production because it can be abused for outbound request fan-out and reveals service inventory/results.

## Environment variables and secrets

| Variable | Used | Documented | Finding |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes, `api/index.ts` | Yes, `.env.example`/README | Required only for transcription but README implies app-wide setup. Missing key becomes a 500. Must remain server-only and needs quota/rate protection. |
| `YOUTUBE_COOKIE` | Yes, optional | No | Secret cookie can grant YouTube session access; high-impact secret not documented, scoped, rotated, or guarded from logging/upstream behavior. |
| `APP_URL` | No | Yes | Stale AI Studio template variable. |
| `DISABLE_HMR` | Yes, Vite config | No | Development-only switch; comment has mojibake. |
| `NODE_ENV` | Yes, server | Conventional | Controls static serving. |
| `VERCEL` | Yes, server | Platform-provided | Avoids local listen/Vite behavior. |

`.gitignore` correctly ignores `.env*` except `.env.example`. No committed `.env` file was found.

## Third-party services and libraries

External services: Google Gemini, SaveFrom, SnapSave, two hard-coded community Cobalt instances (plus 15 in `api/test.ts`), YouTube/player assets, Google Fonts, `api.qrserver.com`, and Unsplash fallback images. User content/URLs can reach several of these. No privacy policy, processor list, availability strategy, or service-specific error contract is present.

Notable packages:

- `@google/genai`: used server-side for transcription.
- `@distube/ytdl-core`: used server-side for YouTube extraction.
- `gifshot`: used client-side; imported into the monolithic generic component and contributes to initial bundle weight.
- `jspdf`: used client-side and creates additional chunks.
- `canvas-confetti`, two icon libraries, and Motion are used widely and inflate the initial route.
- `dotenv` is a dependency but no explicit `dotenv.config()` call exists; local behavior relies on `tsx`/environment loading assumptions.
- Tailwind, its Vite plugin, React Vite plugin, and type-only packages are in `dependencies` rather than consistently separated into `devDependencies`.

## Security and privacy

### Critical/high

- SSRF defense fails open and is incomplete (see inventory H). It must normalize and resolve all addresses, reject all non-public ranges for IPv4/IPv6, fail closed, revalidate every redirect, and preferably use strict domain allowlists.
- The unrestricted media proxy can be used as a server-side fetch and bandwidth relay. Resolver output should be bound to a short-lived signed token and approved host/type/size.
- Remote JavaScript execution through `vm.Script` is not an acceptable security boundary for hostile upstream content. Remove it or isolate it outside the application trust boundary.
- No authentication/rate limiting/quotas protect paid Gemini usage or expensive outbound requests.
- Server stack traces are returned in `/api/resolve-social` and Vercel bootstrap errors.
- The scientific calculator uses `Function` for expression evaluation.

### Privacy/product truthfulness

- `SeoManager` says every tool runs in-browser with zero server uploads. This is false for transcription, QR generation, social URL resolution, and proxy downloads.
- `GenericUtilityWorkspace` always displays “GPU Rendered: 100% Client” and “Security Level: High,” even for simulations and without evidence.
- Transcription sends audio to Google; QR text is placed in a third-party query string; social URLs and possibly account-bound/private link data reach several services. None has an in-product disclosure/consent state.
- Object URLs are generally cleaned up in dedicated tools, but some generic output replacements can leave URLs alive until unmount/replacement behavior; large decoded buffers/canvases remain a memory/privacy concern on shared devices.

## Validation and state handling

Dedicated tools generally have visible processing and toast feedback, but validation is largely `file.type.startsWith(...)`. MIME is caller-controlled and may be blank; there are no file-size/count/pixel/duration limits or magic-byte checks. Large files can lock the main thread or exhaust memory.

The generic workspace is substantially worse:

- one permissive file picker is reused for unrelated tools;
- many buttons report success despite producing no output;
- unsupported types are often accepted and later treated as image/video/text;
- numeric controls lack finite/range/zero/negative checks;
- empty, loading, success, and error states are inconsistent or absent;
- no cancellation or retry model exists;
- browser codec/canvas support is not checked before presenting an action.

Social download simulates progress to 100% after launching a navigation, so “completed” does not mean bytes arrived. QR has a fallback but no inline failure state. Transcription has a useful loading/error UI, but no upload consent/size state. Video/audio batch tools have item statuses, though the video result validity is never tested.

## Mobile and accessibility

- All heavy media work runs on the main thread and often materializes full files/base64/canvas buffers; mobile memory and thermal constraints are not considered.
- The generic workspace starts as a 320px sidebar plus content at `md`; many button grids and dense panels become long/cramped on small screens.
- Several controls rely on small 8–10px text and compact touch targets below recommended sizes.
- Dashboard pinning/reordering uses desktop drag events; no equivalent keyboard/touch reorder model is evident.
- Drag-and-drop affordances are prominent but file-picker alternatives exist in most upload areas.
- Icon-only controls need systematic accessible names; dynamic results/progress are not consistently announced with live regions.
- Canvas waveforms, palette colors, progress bars, game results, and breathing animation lack equivalent descriptions/reduced-motion handling.
- No accessibility test tooling or keyboard/screen-reader tests exist.

## Maintainability and performance

- `GenericUtilityWorkspace.tsx`: 142,277 bytes and about 2,900 lines, holding unrelated media, text, finance, health, and games logic with dozens of state variables. It is the dominant duplication/coupling hotspot.
- `App.tsx`: routing, global drag/drop, search, theme, pinning, keyboard shortcuts, dashboard, and workspace selection are all coupled.
- Dedicated splitter/trimmer components duplicate upload, waveform/timeline, batch status, download, logging, and toast patterns.
- Every tool imports through the same synchronous route tree; no route-level lazy loading. This pulls gifshot, jsPDF-related entry code, Motion, two icon sets, and every workspace into a 1.26 MB main bundle.
- Catalog data, behavior capability, accepted formats, privacy mode, and maturity are not represented in types, enabling marketing/implementation drift.
- Mojibake is present in source comments/UI strings (`â€¦`, `â†’`, box drawing characters, Vite comment), indicating an encoding pipeline issue.

## TypeScript and lint quality

- `ToolId` is just `string`, losing compile-time route exhaustiveness.
- Frequent `any` and non-null assertions hide API/data errors.
- `tsconfig.json` now has targeted production-source `include`/`exclude` lists and disables `allowJs`, so generated player scripts and manual experiments no longer block checking.
- `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, and related safety options are absent.
- ESLint 9 is installed and configured for production sources. Several legacy hygiene rules are intentionally disabled for this behavior-preserving baseline and should be enabled incrementally.
- The build runs TypeScript before Vite and server bundling.

## Generated, duplicated, or unnecessary repository files

Tracked root artifacts that should not be production source:

- Six timestamped `*-player-script.js` files, each about 2.50–2.52 MB (roughly 15 MB total), appear to be downloaded YouTube player code. They slow type-checking, expand clones, and may contain third-party copyrighted/generated content.
- `test_bochil.js`, `test_social.js`, `test_ytdl.js`, `test_savefrom_self.js`, and `log_formats.js` are manual experiments with hard-coded URLs, console output, and no assertions.
- `api/test.ts` is production-adjacent diagnostic code.
- `metadata.json` and README/index assets retain Google AI Studio template branding/context rather than project documentation.

Visible untracked files existed before this audit and were not changed: `fetch_instances.mjs`, `parse_invidious_html.mjs`, `parse_scraped_json.mjs`, `test_cobalt_dir.mjs`, `test_gifshot_import.mjs`, `test_instances.mjs`, `test_invidious.mjs`, `test_invidious_extra.mjs`, `test_piped.mjs`, and `test_snapsave_yt.mjs`. They are more manual scraping/service experiments and should be either removed, moved into a clearly non-production research fixture area, or converted into deterministic tests with network mocking.

`dist/` and `node_modules/` are present locally but ignored. Baseline verification refreshes ignored `dist` outputs. Dependency installation is reproducible from the updated npm lockfile.

## SEO and content

- Client-side title/meta/JSON-LD updates are not server-rendered, so crawlers/social previews may see only the generic shell.
- Sitemap lists only a small subset of 113 routes and includes `/tools/whiteboard`, which is not in the catalog.
- Sitemap `lastmod` values and production domain need deployment verification.
- No canonical, Open Graph, Twitter Card, manifest, favicon set, per-route static content, FAQ/help, or privacy disclosures were found.
- SEO text makes false “offline,” “zero server uploads,” and “secure” claims and promotes unfinished routes. Content corrections are a security/trust prerequisite, not merely growth polish.

## Test inventory

The baseline now has two Node unit smoke tests and one production-server HTTP smoke test. They verify catalog route uniqueness, Vercel routing invariants, production server startup, SPA root delivery, and one tool deep link. Still absent are component tests, mocked API behavior tests, real browser automation, codec compatibility tests, visual regression, accessibility tests, security regression tests, and CI workflow. Root files prefixed `test_` still execute live third-party requests and log observations; they are neither deterministic nor safe for CI.
