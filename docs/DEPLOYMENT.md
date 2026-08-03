# Production deployment

## Vercel contract

Node 22 is the supported deployment baseline. Vercel routes `/api/*` to `api/index.ts`, rewrites `/tools/*` to the SPA, serves existing static files normally, and leaves unrelated page paths as 404. The function duration is 30 seconds; Gemini's application timeout is 20 seconds. Vercel's documented function request-body ceiling is 4.5 MB, so PanUtility limits JSON to 4.25 MiB and decoded audio to 3 MiB.

## Required production variables

- `GEMINI_API_KEY`: enables transcription only.
- `ALLOWED_ORIGINS`: comma-separated exact HTTPS origins, normally `https://panutility.vercel.app` and any explicitly approved custom production domain.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: shared TTL store used through the vendor-neutral `RateLimitStore` adapter.
- `RATE_LIMIT_IDENTITY_SECRET`: random server-only value of at least 32 characters used to HMAC normalized client IPs.
- `NODE_ENV`, `VERCEL`, and `VERCEL_ENV`: set by the deployment environment; values are validated when used.

Do not add wildcards or arbitrary `*.vercel.app` origins. Preview deployments have transcription disabled by default: do not provide Gemini/shared-limiter secrets to previews. A preview may be explicitly enabled only by adding its exact HTTPS origin and environment-scoped secrets.

## Procedure

1. Create the shared Redis REST database and production-scoped credentials.
2. Generate an independent random identity secret of at least 32 characters.
3. Configure production-only environment variables in Vercel. Do not expose them to pull requests or prefix them with `VITE_`.
4. Deploy using Vercel's npm lockfile detection and `npm run build`.
5. Confirm `/api/readiness` returns 200 without invoking Gemini.
6. Run `npm run verify:deployment -- --base-url=https://deployment.example --allowed-origin=https://production-origin.example`.
7. Review the concise verification table and do not promote a deployment with any failure.

GitHub Actions installs from the lockfile, typechecks, lints, runs 108 deterministic tests, independently builds client/server, checks sitemap consistency, audits dependencies, and runs Playwright against the production Express build. It uses no production secrets or paid providers.
