# P0-B API security report

Date: 2026-08-03. Status: complete and verified.

## 1–5. Vulnerabilities, threat model, architecture, endpoints, providers

The original server executed downloaded provider/YouTube JavaScript, failed open on DNS errors, automatically followed redirects, accepted arbitrary transcription and proxy URLs, relayed unbounded content, exposed stack/upstream details, used wildcard CORS, and had no method/origin/rate/quota controls. Threats included SSRF and metadata access, DNS/redirect rebinding, bandwidth amplification, paid-provider abuse, remote-code compromise, secret leakage, memory exhaustion, and misleading social results.

P0-B replaces the monolithic API with shared error, rate-limit, and outbound-security modules. `POST /api/transcribe` remains enabled as upload-only Gemini processing. `/api/resolve-social` and `/api/media-proxy` return controlled 410 errors. SaveFrom, SnapSave, Cobalt, downloaded YouTube/player execution, ytdl-core, and `YOUTUBE_COOKIE` are removed. QRServer remains a disclosed browser-side provider.

## 6–8. SSRF, redirects, and proxy design

The exact SSRF and redirect rules are documented in `API_SECURITY_MODEL.md` and verified for malformed URLs, protocols, credentials, localhost, all required IPv4/IPv6 classes, mapped IPv6, DNS failure, mixed DNS answers, redirect-to-private destinations, loops, count, malformed locations, downgrade, MIME, status, and streaming bytes. Validation is fail-closed.

No proxy token is issued because the unsafe social feature was disabled rather than preserving an unreliable resolver. The proxy endpoint accepts neither a URL nor token and always returns 410. A future proxy must implement short-lived signed tokens; Base64 or permanent tokens are explicitly insufficient.

## 9–15. Abuse, origin, limits, errors, logs, secrets, headers

- Transcription: five requests/IP/15 minutes, bounded to 10,000 local entries with TTL cleanup. Serverless production needs a shared TTL store for cross-instance enforcement.
- Exact origin allowlist; no wildcard/reflection. POST plus JSON only; OPTIONS only as policy middleware.
- Request body 17 MiB; decoded audio 12 MiB; one Gemini attempt; 25-second provider timeout; Vercel function maximum remains 30 seconds.
- Stable structured errors and request IDs; safe provider/configuration mapping; `Retry-After` on 429.
- Structured request/provider/error logs redact secrets, URLs, cookies, authorization data, long payloads, and never log audio.
- Only `GEMINI_API_KEY` is retained as a server secret. `ALLOWED_ORIGINS` is configuration. `YOUTUBE_COOKIE` and stale `APP_URL` are removed.
- CSP without `unsafe-eval`, HSTS in production, nosniff, referrer and permissions policies, frame denial, and API no-store. Page CSP retains `style-src 'unsafe-inline'` because the current application uses inline styles.

## 16. Tests added

`security-outbound.test.ts` covers IP/DNS/redirect/MIME/byte policy; `security-api.test.ts` covers transcription schema, Base64, signatures, size, configuration, provider failure/timeout, rate limiting, origin/method/content type, disabled proxy/resolver, request IDs, errors and redaction; `security-rate-limit.test.ts` covers burst, separate IPs, expiry, cleanup, and memory bounds. No test contacts a live provider.

## 17–20. Verification, files, removals, remaining risks

See the final verification table below. Changed/created security code: `api/index.ts`, `api/security/errors.ts`, `api/security/outbound.ts`, `api/security/rateLimit.ts`, `server.ts`, `vercel.json`, the three security test files, registry/component metadata, environment/README, package metadata, sitemap, and P0-B documentation. Removed runtime dependency/code: `@distube/ytdl-core`, `dotenv`, SaveFrom/SnapSave/Cobalt/ytdl resolver code, remote player downloads/execution, remote transcription URL input, and arbitrary proxy streaming.

Remaining limitations: anonymous rate limits are per process and not globally consistent across serverless instances; IP identity depends on Vercel's trusted first proxy; Gemini retention/availability is externally governed; magic signatures are defensive validation rather than full codec parsing or duration measurement; CSP still permits inline styles; security headers need post-deployment verification; QR remains an external browser provider.

## 21–23. Catalog confirmations

`social-downloader` is now disabled, not Beta. `video-splitter` remains disabled. All 113 stable route IDs remain present and unique. Updated totals are 12 functional, 31 beta, 51 coming soon, and 19 disabled; sitemap eligibility becomes 43 tool routes plus the homepage.

## Final command evidence

| Command | Final result |
|---|---|
| `npm.cmd install` | Exit 0; dependencies current |
| `npm.cmd run clean` | Exit 0 |
| `npm.cmd run typecheck` | Exit 0 |
| `npm.cmd run lint` | Exit 0 |
| `npm.cmd run test` | Exit 0; 75/75 tests in 7 files |
| `npm.cmd run build:client` | Exit 0; 5,238 modules; 44 sitemap URLs |
| `npm.cmd run build:server` | Exit 0; 12.7 kB bundle and 20.0 kB map |
| `npm.cmd run build` | Exit 0; production client and server pass |
| `npm.cmd run test:e2e` | Exit 0; 8/8 Playwright tests |
| `npm.cmd run check` | Exit 0; ordered typecheck, lint, 75 tests, production build |
| `npm.cmd audit --json` | Exit 0; 0 vulnerabilities across 681 dependencies |

The first post-upgrade Playwright run identified Node strip-only syntax, the missing upgraded browser revision, and development CSP incompatibility; each cause was fixed and the command rerun to 8/8 passing. An earlier unit run exposed and led to correction of the rate-limiter memory bound.

## Final source assertions

Production searches returned `NO_MATCHES` for `vm.Script`, `runInContext`, `eval(`, `Function(`, remote player/SaveFrom/SnapSave/Cobalt/ytdl paths, stack-bearing response patterns, wildcard CORS, and arbitrary proxy URL reads/fetches. `api/test.ts` does not exist. Built client assets contain no `GEMINI_API_KEY`, `YOUTUBE_COOKIE`, or media-token secret identifiers.
