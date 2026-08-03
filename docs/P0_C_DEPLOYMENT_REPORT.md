# P0-C deployment-readiness report

Date: 2026-08-03. Milestone status: **Partial until an owner-accessible Vercel URL passes the deployment verifier**. All deterministic local implementation and verification is complete; no deployment credentials or confirmed deployment URL were available in this workspace.

## Architecture and routing

The Vercel Node function remains `api/index.ts` with a 30-second maximum. `/api/*` rewrites to it, `/tools/*` serves the SPA, existing static assets remain files, and unrelated paths intentionally return 404. Local production Express mirrors this behavior. Development middleware is loaded only outside production/Vercel. The server bundle and its diagnostic map are emitted to `server-dist`, outside the public `dist` directory, and browser tests verify that `/server.cjs.map` returns 404.

The application validates production configuration centrally. Browser-only pages remain available if Gemini is absent. Production transcription requires all Gemini/shared-limiter/identity configuration and fails closed otherwise.

## Platform limits

Official Vercel documentation specifies a 4.5 MB function request-body limit. P0-C reduces the JSON parser ceiling from 17 MiB to 4.25 MiB, decoded audio from 12 MiB to 3 MiB, and provider timeout from 25 to 20 seconds under the 30-second function duration. Frontend and backend share the 3 MiB rule.

## Rate limiting and identity

`RateLimitStore` provides atomic increment with TTL, readiness, and test reset/injection. Local/tests use a 10,000-entry bounded memory implementation. Production uses an adapter-backed Upstash-compatible REST `/multi-exec` transaction (`INCR`, conditional `PEXPIRE`, `PTTL`) with a 1.5-second timeout. Missing/unavailable production storage returns controlled 503; there is no per-instance fallback.

Vercel client identity uses only its overwritten single `x-vercel-forwarded-for` header. Multiple or malformed values fail closed. Local requests use the socket address and ignore caller-supplied forwarding headers. IPv4-mapped IPv6 is normalized, then HMAC-SHA256 produces Redis identity keys. Raw IPs are neither stored nor logged.

## Health, headers, caching, and CSP

Health is liveness-only. Readiness exposes booleans for transcription and rate-limit readiness, without paid calls or secret details. API responses use `no-store`; HTML uses `max-age=0, must-revalidate`; hashed assets use one-year immutable caching. Production CSP allows only self scripts, exact Google Fonts, QRServer/Unsplash images, browser blob/data media needs, and forbids objects/framing/eval/inline scripts. Inline styles remain narrowly allowed. Vite-only inline/WebSocket allowances exist only in development.

## Frontend alignment

Audio Transcriber validates exact MIME and 3 MiB size, rejects empty/unsupported files, preserves actual MediaRecorder WebM/Ogg MIME instead of claiming MP3, requires unchecked consent, blocks duplicate submissions, supports cancellation, performs no retry loop, maps 429/503/504/safe fallback errors, and cleans object URLs and microphone tracks.

## Tests and verification

P0-C adds environment, identity, shared-store, production API/header/readiness, transcription component, and production-CSP browser coverage. The deployment verifier checks homepage/tool/static/unknown routes, API 404/410/405, liveness/readiness, headers/cache/CORS, request IDs, sitemap count, robots, and error safety without calling Gemini.

The final clean verification sequence passed locally on 2026-08-03:

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd install` | 0 | Lockfile installation state is current. |
| `npm.cmd run clean` | 0 | Public, server, coverage, and test output removed. |
| `npm.cmd run typecheck` | 0 | No TypeScript errors. |
| `npm.cmd run lint` | 0 | No ESLint errors. |
| `npm.cmd run test` | 0 | 108/108 tests in 11 files passed. |
| `npm.cmd run build:client` | 0 | 44 sitemap URLs; production client built. |
| `npm.cmd run build:server` | 0 | 19.8 kB server bundle built outside the public directory. |
| `npm.cmd run build` | 0 | Combined production build passed. |
| `npm.cmd run test:e2e` | 0 | 10/10 production-browser tests passed. |
| `npm.cmd run check` | 0 | Typecheck, lint, 108 tests, and combined build passed. |
| `npm.cmd audit --json` | 0 | 0 vulnerabilities at every severity. |

The browser run initially exposed and led to correction of a global origin-policy mount that blocked the app's own static assets. A sandbox-only Chromium `spawn EPERM` was resolved by rerunning with browser-launch permission. These are not outstanding product failures.

Source assertions found no remote JavaScript execution, arbitrary URL proxy input, remote transcription URL, wildcard CORS, server stack response, raw Base64/audio logging, client Gemini key, insecure production rate-limit fallback, or wildcard Vercel preview origin in production code. The Audio Trimmer logs only a decoding error object, not audio bytes. `dist` contains zero source maps. The generated server map is outside the public directory and its URL is covered by a 404 browser assertion.

`scripts/verify-deployment.mjs` passes JavaScript syntax validation. It was not run against Vercel because no deployment URL or project access was available. Actual Vercel verification remains the sole completion blocker; therefore this milestone is Partial.

## Files changed for P0-C

Created: `.github/workflows/ci.yml`, `api/config.ts`, `api/security/clientIdentity.ts`, `api/security/rateLimit.ts`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/P0_C_DEPLOYMENT_REPORT.md`, `scripts/start-production-test.mjs`, `scripts/verify-deployment.mjs`, `tests/deployment-api.test.ts`, `tests/deployment-config.test.ts`, `tests/transcription-frontend.test.tsx`, and `tests/vercel-config.test.ts`.

Modified: `.env.example`, `.gitignore`, `README.md`, `api/index.ts`, `docs/API_SECURITY_MODEL.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/PRIVACY_PROCESSING_MATRIX.md`, `docs/PROJECT_AUDIT.md`, `docs/TESTING.md`, `package-lock.json`, `package.json`, `playwright.config.ts`, `scripts/build.mjs`, `server.ts`, `src/components/AudioTranscriber.tsx`, `src/components/SocialDownloader.tsx`, `tests/e2e/catalog.spec.ts`, `tests/security-api.test.ts`, `tests/security-rate-limit.test.ts`, and `vercel.json`.

No file was removed specifically by P0-C. Earlier P0-A/P0-B cleanup remains visible in the shared uncommitted worktree.

## Confirmations

All 113 IDs remain unchanged; totals remain 12 functional, 31 beta, 51 coming soon, and 19 disabled. Social downloader and video splitter remain disabled. No tool was promoted and P1 work was not started.
